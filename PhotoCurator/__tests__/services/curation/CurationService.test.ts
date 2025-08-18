/**
 * CurationService tests
 */

import { CurationService } from '../../../src/services/curation/CurationService';
import {
  Photo,
  PhotoCluster,
  CurationGoal,
  CurationWeights,
  UserFeedback
} from '../../../src/types';

// Mock data helpers
const createMockPhoto = (id: string, score: number = 0.5): Photo => ({
  id,
  uri: `file://photo-${id}.jpg`,
  metadata: {
    width: 1920,
    height: 1080,
    fileSize: 2048000,
    format: 'jpeg',
    timestamp: new Date()
  },
  qualityScore: {
    overall: score,
    sharpness: score,
    exposure: score,
    colorBalance: score,
    noise: 1 - score
  },
  compositionScore: {
    overall: score,
    ruleOfThirds: score,
    leadingLines: score,
    symmetry: score,
    subjectPlacement: score
  },
  contentScore: {
    overall: score,
    faceQuality: score,
    emotionalSentiment: score,
    interestingness: score
  },
  syncStatus: 'local_only' as any,
  createdAt: new Date(),
  updatedAt: new Date()
});

const createMockCluster = (id: string, photos: Photo[]): PhotoCluster => ({
  id,
  type: 'visual_similarity' as any,
  photos,
  centroid: [0.1, 0.2, 0.3],
  confidence: 0.8,
  createdAt: new Date(),
  updatedAt: new Date()
});

