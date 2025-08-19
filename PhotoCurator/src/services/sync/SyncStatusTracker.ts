/**
 * Sync Status Tracker
 * Tracks and monitors sync operations and sessions
 */

import { SyncOperation, SyncSession } from '../../types/sync';
import { DatabaseService } from '../storage/DatabaseService';

export interface SyncStats {
  totalSessions: number;
  successfulSessions: number;
  failedSessions: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageSessionDuration: number;
  totalBytesTransferred: number;
  lastSyncAt: Date | null;
}

export interface SyncProgress {
  sessionId: string;
  totalOperations: number;
  completedOperations: number;
  failedOperations: number;
  currentOperation?: SyncOperation;
  progressPercentage: number;
  estimatedTimeRemaining?: number;
}

export class SyncStatusTracker {
  private db: DatabaseService;
  private readonly sessionsTable = 'sync_sessions';
  private readonly operationsTable = 'sync_operations';
  private progressCallbacks: ((progress: SyncProgress) => void)[] = [];

  constructor() {
    this.db = DatabaseService.getInstance();
    this.initializeTables();
  }

  /**
   * Record a sync session
   */
  async recordSession(session: SyncSession): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO ${this.sessionsTable} (
        id, userId, startTime, endTime, status, 
        totalOperations, completedOperations, failedOperations, 
        conflictsResolved, bytesTransferred
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(query, [
      session.id,
      session.userId,
      session.startTime.toISOString(),
      session.endTime?.toISOString() || null,
      session.status,
      session.summary.totalOperations,
      session.summary.completedOperations,
      session.summary.failedOperations,
      session.summary.conflictsResolved,
      session.summary.bytesTransferred
    ]);

    // Record individual operations
    for (const operation of session.operations) {
      await this.recordOperation(session.id, operation);
    }
  }

  /**
   * Record or update a sync operation
   */
  async recordOperation(sessionId: string, operation: SyncOperation): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO ${this.operationsTable} (
        id, sessionId, type, photoId, status, progress, error, retryCount, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(query, [
      operation.id,
      sessionId,
      operation.type,
      operation.photoId,
      operation.status,
      operation.progress,
      operation.error || null,
      operation.retryCount,
      operation.createdAt.toISOString(),
      operation.updatedAt.toISOString()
    ]);
  }

  /**
   * Update operation status and progress
   */
  async updateOperation(operation: SyncOperation): Promise<void> {
    const query = `
      UPDATE ${this.operationsTable}
      SET status = ?, progress = ?, error = ?, updatedAt = ?
      WHERE id = ?
    `;

    await this.db.execute(query, [
      operation.status,
      operation.progress,
      operation.error || null,
      new Date().toISOString(),
      operation.id
    ]);

    // Notify progress callbacks
    await this.notifyProgressCallbacks(operation);
  }

  /**
   * Get the last sync session
   */
  async getLastSession(): Promise<SyncSession | null> {
    const query = `
      SELECT * FROM ${this.sessionsTable}
      ORDER BY startTime DESC
      LIMIT 1
    `;

    const rows = await this.db.query(query);
    if (rows.length === 0) return null;

    const session = this.mapRowToSession(rows[0]);
    session.operations = await this.getSessionOperations(session.id);
    return session;
  }

  /**
   * Get sync session by ID
   */
  async getSession(sessionId: string): Promise<SyncSession | null> {
    const query = `
      SELECT * FROM ${this.sessionsTable}
      WHERE id = ?
    `;

    const rows = await this.db.query(query, [sessionId]);
    if (rows.length === 0) return null;

    const session = this.mapRowToSession(rows[0]);
    session.operations = await this.getSessionOperations(sessionId);
    return session;
  }

  /**
   * Get recent sync sessions
   */
  async getRecentSessions(limit: number = 10): Promise<SyncSession[]> {
    const query = `
      SELECT * FROM ${this.sessionsTable}
      ORDER BY startTime DESC
      LIMIT ?
    `;

    const rows = await this.db.query(query, [limit]);
    const sessions = rows.map(this.mapRowToSession);

    // Load operations for each session
    for (const session of sessions) {
      session.operations = await this.getSessionOperations(session.id);
    }

    return sessions;
  }

  /**
   * Get operations for a specific session
   */
  async getSessionOperations(sessionId: string): Promise<SyncOperation[]> {
    const query = `
      SELECT * FROM ${this.operationsTable}
      WHERE sessionId = ?
      ORDER BY createdAt ASC
    `;

    const rows = await this.db.query(query, [sessionId]);
    return rows.map(this.mapRowToOperation);
  }

