/**
 * CurationEngine tests
 */

import { CurationEngine } from '../../../src/services/curation/CurationEngine';
import {
  Photo,
  PhotoCluster,
  CurationGoal,
  CurationWeights,
  UserFeedback,
  QualityScore,
  CompositionScore,
  ContentScore,
  Face,
  ImageFeatures
} from '../../../src/types';

// Mock data helpers
const createMockPhoto = (
  id: string,
  qualityScore?: QualityScore,
  compositionScore?: CompositionScore,
  contentScore?: ContentScore,
  faces?: Face[],
  features?: ImageFeatures
): Photo => ({
  id,
  uri: `file://photo-${id}.jpg`,
  metadata: {
    width: 1920,
    height: 1080,
    fileSize: 2048000,
    format: 'jpeg',
    timestamp: new Date()
  },
  qualityScore,
  compositionScore,
  contentScore,
  faces,
  features,
  syncStatus: 'local_only' as any,
  createdAt: new Date(),
  updatedAt: new Date()
});

const createMockCluster = (photos: Photo[]): PhotoCluster => ({
  id: 'test-cluster',
  type: 'visual_similarity' as any,
  photos,
  centroid: [0.1, 0.2, 0.3],
  confidence: 0.8,
  createdAt: new Date(),
  updatedAt: new Date()
});

