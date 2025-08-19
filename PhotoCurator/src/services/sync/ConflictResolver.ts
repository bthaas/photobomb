/**
 * Conflict Resolver for Sync Operations
 * Handles conflicts between local and remote photo data
 */

import { Photo } from '../../types/photo';
import { SyncConflict } from '../../types/sync';
import { DatabaseService } from '../storage/DatabaseService';
import { PhotoRepository } from '../storage/PhotoRepository';

export type ConflictResolutionStrategy = 'local_wins' | 'remote_wins' | 'manual' | 'merge';

export interface ConflictResolution {
  conflictId: string;
  strategy: ConflictResolutionStrategy;
  resolvedPhoto: Photo;
  timestamp: Date;
}

export class ConflictResolver {
  private db: DatabaseService;
  private photoRepository: PhotoRepository;
  private readonly conflictsTable = 'sync_conflicts';
  private readonly resolutionsTable = 'conflict_resolutions';

  constructor(
    private defaultStrategy: ConflictResolutionStrategy,
    photoRepository?: PhotoRepository
  ) {
    this.db = DatabaseService.getInstance();
    this.photoRepository = photoRepository || new PhotoRepository();
    this.initializeTables();
  }

  /**
   * Detect and record conflicts between local and remote photos
   */
  async detectConflicts(localPhoto: Photo, remotePhoto: Photo): Promise<SyncConflict | null> {
    const conflicts = this.analyzePhotoConflicts(localPhoto, remotePhoto);
    
    if (conflicts.length === 0) {
      return null;
    }

    const conflict: SyncConflict = {
      id: this.generateConflictId(),
      photoId: localPhoto.id,
      type: this.determineConflictType(conflicts),
      localVersion: localPhoto,
      remoteVersion: remotePhoto,
      conflictDetails: {
        conflicts,
        detectedAt: new Date(),
        localLastModified: localPhoto.updatedAt,
        remoteLastModified: remotePhoto.updatedAt
      },
      createdAt: new Date()
    };

    await this.storeConflict(conflict);
    return conflict;
  }

  /**
   * Resolve a specific conflict
   */
  async resolve(conflict: SyncConflict, strategy?: ConflictResolutionStrategy): Promise<Photo> {
    const resolutionStrategy = strategy || this.defaultStrategy;
    let resolvedPhoto: Photo;

    switch (resolutionStrategy) {
      case 'local_wins':
        resolvedPhoto = await this.resolveWithLocalWins(conflict);
        break;
      case 'remote_wins':
        resolvedPhoto = await this.resolveWithRemoteWins(conflict);
        break;
      case 'merge':
        resolvedPhoto = await this.resolveWithMerge(conflict);
        break;
      case 'manual':
        throw new Error('Manual resolution requires user intervention');
      default:
        throw new Error(`Unknown resolution strategy: ${resolutionStrategy}`);
    }

    // Record the resolution
    const resolution: ConflictResolution = {
      conflictId: conflict.id,
      strategy: resolutionStrategy,
      resolvedPhoto,
      timestamp: new Date()
    };

    await this.storeResolution(resolution);
    await this.removeConflict(conflict.id);

    return resolvedPhoto;
  }

  /**
   * Get all pending conflicts
   */
  async getPendingConflicts(): Promise<SyncConflict[]> {
    const query = `
      SELECT * FROM ${this.conflictsTable}
      ORDER BY createdAt ASC
    `;

    const rows = await this.db.query(query);
    return rows.map(this.mapRowToConflict);
  }

  /**
   * Get conflicts for a specific photo
   */
  async getConflictsForPhoto(photoId: string): Promise<SyncConflict[]> {
    const query = `
      SELECT * FROM ${this.conflictsTable}
      WHERE photoId = ?
      ORDER BY createdAt DESC
    `;

    const rows = await this.db.query(query, [photoId]);
    return rows.map(this.mapRowToConflict);
  }

