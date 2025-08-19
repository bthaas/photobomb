/**
 * ConflictResolver Tests
 */

import { ConflictResolver } from '../../../src/services/sync/ConflictResolver';
import { Photo } from '../../../src/types/photo';
import { SyncConflict } from '../../../src/types/sync';
import { DatabaseService } from '../../../src/services/storage/DatabaseService';
import { PhotoRepository } from '../../../src/services/storage/PhotoRepository';

// Mock dependencies
jest.mock('../../../src/services/storage/DatabaseService');
jest.mock('../../../src/services/storage/PhotoRepository');

describe('ConflictResolver', () => {
  let conflictResolver: ConflictResolver;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockPhotoRepository: jest.Mocked<PhotoRepository>;

  const basePhoto: Photo = {
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
    syncStatus: 'synced',
    createdAt: new Date('2023-01-01T09:00:00Z'),
    updatedAt: new Date('2023-01-01T10:00:00Z')
  };

  const localPhoto: Photo = {
    ...basePhoto,
    qualityScore: { overall: 0.8, sharpness: 0.9, exposure: 0.7, colorBalance: 0.8, noise: 0.9 },
    updatedAt: new Date('2023-01-01T11:00:00Z')
  };

  const remotePhoto: Photo = {
    ...basePhoto,
    qualityScore: { overall: 0.7, sharpness: 0.8, exposure: 0.8, colorBalance: 0.7, noise: 0.8 },
    updatedAt: new Date('2023-01-01T10:30:00Z')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb = {
      execute: jest.fn(),
      query: jest.fn(),
      getInstance: jest.fn()
    } as any;

    mockPhotoRepository = {
      updatePhoto: jest.fn()
    } as any;

    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDb);
    
    conflictResolver = new ConflictResolver('merge', mockPhotoRepository);
  });

  describe('detectConflicts', () => {
    it('should detect no conflicts for identical photos', async () => {
      const conflict = await conflictResolver.detectConflicts(localPhoto, localPhoto);

      expect(conflict).toBeNull();
    });

    it('should detect metadata conflicts', async () => {
      const modifiedRemote = {
        ...remotePhoto,
        metadata: {
          ...remotePhoto.metadata,
          width: 1280 // Different width
        }
      };

      mockDb.execute.mockResolvedValue(undefined);

      const conflict = await conflictResolver.detectConflicts(localPhoto, modifiedRemote);

      expect(conflict).toBeDefined();
      expect(conflict!.type).toBe('version_conflict'); // Updated expectation
      expect(conflict!.photoId).toBe('photo1');
      expect(conflict!.localVersion).toEqual(localPhoto);
      expect(conflict!.remoteVersion).toEqual(modifiedRemote);
    });

    it('should detect quality score conflicts', async () => {
      mockDb.execute.mockResolvedValue(undefined);

      const conflict = await conflictResolver.detectConflicts(localPhoto, remotePhoto);

      expect(conflict).toBeDefined();
      expect(conflict!.conflictDetails.conflicts).toContain('quality_score_mismatch');
    });

    it('should detect timestamp conflicts', async () => {
      const timestampConflictRemote = {
        ...remotePhoto,
        updatedAt: new Date('2023-01-01T12:00:00Z') // More than 1 second difference
      };

      mockDb.execute.mockResolvedValue(undefined);

      const conflict = await conflictResolver.detectConflicts(localPhoto, timestampConflictRemote);

      expect(conflict).toBeDefined();
      expect(conflict!.type).toBe('version_conflict');
      expect(conflict!.conflictDetails.conflicts).toContain('timestamp_mismatch');
    });
  });

  describe('resolve', () => {
    const mockConflict: SyncConflict = {
      id: 'conflict1',
      photoId: 'photo1',
      type: 'version_conflict',
      localVersion: localPhoto,
      remoteVersion: remotePhoto,
      conflictDetails: {
        conflicts: ['quality_score_mismatch', 'timestamp_mismatch'],
        detectedAt: new Date(),
        localLastModified: localPhoto.updatedAt,
        remoteLastModified: remotePhoto.updatedAt
      },
      createdAt: new Date()
    };

    beforeEach(() => {
      mockDb.execute.mockResolvedValue(undefined);
      mockPhotoRepository.updatePhoto.mockResolvedValue(undefined);
    });

    it('should resolve with local wins strategy', async () => {
      const resolved = await conflictResolver.resolve(mockConflict, 'local_wins');

      expect(resolved).toEqual(localPhoto);
      expect(mockPhotoRepository.updatePhoto).toHaveBeenCalledWith('photo1', localPhoto);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conflict_resolutions'),
        expect.any(Array)
      );
    });

    it('should resolve with remote wins strategy', async () => {
      const resolved = await conflictResolver.resolve(mockConflict, 'remote_wins');

      expect(resolved).toEqual(remotePhoto);
      expect(mockPhotoRepository.updatePhoto).toHaveBeenCalledWith('photo1', remotePhoto);
    });

    it('should resolve with merge strategy', async () => {
      const resolved = await conflictResolver.resolve(mockConflict, 'merge');

      expect(resolved.id).toBe('photo1');
      expect(resolved.updatedAt).toEqual(localPhoto.updatedAt); // Local is newer
      expect(resolved.qualityScore).toEqual(localPhoto.qualityScore); // Local has higher overall score
      expect(mockPhotoRepository.updatePhoto).toHaveBeenCalledWith('photo1', resolved);
    });

    it('should throw error for manual resolution', async () => {
      await expect(conflictResolver.resolve(mockConflict, 'manual'))
        .rejects.toThrow('Manual resolution requires user intervention');
    });

    it('should use default strategy when none provided', async () => {
      const resolved = await conflictResolver.resolve(mockConflict);

      expect(resolved).toBeDefined();
      expect(mockPhotoRepository.updatePhoto).toHaveBeenCalled();
    });

    it('should handle missing local version for local_wins', async () => {
      const conflictWithoutLocal = {
        ...mockConflict,
        localVersion: null
      };

      await expect(conflictResolver.resolve(conflictWithoutLocal, 'local_wins'))
        .rejects.toThrow('Local version not available for local_wins resolution');
    });

    it('should handle missing remote version for remote_wins', async () => {
      const conflictWithoutRemote = {
        ...mockConflict,
        remoteVersion: null
      };

      await expect(conflictResolver.resolve(conflictWithoutRemote, 'remote_wins'))
        .rejects.toThrow('Remote version not available for remote_wins resolution');
    });
  });

  describe('getPendingConflicts', () => {
    it('should return all pending conflicts', async () => {
      const mockRows = [
        {
          id: 'conflict1',
          photoId: 'photo1',
          type: 'metadata_mismatch',
          localVersion: JSON.stringify(localPhoto),
          remoteVersion: JSON.stringify(remotePhoto),
          conflictDetails: JSON.stringify({ conflicts: ['metadata_mismatch'] }),
          createdAt: '2023-01-01T10:00:00Z'
        }
      ];

      mockDb.query.mockResolvedValue(mockRows);

      const conflicts = await conflictResolver.getPendingConflicts();

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].id).toBe('conflict1');
      expect(conflicts[0].localVersion).toEqual(expect.objectContaining({
        id: localPhoto.id,
        uri: localPhoto.uri
      }));
      expect(conflicts[0].remoteVersion).toEqual(expect.objectContaining({
        id: remotePhoto.id,
        uri: remotePhoto.uri
      }));
    });

    it('should return empty array when no conflicts', async () => {
      mockDb.query.mockResolvedValue([]);

      const conflicts = await conflictResolver.getPendingConflicts();

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('getConflictsForPhoto', () => {
    it('should return conflicts for specific photo', async () => {
      const mockRows = [
        {
          id: 'conflict1',
          photoId: 'photo1',
          type: 'version_conflict',
          localVersion: JSON.stringify(localPhoto),
          remoteVersion: JSON.stringify(remotePhoto),
          conflictDetails: JSON.stringify({ conflicts: ['timestamp_mismatch'] }),
          createdAt: '2023-01-01T10:00:00Z'
        }
      ];

      mockDb.query.mockResolvedValue(mockRows);

      const conflicts = await conflictResolver.getConflictsForPhoto('photo1');

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].photoId).toBe('photo1');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE photoId = ?'),
        ['photo1']
      );
    });
  });

  describe('autoResolveConflicts', () => {
    beforeEach(() => {
      mockDb.query.mockResolvedValue([
        {
          id: 'conflict1',
          photoId: 'photo1',
          type: 'metadata_mismatch',
          localVersion: JSON.stringify(localPhoto),
          remoteVersion: JSON.stringify(remotePhoto),
          conflictDetails: JSON.stringify({ conflicts: ['metadata_mismatch'] }),
          createdAt: '2023-01-01T10:00:00Z'
        }
      ]);
      mockDb.execute.mockResolvedValue(undefined);
      mockPhotoRepository.updatePhoto.mockResolvedValue(undefined);
    });

    it('should auto-resolve resolvable conflicts', async () => {
      const result = await conflictResolver.autoResolveConflicts();

      expect(result.resolved).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should not auto-resolve manual strategy conflicts', async () => {
      const manualResolver = new ConflictResolver('manual', mockPhotoRepository);
      
      const result = await manualResolver.autoResolveConflicts();

      expect(result.resolved).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should handle resolution failures', async () => {
      mockPhotoRepository.updatePhoto.mockRejectedValue(new Error('Update failed'));

      const result = await conflictResolver.autoResolveConflicts();

      expect(result.resolved).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  describe('getSuggestions', () => {
    const mockConflict: SyncConflict = {
      id: 'conflict1',
      photoId: 'photo1',
      type: 'version_conflict',
      localVersion: localPhoto,
      remoteVersion: remotePhoto,
      conflictDetails: { conflicts: ['timestamp_mismatch'] },
      createdAt: new Date()
    };

    it('should suggest local_wins when local is newer', async () => {
      const suggestions = await conflictResolver.getSuggestions(mockConflict);

      expect(suggestions.recommended).toBe('local_wins');
      expect(suggestions.reasons).toContain('Local version is more recent');
      expect(suggestions.alternatives).toContain('merge');
      expect(suggestions.alternatives).toContain('remote_wins');
    });

    it('should suggest remote_wins when remote is newer', async () => {
      const newerRemoteConflict = {
        ...mockConflict,
        localVersion: { ...localPhoto, updatedAt: new Date('2023-01-01T09:00:00Z') },
        remoteVersion: { ...remotePhoto, updatedAt: new Date('2023-01-01T12:00:00Z') }
      };

      const suggestions = await conflictResolver.getSuggestions(newerRemoteConflict);

      expect(suggestions.recommended).toBe('remote_wins');
      expect(suggestions.reasons).toContain('Remote version is more recent');
    });

    it('should suggest merge when timestamps are equal', async () => {
      const equalTimestampConflict = {
        ...mockConflict,
        localVersion: { ...localPhoto, updatedAt: new Date('2023-01-01T10:00:00Z') },
        remoteVersion: { ...remotePhoto, updatedAt: new Date('2023-01-01T10:00:00Z') }
      };

      const suggestions = await conflictResolver.getSuggestions(equalTimestampConflict);

      expect(suggestions.recommended).toBe('merge');
      expect(suggestions.reasons).toContain('Versions have same timestamp, merging is safest');
    });

    it('should provide context-specific reasons', async () => {
      const metadataConflict = {
        ...mockConflict,
        type: 'metadata_mismatch' as const
      };

      const suggestions = await conflictResolver.getSuggestions(metadataConflict);

      expect(suggestions.reasons).toContain('Metadata conflicts can usually be merged safely');
    });
  });

  describe('cleanupResolutions', () => {
    it('should clean up old resolutions', async () => {
      mockDb.execute.mockResolvedValue(undefined);

      await conflictResolver.cleanupResolutions(30);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM conflict_resolutions'),
        [expect.any(String)]
      );
    });

    it('should use default cleanup period', async () => {
      mockDb.execute.mockResolvedValue(undefined);

      await conflictResolver.cleanupResolutions();

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('merge resolution logic', () => {
    it('should select best quality scores', async () => {
      const conflict: SyncConflict = {
        id: 'conflict1',
        photoId: 'photo1',
        type: 'version_conflict',
        localVersion: {
          ...localPhoto,
          qualityScore: { overall: 0.9, sharpness: 0.8, exposure: 0.9, colorBalance: 0.8, noise: 0.9 }
        },
        remoteVersion: {
          ...remotePhoto,
          qualityScore: { overall: 0.7, sharpness: 0.9, exposure: 0.6, colorBalance: 0.9, noise: 0.7 }
        },
        conflictDetails: { conflicts: ['quality_score_mismatch'] },
        createdAt: new Date()
      };

      mockDb.execute.mockResolvedValue(undefined);
      mockPhotoRepository.updatePhoto.mockResolvedValue(undefined);

      const resolved = await conflictResolver.resolve(conflict, 'merge');

      expect(resolved.qualityScore?.overall).toBe(0.9); // Local has higher overall score
    });

    it('should merge features and faces', async () => {
      const conflict: SyncConflict = {
        id: 'conflict1',
        photoId: 'photo1',
        type: 'version_conflict',
        localVersion: {
          ...localPhoto,
          features: { embedding: [1, 2, 3], objects: [{ name: 'person', confidence: 0.9 }] },
          faces: [{ id: 'face1', embedding: [1, 2, 3], boundingBox: { x: 0, y: 0, width: 100, height: 100 } }]
        },
        remoteVersion: {
          ...remotePhoto,
          features: { embedding: [4, 5, 6], objects: [{ name: 'car', confidence: 0.8 }] },
          faces: [{ id: 'face2', embedding: [4, 5, 6], boundingBox: { x: 100, y: 100, width: 100, height: 100 } }]
        },
        conflictDetails: { conflicts: ['features_mismatch'] },
        createdAt: new Date()
      };

      mockDb.execute.mockResolvedValue(undefined);
      mockPhotoRepository.updatePhoto.mockResolvedValue(undefined);

      const resolved = await conflictResolver.resolve(conflict, 'merge');

      expect(resolved.features?.objects).toHaveLength(2);
      expect(resolved.faces).toHaveLength(2);
    });

    it('should handle missing scores gracefully', async () => {
      const conflict: SyncConflict = {
        id: 'conflict1',
        photoId: 'photo1',
        type: 'version_conflict',
        localVersion: { ...localPhoto, qualityScore: undefined },
        remoteVersion: { ...remotePhoto, qualityScore: { overall: 0.8 } },
        conflictDetails: { conflicts: ['quality_score_mismatch'] },
        createdAt: new Date()
      };

      mockDb.execute.mockResolvedValue(undefined);
      mockPhotoRepository.updatePhoto.mockResolvedValue(undefined);

      const resolved = await conflictResolver.resolve(conflict, 'merge');

      expect(resolved.qualityScore).toEqual({ overall: 0.8 });
    });
  });

  describe('initialization', () => {
    it('should initialize database tables on construction', () => {
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS sync_conflicts')
      );
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS conflict_resolutions')
      );
    });

    it('should create indexes for performance', () => {
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS')
      );
    });
  });
});