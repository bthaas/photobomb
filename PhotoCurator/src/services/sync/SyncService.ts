/**
 * Cloud Synchronization Service
 * Handles upload/download functionality, conflict resolution, and offline-first architecture
 */

import { Photo, PhotoMetadata } from '../../types/photo';
import { SyncConflict, SyncOperation, SyncSession, CloudPhoto } from '../../types/sync';
import { AuthService } from '../auth/AuthService';
import { PhotoRepository } from '../storage/PhotoRepository';
import { CacheManager } from '../storage/CacheManager';
import { SyncQueue } from './SyncQueue';
import { ConflictResolver } from './ConflictResolver';
import { SyncStatusTracker } from './SyncStatusTracker';

export interface SyncConfig {
  maxRetries: number;
  batchSize: number;
  uploadTimeout: number;
  downloadTimeout: number;
  conflictResolutionStrategy: 'local_wins' | 'remote_wins' | 'manual';
  selectiveSync: boolean;
  curatedPhotosOnly: boolean;
}

export interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  conflicts: number;
  errors: string[];
  bytesTransferred: number;
}

export class SyncService {
  private config: SyncConfig;
  private syncQueue: SyncQueue;
  private conflictResolver: ConflictResolver;
  private statusTracker: SyncStatusTracker;
  private currentSession: SyncSession | null = null;
  private isOnline: boolean = true;

  constructor(
    private authService: AuthService,
    private photoRepository: PhotoRepository,
    private cacheManager: CacheManager,
    config?: Partial<SyncConfig>
  ) {
    this.config = {
      maxRetries: 3,
      batchSize: 10,
      uploadTimeout: 30000,
      downloadTimeout: 30000,
      conflictResolutionStrategy: 'manual',
      selectiveSync: true,
      curatedPhotosOnly: true,
      ...config
    };

    this.syncQueue = new SyncQueue(this.config);
    this.conflictResolver = new ConflictResolver(this.config.conflictResolutionStrategy);
    this.statusTracker = new SyncStatusTracker();

    this.setupNetworkListener();
  }

  /**
   * Start a full synchronization session
   */
  async startSync(): Promise<SyncResult> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    if (!await this.authService.isAuthenticated()) {
      throw new Error('User must be authenticated to sync');
    }

    const sessionId = this.generateSessionId();
    this.currentSession = {
      id: sessionId,
      userId: await this.authService.getCurrentUserId(),
      startTime: new Date(),
      operations: [],
      conflicts: [],
      status: 'active',
      summary: {
        totalOperations: 0,
        completedOperations: 0,
        failedOperations: 0,
        conflictsResolved: 0,
        bytesTransferred: 0
      }
    };

