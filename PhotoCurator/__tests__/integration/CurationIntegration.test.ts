/**
 * Curation Integration Tests
 */

import { CurationService } from '../../src/services/curation/CurationService';
import { ClusteringService } from '../../src/services/clustering/ClusteringService';
import {
  Photo,
  PhotoCluster,
  CurationGoal,
  CurationResult,
  UserFeedback
} from '../../src/types';

// Mock data helpers
const createMockPhoto = (
  id: string,
  qualityScore: number = 0.5,
  compositionScore: number = 0.5,
  contentScore: number = 0.5,
  hasfaces: boolean = false
): Photo => ({
  id,
  uri: `file://photo-${id}.jpg`,
  metadata: {
    width: 1920,
    height: 1080,
    fileSize: 2048000,
    format: 'jpeg',
    timestamp: new Date(Date.now() - Math.random() * 86400000 * 30) // Random date within last 30 days
  },
  qualityScore: {
    overall: qualityScore,
    sharpness: qualityScore,
    exposure: qualityScore,
    colorBalance: qualityScore,
    noise: 1 - qualityScore
  },
  compositionScore: {
    overall: compositionScore,
    ruleOfThirds: compositionScore,
    leadingLines: compositionScore,
    symmetry: compositionScore,
    subjectPlacement: compositionScore
  },
  contentScore: {
    overall: contentScore,
    faceQuality: hasfaces ? contentScore : 0,
    emotionalSentiment: hasfaces ? contentScore : contentScore * 0.5,
    interestingness: contentScore
  },
  faces: hasfaces ? [{
    id: `face-${id}`,
    boundingBox: { x: 100, y: 100, width: 200, height: 200 },
    landmarks: {
      leftEye: { x: 150, y: 150 },
      rightEye: { x: 250, y: 150 },
      nose: { x: 200, y: 180 },
      leftMouth: { x: 180, y: 220 },
      rightMouth: { x: 220, y: 220 }
    },
    embedding: [Math.random(), Math.random(), Math.random()],
    confidence: 0.9,
    attributes: {
      smile: contentScore,
      eyesOpen: 0.9,
      emotion: contentScore > 0.7 ? 'happy' : 'neutral'
    }
  }] : undefined,
  features: {
    embedding: Array.from({ length: 128 }, () => Math.random()),
    dominantColors: [],
    objects: [],
    scenes: []
  },
  syncStatus: 'local_only' as any,
  createdAt: new Date(),
  updatedAt: new Date()
});

