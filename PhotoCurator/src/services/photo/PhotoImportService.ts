import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { PermissionsAndroid, Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Photo, PhotoSource, ProcessingProgress, SyncStatus } from '../../types';
import { extractPhotoMetadata } from '../../utils/photoMetadata';
import { validatePhoto } from '../../utils/validation';
import { PermissionManager } from './PermissionManager';

export interface GoogleCredentials {
  accessToken: string;
  refreshToken: string;
}

export interface iCloudCredentials {
  appleId: string;
  token: string;
}

export interface ImportOptions {
  batchSize?: number;
  includeVideos?: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
  onProgress?: (progress: ProcessingProgress) => void;
  onError?: (error: Error) => void;
}

export interface ImportResult {
  photos: Photo[];
  errors: ImportError[];
  totalProcessed: number;
  totalSkipped: number;
  totalFound: number;
  duration: number;
}

export interface ImportError {
  photoId?: string;
  photoUri?: string;
  error: Error;
  stage: 'permission' | 'fetch' | 'metadata' | 'validation' | 'processing';
}

export class PhotoImportService {
  private static instance: PhotoImportService;
  private permissionManager: PermissionManager;
  private isImporting: boolean = false;
  
  private constructor() {
    this.permissionManager = PermissionManager.getInstance();
  }
  
  public static getInstance(): PhotoImportService {
    if (!PhotoImportService.instance) {
      PhotoImportService.instance = new PhotoImportService();
    }
    return PhotoImportService.instance;
  }

  public get importing(): boolean {
    return this.isImporting;
  }

  /**
   * Import photos from device camera roll
   */
  async importFromCameraRoll(options: ImportOptions = {}): Promise<ImportResult> {
    if (this.isImporting) {
      throw new Error('Import already in progress');
    }

    const startTime = Date.now();
    this.isImporting = true;

    const {
      batchSize = 50,
      includeVideos = false,
      dateRange,
      onProgress,
      onError
    } = options;

    try {
      // Check permissions first
      const permissionResult = await this.permissionManager.checkPhotoSourcePermission(PhotoSource.CAMERA_ROLL);
      if (!permissionResult.granted) {
        const requestResult = await this.permissionManager.requestPhotoSourcePermission(PhotoSource.CAMERA_ROLL);
        if (!requestResult.granted) {
          throw new Error('Camera roll permission denied');
        }
      }

      const result: ImportResult = {
        photos: [],
        errors: [],
        totalProcessed: 0,
        totalSkipped: 0,
        totalFound: 0,
        duration: 0
      };

      // Update progress - starting fetch
      if (onProgress) {
        onProgress({
          current: 0,
          total: 0,
          percentage: 0,
          stage: 'Fetching photos from camera roll...'
        });
      }

      // Get photos from camera roll with pagination support
      let allPhotos: any[] = [];
      let hasNextPage = true;
      let after: string | undefined;

      while (hasNextPage && allPhotos.length < batchSize) {
        const remainingCount = batchSize - allPhotos.length;
        const fetchCount = Math.min(remainingCount, 50); // Fetch in smaller chunks

        try {
          const cameraRollResult = await CameraRoll.getPhotos({
            first: fetchCount,
            after,
            assetType: includeVideos ? 'All' : 'Photos',
            ...(dateRange && {
              fromTime: dateRange.from.getTime(),
              toTime: dateRange.to.getTime()
            })
          });

          allPhotos.push(...cameraRollResult.edges);
          hasNextPage = cameraRollResult.page_info.has_next_page;
          after = cameraRollResult.page_info.end_cursor;

          // Update progress for fetching
          if (onProgress) {
            onProgress({
              current: allPhotos.length,
              total: batchSize,
              percentage: (allPhotos.length / batchSize) * 50, // First 50% for fetching
              stage: `Fetched ${allPhotos.length} photos...`
            });
          }
        } catch (error) {
          result.errors.push({
            error: error as Error,
            stage: 'fetch'
          });
          break;
        }
      }

      result.totalFound = allPhotos.length;
      
      // Process photos
      for (let i = 0; i < allPhotos.length; i++) {
        const edge = allPhotos[i];
        
        try {
          // Update progress - processing
          if (onProgress) {
            const processingProgress = 50 + ((i + 1) / allPhotos.length) * 50; // Second 50% for processing
            onProgress({
              current: i + 1,
              total: allPhotos.length,
              percentage: processingProgress,
              stage: `Processing photo ${i + 1} of ${allPhotos.length}...`,
              estimatedTimeRemaining: this.calculateETA(startTime, i + 1, allPhotos.length)
            });
          }

          const photo = await this.convertPhotoIdentifierToPhoto(edge.node);
          
          // Validate photo
          const validation = validatePhoto(photo);
          if (!validation.isValid) {
            result.errors.push({
              photoId: photo.id,
              photoUri: photo.uri,
              error: new Error(`Invalid photo: ${validation.errors.join(', ')}`),
              stage: 'validation'
            });
            result.totalSkipped++;
            continue;
          }

          result.photos.push(photo);
          result.totalProcessed++;
          
        } catch (error) {
          const err = error as Error;
          result.errors.push({
            photoUri: edge.node?.image?.uri || edge.node?.uri,
            error: err,
            stage: 'processing'
          });
          result.totalSkipped++;
          
          if (onError) {
            onError(err);
          }
        }
      }

      result.duration = Date.now() - startTime;

      // Final progress update
      if (onProgress) {
        onProgress({
          current: result.totalProcessed,
          total: result.totalFound,
          percentage: 100,
          stage: `Import complete: ${result.totalProcessed} photos processed`
        });
      }

      return result;
      
    } catch (error) {
      throw new Error(`Failed to import from camera roll: ${(error as Error).message}`);
    } finally {
      this.isImporting = false;
    }
  }

