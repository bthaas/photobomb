/**
 * Clustering Integration Tests
 * Tests the complete clustering workflow from photo analysis to UI management
 */

import { ClusteringService } from '../../src/services/clustering/ClusteringService';
import { AIAnalysisEngine } from '../../src/services/ai/AIAnalysisEngine';
import { Photo, ClusterType, ImageFeatures } from '../../src/types';

// Mock the AI Analysis Engine
jest.mock('../../src/services/ai/AIAnalysisEngine');

const mockAIAnalysisEngine = AIAnalysisEngine as jest.MockedClass<typeof AIAnalysisEngine>;

// Mock data generators
const generateMockImageFeatures = (similarity: number = 0.5): ImageFeatures => ({
  embedding: Array.from({ length: 128 }, () => Math.random() * similarity),
  dominantColors: [
    { r: 255, g: 0, b: 0, hex: '#FF0000', percentage: 0.3 },
    { r: 0, g: 255, b: 0, hex: '#00FF00', percentage: 0.7 }
  ],
  objects: [
    {
      label: 'person',
      confidence: 0.9,
      boundingBox: { x: 100, y: 100, width: 200, height: 300 }
    }
  ],
  scenes: [
    { label: 'outdoor', confidence: 0.8 }
  ]
});

const createMockPhoto = (
  id: string,
  timestamp: Date,
  location?: { latitude: number; longitude: number },
  features?: ImageFeatures
): Photo => ({
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
  features,
  syncStatus: 'local_only' as any,
  createdAt: new Date(),
  updatedAt: new Date()
});

