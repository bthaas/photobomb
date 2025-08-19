/**
 * SyncQueue Tests
 */

import { SyncQueue } from '../../../src/services/sync/SyncQueue';
import { SyncOperation } from '../../../src/types/sync';
import { DatabaseService } from '../../../src/services/storage/DatabaseService';

// Mock DatabaseService
jest.mock('../../../src/services/storage/DatabaseService');

describe('SyncQueue', () => {
  let syncQueue: SyncQueue;
  let mockDb: jest.Mocked<DatabaseService>;

  const mockOperation: SyncOperation = {
    id: 'op1',
    type: 'upload',
    photoId: 'photo1',
    status: 'pending',
    progress: 0,
    retryCount: 0,
    createdAt: new Date('2023-01-01T10:00:00Z'),
    updatedAt: new Date('2023-01-01T10:00:00Z')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb = {
      execute: jest.fn(),
      query: jest.fn(),
      getInstance: jest.fn()
    } as any;

    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDb);
    
    syncQueue = new SyncQueue({ maxRetries: 3 });
  });

  describe('enqueue', () => {
    it('should add operation to queue', async () => {
      mockDb.execute.mockResolvedValue(undefined);

      await syncQueue.enqueue(mockOperation);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sync_queue'),
        [
          mockOperation.id,
          mockOperation.type,
          mockOperation.photoId,
          mockOperation.status,
          mockOperation.progress,
          null, // error
          mockOperation.retryCount,
          mockOperation.createdAt.toISOString(),
          mockOperation.updatedAt.toISOString()
        ]
      );
    });

    it('should handle database errors', async () => {
      mockDb.execute.mockRejectedValue(new Error('Database error'));

      await expect(syncQueue.enqueue(mockOperation)).rejects.toThrow('Database error');
    });
  });

  describe('remove', () => {
    it('should remove operation from queue', async () => {
      mockDb.execute.mockResolvedValue(undefined);

      await syncQueue.remove('op1');

      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM sync_queue WHERE id = ?',
        ['op1']
      );
    });
  });

  describe('update', () => {
    it('should update operation in queue', async () => {
      const updatedOperation = {
        ...mockOperation,
        status: 'completed' as const,
        progress: 100
      };

      mockDb.execute.mockResolvedValue(undefined);

      await syncQueue.update(updatedOperation);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sync_queue'),
        [
          updatedOperation.status,
          updatedOperation.progress,
          null, // error
          updatedOperation.retryCount,
          expect.any(String), // updatedAt
          updatedOperation.id
        ]
      );
    });
  });

  describe('getAll', () => {
    it('should return all pending and failed operations', async () => {
      const mockRows = [
        {
          id: 'op1',
          type: 'upload',
          photoId: 'photo1',
          status: 'pending',
          progress: 0,
          error: null,
          retryCount: 0,
          createdAt: '2023-01-01T10:00:00Z',
          updatedAt: '2023-01-01T10:00:00Z'
        },
        {
          id: 'op2',
          type: 'download',
          photoId: 'photo2',
          status: 'failed',
          progress: 50,
          error: 'Network error',
          retryCount: 1,
          createdAt: '2023-01-01T10:01:00Z',
          updatedAt: '2023-01-01T10:02:00Z'
        }
      ];

      mockDb.query.mockResolvedValue(mockRows);

      const operations = await syncQueue.getAll();

      expect(operations).toHaveLength(2);
      expect(operations[0].id).toBe('op1');
      expect(operations[1].id).toBe('op2');
      expect(operations[1].error).toBe('Network error');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status IN (\'pending\', \'failed\') AND retryCount < ?'),
        [3]
      );
    });

    it('should return empty array when no operations', async () => {
      mockDb.query.mockResolvedValue([]);

      const operations = await syncQueue.getAll();

      expect(operations).toHaveLength(0);
    });
  });

  describe('getByType', () => {
    it('should return operations of specific type', async () => {
      const mockRows = [
        {
          id: 'op1',
          type: 'upload',
          photoId: 'photo1',
          status: 'pending',
          progress: 0,
          error: null,
          retryCount: 0,
          createdAt: '2023-01-01T10:00:00Z',
          updatedAt: '2023-01-01T10:00:00Z'
        }
      ];

      mockDb.query.mockResolvedValue(mockRows);

      const operations = await syncQueue.getByType('upload');

      expect(operations).toHaveLength(1);
      expect(operations[0].type).toBe('upload');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE type = ?'),
        ['upload', 3]
      );
    });
  });

  describe('getByPhotoId', () => {
    it('should return operations for specific photo', async () => {
      const mockRows = [
        {
          id: 'op1',
          type: 'upload',
          photoId: 'photo1',
          status: 'completed',
          progress: 100,
          error: null,
          retryCount: 0,
          createdAt: '2023-01-01T10:00:00Z',
          updatedAt: '2023-01-01T10:01:00Z'
        }
      ];

      mockDb.query.mockResolvedValue(mockRows);

      const operations = await syncQueue.getByPhotoId('photo1');

      expect(operations).toHaveLength(1);
      expect(operations[0].photoId).toBe('photo1');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE photoId = ?'),
        ['photo1']
      );
    });
  });

  describe('getRetryableOperations', () => {
    it('should return failed operations that can be retried', async () => {
      const mockRows = [
        {
          id: 'op1',
          type: 'upload',
          photoId: 'photo1',
          status: 'failed',
          progress: 0,
          error: 'Network timeout',
          retryCount: 1,
          createdAt: '2023-01-01T10:00:00Z',
          updatedAt: '2023-01-01T10:01:00Z'
        }
      ];

      mockDb.query.mockResolvedValue(mockRows);

      const operations = await syncQueue.getRetryableOperations();

      expect(operations).toHaveLength(1);
      expect(operations[0].status).toBe('failed');
      expect(operations[0].retryCount).toBeLessThan(3);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = \'failed\' AND retryCount < ?'),
        [3]
      );
    });
  });

  describe('cleanup', () => {
    it('should remove completed operations older than specified days', async () => {
      mockDb.execute.mockResolvedValue(undefined);

      await syncQueue.cleanup(7);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM sync_queue'),
        [expect.any(String)]
      );
    });

    it('should use default cleanup period', async () => {
      mockDb.execute.mockResolvedValue(undefined);

      await syncQueue.cleanup();

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return queue statistics', async () => {
      mockDb.query
        .mockResolvedValueOnce([{ count: 10 }]) // total
        .mockResolvedValueOnce([ // by status
          { status: 'pending', count: 5 },
          { status: 'failed', count: 2 },
          { status: 'completed', count: 3 }
        ])
        .mockResolvedValueOnce([ // by type
          { type: 'upload', count: 4 },
          { type: 'download', count: 3 }
        ]);

      const stats = await syncQueue.getStats();

      expect(stats.total).toBe(10);
      expect(stats.pending).toBe(5);
      expect(stats.failed).toBe(2);
      expect(stats.completed).toBe(3);
      expect(stats.byType.upload).toBe(4);
      expect(stats.byType.download).toBe(3);
    });
  });

  describe('clear', () => {
    it('should clear all operations', async () => {
      mockDb.execute.mockResolvedValue(undefined);

      await syncQueue.clear();

      expect(mockDb.execute).toHaveBeenCalledWith('DELETE FROM sync_queue');
    });
  });

  describe('exists', () => {
    it('should return true if operation exists', async () => {
      mockDb.query.mockResolvedValue([{ count: 1 }]);

      const exists = await syncQueue.exists('op1');

      expect(exists).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM sync_queue WHERE id = ?',
        ['op1']
      );
    });

    it('should return false if operation does not exist', async () => {
      mockDb.query.mockResolvedValue([{ count: 0 }]);

      const exists = await syncQueue.exists('op1');

      expect(exists).toBe(false);
    });
  });

  describe('getNext', () => {
    it('should return next pending operation', async () => {
      const mockRows = [
        {
          id: 'op1',
          type: 'upload',
          photoId: 'photo1',
          status: 'pending',
          progress: 0,
          error: null,
          retryCount: 0,
          createdAt: '2023-01-01T10:00:00Z',
          updatedAt: '2023-01-01T10:00:00Z'
        }
      ];

      mockDb.query.mockResolvedValue(mockRows);

      const operation = await syncQueue.getNext();

      expect(operation).toBeDefined();
      expect(operation!.id).toBe('op1');
      expect(operation!.status).toBe('pending');
    });

    it('should return null if no pending operations', async () => {
      mockDb.query.mockResolvedValue([]);

      const operation = await syncQueue.getNext();

      expect(operation).toBeNull();
    });
  });

  describe('status updates', () => {
    beforeEach(() => {
      mockDb.execute.mockResolvedValue(undefined);
    });

    it('should mark operation as in progress', async () => {
      await syncQueue.markInProgress('op1');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('SET status = \'in_progress\''),
        [expect.any(String), 'op1']
      );
    });

    it('should mark operation as completed', async () => {
      await syncQueue.markCompleted('op1');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('SET status = \'completed\', progress = 100'),
        [expect.any(String), 'op1']
      );
    });

    it('should mark operation as failed', async () => {
      await syncQueue.markFailed('op1', 'Network error');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('SET status = \'failed\', error = ?, retryCount = retryCount + 1'),
        ['Network error', expect.any(String), 'op1']
      );
    });
  });

  describe('initialization', () => {
    it('should initialize database tables on construction', () => {
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS sync_queue')
      );
    });

    it('should create indexes for performance', () => {
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS')
      );
    });
  });
});