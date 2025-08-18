import * as tf from '@tensorflow/tfjs';
import { AIAnalysisEngine } from '../../../src/services/ai/AIAnalysisEngine';
import { Photo, SyncStatus } from '../../../src/types';

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs', () => ({
  zeros: jest.fn(),
  expandDims: jest.fn(),
  div: jest.fn(),
  image: {
    resizeBilinear: jest.fn(),
  },
  mean: jest.fn(),
  conv2d: jest.fn(),
  tensor4d: jest.fn(),
  moments: jest.fn(),
  split: jest.fn(),
  avgPool: jest.fn(),
  sub: jest.fn(),
  abs: jest.fn(),
  slice: jest.fn(),
  reverse: jest.fn(),
  pad: jest.fn(),
  reshape: jest.fn(),
}));

// Mock AIService
jest.mock('../../../src/services/ai/AIService', () => ({
  AIService: {
    getInstance: jest.fn(() => ({
      loadModel: jest.fn().mockResolvedValue({ success: true }),
      getModel: jest.fn().mockReturnValue({
        predict: jest.fn().mockReturnValue({
          dispose: jest.fn(),
          data: jest.fn().mockResolvedValue(new Float32Array(Array(512).fill(0.5))),
        }),
      }),
    })),
  },
}));

describe('AIAnalysisEngine - Core Functionality', () => {
  let analysisEngine: AIAnalysisEngine;
  let mockTensor: any;

  const mockPhoto: Photo = {
    id: 'test-photo-1',
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
    
    // Setup mock tensor
    mockTensor = {
      dispose: jest.fn(),
      shape: [224, 224, 3],
      data: jest.fn().mockResolvedValue(new Float32Array(Array(512).fill(0.5))),
    };

    // Setup TensorFlow mocks with realistic returns
    (tf.zeros as jest.Mock).mockReturnValue(mockTensor);
    (tf.expandDims as jest.Mock).mockReturnValue(mockTensor);
    (tf.div as jest.Mock).mockReturnValue(mockTensor);
    (tf.image.resizeBilinear as jest.Mock).mockReturnValue(mockTensor);
    (tf.mean as jest.Mock).mockReturnValue({
      dispose: jest.fn(),
      data: jest.fn().mockResolvedValue(new Float32Array([0.5])),
    });
    (tf.conv2d as jest.Mock).mockReturnValue({
      dispose: jest.fn(),
      data: jest.fn().mockResolvedValue(new Float32Array([0.1])),
    });
    (tf.tensor4d as jest.Mock).mockReturnValue({ dispose: jest.fn() });
    (tf.moments as jest.Mock).mockReturnValue({
      variance: {
        dispose: jest.fn(),
        data: jest.fn().mockResolvedValue(new Float32Array([100])),
      },
    });
    (tf.split as jest.Mock).mockReturnValue([
      { dispose: jest.fn(), data: jest.fn().mockResolvedValue(new Float32Array([0.5])) },
      { dispose: jest.fn(), data: jest.fn().mockResolvedValue(new Float32Array([0.5])) },
      { dispose: jest.fn(), data: jest.fn().mockResolvedValue(new Float32Array([0.5])) },
    ]);
    (tf.avgPool as jest.Mock).mockReturnValue({
      dispose: jest.fn(),
      data: jest.fn().mockResolvedValue(new Float32Array([0.5])),
    });
    (tf.sub as jest.Mock).mockReturnValue({
      dispose: jest.fn(),
      data: jest.fn().mockResolvedValue(new Float32Array([0.1])),
    });
    (tf.abs as jest.Mock).mockReturnValue({
      dispose: jest.fn(),
      data: jest.fn().mockResolvedValue(new Float32Array([0.1])),
    });
    (tf.slice as jest.Mock).mockReturnValue({
      dispose: jest.fn(),
      shape: [100, 100, 3],
      data: jest.fn().mockResolvedValue(new Float32Array(Array(30000).fill(0.5))),
    });
    (tf.reverse as jest.Mock).mockReturnValue({
      dispose: jest.fn(),
      data: jest.fn().mockResolvedValue(new Float32Array([0.1])),
    });
    (tf.pad as jest.Mock).mockReturnValue(mockTensor);
    (tf.reshape as jest.Mock).mockReturnValue({
      dispose: jest.fn(),
      data: jest.fn().mockResolvedValue(new Float32Array(Array(7500).fill(0.5))),
    });
    
    analysisEngine = AIAnalysisEngine.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AIAnalysisEngine.getInstance();
      const instance2 = AIAnalysisEngine.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Image Preprocessing', () => {
    it('should preprocess image with default options', () => {
      const result = analysisEngine.preprocessImage(mockTensor);
      
      expect(tf.image.resizeBilinear).toHaveBeenCalledWith(mockTensor, [224, 224]);
      expect(tf.div).toHaveBeenCalled();
      expect(tf.expandDims).toHaveBeenCalled();
    });

    it('should preprocess image with custom target size', () => {
      analysisEngine.preprocessImage(mockTensor, { targetSize: [512, 512] });
      
      expect(tf.image.resizeBilinear).toHaveBeenCalledWith(expect.any(Object), [512, 512]);
    });

    it('should skip normalization when disabled', () => {
      const divSpy = tf.div as jest.Mock;
      divSpy.mockClear();
      
      analysisEngine.preprocessImage(mockTensor, { normalize: false });
      
      expect(divSpy).not.toHaveBeenCalledWith(expect.any(Object), 255.0);
    });

    it('should handle center crop option', () => {
      analysisEngine.preprocessImage(mockTensor, { centerCrop: true });
      
      expect(tf.slice).toHaveBeenCalled();
    });

    it('should handle aspect ratio preservation', () => {
      analysisEngine.preprocessImage(mockTensor, { maintainAspectRatio: true });
      
      expect(tf.pad).toHaveBeenCalled();
    });
  });

  describe('Quality Analysis', () => {
    it('should analyze photo quality and return normalized scores', async () => {
      const qualityScore = await analysisEngine.analyzeQuality(mockTensor);

      expect(qualityScore).toHaveProperty('overall');
      expect(qualityScore).toHaveProperty('sharpness');
      expect(qualityScore).toHaveProperty('exposure');
      expect(qualityScore).toHaveProperty('colorBalance');
      expect(qualityScore).toHaveProperty('noise');

      // All scores should be between 0 and 1
      Object.values(qualityScore).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });

    it('should calculate sharpness using edge detection', async () => {
      await analysisEngine.analyzeQuality(mockTensor);
      
      expect(tf.mean).toHaveBeenCalled();
      expect(tf.conv2d).toHaveBeenCalled();
      expect(tf.moments).toHaveBeenCalled();
    });

    it('should calculate exposure from brightness', async () => {
      const qualityScore = await analysisEngine.analyzeQuality(mockTensor);
      
      expect(qualityScore.exposure).toBeGreaterThanOrEqual(0);
      expect(qualityScore.exposure).toBeLessThanOrEqual(1);
    });

    it('should calculate color balance from RGB channels', async () => {
      await analysisEngine.analyzeQuality(mockTensor);
      
      expect(tf.split).toHaveBeenCalledWith(mockTensor, 3, -1);
    });

    it('should estimate noise from high-frequency content', async () => {
      await analysisEngine.analyzeQuality(mockTensor);
      
      expect(tf.avgPool).toHaveBeenCalled();
      expect(tf.sub).toHaveBeenCalled();
      expect(tf.abs).toHaveBeenCalled();
    });
  });

  describe('Composition Analysis', () => {
    it('should analyze composition and return normalized scores', async () => {
      const compositionScore = await analysisEngine.analyzeComposition(mockTensor);

      expect(compositionScore).toHaveProperty('overall');
      expect(compositionScore).toHaveProperty('ruleOfThirds');
      expect(compositionScore).toHaveProperty('leadingLines');
      expect(compositionScore).toHaveProperty('symmetry');
      expect(compositionScore).toHaveProperty('subjectPlacement');

      // All scores should be between 0 and 1
      Object.values(compositionScore).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });

    it('should calculate rule of thirds using intersection analysis', async () => {
      await analysisEngine.analyzeComposition(mockTensor);
      
      expect(tf.slice).toHaveBeenCalled();
      expect(tf.moments).toHaveBeenCalled();
    });

    it('should detect leading lines using edge detection', async () => {
      await analysisEngine.analyzeComposition(mockTensor);
      
      expect(tf.conv2d).toHaveBeenCalled();
    });

    it('should calculate symmetry using image flipping', async () => {
      await analysisEngine.analyzeComposition(mockTensor);
      
      expect(tf.reverse).toHaveBeenCalledWith(mockTensor, [1]);
    });
  });

  describe('Content Analysis', () => {
    it('should analyze content and return normalized scores', async () => {
      const contentScore = await analysisEngine.analyzeContent(mockTensor);

      expect(contentScore).toHaveProperty('overall');
      expect(contentScore).toHaveProperty('faceQuality');
      expect(contentScore).toHaveProperty('emotionalSentiment');
      expect(contentScore).toHaveProperty('interestingness');

      // All scores should be between 0 and 1
      Object.values(contentScore).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });

    it('should calculate interestingness from image variance', async () => {
      await analysisEngine.analyzeContent(mockTensor);
      
      expect(tf.moments).toHaveBeenCalledWith(mockTensor);
    });
  });

  describe('Full Photo Analysis', () => {
    it('should perform comprehensive analysis with progress tracking', async () => {
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

      // Should have all analysis results
      expect(result.features).toBeDefined();
      expect(result.qualityScore).toBeDefined();
      expect(result.compositionScore).toBeDefined();
      expect(result.contentScore).toBeDefined();
      expect(result.faces).toBeDefined();

      // Should track progress through all stages
      expect(progressSteps).toEqual([
        'Extracting features',
        'Analyzing quality',
        'Analyzing composition',
        'Analyzing content',
        'Detecting faces',
      ]);
    });

    it('should perform selective analysis based on options', async () => {
      const result = await analysisEngine.analyzePhoto(mockPhoto, {
        includeFeatures: false,
        includeQuality: true,
        includeComposition: false,
        includeContent: false,
        includeFaces: false,
      });

      expect(result.features).toBeUndefined();
      expect(result.qualityScore).toBeDefined();
      expect(result.compositionScore).toBeUndefined();
      expect(result.contentScore).toBeUndefined();
      expect(result.faces).toBeUndefined();
    });

    it('should handle analysis with default options', async () => {
      const result = await analysisEngine.analyzePhoto(mockPhoto);

      // Default should include all analysis types
      expect(result.features).toBeDefined();
      expect(result.qualityScore).toBeDefined();
      expect(result.compositionScore).toBeDefined();
      expect(result.contentScore).toBeDefined();
      expect(result.faces).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle tensor operation failures gracefully', async () => {
      (tf.mean as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Tensor operation failed');
      });

      await expect(analysisEngine.analyzeQuality(mockTensor))
        .rejects.toThrow('Tensor operation failed');
    });

    it('should dispose tensors even when operations fail', async () => {
      const disposableTensor = {
        dispose: jest.fn(),
        data: jest.fn().mockResolvedValue(new Float32Array([100])),
      };

      // Mock a tensor operation that will be disposed
      (tf.mean as jest.Mock).mockReturnValueOnce(disposableTensor);

      await analysisEngine.analyzeQuality(mockTensor);

      expect(disposableTensor.dispose).toHaveBeenCalled();
    });
  });

  describe('Memory Management', () => {
    it('should dispose intermediate tensors during processing', async () => {
      const intermediateTensor = {
        dispose: jest.fn(),
        data: jest.fn().mockResolvedValue(new Float32Array([0.5])),
      };

      (tf.mean as jest.Mock).mockReturnValue(intermediateTensor);

      await analysisEngine.analyzeQuality(mockTensor);

      expect(intermediateTensor.dispose).toHaveBeenCalled();
    });

    it('should clean up tensors in finally block', async () => {
      const loadImageTensorSpy = jest.spyOn(analysisEngine as any, 'loadImageTensor');
      const disposableTensor = {
        ...mockTensor,
        dispose: jest.fn(),
      };
      loadImageTensorSpy.mockResolvedValue(disposableTensor);

      await analysisEngine.analyzePhoto(mockPhoto);

      expect(disposableTensor.dispose).toHaveBeenCalled();
      loadImageTensorSpy.mockRestore();
    });
  });

  describe('Score Calculations', () => {
    it('should calculate overall quality score as weighted average', async () => {
      const qualityScore = await analysisEngine.analyzeQuality(mockTensor);

      const expectedOverall = (
        qualityScore.sharpness * 0.3 +
        qualityScore.exposure * 0.25 +
        qualityScore.colorBalance * 0.25 +
        (1 - qualityScore.noise) * 0.2
      );

      expect(Math.abs(qualityScore.overall - expectedOverall)).toBeLessThan(0.01);
    });

    it('should calculate overall composition score as weighted average', async () => {
      const compositionScore = await analysisEngine.analyzeComposition(mockTensor);

      const expectedOverall = (
        compositionScore.ruleOfThirds * 0.3 +
        compositionScore.leadingLines * 0.2 +
        compositionScore.symmetry * 0.2 +
        compositionScore.subjectPlacement * 0.3
      );

      expect(Math.abs(compositionScore.overall - expectedOverall)).toBeLessThan(0.01);
    });

    it('should calculate overall content score as weighted average', async () => {
      const contentScore = await analysisEngine.analyzeContent(mockTensor);

      const expectedOverall = (
        contentScore.faceQuality * 0.4 +
        contentScore.emotionalSentiment * 0.3 +
        contentScore.interestingness * 0.3
      );

      expect(Math.abs(contentScore.overall - expectedOverall)).toBeLessThan(0.01);
    });
  });
});