describe('CurationService', () => {
  let curationService: CurationService;

  beforeEach(() => {
    curationService = new CurationService();
  });

  describe('curatePhotos', () => {
    it('should curate photos from multiple clusters', async () => {
      const cluster1 = createMockCluster('cluster1', [
        createMockPhoto('1a', 0.9),
        createMockPhoto('1b', 0.8),
        createMockPhoto('1c', 0.7),
        createMockPhoto('1d', 0.6)
      ]);

      const cluster2 = createMockCluster('cluster2', [
        createMockPhoto('2a', 0.85),
        createMockPhoto('2b', 0.75),
        createMockPhoto('2c', 0.65)
      ]);

      const result = await curationService.curatePhotos(
        [cluster1, cluster2],
        CurationGoal.BALANCED,
        2 // max 2 photos per cluster
      );

      expect(result.selectedPhotos).toHaveLength(4); // 2 from each cluster
      expect(result.totalPhotos).toBe(7); // Total photos in both clusters
      expect(result.goal).toBe(CurationGoal.BALANCED);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.weights).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);

      // Check that photos are globally ranked
      expect(result.selectedPhotos[0].rank).toBe(1);
      expect(result.selectedPhotos[1].rank).toBe(2);
      expect(result.selectedPhotos[2].rank).toBe(3);
      expect(result.selectedPhotos[3].rank).toBe(4);

      // Verify ranking order (highest scores first)
      for (let i = 0; i < result.selectedPhotos.length - 1; i++) {
        expect(result.selectedPhotos[i].score).toBeGreaterThanOrEqual(
          result.selectedPhotos[i + 1].score
        );
      }
    });

    it('should handle empty clusters', async () => {
      const emptyCluster = createMockCluster('empty', []);
      const nonEmptyCluster = createMockCluster('non-empty', [
        createMockPhoto('1', 0.8)
      ]);

      const result = await curationService.curatePhotos(
        [emptyCluster, nonEmptyCluster],
        CurationGoal.BALANCED,
        3
      );

      expect(result.selectedPhotos).toHaveLength(1);
      expect(result.totalPhotos).toBe(1);
    });

    it('should respect maxPhotosPerCluster parameter', async () => {
      const largeCluster = createMockCluster('large', [
        createMockPhoto('1', 0.9),
        createMockPhoto('2', 0.8),
        createMockPhoto('3', 0.7),
        createMockPhoto('4', 0.6),
        createMockPhoto('5', 0.5)
      ]);

      const result = await curationService.curatePhotos(
        [largeCluster],
        CurationGoal.BALANCED,
        2 // Only select 2 photos
      );

      expect(result.selectedPhotos).toHaveLength(2);
      expect(result.selectedPhotos[0].photo.id).toBe('1'); // Highest score
      expect(result.selectedPhotos[1].photo.id).toBe('2'); // Second highest
    });

    it('should apply custom weights when provided', async () => {
      const cluster = createMockCluster('test', [
        createMockPhoto('1', 0.8),
        createMockPhoto('2', 0.7)
      ]);

      const customWeights: CurationWeights = {
        qualityWeight: 0.8,
        compositionWeight: 0.1,
        contentWeight: 0.05,
        uniquenessWeight: 0.03,
        emotionalWeight: 0.02
      };

      const result = await curationService.curatePhotos(
        [cluster],
        CurationGoal.BALANCED,
        2,
        customWeights
      );

      expect(result.weights).toEqual(customWeights);
    });
  });

  describe('curateSingleCluster', () => {
    it('should curate photos from a single cluster', async () => {
      const cluster = createMockCluster('single', [
        createMockPhoto('1', 0.9),
        createMockPhoto('2', 0.8),
        createMockPhoto('3', 0.7),
        createMockPhoto('4', 0.6)
      ]);

      const result = await curationService.curateSingleCluster(
        cluster,
        CurationGoal.BALANCED,
        2
      );

      expect(result.selectedPhotos).toHaveLength(2);
      expect(result.totalPhotos).toBe(4);
      expect(result.selectedPhotos[0].photo.id).toBe('1');
      expect(result.selectedPhotos[1].photo.id).toBe('2');
    });

    it('should handle clusters with fewer photos than requested', async () => {
      const smallCluster = createMockCluster('small', [
        createMockPhoto('1', 0.8)
      ]);

      const result = await curationService.curateSingleCluster(
        smallCluster,
        CurationGoal.BALANCED,
        5 // Request more than available
      );

      expect(result.selectedPhotos).toHaveLength(1);
    });
  });

  describe('getBestShot', () => {
    it('should return the best photo from a cluster', async () => {
      const cluster = createMockCluster('test', [
        createMockPhoto('low', 0.3),
        createMockPhoto('high', 0.9),
        createMockPhoto('medium', 0.6)
      ]);

      const bestShot = await curationService.getBestShot(cluster, CurationGoal.BALANCED);

      expect(bestShot).not.toBeNull();
      expect(bestShot?.id).toBe('high');
    });

    it('should return null for empty clusters', async () => {
      const emptyCluster = createMockCluster('empty', []);
      const bestShot = await curationService.getBestShot(emptyCluster, CurationGoal.BALANCED);

      expect(bestShot).toBeNull();
    });
  });

  describe('comparePhotos', () => {
    it('should compare and rank provided photos', async () => {
      const photos = [
        createMockPhoto('low', 0.4),
        createMockPhoto('high', 0.9),
        createMockPhoto('medium', 0.7)
      ];

      const rankedPhotos = await curationService.comparePhotos(
        photos,
        CurationGoal.BALANCED
      );

      expect(rankedPhotos).toHaveLength(3);
      expect(rankedPhotos[0].photo.id).toBe('high');
      expect(rankedPhotos[1].photo.id).toBe('medium');
      expect(rankedPhotos[2].photo.id).toBe('low');

      // Check ranks are assigned correctly
      expect(rankedPhotos[0].rank).toBe(1);
      expect(rankedPhotos[1].rank).toBe(2);
      expect(rankedPhotos[2].rank).toBe(3);
    });

    it('should handle single photo comparison', async () => {
      const photos = [createMockPhoto('single', 0.8)];
      const rankedPhotos = await curationService.comparePhotos(
        photos,
        CurationGoal.BALANCED
      );

      expect(rankedPhotos).toHaveLength(1);
      expect(rankedPhotos[0].rank).toBe(1);
    });
  });

  describe('processFeedback', () => {
    it('should process user feedback without errors', async () => {
      const feedback: UserFeedback = {
        photoId: 'test-photo',
        action: 'keep',
        context: {
          curationGoal: CurationGoal.BALANCED,
          originalRank: 1,
          originalScore: 0.8
        },
        timestamp: new Date()
      };

      await expect(curationService.processFeedback(feedback)).resolves.not.toThrow();
    });
  });

  describe('getCurationWeights', () => {
    it('should return weights for different goals', () => {
      const balancedWeights = curationService.getCurationWeights(CurationGoal.BALANCED);
      const technicalWeights = curationService.getCurationWeights(CurationGoal.BEST_TECHNICAL);

      expect(balancedWeights).toBeDefined();
      expect(technicalWeights).toBeDefined();
      expect(balancedWeights).not.toEqual(technicalWeights);

      // Check that weights sum to approximately 1
      const balancedSum = Object.values(balancedWeights).reduce((sum, weight) => sum + weight, 0);
      expect(balancedSum).toBeCloseTo(1, 2);
    });
  });

  describe('updateCurationWeights', () => {
    it('should update weights for a specific goal', async () => {
      const customWeights: CurationWeights = {
        qualityWeight: 0.6,
        compositionWeight: 0.2,
        contentWeight: 0.1,
        uniquenessWeight: 0.05,
        emotionalWeight: 0.05
      };

      await curationService.updateCurationWeights(CurationGoal.BEST_TECHNICAL, customWeights);
      const retrievedWeights = curationService.getCurationWeights(CurationGoal.BEST_TECHNICAL);

      expect(retrievedWeights).toEqual(customWeights);
    });
  });

  describe('getCurationStats', () => {
    it('should calculate statistics for curation results', () => {
      const mockResult = {
        goal: CurationGoal.BALANCED,
        selectedPhotos: [
          {
            photo: createMockPhoto('1'),
            rank: 1,
            score: 0.9,
            scoreBreakdown: { quality: 0.9, composition: 0.8, content: 0.9, uniqueness: 0.8, emotional: 0.7 },
            reasoning: ['Excellent technical quality', 'Strong composition']
          },
          {
            photo: createMockPhoto('2'),
            rank: 2,
            score: 0.7,
            scoreBreakdown: { quality: 0.7, composition: 0.7, content: 0.7, uniqueness: 0.6, emotional: 0.8 },
            reasoning: ['Good overall quality', 'Nice emotional content']
          },
          {
            photo: createMockPhoto('3'),
            rank: 3,
            score: 0.5,
            scoreBreakdown: { quality: 0.5, composition: 0.5, content: 0.5, uniqueness: 0.4, emotional: 0.6 },
            reasoning: ['Standard photo quality']
          }
        ],
        totalPhotos: 10,
        processingTime: 1500,
        weights: {
          qualityWeight: 0.25,
          compositionWeight: 0.25,
          contentWeight: 0.25,
          uniquenessWeight: 0.15,
          emotionalWeight: 0.1
        },
        createdAt: new Date()
      };

      const stats = curationService.getCurationStats(mockResult);

      expect(stats.averageScore).toBeCloseTo(0.7, 1); // (0.9 + 0.7 + 0.5) / 3
      expect(stats.scoreDistribution).toHaveLength(6);
      expect(stats.topReasons).toContain('Excellent technical quality');
      expect(stats.topReasons.length).toBeLessThanOrEqual(5);

      // Check score distribution
      const highScoreRange = stats.scoreDistribution.find(d => d.range === '0.9-1.0');
      expect(highScoreRange?.count).toBe(1); // One photo with 0.9 score
    });

    it('should handle empty results', () => {
      const emptyResult = {
        goal: CurationGoal.BALANCED,
        selectedPhotos: [],
        totalPhotos: 0,
        processingTime: 100,
        weights: {
          qualityWeight: 0.25,
          compositionWeight: 0.25,
          contentWeight: 0.25,
          uniquenessWeight: 0.15,
          emotionalWeight: 0.1
        },
        createdAt: new Date()
      };

      const stats = curationService.getCurationStats(emptyResult);

      expect(stats.averageScore).toBeNaN(); // No photos to average
      expect(stats.scoreDistribution.every(d => d.count === 0)).toBe(true);
      expect(stats.topReasons).toHaveLength(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle a complete curation workflow', async () => {
      // Create test data
      const clusters = [
        createMockCluster('event1', [
          createMockPhoto('e1p1', 0.9),
          createMockPhoto('e1p2', 0.8),
          createMockPhoto('e1p3', 0.7)
        ]),
        createMockCluster('event2', [
          createMockPhoto('e2p1', 0.85),
          createMockPhoto('e2p2', 0.75)
        ])
      ];

      // Curate photos
      const result = await curationService.curatePhotos(
        clusters,
        CurationGoal.BALANCED,
        2
      );

      // Verify results
      expect(result.selectedPhotos).toHaveLength(4);
      expect(result.totalPhotos).toBe(5);

      // Get statistics
      const stats = curationService.getCurationStats(result);
      expect(stats.averageScore).toBeGreaterThan(0);

      // Process feedback
      const feedback: UserFeedback = {
        photoId: result.selectedPhotos[0].photo.id,
        action: 'favorite',
        context: {
          curationGoal: result.goal,
          originalRank: result.selectedPhotos[0].rank,
          originalScore: result.selectedPhotos[0].score
        },
        timestamp: new Date()
      };

      await expect(curationService.processFeedback(feedback)).resolves.not.toThrow();
    });
  });
});