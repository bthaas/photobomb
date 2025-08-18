/**
 * ClusteringService Tests
 */

import { ClusteringService } from '../../../src/services/clustering/ClusteringService';
import { Photo, ClusterType, PhotoCluster } from '../../../src/types';

// Mock data
const createMockPhoto = (id: string, embedding: number[], timestamp: Date, location?: { latitude: number; longitude: number }): Photo => ({
  id,
  uri: `file://photo_${id}.jpg`,
  metadata: {
    width: 1920,
    height: 1080,
    fileSize: 2048000,
    format: 'jpeg',
    timestamp,
    location
  },
  features: {
    embedding,
    dominantColors: [],
    objects: [],
    scenes: []
  },
  syncStatus: 'local_only' as any,
  createdAt: new Date(),
  updatedAt: new Date()
});

const createMockCluster = (id: string, photos: Photo[], type: ClusterType = ClusterType.VISUAL_SIMILARITY): PhotoCluster => ({
  id,
  type,
  photos,
  centroid: [0.1, 0.2, 0.3],
  confidence: 0.8,
  createdAt: new Date(),
  updatedAt: new Date()
});

describe('ClusteringService', () => {
  let clusteringService: ClusteringService;

  beforeEach(() => {
    clusteringService = new ClusteringService({
      visualSimilarityThreshold: 0.8,
      timeThresholdHours: 2,
      locationThresholdMeters: 100,
      minClusterSize: 2,
      maxClusterSize: 10
    });
  });

  describe('Visual Similarity Clustering', () => {
    it('should cluster visually similar photos', async () => {
      const photos = [
        createMockPhoto('1', [1, 0, 0], new Date()),
        createMockPhoto('2', [0.9, 0.1, 0.1], new Date()), // Similar to photo 1
        createMockPhoto('3', [0, 1, 0], new Date()),
        createMockPhoto('4', [0.1, 0.9, 0.1], new Date()) // Similar to photo 3
      ];

      const result = await clusteringService.clusterByVisualSimilarity(photos);

      expect(result.clusters).toHaveLength(2);
      expect(result.clusters[0].photos).toHaveLength(2);
      expect(result.clusters[1].photos).toHaveLength(2);
      expect(result.unclusteredPhotos).toHaveLength(0);
      expect(result.algorithm).toBe('visual_similarity');
    });

    it('should not cluster dissimilar photos', async () => {
      const photos = [
        createMockPhoto('1', [1, 0, 0], new Date()),
        createMockPhoto('2', [0, 0, 1], new Date()) // Orthogonal vectors (similarity = 0)
      ];

      const result = await clusteringService.clusterByVisualSimilarity(photos);

      expect(result.clusters).toHaveLength(0);
      expect(result.unclusteredPhotos).toHaveLength(2);
    });

    it('should handle photos without features', async () => {
      const photoWithoutFeatures: Photo = {
        id: '1',
        uri: 'file://photo_1.jpg',
        metadata: {
          width: 1920,
          height: 1080,
          fileSize: 2048000,
          format: 'jpeg',
          timestamp: new Date()
        },
        syncStatus: 'local_only' as any,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await clusteringService.clusterByVisualSimilarity([photoWithoutFeatures]);

      expect(result.clusters).toHaveLength(0);
      expect(result.unclusteredPhotos).toHaveLength(1);
    });

    it('should respect minimum cluster size', async () => {
      const photos = [
        createMockPhoto('1', [1, 0, 0], new Date()),
        createMockPhoto('2', [0, 0, 1], new Date()) // Dissimilar photos
      ];

      const result = await clusteringService.clusterByVisualSimilarity(photos);

      expect(result.clusters).toHaveLength(0);
      expect(result.unclusteredPhotos).toHaveLength(2);
    });
  });

  describe('Time and Location Clustering', () => {
    it('should cluster photos by time proximity', async () => {
      const baseTime = new Date('2023-01-01T10:00:00Z');
      const photos = [
        createMockPhoto('1', [0.1, 0.2, 0.3], baseTime),
        createMockPhoto('2', [0.4, 0.5, 0.6], new Date(baseTime.getTime() + 30 * 60 * 1000)), // 30 minutes later
        createMockPhoto('3', [0.7, 0.8, 0.9], new Date(baseTime.getTime() + 5 * 60 * 60 * 1000)) // 5 hours later
      ];

      const result = await clusteringService.clusterByTimeAndLocation(photos);

      expect(result.clusters).toHaveLength(1);
      expect(result.clusters[0].photos).toHaveLength(2);
      expect(result.clusters[0].type).toBe(ClusterType.EVENT);
      expect(result.unclusteredPhotos).toHaveLength(1);
    });

    it('should cluster photos by location proximity', async () => {
      const baseTime = new Date('2023-01-01T10:00:00Z');
      const photos = [
        createMockPhoto('1', [0.1, 0.2, 0.3], baseTime, { latitude: 40.7128, longitude: -74.0060 }),
        createMockPhoto('2', [0.4, 0.5, 0.6], new Date(baseTime.getTime() + 30 * 60 * 1000), { latitude: 40.7129, longitude: -74.0061 }), // Very close
        createMockPhoto('3', [0.7, 0.8, 0.9], new Date(baseTime.getTime() + 30 * 60 * 1000), { latitude: 41.8781, longitude: -87.6298 }) // Chicago (far away)
      ];

      const result = await clusteringService.clusterByTimeAndLocation(photos);

      expect(result.clusters).toHaveLength(1);
      expect(result.clusters[0].photos).toHaveLength(2);
      expect(result.unclusteredPhotos).toHaveLength(1);
    });

    it('should handle photos without location data', async () => {
      const baseTime = new Date('2023-01-01T10:00:00Z');
      const photos = [
        createMockPhoto('1', [0.1, 0.2, 0.3], baseTime),
        createMockPhoto('2', [0.4, 0.5, 0.6], new Date(baseTime.getTime() + 30 * 60 * 1000))
      ];

      const result = await clusteringService.clusterByTimeAndLocation(photos);

      expect(result.clusters).toHaveLength(1);
      expect(result.clusters[0].photos).toHaveLength(2);
    });
  });

  describe('Event Cluster Creation', () => {
    it('should create event clusters with proper metadata', async () => {
      const baseTime = new Date('2023-01-01T10:00:00Z');
      const photos = [
        createMockPhoto('1', [0.1, 0.2, 0.3], baseTime, { latitude: 40.7128, longitude: -74.0060 }),
        createMockPhoto('2', [0.4, 0.5, 0.6], new Date(baseTime.getTime() + 30 * 60 * 1000), { latitude: 40.7129, longitude: -74.0061 })
      ];

      const eventClusters = await clusteringService.createEventClusters(photos);

      expect(eventClusters).toHaveLength(1);
      expect(eventClusters[0].timeRange.start).toEqual(baseTime);
      expect(eventClusters[0].timeRange.end).toEqual(new Date(baseTime.getTime() + 30 * 60 * 1000));
      expect(eventClusters[0].location).toBeDefined();
      expect(eventClusters[0].name).toContain('Event at');
    });
  });

  describe('Cluster Merging', () => {
    it('should merge multiple clusters successfully', async () => {
      const photos1 = [
        createMockPhoto('1', [0.1, 0.2, 0.3], new Date()),
        createMockPhoto('2', [0.11, 0.21, 0.31], new Date())
      ];
      const photos2 = [
        createMockPhoto('3', [0.4, 0.5, 0.6], new Date()),
        createMockPhoto('4', [0.41, 0.51, 0.61], new Date())
      ];

      const cluster1 = createMockCluster('cluster1', photos1);
      const cluster2 = createMockCluster('cluster2', photos2);
      const clusters = [cluster1, cluster2];

      const result = await clusteringService.mergeClusters(['cluster1', 'cluster2'], clusters);

      expect(result.mergedCluster.photos).toHaveLength(4);
      expect(result.removedClusterIds).toEqual(['cluster1', 'cluster2']);
      expect(result.mergedCluster.label).toContain('Merged');
    });

    it('should throw error when trying to merge less than 2 clusters', async () => {
      const cluster1 = createMockCluster('cluster1', []);
      
      await expect(
        clusteringService.mergeClusters(['cluster1'], [cluster1])
      ).rejects.toThrow('At least 2 clusters are required for merging');
    });
  });

  describe('Cluster Splitting', () => {
    it('should split cluster into multiple smaller clusters', async () => {
      const photos = [
        createMockPhoto('1', [0.1, 0.2, 0.3], new Date()),
        createMockPhoto('2', [0.11, 0.21, 0.31], new Date()),
        createMockPhoto('3', [0.4, 0.5, 0.6], new Date()),
        createMockPhoto('4', [0.41, 0.51, 0.61], new Date()),
        createMockPhoto('5', [0.7, 0.8, 0.9], new Date()),
        createMockPhoto('6', [0.71, 0.81, 0.91], new Date())
      ];

      const cluster = createMockCluster('cluster1', photos);
      const clusters = [cluster];

      const result = await clusteringService.splitCluster('cluster1', clusters, 2);

      expect(result.newClusters).toHaveLength(2);
      expect(result.originalCluster.id).toBe('cluster1');
      
      const totalPhotosInNewClusters = result.newClusters.reduce((sum, c) => sum + c.photos.length, 0);
      expect(totalPhotosInNewClusters).toBe(6);
    });

    it('should throw error when cluster is too small to split', async () => {
      const photos = [
        createMockPhoto('1', [0.1, 0.2, 0.3], new Date()),
        createMockPhoto('2', [0.11, 0.21, 0.31], new Date())
      ];

      const cluster = createMockCluster('cluster1', photos);
      const clusters = [cluster];

      await expect(
        clusteringService.splitCluster('cluster1', clusters, 3)
      ).rejects.toThrow('Cluster too small to split');
    });

    it('should throw error when cluster is not found', async () => {
      await expect(
        clusteringService.splitCluster('nonexistent', [], 2)
      ).rejects.toThrow('Cluster with id nonexistent not found');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle empty photo array', async () => {
      const result = await clusteringService.clusterByVisualSimilarity([]);

      expect(result.clusters).toHaveLength(0);
      expect(result.unclusteredPhotos).toHaveLength(0);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle single photo', async () => {
      const photo = createMockPhoto('1', [0.1, 0.2, 0.3], new Date());
      const result = await clusteringService.clusterByVisualSimilarity([photo]);

      expect(result.clusters).toHaveLength(0);
      expect(result.unclusteredPhotos).toHaveLength(1);
    });

    it('should complete clustering within reasonable time', async () => {
      const photos = Array.from({ length: 50 }, (_, i) => 
        createMockPhoto(
          i.toString(),
          [Math.random(), Math.random(), Math.random()],
          new Date(Date.now() + i * 60000)
        )
      );

      const startTime = Date.now();
      const result = await clusteringService.clusterByVisualSimilarity(photos);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle photos with different embedding dimensions', async () => {
      const photos = [
        createMockPhoto('1', [0.1, 0.2, 0.3], new Date()),
        createMockPhoto('2', [0.1, 0.2], new Date()) // Different dimension
      ];

      const result = await clusteringService.clusterByVisualSimilarity(photos);

      expect(result.clusters).toHaveLength(0);
      expect(result.unclusteredPhotos).toHaveLength(2);
    });
  });

  describe('Configuration', () => {
    it('should respect custom configuration', () => {
      const customConfig = {
        visualSimilarityThreshold: 0.9,
        timeThresholdHours: 4,
        locationThresholdMeters: 200,
        minClusterSize: 3,
        maxClusterSize: 20
      };

      const service = new ClusteringService(customConfig);
      expect(service).toBeDefined();
    });

    it('should use default configuration when none provided', () => {
      const service = new ClusteringService();
      expect(service).toBeDefined();
    });
  });
});