  /**
   * Get failed operations that need retry
   */
  async getFailedOperations(maxRetries: number = 3): Promise<SyncOperation[]> {
    const query = `
      SELECT * FROM ${this.operationsTable}
      WHERE status = 'failed' AND retryCount < ?
      ORDER BY updatedAt ASC
    `;

    const rows = await this.db.query(query, [maxRetries]);
    return rows.map(this.mapRowToOperation);
  }

  /**
   * Get comprehensive sync statistics
   */
  async getStats(): Promise<SyncStats> {
    const sessionStatsQuery = `
      SELECT 
        COUNT(*) as totalSessions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successfulSessions,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedSessions,
        AVG(CASE 
          WHEN endTime IS NOT NULL AND startTime IS NOT NULL 
          THEN (julianday(endTime) - julianday(startTime)) * 24 * 60 * 60 
          ELSE NULL 
        END) as averageSessionDuration,
        SUM(bytesTransferred) as totalBytesTransferred,
        MAX(startTime) as lastSyncAt
      FROM ${this.sessionsTable}
    `;

    const operationStatsQuery = `
      SELECT 
        COUNT(*) as totalOperations,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successfulOperations,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedOperations
      FROM ${this.operationsTable}
    `;

    const [sessionStats] = await this.db.query(sessionStatsQuery);
    const [operationStats] = await this.db.query(operationStatsQuery);

    return {
      totalSessions: sessionStats.totalSessions || 0,
      successfulSessions: sessionStats.successfulSessions || 0,
      failedSessions: sessionStats.failedSessions || 0,
      totalOperations: operationStats.totalOperations || 0,
      successfulOperations: operationStats.successfulOperations || 0,
      failedOperations: operationStats.failedOperations || 0,
      averageSessionDuration: sessionStats.averageSessionDuration || 0,
      totalBytesTransferred: sessionStats.totalBytesTransferred || 0,
      lastSyncAt: sessionStats.lastSyncAt ? new Date(sessionStats.lastSyncAt) : null
    };
  }

