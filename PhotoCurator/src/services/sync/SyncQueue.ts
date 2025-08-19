/**
 * Sync Queue for Offline-First Architecture
 * Manages queued sync operations when offline
 */

import { SyncOperation } from '../../types/sync';
import { DatabaseService } from '../storage/DatabaseService';

export class SyncQueue {
  private db: DatabaseService;
  private readonly tableName = 'sync_queue';

  constructor(private config: { maxRetries: number }) {
    this.db = DatabaseService.getInstance();
    this.initializeTable();
  }

  /**
   * Add operation to sync queue
   */
  async enqueue(operation: SyncOperation): Promise<void> {
    const query = `
      INSERT INTO ${this.tableName} (
        id, type, photoId, status, progress, error, retryCount, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(query, [
      operation.id,
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
   * Remove operation from queue
   */
  async remove(operationId: string): Promise<void> {
    const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
    await this.db.execute(query, [operationId]);
  }

  /**
   * Update existing operation in queue
   */
  async update(operation: SyncOperation): Promise<void> {
    const query = `
      UPDATE ${this.tableName} 
      SET status = ?, progress = ?, error = ?, retryCount = ?, updatedAt = ?
      WHERE id = ?
    `;

    await this.db.execute(query, [
      operation.status,
      operation.progress,
      operation.error || null,
      operation.retryCount,
      new Date().toISOString(),
      operation.id
    ]);
  }

  /**
   * Get all queued operations
   */
  async getAll(): Promise<SyncOperation[]> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE status IN ('pending', 'failed') AND retryCount < ?
      ORDER BY createdAt ASC
    `;

    const rows = await this.db.query(query, [this.config.maxRetries]);
    return rows.map(this.mapRowToOperation);
  }

  /**
   * Get operations by type
   */
  async getByType(type: SyncOperation['type']): Promise<SyncOperation[]> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE type = ? AND status IN ('pending', 'failed') AND retryCount < ?
      ORDER BY createdAt ASC
    `;

    const rows = await this.db.query(query, [type, this.config.maxRetries]);
    return rows.map(this.mapRowToOperation);
  }

  /**
   * Get operations for specific photo
   */
  async getByPhotoId(photoId: string): Promise<SyncOperation[]> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE photoId = ?
      ORDER BY createdAt DESC
    `;

    const rows = await this.db.query(query, [photoId]);
    return rows.map(this.mapRowToOperation);
  }

  /**
   * Get failed operations that can be retried
   */
  async getRetryableOperations(): Promise<SyncOperation[]> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE status = 'failed' AND retryCount < ?
      ORDER BY createdAt ASC
    `;

    const rows = await this.db.query(query, [this.config.maxRetries]);
    return rows.map(this.mapRowToOperation);
  }

  /**
   * Clear completed operations older than specified days
   */
  async cleanup(olderThanDays: number = 7): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const query = `
      DELETE FROM ${this.tableName} 
      WHERE status = 'completed' AND updatedAt < ?
    `;

    await this.db.execute(query, [cutoffDate.toISOString()]);
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    failed: number;
    completed: number;
    byType: Record<string, number>;
  }> {
    const totalQuery = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const statusQuery = `
      SELECT status, COUNT(*) as count 
      FROM ${this.tableName} 
      GROUP BY status
    `;
    const typeQuery = `
      SELECT type, COUNT(*) as count 
      FROM ${this.tableName} 
      WHERE status IN ('pending', 'failed')
      GROUP BY type
    `;

    const [totalResult] = await this.db.query(totalQuery);
    const statusResults = await this.db.query(statusQuery);
    const typeResults = await this.db.query(typeQuery);

    const stats = {
      total: totalResult.count,
      pending: 0,
      failed: 0,
      completed: 0,
      byType: {} as Record<string, number>
    };

    statusResults.forEach((row: any) => {
      stats[row.status as keyof typeof stats] = row.count;
    });

    typeResults.forEach((row: any) => {
      stats.byType[row.type] = row.count;
    });

    return stats;
  }

  /**
   * Clear all operations (use with caution)
   */
  async clear(): Promise<void> {
    const query = `DELETE FROM ${this.tableName}`;
    await this.db.execute(query);
  }

  /**
   * Check if operation exists in queue
   */
  async exists(operationId: string): Promise<boolean> {
    const query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE id = ?`;
    const [result] = await this.db.query(query, [operationId]);
    return result.count > 0;
  }

  /**
   * Get next operation to process
   */
  async getNext(): Promise<SyncOperation | null> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE status = 'pending' AND retryCount < ?
      ORDER BY createdAt ASC
      LIMIT 1
    `;

    const rows = await this.db.query(query, [this.config.maxRetries]);
    return rows.length > 0 ? this.mapRowToOperation(rows[0]) : null;
  }

  /**
   * Mark operation as in progress
   */
  async markInProgress(operationId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName} 
      SET status = 'in_progress', updatedAt = ?
      WHERE id = ?
    `;

    await this.db.execute(query, [new Date().toISOString(), operationId]);
  }

  /**
   * Mark operation as completed
   */
  async markCompleted(operationId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName} 
      SET status = 'completed', progress = 100, updatedAt = ?
      WHERE id = ?
    `;

    await this.db.execute(query, [new Date().toISOString(), operationId]);
  }

  /**
   * Mark operation as failed
   */
  async markFailed(operationId: string, error: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName} 
      SET status = 'failed', error = ?, retryCount = retryCount + 1, updatedAt = ?
      WHERE id = ?
    `;

    await this.db.execute(query, [error, new Date().toISOString(), operationId]);
  }

  private async initializeTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        photoId TEXT NOT NULL,
        status TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        error TEXT,
        retryCount INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `;

    await this.db.execute(createTableQuery);

    // Create indexes for better performance
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON ${this.tableName}(status)`,
      `CREATE INDEX IF NOT EXISTS idx_sync_queue_type ON ${this.tableName}(type)`,
      `CREATE INDEX IF NOT EXISTS idx_sync_queue_photo ON ${this.tableName}(photoId)`,
      `CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON ${this.tableName}(createdAt)`
    ];

    for (const indexQuery of indexes) {
      await this.db.execute(indexQuery);
    }
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