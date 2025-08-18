/**
 * Cache manager for efficient photo and data caching
 */

import RNFS from 'react-native-fs';
import { DatabaseService } from './DatabaseService';

export interface CacheEntry {
  key: string;
  size: number;
  createdAt: Date;
  lastAccessed: Date;
  expiresAt?: Date;
}

export interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  maxAge: number; // Maximum age in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
}

export class CacheManager {
  private static instance: CacheManager;
  private dbService: DatabaseService;
  private cacheDir: string;
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.cacheDir = `${RNFS.CachesDirectoryPath}/PhotoCurator`;
    this.config = {
      maxSize: 500 * 1024 * 1024, // 500MB
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      cleanupInterval: 60 * 60 * 1000, // 1 hour
    };
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Initialize the cache manager
   */
  public async initialize(): Promise<void> {
    try {
      // Create cache directory if it doesn't exist
      const exists = await RNFS.exists(this.cacheDir);
      if (!exists) {
        await RNFS.mkdir(this.cacheDir);
      }

      // Start cleanup timer
      this.startCleanupTimer();

      console.log('Cache manager initialized');
    } catch (error) {
      console.error('Failed to initialize cache manager:', error);
      throw error;
    }
  }

  /**
   * Store data in cache
   */
  public async set(
    key: string,
    data: string | Buffer,
    expiresIn?: number
  ): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      const size = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, 'utf8');
      const now = Date.now();
      const expiresAt = expiresIn ? now + expiresIn : undefined;

      // Write data to file
      await RNFS.writeFile(filePath, data, 'utf8');

      // Update cache metadata
      await this.dbService.executeSql(
        'INSERT OR REPLACE INTO cache_metadata (key, size, created_at, last_accessed, expires_at) VALUES (?, ?, ?, ?, ?)',
        [key, size, now, now, expiresAt]
      );

      // Check if we need to cleanup
      await this.checkCacheSize();
    } catch (error) {
      console.error('Failed to set cache entry:', error);
      throw error;
    }
  }

  /**
   * Get data from cache
   */
  public async get(key: string): Promise<string | null> {
    try {
      const filePath = this.getFilePath(key);
      
      // Check if file exists
      const exists = await RNFS.exists(filePath);
      if (!exists) {
        await this.removeCacheEntry(key);
        return null;
      }

      // Check if entry is expired
      const metadata = await this.getCacheMetadata(key);
      if (!metadata) {
        await this.remove(key);
        return null;
      }

      if (metadata.expiresAt && Date.now() > metadata.expiresAt.getTime()) {
        await this.remove(key);
        return null;
      }

      // Update last accessed time
      await this.dbService.executeSql(
        'UPDATE cache_metadata SET last_accessed = ? WHERE key = ?',
        [Date.now(), key]
      );

      // Read and return data
      return await RNFS.readFile(filePath, 'utf8');
    } catch (error) {
      console.error('Failed to get cache entry:', error);
      return null;
    }
  }

  /**
   * Get binary data from cache
   */
  public async getBinary(key: string): Promise<Buffer | null> {
    try {
      const filePath = this.getFilePath(key);
      
      // Check if file exists
      const exists = await RNFS.exists(filePath);
      if (!exists) {
        await this.removeCacheEntry(key);
        return null;
      }

      // Check if entry is expired
      const metadata = await this.getCacheMetadata(key);
      if (!metadata) {
        await this.remove(key);
        return null;
      }

      if (metadata.expiresAt && Date.now() > metadata.expiresAt.getTime()) {
        await this.remove(key);
        return null;
      }

      // Update last accessed time
      await this.dbService.executeSql(
        'UPDATE cache_metadata SET last_accessed = ? WHERE key = ?',
        [Date.now(), key]
      );

      // Read and return binary data
      const data = await RNFS.readFile(filePath, 'base64');
      return Buffer.from(data, 'base64');
    } catch (error) {
      console.error('Failed to get binary cache entry:', error);
      return null;
    }
  }

  /**
   * Check if key exists in cache
   */
  public async has(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      const exists = await RNFS.exists(filePath);
      
      if (!exists) {
        await this.removeCacheEntry(key);
        return false;
      }

      // Check if entry is expired
      const metadata = await this.getCacheMetadata(key);
      if (!metadata) {
        await this.remove(key);
        return false;
      }

      if (metadata.expiresAt && Date.now() > metadata.expiresAt.getTime()) {
        await this.remove(key);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to check cache entry:', error);
      return false;
    }
  }

  /**
   * Remove entry from cache
   */
  public async remove(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      
      // Remove file if it exists
      const exists = await RNFS.exists(filePath);
      if (exists) {
        await RNFS.unlink(filePath);
      }

      // Remove metadata
      await this.removeCacheEntry(key);
    } catch (error) {
      console.error('Failed to remove cache entry:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  public async clear(): Promise<void> {
    try {
      // Remove all files in cache directory
      const files = await RNFS.readDir(this.cacheDir);
      for (const file of files) {
        await RNFS.unlink(file.path);
      }

      // Clear all cache metadata
      await this.dbService.executeSql('DELETE FROM cache_metadata');

      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  public async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    try {
      const [countResult] = await this.dbService.executeSql(
        'SELECT COUNT(*) as count, SUM(size) as total_size FROM cache_metadata'
      );

      const [oldestResult] = await this.dbService.executeSql(
        'SELECT MIN(created_at) as oldest FROM cache_metadata'
      );

      const [newestResult] = await this.dbService.executeSql(
        'SELECT MAX(created_at) as newest FROM cache_metadata'
      );

      return {
        totalEntries: countResult.count || 0,
        totalSize: countResult.total_size || 0,
        oldestEntry: oldestResult.oldest ? new Date(oldestResult.oldest) : null,
        newestEntry: newestResult.newest ? new Date(newestResult.newest) : null,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalEntries: 0,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }

  /**
   * Cleanup expired and old entries
   */
  public async cleanup(): Promise<void> {
    try {
      const now = Date.now();

      // Remove expired entries
      const expiredEntries = await this.dbService.executeSql(
        'SELECT key FROM cache_metadata WHERE expires_at IS NOT NULL AND expires_at < ?',
        [now]
      );

      for (const entry of expiredEntries) {
        await this.remove(entry.key);
      }

      // Remove old entries if cache is too large
      await this.checkCacheSize();

      console.log(`Cache cleanup completed. Removed ${expiredEntries.length} expired entries.`);
    } catch (error) {
      console.error('Failed to cleanup cache:', error);
    }
  }

  /**
   * Update cache configuration
   */
  public updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart cleanup timer if interval changed
    if (config.cleanupInterval) {
      this.stopCleanupTimer();
      this.startCleanupTimer();
    }
  }

  /**
   * Get cache configuration
   */
  public getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Destroy the cache manager
   */
  public async destroy(): Promise<void> {
    this.stopCleanupTimer();
    await this.clear();
  }

  /**
   * Get file path for cache key
   */
  private getFilePath(key: string): string {
    // Create a safe filename from the key
    const safeKey = key.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${this.cacheDir}/${safeKey}`;
  }

  /**
   * Get cache metadata for a key
   */
  private async getCacheMetadata(key: string): Promise<CacheEntry | null> {
    try {
      const result = await this.dbService.executeSql(
        'SELECT * FROM cache_metadata WHERE key = ?',
        [key]
      );

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return {
        key: row.key,
        size: row.size,
        createdAt: new Date(row.created_at),
        lastAccessed: new Date(row.last_accessed),
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      };
    } catch (error) {
      console.error('Failed to get cache metadata:', error);
      return null;
    }
  }

  /**
   * Remove cache entry metadata
   */
  private async removeCacheEntry(key: string): Promise<void> {
    await this.dbService.executeSql('DELETE FROM cache_metadata WHERE key = ?', [key]);
  }

  /**
   * Check cache size and remove old entries if necessary
   */
  private async checkCacheSize(): Promise<void> {
    try {
      const stats = await this.getStats();
      
      if (stats.totalSize <= this.config.maxSize) {
        return;
      }

      // Remove oldest entries until we're under the size limit
      const entriesToRemove = await this.dbService.executeSql(
        'SELECT key FROM cache_metadata ORDER BY last_accessed ASC'
      );

      let removedSize = 0;
      for (const entry of entriesToRemove) {
        const metadata = await this.getCacheMetadata(entry.key);
        if (metadata) {
          await this.remove(entry.key);
          removedSize += metadata.size;
          
          if (stats.totalSize - removedSize <= this.config.maxSize) {
            break;
          }
        }
      }

      console.log(`Cache size check completed. Removed ${removedSize} bytes.`);
    } catch (error) {
      console.error('Failed to check cache size:', error);
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(error => {
        console.error('Scheduled cache cleanup failed:', error);
      });
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}

export default CacheManager;