describe('Clustering Integration Tests', () => {
  let clusteringService: ClusteringService;
  let aiAnalysisEngine: jest.Mocked<AIAnalysisEngine>;

  beforeEach(() => {
    clusteringService = new ClusteringService({
      visualSimilarityThreshold: 0.7,
      timeThresholdHours: 2,
      locationThresholdMeters: 100,
      minClusterSize: 2,
      maxClusterSize: 20
    });

    aiAnalysisEngine = new mockAIAnalysisEngine() as jest.Mocked<AIAnalysisEngine>;
  });

  describe('End-to-End Clustering Workflow', () => {
    it('should perform complete clustering workflow from raw photos to organized clusters', async () => {
      // Create mock photos representing a typical user scenario
      const baseTime = new Date('2023-06-15T10:00:00Z');
      const photos = [
        // Wedding photos (similar time, location, and visual features)
        createMockPhoto('wedding1', baseTime, { latitude: 40.7128, longitude: -74.0060 }),
        createMockPhoto('wedding2', new Date(baseTime.getTime() + 15 * 60 * 1000), { latitude: 40.7129, longitude: -74.0061 }),
        createMockPhoto('wedding3', new Date(baseTime.getTime() + 30 * 60 * 1000), { latitude: 40.7130, longitude: -74.0062 }),
        
        // Vacation photos (different time and location)
        createMockPhoto('vacation1', new Date(baseTime.getTime() + 7 * 24 * 60 * 60 * 1000), { latitude: 25.7617, longitude: -80.1918 }),
        createMockPhoto('vacation2', new Date(baseTime.getTime() + 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), { latitude: 25.7618, longitude: -80.1919 }),
        
        // Random photos (no clear grouping)
        createMockPhoto('random1', new Date(baseTime.getTime() + 14 * 24 * 60 * 60 * 1000)),
        createMockPhoto('random2', new Date(baseTime.getTime() + 21 * 24 * 60 * 60 * 1000))
      ];

      // Mock AI analysis to add features to photos
      aiAnalysisEngine.extractFeatures.mockImplementation(async (photo) => {
        if (photo.id.startsWith('wedding')) {
          return generateMockImageFeatures(0.9); // High similarity for wedding photos
        } else if (photo.id.startsWith('vacation')) {
          return generateMockImageFeatures(0.8); // High similarity for vacation photos
        } else {
          return generateMockImageFeatures(0.3); // Low similarity for random photos
        }
      });

      // Add features to photos
      for (const photo of photos) {
        photo.features = await aiAnalysisEngine.extractFeatures(photo);
      }

      // Perform visual similarity clustering
      const visualResult = await clusteringService.clusterByVisualSimilarity(photos);
      
      expect(visualResult.clusters.length).toBeGreaterThan(0);
      expect(visualResult.algorithm).toBe('visual_similarity');
      expect(visualResult.processingTime).toBeGreaterThanOrEqual(0);

      // Perform time/location clustering
      const timeLocationResult = await clusteringService.clusterByTimeAndLocation(photos);
      
      expect(timeLocationResult.clusters.length).toBeGreaterThan(0);
      expect(timeLocationResult.algorithm).toBe('time_location');

      // Create event clusters
      const eventClusters = await clusteringService.createEventClusters(photos);
      
      expect(eventClusters.length).toBeGreaterThan(0);
      expect(eventClusters[0].timeRange).toBeDefined();
      expect(eventClusters[0].location).toBeDefined();
    });

    it('should handle mixed clustering scenarios with partial data', async () => {
      const baseTime = new Date('2023-06-15T10:00:00Z');
      const photos = [
        // Photos with full metadata
        createMockPhoto('full1', baseTime, { latitude: 40.7128, longitude: -74.0060 }, generateMockImageFeatures(0.9)),
        createMockPhoto('full2', new Date(baseTime.getTime() + 30 * 60 * 1000), { latitude: 40.7129, longitude: -74.0061 }, generateMockImageFeatures(0.9)),
        
        // Photos without location
        createMockPhoto('no_location1', baseTime, undefined, generateMockImageFeatures(0.8)),
        createMockPhoto('no_location2', new Date(baseTime.getTime() + 30 * 60 * 1000), undefined, generateMockImageFeatures(0.8)),
        
        // Photos without features
        createMockPhoto('no_features1', baseTime, { latitude: 40.7128, longitude: -74.0060 }),
        createMockPhoto('no_features2', new Date(baseTime.getTime() + 30 * 60 * 1000), { latitude: 40.7129, longitude: -74.0061 })
      ];

      const visualResult = await clusteringService.clusterByVisualSimilarity(photos);
      const timeLocationResult = await clusteringService.clusterByTimeAndLocation(photos);

      // Should handle mixed data gracefully
      const totalVisualPhotos = visualResult.clusters.reduce((sum, c) => sum + c.photos.length, 0) + visualResult.unclusteredPhotos.length;
      const totalTimeLocationPhotos = timeLocationResult.clusters.reduce((sum, c) => sum + c.photos.length, 0) + timeLocationResult.unclusteredPhotos.length;
      
      expect(totalVisualPhotos).toBe(photos.length);
      expect(totalTimeLocationPhotos).toBe(photos.length);
    });
  });

  describe('Cluster Management Operations', () => {
    it('should support complete cluster lifecycle management', async () => {
      const baseTime = new Date('2023-06-15T10:00:00Z');
      const photos = Array.from({ length: 12 }, (_, i) => 
        createMockPhoto(
          `photo${i}`,
          new Date(baseTime.getTime() + i * 30 * 60 * 1000),
          { latitude: 40.7128 + i * 0.001, longitude: -74.0060 + i * 0.001 },
          generateMockImageFeatures(0.8)
        )
      );

      // Initial clustering
      const initialResult = await clusteringService.clusterByVisualSimilarity(photos);
      expect(initialResult.clusters.length).toBeGreaterThan(0);

      let clusters = initialResult.clusters;

      // Test cluster merging
      if (clusters.length >= 2) {
        const mergeResult = await clusteringService.mergeClusters(
          [clusters[0].id, clusters[1].id],
          clusters
        );

        expect(mergeResult.mergedCluster.photos.length).toBe(
          clusters[0].photos.length + clusters[1].photos.length
        );
        expect(mergeResult.removedClusterIds).toEqual([clusters[0].id, clusters[1].id]);

        // Update clusters list
        clusters = clusters
          .filter(c => !mergeResult.removedClusterIds.includes(c.id))
          .concat(mergeResult.mergedCluster);
      }

      // Test cluster splitting
      const largestCluster = clusters.reduce((prev, current) => 
        prev.photos.length > current.photos.length ? prev : current
      );

      if (largestCluster.photos.length >= 4) {
        const splitResult = await clusteringService.splitCluster(
          largestCluster.id,
          clusters,
          2
        );

        expect(splitResult.newClusters.length).toBe(2);
        expect(splitResult.originalCluster.id).toBe(largestCluster.id);

        const totalPhotosInSplit = splitResult.newClusters.reduce(
          (sum, c) => sum + c.photos.length,
          0
        );
        expect(totalPhotosInSplit).toBe(largestCluster.photos.length);
      }
    });

    it('should maintain data consistency during cluster operations', async () => {
      const photos = Array.from({ length: 8 }, (_, i) => 
        createMockPhoto(
          `photo${i}`,
          new Date(),
          undefined,
          generateMockImageFeatures(0.8)
        )
      );

      const result = await clusteringService.clusterByVisualSimilarity(photos);
      const clusters = result.clusters;

      // Verify all photos are accounted for
      const clusteredPhotoIds = new Set(clusters.flatMap(c => c.photos.map(p => p.id)));
      const unclusteredPhotoIds = new Set(result.unclusteredPhotos.map(p => p.id));
      const allPhotoIds = new Set(photos.map(p => p.id));

      // No photo should be in both clustered and unclustered
      const intersection = new Set([...clusteredPhotoIds].filter(id => unclusteredPhotoIds.has(id)));
      expect(intersection.size).toBe(0);

      // All photos should be accounted for
      const totalAccountedPhotos = clusteredPhotoIds.size + unclusteredPhotoIds.size;
      expect(totalAccountedPhotos).toBe(allPhotoIds.size);

      // Each photo should appear exactly once across all clusters
      const photoCountInClusters = new Map<string, number>();
      for (const cluster of clusters) {
        for (const photo of cluster.photos) {
          photoCountInClusters.set(photo.id, (photoCountInClusters.get(photo.id) || 0) + 1);
        }
      }

      for (const [photoId, count] of photoCountInClusters) {
        expect(count).toBe(1);
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large photo collections efficiently', async () => {
      const photos = Array.from({ length: 100 }, (_, i) => 
        createMockPhoto(
          `photo${i}`,
          new Date(Date.now() + i * 60000),
          { latitude: 40.7128 + (i % 10) * 0.01, longitude: -74.0060 + (i % 10) * 0.01 },
          generateMockImageFeatures(0.5 + (i % 5) * 0.1)
        )
      );

      const startTime = Date.now();
      const result = await clusteringService.clusterByVisualSimilarity(photos);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      const totalPhotos = result.clusters.reduce((sum, c) => sum + c.photos.length, 0) + result.unclusteredPhotos.length;
      expect(totalPhotos).toBe(photos.length);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should maintain reasonable memory usage during clustering', async () => {
      const photos = Array.from({ length: 50 }, (_, i) => 
        createMockPhoto(
          `photo${i}`,
          new Date(),
          undefined,
          generateMockImageFeatures(Math.random())
        )
      );

      // Monitor memory usage (simplified test)
      const initialMemory = process.memoryUsage().heapUsed;
      
      await clusteringService.clusterByVisualSimilarity(photos);
      await clusteringService.clusterByTimeAndLocation(photos);
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 100MB for this test)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle clustering failures gracefully', async () => {
      const photos = [
        createMockPhoto('1', new Date(), undefined, { ...generateMockImageFeatures(), embedding: [] }), // Invalid embedding
        createMockPhoto('2', new Date(), undefined, generateMockImageFeatures())
      ];

      const result = await clusteringService.clusterByVisualSimilarity(photos);
      
      // Should not throw error and should handle invalid data
      expect(result).toBeDefined();
      expect(result.clusters).toBeDefined();
      expect(result.unclusteredPhotos).toBeDefined();
    });

    it('should handle concurrent clustering operations', async () => {
      const photos1 = Array.from({ length: 20 }, (_, i) => 
        createMockPhoto(`set1_${i}`, new Date(), undefined, generateMockImageFeatures(0.8))
      );
      
      const photos2 = Array.from({ length: 20 }, (_, i) => 
        createMockPhoto(`set2_${i}`, new Date(), undefined, generateMockImageFeatures(0.7))
      );

      // Run clustering operations concurrently
      const [result1, result2] = await Promise.all([
        clusteringService.clusterByVisualSimilarity(photos1),
        clusteringService.clusterByVisualSimilarity(photos2)
      ]);

      const totalPhotos1 = result1.clusters.reduce((sum, c) => sum + c.photos.length, 0) + result1.unclusteredPhotos.length;
      const totalPhotos2 = result2.clusters.reduce((sum, c) => sum + c.photos.length, 0) + result2.unclusteredPhotos.length;
      
      expect(totalPhotos1).toBe(photos1.length);
      expect(totalPhotos2).toBe(photos2.length);
    });

    it('should validate cluster operations input', async () => {
      const photos = [createMockPhoto('1', new Date(), undefined, generateMockImageFeatures())];
      const cluster = {
        id: 'test',
        type: ClusterType.VISUAL_SIMILARITY,
        photos,
        centroid: [0.1, 0.2, 0.3],
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Test invalid merge (less than 2 clusters)
      await expect(
        clusteringService.mergeClusters(['test'], [cluster])
      ).rejects.toThrow();

      // Test invalid split (cluster too small)
      await expect(
        clusteringService.splitCluster('test', [cluster], 3)
      ).rejects.toThrow();

      // Test split non-existent cluster
      await expect(
        clusteringService.splitCluster('nonexistent', [cluster], 2)
      ).rejects.toThrow();
    });
  });
});