import { FaceClusteringService } from '../../../src/services/ai/FaceClusteringService';
import { FaceDetectionService } from '../../../src/services/ai/FaceDetectionService';
import { Face, PersonCluster } from '../../../src/types';

// Mock FaceDetectionService
jest.mock('../../../src/services/ai/FaceDetectionService');
const mockFaceDetectionService = FaceDetectionService as jest.MockedClass<typeof FaceDetectionService>;

describe('FaceClusteringService', () => {
  let faceClusteringService: FaceClusteringService;
  let mockFaceDetectionServiceInstance: jest.Mocked<FaceDetectionService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock face detection service instance
    mockFaceDetectionServiceInstance = {
      compareFaceEmbeddings: jest.fn(),
    } as any;
    
    mockFaceDetectionService.getInstance.mockReturnValue(mockFaceDetectionServiceInstance);
    
    // Create service instance
    faceClusteringService = FaceClusteringService.getInstance();
  });

  const createMockFace = (id: string, embedding: number[]): Face => ({
    id,
    boundingBox: { x: 0, y: 0, width: 50, height: 50 },
    landmarks: {
      leftEye: { x: 0, y: 0 },
      rightEye: { x: 0, y: 0 },
      nose: { x: 0, y: 0 },
      leftMouth: { x: 0, y: 0 },
      rightMouth: { x: 0, y: 0 }
    },
    embedding,
    confidence: 0.9,
    attributes: {}
  });

  describe('clusterFaces', () => {
    it('should cluster similar faces together', async () => {
      // Setup
      const faces = [
        createMockFace('face1', [1, 0, 0, 0]),
        createMockFace('face2', [0.9, 0.1, 0, 0]), // Similar to face1
        createMockFace('face3', [0, 1, 0, 0]),
        createMockFace('face4', [0, 0.9, 0.1, 0]), // Similar to face3
      ];

      // Mock similarity calculations
      mockFaceDetectionServiceInstance.compareFaceEmbeddings
        .mockImplementation((emb1: number[], emb2: number[]) => {
          // Calculate actual cosine similarity for test
          const dotProduct = emb1.reduce((sum, val, i) => sum + val * emb2[i], 0);
          const norm1 = Math.sqrt(emb1.reduce((sum, val) => sum + val * val, 0));
          const norm2 = Math.sqrt(emb2.reduce((sum, val) => sum + val * val, 0));
          return (dotProduct / (norm1 * norm2) + 1) / 2;
        });

      // Execute
      const result = await faceClusteringService.clusterFaces(faces, {
        similarityThreshold: 0.8,
        minClusterSize: 2
      });

      // Verify
      expect(result.clusters).toHaveLength(2);
      expect(result.clusters[0].faces).toHaveLength(2);
      expect(result.clusters[1].faces).toHaveLength(2);
      expect(result.unclusteredFaces).toHaveLength(0);
    });

    it('should handle faces without embeddings', async () => {
      // Setup
      const faces = [
        createMockFace('face1', []),
        createMockFace('face2', [1, 0, 0, 0]),
      ];

      // Execute
      const result = await faceClusteringService.clusterFaces(faces);

      // Verify
      expect(result.clusters).toHaveLength(0);
      expect(result.unclusteredFaces).toHaveLength(2);
    });

    it('should respect minimum cluster size', async () => {
      // Setup
      const faces = [
        createMockFace('face1', [1, 0, 0, 0]),
        createMockFace('face2', [0, 1, 0, 0]),
        createMockFace('face3', [0, 0, 1, 0]),
      ];

      mockFaceDetectionServiceInstance.compareFaceEmbeddings.mockReturnValue(0.3); // Low similarity

      // Execute
      const result = await faceClusteringService.clusterFaces(faces, {
        minClusterSize: 2
      });

      // Verify
      expect(result.clusters).toHaveLength(0);
      expect(result.unclusteredFaces).toHaveLength(3);
    });

    it('should limit number of clusters', async () => {
      // Setup - Create many faces that would form individual clusters
      const faces = Array.from({ length: 10 }, (_, i) => {
        const embedding = new Array(4).fill(0);
        embedding[i % 4] = 1;
        return createMockFace(`face${i}`, embedding);
      });

      mockFaceDetectionServiceInstance.compareFaceEmbeddings.mockReturnValue(0.3); // Low similarity

      // Execute
      const result = await faceClusteringService.clusterFaces(faces, {
        maxClusters: 3,
        minClusterSize: 1
      });

      // Verify
      expect(result.clusters.length).toBeLessThanOrEqual(3);
    });
  });

  describe('mergeClusters', () => {
    it('should merge two person clusters', () => {
      // Setup
      const cluster1: PersonCluster = {
        id: 'cluster1',
        faces: [createMockFace('face1', [1, 0, 0, 0])],
        photos: [],
        confidence: 0.8,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      };

      const cluster2: PersonCluster = {
        id: 'cluster2',
        faces: [createMockFace('face2', [0.9, 0.1, 0, 0])],
        photos: [],
        confidence: 0.9,
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-02')
      };

      // Execute
      const mergedCluster = faceClusteringService.mergeClusters(cluster1, cluster2);

      // Verify
      expect(mergedCluster.faces).toHaveLength(2);
      expect(mergedCluster.confidence).toBeCloseTo(0.85, 2); // Average of 0.8 and 0.9
      expect(mergedCluster.createdAt).toEqual(new Date('2023-01-01')); // Earlier date
      expect(mergedCluster.id).toContain('merged');
    });
  });

  describe('splitCluster', () => {
    it('should split a cluster with many faces', async () => {
      // Setup
      const cluster: PersonCluster = {
        id: 'cluster1',
        faces: [
          createMockFace('face1', [1, 0, 0, 0]),
          createMockFace('face2', [0.9, 0.1, 0, 0]),
          createMockFace('face3', [0, 1, 0, 0]),
          createMockFace('face4', [0, 0.9, 0.1, 0]),
        ],
        photos: [],
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockFaceDetectionServiceInstance.compareFaceEmbeddings
        .mockImplementation((emb1: number[], emb2: number[]) => {
          const dotProduct = emb1.reduce((sum, val, i) => sum + val * emb2[i], 0);
          const norm1 = Math.sqrt(emb1.reduce((sum, val) => sum + val * val, 0));
          const norm2 = Math.sqrt(emb2.reduce((sum, val) => sum + val * val, 0));
          return (dotProduct / (norm1 * norm2) + 1) / 2;
        });

      // Execute
      const splitClusters = await faceClusteringService.splitCluster(cluster, {
        similarityThreshold: 0.9,
        minClusterSize: 2
      });

      // Verify
      expect(splitClusters.length).toBeGreaterThanOrEqual(1);
      splitClusters.forEach(splitCluster => {
        expect(splitCluster.id).toContain('split');
        expect(splitCluster.name).toBe(cluster.name);
      });
    });

    it('should not split clusters with too few faces', async () => {
      // Setup
      const cluster: PersonCluster = {
        id: 'cluster1',
        faces: [
          createMockFace('face1', [1, 0, 0, 0]),
          createMockFace('face2', [0.9, 0.1, 0, 0]),
        ],
        photos: [],
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Execute
      const splitClusters = await faceClusteringService.splitCluster(cluster);

      // Verify
      expect(splitClusters).toHaveLength(1);
      expect(splitClusters[0]).toBe(cluster);
    });
  });

  describe('addFaceToCluster', () => {
    it('should add face to existing similar cluster', async () => {
      // Setup
      const face = createMockFace('newFace', [1, 0, 0, 0]);
      const existingClusters: PersonCluster[] = [{
        id: 'cluster1',
        faces: [createMockFace('face1', [0.9, 0.1, 0, 0])],
        photos: [],
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      mockFaceDetectionServiceInstance.compareFaceEmbeddings.mockReturnValue(0.8);

      // Execute
      const result = await faceClusteringService.addFaceToCluster(face, existingClusters, 0.7);

      // Verify
      expect(result.isNewCluster).toBe(false);
      expect(result.cluster).toBeTruthy();
      expect(result.cluster!.faces).toHaveLength(2);
      expect(result.cluster!.faces.some(f => f.id === 'newFace')).toBe(true);
    });

    it('should create new cluster for dissimilar face', async () => {
      // Setup
      const face = createMockFace('newFace', [1, 0, 0, 0]);
      const existingClusters: PersonCluster[] = [{
        id: 'cluster1',
        faces: [createMockFace('face1', [0, 1, 0, 0])],
        photos: [],
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      mockFaceDetectionServiceInstance.compareFaceEmbeddings.mockReturnValue(0.3);

      // Execute
      const result = await faceClusteringService.addFaceToCluster(face, existingClusters, 0.7);

      // Verify
      expect(result.isNewCluster).toBe(true);
      expect(result.cluster).toBeTruthy();
      expect(result.cluster!.faces).toHaveLength(1);
      expect(result.cluster!.faces[0].id).toBe('newFace');
    });

    it('should handle face without embedding', async () => {
      // Setup
      const face = createMockFace('newFace', []);
      const existingClusters: PersonCluster[] = [];

      // Execute
      const result = await faceClusteringService.addFaceToCluster(face, existingClusters);

      // Verify
      expect(result.cluster).toBeNull();
      expect(result.isNewCluster).toBe(false);
    });
  });

  describe('linkClustersToPhotos', () => {
    it('should link clusters to photos containing their faces', () => {
      // Setup
      const clusters: PersonCluster[] = [{
        id: 'cluster1',
        faces: [createMockFace('face1', [1, 0, 0, 0])],
        photos: [],
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      const photos = [{
        id: 'photo1',
        uri: 'photo1.jpg',
        faces: [createMockFace('face1', [1, 0, 0, 0])],
        metadata: {} as any,
        syncStatus: 'local_only' as any,
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      // Execute
      const linkedClusters = faceClusteringService.linkClustersToPhotos(clusters, photos);

      // Verify
      expect(linkedClusters[0].photos).toHaveLength(1);
      expect(linkedClusters[0].photos[0].id).toBe('photo1');
    });
  });
});