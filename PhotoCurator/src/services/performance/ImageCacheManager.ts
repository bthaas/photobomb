import { Image } from 'react-native';
import RNFS from 'react-native-fs';
import { Photo } from '../../types/photo';

export interface CacheConfig {
  maxCacheSize: number; // in MB
  maxCacheAge: number; // in milliseconds
  compressionQuality: number; // 0-1
  thumbnailSize: { width: number; height: number };
}

export interface CachedImage {
  uri: string;
  localPath: string;
  size: number;
  lastAccessed: number;
  isCompressed: boolean;
}

export class ImageCacheManager {
  private cache = new Map<string, CachedImage>();
  private cacheDir: string;
  private config: CacheConfig;
  private currentCacheSize = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxCacheSize: 500, // 500MB default
      maxCacheAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      compressionQuality: 0.8,
      thumbnailSize: { width: 300, height: 300 },
      ...config,
    };
    this.cacheDir = `${RNFS.CachesDirectoryPath}/image_cache`;
    this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    try {
      // Create cache directory if it doesn't exist
      const exists = await RNFS.exists(this.cacheDir);
      if (!exists) {
        await RNFS.mkdir(this.cacheDir);
      }

      // Load existing cache entries
      await this.loadCacheIndex();
      
      // Clean up expired entries
      await this.cleanupExpiredEntries();
    } catch (error) {
      console.error('Failed to initialize image cache:', error);
    }
  }

  private async loadCacheIndex(): Promise<void> {
    try {
      const indexPath = `${this.cacheDir}/cache_index.json`;
      const exists = await RNFS.exists(indexPath);
      
      if (exists) {
        const indexContent = await RNFS.readFile(indexPath, 'utf8');
        const cacheData = JSON.parse(indexContent);
        
        for (const [key, value] of Object.entries(cacheData)) {
          this.cache.set(key, value as CachedImage);
          this.currentCacheSize += (value as CachedImage).size;
        }
      }
    } catch (error) {
      console.error('Failed to load cache index:', error);
    }
  }

  private async saveCacheIndex(): Promise<void> {
    try {
      const indexPath = `${this.cacheDir}/cache_index.json`;
      const cacheData = Object.fromEntries(this.cache);
      await RNFS.writeFile(indexPath, JSON.stringify(cacheData), 'utf8');
    } catch (error) {
      console.error('Failed to save cache index:', error);
    }
  }

  async getCachedImage(uri: string, options?: { thumbnail?: boolean }): Promise<string | null> {
    const cacheKey = this.getCacheKey(uri, options?.thumbnail);
    const cachedImage = this.cache.get(cacheKey);

    if (cachedImage) {
      // Update last accessed time
      cachedImage.lastAccessed = Date.now();
      this.cache.set(cacheKey, cachedImage);
      
      // Check if file still exists
      const exists = await RNFS.exists(cachedImage.localPath);
      if (exists) {
        return cachedImage.localPath;
      } else {
        // Remove from cache if file doesn't exist
        this.cache.delete(cacheKey);
        this.currentCacheSize -= cachedImage.size;
      }
    }

    return null;
  }

  async cacheImage(uri: string, options?: { thumbnail?: boolean }): Promise<string> {
    const cacheKey = this.getCacheKey(uri, options?.thumbnail);
    
    // Check if already cached
    const existing = await this.getCachedImage(uri, options);
    if (existing) {
      return existing;
    }

    try {
      // Generate local file path
      const fileName = `${cacheKey}.jpg`;
      const localPath = `${this.cacheDir}/${fileName}`;

      // Process and save image
      let processedUri = uri;
      if (options?.thumbnail) {
        processedUri = await this.createThumbnail(uri);
      }

      // Copy/compress image to cache
      await this.processAndSaveImage(processedUri, localPath);

      // Get file size
      const stat = await RNFS.stat(localPath);
      const size = stat.size;

      // Ensure cache size limit
      await this.ensureCacheSize(size);

      // Add to cache
      const cachedImage: CachedImage = {
        uri,
        localPath,
        size,
        lastAccessed: Date.now(),
        isCompressed: true,
      };

      this.cache.set(cacheKey, cachedImage);
      this.currentCacheSize += size;

      // Save cache index
      await this.saveCacheIndex();

      return localPath;
    } catch (error) {
      console.error('Failed to cache image:', error);
      return uri; // Return original URI on failure
    }
  }

  private async createThumbnail(uri: string): Promise<string> {
    // This would use a library like react-native-image-resizer
    // For now, return the original URI
    return uri;
  }

  private async processAndSaveImage(sourceUri: string, targetPath: string): Promise<void> {
    // Copy file with compression if needed
    await RNFS.copyFile(sourceUri, targetPath);
  }

  private async ensureCacheSize(newImageSize: number): Promise<void> {
    const maxSizeBytes = this.config.maxCacheSize * 1024 * 1024;
    
    while (this.currentCacheSize + newImageSize > maxSizeBytes && this.cache.size > 0) {
      // Find least recently used image
      let oldestKey = '';
      let oldestTime = Date.now();

      for (const [key, image] of this.cache) {
        if (image.lastAccessed < oldestTime) {
          oldestTime = image.lastAccessed;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        await this.removeCachedImage(oldestKey);
      }
    }
  }

  private async removeCachedImage(cacheKey: string): Promise<void> {
    const cachedImage = this.cache.get(cacheKey);
    if (cachedImage) {
      try {
        await RNFS.unlink(cachedImage.localPath);
        this.currentCacheSize -= cachedImage.size;
        this.cache.delete(cacheKey);
      } catch (error) {
        console.error('Failed to remove cached image:', error);
      }
    }
  }

  private async cleanupExpiredEntries(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, image] of this.cache) {
      if (now - image.lastAccessed > this.config.maxCacheAge) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      await this.removeCachedImage(key);
    }

    if (expiredKeys.length > 0) {
      await this.saveCacheIndex();
    }
  }

  private getCacheKey(uri: string, thumbnail?: boolean): string {
    const suffix = thumbnail ? '_thumb' : '';
    return `${this.hashString(uri)}${suffix}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  async clearCache(): Promise<void> {
    try {
      await RNFS.unlink(this.cacheDir);
      await RNFS.mkdir(this.cacheDir);
      this.cache.clear();
      this.currentCacheSize = 0;
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  getCacheStats(): { size: number; count: number; maxSize: number } {
    return {
      size: this.currentCacheSize,
      count: this.cache.size,
      maxSize: this.config.maxCacheSize * 1024 * 1024,
    };
  }
}

export const imageCacheManager = new ImageCacheManager();