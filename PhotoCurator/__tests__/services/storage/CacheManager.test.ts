/**
 * Tests for CacheManager
 */

import { CacheManager } from '../../../src/services/storage/CacheManager';
import { DatabaseService } from '../../../src/services/storage/DatabaseService';
import RNFS from 'react-native-fs';

// Mock dependencies
jest.mock('../../../src/services/storage/DatabaseService');
jest.mock('react-native-fs');

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  let mockDbService: jest.Mocked<DatabaseService>;
  let mockRNFS: jest.Mocked<typeof RNFS>;

  beforeEach(() => {
    mockDbService = {
      getInstance: jest.fn(),
      executeSql: jest.fn().mockResolvedValue([]),
    } as any;

    mockRNFS = RNFS as jest.Mocked<typeof RNFS>;
    mockRNFS.CachesDirectoryPath = '/cache';
    mockRNFS.exists = jest.fn();
    mockRNFS.mkdir = jest.fn();
    mockRNFS.writeFile = jest.fn();
    mockRNFS.readFile = jest.fn();
    mockRNFS.unlink = jest.fn();
    mockRNFS.readDir = jest.fn();

    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDbService);
    
    // Reset the singleton instance for each test
    (CacheManager as any).instance = undefined;
    cacheManager = CacheManager.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize cache manager successfully', async () => {
      mockRNFS.exists.mockResolvedValue(false);
      mockRNFS.mkdir.mockResolvedValue(undefined);

      await cacheManager.initialize();

      expect(mockRNFS.exists).toHaveBeenCalledWith('/cache/PhotoCurator');
      expect(mockRNFS.mkdir).toHaveBeenCalledWith('/cache/PhotoCurator');
    });

    it('should not create directory if it already exists', async () => {
      mockRNFS.exists.mockResolvedValue(true);

      await cacheManager.initialize();

      expect(mockRNFS.mkdir).not.toHaveBeenCalled();
    });

    it('should be a singleton', () => {
      const instance1 = CacheManager.getInstance();
      const instance2 = CacheManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('cache operations', () => {
    beforeEach(async () => {
      mockRNFS.exists.mockResolvedValue(true);
      await cacheManager.initialize();
    });

    describe('set', () => {
      it('should store string data in cache', async () => {
        mockRNFS.writeFile.mockResolvedValue(undefined);
        mockDbService.executeSql.mockResolvedValue([]);

        await cacheManager.set('test-key', 'test-data');

        expect(mockRNFS.writeFile).toHaveBeenCalledWith(
          '/cache/PhotoCurator/test-key',
          'test-data',
          'utf8'
        );
        expect(mockDbService.executeSql).toHaveBeenCalledWith(
          'INSERT OR REPLACE INTO cache_metadata (key, size, created_at, last_accessed, expires_at) VALUES (?, ?, ?, ?, ?)',
          expect.arrayContaining(['test-key', expect.any(Number)])
        );
      });

      it('should store binary data in cache', async () => {
        const binaryData = Buffer.from('binary data');
        mockRNFS.writeFile.mockResolvedValue(undefined);
        mockDbService.executeSql.mockResolvedValue([]);

        await cacheManager.set('test-key', binaryData);

        expect(mockRNFS.writeFile).toHaveBeenCalledWith(
          '/cache/PhotoCurator/test-key',
          binaryData,
          'utf8'
        );
      });

      it('should set expiration time', async () => {
        mockRNFS.writeFile.mockResolvedValue(undefined);
        mockDbService.executeSql.mockResolvedValue([]);

        const expiresIn = 60000; // 1 minute
        await cacheManager.set('test-key', 'test-data', expiresIn);

        const sqlCall = mockDbService.executeSql.mock.calls[0];
        const params = sqlCall[1];
        const expiresAt = params[4];

        expect(expiresAt).toBeGreaterThan(Date.now());
        expect(expiresAt).toBeLessThanOrEqual(Date.now() + expiresIn + 1000); // Allow 1s tolerance
      });
    });

    describe('get', () => {
      it('should retrieve string data from cache', async () => {
        mockRNFS.exists.mockResolvedValue(true);
        mockRNFS.readFile.mockResolvedValue('cached-data');
        mockDbService.executeSql
          .mockResolvedValueOnce([{
            key: 'test-key',
            size: 100,
            created_at: Date.now(),
            last_accessed: Date.now(),
            expires_at: null,
          }])
          .mockResolvedValueOnce([]); // Update last_accessed

        const result = await cacheManager.get('test-key');

        expect(result).toBe('cached-data');
        expect(mockRNFS.readFile).toHaveBeenCalledWith(
          '/cache/PhotoCurator/test-key',
          'utf8'
        );
      });

      it('should return null for non-existent file', async () => {
        mockRNFS.exists.mockResolvedValue(false);
        mockDbService.executeSql.mockResolvedValue([]);

        const result = await cacheManager.get('test-key');

        expect(result).toBeNull();
      });

      it('should return null for expired entry', async () => {
        mockRNFS.exists.mockResolvedValue(true);
        mockDbService.executeSql.mockResolvedValueOnce([{
          key: 'test-key',
          size: 100,
          created_at: Date.now() - 120000,
          last_accessed: Date.now() - 120000,
          expires_at: Date.now() - 60000, // Expired 1 minute ago
        }]);

        const result = await cacheManager.get('test-key');

        expect(result).toBeNull();
        expect(mockRNFS.unlink).toHaveBeenCalled();
      });

      it('should update last accessed time', async () => {
        mockRNFS.exists.mockResolvedValue(true);
        mockRNFS.readFile.mockResolvedValue('cached-data');
        mockDbService.executeSql
          .mockResolvedValueOnce([{
            key: 'test-key',
            size: 100,
            created_at: Date.now(),
            last_accessed: Date.now() - 60000,
            expires_at: null,
          }])
          .mockResolvedValueOnce([]);

        await cacheManager.get('test-key');

        expect(mockDbService.executeSql).toHaveBeenCalledWith(
          'UPDATE cache_metadata SET last_accessed = ? WHERE key = ?',
          expect.arrayContaining([expect.any(Number), 'test-key'])
        );
      });
    });

    describe('getBinary', () => {
      it('should retrieve binary data from cache', async () => {
        mockRNFS.exists.mockResolvedValue(true);
        mockRNFS.readFile.mockResolvedValue('YmluYXJ5IGRhdGE='); // base64 for "binary data"
        mockDbService.executeSql
          .mockResolvedValueOnce([{
            key: 'test-key',
            size: 100,
            created_at: Date.now(),
            last_accessed: Date.now(),
            expires_at: null,
          }])
          .mockResolvedValueOnce([]);

        const result = await cacheManager.getBinary('test-key');

        expect(result).toBeInstanceOf(Buffer);
        expect(result?.toString()).toBe('binary data');
        expect(mockRNFS.readFile).toHaveBeenCalledWith(
          '/cache/PhotoCurator/test-key',
          'base64'
        );
      });
    });

    describe('has', () => {
      it('should return true for existing non-expired entry', async () => {
        mockRNFS.exists.mockResolvedValue(true);
        mockDbService.executeSql.mockResolvedValue([{
          key: 'test-key',
          size: 100,
          created_at: Date.now(),
          last_accessed: Date.now(),
          expires_at: null,
        }]);

        const result = await cacheManager.has('test-key');

        expect(result).toBe(true);
      });

      it('should return false for non-existent entry', async () => {
        mockRNFS.exists.mockResolvedValue(false);
        mockDbService.executeSql.mockResolvedValue([]);

        const result = await cacheManager.has('test-key');

        expect(result).toBe(false);
      });

      it('should return false for expired entry', async () => {
        mockRNFS.exists.mockResolvedValue(true);
        mockDbService.executeSql.mockResolvedValue([{
          key: 'test-key',
          size: 100,
          created_at: Date.now() - 120000,
          last_accessed: Date.now() - 120000,
          expires_at: Date.now() - 60000,
        }]);

        const result = await cacheManager.has('test-key');

        expect(result).toBe(false);
      });
    });

    describe('remove', () => {
      it('should remove entry from cache', async () => {
        mockRNFS.exists.mockResolvedValue(true);
        mockRNFS.unlink.mockResolvedValue(undefined);
        mockDbService.executeSql.mockResolvedValue([]);

        await cacheManager.remove('test-key');

        expect(mockRNFS.unlink).toHaveBeenCalledWith('/cache/PhotoCurator/test-key');
        expect(mockDbService.executeSql).toHaveBeenCalledWith(
          'DELETE FROM cache_metadata WHERE key = ?',
          ['test-key']
        );
      });

      it('should handle non-existent file gracefully', async () => {
        mockRNFS.exists.mockResolvedValue(false);
        mockDbService.executeSql.mockResolvedValue([]);

        await expect(cacheManager.remove('test-key')).resolves.not.toThrow();
      });
    });

    describe('clear', () => {
      it('should clear all cache entries', async () => {
        mockRNFS.readDir.mockResolvedValue([
          { path: '/cache/PhotoCurator/file1', name: 'file1', isDirectory: () => false, isFile: () => true, size: 100, mtime: new Date(), ctime: new Date() },
          { path: '/cache/PhotoCurator/file2', name: 'file2', isDirectory: () => false, isFile: () => true, size: 200, mtime: new Date(), ctime: new Date() },
        ]);
        mockRNFS.unlink.mockResolvedValue(undefined);
        mockDbService.executeSql.mockResolvedValue([]);

        await cacheManager.clear();

        expect(mockRNFS.unlink).toHaveBeenCalledTimes(2);
        expect(mockDbService.executeSql).toHaveBeenCalledWith('DELETE FROM cache_metadata');
      });
    });
  });

  describe('statistics', () => {
    beforeEach(async () => {
      mockRNFS.exists.mockResolvedValue(true);
      await cacheManager.initialize();
    });

    it('should get cache statistics', async () => {
      mockDbService.executeSql
        .mockResolvedValueOnce([{ count: 10, total_size: 1024000 }])
        .mockResolvedValueOnce([{ oldest: Date.now() - 86400000 }])
        .mockResolvedValueOnce([{ newest: Date.now() }]);

      const stats = await cacheManager.getStats();

      expect(stats.totalEntries).toBe(10);
      expect(stats.totalSize).toBe(1024000);
      expect(stats.oldestEntry).toBeInstanceOf(Date);
      expect(stats.newestEntry).toBeInstanceOf(Date);
    });

    it('should handle empty cache', async () => {
      mockDbService.executeSql
        .mockResolvedValueOnce([{ count: 0, total_size: null }])
        .mockResolvedValueOnce([{ oldest: null }])
        .mockResolvedValueOnce([{ newest: null }]);

      const stats = await cacheManager.getStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.oldestEntry).toBeNull();
      expect(stats.newestEntry).toBeNull();
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      mockRNFS.exists.mockResolvedValue(true);
      await cacheManager.initialize();
    });

    it('should cleanup expired entries', async () => {
      const expiredTime = Date.now() - 60000;
      mockDbService.executeSql
        .mockResolvedValueOnce([{ key: 'expired-key' }])
        .mockResolvedValueOnce([{ count: 5, total_size: 500000 }]);
      
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.unlink.mockResolvedValue(undefined);

      await cacheManager.cleanup();

      expect(mockDbService.executeSql).toHaveBeenCalledWith(
        'SELECT key FROM cache_metadata WHERE expires_at IS NOT NULL AND expires_at < ?',
        [expect.any(Number)]
      );
    });
  });

  describe('configuration', () => {
    it('should update cache configuration', () => {
      const newConfig = {
        maxSize: 1024 * 1024 * 1024, // 1GB
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
      };

      cacheManager.updateConfig(newConfig);

      const config = cacheManager.getConfig();
      expect(config.maxSize).toBe(newConfig.maxSize);
      expect(config.maxAge).toBe(newConfig.maxAge);
    });

    it('should get current configuration', () => {
      const config = cacheManager.getConfig();

      expect(config).toHaveProperty('maxSize');
      expect(config).toHaveProperty('maxAge');
      expect(config).toHaveProperty('cleanupInterval');
      expect(typeof config.maxSize).toBe('number');
      expect(typeof config.maxAge).toBe('number');
      expect(typeof config.cleanupInterval).toBe('number');
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      mockRNFS.exists.mockResolvedValue(true);
      await cacheManager.initialize();
    });

    it('should handle file system errors gracefully', async () => {
      mockRNFS.writeFile.mockRejectedValue(new Error('File system error'));

      await expect(cacheManager.set('test-key', 'test-data')).rejects.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      mockRNFS.writeFile.mockResolvedValue(undefined);
      mockDbService.executeSql.mockRejectedValue(new Error('Database error'));

      await expect(cacheManager.set('test-key', 'test-data')).rejects.toThrow();
    });

    it('should return null on read errors', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockRejectedValue(new Error('Read error'));
      mockDbService.executeSql.mockResolvedValue([{
        key: 'test-key',
        size: 100,
        created_at: Date.now(),
        last_accessed: Date.now(),
        expires_at: null,
      }]);

      const result = await cacheManager.get('test-key');

      expect(result).toBeNull();
    });
  });
});