describe('CurationEngine', () => {
  let curationEngine: CurationEngine;

  beforeEach(() => {
    curationEngine = new CurationEngine();
  });

  describe('rankPhotos', () => {
    it('should rank photos based on overall scores', async () => {
      const highQualityPhoto = createMockPhoto('high', 
        { overall: 0.9, sharpness: 0.9, exposure: 0.9, colorBalance: 0.9, noise: 0.1 },
        { overall: 0.8, ruleOfThirds: 0.8, leadingLines: 0.7, symmetry: 0.8, subjectPlacement: 0.9 },
        { overall: 0.7, faceQuality: 0.8, emotionalSentiment: 0.7, interestingness: 0.6 }
      );

      const lowQualityPhoto = createMockPhoto('low',
        { overall: 0.3, sharpness: 0.3, exposure: 0.4, colorBalance: 0.3, noise: 0.7 },
        { overall: 0.4, ruleOfThirds: 0.4, leadingLines: 0.3, symmetry: 0.5, subjectPlacement: 0.4 },
        { overall: 0.3, faceQuality: 0.3, emotionalSentiment: 0.3, interestingness: 0.3 }
      );

      const cluster = createMockCluster([highQualityPhoto, lowQualityPhoto]);
      const rankedPhotos = await curationEngine.rankPhotos(cluster, CurationGoal.BALANCED);

      expect(rankedPhotos).toHaveLength(2);
      expect(rankedPhotos[0].photo.id).toBe('high');
      expect(rankedPhotos[0].rank).toBe(1);
      expect(rankedPhotos[1].photo.id).toBe('low');
      expect(rankedPhotos[1].rank).toBe(2);
      expect(rankedPhotos[0].score).toBeGreaterThan(rankedPhotos[1].score);
    });

    it('should apply different weights for different curation goals', async () => {
      const technicalPhoto = createMockPhoto('technical',
        { overall: 0.95, sharpness: 0.95, exposure: 0.95, colorBalance: 0.95, noise: 0.05 },
        { overall: 0.5, ruleOfThirds: 0.5, leadingLines: 0.5, symmetry: 0.5, subjectPlacement: 0.5 },
        { overall: 0.3, faceQuality: 0.3, emotionalSentiment: 0.3, interestingness: 0.3 }
      );

      const creativePhoto = createMockPhoto('creative',
        { overall: 0.6, sharpness: 0.6, exposure: 0.6, colorBalance: 0.6, noise: 0.4 },
        { overall: 0.95, ruleOfThirds: 0.9, leadingLines: 0.95, symmetry: 0.9, subjectPlacement: 0.95 },
        { overall: 0.7, faceQuality: 0.7, emotionalSentiment: 0.7, interestingness: 0.8 }
      );

      const cluster = createMockCluster([technicalPhoto, creativePhoto]);

      // Test BEST_TECHNICAL goal (should favor technical photo)
      const technicalRanking = await curationEngine.rankPhotos(cluster, CurationGoal.BEST_TECHNICAL);
      expect(technicalRanking[0].photo.id).toBe('technical');

      // Test MOST_CREATIVE goal (should favor creative photo)
      const creativeRanking = await curationEngine.rankPhotos(cluster, CurationGoal.MOST_CREATIVE);
      expect(creativeRanking[0].photo.id).toBe('creative');
    });

    it('should include reasoning for photo rankings', async () => {
      const photo = createMockPhoto('test',
        { overall: 0.9, sharpness: 0.9, exposure: 0.9, colorBalance: 0.9, noise: 0.1 },
        { overall: 0.8, ruleOfThirds: 0.8, leadingLines: 0.7, symmetry: 0.8, subjectPlacement: 0.9 },
        { overall: 0.7, faceQuality: 0.8, emotionalSentiment: 0.7, interestingness: 0.6 }
      );

      const cluster = createMockCluster([photo]);
      const rankedPhotos = await curationEngine.rankPhotos(cluster, CurationGoal.BALANCED);

      expect(rankedPhotos[0].reasoning).toBeDefined();
      expect(rankedPhotos[0].reasoning.length).toBeGreaterThan(0);
      expect(rankedPhotos[0].reasoning[0]).toContain('quality');
    });

    it('should calculate score breakdown correctly', async () => {
      const photo = createMockPhoto('test',
        { overall: 0.8, sharpness: 0.8, exposure: 0.8, colorBalance: 0.8, noise: 0.2 },
        { overall: 0.7, ruleOfThirds: 0.7, leadingLines: 0.7, symmetry: 0.7, subjectPlacement: 0.7 },
        { overall: 0.6, faceQuality: 0.6, emotionalSentiment: 0.6, interestingness: 0.6 }
      );

      const cluster = createMockCluster([photo]);
      const rankedPhotos = await curationEngine.rankPhotos(cluster, CurationGoal.BALANCED);

      const breakdown = rankedPhotos[0].scoreBreakdown;
      expect(breakdown.quality).toBe(0.8);
      expect(breakdown.composition).toBe(0.7);
      expect(breakdown.content).toBe(0.6);
      expect(breakdown.uniqueness).toBeDefined();
      expect(breakdown.emotional).toBeDefined();
    });
  });

  describe('selectBestShots', () => {
    it('should select the specified number of best shots', async () => {
      const photos = [
        createMockPhoto('1', { overall: 0.9, sharpness: 0.9, exposure: 0.9, colorBalance: 0.9, noise: 0.1 }),
        createMockPhoto('2', { overall: 0.8, sharpness: 0.8, exposure: 0.8, colorBalance: 0.8, noise: 0.2 }),
        createMockPhoto('3', { overall: 0.7, sharpness: 0.7, exposure: 0.7, colorBalance: 0.7, noise: 0.3 }),
        createMockPhoto('4', { overall: 0.6, sharpness: 0.6, exposure: 0.6, colorBalance: 0.6, noise: 0.4 })
      ];

      const cluster = createMockCluster(photos);
      const bestShots = await curationEngine.selectBestShots(cluster, 2, CurationGoal.BALANCED);

      expect(bestShots).toHaveLength(2);
      expect(bestShots[0].id).toBe('1');
      expect(bestShots[1].id).toBe('2');
    });

    it('should handle empty clusters gracefully', async () => {
      const cluster = createMockCluster([]);
      const bestShots = await curationEngine.selectBestShots(cluster, 3, CurationGoal.BALANCED);

      expect(bestShots).toHaveLength(0);
    });
  });

  describe('learnFromUserFeedback', () => {
    it('should store user feedback', async () => {
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

      await expect(curationEngine.learnFromUserFeedback(feedback)).resolves.not.toThrow();
    });

    it('should handle multiple feedback entries', async () => {
      const feedbacks: UserFeedback[] = [
        {
          photoId: 'photo1',
          action: 'keep',
          context: { curationGoal: CurationGoal.BALANCED, originalRank: 1, originalScore: 0.8 },
          timestamp: new Date()
        },
        {
          photoId: 'photo2',
          action: 'discard',
          context: { curationGoal: CurationGoal.BALANCED, originalRank: 2, originalScore: 0.6 },
          timestamp: new Date()
        }
      ];

      for (const feedback of feedbacks) {
        await expect(curationEngine.learnFromUserFeedback(feedback)).resolves.not.toThrow();
      }
    });
  });

  describe('updateCurationWeights', () => {
    it('should update weights for a specific goal', async () => {
      const customWeights: CurationWeights = {
        qualityWeight: 0.5,
        compositionWeight: 0.3,
        contentWeight: 0.1,
        uniquenessWeight: 0.05,
        emotionalWeight: 0.05
      };

      await curationEngine.updateCurationWeights(CurationGoal.BEST_TECHNICAL, customWeights);
      const retrievedWeights = curationEngine.getCurationWeights(CurationGoal.BEST_TECHNICAL);

      expect(retrievedWeights).toEqual(customWeights);
    });
  });

  describe('getCurationWeights', () => {
    it('should return default weights for each goal', () => {
      const balancedWeights = curationEngine.getCurationWeights(CurationGoal.BALANCED);
      const technicalWeights = curationEngine.getCurationWeights(CurationGoal.BEST_TECHNICAL);

      expect(balancedWeights.qualityWeight).toBe(0.25);
      expect(technicalWeights.qualityWeight).toBe(0.5);
      expect(balancedWeights).not.toEqual(technicalWeights);
    });
  });

  describe('uniqueness scoring', () => {
    it('should calculate uniqueness based on visual similarity', async () => {
      const uniquePhoto = createMockPhoto('unique', undefined, undefined, undefined, undefined, {
        embedding: [1, 0, 0, 0, 0],
        dominantColors: [],
        objects: [],
        scenes: []
      });

      const similarPhoto1 = createMockPhoto('similar1', undefined, undefined, undefined, undefined, {
        embedding: [0, 1, 0, 0, 0],
        dominantColors: [],
        objects: [],
        scenes: []
      });

      const similarPhoto2 = createMockPhoto('similar2', undefined, undefined, undefined, undefined, {
        embedding: [0, 0.9, 0.1, 0, 0],
        dominantColors: [],
        objects: [],
        scenes: []
      });

      const cluster = createMockCluster([uniquePhoto, similarPhoto1, similarPhoto2]);
      const rankedPhotos = await curationEngine.rankPhotos(cluster, CurationGoal.BALANCED);

      // The unique photo should have higher uniqueness score
      const uniqueRanking = rankedPhotos.find(rp => rp.photo.id === 'unique');
      const similarRanking = rankedPhotos.find(rp => rp.photo.id === 'similar1');

      expect(uniqueRanking?.scoreBreakdown.uniqueness).toBeGreaterThan(
        similarRanking?.scoreBreakdown.uniqueness || 0
      );
    });
  });

  describe('emotional scoring', () => {
    it('should calculate emotional score from face attributes', async () => {
      const happyFace: Face = {
        id: 'face1',
        boundingBox: { x: 100, y: 100, width: 200, height: 200 },
        landmarks: {
          leftEye: { x: 150, y: 150 },
          rightEye: { x: 250, y: 150 },
          nose: { x: 200, y: 180 },
          leftMouth: { x: 180, y: 220 },
          rightMouth: { x: 220, y: 220 }
        },
        embedding: [0.1, 0.2, 0.3],
        confidence: 0.9,
        attributes: {
          smile: 0.9,
          eyesOpen: 0.95,
          emotion: 'happy'
        }
      };

      const sadFace: Face = {
        ...happyFace,
        id: 'face2',
        attributes: {
          smile: 0.1,
          eyesOpen: 0.8,
          emotion: 'sad'
        }
      };

      const happyPhoto = createMockPhoto('happy', undefined, undefined, undefined, [happyFace]);
      const sadPhoto = createMockPhoto('sad', undefined, undefined, undefined, [sadFace]);

      const cluster = createMockCluster([happyPhoto, sadPhoto]);
      const rankedPhotos = await curationEngine.rankPhotos(cluster, CurationGoal.MOST_EMOTIONAL);

      const happyRanking = rankedPhotos.find(rp => rp.photo.id === 'happy');
      const sadRanking = rankedPhotos.find(rp => rp.photo.id === 'sad');

      expect(happyRanking?.scoreBreakdown.emotional).toBeGreaterThan(
        sadRanking?.scoreBreakdown.emotional || 0
      );
    });

    it('should handle photos without faces', async () => {
      const photoWithoutFaces = createMockPhoto('no-faces');
      const cluster = createMockCluster([photoWithoutFaces]);
      const rankedPhotos = await curationEngine.rankPhotos(cluster, CurationGoal.BALANCED);

      expect(rankedPhotos[0].scoreBreakdown.emotional).toBe(0.5); // Default neutral score
    });
  });

  describe('portrait-specific curation', () => {
    it('should prioritize photos with good face quality for portrait goal', async () => {
      const goodPortrait = createMockPhoto('good-portrait',
        { overall: 0.7, sharpness: 0.7, exposure: 0.7, colorBalance: 0.7, noise: 0.3 },
        { overall: 0.6, ruleOfThirds: 0.6, leadingLines: 0.6, symmetry: 0.6, subjectPlacement: 0.6 },
        { overall: 0.9, faceQuality: 0.95, emotionalSentiment: 0.9, interestingness: 0.8 },
        [{
          id: 'face1',
          boundingBox: { x: 100, y: 100, width: 200, height: 200 },
          landmarks: {
            leftEye: { x: 150, y: 150 },
            rightEye: { x: 250, y: 150 },
            nose: { x: 200, y: 180 },
            leftMouth: { x: 180, y: 220 },
            rightMouth: { x: 220, y: 220 }
          },
          embedding: [0.1, 0.2, 0.3],
          confidence: 0.9,
          attributes: { smile: 0.8, eyesOpen: 0.9 }
        }]
      );

      const scenicPhoto = createMockPhoto('scenic',
        { overall: 0.9, sharpness: 0.9, exposure: 0.9, colorBalance: 0.9, noise: 0.1 },
        { overall: 0.9, ruleOfThirds: 0.9, leadingLines: 0.9, symmetry: 0.9, subjectPlacement: 0.9 },
        { overall: 0.3, faceQuality: 0.0, emotionalSentiment: 0.3, interestingness: 0.6 }
      );

      const cluster = createMockCluster([goodPortrait, scenicPhoto]);
      const portraitRanking = await curationEngine.rankPhotos(cluster, CurationGoal.BEST_PORTRAITS);

      expect(portraitRanking[0].photo.id).toBe('good-portrait');
    });
  });

  describe('error handling', () => {
    it('should handle photos without analysis scores', async () => {
      const photoWithoutScores = createMockPhoto('no-scores');
      const cluster = createMockCluster([photoWithoutScores]);
      
      const rankedPhotos = await curationEngine.rankPhotos(cluster, CurationGoal.BALANCED);
      
      expect(rankedPhotos).toHaveLength(1);
      expect(rankedPhotos[0].scoreBreakdown.quality).toBe(0.5); // Default neutral score
      expect(rankedPhotos[0].scoreBreakdown.composition).toBe(0.5);
      expect(rankedPhotos[0].scoreBreakdown.content).toBe(0.5);
    });

    it('should handle single photo clusters', async () => {
      const singlePhoto = createMockPhoto('single',
        { overall: 0.8, sharpness: 0.8, exposure: 0.8, colorBalance: 0.8, noise: 0.2 }
      );
      
      const cluster = createMockCluster([singlePhoto]);
      const rankedPhotos = await curationEngine.rankPhotos(cluster, CurationGoal.BALANCED);
      
      expect(rankedPhotos).toHaveLength(1);
      expect(rankedPhotos[0].rank).toBe(1);
      expect(rankedPhotos[0].scoreBreakdown.uniqueness).toBe(0.5); // Default for single photo
    });
  });
});