  /**
   * Get conflict resolution history
   */
  async getResolutionHistory(limit: number = 50): Promise<ConflictResolution[]> {
    const query = `
      SELECT * FROM ${this.resolutionsTable}
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    const rows = await this.db.query(query, [limit]);
    return rows.map(this.mapRowToResolution);
  }

  /**
   * Auto-resolve conflicts based on rules
   */
  async autoResolveConflicts(): Promise<{ resolved: number; failed: number }> {
    const conflicts = await this.getPendingConflicts();
    let resolved = 0;
    let failed = 0;

    for (const conflict of conflicts) {
      try {
        if (this.canAutoResolve(conflict)) {
          await this.resolve(conflict);
          resolved++;
        }
      } catch (error) {
        console.error(`Failed to auto-resolve conflict ${conflict.id}:`, error);
        failed++;
      }
    }

    return { resolved, failed };
  }

  /**
   * Provide resolution suggestions for manual conflicts
   */
  async getSuggestions(conflict: SyncConflict): Promise<{
    recommended: ConflictResolutionStrategy;
    reasons: string[];
    alternatives: ConflictResolutionStrategy[];
  }> {
    const suggestions = {
      recommended: 'merge' as ConflictResolutionStrategy,
      reasons: [] as string[],
      alternatives: [] as ConflictResolutionStrategy[]
    };

    // Analyze conflict to provide intelligent suggestions
    if (conflict.localVersion && conflict.remoteVersion) {
      const local = conflict.localVersion;
      const remote = conflict.remoteVersion;

      // If local version is newer
      if (local.updatedAt > remote.updatedAt) {
        suggestions.recommended = 'local_wins';
        suggestions.reasons.push('Local version is more recent');
        suggestions.alternatives.push('merge', 'remote_wins');
      }
      // If remote version is newer
      else if (remote.updatedAt > local.updatedAt) {
        suggestions.recommended = 'remote_wins';
        suggestions.reasons.push('Remote version is more recent');
        suggestions.alternatives.push('merge', 'local_wins');
      }
      // If timestamps are equal, prefer merge
      else {
        suggestions.recommended = 'merge';
        suggestions.reasons.push('Versions have same timestamp, merging is safest');
        suggestions.alternatives.push('local_wins', 'remote_wins');
      }

      // Additional analysis based on conflict type
      if (conflict.type === 'metadata_mismatch') {
        suggestions.reasons.push('Metadata conflicts can usually be merged safely');
      } else if (conflict.type === 'version_conflict') {
        suggestions.reasons.push('Version conflicts require careful consideration');
      }
    }

    return suggestions;
  }

  /**
   * Clear resolved conflicts older than specified days
   */
  async cleanupResolutions(olderThanDays: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const query = `
      DELETE FROM ${this.resolutionsTable}
      WHERE timestamp < ?
    `;

    await this.db.execute(query, [cutoffDate.toISOString()]);
  }

  // Private helper methods

  private analyzePhotoConflicts(local: Photo, remote: Photo): string[] {
    const conflicts: string[] = [];

    // Check metadata conflicts
    if (JSON.stringify(local.metadata) !== JSON.stringify(remote.metadata)) {
      conflicts.push('metadata_mismatch');
    }

    // Check analysis results conflicts
    if (local.qualityScore !== remote.qualityScore) {
      conflicts.push('quality_score_mismatch');
    }

    if (local.compositionScore !== remote.compositionScore) {
      conflicts.push('composition_score_mismatch');
    }

    if (local.contentScore !== remote.contentScore) {
      conflicts.push('content_score_mismatch');
    }

    // Check features conflicts
    if (JSON.stringify(local.features) !== JSON.stringify(remote.features)) {
      conflicts.push('features_mismatch');
    }

    // Check sync status conflicts
    if (local.syncStatus !== remote.syncStatus) {
      conflicts.push('sync_status_mismatch');
    }

    // Check timestamp conflicts
    if (Math.abs(local.updatedAt.getTime() - remote.updatedAt.getTime()) > 1000) {
      conflicts.push('timestamp_mismatch');
    }

    return conflicts;
  }

  private determineConflictType(conflicts: string[]): SyncConflict['type'] {
    if (conflicts.includes('timestamp_mismatch')) {
      return 'version_conflict';
    }
    if (conflicts.some(c => c.includes('metadata'))) {
      return 'metadata_mismatch';
    }
    return 'version_conflict';
  }

  private async resolveWithLocalWins(conflict: SyncConflict): Promise<Photo> {
    if (!conflict.localVersion) {
      throw new Error('Local version not available for local_wins resolution');
    }

    // Update the photo in repository with local version
    await this.photoRepository.updatePhoto(conflict.photoId, conflict.localVersion);
    return conflict.localVersion;
  }

  private async resolveWithRemoteWins(conflict: SyncConflict): Promise<Photo> {
    if (!conflict.remoteVersion) {
      throw new Error('Remote version not available for remote_wins resolution');
    }

    // Update the photo in repository with remote version
    await this.photoRepository.updatePhoto(conflict.photoId, conflict.remoteVersion);
    return conflict.remoteVersion;
  }

  private async resolveWithMerge(conflict: SyncConflict): Promise<Photo> {
    if (!conflict.localVersion || !conflict.remoteVersion) {
      throw new Error('Both versions required for merge resolution');
    }

    const local = conflict.localVersion;
    const remote = conflict.remoteVersion;

    // Create merged version with intelligent field selection
    const mergedPhoto: Photo = {
      ...local,
      // Use the most recent timestamp
      updatedAt: local.updatedAt > remote.updatedAt ? local.updatedAt : remote.updatedAt,
      
      // Merge metadata (prefer local for user-modified fields)
      metadata: {
        ...remote.metadata,
        ...local.metadata,
        // Keep the most recent location if available
        location: local.metadata.location || remote.metadata.location
      },

      // Use the best available scores (highest values typically indicate better analysis)
      qualityScore: this.selectBestScore(local.qualityScore, remote.qualityScore),
      compositionScore: this.selectBestScore(local.compositionScore, remote.compositionScore),
      contentScore: this.selectBestScore(local.contentScore, remote.contentScore),

      // Merge features (prefer more complete data)
      features: {
        ...remote.features,
        ...local.features,
        // Combine detected objects and faces
        objects: [...(local.features?.objects || []), ...(remote.features?.objects || [])],
      },

      // Merge faces
      faces: [...(local.faces || []), ...(remote.faces || [])],

      // Use most recent sync status
      syncStatus: local.updatedAt > remote.updatedAt ? local.syncStatus : remote.syncStatus,
      lastSyncAt: local.lastSyncAt && remote.lastSyncAt 
        ? (local.lastSyncAt > remote.lastSyncAt ? local.lastSyncAt : remote.lastSyncAt)
        : local.lastSyncAt || remote.lastSyncAt
    };

    await this.photoRepository.updatePhoto(conflict.photoId, mergedPhoto);
    return mergedPhoto;
  }

  private selectBestScore(localScore: any, remoteScore: any): any {
    if (!localScore) return remoteScore;
    if (!remoteScore) return localScore;
    
    // If both are objects with 'overall' property, compare those
    if (typeof localScore === 'object' && typeof remoteScore === 'object') {
      return localScore.overall >= remoteScore.overall ? localScore : remoteScore;
    }
    
    // If they're numbers, return the higher one
    if (typeof localScore === 'number' && typeof remoteScore === 'number') {
      return Math.max(localScore, remoteScore);
    }
    
    // Default to local
    return localScore;
  }

  private canAutoResolve(conflict: SyncConflict): boolean {
    // Only auto-resolve if default strategy is not manual
    if (this.defaultStrategy === 'manual') {
      return false;
    }

    // Don't auto-resolve deletion conflicts
    if (conflict.type === 'deletion_conflict') {
      return false;
    }

    // Auto-resolve metadata mismatches and simple version conflicts
    return conflict.type === 'metadata_mismatch' || conflict.type === 'version_conflict';
  }

  private async storeConflict(conflict: SyncConflict): Promise<void> {
    const query = `
      INSERT INTO ${this.conflictsTable} (
        id, photoId, type, localVersion, remoteVersion, conflictDetails, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(query, [
      conflict.id,
      conflict.photoId,
      conflict.type,
      JSON.stringify(conflict.localVersion),
      JSON.stringify(conflict.remoteVersion),
      JSON.stringify(conflict.conflictDetails),
      conflict.createdAt.toISOString()
    ]);
  }

  private async storeResolution(resolution: ConflictResolution): Promise<void> {
    const query = `
      INSERT INTO ${this.resolutionsTable} (
        conflictId, strategy, resolvedPhoto, timestamp
      ) VALUES (?, ?, ?, ?)
    `;

    await this.db.execute(query, [
      resolution.conflictId,
      resolution.strategy,
      JSON.stringify(resolution.resolvedPhoto),
      resolution.timestamp.toISOString()
    ]);
  }

  private async removeConflict(conflictId: string): Promise<void> {
    const query = `DELETE FROM ${this.conflictsTable} WHERE id = ?`;
    await this.db.execute(query, [conflictId]);
  }

  private async initializeTables(): Promise<void> {
    const createConflictsTable = `
      CREATE TABLE IF NOT EXISTS ${this.conflictsTable} (
        id TEXT PRIMARY KEY,
        photoId TEXT NOT NULL,
        type TEXT NOT NULL,
        localVersion TEXT,
        remoteVersion TEXT,
        conflictDetails TEXT NOT NULL,
        createdAt TEXT NOT NULL
      )
    `;

    const createResolutionsTable = `
      CREATE TABLE IF NOT EXISTS ${this.resolutionsTable} (
        conflictId TEXT PRIMARY KEY,
        strategy TEXT NOT NULL,
        resolvedPhoto TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    `;

    await this.db.execute(createConflictsTable);
    await this.db.execute(createResolutionsTable);

    // Create indexes
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_conflicts_photo ON ${this.conflictsTable}(photoId)`,
      `CREATE INDEX IF NOT EXISTS idx_conflicts_type ON ${this.conflictsTable}(type)`,
      `CREATE INDEX IF NOT EXISTS idx_resolutions_timestamp ON ${this.resolutionsTable}(timestamp)`
    ];

    for (const indexQuery of indexes) {
      await this.db.execute(indexQuery);
    }
  }

  private mapRowToConflict(row: any): SyncConflict {
    return {
      id: row.id,
      photoId: row.photoId,
      type: row.type,
      localVersion: row.localVersion ? JSON.parse(row.localVersion) : null,
      remoteVersion: row.remoteVersion ? JSON.parse(row.remoteVersion) : null,
      conflictDetails: JSON.parse(row.conflictDetails),
      createdAt: new Date(row.createdAt)
    };
  }

  private mapRowToResolution(row: any): ConflictResolution {
    return {
      conflictId: row.conflictId,
      strategy: row.strategy,
      resolvedPhoto: JSON.parse(row.resolvedPhoto),
      timestamp: new Date(row.timestamp)
    };
  }

  private generateConflictId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}