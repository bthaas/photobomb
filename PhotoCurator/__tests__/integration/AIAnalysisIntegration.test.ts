import { AIAnalysisEngine } from '../../src/services/ai/AIAnalysisEngine';
import { AIService } from '../../src/services/ai/AIService';
import { Photo, SyncStatus } from '../../src/types';

// Mock TensorFlow.js for integration tests
jest.mock('@tensorflow/tfjs', () => ({
  zeros: jest.fn().mockReturnValue({
    dispose: jest.fn(),
    shape: [224, 224, 3],
    data: jest.fn().mockResolvedValue(new Float32Array(Array(150528).fill(0.5))),
  }),
  expandDims: jest.fn().mockReturnValue({
    dispose: jest.fn(),
    shape: [1, 224, 224, 3],
    data: jest.fn().mockResolvedValue(new Float32Array(Array(150528).fill(0.5))),
  }),
  div: jest.fn().mockReturnValue({
    dispose: jest.fn(),
    shape: [224, 224, 3],
    data: jest.fn().mockResolvedValue(new Float32Array(Array(150528).fill(0.5))),
  }),
  image: {
    resizeBilinear: jest.fn().mockReturnValue({
      dispose: jest.fn(),
      shape: [224, 224, 3],
      data: jest.fn().mockResolvedValue(new Float32Array(Array(150528).fill(0.5))),
    }),
  },
  mean: jest.fn().mockReturnValue({
    dispose: jest.fn(),
    data: jest.fn().mockResolvedValue(new Float32Array([0.5])),
  }),
  conv2d: jest.fn().mockReturnValue({
    dispose: jest.fn(),
    data: jest.fn().mockResolvedValue(new Float32Array([0.1])),
  }),
  tensor4d: jest.fn().mockReturnValue({
    dispose: jest.fn(),
  }),
  moments: jest.fn().mockReturnValue({
    variance: {
      dispose: jest.fn(),
      data: jest.fn().mockResolvedValue(new Float32Array([100])),
    },
  }),
  split: jest.fn().mockReturnValue([
    { dispose: jest.fn(), data: jest.fn().mockResolvedValue(new Float32Array([0.5])) },
    { dispose: jest.fn(), data: jest.fn().mockResolvedValue(new Float32Array([0.5])) },
    { dispose: jest.fn(), data: jest.fn().mockResolvedValue(new Float32Array([0.5])) },
  ]),
  avgPool: jest.fn().mockReturnValue({
    dispose: jest.fn(),
    data: jest.fn().mockResolvedValue(new Float32Array([0.5])),
  }),
  sub: jest.fn().mockReturnValue({
    dispose: jest.fn(),
    data: jest.fn().mockResolvedValue(new Float32Array([0.1])),
  }),
  abs: jest.fn().mockReturnValue({
    dispose: jest.fn(),
    data: jest.fn().mockResolvedValue(new Float32Array([0.1])),
  }),
  slice: jest.fn().mockReturnValue({
    dispose: jest.fn(),
    shape: [100, 100, 3],
    data: jest.fn().mockResolvedValue(new Float32Array(Array(30000).fill(0.5))),
  }),
  reverse: jest.fn().mockReturnValue({
    dispose: jest.fn(),
    data: jest.fn().mockResolvedValue(new Float32Array([0.1])),
  }),
  pad: jest.fn().mockReturnValue({
    dispose: jest.fn(),
    shape: [224, 224, 3],
    data: jest.fn().mockResolvedValue(new Float32Array(Array(150528).fill(0.5))),
  }),
  reshape: jest.fn().mockReturnValue({
    dispose: jest.fn(),
    data: jest.fn().mockResolvedValue(new Float32Array([0.5, 0.6, 0.7])),
  }),
}));

// Mock AIService
jest.mock('../../src/services/ai/AIService');

