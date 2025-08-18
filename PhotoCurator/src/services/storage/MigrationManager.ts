/**
 * Database migration manager for handling schema changes
 */

import { DatabaseService } from './DatabaseService';

export interface Migration {
  version: number;
  name: string;
  up: (dbService: DatabaseService) => Promise<void>;
  down?: (dbService: DatabaseService) => Promise<void>;
}

export class MigrationManager {
  private static instance: MigrationManager;
  private dbService: DatabaseService;
  private migrations: Migration[] = [];

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.registerMigrations();
  }

  public static getInstance(): MigrationManager {
    if (!MigrationManager.instance) {
      MigrationManager.instance = new MigrationManager();
    }
    return MigrationManager.instance;
  }

  /**
   * Run pending migrations
   */
  public async runMigrations(): Promise<void> {
    try {
      const currentVersion = await this.getCurrentVersion();
      const pendingMigrations = this.migrations.filter(m => m.version > currentVersion);

      if (pendingMigrations.length === 0) {
        console.log('No pending migrations');
        return;
      }

      console.log(`Running ${pendingMigrations.length} pending migrations`);

      for (const migration of pendingMigrations) {
        console.log(`Running migration ${migration.version}: ${migration.name}`);
        
        await this.dbService.executeTransaction(async () => {
          await migration.up(this.dbService);
          await this.updateMigrationVersion(migration.version);
        });

        console.log(`Migration ${migration.version} completed`);
      }

      console.log('All migrations completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Rollback to a specific version
   */
  public async rollbackTo(targetVersion: number): Promise<void> {
    try {
      const currentVersion = await this.getCurrentVersion();
      
      if (targetVersion >= currentVersion) {
        console.log('Target version is not lower than current version');
        return;
      }

      const migrationsToRollback = this.migrations
        .filter(m => m.version > targetVersion && m.version <= currentVersion)
        .sort((a, b) => b.version - a.version); // Rollback in reverse order

      console.log(`Rolling back ${migrationsToRollback.length} migrations`);

      for (const migration of migrationsToRollback) {
        if (!migration.down) {
          throw new Error(`Migration ${migration.version} does not support rollback`);
        }

        console.log(`Rolling back migration ${migration.version}: ${migration.name}`);
        
        await this.dbService.executeTransaction(async () => {
          await migration.down!(this.dbService);
          await this.updateMigrationVersion(migration.version - 1);
        });

        console.log(`Migration ${migration.version} rolled back`);
      }

      console.log('Rollback completed successfully');
    } catch (error) {
      console.error('Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Get current migration version
   */
  public async getCurrentVersion(): Promise<number> {
    try {
      const version = await this.dbService.getMetadata('last_migration');
      return version ? parseInt(version, 10) : 0;
    } catch (error) {
      console.error('Failed to get current migration version:', error);
      return 0;
    }
  }

  /**
   * Get migration history
   */
  public async getMigrationHistory(): Promise<Array<{
    version: number;
    name: string;
    appliedAt: Date;
  }>> {
    try {
      // This would require a migrations table to track history
      // For now, we'll return basic info
      const currentVersion = await this.getCurrentVersion();
      const appliedMigrations = this.migrations.filter(m => m.version <= currentVersion);
      
      return appliedMigrations.map(m => ({
        version: m.version,
        name: m.name,
        appliedAt: new Date(), // Would be stored in migrations table
      }));
    } catch (error) {
      console.error('Failed to get migration history:', error);
      return [];
    }
  }

  /**
   * Register all migrations
   */
  private registerMigrations(): void {
    // Migration 1: Add indexes for better performance
    this.migrations.push({
      version: 1,
      name: 'Add performance indexes',
      up: async (dbService: DatabaseService) => {
        const indexes = [
          'CREATE INDEX IF NOT EXISTS idx_photos_quality_overall ON photos (quality_overall)',
          'CREATE INDEX IF NOT EXISTS idx_photos_composition_overall ON photos (composition_overall)',
          'CREATE INDEX IF NOT EXISTS idx_photos_content_overall ON photos (content_overall)',
          'CREATE INDEX IF NOT EXISTS idx_faces_confidence ON faces (confidence)',
          'CREATE INDEX IF NOT EXISTS idx_clusters_confidence ON clusters (confidence)',
        ];

        for (const indexSql of indexes) {
          await dbService.executeSql(indexSql);
        }
      },
      down: async (dbService: DatabaseService) => {
        const dropIndexes = [
          'DROP INDEX IF EXISTS idx_photos_quality_overall',
          'DROP INDEX IF EXISTS idx_photos_composition_overall',
          'DROP INDEX IF EXISTS idx_photos_content_overall',
          'DROP INDEX IF EXISTS idx_faces_confidence',
          'DROP INDEX IF EXISTS idx_clusters_confidence',
        ];

        for (const dropSql of dropIndexes) {
          await dbService.executeSql(dropSql);
        }
      },
    });

    // Migration 2: Add photo processing status
    this.migrations.push({
      version: 2,
      name: 'Add photo processing status',
      up: async (dbService: DatabaseService) => {
        await dbService.executeSql(
          'ALTER TABLE photos ADD COLUMN processing_status TEXT DEFAULT "pending"'
        );
        await dbService.executeSql(
          'CREATE INDEX IF NOT EXISTS idx_photos_processing_status ON photos (processing_status)'
        );
      },
      down: async (dbService: DatabaseService) => {
        // SQLite doesn't support DROP COLUMN, so we'd need to recreate the table
        // For simplicity, we'll just mark this as non-reversible
        throw new Error('This migration cannot be rolled back');
      },
    });

    // Migration 3: Add photo tags table
    this.migrations.push({
      version: 3,
      name: 'Add photo tags system',
      up: async (dbService: DatabaseService) => {
        // Create tags table
        await dbService.executeSql(`
          CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            color TEXT,
            created_at INTEGER NOT NULL
          )
        `);

        // Create photo_tags junction table
        await dbService.executeSql(`
          CREATE TABLE IF NOT EXISTS photo_tags (
            photo_id TEXT NOT NULL,
            tag_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            PRIMARY KEY (photo_id, tag_id),
            FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
          )
        `);

        // Create indexes
        await dbService.executeSql(
          'CREATE INDEX IF NOT EXISTS idx_photo_tags_photo_id ON photo_tags (photo_id)'
        );
        await dbService.executeSql(
          'CREATE INDEX IF NOT EXISTS idx_photo_tags_tag_id ON photo_tags (tag_id)'
        );
      },
      down: async (dbService: DatabaseService) => {
        await dbService.executeSql('DROP TABLE IF EXISTS photo_tags');
        await dbService.executeSql('DROP TABLE IF EXISTS tags');
      },
    });

    // Migration 4: Add photo favorites
    this.migrations.push({
      version: 4,
      name: 'Add photo favorites',
      up: async (dbService: DatabaseService) => {
        await dbService.executeSql(
          'ALTER TABLE photos ADD COLUMN is_favorite INTEGER DEFAULT 0'
        );
        await dbService.executeSql(
          'CREATE INDEX IF NOT EXISTS idx_photos_is_favorite ON photos (is_favorite)'
        );
      },
      down: async (dbService: DatabaseService) => {
        // SQLite doesn't support DROP COLUMN
        throw new Error('This migration cannot be rolled back');
      },
    });

    // Migration 5: Add cluster statistics
    this.migrations.push({
      version: 5,
      name: 'Add cluster statistics',
      up: async (dbService: DatabaseService) => {
        await dbService.executeSql(
          'ALTER TABLE clusters ADD COLUMN photo_count INTEGER DEFAULT 0'
        );
        await dbService.executeSql(
          'ALTER TABLE clusters ADD COLUMN avg_quality REAL DEFAULT 0'
        );
        await dbService.executeSql(
          'ALTER TABLE person_clusters ADD COLUMN photo_count INTEGER DEFAULT 0'
        );
        await dbService.executeSql(
          'ALTER TABLE event_clusters ADD COLUMN photo_count INTEGER DEFAULT 0'
        );

        // Update existing clusters with statistics
        await this.updateClusterStatistics(dbService);
      },
      down: async (dbService: DatabaseService) => {
        // SQLite doesn't support DROP COLUMN
        throw new Error('This migration cannot be rolled back');
      },
    });

    // Sort migrations by version
    this.migrations.sort((a, b) => a.version - b.version);
  }

  /**
   * Update migration version in metadata
   */
  private async updateMigrationVersion(version: number): Promise<void> {
    await this.dbService.setMetadata('last_migration', version.toString());
  }

  /**
   * Update cluster statistics (used in migration 5)
   */
  private async updateClusterStatistics(dbService: DatabaseService): Promise<void> {
    // Update photo clusters
    await dbService.executeSql(`
      UPDATE clusters SET 
        photo_count = (
          SELECT COUNT(*) FROM photos WHERE photos.cluster_id = clusters.id
        ),
        avg_quality = (
          SELECT AVG(quality_overall) FROM photos 
          WHERE photos.cluster_id = clusters.id AND quality_overall IS NOT NULL
        )
    `);

    // Update person clusters
    await dbService.executeSql(`
      UPDATE person_clusters SET 
        photo_count = (
          SELECT COUNT(DISTINCT f.photo_id) FROM faces f 
          WHERE f.person_cluster_id = person_clusters.id
        )
    `);

    // Update event clusters
    await dbService.executeSql(`
      UPDATE event_clusters SET 
        photo_count = (
          SELECT COUNT(*) FROM photos p
          WHERE p.timestamp BETWEEN event_clusters.time_range_start AND event_clusters.time_range_end
        )
    `);
  }

  /**
   * Create a new migration template
   */
  public createMigrationTemplate(name: string): string {
    const nextVersion = Math.max(...this.migrations.map(m => m.version), 0) + 1;
    
    return `
// Migration ${nextVersion}: ${name}
{
  version: ${nextVersion},
  name: '${name}',
  up: async (dbService: DatabaseService) => {
    // Add your migration logic here
    // Example:
    // await dbService.executeSql('ALTER TABLE photos ADD COLUMN new_field TEXT');
  },
  down: async (dbService: DatabaseService) => {
    // Add rollback logic here (optional)
    // Example:
    // await dbService.executeSql('ALTER TABLE photos DROP COLUMN new_field');
  },
}
    `.trim();
  }

  /**
   * Validate migration integrity
   */
  public validateMigrations(): boolean {
    // Check for duplicate versions
    const versions = this.migrations.map(m => m.version);
    const uniqueVersions = new Set(versions);
    
    if (versions.length !== uniqueVersions.size) {
      console.error('Duplicate migration versions found');
      return false;
    }

    // Check for sequential versions
    const sortedVersions = [...versions].sort((a, b) => a - b);
    for (let i = 1; i < sortedVersions.length; i++) {
      if (sortedVersions[i] !== sortedVersions[i - 1] + 1) {
        console.error('Non-sequential migration versions found');
        return false;
      }
    }

    return true;
  }
}

export default MigrationManager;