    try {
      // Phase 1: Upload local changes
      const uploadResult = await this.uploadLocalChanges();
      
      // Phase 2: Download remote changes
      const downloadResult = await this.downloadRemoteChanges();
      
      // Phase 3: Resolve conflicts
      const conflictResult = await this.resolveConflicts();

      const result: SyncResult = {
        success: true,
        uploaded: uploadResult.count,
        downloaded: downloadResult.count,
        conflicts: conflictResult.resolved,
        errors: [...uploadResult.errors, ...downloadResult.errors, ...conflictResult.errors],
        bytesTransferred: uploadResult.bytes + downloadResult.bytes
      };

      this.currentSession.status = 'completed';
      this.currentSession.endTime = new Date();
      this.currentSession.summary = {
        totalOperations: this.currentSession.operations.length,
        completedOperations: this.currentSession.operations.filter(op => op.status === 'completed').length,
        failedOperations: this.currentSession.operations.filter(op => op.status === 'failed').length,
        conflictsResolved: conflictResult.resolved,
        bytesTransferred: result.bytesTransferred
      };

      await this.statusTracker.recordSession(this.currentSession);
      return result;

    } catch (error) {
      if (this.currentSession) {
        this.currentSession.status = 'failed';
        this.currentSession.endTime = new Date();
        await this.statusTracker.recordSession(this.currentSession);
      }
      throw error;
    } finally {
      this.currentSession = null;
    }
  }

  /**
   * Upload curated photos to cloud storage
   */
  async uploadCuratedPhotos(photos?: Photo[]): Promise<{ count: number; bytes: number; errors: string[] }> {
    const photosToUpload = photos || await this.getCuratedPhotosForUpload();
    const errors: string[] = [];
    let totalBytes = 0;
    let uploadedCount = 0;

    for (const photo of photosToUpload) {
      try {
        const operation = this.createSyncOperation('upload', photo.id);
        this.addOperationToSession(operation);

        const uploadResult = await this.uploadPhoto(photo);
        totalBytes += uploadResult.bytes;
        uploadedCount++;

        operation.status = 'completed';
        operation.progress = 100;
        await this.statusTracker.updateOperation(operation);

      } catch (error) {
        errors.push(`Failed to upload photo ${photo.id}: ${error.message}`);
        const operation = this.findOperationByPhotoId(photo.id);
        if (operation) {
          operation.status = 'failed';
          operation.error = error.message;
          await this.statusTracker.updateOperation(operation);
        }
      }
    }

    return { count: uploadedCount, bytes: totalBytes, errors };
  }

  /**
   * Download user's photo library from cloud
   */
  async downloadUserLibrary(): Promise<{ count: number; bytes: number; errors: string[] }> {
    const remotePhotos = (await this.fetchRemotePhotoList()) || [];
    const localPhotos = (await this.photoRepository.getAllPhotos()) || [];
    const localPhotoIds = new Set(localPhotos.map(p => p.id));
    
    const photosToDownload = remotePhotos.filter(photo => !localPhotoIds.has(photo.originalPhotoId));
    const errors: string[] = [];
    let totalBytes = 0;
    let downloadedCount = 0;

    for (const cloudPhoto of photosToDownload) {
      try {
        const operation = this.createSyncOperation('download', cloudPhoto.originalPhotoId);
        this.addOperationToSession(operation);

        const downloadResult = await this.downloadPhoto(cloudPhoto);
        totalBytes += downloadResult.bytes;
        downloadedCount++;

        operation.status = 'completed';
        operation.progress = 100;
        await this.statusTracker.updateOperation(operation);

      } catch (error) {
        errors.push(`Failed to download photo ${cloudPhoto.id}: ${error.message}`);
        const operation = this.findOperationByPhotoId(cloudPhoto.originalPhotoId);
        if (operation) {
          operation.status = 'failed';
          operation.error = error.message;
          await this.statusTracker.updateOperation(operation);
        }
      }
    }

    return { count: downloadedCount, bytes: totalBytes, errors };
  }

  /**
   * Sync metadata for photos
   */
  async syncMetadata(photos: Photo[]): Promise<void> {
    const batches = this.createBatches(photos, this.config.batchSize);
    
    for (const batch of batches) {
      const operation = this.createSyncOperation('metadata_sync', `batch_${Date.now()}`);
      this.addOperationToSession(operation);

      try {
        await this.syncMetadataBatch(batch);
        operation.status = 'completed';
        operation.progress = 100;
      } catch (error) {
        operation.status = 'failed';
        operation.error = error.message;
        throw error;
      }

      await this.statusTracker.updateOperation(operation);
    }
  }

  /**
   * Queue operations for offline sync
   */
  async queueForSync(operation: Omit<SyncOperation, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const syncOperation: SyncOperation = {
      ...operation,
      id: this.generateOperationId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.syncQueue.enqueue(syncOperation);
  }

  /**
   * Process queued operations when coming back online
   */
  async processQueuedOperations(): Promise<void> {
    if (!this.isOnline) {
      return;
    }

    const queuedOperations = await this.syncQueue.getAll();
    
    for (const operation of queuedOperations) {
      try {
        await this.executeOperation(operation);
        await this.syncQueue.remove(operation.id);
      } catch (error) {
        operation.retryCount++;
        operation.error = error.message;
        
        if (operation.retryCount >= this.config.maxRetries) {
          operation.status = 'failed';
          await this.syncQueue.remove(operation.id);
        } else {
          operation.status = 'pending';
          await this.syncQueue.update(operation);
        }
      }
    }
  }

  /**
   * Get sync status and statistics
   */
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    lastSyncAt: Date | null;
    queuedOperations: number;
    pendingUploads: number;
    pendingDownloads: number;
    conflicts: number;
  }> {
    const queuedOps = (await this.syncQueue.getAll()) || [];
    const conflicts = (await this.conflictResolver.getPendingConflicts()) || [];
    const lastSession = await this.statusTracker.getLastSession();

    return {
      isOnline: this.isOnline,
      lastSyncAt: lastSession?.endTime || null,
      queuedOperations: queuedOps.length,
      pendingUploads: queuedOps.filter(op => op.type === 'upload').length,
      pendingDownloads: queuedOps.filter(op => op.type === 'download').length,
      conflicts: conflicts.length
    };
  }

  /**
   * Cancel ongoing sync operation
   */
  async cancelSync(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.status = 'cancelled';
      this.currentSession.endTime = new Date();
      await this.statusTracker.recordSession(this.currentSession);
      this.currentSession = null;
    }
  }

  // Private helper methods

  private async uploadLocalChanges(): Promise<{ count: number; bytes: number; errors: string[] }> {
    const photosToUpload = await this.getCuratedPhotosForUpload();
    return this.uploadCuratedPhotos(photosToUpload);
  }

  private async downloadRemoteChanges(): Promise<{ count: number; bytes: number; errors: string[] }> {
    return this.downloadUserLibrary();
  }

  private async resolveConflicts(): Promise<{ resolved: number; errors: string[] }> {
    const conflicts = await this.conflictResolver.getPendingConflicts();
    let resolved = 0;
    const errors: string[] = [];

    for (const conflict of conflicts) {
      try {
        await this.conflictResolver.resolve(conflict);
        resolved++;
      } catch (error) {
        errors.push(`Failed to resolve conflict ${conflict.id}: ${error.message}`);
      }
    }

    return { resolved, errors };
  }

  private async getCuratedPhotosForUpload(): Promise<Photo[]> {
    if (this.config.curatedPhotosOnly) {
      return this.photoRepository.getCuratedPhotos();
    }
    return this.photoRepository.getPhotosForSync();
  }

  private async uploadPhoto(photo: Photo): Promise<{ bytes: number }> {
    const token = await this.authService.getToken();
    const formData = new FormData();
    
    // Add photo file
    formData.append('file', {
      uri: photo.uri,
      type: photo.metadata.mimeType,
      name: photo.metadata.originalFilename || `photo_${photo.id}.jpg`
    } as any);

    // Add metadata
    formData.append('metadata', JSON.stringify({
      originalPhotoId: photo.id,
      metadata: photo.metadata,
      qualityScore: photo.qualityScore,
      compositionScore: photo.compositionScore,
      contentScore: photo.contentScore,
      features: photo.features
    }));

    const response = await fetch(`${this.getApiBaseUrl()}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      },
      body: formData,
      timeout: this.config.uploadTimeout
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Update local photo with cloud information
    await this.photoRepository.updatePhoto(photo.id, {
      syncStatus: 'synced',
      cloudUrl: result.cloudUrl,
      lastSyncAt: new Date()
    });

    return { bytes: photo.metadata.fileSize || 0 };
  }

  private async downloadPhoto(cloudPhoto: CloudPhoto): Promise<{ bytes: number }> {
    const token = await this.authService.getToken();
    
    const response = await fetch(cloudPhoto.cloudUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: this.config.downloadTimeout
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const photoData = await response.blob();
    const localUri = await this.cacheManager.storePhoto(photoData, cloudPhoto.id);

    // Create local photo record
    const photo: Photo = {
      id: cloudPhoto.originalPhotoId,
      uri: localUri,
      metadata: cloudPhoto.metadata,
      syncStatus: 'synced',
      cloudUrl: cloudPhoto.cloudUrl,
      lastSyncAt: new Date(),
      createdAt: cloudPhoto.uploadedAt,
      updatedAt: cloudPhoto.lastModified
    };

    await this.photoRepository.savePhoto(photo);
    return { bytes: photoData.size };
  }

  private async fetchRemotePhotoList(): Promise<CloudPhoto[]> {
    const token = await this.authService.getToken();
    
    const response = await fetch(`${this.getApiBaseUrl()}/sync/curated-photos`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch remote photos: ${response.statusText}`);
    }

    return response.json();
  }

  private async syncMetadataBatch(photos: Photo[]): Promise<void> {
    const token = await this.authService.getToken();
    
    const syncData = photos.map(photo => ({
      photoId: photo.id,
      metadata: {
        embedding: photo.features?.embedding,
        qualityScore: photo.qualityScore,
        compositionScore: photo.compositionScore,
        contentScore: photo.contentScore,
        detectedObjects: photo.features?.objects,
        detectedFaces: photo.faces,
        dominantColors: photo.features?.dominantColors
      }
    }));

    const response = await fetch(`${this.getApiBaseUrl()}/graphql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `
          mutation BatchSyncMetadata($syncData: BatchSyncInput!) {
            batchSyncMetadata(syncData: $syncData) {
              success
              failed
              errors
            }
          }
        `,
        variables: { syncData: { items: syncData } }
      })
    });

    if (!response.ok) {
      throw new Error(`Metadata sync failed: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.errors) {
      throw new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
    }
  }

  private async executeOperation(operation: SyncOperation): Promise<void> {
    switch (operation.type) {
      case 'upload':
        const photo = await this.photoRepository.getPhoto(operation.photoId);
        if (photo) {
          await this.uploadPhoto(photo);
        }
        break;
      case 'download':
        // Implementation would depend on having the CloudPhoto data
        break;
      case 'metadata_sync':
        const photos = await this.photoRepository.getPhotosForMetadataSync();
        await this.syncMetadata(photos);
        break;
      case 'delete':
        await this.deleteRemotePhoto(operation.photoId);
        break;
    }
  }

  private async deleteRemotePhoto(photoId: string): Promise<void> {
    const token = await this.authService.getToken();
    
    const response = await fetch(`${this.getApiBaseUrl()}/photos/${photoId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
  }

  private createSyncOperation(type: SyncOperation['type'], photoId: string): SyncOperation {
    return {
      id: this.generateOperationId(),
      type,
      photoId,
      status: 'pending',
      progress: 0,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private addOperationToSession(operation: SyncOperation): void {
    if (this.currentSession) {
      this.currentSession.operations.push(operation);
    }
  }

  private findOperationByPhotoId(photoId: string): SyncOperation | undefined {
    return this.currentSession?.operations.find(op => op.photoId === photoId);
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private setupNetworkListener(): void {
    // This would use React Native's NetInfo to monitor network status
    // For now, we'll assume online
    this.isOnline = true;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getApiBaseUrl(): string {
    // This would come from configuration
    return process.env.API_BASE_URL || 'http://localhost:3000';
  }
}