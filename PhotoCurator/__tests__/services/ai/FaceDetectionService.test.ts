import * as tf from '@tensorflow/tfjs';
import { FaceDetectionService } from '../../../src/services/ai/FaceDetectionService';
import { AIService } from '../../../src/services/ai/AIService';
import { Face } from '../../../src/types';

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs');
const mockTf = tf as jest.Mocked<typeof tf>;

// Mock AIService
jest.mock('../../../src/services/ai/AIService');
const mockAIService = AIService as jest.MockedClass<typeof AIService>;

describe('FaceDetectionService', () => {
  let faceDetectionService: FaceDetectionService;
  let mockAIServiceInstance: jest.Mocked<AIService>;
  let mockModel: jest.Mocked<tf.GraphModel>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock AI service instance
    mockAIServiceInstance = {
      loadModel: jest.fn(),
      getModel: jest.fn(),
    } as any;
    
    mockAIService.getInstance.mockReturnValue(mockAIServiceInstance);
    
    // Setup mock model
    mockModel = {
      predict: jest.fn(),
    } as any;
    
    mockAIServiceInstance.getModel.mockReturnValue(mockModel);
    
    // Setup TensorFlow mocks
    mockTf.image = {
      resizeBilinear: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    } as any;
    
    mockTf.div = jest.fn().mockReturnValue({ dispose: jest.fn() });
    mockTf.expandDims = jest.fn().mockReturnValue({ dispose: jest.fn() });
    mockTf.slice = jest.fn().mockReturnValue({ dispose: jest.fn() });
    mockTf.sub = jest.fn().mockReturnValue({ dispose: jest.fn() });
    
    // Create service instance
    faceDetectionService = FaceDetectionService.getInstance();
  });

  describe('detectFaces', () => {
    it('should detect faces in an image tensor', async () => {
      // Setup
      const mockImageTensor = { shape: [480, 640, 3] } as tf.Tensor;
      const mockPreprocessed = { dispose: jest.fn() } as any;
      const mockDetections = [
        { data: jest.fn().mockResolvedValue(new Float32Array([0.1, 0.2, 0.3, 0.4])), dispose: jest.fn() },
        { data: jest.fn().mockResolvedValue(new Float32Array([0.9])), dispose: jest.fn() },
        { data: jest.fn().mockResolvedValue(new Float32Array([1])), dispose: jest.fn() },
        { dataSync: jest.fn().mockReturnValue([1]), dispose: jest.fn() }
      ];

      mockTf.image.resizeBilinear.mockReturnValue(mockPreprocessed);
      mockTf.div.mockReturnValue(mockPreprocessed);
      mockTf.expandDims.mockReturnValue(mockPreprocessed);
      mockModel.predict.mockReturnValue(mockDetections);

      // Execute
      const faces = await faceDetectionService.detectFaces(mockImageTensor);

      // Verify
      expect(mockAIServiceInstance.loadModel).toHaveBeenCalledWith('face-detection');
      expect(mockModel.predict).toHaveBeenCalledWith(mockPreprocessed);
      expect(faces).toHaveLength(1);
      expect(faces[0]).toMatchObject({
        confidence: 0.9,
        boundingBox: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number)
        })
      });
    });

    it('should handle detection errors gracefully', async () => {
      // Setup
      const mockImageTensor = { shape: [480, 640, 3] } as tf.Tensor;
      mockAIServiceInstance.loadModel.mockRejectedValue(new Error('Model load failed'));

      // Execute & Verify
      await expect(faceDetectionService.detectFaces(mockImageTensor)).rejects.toThrow('Model load failed');
    });

    it('should filter faces below confidence threshold', async () => {
      // Setup
      const mockImageTensor = { shape: [480, 640, 3] } as tf.Tensor;
      const mockPreprocessed = { dispose: jest.fn() } as any;
      const mockDetections = [
        { data: jest.fn().mockResolvedValue(new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8])), dispose: jest.fn() },
        { data: jest.fn().mockResolvedValue(new Float32Array([0.3, 0.8])), dispose: jest.fn() }, // One below threshold
        { data: jest.fn().mockResolvedValue(new Float32Array([1, 1])), dispose: jest.fn() },
        { dataSync: jest.fn().mockReturnValue([2]), dispose: jest.fn() }
      ];

      mockTf.image.resizeBilinear.mockReturnValue(mockPreprocessed);
      mockTf.div.mockReturnValue(mockPreprocessed);
      mockTf.expandDims.mockReturnValue(mockPreprocessed);
      mockModel.predict.mockReturnValue(mockDetections);

      // Execute
      const faces = await faceDetectionService.detectFaces(mockImageTensor, { minConfidence: 0.5 });

      // Verify - should only return one face (confidence 0.8)
      expect(faces).toHaveLength(1);
      expect(faces[0].confidence).toBe(0.8);
    });
  });

  describe('extractFaceEmbeddings', () => {
    it('should extract embeddings for faces', async () => {
      // Setup
      const mockImageTensor = { shape: [480, 640, 3] } as tf.Tensor;
      const mockFaces: Face[] = [{
        id: 'face1',
        boundingBox: { x: 100, y: 100, width: 50, height: 50 },
        landmarks: {
          leftEye: { x: 0, y: 0 },
          rightEye: { x: 0, y: 0 },
          nose: { x: 0, y: 0 },
          leftMouth: { x: 0, y: 0 },
          rightMouth: { x: 0, y: 0 }
        },
        embedding: [],
        confidence: 0.9,
        attributes: {}
      }];

      const mockFaceRegion = { dispose: jest.fn() } as any;
      const mockPreprocessed = { dispose: jest.fn() } as any;
      const mockEmbeddingTensor = { 
        data: jest.fn().mockResolvedValue(new Float32Array(128).fill(0.5)),
        dispose: jest.fn() 
      } as any;

      mockTf.slice.mockReturnValue(mockFaceRegion);
      mockTf.image.resizeBilinear.mockReturnValue(mockPreprocessed);
      mockTf.sub.mockReturnValue(mockPreprocessed);
      mockTf.div.mockReturnValue(mockPreprocessed);
      mockTf.expandDims.mockReturnValue(mockPreprocessed);
      mockModel.predict.mockReturnValue(mockEmbeddingTensor);

      // Execute
      const facesWithEmbeddings = await faceDetectionService.extractFaceEmbeddings(mockFaces, mockImageTensor);

      // Verify
      expect(mockAIServiceInstance.loadModel).toHaveBeenCalledWith('face-embedding');
      expect(facesWithEmbeddings).toHaveLength(1);
      expect(facesWithEmbeddings[0].embedding).toHaveLength(128);
    });
  });

  describe('compareFaceEmbeddings', () => {
    it('should calculate cosine similarity between embeddings', () => {
      // Setup
      const embedding1 = [1, 0, 0, 0];
      const embedding2 = [1, 0, 0, 0];
      const embedding3 = [0, 1, 0, 0];

      // Execute & Verify
      const similarity1 = faceDetectionService.compareFaceEmbeddings(embedding1, embedding2);
      const similarity2 = faceDetectionService.compareFaceEmbeddings(embedding1, embedding3);

      expect(similarity1).toBe(1); // Identical embeddings
      expect(similarity2).toBe(0.5); // Orthogonal embeddings
    });

    it('should handle zero magnitude embeddings', () => {
      // Setup
      const embedding1 = [0, 0, 0, 0];
      const embedding2 = [1, 0, 0, 0];

      // Execute & Verify
      const similarity = faceDetectionService.compareFaceEmbeddings(embedding1, embedding2);
      expect(similarity).toBe(0);
    });

    it('should throw error for mismatched embedding lengths', () => {
      // Setup
      const embedding1 = [1, 0, 0];
      const embedding2 = [1, 0, 0, 0];

      // Execute & Verify
      expect(() => faceDetectionService.compareFaceEmbeddings(embedding1, embedding2))
        .toThrow('Face embeddings must have the same length');
    });
  });

  describe('findSimilarFaces', () => {
    it('should find faces above similarity threshold', () => {
      // Setup
      const targetFace: Face = {
        id: 'target',
        boundingBox: { x: 0, y: 0, width: 50, height: 50 },
        landmarks: {
          leftEye: { x: 0, y: 0 },
          rightEye: { x: 0, y: 0 },
          nose: { x: 0, y: 0 },
          leftMouth: { x: 0, y: 0 },
          rightMouth: { x: 0, y: 0 }
        },
        embedding: [1, 0, 0, 0],
        confidence: 0.9,
        attributes: {}
      };

      const candidateFaces: Face[] = [
        {
          ...targetFace,
          id: 'similar',
          embedding: [0.9, 0.1, 0, 0] // Similar
        },
        {
          ...targetFace,
          id: 'different',
          embedding: [0, 1, 0, 0] // Different
        }
      ];

      // Execute
      const similarFaces = faceDetectionService.findSimilarFaces(targetFace, candidateFaces, 0.7);

      // Verify
      expect(similarFaces).toHaveLength(1);
      expect(similarFaces[0].face.id).toBe('similar');
      expect(similarFaces[0].similarity).toBeGreaterThan(0.7);
    });

    it('should sort results by similarity', () => {
      // Setup
      const targetFace: Face = {
        id: 'target',
        boundingBox: { x: 0, y: 0, width: 50, height: 50 },
        landmarks: {
          leftEye: { x: 0, y: 0 },
          rightEye: { x: 0, y: 0 },
          nose: { x: 0, y: 0 },
          leftMouth: { x: 0, y: 0 },
          rightMouth: { x: 0, y: 0 }
        },
        embedding: [1, 0, 0, 0],
        confidence: 0.9,
        attributes: {}
      };

      const candidateFaces: Face[] = [
        {
          ...targetFace,
          id: 'less_similar',
          embedding: [0.8, 0.2, 0, 0]
        },
        {
          ...targetFace,
          id: 'more_similar',
          embedding: [0.95, 0.05, 0, 0]
        }
      ];

      // Execute
      const similarFaces = faceDetectionService.findSimilarFaces(targetFace, candidateFaces, 0.6);

      // Verify
      expect(similarFaces).toHaveLength(2);
      expect(similarFaces[0].face.id).toBe('more_similar');
      expect(similarFaces[1].face.id).toBe('less_similar');
      expect(similarFaces[0].similarity).toBeGreaterThan(similarFaces[1].similarity);
    });
  });
});