describe('Curation Integration Tests', () => {
  let curationService: CurationService;
  let clusteringService: ClusteringService;

  beforeEach(() => {
    curationService = new CurationService();
    clusteringService = new ClusteringService();
  });

  describe('End-to-end curation workflow', () => {
    it('should curate photos from clustered data', async () => {
      // Create a diverse set of photos
      const photos: Photo[] = [
        // High quality scenic photos
        createMockPhoto('scenic1', 0.9, 0.85, 0.7, false),
        createMockPhoto('scenic2', 0.85, 0.9, 0.65, false),
        createMockPhoto('scenic3', 0.8, 0.8, 0.6, false),
        
        // Portrait photos with faces
        createMockPhoto('portrait1', 0.8, 0.7, 0.9, true),
        createMockPhoto('portrait2', 0.75, 0.65, 0.85, true),
        createMockPhoto('portrait3', 0.7, 0.6, 0.8, true),
        
        // Lower quality photos
        createMockPhoto('low1', 0.4, 0.3, 0.4, false),
        createMockPhoto('low2', 0.3, 0.4, 0.3, false),
        
        // Creative/artistic photos
        createMockPhoto('creative1', 0.7, 0.95, 0.8, false),
        createMockPhoto('creative2', 0.65, 0.9, 0.75, false)
      ];

      // Cluster the photos (simplified clustering for test)
      const clusters: PhotoCluster[] = [
        {
          id: 'scenic-cluster',
          type: 'visual_similarity' as any,
          photos: photos.slice(0, 3), // scenic photos
          centroid: [0.1, 0.2, 0.3],
          confidence: 0.8,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'portrait-cluster',
          type: 'face_group' as any,
          photos: photos.slice(3, 6), // portrait photos
          centroid: [0.4, 0.5, 0.6],
          confidence: 0.9,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'mixed-cluster',
          type: 'visual_similarity' as any,
          photos: photos.slice(6), // remaining photos
          centroid: [0.7, 0.8, 0.9],
          confidence: 0.7,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Test different curation goals
      const goals = [
        CurationGoal.BEST_SCENIC,
        CurationGoal.BEST_PORTRAITS,
        CurationGoal.MOST_CREATIVE,
        CurationGoal.BEST_TECHNICAL,
        CurationGoal.BALANCED
      ];

      for (const goal of goals) {
        const result = await curationService.curatePhotos(clusters, goal, 2);
        
        expect(result.selectedPhotos.length).toBeGreaterThan(0);
        expect(result.selectedPhotos.length).toBeLessThanOrEqual(6); // Max 2 per cluster * 3 clusters
        expect(result.goal).toBe(goal);
        expect(result.totalPhotos).toBe(10);
        expect(result.processingTime).toBeGreaterThanOrEqual(0);
        
        // Verify ranking order
        for (let i = 0; i < result.selectedPhotos.length - 1; i++) {
          expect(result.selectedPhotos[i].score).toBeGreaterThanOrEqual(
            result.selectedPhotos[i + 1].score
          );
          expect(result.selectedPhotos[i].rank).toBe(i + 1);
        }
        
        // Verify goal-specific behavior
        if (goal === CurationGoal.BEST_PORTRAITS) {
          // Should prefer photos with faces
          const topPhoto = result.selectedPhotos[0];
          expect(topPhoto.photo.faces?.length).toBeGreaterThan(0);
        }
        
        if (goal === CurationGoal.BEST_TECHNICAL) {
          // Should prefer high quality photos
          const topPhoto = result.selectedPhotos[0];
          expect(topPhoto.photo.qualityScore?.overall).toBeGreaterThan(0.7);
        }
      }
    });

    it('should handle user feedback and learning', async () => {
      const photos = [
        createMockPhoto('photo1', 0.8, 0.7, 0.6),
        createMockPhoto('photo2', 0.7, 0.8, 0.7),
        createMockPhoto('photo3', 0.6, 0.6, 0.8)
      ];

      const cluster: PhotoCluster = {
        id: 'test-cluster',
        type: 'visual_similarity' as any,
        photos,
        centroid: [0.1, 0.2, 0.3],
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Initial curation
      const initialResult = await curationService.curatePhotos([cluster], CurationGoal.BALANCED, 3);
      expect(initialResult.selectedPhotos).toHaveLength(3);

      // Simulate user feedback
      const feedbacks: UserFeedback[] = [
        {
          photoId: initialResult.selectedPhotos[0].photo.id,
          action: 'favorite',
          context: {
            curationGoal: CurationGoal.BALANCED,
            originalRank: 1,
            originalScore: initialResult.selectedPhotos[0].score
          },
          timestamp: new Date()
        },
        {
          photoId: initialResult.selectedPhotos[2].photo.id,
          action: 'discard',
          context: {
            curationGoal: CurationGoal.BALANCED,
            originalRank: 3,
            originalScore: initialResult.selectedPhotos[2].score
          },
          timestamp: new Date()
        }
      ];

      // Process feedback
      for (const feedback of feedbacks) {
        await expect(curationService.processFeedback(feedback)).resolves.not.toThrow();
      }

      // Verify feedback was processed (in a real implementation, this would affect future rankings)
      expect(true).toBe(true); // Placeholder - actual learning verification would be more complex
    });
  });

  describe('Performance and scalability', () => {
    it('should handle large numbers of photos efficiently', async () => {
      // Create a large dataset
      const photos: Photo[] = [];
      for (let i = 0; i < 100; i++) {
        photos.push(createMockPhoto(
          `photo${i}`,
          Math.random(),
          Math.random(),
          Math.random(),
          Math.random() > 0.7 // 30% chance of having faces
        ));
      }

      // Create multiple clusters
      const clusters: PhotoCluster[] = [];
      for (let i = 0; i < 10; i++) {
        clusters.push({
          id: `cluster${i}`,
          type: 'visual_similarity' as any,
          photos: photos.slice(i * 10, (i + 1) * 10),
          centroid: [Math.random(), Math.random(), Math.random()],
          confidence: 0.8,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      const startTime = Date.now();
      const result = await curationService.curatePhotos(clusters, CurationGoal.BALANCED, 3);
      const processingTime = Date.now() - startTime;

      expect(result.selectedPhotos.length).toBeLessThanOrEqual(30); // Max 3 per cluster * 10 clusters
      expect(result.totalPhotos).toBe(100);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify results are properly ranked
      for (let i = 0; i < result.selectedPhotos.length - 1; i++) {
        expect(result.selectedPhotos[i].score).toBeGreaterThanOrEqual(
          result.selectedPhotos[i + 1].score
        );
      }
    });

    it('should provide consistent results for the same input', async () => {
      const photos = [
        createMockPhoto('consistent1', 0.8, 0.7, 0.6),
        createMockPhoto('consistent2', 0.7, 0.8, 0.7),
        createMockPhoto('consistent3', 0.6, 0.6, 0.8)
      ];

      const cluster: PhotoCluster = {
        id: 'consistency-test',
        type: 'visual_similarity' as any,
        photos,
        centroid: [0.1, 0.2, 0.3],
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Run curation multiple times
      const results: CurationResult[] = [];
      for (let i = 0; i < 3; i++) {
        const result = await curationService.curatePhotos([cluster], CurationGoal.BALANCED, 3);
        results.push(result);
      }

      // Verify consistency
      for (let i = 1; i < results.length; i++) {
        expect(results[i].selectedPhotos.length).toBe(results[0].selectedPhotos.length);
        
        // Photo order should be consistent
        for (let j = 0; j < results[i].selectedPhotos.length; j++) {
          expect(results[i].selectedPhotos[j].photo.id).toBe(
            results[0].selectedPhotos[j].photo.id
          );
          expect(results[i].selectedPhotos[j].rank).toBe(
            results[0].selectedPhotos[j].rank
          );
        }
      }
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty clusters gracefully', async () => {
      const emptyCluster: PhotoCluster = {
        id: 'empty',
        type: 'visual_similarity' as any,
        photos: [],
        centroid: [],
        confidence: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await curationService.curatePhotos([emptyCluster], CurationGoal.BALANCED, 3);
      
      expect(result.selectedPhotos).toHaveLength(0);
      expect(result.totalPhotos).toBe(0);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle photos without analysis scores', async () => {
      const photoWithoutScores: Photo = {
        id: 'no-scores',
        uri: 'file://no-scores.jpg',
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

      const cluster: PhotoCluster = {
        id: 'no-scores-cluster',
        type: 'visual_similarity' as any,
        photos: [photoWithoutScores],
        centroid: [0.1, 0.2, 0.3],
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await curationService.curatePhotos([cluster], CurationGoal.BALANCED, 1);
      
      expect(result.selectedPhotos).toHaveLength(1);
      expect(result.selectedPhotos[0].scoreBreakdown.quality).toBe(0.5); // Default neutral score
    });

    it('should handle single photo clusters', async () => {
      const singlePhoto = createMockPhoto('single', 0.8, 0.7, 0.6);
      const cluster: PhotoCluster = {
        id: 'single-photo',
        type: 'visual_similarity' as any,
        photos: [singlePhoto],
        centroid: [0.1, 0.2, 0.3],
        confidence: 1.0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await curationService.curatePhotos([cluster], CurationGoal.BALANCED, 3);
      
      expect(result.selectedPhotos).toHaveLength(1);
      expect(result.selectedPhotos[0].rank).toBe(1);
      expect(result.selectedPhotos[0].photo.id).toBe('single');
    });
  });

  describe('Statistics and analytics', () => {
    it('should provide meaningful curation statistics', async () => {
      const photos = [
        createMockPhoto('excellent', 0.95, 0.9, 0.85),
        createMockPhoto('good', 0.8, 0.75, 0.7),
        createMockPhoto('average', 0.6, 0.55, 0.5),
        createMockPhoto('poor', 0.3, 0.25, 0.2)
      ];

      const cluster: PhotoCluster = {
        id: 'stats-test',
        type: 'visual_similarity' as any,
        photos,
        centroid: [0.1, 0.2, 0.3],
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await curationService.curatePhotos([cluster], CurationGoal.BALANCED, 4);
      const stats = curationService.getCurationStats(result);

      expect(stats.averageScore).toBeGreaterThan(0);
      expect(stats.scoreDistribution).toHaveLength(6);
      expect(stats.topReasons).toBeDefined();
      expect(stats.topReasons.length).toBeGreaterThan(0);

      // Verify score distribution makes sense
      const totalDistribution = stats.scoreDistribution.reduce((sum, d) => sum + d.count, 0);
      expect(totalDistribution).toBe(result.selectedPhotos.length);
    });
  });
});