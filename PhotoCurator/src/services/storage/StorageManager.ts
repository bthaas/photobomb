/**
 * Storage manager for overall storage operations and optimization
 */

import RNFS from 'react-native-fs';
import { DatabaseService } from './DatabaseService';
import { CacheManager } from './CacheManager';

export interface StorageStats {
  totalSpace: number;
  freeSpace: number;
  usedSpace: number;
  appDataSize: number;
  cacheSize: number;
  databaseSize: number;
  photoCount: number;
}

export interface StorageConfig {
  maxAppDataSize: number; // Maximum app data size in bytes
  lowSpaceThreshold: number; // Low space warning threshold in bytes
  cleanupThreshold: number; // Auto cleanup threshold in bytes
  enableAutoCleanup: boolean;
}

export class StorageManager {
  private static instance: StorageManager;
  private dbService: DatabaseService;
  private cacheManager: CacheManager;
  private config: StorageConfig;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.cacheManager = CacheManager.getInstance();
    this.config = {
      maxAppDataSize: 2 * 1024 * 1024 * 1024, // 2GB
      lowSpaceThreshold: 500 * 1024 * 1024, // 500MB
      cleanupThreshold: 100 * 1024 * 1024, // 100MB
      enableAutoCleanup: true,
    };
  }

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  /**
   * Initialize the storage manager
   */
  public async initialize(): Promise<void> {
    try {
      await this.cacheManager.initialize();
      console.log('Storage manager initialized');
    } catch (error) {
      console.error('Failed to initialize storage manager:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive storage statistics
   */
  public async getStorageStats(): Promise<StorageStats> {
    try {
      // Get device storage info
      const freeSpace = await RNFS.getFSInfo().then(info => info.freeSpace);
      const totalSpace = await RNFS.getFSInfo().then(info => info.totalSpace);
      const usedSpace = totalSpace - freeSpace;

      // Get app-specific storage info
      const appDataSize = await this.getAppDataSize();
      const cacheStats = await this.cacheManager.getStats();
      const dbStats = await this.dbService.getStatistics();

      return {
        totalSpace,
        freeSpace,
        usedSpace,
        appDataSize,
        cacheSize: cacheStats.totalSize,
        databaseSize: dbStats.databaseSize,
        photoCount: dbStats.totalPhotos,
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      throw error;
    }
  }

  /**
   * Check if device has low storage space
   */
  public async isLowOnSpace(): Promise<boolean> {
    try {
      const stats = await this.getStorageStats();
      return stats.freeSpace < this.config.lowSpaceThreshold;
    } catch (error) {
      console.error('Failed to check storage space:', error);
      return false;
    }
  }

  /**
   * Check if app data size exceeds limits
   */
  public async isAppDataSizeExceeded(): Promise<boolean> {
    try {
      const stats = await this.getStorageStats();
      return stats.appDataSize > this.config.maxAppDataSize;
    } catch (error) {
      console.error('Failed to check app data size:', error);
      return false;
    }
  }

  /**
   * Perform storage cleanup
   */
  public async cleanup(aggressive = false): Promise<{
    freedSpace: number;
    cleanedItems: string[];
  }> {
    const cleanedItems: string[] = [];
    let freedSpace = 0;

    try {
      // 1. Clean up cache
      const cacheStatsBefore = await this.cacheManager.getStats();
      await this.cacheManager.cleanup();
      const cacheStatsAfter = await this.cacheManager.getStats();
      const cacheFreed = cacheStatsBefore.totalSize - cacheStatsAfter.totalSize;
      
      if (cacheFreed > 0) {
        freedSpace += cacheFreed;
        cleanedItems.push(`Cache: ${this.formatBytes(cacheFreed)}`);
      }

      // 2. Clean up temporary files
      const tempFreed = await this.cleanupTempFiles();
      if (tempFreed > 0) {
        freedSpace += tempFreed;
        cleanedItems.push(`Temp files: ${this.formatBytes(tempFreed)}`);
      }

      // 3. Clean up old thumbnails (if aggressive)
      if (aggressive) {
        const thumbnailFreed = await this.cleanupOldThumbnails();
        if (thumbnailFreed > 0) {
          freedSpace += thumbnailFreed;
          cleanedItems.push(`Thumbnails: ${this.formatBytes(thumbnailFreed)}`);
        }
      }

      // 4. Vacuum database
      await this.vacuumDatabase();
      cleanedItems.push('Database optimized');

      console.log(`Storage cleanup completed. Freed ${this.formatBytes(freedSpace)}`);
      
      return { freedSpace, cleanedItems };
    } catch (error) {
      console.error('Failed to cleanup storage:', error);
      throw error;
    }
  }

  /**
   * Optimize storage by reorganizing data
   */
  public async optimize(): Promise<void> {
    try {
      // 1. Vacuum database to reclaim space
      await this.vacuumDatabase();

      // 2. Reindex database for better performance
      await this.reindexDatabase();

      // 3. Optimize cache
      await this.cacheManager.cleanup();

      console.log('Storage optimization completed');
    } catch (error) {
      console.error('Failed to optimize storage:', error);
      throw error;
    }
  }

  /**
   * Create backup of critical data
   */
  public async createBackup(): Promise<string> {
    try {
      const backupDir = `${RNFS.DocumentDirectoryPath}/backups`;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${backupDir}/backup-${timestamp}`;

      // Create backup directory
      await RNFS.mkdir(backupPath, { NSURLIsExcludedFromBackupKey: false });

      // Export database
      const dbPath = await this.exportDatabase(`${backupPath}/database.sql`);
      
      // Export metadata
      const metadataPath = await this.exportMetadata(`${backupPath}/metadata.json`);

      console.log(`Backup created at: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  public async restoreFromBackup(backupPath: string): Promise<void> {
    try {
      // Check if backup exists
      const exists = await RNFS.exists(backupPath);
      if (!exists) {
        throw new Error('Backup path does not exist');
      }

      // Import database
      const dbBackupPath = `${backupPath}/database.sql`;
      if (await RNFS.exists(dbBackupPath)) {
        await this.importDatabase(dbBackupPath);
      }

      // Import metadata
      const metadataBackupPath = `${backupPath}/metadata.json`;
      if (await RNFS.exists(metadataBackupPath)) {
        await this.importMetadata(metadataBackupPath);
      }

      console.log('Backup restored successfully');
    } catch (error) {
      console.error('Failed to restore backup:', error);
      throw error;
    }
  }

  /**
   * Get list of available backups
   */
  public async getBackups(): Promise<Array<{
    path: string;
    name: string;
    createdAt: Date;
    size: number;
  }>> {
    try {
      const backupDir = `${RNFS.DocumentDirectoryPath}/backups`;
      const exists = await RNFS.exists(backupDir);
      
      if (!exists) {
        return [];
      }

      const files = await RNFS.readDir(backupDir);
      const backups = [];

      for (const file of files) {
        if (file.isDirectory()) {
          const stat = await RNFS.stat(file.path);
          backups.push({
            path: file.path,
            name: file.name,
            createdAt: new Date(stat.ctime),
            size: stat.size,
          });
        }
      }

      return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Failed to get backups:', error);
      return [];
    }
  }

  /**
   * Delete old backups
   */
  public async cleanupOldBackups(keepCount = 5): Promise<void> {
    try {
      const backups = await this.getBackups();
      
      if (backups.length <= keepCount) {
        return;
      }

      const backupsToDelete = backups.slice(keepCount);
      
      for (const backup of backupsToDelete) {
        await RNFS.unlink(backup.path);
      }

      console.log(`Cleaned up ${backupsToDelete.length} old backups`);
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Update storage configuration
   */
  public updateConfig(config: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get storage configuration
   */
  public getConfig(): StorageConfig {
    return { ...this.config };
  }

  /**
   * Get app data size
   */
  private async getAppDataSize(): Promise<number> {
    try {
      const documentsSize = await this.getDirectorySize(RNFS.DocumentDirectoryPath);
      const cachesSize = await this.getDirectorySize(RNFS.CachesDirectoryPath);
      return documentsSize + cachesSize;
    } catch (error) {
      console.error('Failed to get app data size:', error);
      return 0;
    }
  }

  /**
   * Get directory size recursively
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    try {
      const exists = await RNFS.exists(dirPath);
      if (!exists) {
        return 0;
      }

      const files = await RNFS.readDir(dirPath);
      let totalSize = 0;

      for (const file of files) {
        if (file.isDirectory()) {
          totalSize += await this.getDirectorySize(file.path);
        } else {
          totalSize += file.size;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Failed to get directory size:', error);
      return 0;
    }
  }

  /**
   * Clean up temporary files
   */
  private async cleanupTempFiles(): Promise<number> {
    try {
      const tempDir = `${RNFS.CachesDirectoryPath}/temp`;
      const exists = await RNFS.exists(tempDir);
      
      if (!exists) {
        return 0;
      }

      const sizeBefore = await this.getDirectorySize(tempDir);
      await RNFS.unlink(tempDir);
      await RNFS.mkdir(tempDir);
      
      return sizeBefore;
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
      return 0;
    }
  }

  /**
   * Clean up old thumbnails
   */
  private async cleanupOldThumbnails(): Promise<number> {
    try {
      const thumbnailDir = `${RNFS.CachesDirectoryPath}/thumbnails`;
      const exists = await RNFS.exists(thumbnailDir);
      
      if (!exists) {
        return 0;
      }

      const files = await RNFS.readDir(thumbnailDir);
      const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago
      let freedSpace = 0;

      for (const file of files) {
        const stat = await RNFS.stat(file.path);
        if (new Date(stat.mtime).getTime() < cutoffTime) {
          freedSpace += stat.size;
          await RNFS.unlink(file.path);
        }
      }

      return freedSpace;
    } catch (error) {
      console.error('Failed to cleanup old thumbnails:', error);
      return 0;
    }
  }

  /**
   * Vacuum database to reclaim space
   */
  private async vacuumDatabase(): Promise<void> {
    try {
      await this.dbService.executeSql('VACUUM');
      console.log('Database vacuumed successfully');
    } catch (error) {
      console.error('Failed to vacuum database:', error);
    }
  }

  /**
   * Reindex database for better performance
   */
  private async reindexDatabase(): Promise<void> {
    try {
      await this.dbService.executeSql('REINDEX');
      console.log('Database reindexed successfully');
    } catch (error) {
      console.error('Failed to reindex database:', error);
    }
  }

  /**
   * Export database to SQL file
   */
  private async exportDatabase(filePath: string): Promise<string> {
    // This is a simplified implementation
    // In a real app, you'd want to use SQLite's backup API
    try {
      const tables = ['photos', 'faces', 'clusters', 'person_clusters', 'event_clusters', 'photo_edits'];
      let sqlContent = '';

      for (const table of tables) {
        const rows = await this.dbService.executeSql(`SELECT * FROM ${table}`);
        // Convert rows to INSERT statements
        // This is a simplified approach - you'd want more robust SQL generation
        sqlContent += `-- Table: ${table}\n`;
        for (const row of rows) {
          // Generate INSERT statement for each row
          // Implementation would depend on your specific needs
        }
        sqlContent += '\n';
      }

      await RNFS.writeFile(filePath, sqlContent, 'utf8');
      return filePath;
    } catch (error) {
      console.error('Failed to export database:', error);
      throw error;
    }
  }

  /**
   * Import database from SQL file
   */
  private async importDatabase(filePath: string): Promise<void> {
    try {
      const sqlContent = await RNFS.readFile(filePath, 'utf8');
      // Parse and execute SQL statements
      // This is a simplified implementation
      const statements = sqlContent.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          await this.dbService.executeSql(statement);
        }
      }
    } catch (error) {
      console.error('Failed to import database:', error);
      throw error;
    }
  }

  /**
   * Export metadata to JSON file
   */
  private async exportMetadata(filePath: string): Promise<string> {
    try {
      const stats = await this.getStorageStats();
      const config = this.getConfig();
      const metadata = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        stats,
        config,
      };

      await RNFS.writeFile(filePath, JSON.stringify(metadata, null, 2), 'utf8');
      return filePath;
    } catch (error) {
      console.error('Failed to export metadata:', error);
      throw error;
    }
  }

  /**
   * Import metadata from JSON file
   */
  private async importMetadata(filePath: string): Promise<void> {
    try {
      const content = await RNFS.readFile(filePath, 'utf8');
      const metadata = JSON.parse(content);
      
      if (metadata.config) {
        this.updateConfig(metadata.config);
      }
    } catch (error) {
      console.error('Failed to import metadata:', error);
      throw error;
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default StorageManager;