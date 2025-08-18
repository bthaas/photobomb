/**
 * Tests for PhotoRepository
 */

import { PhotoRepository } from '../../../src/services/storage/PhotoRepository';
import { DatabaseService } from '../../../src/services/storage/DatabaseService';
import { Photo, SyncStatus } from '../../../src/types';

// Mock DatabaseService
jest.mock('../../../src/services/storage/DatabaseService');

describe('PhotoRepository', () => {
  let photoRepository: PhotoRepository;
  let mockDbService: jest.Mocked<DatabaseService>;

  const mockPhoto: Photo = {
    id: 'test-photo-1',
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
    syncStatus: SyncStatus.LOCAL_ONLY,
    createdAt: new Date('2023-01-01T12:00:00Z'),
    updatedAt: new Date('2023-01-01T12:00:00Z'),
  };

  beforeEach(() => {
    mockDbService = {
      getInstance: jest.fn(),
      executeSql: jest.fn(),
      executeTransaction: jest.fn(),
    } as any;

    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDbService);
    photoRepository = new PhotoRepository();
  });

  describe('create', () => {
    it('should create a new photo record', async () => {
      mockDbService.executeSql.mockResolvedValue([]);

      await photoRepository.create(mockPhoto);

      expect(mockDbService.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO photos'),
        expect.arrayContaining([
          mockPhoto.id,
          mockPhoto.uri,
          mockPhoto.metadata.width,
          mockPhoto.metadata.height,
          mockPhoto.metadata.fileSize,
          mockPhoto.metadata.format,
          mockPhoto.metadata.timestamp.getTime(),
        ])
      );
    });

    it('should create photo with faces', async () => {
      const photoWithFaces = {
        ...mockPhoto,
        faces: [{
          id: 'face-1',
          boundingBox: { x: 100, y: 100, width: 200, height: 200 },
          landmarks: {
            leftEye: { x: 150, y: 150 },
            rightEye: { x: 250, y: 150 },
            nose: { x: 200, y: 200 },
            leftMouth: { x: 175, y: 250 },
            rightMouth: { x: 225, y: 250 },
          },
          embedding: [0.1, 0.2, 0.3],
          confidence: 0.95,
          attributes: {
            age: 30,
            gender: 'male' as const,
            emotion: 'happy',
            smile: 0.8,
            eyesOpen: 0.9,
          },
        }],
      };

      mockDbService.executeSql.mockResolvedValue([]);

      await photoRepository.create(photoWithFaces);

      // Should call executeSql twice: once for photo, once for face
      expect(mockDbService.executeSql).toHaveBeenCalledTimes(2);
    });

    it('should handle creation errors', async () => {
      mockDbService.executeSql.mockRejectedValue(new Error('Database error'));

      await expect(photoRepository.create(mockPhoto)).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should find photo by ID', async () => {
      const mockRow = {
        id: mockPhoto.id,
        uri: mockPhoto.uri,
        width: mockPhoto.metadata.width,
        height: mockPhoto.metadata.height,
        file_size: mockPhoto.metadata.fileSize,
        format: mockPhoto.metadata.format,
        timestamp: mockPhoto.metadata.timestamp.getTime(),
        location_latitude: mockPhoto.metadata.location?.latitude,
        location_longitude: mockPhoto.metadata.location?.longitude,
        sync_status: mockPhoto.syncStatus,
        created_at: mockPhoto.createdAt.getTime(),
        updated_at: mockPhoto.updatedAt.getTime(),
        quality_overall: null,
        composition_overall: null,
        content_overall: null,
        features_embedding: null,
        cluster_id: null,
      };

      mockDbService.executeSql
        .mockResolvedValueOnce([mockRow]) // Photo query
        .mockResolvedValueOnce([]); // Faces query

      const result = await photoRepository.findById(mockPhoto.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockPhoto.id);
      expect(result?.uri).toBe(mockPhoto.uri);
      expect(result?.metadata.width).toBe(mockPhoto.metadata.width);
    });

    it('should return null for non-existent photo', async () => {
      mockDbService.executeSql.mockResolvedValue([]);

      const result = await photoRepository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('find', () => {
    it('should find photos with default parameters', async () => {
      const mockRows = [
        {
          id: 'photo-1',
          uri: 'file://photo1.jpg',
          width: 1920,
          height: 1080,
          file_size: 1024000,
          format: 'JPEG',
          timestamp: Date.now(),
          sync_status: SyncStatus.LOCAL_ONLY,
          created_at: Date.now(),
          updated_at: Date.now(),
          quality_overall: null,
          composition_overall: null,
          content_overall: null,
          features_embedding: null,
          cluster_id: null,
        },
      ];

      mockDbService.executeSql
        .mockResolvedValueOnce(mockRows) // Photos query
        .mockResolvedValue([]); // Faces queries

      const result = await photoRepository.find();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('photo-1');
    });

    it('should apply filters correctly', async () => {
      mockDbService.executeSql.mockResolvedValue([]);

      await photoRepository.find({
        clusterId: 'cluster-1',
        syncStatus: SyncStatus.SYNCED,
        hasFeatures: true,
        qualityThreshold: 0.8,
      });

      const sqlCall = mockDbService.executeSql.mock.calls[0];
      const sql = sqlCall[0];
      const params = sqlCall[1];

      expect(sql).toContain('cluster_id = ?');
      expect(sql).toContain('sync_status = ?');
      expect(sql).toContain('features_embedding IS NOT NULL');
      expect(sql).toContain('quality_overall >= ?');
      expect(params).toContain('cluster-1');
      expect(params).toContain(SyncStatus.SYNCED);
      expect(params).toContain(0.8);
    });

    it('should apply date range filter', async () => {
      mockDbService.executeSql.mockResolvedValue([]);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      await photoRepository.find({
        dateRange: { start: startDate, end: endDate },
      });

      const sqlCall = mockDbService.executeSql.mock.calls[0];
      const sql = sqlCall[0];
      const params = sqlCall[1];

      expect(sql).toContain('timestamp BETWEEN ? AND ?');
      expect(params).toContain(startDate.getTime());
      expect(params).toContain(endDate.getTime());
    });

    it('should apply location filter', async () => {
      mockDbService.executeSql.mockResolvedValue([]);

      await photoRepository.find({
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          radius: 10,
        },
      });

      const sqlCall = mockDbService.executeSql.mock.calls[0];
      const sql = sqlCall[0];
      const params = sqlCall[1];

      expect(sql).toContain('6371 * acos');
      expect(params).toContain(37.7749);
      expect(params).toContain(-122.4194);
      expect(params).toContain(10);
    });
  });

  describe('update', () => {
    it('should update photo fields', async () => {
      mockDbService.executeSql.mockResolvedValue([]);

      const updates = {
        uri: 'file://updated-photo.jpg',
        syncStatus: SyncStatus.SYNCED,
      };

      await photoRepository.update(mockPhoto.id, updates);

      const sqlCall = mockDbService.executeSql.mock.calls[0];
      const sql = sqlCall[0];
      const params = sqlCall[1];

      expect(sql).toContain('UPDATE photos SET');
      expect(sql).toContain('uri = ?');
      expect(sql).toContain('sync_status = ?');
      expect(sql).toContain('updated_at = ?');
      expect(params).toContain(updates.uri);
      expect(params).toContain(updates.syncStatus);
      expect(params).toContain(mockPhoto.id);
    });

    it('should update quality scores', async () => {
      mockDbService.executeSql.mockResolvedValue([]);

      const updates = {
        qualityScore: {
          overall: 0.85,
          sharpness: 0.9,
          exposure: 0.8,
          colorBalance: 0.85,
          noise: 0.1,
        },
      };

      await photoRepository.update(mockPhoto.id, updates);

      const sqlCall = mockDbService.executeSql.mock.calls[0];
      const sql = sqlCall[0];
      const params = sqlCall[1];

      expect(sql).toContain('quality_overall = ?');
      expect(sql).toContain('quality_sharpness = ?');
      expect(params).toContain(0.85);
      expect(params).toContain(0.9);
    });

    it('should not update if no changes provided', async () => {
      await photoRepository.update(mockPhoto.id, {});

      expect(mockDbService.executeSql).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete photo by ID', async () => {
      mockDbService.executeSql.mockResolvedValue([]);

      await photoRepository.delete(mockPhoto.id);

      expect(mockDbService.executeSql).toHaveBeenCalledWith(
        'DELETE FROM photos WHERE id = ?',
        [mockPhoto.id]
      );
    });
  });

  describe('count', () => {
    it('should count photos with filters', async () => {
      mockDbService.executeSql.mockResolvedValue([{ count: 42 }]);

      const result = await photoRepository.count({
        syncStatus: SyncStatus.LOCAL_ONLY,
      });

      expect(result).toBe(42);
      expect(mockDbService.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as count FROM photos'),
        expect.arrayContaining([SyncStatus.LOCAL_ONLY])
      );
    });
  });

  describe('batch operations', () => {
    it('should update sync status for multiple photos', async () => {
      mockDbService.executeSql.mockResolvedValue([]);

      const photoIds = ['photo-1', 'photo-2', 'photo-3'];
      await photoRepository.updateSyncStatus(photoIds, SyncStatus.SYNCED);

      const sqlCall = mockDbService.executeSql.mock.calls[0];
      const sql = sqlCall[0];
      const params = sqlCall[1];

      expect(sql).toContain('UPDATE photos SET sync_status = ?');
      expect(sql).toContain('WHERE id IN (?,?,?)');
      expect(params).toContain(SyncStatus.SYNCED);
      expect(params).toContain('photo-1');
      expect(params).toContain('photo-2');
      expect(params).toContain('photo-3');
    });

    it('should handle empty photo ID array', async () => {
      await photoRepository.updateSyncStatus([], SyncStatus.SYNCED);

      expect(mockDbService.executeSql).not.toHaveBeenCalled();
    });
  });

  describe('specialized queries', () => {
    it('should find photos by cluster ID', async () => {
      mockDbService.executeSql.mockResolvedValue([]);

      await photoRepository.findByClusterId('cluster-1');

      expect(mockDbService.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('cluster_id = ?'),
        expect.arrayContaining(['cluster-1'])
      );
    });

    it('should find photos by sync status', async () => {
      mockDbService.executeSql.mockResolvedValue([]);

      await photoRepository.findBySyncStatus(SyncStatus.PENDING_UPLOAD);

      expect(mockDbService.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('sync_status = ?'),
        expect.arrayContaining([SyncStatus.PENDING_UPLOAD])
      );
    });
  });
});