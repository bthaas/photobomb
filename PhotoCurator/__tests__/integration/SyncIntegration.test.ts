/**
 * Sync Integration Tests
 * Tests the complete sync system working together
 */

import { SyncService } from '../../src/services/sync/SyncService';
import { SyncQueue } from '../../src/services/sync/SyncQueue';
import { ConflictResolver } from '../../src/services/sync/ConflictResolver';
import { SyncStatusTracker } from '../../src/services/sync/SyncStatusTracker';
import { AuthService } from '../../src/services/auth/AuthService';
import { PhotoRepository } from '../../src/services/storage/PhotoRepository';
import { CacheManager } from '../../src/services/storage/CacheManager';
import { Photo } from '../../src/types/photo';
import { SyncOperation } from '../../src/types/sync';

// Mock external dependencies
jest.mock('../../src/services/auth/AuthService');
jest.mock('../../src/services/storage/PhotoRepository');
jest.mock('../../src/services/storage/CacheManager');
jest.mock('../../src/services/storage/DatabaseService');

// Mock fetch
global.fetch = jest.fn();

describe('Sync Integration', () => {
  let syncService: SyncService;
  let syncQueue: SyncQueue;
  let conflictResolver: ConflictResolver;
  let statusTracker: SyncStatusTracker;
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
      timestamp: new Date('2023-01-01T10:00:00Z')
    },
    qualityScore: { overall: 0.8, sharpness: 0.9, exposure: 0.7, colorBalance: 0.8, noise: 0.9 },
    syncStatus: 'pending',
    createdAt: new Date('2023-01-01T09:00:00Z'),
    updatedAt: new Date('2023-01-01T10:00:00Z')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    mockAuthService = new AuthService() as jest.Mocked<AuthService>;
    mockPhotoRepository = new PhotoRepository() as jest.Mocked<PhotoRepository>;
    mockCacheManager = new CacheManager() as jest.Mocked<CacheManager>;

    mockAuthService.isAuthenticated.mockResolvedValue(true);
    mockAuthService.getCurrentUserId.mockResolvedValue('user1');
    mockAuthService.getToken.mockResolvedValue('mock-token');

    // Initialize services
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

    syncQueue = new SyncQueue({ maxRetries: 3 });
    conflictResolver = new ConflictResolver('merge', mockPhotoRepository);
    statusTracker = new SyncStatusTracker();
  });

  describe('Complete Sync Flow', () => {
    it('should complete full sync with upload, download, and conflict resolution', async () => {
      // Setup: Photos to upload
      mockPhotoRepository.getCuratedPhotos.mockResolvedValue([mockPhoto]);
      mockPhotoRepository.getAllPhotos.mockResolvedValue([]);

      // Mock successful upload
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ cloudUrl: 'https://cloud.com/photo1.jpg' })
        })
        // Mock remote photo list (empty for this test)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        });

      const result = await syncService.startSync();

      expect(result.success).toBe(true);
      expect(result.uploaded).toBe(1);
      expect(result.downloaded).toBe(0);
      expect(result.conflicts).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify photo was updated with sync status
      expect(mockPhotoRepository.updatePhoto).toHaveBeenCalledWith(
        mockPhoto.id,
        expect.objectContaining({
          syncStatus: 'synced',
          cloudUrl: 'https://cloud.com/photo1.jpg'
        })
      );
    });

    it('should handle offline-to-online sync flow', async () => {
      // Simulate offline operation queuing
      const offlineOperation: Omit<SyncOperation, 'id' | 'createdAt' | 'updatedAt'> = {
        type: 'upload',
        photoId: 'photo1',
        status: 'pending',
        progress: 0,
        retryCount: 0
      };

      await syncService.queueForSync(offlineOperation);

      // Simulate coming back online and processing queue
      mockPhotoRepository.getPhoto.mockResolvedValue(mockPhoto);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ cloudUrl: 'https://cloud.com/photo1.jpg' })
      });

      await syncService.processQueuedOperations();

      // Verify operation was processed
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should detect and resolve conflicts during sync', async () => {
      const localPhoto = {
        ...mockPhoto,
        qualityScore: { overall: 0.9, sharpness: 0.9, exposure: 0.8, colorBalance: 0.9, noise: 0.9 },
        updatedAt: new Date('2023-01-01T11:00:00Z')
      };

      const remotePhoto = {
        ...mockPhoto,
        qualityScore: { overall: 0.7, sharpness: 0.8, exposure: 0.7, colorBalance: 0.7, noise: 0.8 },
        updatedAt: new Date('2023-01-01T10:30:00Z')
      };

      // Test conflict detection
      const conflict = await conflictResolver.detectConflicts(localPhoto, remotePhoto);

      expect(conflict).toBeDefined();
      expect(conflict!.type).toBe('version_conflict');
      expect(conflict!.conflictDetails.conflicts).toContain('quality_score_mismatch');

      // Test conflict resolution
      const resolved = await conflictResolver.resolve(conflict!, 'merge');

      expect(resolved.qualityScore?.overall).toBe(0.9); // Local has higher score
      expect(resolved.updatedAt).toEqual(localPhoto.updatedAt); // Local is newer
      expect(mockPhotoRepository.updatePhoto).toHaveBeenCalledWith(
        mockPhoto.id,
        resolved
      );
    });

    it('should handle sync failures with retry logic', async () => {
      mockPhotoRepository.getCuratedPhotos.mockResolvedValue([mockPhoto]);

      // Mock initial failure, then success on retry
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ cloudUrl: 'https://cloud.com/photo1.jpg' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        });

      const result = await syncService.startSync();

      // Should still succeed overall despite initial failure
      expect(result.success).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should track sync progress and statistics', async () => {
      mockPhotoRepository.getCuratedPhotos.mockResolvedValue([mockPhoto]);
      mockPhotoRepository.getAllPhotos.mockResolvedValue([]);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ cloudUrl: 'https://cloud.com/photo1.jpg' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        });

      // Start sync and check status
      const syncPromise = syncService.startSync();
      const status = await syncService.getSyncStatus();

      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('queuedOperations');
      expect(status).toHaveProperty('pendingUploads');
      expect(status).toHaveProperty('pendingDownloads');
      expect(status).toHaveProperty('conflicts');

      await syncPromise;
    });
  });

  describe('Selective Sync', () => {
    it('should only sync curated photos when configured', async () => {
      const curatedPhoto = { ...mockPhoto, id: 'curated1' };
      const nonCuratedPhoto = { ...mockPhoto, id: 'noncurated1' };

      mockPhotoRepository.getCuratedPhotos.mockResolvedValue([curatedPhoto]);
      mockPhotoRepository.getAllPhotos.mockResolvedValue([curatedPhoto, nonCuratedPhoto]);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ cloudUrl: 'https://cloud.com/curated1.jpg' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        });

      const result = await syncService.startSync();

      expect(result.uploaded).toBe(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/upload'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('Metadata Sync', () => {
    it('should sync photo metadata in batches', async () => {
      const photos = Array.from({ length: 12 }, (_, i) => ({
        ...mockPhoto,
        id: `photo${i + 1}`,
        features: {
          embedding: [i, i + 1, i + 2],
          objects: [{ name: 'person', confidence: 0.9 }]
        }
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

      // Verify GraphQL mutation structure
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/graphql'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('batchSyncMetadata')
        })
      );
    });
  });

  describe('Download and Cache', () => {
    it('should download and cache remote photos', async () => {
      const cloudPhoto = {
        id: 'cloud1',
        originalPhotoId: 'photo2',
        cloudUrl: 'https://cloud.com/photo2.jpg',
        metadata: mockPhoto.metadata,
        uploadedAt: new Date('2023-01-01T09:00:00Z'),
        lastModified: new Date('2023-01-01T10:00:00Z')
      };

      mockPhotoRepository.getAllPhotos.mockResolvedValue([mockPhoto]);

      // Mock remote photo list
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([cloudPhoto])
        })
        // Mock photo download
        .mockResolvedValueOnce({
          ok: true,
          blob: () => Promise.resolve(new Blob(['photo data'], { type: 'image/jpeg' }))
        });

      mockCacheManager.storePhoto.mockResolvedValue('file://cached/photo2.jpg');

      const result = await syncService.downloadUserLibrary();

      expect(result.count).toBe(1);
      expect(mockCacheManager.storePhoto).toHaveBeenCalled();
      expect(mockPhotoRepository.savePhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'photo2',
          uri: 'file://cached/photo2.jpg',
          syncStatus: 'synced'
        })
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle authentication failures gracefully', async () => {
      mockAuthService.isAuthenticated.mockResolvedValue(false);

      await expect(syncService.startSync()).rejects.toThrow('User must be authenticated to sync');
    });

    it('should handle network failures and queue operations', async () => {
      mockPhotoRepository.getCuratedPhotos.mockResolvedValue([mockPhoto]);

      // Mock network failure
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network unavailable'));

      const result = await syncService.startSync();

      expect(result.success).toBe(true); // Should complete despite failures
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle partial sync failures', async () => {
      const photos = [
        { ...mockPhoto, id: 'photo1' },
        { ...mockPhoto, id: 'photo2' },
        { ...mockPhoto, id: 'photo3' }
      ];

      mockPhotoRepository.getCuratedPhotos.mockResolvedValue(photos);

      // Mock mixed success/failure responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ cloudUrl: 'https://cloud.com/photo1.jpg' })
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Server Error'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ cloudUrl: 'https://cloud.com/photo3.jpg' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        });

      const result = await syncService.startSync();

      expect(result.success).toBe(true);
      expect(result.uploaded).toBe(2); // 2 out of 3 succeeded
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Conflict Resolution Strategies', () => {
    it('should apply different resolution strategies correctly', async () => {
      const localPhoto = {
        ...mockPhoto,
        qualityScore: { overall: 0.9 },
        updatedAt: new Date('2023-01-01T11:00:00Z')
      };

      const remotePhoto = {
        ...mockPhoto,
        qualityScore: { overall: 0.7 },
        updatedAt: new Date('2023-01-01T10:00:00Z')
      };

      // Test local wins
      const localWinsResolver = new ConflictResolver('local_wins', mockPhotoRepository);
      const conflict = await localWinsResolver.detectConflicts(localPhoto, remotePhoto);
      
      if (conflict) {
        const resolved = await localWinsResolver.resolve(conflict);
        expect(resolved).toEqual(localPhoto);
      }

      // Test remote wins
      const remoteWinsResolver = new ConflictResolver('remote_wins', mockPhotoRepository);
      if (conflict) {
        const resolved = await remoteWinsResolver.resolve(conflict);
        expect(resolved).toEqual(remotePhoto);
      }

      // Test merge
      const mergeResolver = new ConflictResolver('merge', mockPhotoRepository);
      if (conflict) {
        const resolved = await mergeResolver.resolve(conflict);
        expect(resolved.qualityScore?.overall).toBe(0.9); // Should pick higher score
        expect(resolved.updatedAt).toEqual(localPhoto.updatedAt); // Should pick newer timestamp
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large batches efficiently', async () => {
      const largePhotoSet = Array.from({ length: 100 }, (_, i) => ({
        ...mockPhoto,
        id: `photo${i + 1}`
      }));

      mockPhotoRepository.getCuratedPhotos.mockResolvedValue(largePhotoSet);

      // Mock successful responses for all uploads
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/upload')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ cloudUrl: `https://cloud.com/photo${Date.now()}.jpg` })
          });
        }
        if (url.includes('/curated-photos')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const startTime = Date.now();
      const result = await syncService.startSync();
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.uploaded).toBe(100);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    });
  });
});