  /**
   * Import photos from Google Photos (enhanced placeholder implementation)
   */
  async importFromGooglePhotos(
    credentials: GoogleCredentials,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    if (this.isImporting) {
      throw new Error('Import already in progress');
    }

    const startTime = Date.now();
    this.isImporting = true;

    const { onProgress, onError } = options;
    
    try {
      // Check permissions/authentication
      const permissionResult = await this.permissionManager.checkPhotoSourcePermission(PhotoSource.GOOGLE_PHOTOS);
      if (!permissionResult.granted) {
        throw new Error('Google Photos authentication required');
      }

      const result: ImportResult = {
        photos: [],
        errors: [],
        totalProcessed: 0,
        totalSkipped: 0,
        totalFound: 0,
        duration: 0
      };

      // Simulate progress for placeholder
      if (onProgress) {
        onProgress({
          current: 0,
          total: 0,
          percentage: 0,
          stage: 'Connecting to Google Photos...'
        });
      }

      // TODO: Implement Google Photos API integration
      // This would involve:
      // 1. Using Google Photos Library API
      // 2. Fetching media items with pagination
      // 3. Downloading photos or getting access URLs
      // 4. Converting to Photo objects
      // 5. Progress tracking throughout the process

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      if (onProgress) {
        onProgress({
          current: 0,
          total: 0,
          percentage: 100,
          stage: 'Google Photos import not yet implemented'
        });
      }

      result.errors.push({
        error: new Error('Google Photos import not yet implemented'),
        stage: 'fetch'
      });

      result.duration = Date.now() - startTime;
      return result;
      
    } catch (error) {
      throw new Error(`Failed to import from Google Photos: ${(error as Error).message}`);
    } finally {
      this.isImporting = false;
    }
  }

