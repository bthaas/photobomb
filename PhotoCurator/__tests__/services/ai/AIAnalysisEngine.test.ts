import * as tf from '@tensorflow/tfjs';
import { AIAnalysisEngine, AnalysisOptions, PreprocessingOptions } from '../../../src/services/ai/AIAnalysisEngine';
import { AIService } from '../../../src/services/ai/AIService';
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
jest.mock('../../../src/services/ai/AIService');

describe('AIAnalysisEngine', () => {
  let analysisEngine: AIAnalysisEngine;
  let mockAIService: jest.Mocked<AIService>;
  let mockTensor: jest.Mocked<tf.Tensor>;

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
    
    // Setup mock tensor with more realistic data
    mockTensor = {
      dispose: jest.fn(),
      shape: [224, 224, 3],
      data: jest.fn().mockResolvedValue(new Float32Array(Array(512).fill(0.5))),
    } as any;

    // Setup TensorFlow mocks
    (tf.zeros as jest.Mock).mockReturnValue(mockTensor);
    (tf.expandDims as jest.Mock).mockReturnValue(mockTensor);
    (tf.div as jest.Mock).mockReturnValue(mockTensor);
    (tf.image.resizeBilinear as jest.Mock).mockReturnValue(mockTensor);
    (tf.mean as jest.Mock).mockReturnValue(mockTensor);
    (tf.conv2d as jest.Mock).mockReturnValue(mockTensor);
    (tf.tensor4d as jest.Mock).mockReturnValue(mockTensor);
    (tf.moments as jest.Mock).mockReturnValue({ variance: mockTensor });
    (tf.split as jest.Mock).mockReturnValue([mockTensor, mockTensor, mockTensor]);
    (tf.avgPool as jest.Mock).mockReturnValue(mockTensor);
    (tf.sub as jest.Mock).mockReturnValue(mockTensor);
    (tf.abs as jest.Mock).mockReturnValue(mockTensor);
    (tf.slice as jest.Mock).mockReturnValue(mockTensor);
    (tf.reverse as jest.Mock).mockReturnValue(mockTensor);
    (tf.pad as jest.Mock).mockReturnValue(mockTensor);
    
    // Mock reshape to return data that can be used for color extraction
    (tf.reshape as jest.Mock).mockReturnValue({
      dispose: jest.fn(),
      data: jest.fn().mockResolvedValue(new Float32Array(Array(7500).fill(0.5))), // 50*50*3
    });

    // Setup AIService mock
    mockAIService = {
      loadModel: jest.fn().mockResolvedValue({ success: true }),
      getModel: jest.fn().mockReturnValue({
        predict: jest.fn().mockReturnValue(mockTensor),
      }),
    } as any;

    (AIService.getInstance as jest.Mock).mockReturnValue(mockAIService);
    
    analysisEngine = AIAnalysisEngine.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AIAnalysisEngine.getInstance();
      const instance2 = AIAnalysisEngine.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('analyzePhoto', () => {
    it('should perform comprehensive photo analysis with all options enabled', async () => {
      const options: AnalysisOptions = {
        includeFeatures: true,
        includeQuality: true,
        includeComposition: true,
        includeContent: true,
        includeFaces: true,
      };

      const progressCallback = jest.fn();
      const result = await analysisEngine.analyzePhoto(mockPhoto, options, progressCallback);

      expect(result).toHaveProperty('features');
      expect(result).toHaveProperty('qualityScore');
      expect(result).toHaveProperty('compositionScore');
      expect(result).toHaveProperty('contentScore');
      expect(result).toHaveProperty('faces');

      expect(progressCallback).toHaveBeenCalledTimes(5);
      expect(progressCallback).toHaveBeenCalledWith({
        stage: 'Extracting features',
        progress: 0,
        total: 5,
      });
    });

    it('should perform selective analysis based on options', async () => {
      const options: AnalysisOptions = {
        includeFeatures: true,
        includeQuality: false,
        includeComposition: false,
        includeContent: false,
        includeFaces: false,
      };

      const result = await analysisEngine.analyzePhoto(mockPhoto, options);

      expect(result).toHaveProperty('features');
      expect(result).not.toHaveProperty('qualityScore');
      expect(result).not.toHaveProperty('compositionScore');
      expect(result).not.toHaveProperty('contentScore');
      expect(result).not.toHaveProperty('faces');
    });

    it('should handle analysis errors gracefully', async () => {
      (tf.zeros as jest.Mock).mockImplementation(() => {
        throw new Error('TensorFlow error');
      });

      await expect(analysisEngine.analyzePhoto(mockPhoto)).rejects.toThrow('TensorFlow error');
    });

    it('should dispose tensors after analysis', async () => {
      await analysisEngine.analyzePhoto(mockPhoto);
      expect(mockTensor.dispose).toHaveBeenCalled();
    });
  });

  describe('extractFeatures', () => {
    it('should extract comprehensive image features', async () => {
      const features = await analysisEngine.extractFeatures(mockTensor);

      expect(features).toHaveProperty('embedding');
      expect(features).toHaveProperty('dominantColors');
      expect(features).toHaveProperty('objects');
      expect(features).toHaveProperty('scenes');

      expect(Array.isArray(features.embedding)).toBe(true);
      expect(Array.isArray(features.dominantColors)).toBe(true);
      expect(Array.isArray(features.objects)).toBe(true);
      expect(Array.isArray(features.scenes)).toBe(true);

      expect(mockAIService.loadModel).toHaveBeenCalledWith('feature-extraction');
      expect(mockAIService.getModel).toHaveBeenCalledWith('feature-extraction');
    });

    it('should throw error when feature extraction model is not loaded', async () => {
      mockAIService.getModel.mockReturnValueOnce(null);

      await expect(analysisEngine.extractFeatures(mockTensor))
        .rejects.toThrow('Feature extraction model not loaded');
      
      expect(mockAIService.loadModel).toHaveBeenCalledWith('feature-extraction');
    });

    it('should extract dominant colors correctly', async () => {
      const features = await analysisEngine.extractFeatures(mockTensor);

      expect(features.dominantColors).toHaveLength(5);
      features.dominantColors.forEach(color => {
        expect(color).toHaveProperty('r');
        expect(color).toHaveProperty('g');
        expect(color).toHaveProperty('b');
        expect(color).toHaveProperty('hex');
        expect(color).toHaveProperty('percentage');
        expect(color.hex).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe('analyzeQuality', () => {
    it('should analyze photo quality metrics', async () => {
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

    it('should calculate sharpness using Laplacian variance', async () => {
      const qualityScore = await analysisEngine.analyzeQuality(mockTensor);

      expect(tf.mean).toHaveBeenCalled();
      expect(tf.conv2d).toHaveBeenCalled();
      expect(tf.moments).toHaveBeenCalled();
      expect(qualityScore.sharpness).toBeGreaterThanOrEqual(0);
      expect(qualityScore.sharpness).toBeLessThanOrEqual(1);
    });

    it('should calculate exposure based on brightness', async () => {
      const qualityScore = await analysisEngine.analyzeQuality(mockTensor);

      expect(qualityScore.exposure).toBeGreaterThanOrEqual(0);
      expect(qualityScore.exposure).toBeLessThanOrEqual(1);
    });

    it('should calculate color balance from channel means', async () => {
      const qualityScore = await analysisEngine.analyzeQuality(mockTensor);

      expect(tf.split).toHaveBeenCalledWith(mockTensor, 3, -1);
      expect(qualityScore.colorBalance).toBeGreaterThanOrEqual(0);
      expect(qualityScore.colorBalance).toBeLessThanOrEqual(1);
    });

    it('should estimate noise from high-frequency content', async () => {
      const qualityScore = await analysisEngine.analyzeQuality(mockTensor);

      expect(tf.avgPool).toHaveBeenCalled();
      expect(tf.sub).toHaveBeenCalled();
      expect(tf.abs).toHaveBeenCalled();
      expect(qualityScore.noise).toBeGreaterThanOrEqual(0);
      expect(qualityScore.noise).toBeLessThanOrEqual(1);
    });
  });

  describe('analyzeComposition', () => {
    it('should analyze photo composition metrics', async () => {
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

    it('should calculate rule of thirds score', async () => {
      const compositionScore = await analysisEngine.analyzeComposition(mockTensor);

      expect(tf.slice).toHaveBeenCalled();
      expect(tf.moments).toHaveBeenCalled();
      expect(compositionScore.ruleOfThirds).toBeGreaterThanOrEqual(0);
      expect(compositionScore.ruleOfThirds).toBeLessThanOrEqual(1);
    });

    it('should detect leading lines using edge detection', async () => {
      const compositionScore = await analysisEngine.analyzeComposition(mockTensor);

      expect(tf.conv2d).toHaveBeenCalled();
      expect(compositionScore.leadingLines).toBeGreaterThanOrEqual(0);
      expect(compositionScore.leadingLines).toBeLessThanOrEqual(1);
    });

    it('should calculate symmetry score', async () => {
      const compositionScore = await analysisEngine.analyzeComposition(mockTensor);

      expect(tf.reverse).toHaveBeenCalledWith(mockTensor, [1]);
      expect(compositionScore.symmetry).toBeGreaterThanOrEqual(0);
      expect(compositionScore.symmetry).toBeLessThanOrEqual(1);
    });
  });

  describe('analyzeContent', () => {
    it('should analyze photo content metrics', async () => {
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
      const contentScore = await analysisEngine.analyzeContent(mockTensor);

      expect(tf.moments).toHaveBeenCalledWith(mockTensor);
      expect(contentScore.interestingness).toBeGreaterThanOrEqual(0);
      expect(contentScore.interestingness).toBeLessThanOrEqual(1);
    });
  });

  describe('detectFaces', () => {
    it('should detect faces in the image', async () => {
      const faces = await analysisEngine.detectFaces(mockTensor);

      expect(Array.isArray(faces)).toBe(true);
      expect(mockAIService.loadModel).toHaveBeenCalledWith('face-detection');
      expect(mockAIService.getModel).toHaveBeenCalledWith('face-detection');

      if (faces.length > 0) {
        const face = faces[0];
        expect(face).toHaveProperty('id');
        expect(face).toHaveProperty('boundingBox');
        expect(face).toHaveProperty('landmarks');
        expect(face).toHaveProperty('embedding');
        expect(face).toHaveProperty('confidence');
        expect(face).toHaveProperty('attributes');

        expect(face.boundingBox).toHaveProperty('x');
        expect(face.boundingBox).toHaveProperty('y');
        expect(face.boundingBox).toHaveProperty('width');
        expect(face.boundingBox).toHaveProperty('height');

        expect(face.landmarks).toHaveProperty('leftEye');
        expect(face.landmarks).toHaveProperty('rightEye');
        expect(face.landmarks).toHaveProperty('nose');
        expect(face.landmarks).toHaveProperty('leftMouth');
        expect(face.landmarks).toHaveProperty('rightMouth');
      }
    });

    it('should throw error when face detection model is not loaded', async () => {
      mockAIService.getModel.mockReturnValueOnce(null);

      await expect(analysisEngine.detectFaces(mockTensor))
        .rejects.toThrow('Face detection model not loaded');
      
      expect(mockAIService.loadModel).toHaveBeenCalledWith('face-detection');
    });
  });

  describe('preprocessImage', () => {
    it('should preprocess image with default options', () => {
      const preprocessed = analysisEngine.preprocessImage(mockTensor);

      expect(tf.image.resizeBilinear).toHaveBeenCalledWith(mockTensor, [224, 224]);
      expect(tf.div).toHaveBeenCalledWith(expect.any(Object), 255.0);
      expect(tf.expandDims).toHaveBeenCalled();
    });

    it('should preprocess image with custom options', () => {
      const options: PreprocessingOptions = {
        targetSize: [512, 512],
        normalize: false,
        centerCrop: true,
        maintainAspectRatio: false,
      };

      const preprocessed = analysisEngine.preprocessImage(mockTensor, options);

      expect(tf.slice).toHaveBeenCalled(); // For center crop
      expect(tf.image.resizeBilinear).toHaveBeenCalledWith(expect.any(Object), [512, 512]);
    });

    it('should maintain aspect ratio when requested', () => {
      const options: PreprocessingOptions = {
        targetSize: [224, 224],
        maintainAspectRatio: true,
      };

      const preprocessed = analysisEngine.preprocessImage(mockTensor, options);

      expect(tf.pad).toHaveBeenCalled(); // For padding after resize
    });

    it('should center crop when requested', () => {
      const options: PreprocessingOptions = {
        targetSize: [224, 224],
        centerCrop: true,
      };

      const preprocessed = analysisEngine.preprocessImage(mockTensor, options);

      expect(tf.slice).toHaveBeenCalled(); // For center cropping
    });

    it('should skip normalization when disabled', () => {
      const options: PreprocessingOptions = {
        normalize: false,
      };

      const preprocessed = analysisEngine.preprocessImage(mockTensor, options);

      expect(tf.div).not.toHaveBeenCalledWith(expect.any(Object), 255.0);
    });
  });

  describe('error handling', () => {
    it('should handle tensor disposal errors gracefully', async () => {
      // Mock the loadImageTensor to return a tensor that throws on dispose
      const disposingTensor = {
        ...mockTensor,
        dispose: jest.fn().mockImplementation(() => {
          throw new Error('Disposal error');
        }),
      };
      
      // Spy on the private method
      const loadImageTensorSpy = jest.spyOn(analysisEngine as any, 'loadImageTensor');
      loadImageTensorSpy.mockResolvedValue(disposingTensor);

      // Should not throw despite disposal error
      await expect(analysisEngine.analyzePhoto(mockPhoto)).resolves.toBeDefined();
      
      loadImageTensorSpy.mockRestore();
    });

    it('should handle model loading failures', async () => {
      mockAIService.loadModel.mockRejectedValueOnce(new Error('Model loading failed'));

      await expect(analysisEngine.extractFeatures(mockTensor))
        .rejects.toThrow('Model loading failed');
    });

    it('should handle tensor operation failures', async () => {
      (tf.mean as jest.Mock).mockImplementation(() => {
        throw new Error('Tensor operation failed');
      });

      await expect(analysisEngine.analyzeQuality(mockTensor))
        .rejects.toThrow('Tensor operation failed');
    });
  });

  describe('memory management', () => {
    it('should dispose intermediate tensors during processing', async () => {
      await analysisEngine.analyzeQuality(mockTensor);

      // Verify that dispose was called on intermediate tensors
      expect(mockTensor.dispose).toHaveBeenCalled();
    });

    it('should dispose tensors even when errors occur', async () => {
      // Create a tensor that will be disposed during processing
      const intermediateTensor = {
        dispose: jest.fn(),
        data: jest.fn().mockRejectedValue(new Error('Processing error')),
      };
      
      (tf.moments as jest.Mock).mockReturnValue({ variance: intermediateTensor });

      try {
        await analysisEngine.analyzeQuality(mockTensor);
      } catch (error) {
        // Expected to throw
      }

      expect(intermediateTensor.dispose).toHaveBeenCalled();
    });
  });
});