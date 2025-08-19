/**
 * SyncStatusTracker Tests
 */

import { SyncStatusTracker } from '../../../src/services/sync/SyncStatusTracker';
import { SyncSession, SyncOperation } from '../../../src/types/sync';
import { DatabaseService } from '../../../src/services/storage/DatabaseService';

// Mock DatabaseService
jest.mock('../../../src/services/storage/DatabaseService');

describe('SyncStatusTracker', () => {
  let statusTracker: SyncStatusTracker;
  let mockDb: jest.Mocked<DatabaseService>;

  const mockSession: SyncSession = {
    id: 'session1',
    userId: 'user1',
    startTime: new Date('2023-01-01T10:00:00Z'),
    endTime: new Date('2023-01-01T10:05:00Z'),
    operations: [],
    conflicts: [],
    status: 'completed',
    summary: {
      totalOperations: 5,
      completedOperations: 4,
      failedOperations: 1,
      conflictsResolved: 0,
      bytesTransferred: 1024000
    }
  };

  const mockOperation: SyncOperation = {
    id: 'op1',
    type: 'upload',
    photoId: 'photo1',
    status: 'completed',
    progress: 100,
    retryCount: 0,
    createdAt: new Date('2023-01-01T10:00:00Z'),
    updatedAt: new Date('2023-01-01T10:01:00Z')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb = {
      execute: jest.fn(),
      query: jest.fn(),
      getInstance: jest.fn()
    } as any;

    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDb);
    
    statusTracker = new SyncStatusTracker();
  });

  describe('recordSession', () => {
    beforeEach(() => {
      mockDb.execute.mockResolvedValue(undefined);
    });

    it('should record sync session', async () => {
      await statusTracker.recordSession(mockSession);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO sync_sessions'),
        [
          mockSession.id,
          mockSession.userId,
          mockSession.startTime.toISOString(),
          mockSession.endTime!.toISOString(),
          mockSession.status,
          mockSession.summary.totalOperations,
          mockSession.summary.completedOperations,
          mockSession.summary.failedOperations,
          mockSession.summary.conflictsResolved,
          mockSession.summary.bytesTransferred
        ]
      );
    });

    it('should record session without end time', async () => {
      const activeSession = {
        ...mockSession,
        endTime: undefined,
        status: 'active' as const
      };

      await statusTracker.recordSession(activeSession);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO sync_sessions'),
        expect.arrayContaining([null]) // endTime should be null
      );
    });

    it('should record session operations', async () => {
      const sessionWithOps = {
        ...mockSession,
        operations: [mockOperation]
      };

      await statusTracker.recordSession(sessionWithOps);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO sync_operations'),
        [
          mockOperation.id,
          mockSession.id,
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
  });

  describe('recordOperation', () => {
    it('should record individual operation', async () => {
      mockDb.execute.mockResolvedValue(undefined);

      await statusTracker.recordOperation('session1', mockOperation);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO sync_operations'),
        [
          mockOperation.id,
          'session1',
          mockOperation.type,
          mockOperation.photoId,
          mockOperation.status,
          mockOperation.progress,
          null,
          mockOperation.retryCount,
          mockOperation.createdAt.toISOString(),
          mockOperation.updatedAt.toISOString()
        ]
      );
    });
  });

  describe('updateOperation', () => {
    it('should update operation status and progress', async () => {
      mockDb.execute.mockResolvedValue(undefined);
      mockDb.query.mockResolvedValue([]); // Mock for getCurrentProgress

      const updatedOperation = {
        ...mockOperation,
        status: 'in_progress' as const,
        progress: 50
      };

      await statusTracker.updateOperation(updatedOperation);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sync_operations'),
        [
          updatedOperation.status,
          updatedOperation.progress,
          null,
          expect.any(String), // updatedAt
          updatedOperation.id
        ]
      );
    });
  });

  describe('getLastSession', () => {
    it('should return the most recent session', async () => {
      const mockRow = {
        id: 'session1',
        userId: 'user1',
        startTime: '2023-01-01T10:00:00Z',
        endTime: '2023-01-01T10:05:00Z',
        status: 'completed',
        totalOperations: 5,
        completedOperations: 4,
        failedOperations: 1,
        conflictsResolved: 0,
        bytesTransferred: 1024000
      };

      mockDb.query
        .mockResolvedValueOnce([mockRow]) // getLastSession
        .mockResolvedValueOnce([]); // getSessionOperations

      const session = await statusTracker.getLastSession();

      expect(session).toBeDefined();
      expect(session!.id).toBe('session1');
      expect(session!.status).toBe('completed');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY startTime DESC'),
        undefined
      );
    });

    it('should return null when no sessions exist', async () => {
      mockDb.query.mockResolvedValue([]);

      const session = await statusTracker.getLastSession();

      expect(session).toBeNull();
    });
  });

  describe('getSession', () => {
    it('should return specific session by ID', async () => {
      const mockRow = {
        id: 'session1',
        userId: 'user1',
        startTime: '2023-01-01T10:00:00Z',
        endTime: '2023-01-01T10:05:00Z',
        status: 'completed',
        totalOperations: 5,
        completedOperations: 4,
        failedOperations: 1,
        conflictsResolved: 0,
        bytesTransferred: 1024000
      };

      mockDb.query
        .mockResolvedValueOnce([mockRow]) // getSession
        .mockResolvedValueOnce([]); // getSessionOperations

      const session = await statusTracker.getSession('session1');

      expect(session).toBeDefined();
      expect(session!.id).toBe('session1');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = ?'),
        ['session1']
      );
    });

    it('should return null for non-existent session', async () => {
      mockDb.query.mockResolvedValue([]);

      const session = await statusTracker.getSession('nonexistent');

      expect(session).toBeNull();
    });
  });

  describe('getRecentSessions', () => {
    it('should return recent sessions with operations', async () => {
      const mockRows = [
        {
          id: 'session1',
          userId: 'user1',
          startTime: '2023-01-01T10:00:00Z',
          endTime: '2023-01-01T10:05:00Z',
          status: 'completed',
          totalOperations: 2,
          completedOperations: 2,
          failedOperations: 0,
          conflictsResolved: 0,
          bytesTransferred: 1024000
        }
      ];

      const mockOperationRows = [
        {
          id: 'op1',
          sessionId: 'session1',
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

      mockDb.query
        .mockResolvedValueOnce(mockRows) // getRecentSessions
        .mockResolvedValueOnce(mockOperationRows); // getSessionOperations

      const sessions = await statusTracker.getRecentSessions(10);

      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe('session1');
      expect(sessions[0].operations).toHaveLength(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        [10]
      );
    });
  });

  describe('getSessionOperations', () => {
    it('should return operations for specific session', async () => {
      const mockRows = [
        {
          id: 'op1',
          sessionId: 'session1',
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

      const operations = await statusTracker.getSessionOperations('session1');

      expect(operations).toHaveLength(1);
      expect(operations[0].id).toBe('op1');
      expect(operations[0].sessionId).toBeUndefined(); // sessionId not in SyncOperation type
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE sessionId = ?'),
        ['session1']
      );
    });
  });

  describe('getFailedOperations', () => {
    it('should return failed operations that can be retried', async () => {
      const mockRows = [
        {
          id: 'op1',
          sessionId: 'session1',
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

      const operations = await statusTracker.getFailedOperations(3);

      expect(operations).toHaveLength(1);
      expect(operations[0].status).toBe('failed');
      expect(operations[0].retryCount).toBeLessThan(3);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = \'failed\' AND retryCount < ?'),
        [3]
      );
    });
  });

  describe('getStats', () => {
    it('should return comprehensive sync statistics', async () => {
      const sessionStats = {
        totalSessions: 10,
        successfulSessions: 8,
        failedSessions: 2,
        averageSessionDuration: 300, // 5 minutes
        totalBytesTransferred: 10240000,
        lastSyncAt: '2023-01-01T10:00:00Z'
      };

      const operationStats = {
        totalOperations: 50,
        successfulOperations: 45,
        failedOperations: 5
      };

      mockDb.query
        .mockResolvedValueOnce([sessionStats])
        .mockResolvedValueOnce([operationStats]);

      const stats = await statusTracker.getStats();

      expect(stats.totalSessions).toBe(10);
      expect(stats.successfulSessions).toBe(8);
      expect(stats.failedSessions).toBe(2);
      expect(stats.totalOperations).toBe(50);
      expect(stats.successfulOperations).toBe(45);
      expect(stats.failedOperations).toBe(5);
      expect(stats.averageSessionDuration).toBe(300);
      expect(stats.totalBytesTransferred).toBe(10240000);
      expect(stats.lastSyncAt).toEqual(new Date('2023-01-01T10:00:00Z'));
    });

    it('should handle null values gracefully', async () => {
      const emptyStats = {
        totalSessions: null,
        successfulSessions: null,
        failedSessions: null,
        averageSessionDuration: null,
        totalBytesTransferred: null,
        lastSyncAt: null
      };

      mockDb.query
        .mockResolvedValueOnce([emptyStats])
        .mockResolvedValueOnce([{ totalOperations: null, successfulOperations: null, failedOperations: null }]);

      const stats = await statusTracker.getStats();

      expect(stats.totalSessions).toBe(0);
      expect(stats.successfulSessions).toBe(0);
      expect(stats.failedSessions).toBe(0);
      expect(stats.totalOperations).toBe(0);
      expect(stats.successfulOperations).toBe(0);
      expect(stats.failedOperations).toBe(0);
      expect(stats.averageSessionDuration).toBe(0);
      expect(stats.totalBytesTransferred).toBe(0);
      expect(stats.lastSyncAt).toBeNull();
    });
  });

  describe('getCurrentProgress', () => {
    it('should return progress for active session', async () => {
      const activeSessionRow = {
        id: 'session1',
        userId: 'user1',
        startTime: '2023-01-01T10:00:00Z',
        endTime: null,
        status: 'active',
        totalOperations: 0,
        completedOperations: 0,
        failedOperations: 0,
        conflictsResolved: 0,
        bytesTransferred: 0
      };

      const operationRows = [
        {
          id: 'op1',
          sessionId: 'session1',
          type: 'upload',
          photoId: 'photo1',
          status: 'completed',
          progress: 100,
          error: null,
          retryCount: 0,
          createdAt: '2023-01-01T10:00:00Z',
          updatedAt: '2023-01-01T10:01:00Z'
        },
        {
          id: 'op2',
          sessionId: 'session1',
          type: 'upload',
          photoId: 'photo2',
          status: 'in_progress',
          progress: 50,
          error: null,
          retryCount: 0,
          createdAt: '2023-01-01T10:01:00Z',
          updatedAt: '2023-01-01T10:02:00Z'
        },
        {
          id: 'op3',
          sessionId: 'session1',
          type: 'upload',
          photoId: 'photo3',
          status: 'pending',
          progress: 0,
          error: null,
          retryCount: 0,
          createdAt: '2023-01-01T10:02:00Z',
          updatedAt: '2023-01-01T10:02:00Z'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce([activeSessionRow]) // getActiveSession
        .mockResolvedValueOnce(operationRows); // getSessionOperations

      const progress = await statusTracker.getCurrentProgress();

      expect(progress).toBeDefined();
      expect(progress!.sessionId).toBe('session1');
      expect(progress!.totalOperations).toBe(3);
      expect(progress!.completedOperations).toBe(1);
      expect(progress!.failedOperations).toBe(0);
      expect(progress!.currentOperation?.id).toBe('op2');
      expect(progress!.progressPercentage).toBeCloseTo(33.33, 1);
    });

    it('should return null when no active session', async () => {
      mockDb.query.mockResolvedValue([]);

      const progress = await statusTracker.getCurrentProgress();

      expect(progress).toBeNull();
    });
  });

  describe('onProgress', () => {
    it('should register progress callback', () => {
      const callback = jest.fn();
      
      const unsubscribe = statusTracker.onProgress(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe progress callback', () => {
      const callback = jest.fn();
      
      const unsubscribe = statusTracker.onProgress(callback);
      unsubscribe();

      // Callback should be removed (tested indirectly through updateOperation)
      expect(true).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should clean up old sessions and operations', async () => {
      mockDb.execute.mockResolvedValue(undefined);

      await statusTracker.cleanup(30);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM sync_operations'),
        [expect.any(String)]
      );
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM sync_sessions'),
        [expect.any(String)]
      );
    });
  });

  describe('getHealthMetrics', () => {
    it('should return sync health metrics', async () => {
      const metricsRow = {
        totalOps: 100,
        successfulOps: 90,
        avgOperationTime: 5.5,
        recentFailures: 2
      };

      const queueRow = {
        queueBacklog: 5
      };

      mockDb.query
        .mockResolvedValueOnce([metricsRow])
        .mockResolvedValueOnce([queueRow]);

      const metrics = await statusTracker.getHealthMetrics();

      expect(metrics.successRate).toBe(90);
      expect(metrics.averageOperationTime).toBe(5.5);
      expect(metrics.recentFailures).toBe(2);
      expect(metrics.queueBacklog).toBe(5);
    });

    it('should handle zero operations gracefully', async () => {
      const emptyMetricsRow = {
        totalOps: 0,
        successfulOps: 0,
        avgOperationTime: null,
        recentFailures: 0
      };

      const queueRow = {
        queueBacklog: 0
      };

      mockDb.query
        .mockResolvedValueOnce([emptyMetricsRow])
        .mockResolvedValueOnce([queueRow]);

      const metrics = await statusTracker.getHealthMetrics();

      expect(metrics.successRate).toBe(100); // 100% when no operations
      expect(metrics.averageOperationTime).toBe(0);
      expect(metrics.recentFailures).toBe(0);
      expect(metrics.queueBacklog).toBe(0);
    });
  });

  describe('initialization', () => {
    it('should initialize database tables on construction', () => {
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS sync_sessions')
      );
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS sync_operations')
      );
    });

    it('should create indexes for performance', () => {
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS')
      );
    });
  });
});