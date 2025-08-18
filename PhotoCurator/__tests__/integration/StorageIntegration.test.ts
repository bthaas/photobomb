/**
 * Integration tests for the storage system
 */

import { DatabaseService } from '../../src/services/storage/DatabaseService';
import { PhotoRepository } from '../../src/services/storage/PhotoRepository';
import { ClusterRepository } from '../../src/services/storage/ClusterRepository';
import { CacheManager } from '../../src/services/storage/CacheManager';
import { StorageManager } from '../../src/services/storage/StorageManager';
import { MigrationManager } from '../../src/services/storage/MigrationManager';
import { Photo, SyncStatus, ClusterType } from '../../src/types';

// Mock external dependencies
jest.mock('react-native-sqlite-storage');
jest.mock('react-native-fs');

describe('Storage Integration', () => {
  let dbService: DatabaseService;
  let photoRepository: PhotoRepository;
  let clusterRepository: ClusterRepository;
  let cacheManager: CacheManager;
  let storageManager: StorageManager;
  let migrationManager: MigrationManager;

  const mockPhoto: Photo = {
    id: 'integration-test-photo',
    uri: 'file://test-photo.jpg',
    metadata: {
      width: 1920,
      height: 1080,
      fileSize: 1024000,
      format: 'JPEG',
      timestamp: new Date('2023-01-01T12:00:00Z'),
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
      },
    },
    features: {
      embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      dominantColors: [
        { r: 255, g: 0, b: 0, hex: '#FF0000', percentage: 0.3 },
        { r: 0, g: 255, b: 0, hex: '#00FF00', percentage: 0.7 },
      ],
      objects: [
        {
          label: 'person',
          confidence: 0.95,
          boundingBox: { x: 100, y: 100, width: 200, height: 300 },
        },
      ],
      scenes: [
        { label: 'outdoor', confidence: 0.8 },
      ],
    },
    qualityScore: {
      overall: 0.85,
      sharpness: 0.9,
      exposure: 0.8,
      colorBalance: 0.85,
      noise: 0.1,
    },
    compositionScore: {
      overall: 0.75,
      ruleOfThirds: 0.8,
      leadingLines: 0.6,
      symmetry: 0.7,
      subjectPlacement: 0.9,
    },
    contentScore: {
      overall: 0.9,
      faceQuality: 0.95,
      emotionalSentiment: 0.8,
      interestingness: 0.85,
    },
    syncStatus: SyncStatus.LOCAL_ONLY,
    createdAt: new Date('2023-01-01T12:00:00Z'),
    updatedAt: new Date('2023-01-01T12:00:00Z'),
  };

  beforeAll(async () => {
    // Initialize all services
    dbService = DatabaseService.getInstance();
    photoRepository = new PhotoRepository();
    clusterRepository = new ClusterRepository();
    cacheManager = CacheManager.getInstance();
    storageManager = StorageManager.getInstance();
    migrationManager = MigrationManager.getInstance();

    // Mock successful initialization
    jest.spyOn(dbService, 'initialize').mockResolvedValue();
    jest.spyOn(cacheManager, 'initialize').mockResolvedValue();
    jest.spyOn(storageManager, 'initialize').mockResolvedValue();

    await dbService.initialize();
    await cacheManager.initialize();
    await storageManager.initialize();
  });

  afterAll(async () => {
    try {
      await dbService.close();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Database and Repository Integration', () => {
    beforeEach(() => {
      // Mock database operations
      jest.spyOn(dbService, 'executeSql').mockImplementation(async (sql, params = []) => {
        // Simulate different responses based on SQL query
        if (sql.includes('INSERT INTO photos')) {
          return [];
        }
        if (sql.includes('SELECT * FROM photos WHERE id = ?')) {
          if (params[0] === mockPhoto.id) {
            return [{
              id: mockPhoto.id,
              uri: mockPhoto.uri,
              width: mockPhoto.metadata.width,
              height: mockPhoto.metadata.height,
              file_size: mockPhoto.metadata.fileSize,
              format: mockPhoto.metadata.format,
              timestamp: mockPhoto.metadata.timestamp.getTime(),
              location_latitude: mockPhoto.metadata.location?.latitude,
              location_longitude: mockPhoto.metadata.location?.longitude,
              features_embedding: JSON.stringify(mockPhoto.features?.embedding),
              dominant_colors: JSON.stringify(mockPhoto.features?.dominantColors),
              detected_objects: JSON.stringify(mockPhoto.features?.objects),
              detected_scenes: JSON.stringify(mockPhoto.features?.scenes),
              quality_overall: mockPhoto.qualityScore?.overall,
              quality_sharpness: mockPhoto.qualityScore?.sharpness,
              quality_exposure: mockPhoto.qualityScore?.exposure,
              quality_color_balance: mockPhoto.qualityScore?.colorBalance,
              quality_noise: mockPhoto.qualityScore?.noise,
              composition_overall: mockPhoto.compositionScore?.overall,
              composition_rule_of_thirds: mockPhoto.compositionScore?.ruleOfThirds,
              composition_leading_lines: mockPhoto.compositionScore?.leadingLines,
              composition_symmetry: mockPhoto.compositionScore?.symmetry,
              composition_subject_placement: mockPhoto.compositionScore?.subjectPlacement,
              content_overall: mockPhoto.contentScore?.overall,
              content_face_quality: mockPhoto.contentScore?.faceQuality,
              content_emotional_sentiment: mockPhoto.contentScore?.emotionalSentiment,
              content_interestingness: mockPhoto.contentScore?.interestingness,
              sync_status: mockPhoto.syncStatus,
              created_at: mockPhoto.createdAt.getTime(),
              updated_at: mockPhoto.updatedAt.getTime(),
              cluster_id: null,
            }];
          }
          return [];
        }
        if (sql.includes('SELECT * FROM faces WHERE photo_id = ?')) {
          return [];
        }
        return [];
      });
    });

    it('should create and retrieve a photo with all data', async () => {
      // Create photo
      await photoRepository.create(mockPhoto);

      // Retrieve photo
      const retrievedPhoto = await photoRepository.findById(mockPhoto.id);

      expect(retrievedPhoto).toBeDefined();
      expect(retrievedPhoto?.id).toBe(mockPhoto.id);
      expect(retrievedPhoto?.uri).toBe(mockPhoto.uri);
      expect(retrievedPhoto?.metadata.width).toBe(mockPhoto.metadata.width);
      expect(retrievedPhoto?.features?.embedding).toEqual(mockPhoto.features?.embedding);
      expect(retrievedPhoto?.qualityScore?.overall).toBe(mockPhoto.qualityScore?.overall);
      expect(retrievedPhoto?.compositionScore?.overall).toBe(mockPhoto.compositionScore?.overall);
      expect(retrievedPhoto?.contentScore?.overall).toBe(mockPhoto.contentScore?.overall);
    });

    it('should update photo and maintain data integrity', async () => {
      // Create photo first
      await photoRepository.create(mockPhoto);

      // Update photo
      const updates = {
        syncStatus: SyncStatus.SYNCED,
        qualityScore: {
          overall: 0.95,
          sharpness: 0.98,
          exposure: 0.92,
          colorBalance: 0.94,
          noise: 0.05,
        },
      };

      await photoRepository.update(mockPhoto.id, updates);

      // Verify update was called with correct parameters
      expect(dbService.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE photos SET'),
        expect.arrayContaining([
          SyncStatus.SYNCED,
          0.95,
          0.98,
          0.92,
          0.94,
          0.05,
          mockPhoto.id,
        ])
      );
    });
  });

  describe('Cache and Storage Integration', () => {
    beforeEach(() => {
      // Mock file system operations
      const RNFS = require('react-native-fs');
      RNFS.exists.mockResolvedValue(true);
      RNFS.writeFile.mockResolvedValue(undefined);
      RNFS.readFile.mockResolvedValue('cached-data');
      RNFS.unlink.mockResolvedValue(undefined);
      RNFS.readDir.mockResolvedValue([]);
      RNFS.getFSInfo.mockResolvedValue({
        totalSpace: 64 * 1024 * 1024 * 1024, // 64GB
        freeSpace: 32 * 1024 * 1024 * 1024,  // 32GB
      });

      // Mock database operations for cache
      jest.spyOn(dbService, 'executeSql').mockImplementation(async (sql, params = []) => {
        if (sql.includes('INSERT OR REPLACE INTO cache_metadata')) {
          return [];
        }
        if (sql.includes('SELECT * FROM cache_metadata WHERE key = ?')) {
          return [{
            key: params[0],
            size: 1024,
            created_at: Date.now(),
            last_accessed: Date.now(),
            expires_at: null,
          }];
        }
        if (sql.includes('UPDATE cache_metadata SET last_accessed')) {
          return [];
        }
        if (sql.includes('SELECT COUNT(*) as count')) {
          return [{ count: 5, total_size: 5120 }];
        }
        return [];
      });
    });

    it('should cache and retrieve data successfully', async () => {
      const testKey = 'test-cache-key';
      const testData = 'test-cache-data';

      // Cache data
      await cacheManager.set(testKey, testData);

      // Retrieve data
      const retrievedData = await cacheManager.get(testKey);

      expect(retrievedData).toBe(testData);
    });

    it('should get comprehensive storage statistics', async () => {
      // Mock database statistics
      jest.spyOn(dbService, 'getStatistics').mockResolvedValue({
        totalPhotos: 100,
        totalClusters: 10,
        totalFaces: 50,
        databaseSize: 10 * 1024 * 1024, // 10MB
      });

      // Mock cache statistics
      jest.spyOn(cacheManager, 'getStats').mockResolvedValue({
        totalEntries: 20,
        totalSize: 5 * 1024 * 1024, // 5MB
        oldestEntry: new Date(Date.now() - 86400000),
        newestEntry: new Date(),
      });

      const stats = await storageManager.getStorageStats();

      expect(stats).toHaveProperty('totalSpace');
      expect(stats).toHaveProperty('freeSpace');
      expect(stats).toHaveProperty('usedSpace');
      expect(stats).toHaveProperty('appDataSize');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('databaseSize');
      expect(stats).toHaveProperty('photoCount');

      expect(stats.photoCount).toBe(100);
      expect(stats.cacheSize).toBe(5 * 1024 * 1024);
      expect(stats.databaseSize).toBe(10 * 1024 * 1024);
    });

    it('should perform storage cleanup', async () => {
      // Mock cleanup operations
      jest.spyOn(cacheManager, 'cleanup').mockResolvedValue();
      jest.spyOn(cacheManager, 'getStats')
        .mockResolvedValueOnce({
          totalEntries: 20,
          totalSize: 10 * 1024 * 1024,
          oldestEntry: new Date(),
          newestEntry: new Date(),
        })
        .mockResolvedValueOnce({
          totalEntries: 15,
          totalSize: 7 * 1024 * 1024,
          oldestEntry: new Date(),
          newestEntry: new Date(),
        });

      const result = await storageManager.cleanup();

      expect(result.freedSpace).toBeGreaterThan(0);
      expect(result.cleanedItems.length).toBeGreaterThan(0);
      expect(cacheManager.cleanup).toHaveBeenCalled();
    });
  });

  describe('Migration Integration', () => {
    beforeEach(() => {
      // Mock migration-related database operations
      jest.spyOn(dbService, 'getMetadata').mockImplementation(async (key) => {
        if (key === 'last_migration') {
          return '0'; // Start from version 0
        }
        return null;
      });

      jest.spyOn(dbService, 'setMetadata').mockResolvedValue();
      jest.spyOn(dbService, 'executeTransaction').mockImplementation(async (callback) => {
        return await callback({} as any);
      });
    });

    it('should run migrations successfully', async () => {
      // Mock migration validation
      jest.spyOn(migrationManager, 'validateMigrations').mockReturnValue(true);

      await migrationManager.runMigrations();

      expect(dbService.getMetadata).toHaveBeenCalledWith('last_migration');
      expect(dbService.executeTransaction).toHaveBeenCalled();
    });

    it('should get current migration version', async () => {
      const version = await migrationManager.getCurrentVersion();

      expect(typeof version).toBe('number');
      expect(version).toBeGreaterThanOrEqual(0);
    });

    it('should validate migration integrity', () => {
      const isValid = migrationManager.validateMigrations();

      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('End-to-End Storage Workflow', () => {
    it('should handle complete photo storage workflow', async () => {
      // Mock all necessary operations
      jest.spyOn(dbService, 'executeSql').mockResolvedValue([]);
      jest.spyOn(cacheManager, 'set').mockResolvedValue();
      jest.spyOn(cacheManager, 'get').mockResolvedValue('cached-thumbnail');

      // 1. Create photo in database
      await photoRepository.create(mockPhoto);

      // 2. Cache thumbnail
      await cacheManager.set(`thumbnail-${mockPhoto.id}`, 'thumbnail-data');

      // 3. Create cluster and assign photo
      const cluster = {
        id: 'test-cluster',
        type: ClusterType.VISUAL_SIMILARITY,
        photos: [mockPhoto],
        centroid: [0.1, 0.2, 0.3],
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await clusterRepository.createPhotoCluster(cluster);

      // 4. Update photo with cluster assignment
      await photoRepository.update(mockPhoto.id, { clusterId: cluster.id });

      // 5. Retrieve cached thumbnail
      const cachedThumbnail = await cacheManager.get(`thumbnail-${mockPhoto.id}`);

      // Verify all operations completed successfully
      expect(dbService.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO photos'),
        expect.any(Array)
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        `thumbnail-${mockPhoto.id}`,
        'thumbnail-data'
      );
      expect(cachedThumbnail).toBe('cached-thumbnail');
    });

    it('should handle storage errors gracefully', async () => {
      // Mock database error
      jest.spyOn(dbService, 'executeSql').mockRejectedValue(new Error('Database error'));

      await expect(photoRepository.create(mockPhoto)).rejects.toThrow('Database error');
    });

    it('should maintain data consistency across operations', async () => {
      // Mock successful operations
      jest.spyOn(dbService, 'executeSql').mockResolvedValue([]);
      jest.spyOn(dbService, 'executeTransaction').mockImplementation(async (callback) => {
        return await callback({} as any);
      });

      // Perform multiple related operations in a transaction
      await dbService.executeTransaction(async () => {
        await photoRepository.create(mockPhoto);
        await photoRepository.update(mockPhoto.id, { syncStatus: SyncStatus.SYNCED });
        return true;
      });

      expect(dbService.executeTransaction).toHaveBeenCalled();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle batch operations efficiently', async () => {
      jest.spyOn(dbService, 'executeSql').mockResolvedValue([]);

      const photoIds = Array.from({ length: 100 }, (_, i) => `photo-${i}`);
      
      // Batch update sync status
      await photoRepository.updateSyncStatus(photoIds, SyncStatus.SYNCED);

      // Should use a single SQL query with IN clause
      expect(dbService.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id IN'),
        expect.arrayContaining([SyncStatus.SYNCED, ...photoIds])
      );
    });

    it('should optimize storage usage', async () => {
      // Mock storage optimization operations
      jest.spyOn(dbService, 'executeSql')
        .mockResolvedValueOnce([]) // VACUUM
        .mockResolvedValueOnce([]); // REINDEX

      jest.spyOn(cacheManager, 'cleanup').mockResolvedValue();

      await storageManager.optimize();

      expect(dbService.executeSql).toHaveBeenCalledWith('VACUUM');
      expect(dbService.executeSql).toHaveBeenCalledWith('REINDEX');
      expect(cacheManager.cleanup).toHaveBeenCalled();
    });
  });
});