/**
 * Tests for DatabaseService
 */

import { DatabaseService } from '../../../src/services/storage/DatabaseService';

// Mock SQLite
const mockDatabase = {
  executeSql: jest.fn((sql, params, success, error) => {
    // Mock successful execution
    const mockResult = {
      rows: {
        length: 0,
        item: jest.fn(),
      },
    };
    if (success) success(mockResult);
  }),
  transaction: jest.fn((callback, error, success) => {
    const mockTransaction = {
      executeSql: jest.fn((sql, params, success, error) => {
        const mockResult = {
          rows: {
            length: 0,
            item: jest.fn(),
          },
        };
        if (success) success(mockTransaction, mockResult);
      }),
    };
    
    try {
      callback(mockTransaction);
      if (success) success();
    } catch (err) {
      if (error) error(err);
    }
  }),
  close: jest.fn(() => Promise.resolve()),
};

jest.mock('react-native-sqlite-storage', () => ({
  DEBUG: jest.fn(),
  enablePromise: jest.fn(),
  openDatabase: jest.fn(() => Promise.resolve(mockDatabase)),
  deleteDatabase: jest.fn(() => Promise.resolve()),
}));

describe('DatabaseService', () => {
  let dbService: DatabaseService;

  beforeEach(() => {
    // Reset the singleton instance for each test
    (DatabaseService as any).instance = undefined;
    dbService = DatabaseService.getInstance();
  });

  afterEach(async () => {
    try {
      await dbService.close();
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  describe('initialization', () => {
    it('should initialize database successfully', async () => {
      await expect(dbService.initialize()).resolves.not.toThrow();
    });

    it('should be a singleton', () => {
      const instance1 = DatabaseService.getInstance();
      const instance2 = DatabaseService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should not reinitialize if already initialized', async () => {
      await dbService.initialize();
      await expect(dbService.initialize()).resolves.not.toThrow();
    });
  });

  describe('database operations', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    it('should execute SQL queries', async () => {
      const result = await dbService.executeSql('SELECT 1 as test');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should execute transactions', async () => {
      const result = await dbService.executeTransaction(async (tx) => {
        return 'test result';
      });
      expect(result).toBe('test result');
    });

    it('should handle SQL execution errors', async () => {
      // Mock error scenario
      const mockDb = {
        executeSql: jest.fn((sql, params, success, error) => {
          error(new Error('SQL error'));
        }),
      };
      
      (dbService as any).database = mockDb;
      
      await expect(dbService.executeSql('INVALID SQL')).rejects.toThrow();
    });
  });

  describe('metadata operations', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    it('should set and get metadata', async () => {
      await dbService.setMetadata('test_key', 'test_value');
      const value = await dbService.getMetadata('test_key');
      expect(value).toBe('test_value');
    });

    it('should return null for non-existent metadata', async () => {
      const value = await dbService.getMetadata('non_existent_key');
      expect(value).toBeNull();
    });
  });

  describe('statistics', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    it('should get database statistics', async () => {
      const stats = await dbService.getStatistics();
      expect(stats).toHaveProperty('totalPhotos');
      expect(stats).toHaveProperty('totalClusters');
      expect(stats).toHaveProperty('totalFaces');
      expect(stats).toHaveProperty('databaseSize');
      expect(typeof stats.totalPhotos).toBe('number');
      expect(typeof stats.totalClusters).toBe('number');
      expect(typeof stats.totalFaces).toBe('number');
      expect(typeof stats.databaseSize).toBe('number');
    });
  });

  describe('database lifecycle', () => {
    it('should close database connection', async () => {
      await dbService.initialize();
      await expect(dbService.close()).resolves.not.toThrow();
    });

    it('should delete database', async () => {
      await dbService.initialize();
      await expect(dbService.deleteDatabase()).resolves.not.toThrow();
    });

    it('should throw error when accessing closed database', async () => {
      await dbService.initialize();
      await dbService.close();
      expect(() => dbService.getDatabase()).toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors', async () => {
      // Mock initialization error
      const SQLite = require('react-native-sqlite-storage');
      SQLite.openDatabase.mockRejectedValueOnce(new Error('Init error'));
      
      const newDbService = new (DatabaseService as any)();
      await expect(newDbService.initialize()).rejects.toThrow();
    });

    it('should handle transaction errors', async () => {
      await dbService.initialize();
      
      await expect(
        dbService.executeTransaction(async () => {
          throw new Error('Transaction error');
        })
      ).rejects.toThrow('Transaction error');
    });
  });
});