  /**
   * Get current sync progress for active session
   */
  async getCurrentProgress(): Promise<SyncProgress | null> {
    const activeSession = await this.getActiveSession();
    if (!activeSession) return null;

    const operations = await this.getSessionOperations(activeSession.id);
    const completedOps = operations.filter(op => op.status === 'completed');
    const failedOps = operations.filter(op => op.status === 'failed');
    const currentOp = operations.find(op => op.status === 'in_progress');

    const progressPercentage = operations.length > 0 
      ? (completedOps.length / operations.length) * 100 
      : 0;

    return {
      sessionId: activeSession.id,
      totalOperations: operations.length,
      completedOperations: completedOps.length,
      failedOperations: failedOps.length,
      currentOperation: currentOp,
      progressPercentage,
      estimatedTimeRemaining: this.calculateEstimatedTime(operations)
    };
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(callback: (progress: SyncProgress) => void): () => void {
    this.progressCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.progressCallbacks.indexOf(callback);
      if (index > -1) {
        this.progressCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Clear old sync history
   */
  async cleanup(olderThanDays: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Delete old sessions and their operations
    const deleteOperationsQuery = `
      DELETE FROM ${this.operationsTable}
      WHERE sessionId IN (
        SELECT id FROM ${this.sessionsTable}
        WHERE startTime < ?
      )
    `;

    const deleteSessionsQuery = `
      DELETE FROM ${this.sessionsTable}
      WHERE startTime < ?
    `;

    await this.db.execute(deleteOperationsQuery, [cutoffDate.toISOString()]);
    await this.db.execute(deleteSessionsQuery, [cutoffDate.toISOString()]);
  }

  /**
   * Get sync health metrics
   */
  async getHealthMetrics(): Promise<{
    successRate: number;
    averageOperationTime: number;
    recentFailures: number;
    queueBacklog: number;
  }> {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7); // Last 7 days

    const metricsQuery = `
      SELECT 
        COUNT(*) as totalOps,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successfulOps,
        AVG(CASE 
          WHEN status = 'completed' 
          THEN (julianday(updatedAt) - julianday(createdAt)) * 24 * 60 * 60 
          ELSE NULL 
        END) as avgOperationTime,
        SUM(CASE WHEN status = 'failed' AND updatedAt > ? THEN 1 ELSE 0 END) as recentFailures
      FROM ${this.operationsTable}
    `;

    const queueQuery = `
      SELECT COUNT(*) as queueBacklog
      FROM ${this.operationsTable}
      WHERE status IN ('pending', 'in_progress')
    `;

    const [metrics] = await this.db.query(metricsQuery, [recentDate.toISOString()]);
    const [queue] = await this.db.query(queueQuery);

    const successRate = metrics.totalOps > 0 
      ? (metrics.successfulOps / metrics.totalOps) * 100 
      : 100;

    return {
      successRate,
      averageOperationTime: metrics.avgOperationTime || 0,
      recentFailures: metrics.recentFailures || 0,
      queueBacklog: queue.queueBacklog || 0
    };
  }

  // Private helper methods

  private async getActiveSession(): Promise<SyncSession | null> {
    const query = `
      SELECT * FROM ${this.sessionsTable}
      WHERE status = 'active'
      ORDER BY startTime DESC
      LIMIT 1
    `;

    const rows = await this.db.query(query);
    return rows.length > 0 ? this.mapRowToSession(rows[0]) : null;
  }

  private async notifyProgressCallbacks(operation: SyncOperation): Promise<void> {
    const progress = await this.getCurrentProgress();
    if (progress) {
      this.progressCallbacks.forEach(callback => {
        try {
          callback(progress);
        } catch (error) {
          console.error('Error in progress callback:', error);
        }
      });
    }
  }

  private calculateEstimatedTime(operations: SyncOperation[]): number | undefined {
    const completedOps = operations.filter(op => op.status === 'completed');
    const pendingOps = operations.filter(op => op.status === 'pending' || op.status === 'in_progress');

    if (completedOps.length === 0 || pendingOps.length === 0) {
      return undefined;
    }

    // Calculate average time per operation
    const totalTime = completedOps.reduce((sum, op) => {
      const duration = op.updatedAt.getTime() - op.createdAt.getTime();
      return sum + duration;
    }, 0);

    const avgTimePerOp = totalTime / completedOps.length;
    return (avgTimePerOp * pendingOps.length) / 1000; // Return in seconds
  }

  private async initializeTables(): Promise<void> {
    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS ${this.sessionsTable} (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT,
        status TEXT NOT NULL,
        totalOperations INTEGER DEFAULT 0,
        completedOperations INTEGER DEFAULT 0,
        failedOperations INTEGER DEFAULT 0,
        conflictsResolved INTEGER DEFAULT 0,
        bytesTransferred INTEGER DEFAULT 0
      )
    `;

    const createOperationsTable = `
      CREATE TABLE IF NOT EXISTS ${this.operationsTable} (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        type TEXT NOT NULL,
        photoId TEXT NOT NULL,
        status TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        error TEXT,
        retryCount INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (sessionId) REFERENCES ${this.sessionsTable}(id)
      )
    `;

    await this.db.execute(createSessionsTable);
    await this.db.execute(createOperationsTable);

    // Create indexes for better performance
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_sessions_user ON ${this.sessionsTable}(userId)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON ${this.sessionsTable}(startTime)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_status ON ${this.sessionsTable}(status)`,
      `CREATE INDEX IF NOT EXISTS idx_operations_session ON ${this.operationsTable}(sessionId)`,
      `CREATE INDEX IF NOT EXISTS idx_operations_status ON ${this.operationsTable}(status)`,
      `CREATE INDEX IF NOT EXISTS idx_operations_photo ON ${this.operationsTable}(photoId)`,
      `CREATE INDEX IF NOT EXISTS idx_operations_type ON ${this.operationsTable}(type)`
    ];

    for (const indexQuery of indexes) {
      await this.db.execute(indexQuery);
    }
  }

  private mapRowToSession(row: any): SyncSession {
    return {
      id: row.id,
      userId: row.userId,
      startTime: new Date(row.startTime),
      endTime: row.endTime ? new Date(row.endTime) : undefined,
      operations: [], // Will be loaded separately
      conflicts: [], // Will be loaded separately
      status: row.status,
      summary: {
        totalOperations: row.totalOperations,
        completedOperations: row.completedOperations,
        failedOperations: row.failedOperations,
        conflictsResolved: row.conflictsResolved,
        bytesTransferred: row.bytesTransferred
      }
    };
  }

  private mapRowToOperation(row: any): SyncOperation {
    return {
      id: row.id,
      type: row.type,
      photoId: row.photoId,
      status: row.status,
      progress: row.progress,
      error: row.error,
      retryCount: row.retryCount,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }
}