  /**
   * Import photos from iCloud (enhanced placeholder implementation)
   */
  async importFromiCloud(
    credentials: iCloudCredentials,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    if (this.isImporting) {
      throw new Error('Import already in progress');
    }

    const startTime = Date.now();
    this.isImporting = true;

    const { onProgress, onError } = options;
    
    try {
      // Check permissions/authentication
      const permissionResult = await this.permissionManager.checkPhotoSourcePermission(PhotoSource.ICLOUD);
      if (!permissionResult.granted) {
        throw new Error('iCloud authentication required');
      }

      const result: ImportResult = {
        photos: [],
        errors: [],
        totalProcessed: 0,
        totalSkipped: 0,
        totalFound: 0,
        duration: 0
      };

      // Simulate progress for placeholder
      if (onProgress) {
        onProgress({
          current: 0,
          total: 0,
          percentage: 0,
          stage: 'Connecting to iCloud Photos...'
        });
      }

      // TODO: Implement iCloud Photos integration
      // This would involve:
      // 1. Using CloudKit or Photos framework integration
      // 2. Accessing iCloud Photo Library
      // 3. Fetching photos with proper permissions
      // 4. Converting to Photo objects
      // 5. Progress tracking throughout the process

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      if (onProgress) {
        onProgress({
          current: 0,
          total: 0,
          percentage: 100,
          stage: 'iCloud Photos import not yet implemented'
        });
      }

      result.errors.push({
        error: new Error('iCloud Photos import not yet implemented'),
        stage: 'fetch'
      });

      result.duration = Date.now() - startTime;
      return result;
      
    } catch (error) {
      throw new Error(`Failed to import from iCloud: ${(error as Error).message}`);
    } finally {
      this.isImporting = false;
    }
  }

  /**
   * Validate permissions for photo source
   */
  async validatePermissions(source: PhotoSource): Promise<boolean> {
    const result = await this.permissionManager.checkPhotoSourcePermission(source);
    return result.granted;
  }

  /**
   * Calculate estimated time remaining for import
   */
  private calculateETA(startTime: number, current: number, total: number): number {
    if (current === 0) return 0;
    
    const elapsed = Date.now() - startTime;
    const avgTimePerItem = elapsed / current;
    const remaining = total - current;
    
    return Math.round((remaining * avgTimePerItem) / 1000); // Return in seconds
  }

  /**
   * Cancel ongoing import operation
   */
  cancelImport(): void {
    this.isImporting = false;
  }



  /**
   * Convert PhotoIdentifier to Photo object
   */
  private async convertPhotoIdentifierToPhoto(nodeData: any): Promise<Photo> {
    
    // Extract metadata - nodeData is the actual photo data from edge.node
    const imageUri = nodeData.image?.uri || nodeData.uri || '';
    const timestamp = nodeData.timestamp || Date.now() / 1000;
    
    const metadata = await extractPhotoMetadata(imageUri);
    
    const photo: Photo = {
      id: imageUri, // Use URI as temporary ID
      uri: imageUri,
      metadata,
      syncStatus: SyncStatus.LOCAL_ONLY,
      createdAt: new Date(timestamp * 1000),
      updatedAt: new Date()
    };

    return photo;
  }

  /**
   * Get available photo sources
   */
  getAvailablePhotoSources(): PhotoSource[] {
    const sources: PhotoSource[] = [PhotoSource.CAMERA_ROLL];
    
    // Add other sources based on platform capabilities
    // TODO: Add logic to detect Google Photos and iCloud availability
    
    return sources;
  }

  /**
   * Check if a photo source is available
   */
  async isPhotoSourceAvailable(source: PhotoSource): Promise<boolean> {
    switch (source) {
      case PhotoSource.CAMERA_ROLL:
        return true; // Always available on mobile
      case PhotoSource.GOOGLE_PHOTOS:
        // TODO: Check if Google Photos is installed and accessible
        return false;
      case PhotoSource.ICLOUD:
        // TODO: Check if iCloud Photos is available (iOS only)
        return Platform.OS === 'ios';
      default:
        return false;
    }
  }
}

export default PhotoImportService;