describe('AIAnalysisEngine Integration Tests', () => {
  let analysisEngine: AIAnalysisEngine;
  let mockAIService: jest.Mocked<AIService>;

  const mockPhoto: Photo = {
    id: 'integration-test-photo',
    uri: 'file://test-photo.jpg',
    metadata: {
      width: 1920,
      height: 1080,
      fileSize: 2048000,
      format: 'jpeg',
      timestamp: new Date('2023-01-01T12:00:00Z'),
    },
    syncStatus: SyncStatus.LOCAL_ONLY,
    createdAt: new Date('2023-01-01T12:00:00Z'),
    updatedAt: new Date('2023-01-01T12:00:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup AIService mock
    mockAIService = {
      loadModel: jest.fn().mockResolvedValue({ success: true }),
      getModel: jest.fn().mockReturnValue({
        predict: jest.fn().mockReturnValue({
          dispose: jest.fn(),
          data: jest.fn().mockResolvedValue(new Float32Array(Array(512).fill(0.5))),
        }),
      }),
    } as any;

    (AIService.getInstance as jest.Mock).mockReturnValue(mockAIService);
    
    analysisEngine = AIAnalysisEngine.getInstance();
  });

  describe('Full Photo Analysis Pipeline', () => {
    it('should complete full analysis pipeline successfully', async () => {
      const progressSteps: string[] = [];
      const progressCallback = (progress: any) => {
        progressSteps.push(progress.stage);
      };

      const result = await analysisEngine.analyzePhoto(
        mockPhoto,
        {
          includeFeatures: true,
          includeQuality: true,
          includeComposition: true,
          includeContent: true,
          includeFaces: true,
        },
        progressCallback
      );

      // Verify all analysis components completed
      expect(result.features).toBeDefined();
      expect(result.qualityScore).toBeDefined();
      expect(result.compositionScore).toBeDefined();
      expect(result.contentScore).toBeDefined();
      expect(result.faces).toBeDefined();

      // Verify progress tracking
      expect(progressSteps).toEqual([
        'Extracting features',
        'Analyzing quality',
        'Analyzing composition',
        'Analyzing content',
        'Detecting faces',
      ]);

      // Verify feature extraction results
      expect(result.features!.embedding).toHaveLength(512);
      expect(result.features!.dominantColors).toHaveLength(5);
      expect(Array.isArray(result.features!.objects)).toBe(true);
      expect(Array.isArray(result.features!.scenes)).toBe(true);

      // Verify quality scores are normalized
      const qualityMetrics = Object.values(result.qualityScore!);
      qualityMetrics.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });

      // Verify composition scores are normalized
      const compositionMetrics = Object.values(result.compositionScore!);
      compositionMetrics.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });

      // Verify content scores are normalized
      const contentMetrics = Object.values(result.contentScore!);
      contentMetrics.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });

    it('should handle partial analysis when some models fail', async () => {
      // Simulate face detection model failure
      mockAIService.getModel.mockImplementation((modelName: string) => {
        if (modelName === 'face-detection') {
          return null;
        }
        return {
          predict: jest.fn().mockReturnValue({
            dispose: jest.fn(),
            data: jest.fn().mockResolvedValue(new Float32Array(Array(512).fill(0.5))),
          }),
        };
      });

      const result = await analysisEngine.analyzePhoto(mockPhoto, {
        includeFeatures: true,
        includeFaces: true,
      });

      expect(result.features).toBeDefined();
      
      // Face detection should fail but not crash the entire analysis
      await expect(analysisEngine.detectFaces({} as any))
        .rejects.toThrow('Face detection model not loaded');
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();
      const analysisPromises = [];

      // Run multiple analyses concurrently
      for (let i = 0; i < 5; i++) {
        analysisPromises.push(
          analysisEngine.analyzePhoto(mockPhoto, {
            includeFeatures: true,
            includeQuality: true,
          })
        );
      }

      const results = await Promise.all(analysisPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All analyses should complete
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.features).toBeDefined();
        expect(result.qualityScore).toBeDefined();
      });

      // Should complete within reasonable time (adjust threshold as needed)
      expect(totalTime).toBeLessThan(10000); // 10 seconds
    });
  });

  describe('Feature Extraction Integration', () => {
    it('should extract consistent features for the same image', async () => {
      const result1 = await analysisEngine.analyzePhoto(mockPhoto, {
        includeFeatures: true,
      });

      const result2 = await analysisEngine.analyzePhoto(mockPhoto, {
        includeFeatures: true,
      });

      expect(result1.features!.embedding).toEqual(result2.features!.embedding);
      expect(result1.features!.dominantColors).toHaveLength(
        result2.features!.dominantColors.length
      );
    });

    it('should extract valid color information', async () => {
      const result = await analysisEngine.analyzePhoto(mockPhoto, {
        includeFeatures: true,
      });

      const colors = result.features!.dominantColors;
      expect(colors).toHaveLength(5);

      colors.forEach(color => {
        expect(color.r).toBeGreaterThanOrEqual(0);
        expect(color.r).toBeLessThanOrEqual(255);
        expect(color.g).toBeGreaterThanOrEqual(0);
        expect(color.g).toBeLessThanOrEqual(255);
        expect(color.b).toBeGreaterThanOrEqual(0);
        expect(color.b).toBeLessThanOrEqual(255);
        expect(color.hex).toMatch(/^#[0-9a-f]{6}$/i);
        expect(color.percentage).toBeGreaterThan(0);
      });
    });
  });

  describe('Quality Analysis Integration', () => {
    it('should provide comprehensive quality metrics', async () => {
      const result = await analysisEngine.analyzePhoto(mockPhoto, {
        includeQuality: true,
      });

      const quality = result.qualityScore!;

      // Verify all quality metrics are present and valid
      expect(quality.overall).toBeGreaterThanOrEqual(0);
      expect(quality.overall).toBeLessThanOrEqual(1);
      expect(quality.sharpness).toBeGreaterThanOrEqual(0);
      expect(quality.sharpness).toBeLessThanOrEqual(1);
      expect(quality.exposure).toBeGreaterThanOrEqual(0);
      expect(quality.exposure).toBeLessThanOrEqual(1);
      expect(quality.colorBalance).toBeGreaterThanOrEqual(0);
      expect(quality.colorBalance).toBeLessThanOrEqual(1);
      expect(quality.noise).toBeGreaterThanOrEqual(0);
      expect(quality.noise).toBeLessThanOrEqual(1);

      // Overall score should be influenced by individual metrics
      const expectedOverall = (
        quality.sharpness * 0.3 +
        quality.exposure * 0.25 +
        quality.colorBalance * 0.25 +
        (1 - quality.noise) * 0.2
      );
      expect(Math.abs(quality.overall - expectedOverall)).toBeLessThan(0.01);
    });
  });

  describe('Composition Analysis Integration', () => {
    it('should provide comprehensive composition metrics', async () => {
      const result = await analysisEngine.analyzePhoto(mockPhoto, {
        includeComposition: true,
      });

      const composition = result.compositionScore!;

      // Verify all composition metrics are present and valid
      expect(composition.overall).toBeGreaterThanOrEqual(0);
      expect(composition.overall).toBeLessThanOrEqual(1);
      expect(composition.ruleOfThirds).toBeGreaterThanOrEqual(0);
      expect(composition.ruleOfThirds).toBeLessThanOrEqual(1);
      expect(composition.leadingLines).toBeGreaterThanOrEqual(0);
      expect(composition.leadingLines).toBeLessThanOrEqual(1);
      expect(composition.symmetry).toBeGreaterThanOrEqual(0);
      expect(composition.symmetry).toBeLessThanOrEqual(1);
      expect(composition.subjectPlacement).toBeGreaterThanOrEqual(0);
      expect(composition.subjectPlacement).toBeLessThanOrEqual(1);

      // Overall score should be influenced by individual metrics
      const expectedOverall = (
        composition.ruleOfThirds * 0.3 +
        composition.leadingLines * 0.2 +
        composition.symmetry * 0.2 +
        composition.subjectPlacement * 0.3
      );
      expect(Math.abs(composition.overall - expectedOverall)).toBeLessThan(0.01);
    });
  });

  describe('Content Analysis Integration', () => {
    it('should provide comprehensive content metrics', async () => {
      const result = await analysisEngine.analyzePhoto(mockPhoto, {
        includeContent: true,
      });

      const content = result.contentScore!;

      // Verify all content metrics are present and valid
      expect(content.overall).toBeGreaterThanOrEqual(0);
      expect(content.overall).toBeLessThanOrEqual(1);
      expect(content.faceQuality).toBeGreaterThanOrEqual(0);
      expect(content.faceQuality).toBeLessThanOrEqual(1);
      expect(content.emotionalSentiment).toBeGreaterThanOrEqual(0);
      expect(content.emotionalSentiment).toBeLessThanOrEqual(1);
      expect(content.interestingness).toBeGreaterThanOrEqual(0);
      expect(content.interestingness).toBeLessThanOrEqual(1);

      // Overall score should be influenced by individual metrics
      const expectedOverall = (
        content.faceQuality * 0.4 +
        content.emotionalSentiment * 0.3 +
        content.interestingness * 0.3
      );
      expect(Math.abs(content.overall - expectedOverall)).toBeLessThan(0.01);
    });
  });

  describe('Face Detection Integration', () => {
    it('should detect and analyze faces correctly', async () => {
      const result = await analysisEngine.analyzePhoto(mockPhoto, {
        includeFaces: true,
      });

      const faces = result.faces!;
      expect(Array.isArray(faces)).toBe(true);

      if (faces.length > 0) {
        const face = faces[0];
        
        // Verify face structure
        expect(face.id).toBeDefined();
        expect(face.boundingBox).toBeDefined();
        expect(face.landmarks).toBeDefined();
        expect(face.embedding).toBeDefined();
        expect(face.confidence).toBeGreaterThanOrEqual(0);
        expect(face.confidence).toBeLessThanOrEqual(1);

        // Verify bounding box
        expect(face.boundingBox.x).toBeGreaterThanOrEqual(0);
        expect(face.boundingBox.y).toBeGreaterThanOrEqual(0);
        expect(face.boundingBox.width).toBeGreaterThan(0);
        expect(face.boundingBox.height).toBeGreaterThan(0);

        // Verify landmarks
        expect(face.landmarks.leftEye).toBeDefined();
        expect(face.landmarks.rightEye).toBeDefined();
        expect(face.landmarks.nose).toBeDefined();
        expect(face.landmarks.leftMouth).toBeDefined();
        expect(face.landmarks.rightMouth).toBeDefined();

        // Verify embedding
        expect(Array.isArray(face.embedding)).toBe(true);
        expect(face.embedding.length).toBeGreaterThan(0);

        // Verify attributes
        if (face.attributes) {
          if (face.attributes.smile !== undefined) {
            expect(face.attributes.smile).toBeGreaterThanOrEqual(0);
            expect(face.attributes.smile).toBeLessThanOrEqual(1);
          }
          if (face.attributes.eyesOpen !== undefined) {
            expect(face.attributes.eyesOpen).toBeGreaterThanOrEqual(0);
            expect(face.attributes.eyesOpen).toBeLessThanOrEqual(1);
          }
        }
      }
    });
  });

  describe('Error Recovery Integration', () => {
    it('should recover gracefully from model loading failures', async () => {
      // Simulate intermittent model loading failure
      let callCount = 0;
      mockAIService.loadModel.mockImplementation(async (modelName: string) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Network error');
        }
        return { success: true };
      });

      // Should eventually succeed after retry
      const result = await analysisEngine.analyzePhoto(mockPhoto, {
        includeFeatures: true,
      });

      expect(result.features).toBeDefined();
      expect(mockAIService.loadModel).toHaveBeenCalledTimes(2);
    });

    it('should handle memory pressure gracefully', async () => {
      // Simulate memory pressure by making tensor operations fail occasionally
      let operationCount = 0;
      const originalMean = require('@tensorflow/tfjs').mean;
      
      require('@tensorflow/tfjs').mean = jest.fn().mockImplementation((...args) => {
        operationCount++;
        if (operationCount % 10 === 0) {
          throw new Error('Out of memory');
        }
        return originalMean(...args);
      });

      // Should handle memory errors without crashing
      try {
        await analysisEngine.analyzePhoto(mockPhoto);
      } catch (error) {
        expect(error.message).toContain('Out of memory');
      }

      // Restore original implementation
      require('@tensorflow/tfjs').mean = originalMean;
    });
  });

  describe('Performance Integration', () => {
    it('should complete analysis within reasonable time limits', async () => {
      const startTime = Date.now();

      await analysisEngine.analyzePhoto(mockPhoto, {
        includeFeatures: true,
        includeQuality: true,
        includeComposition: true,
        includeContent: true,
        includeFaces: true,
      });

      const endTime = Date.now();
      const analysisTime = endTime - startTime;

      // Should complete within 5 seconds (adjust based on actual performance)
      expect(analysisTime).toBeLessThan(5000);
    });

    it('should handle batch processing efficiently', async () => {
      const photos = Array(3).fill(mockPhoto).map((photo, index) => ({
        ...photo,
        id: `batch-photo-${index}`,
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        photos.map(photo => 
          analysisEngine.analyzePhoto(photo, {
            includeFeatures: true,
            includeQuality: true,
          })
        )
      );
      const endTime = Date.now();

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.features).toBeDefined();
        expect(result.qualityScore).toBeDefined();
      });

      // Batch processing should be reasonably efficient
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(10000); // 10 seconds for 3 photos
    });
  });
});