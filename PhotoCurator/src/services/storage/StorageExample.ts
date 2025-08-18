/**
 * Example usage of the storage system
 */

import { DatabaseService } from './DatabaseService';
import { PhotoRepository } from './PhotoRepository';
import { ClusterRepository } from './ClusterRepository';
import { CacheManager } from './CacheManager';
import { StorageManager } from './StorageManager';
import { MigrationManager } from './MigrationManager';
import { Photo, SyncStatus, ClusterType } from '../../types';

export class StorageExample {
  private dbService: DatabaseService;
  private photoRepository: PhotoRepository;
  private clusterRepository: ClusterRepository;
  private cacheManager: CacheManager;
  private storageManager: StorageManager;
  private migrationManager: MigrationManager;

  constructor() {
    this.dbService = DatabaseService.getInstance();
    this.photoRepository = new PhotoRepository();
    this.clusterRepository = new ClusterRepository();
    this.cacheManager = CacheManager.getInstance();
    this.storageManager = StorageManager.getInstance();
    this.migrationManager = MigrationManager.getInstance();
  }

  /**
   * Initialize the storage system
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize database
      await this.dbService.initialize();
      
      // Run any pending migrations
      await this.migrationManager.runMigrations();
      
      // Initialize cache and storage managers
      await this.cacheManager.initialize();
      await this.storageManager.initialize();
      
      console.log('Storage system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize storage system:', error);
      throw error;
    }
  }

  /**
   * Example: Store and retrieve a photo
   */
  public async storeAndRetrievePhoto(): Promise<void> {
    const photo: Photo = {
      id: 'example-photo-1',
      uri: 'file://example-photo.jpg',
      metadata: {
        width: 1920,
        height: 1080,
        fileSize: 2048000,
        format: 'JPEG',
        timestamp: new Date(),
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      },
      features: {
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        dominantColors: [
          { r: 255, g: 0, b: 0, hex: '#FF0000', percentage: 0.4 },
          { r: 0, g: 255, b: 0, hex: '#00FF00', percentage: 0.6 },
        ],
        objects: [
          {
            label: 'person',
            confidence: 0.95,
            boundingBox: { x: 100, y: 100, width: 200, height: 300 },
          },
        ],
        scenes: [
          { label: 'outdoor', confidence: 0.8 },
        ],
      },
      qualityScore: {
        overall: 0.85,
        sharpness: 0.9,
        exposure: 0.8,
        colorBalance: 0.85,
        noise: 0.1,
      },
      syncStatus: SyncStatus.LOCAL_ONLY,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store photo
    await this.photoRepository.create(photo);
    console.log('Photo stored successfully');

    // Retrieve photo
    const retrievedPhoto = await this.photoRepository.findById(photo.id);
    console.log('Photo retrieved:', retrievedPhoto?.id);

    // Update photo
    await this.photoRepository.update(photo.id, {
      syncStatus: SyncStatus.SYNCED,
    });
    console.log('Photo updated successfully');
  }

  /**
   * Example: Create and manage clusters
   */
  public async createAndManageClusters(): Promise<void> {
    // Create a photo cluster
    const cluster = {
      id: 'example-cluster-1',
      type: ClusterType.VISUAL_SIMILARITY,
      photos: [],
      centroid: [0.1, 0.2, 0.3, 0.4, 0.5],
      confidence: 0.8,
      label: 'Outdoor Photos',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.clusterRepository.createPhotoCluster(cluster);
    console.log('Cluster created successfully');

    // Retrieve cluster
    const retrievedCluster = await this.clusterRepository.findPhotoClusterById(cluster.id);
    console.log('Cluster retrieved:', retrievedCluster?.id);

    // Update cluster
    await this.clusterRepository.updatePhotoCluster(cluster.id, {
      label: 'Updated Outdoor Photos',
      confidence: 0.9,
    });
    console.log('Cluster updated successfully');
  }

  /**
   * Example: Cache management
   */
  public async manageCacheData(): Promise<void> {
    const cacheKey = 'example-thumbnail';
    const thumbnailData = 'base64-encoded-thumbnail-data';

    // Store in cache with 1 hour expiration
    await this.cacheManager.set(cacheKey, thumbnailData, 60 * 60 * 1000);
    console.log('Data cached successfully');

    // Check if data exists
    const exists = await this.cacheManager.has(cacheKey);
    console.log('Cache entry exists:', exists);

    // Retrieve from cache
    const cachedData = await this.cacheManager.get(cacheKey);
    console.log('Data retrieved from cache:', cachedData ? 'success' : 'failed');

    // Get cache statistics
    const stats = await this.cacheManager.getStats();
    console.log('Cache stats:', {
      entries: stats.totalEntries,
      size: `${Math.round(stats.totalSize / 1024)} KB`,
    });

    // Cleanup cache
    await this.cacheManager.cleanup();
    console.log('Cache cleanup completed');
  }

  /**
   * Example: Storage management and optimization
   */
  public async manageStorage(): Promise<void> {
    // Get storage statistics
    const stats = await this.storageManager.getStorageStats();
    console.log('Storage stats:', {
      totalPhotos: stats.photoCount,
      freeSpace: `${Math.round(stats.freeSpace / (1024 * 1024 * 1024))} GB`,
      appDataSize: `${Math.round(stats.appDataSize / (1024 * 1024))} MB`,
      cacheSize: `${Math.round(stats.cacheSize / (1024 * 1024))} MB`,
    });

    // Check if low on space
    const isLowOnSpace = await this.storageManager.isLowOnSpace();
    if (isLowOnSpace) {
      console.log('Device is low on storage space');
      
      // Perform cleanup
      const cleanupResult = await this.storageManager.cleanup();
      console.log('Cleanup completed:', {
        freedSpace: `${Math.round(cleanupResult.freedSpace / (1024 * 1024))} MB`,
        cleanedItems: cleanupResult.cleanedItems,
      });
    }

    // Optimize storage
    await this.storageManager.optimize();
    console.log('Storage optimization completed');
  }

  /**
   * Example: Query photos with filters
   */
  public async queryPhotos(): Promise<void> {
    // Find photos with various filters
    const recentPhotos = await this.photoRepository.find({
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        end: new Date(),
      },
      hasFeatures: true,
      qualityThreshold: 0.7,
    }, { field: 'timestamp', direction: 'DESC' }, 20);

    console.log(`Found ${recentPhotos.length} recent high-quality photos`);

    // Find photos by location
    const nearbyPhotos = await this.photoRepository.find({
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 10, // 10km radius
      },
    });

    console.log(`Found ${nearbyPhotos.length} photos within 10km of San Francisco`);

    // Count photos by sync status
    const localPhotosCount = await this.photoRepository.count({
      syncStatus: SyncStatus.LOCAL_ONLY,
    });

    console.log(`${localPhotosCount} photos are stored locally only`);
  }

  /**
   * Example: Backup and restore
   */
  public async backupAndRestore(): Promise<void> {
    // Create backup
    const backupPath = await this.storageManager.createBackup();
    console.log('Backup created at:', backupPath);

    // List available backups
    const backups = await this.storageManager.getBackups();
    console.log(`Found ${backups.length} backups`);

    // Cleanup old backups (keep only 3 most recent)
    await this.storageManager.cleanupOldBackups(3);
    console.log('Old backups cleaned up');
  }

  /**
   * Run all examples
   */
  public async runAllExamples(): Promise<void> {
    try {
      await this.initialize();
      await this.storeAndRetrievePhoto();
      await this.createAndManageClusters();
      await this.manageCacheData();
      await this.manageStorage();
      await this.queryPhotos();
      await this.backupAndRestore();
      
      console.log('All storage examples completed successfully');
    } catch (error) {
      console.error('Storage example failed:', error);
      throw error;
    }
  }
}

// Export for easy usage
export const storageExample = new StorageExample();