import * as tf from '@tensorflow/tfjs';
import { FaceDetectionService } from '../../src/services/ai/FaceDetectionService';
import { FaceClusteringService } from '../../src/services/ai/FaceClusteringService';
import { PersonManagementService } from '../../src/services/ai/PersonManagementService';
import { AIService } from '../../src/services/ai/AIService';
import { Photo, Face, PersonCluster } from '../../src/types';

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs');
const mockTf = tf as jest.Mocked<typeof tf>;

// Mock AIService
jest.mock('../../src/services/ai/AIService');
const mockAIService = AIService as jest.MockedClass<typeof AIService>;

describe('Face Recognition Integration', () => {
  let faceDetectionService: FaceDetectionService;
  let faceClusteringService: FaceClusteringService;
  let personManagementService: PersonManagementService;
  let mockAIServiceInstance: jest.Mocked<AIService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock AI service
    mockAIServiceInstance = {
      loadModel: jest.fn().mockResolvedValue(undefined),
      getModel: jest.fn().mockReturnValue({
        predict: jest.fn()
      })
    } as any;
    
    mockAIService.getInstance.mockReturnValue(mockAIServiceInstance);
    
    // Setup TensorFlow mocks
    mockTf.image = { resizeBilinear: jest.fn().mockReturnValue({ dispose: jest.fn() }) } as any;
    mockTf.div = jest.fn().mockReturnValue({ dispose: jest.fn() });
    mockTf.sub = jest.fn().mockReturnValue({ dispose: jest.fn() });
    mockTf.expandDims = jest.fn().mockReturnValue({ dispose: jest.fn() });
    mockTf.slice = jest.fn().mockReturnValue({ dispose: jest.fn() });
    
    // Create service instances
    faceDetectionService = FaceDetectionService.getInstance();
    faceClusteringService = FaceClusteringService.getInstance();
    personManagementService = PersonManagementService.getInstance();
  });

  const createMockPhoto = (id: string): Photo => ({
    id,
    uri: `photo_${id}.jpg`,
    metadata: {
      width: 1920,
      height: 1080,
      fileSize: 1024000,
      format: 'jpg',
      timestamp: new Date()
    },
    syncStatus: 'local_only' as any,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const createMockImageTensor = (): tf.Tensor => ({
    shape: [1080, 1920, 3],
    dispose: jest.fn()
  } as any);

  describe('Complete Face Recognition Workflow', () => {
    it('should detect, cluster, and manage faces across multiple photos', async () => {
      // Setup mock data
      const photos = [
        createMockPhoto('photo1'),
        createMockPhoto('photo2'),
        createMockPhoto('photo3')
      ];

      const mockImageTensor = createMockImageTensor();
      
      // Mock face detection results
      const mockDetections = [
        { data: jest.fn().mockResolvedValue(new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8])), dispose: jest.fn() },
        { data: jest.fn().mockResolvedValue(new Float32Array([0.9, 0.8])), dispose: jest.fn() },
        { data: jest.fn().mockResolvedValue(new Float32Array([1, 1])), dispose: jest.fn() },
        { dataSync: jest.fn().mockReturnValue([2]), dispose: jest.fn() }
      ];

      // Mock embedding extraction
      const mockEmbeddingTensor = {
        data: jest.fn().mockResolvedValue(new Float32Array(128).fill(0.5)),
        dispose: jest.fn()
      };

      // Setup TensorFlow mocks
      const mockProcessed = { dispose: jest.fn() } as any;
      mockTf.image.resizeBilinear.mockReturnValue(mockProcessed);
      mockTf.div.mockReturnValue(mockProcessed);
      mockTf.sub.mockReturnValue(mockProcessed);
      mockTf.expandDims.mockReturnValue(mockProcessed);
      mockTf.slice.mockReturnValue(mockProcessed);

      const mockModel = mockAIServiceInstance.getModel('face-detection') as any;
      mockModel.predict
        .mockReturnValueOnce(mockDetections)
        .mockReturnValue(mockEmbeddingTensor);

      // Step 1: Detect faces in all photos
      const allFaces: Face[] = [];
      const photosWithFaces: Photo[] = [];

      for (const photo of photos) {
        const faces = await faceDetectionService.detectFaces(mockImageTensor, {
          minConfidence: 0.7,
          returnLandmarks: true,
          returnAttributes: true
        });

        // Simulate different people in different photos
        const modifiedFaces = faces.map((face, index) => ({
          ...face,
          id: `${photo.id}_face_${index}`,
          embedding: index === 0 ? 
            [1, 0, 0, 0, ...new Array(124).fill(0)] : // Person A
            [0, 1, 0, 0, ...new Array(124).fill(0)]   // Person B
        }));

        allFaces.push(...modifiedFaces);
        photosWithFaces.push({
          ...photo,
          faces: modifiedFaces
        });
      }

      // Verify face detection
      expect(allFaces.length).toBeGreaterThan(0);
      expect(allFaces.every(face => face.embedding.length === 128)).toBe(true);

      // Step 2: Cluster faces by similarity
      const clusteringResult = await faceClusteringService.clusterFaces(allFaces, {
        similarityThreshold: 0.6,
        minClusterSize: 1
      });

      // Verify clustering
      expect(clusteringResult.clusters.length).toBeGreaterThan(0);
      expect(clusteringResult.processingTime).toBeGreaterThan(0);

      // Step 3: Link clusters to photos
      const linkedClusters = faceClusteringService.linkClustersToPhotos(
        clusteringResult.clusters,
        photosWithFaces
      );

      // Verify linking
      expect(linkedClusters.every(cluster => cluster.photos.length > 0)).toBe(true);

      // Step 4: Label people
      const johnCluster = linkedClusters[0];
      const janeCluster = linkedClusters[1] || linkedClusters[0]; // Fallback if only one cluster

      await personManagementService.labelPerson(johnCluster.id, 'John Doe');
      if (janeCluster !== johnCluster) {
        await personManagementService.labelPerson(janeCluster.id, 'Jane Smith');
      }

      // Verify labeling
      const johnLabel = personManagementService.getPersonLabel(johnCluster.id);
      expect(johnLabel?.name).toBe('John Doe');

      // Step 5: Search and manage people
      const searchResults = personManagementService.searchPeople(linkedClusters, {
        sortBy: 'photoCount',
        sortOrder: 'desc'
      });

      // Verify search
      expect(searchResults.length).toBe(linkedClusters.length);

      // Step 6: Get statistics
      const stats = personManagementService.getPersonStats(linkedClusters);

      // Verify statistics
      expect(stats.totalPeople).toBe(linkedClusters.length);
      expect(stats.labeledPeople).toBeGreaterThan(0);
      expect(stats.totalFaces).toBe(allFaces.length);

      console.log('Face Recognition Integration Test Results:');
      console.log(`- Detected ${allFaces.length} faces across ${photos.length} photos`);
      console.log(`- Created ${clusteringResult.clusters.length} person clusters`);
      console.log(`- Labeled ${stats.labeledPeople} people`);
      console.log(`- Processing time: ${clusteringResult.processingTime}ms`);
    });

    it('should handle face clustering edge cases', async () => {
      // Test with no faces
      const emptyResult = await faceClusteringService.clusterFaces([], {
        minClusterSize: 2
      });

      expect(emptyResult.clusters).toHaveLength(0);
      expect(emptyResult.unclusteredFaces).toHaveLength(0);

      // Test with faces without embeddings
      const facesWithoutEmbeddings: Face[] = [{
        id: 'face1',
        boundingBox: { x: 0, y: 0, width: 50, height: 50 },
        landmarks: {
          leftEye: { x: 0, y: 0 },
          rightEye: { x: 0, y: 0 },
          nose: { x: 0, y: 0 },
          leftMouth: { x: 0, y: 0 },
          rightMouth: { x: 0, y: 0 }
        },
        embedding: [], // Empty embedding
        confidence: 0.9,
        attributes: {}
      }];

      const noEmbeddingResult = await faceClusteringService.clusterFaces(facesWithoutEmbeddings);
      expect(noEmbeddingResult.clusters).toHaveLength(0);
      expect(noEmbeddingResult.unclusteredFaces).toHaveLength(1);
    });

    it('should handle person management operations', async () => {
      // Create test clusters
      const clusters: PersonCluster[] = [
        {
          id: 'cluster1',
          faces: [{
            id: 'face1',
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
            attributes: { smile: 0.8, eyesOpen: 0.9 }
          }],
          photos: [],
          confidence: 0.9,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'cluster2',
          faces: [{
            id: 'face2',
            boundingBox: { x: 0, y: 0, width: 50, height: 50 },
            landmarks: {
              leftEye: { x: 0, y: 0 },
              rightEye: { x: 0, y: 0 },
              nose: { x: 0, y: 0 },
              leftMouth: { x: 0, y: 0 },
              rightMouth: { x: 0, y: 0 }
            },
            embedding: [0, 1, 0, 0],
            confidence: 0.8,
            attributes: { smile: 0.6, eyesOpen: 0.8 }
          }],
          photos: [],
          confidence: 0.8,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Test labeling
      await personManagementService.labelPerson('cluster1', 'Alice');
      await personManagementService.labelPerson('cluster2', 'Bob');

      // Test search by name
      const aliceResults = personManagementService.searchPeople(clusters, { name: 'Alice' });
      expect(aliceResults).toHaveLength(1);
      expect(aliceResults[0].id).toBe('cluster1');

      // Test getting best representative face
      const bestFace = personManagementService.getBestRepresentativeFace(clusters[0]);
      expect(bestFace?.id).toBe('face1');

      // Test statistics
      const stats = personManagementService.getPersonStats(clusters);
      expect(stats.totalPeople).toBe(2);
      expect(stats.labeledPeople).toBe(2);
      expect(stats.unlabeledClusters).toBe(0);

      // Test unlabeling
      const unlabelResult = await personManagementService.unlabelPerson('cluster1');
      expect(unlabelResult).toBe(true);
      
      const updatedStats = personManagementService.getPersonStats(clusters);
      expect(updatedStats.labeledPeople).toBe(1);
    });
  });

  describe('Performance and Accuracy Tests', () => {
    it('should handle large numbers of faces efficiently', async () => {
      const startTime = Date.now();
      
      // Create many faces with different embeddings
      const faces: Face[] = Array.from({ length: 100 }, (_, i) => ({
        id: `face_${i}`,
        boundingBox: { x: 0, y: 0, width: 50, height: 50 },
        landmarks: {
          leftEye: { x: 0, y: 0 },
          rightEye: { x: 0, y: 0 },
          nose: { x: 0, y: 0 },
          leftMouth: { x: 0, y: 0 },
          rightMouth: { x: 0, y: 0 }
        },
        embedding: Array.from({ length: 128 }, (_, j) => Math.random()),
        confidence: 0.8 + Math.random() * 0.2,
        attributes: {}
      }));

      const result = await faceClusteringService.clusterFaces(faces, {
        similarityThreshold: 0.7,
        minClusterSize: 2,
        maxClusters: 20
      });

      const processingTime = Date.now() - startTime;

      // Verify performance
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.clusters.length).toBeLessThanOrEqual(20);
      expect(result.processingTime).toBeGreaterThan(0);

      console.log(`Processed ${faces.length} faces in ${processingTime}ms`);
      console.log(`Created ${result.clusters.length} clusters`);
    });

    it('should maintain face embedding similarity accuracy', () => {
      // Test identical embeddings
      const embedding1 = [1, 0, 0, 0];
      const embedding2 = [1, 0, 0, 0];
      const identicalSimilarity = faceDetectionService.compareFaceEmbeddings(embedding1, embedding2);
      expect(identicalSimilarity).toBe(1);

      // Test orthogonal embeddings
      const embedding3 = [1, 0, 0, 0];
      const embedding4 = [0, 1, 0, 0];
      const orthogonalSimilarity = faceDetectionService.compareFaceEmbeddings(embedding3, embedding4);
      expect(orthogonalSimilarity).toBe(0.5); // Normalized cosine similarity

      // Test opposite embeddings
      const embedding5 = [1, 0, 0, 0];
      const embedding6 = [-1, 0, 0, 0];
      const oppositeSimilarity = faceDetectionService.compareFaceEmbeddings(embedding5, embedding6);
      expect(oppositeSimilarity).toBe(0); // Should be 0 for opposite vectors
    });
  });
});