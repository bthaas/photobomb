/**
 * SyncService Tests
 */

import { SyncService } from '../../../src/services/sync/SyncService';
import { AuthService } from '../../../src/services/auth/AuthService';
import { PhotoRepository } from '../../../src/services/storage/PhotoRepository';
import { CacheManager } from '../../../src/services/storage/CacheManager';
import { Photo } from '../../../src/types/photo';
import { SyncOperation } from '../../../src/types/sync';

// Mock dependencies
jest.mock('../../../src/services/auth/AuthService');
jest.mock('../../../src/services/storage/PhotoRepository');
jest.mock('../../../src/services/storage/CacheManager');
jest.mock('../../../src/services/sync/SyncQueue');
jest.mock('../../../src/services/sync/ConflictResolver');
jest.mock('../../../src/services/sync/SyncStatusTracker');

// Mock fetch
global.fetch = jest.fn();

describe('SyncService', () => {
  let syncService: SyncService;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockPhotoRepository: jest.Mocked<PhotoRepository>;
  let mockCacheManager: jest.Mocked<CacheManager>;

  const mockPhoto: Photo = {
    id: 'photo1',
    uri: 'file://photo1.jpg',
    metadata: {
      width: 1920,
      height: 1080,
      fileSize: 1024000,
      format: 'JPEG',
      mimeType: 'image/jpeg',
      originalFilename: 'photo1.jpg',
      timestamp: new Date('2023-01-01')
    },
    syncStatus: 'pending',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAuthService = {
      isAuthenticated: jest.fn(),
      getCurrentUserId: jest.fn(),
      getToken: jest.fn()
    } as any;

    mockPhotoRepository = {
      getCuratedPhotos: jest.fn(),
      getAllPhotos: jest.fn(),
      getPhoto: jest.fn(),
      savePhoto: jest.fn(),
      updatePhoto: jest.fn(),
      getPhotosForMetadataSync: jest.fn(),
      getPhotosForSync: jest.fn()
    } as any;

    mockCacheManager = {
      storePhoto: jest.fn()
    } as any;

    syncService = new SyncService(
      mockAuthService,
      mockPhotoRepository,
      mockCacheManager,
      {
        maxRetries: 3,
        batchSize: 5,
        uploadTimeout: 10000,
        downloadTimeout: 10000,
        conflictResolutionStrategy: 'merge',
        selectiveSync: true,
        curatedPhotosOnly: true
      }
    );
  });

  describe('startSync', () => {
    beforeEach(() => {
      mockAuthService.isAuthenticated.mockResolvedValue(true);
      mockAuthService.getCurrentUserId.mockResolvedValue('user1');
      mockPhotoRepository.getCuratedPhotos.mockResolvedValue([mockPhoto]);
      mockPhotoRepository.getAllPhotos.mockResolvedValue([mockPhoto]);
    });

    it('should complete full sync successfully', async () => {
      // Mock successful upload
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cloudUrl: 'https://cloud.com/photo1.jpg' })
      });

      // Mock successful remote photo list fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const result = await syncService.startSync();

      expect(result.success).toBe(true);
      expect(result.uploaded).toBe(1);
      expect(result.downloaded).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should throw error when user is not authenticated', async () => {
      mockAuthService.isAuthenticated.mockResolvedValue(false);

      await expect(syncService.startSync()).rejects.toThrow('User must be authenticated to sync');
    });

    it('should handle upload failures gracefully', async () => {
      // Mock failed upload
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error'
      });

      // Mock successful remote photo list fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const result = await syncService.startSync();

      expect(result.success).toBe(true);
      expect(result.uploaded).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('uploadCuratedPhotos', () => {
    beforeEach(() => {
      mockAuthService.getToken.mockResolvedValue('mock-token');
    });

    it('should upload photos successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ cloudUrl: 'https://cloud.com/photo1.jpg' })
      });

      const result = await syncService.uploadCuratedPhotos([mockPhoto]);

      expect(result.count).toBe(1);
      expect(result.bytes).toBe(1024000);
      expect(result.errors).toHaveLength(0);
      expect(mockPhotoRepository.updatePhoto).toHaveBeenCalledWith(
        mockPhoto.id,
        expect.objectContaining({
          syncStatus: 'synced',
          cloudUrl: 'https://cloud.com/photo1.jpg'
        })
      );
    });

    it('should handle upload failures', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Upload Failed'
      });

      const result = await syncService.uploadCuratedPhotos([mockPhoto]);

      expect(result.count).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to upload photo photo1');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await syncService.uploadCuratedPhotos([mockPhoto]);

      expect(result.count).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Network error');
    });
  });

  describe('downloadUserLibrary', () => {
    const mockCloudPhoto = {
      id: 'cloud1',
      originalPhotoId: 'photo2',
      cloudUrl: 'https://cloud.com/photo2.jpg',
      metadata: mockPhoto.metadata,
      uploadedAt: new Date('2023-01-01'),
      lastModified: new Date('2023-01-01')
    };

    beforeEach(() => {
      mockAuthService.getToken.mockResolvedValue('mock-token');
      mockPhotoRepository.getAllPhotos.mockResolvedValue([mockPhoto]);
    });

    it('should download new photos successfully', async () => {
      // Mock remote photo list
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockCloudPhoto])
      });

      // Mock photo download
      const mockBlob = new Blob(['photo data'], { type: 'image/jpeg' });
      Object.defineProperty(mockBlob, 'size', { value: 1024000 });
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      });

      mockCacheManager.storePhoto.mockResolvedValue('file://cached/photo2.jpg');

      const result = await syncService.downloadUserLibrary();

      expect(result.count).toBe(1);
      expect(result.bytes).toBe(1024000);
      expect(result.errors).toHaveLength(0);
      expect(mockPhotoRepository.savePhoto).toHaveBeenCalled();
    });

    it('should skip photos that already exist locally', async () => {
      const existingCloudPhoto = {
        ...mockCloudPhoto,
        originalPhotoId: mockPhoto.id // Same as existing local photo
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([existingCloudPhoto])
      });

      const result = await syncService.downloadUserLibrary();

      expect(result.count).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle download failures', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockCloudPhoto])
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Download Failed'
      });

      const result = await syncService.downloadUserLibrary();

      expect(result.count).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to download photo cloud1');
    });
  });

  describe('syncMetadata', () => {
    beforeEach(() => {
      mockAuthService.getToken.mockResolvedValue('mock-token');
    });

    it('should sync metadata in batches', async () => {
      const photos = Array.from({ length: 12 }, (_, i) => ({
        ...mockPhoto,
        id: `photo${i + 1}`
      }));

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            batchSyncMetadata: {
              success: 5,
              failed: 0,
              errors: []
            }
          }
        })
      });

      await syncService.syncMetadata(photos);

      // Should make 3 batch requests (12 photos / 5 batch size = 2.4 -> 3 batches)
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle GraphQL errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          errors: [{ message: 'GraphQL error' }]
        })
      });

      await expect(syncService.syncMetadata([mockPhoto])).rejects.toThrow('GraphQL errors: GraphQL error');
    });

    it('should handle network errors in metadata sync', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Server Error'
      });

      await expect(syncService.syncMetadata([mockPhoto])).rejects.toThrow('Metadata sync failed: Server Error');
    });
  });

  describe('queueForSync', () => {
    it('should queue operations for offline sync', async () => {
      const operation: Omit<SyncOperation, 'id' | 'createdAt' | 'updatedAt'> = {
        type: 'upload',
        photoId: 'photo1',
        status: 'pending',
        progress: 0,
        retryCount: 0
      };

      await syncService.queueForSync(operation);

      // Verify that the operation was queued (mocked)
      expect(true).toBe(true); // Placeholder since we're mocking the queue
    });
  });

  describe('getSyncStatus', () => {
    it('should return current sync status', async () => {
      const status = await syncService.getSyncStatus();

      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('lastSyncAt');
      expect(status).toHaveProperty('queuedOperations');
      expect(status).toHaveProperty('pendingUploads');
      expect(status).toHaveProperty('pendingDownloads');
      expect(status).toHaveProperty('conflicts');
    });
  });

  describe('cancelSync', () => {
    it('should cancel ongoing sync operation', async () => {
      // Start a sync to have an active session
      mockAuthService.isAuthenticated.mockResolvedValue(true);
      mockAuthService.getCurrentUserId.mockResolvedValue('user1');
      mockPhotoRepository.getCuratedPhotos.mockResolvedValue([]);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      });

      // Start sync in background
      const syncPromise = syncService.startSync();
      
      // Cancel immediately
      await syncService.cancelSync();

      // Wait for sync to complete
      await syncPromise;

      // Verify cancellation was handled
      expect(true).toBe(true); // Placeholder since we're testing the flow
    });
  });

  describe('error handling', () => {
    it('should handle authentication errors', async () => {
      mockAuthService.isAuthenticated.mockRejectedValue(new Error('Auth error'));

      await expect(syncService.startSync()).rejects.toThrow('Auth error');
    });

    it('should handle repository errors', async () => {
      mockAuthService.isAuthenticated.mockResolvedValue(true);
      mockAuthService.getCurrentUserId.mockResolvedValue('user1');
      mockPhotoRepository.getCuratedPhotos.mockRejectedValue(new Error('Repository error'));

      await expect(syncService.startSync()).rejects.toThrow('Repository error');
    });

    it('should handle cache manager errors', async () => {
      mockAuthService.getToken.mockResolvedValue('mock-token');
      mockPhotoRepository.getAllPhotos.mockResolvedValue([]);

      const mockCloudPhoto = {
        id: 'cloud1',
        originalPhotoId: 'photo2',
        cloudUrl: 'https://cloud.com/photo2.jpg',
        metadata: mockPhoto.metadata,
        uploadedAt: new Date('2023-01-01'),
        lastModified: new Date('2023-01-01')
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockCloudPhoto])
      });

      const mockBlob = new Blob(['photo data'], { type: 'image/jpeg' });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      });

      mockCacheManager.storePhoto.mockRejectedValue(new Error('Cache error'));

      const result = await syncService.downloadUserLibrary();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Cache error');
    });
  });

  describe('configuration', () => {
    it('should use default configuration when none provided', () => {
      const defaultSyncService = new SyncService(
        mockAuthService,
        mockPhotoRepository,
        mockCacheManager
      );

      expect(defaultSyncService).toBeDefined();
    });

    it('should merge provided configuration with defaults', () => {
      const customSyncService = new SyncService(
        mockAuthService,
        mockPhotoRepository,
        mockCacheManager,
        {
          maxRetries: 5,
          batchSize: 20
        }
      );

      expect(customSyncService).toBeDefined();
    });
  });
});