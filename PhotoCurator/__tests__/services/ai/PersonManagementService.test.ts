import { PersonManagementService } from '../../../src/services/ai/PersonManagementService';
import { FaceClusteringService } from '../../../src/services/ai/FaceClusteringService';
import { PersonCluster, Face, Photo } from '../../../src/types';

// Mock FaceClusteringService
jest.mock('../../../src/services/ai/FaceClusteringService');
const mockFaceClusteringService = FaceClusteringService as jest.MockedClass<typeof FaceClusteringService>;

describe('PersonManagementService', () => {
  let personManagementService: PersonManagementService;
  let mockFaceClusteringServiceInstance: jest.Mocked<FaceClusteringService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock face clustering service instance
    mockFaceClusteringServiceInstance = {
      mergeClusters: jest.fn().mockImplementation((c1, c2) => ({
        id: `merged_${c1.id}_${c2.id}`,
        faces: [...c1.faces, ...c2.faces],
        photos: [...c1.photos, ...c2.photos],
        confidence: (c1.confidence + c2.confidence) / 2,
        createdAt: new Date(Math.min(c1.createdAt.getTime(), c2.createdAt.getTime())),
        updatedAt: new Date()
      })),
      splitCluster: jest.fn().mockImplementation((cluster) => Promise.resolve([
        { ...cluster, id: `split_${cluster.id}_1`, faces: cluster.faces.slice(0, Math.ceil(cluster.faces.length / 2)) },
        { ...cluster, id: `split_${cluster.id}_2`, faces: cluster.faces.slice(Math.ceil(cluster.faces.length / 2)) }
      ])),
    } as any;
    
    mockFaceClusteringService.getInstance.mockReturnValue(mockFaceClusteringServiceInstance);
    
    // Create service instance and clear any existing labels
    personManagementService = PersonManagementService.getInstance();
    // Clear the internal labels map
    (personManagementService as any).personLabels = new Map();
  });

  const createMockFace = (id: string, embedding: number[] = [1, 0, 0, 0]): Face => ({
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

  const createMockCluster = (id: string, name?: string): PersonCluster => ({
    id,
    name,
    faces: [createMockFace(`face_${id}`)],
    photos: [],
    confidence: 0.8,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  describe('labelPerson', () => {
    it('should create new label for unlabeled person', async () => {
      // Execute
      const label = await personManagementService.labelPerson('cluster1', 'John Doe');

      // Verify
      expect(label.name).toBe('John Doe');
      expect(label.clusterId).toBe('cluster1');
      expect(label.id).toBeTruthy();
      expect(label.createdAt).toBeInstanceOf(Date);
    });

    it('should update existing label', async () => {
      // Setup
      await personManagementService.labelPerson('cluster1', 'John Doe');

      // Execute
      const updatedLabel = await personManagementService.labelPerson('cluster1', 'John Smith');

      // Verify
      expect(updatedLabel.name).toBe('John Smith');
      expect(updatedLabel.clusterId).toBe('cluster1');
      expect(updatedLabel.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('unlabelPerson', () => {
    it('should remove existing label', async () => {
      // Setup
      await personManagementService.labelPerson('cluster1', 'John Doe');

      // Execute
      const result = await personManagementService.unlabelPerson('cluster1');

      // Verify
      expect(result).toBe(true);
      expect(personManagementService.getPersonLabel('cluster1')).toBeUndefined();
    });

    it('should return false for non-existent label', async () => {
      // Execute
      const result = await personManagementService.unlabelPerson('nonexistent');

      // Verify
      expect(result).toBe(false);
    });
  });

  describe('searchPeople', () => {
    beforeEach(async () => {
      // Setup test data
      await personManagementService.labelPerson('cluster1', 'John Doe');
      await personManagementService.labelPerson('cluster2', 'Jane Smith');
    });

    it('should search by name', () => {
      // Setup
      const clusters = [
        createMockCluster('cluster1'),
        createMockCluster('cluster2'),
        createMockCluster('cluster3')
      ];

      // Execute
      const results = personManagementService.searchPeople(clusters, { name: 'John' });

      // Verify
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('cluster1');
    });

    it('should filter by minimum photos', () => {
      // Setup
      const clusters = [
        { ...createMockCluster('cluster1'), photos: new Array(5).fill({}) },
        { ...createMockCluster('cluster2'), photos: new Array(2).fill({}) }
      ];

      // Execute
      const results = personManagementService.searchPeople(clusters, { minPhotos: 3 });

      // Verify
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('cluster1');
    });

    it('should sort by photo count', () => {
      // Setup
      const clusters = [
        { ...createMockCluster('cluster1'), photos: new Array(2).fill({}) },
        { ...createMockCluster('cluster2'), photos: new Array(5).fill({}) }
      ];

      // Execute
      const results = personManagementService.searchPeople(clusters, { 
        sortBy: 'photoCount',
        sortOrder: 'desc'
      });

      // Verify
      expect(results[0].id).toBe('cluster2');
      expect(results[1].id).toBe('cluster1');
    });

    it('should sort by name', () => {
      // Setup
      const clusters = [
        createMockCluster('cluster1'), // John Doe
        createMockCluster('cluster2')  // Jane Smith
      ];

      // Execute
      const results = personManagementService.searchPeople(clusters, { 
        sortBy: 'name',
        sortOrder: 'asc'
      });

      // Verify
      expect(results[0].id).toBe('cluster2'); // Jane comes before John
      expect(results[1].id).toBe('cluster1');
    });
  });

  describe('getPersonStats', () => {
    it('should calculate correct statistics', async () => {
      // Setup
      await personManagementService.labelPerson('cluster1', 'John Doe');
      await personManagementService.labelPerson('cluster2', 'Jane Smith');

      const clusters = [
        { ...createMockCluster('cluster1'), faces: [createMockFace('f1'), createMockFace('f2')], photos: new Array(3).fill({}) },
        { ...createMockCluster('cluster2'), faces: [createMockFace('f3')], photos: new Array(2).fill({}) },
        { ...createMockCluster('cluster3'), faces: [createMockFace('f4')], photos: new Array(1).fill({}) }
      ];

      // Execute
      const stats = personManagementService.getPersonStats(clusters);

      // Verify
      expect(stats.totalPeople).toBe(3);
      expect(stats.labeledPeople).toBe(2);
      expect(stats.unlabeledClusters).toBe(1);
      expect(stats.totalFaces).toBe(4);
      expect(stats.averagePhotosPerPerson).toBe(2); // (3+2+1)/3
    });
  });

  describe('mergePersonClusters', () => {
    it('should merge clusters and handle labels', async () => {
      // Setup
      const cluster1 = createMockCluster('cluster1');
      const cluster2 = createMockCluster('cluster2');

      await personManagementService.labelPerson('cluster1', 'John Doe');

      // Execute
      const result = await personManagementService.mergePersonClusters(cluster1, cluster2, 'John Smith');

      // Verify
      expect(result.id).toContain('merged');
      expect(result.faces.length).toBe(2); // Should have faces from both clusters
      
      // Check that old labels are removed and new label is created
      expect(personManagementService.getPersonLabel('cluster1')).toBeUndefined();
      expect(personManagementService.getPersonLabel('cluster2')).toBeUndefined();
      expect(personManagementService.getPersonLabel(result.id)?.name).toBe('John Smith');
    });

    it('should preserve existing label when no new name provided', async () => {
      // Setup
      const cluster1 = createMockCluster('cluster1');
      const cluster2 = createMockCluster('cluster2');

      await personManagementService.labelPerson('cluster1', 'John Doe');

      // Execute
      const result = await personManagementService.mergePersonClusters(cluster1, cluster2);

      // Verify
      expect(personManagementService.getPersonLabel(result.id)?.name).toBe('John Doe');
    });
  });

  describe('splitPersonCluster', () => {
    it('should split cluster and handle labels', async () => {
      // Setup
      const cluster = createMockCluster('cluster1');
      const splitClusters = [
        createMockCluster('split1'),
        createMockCluster('split2')
      ];

      await personManagementService.labelPerson('cluster1', 'John Doe');
      mockFaceClusteringServiceInstance.splitCluster.mockResolvedValue(splitClusters);

      // Execute
      const result = await personManagementService.splitPersonCluster(cluster, ['John', 'Jane']);

      // Verify
      expect(result.length).toBe(2);
      expect(result[0].id).toContain('split');
      expect(result[1].id).toContain('split');
      
      // Check that labels are applied
      expect(personManagementService.getPersonLabel(result[0].id)?.name).toBe('John');
      expect(personManagementService.getPersonLabel(result[1].id)?.name).toBe('Jane');
    });

    it('should keep original name for largest cluster when no new names provided', async () => {
      // Setup
      const cluster = { 
        ...createMockCluster('cluster1'), 
        faces: [createMockFace('f1'), createMockFace('f2'), createMockFace('f3')] 
      };
      
      // Mock the split to return clusters with different face counts
      mockFaceClusteringServiceInstance.splitCluster.mockResolvedValueOnce([
        { ...createMockCluster('split1'), faces: [createMockFace('f1')] }, // Smaller
        { ...createMockCluster('split2'), faces: [createMockFace('f2'), createMockFace('f3')] } // Larger
      ]);

      await personManagementService.labelPerson('cluster1', 'John Doe');

      // Execute
      const result = await personManagementService.splitPersonCluster(cluster);

      // Verify - the larger cluster should get the original name
      expect(result.length).toBe(2);
      
      // Find the larger cluster (should have 2 faces)
      const largerCluster = result.find(c => c.faces.length === 2);
      const smallerCluster = result.find(c => c.faces.length === 1);
      
      expect(largerCluster).toBeDefined();
      expect(smallerCluster).toBeDefined();
      expect(personManagementService.getPersonLabel(largerCluster!.id)?.name).toBe('John Doe');
      expect(personManagementService.getPersonLabel(smallerCluster!.id)).toBeUndefined();
    });
  });

  describe('getBestRepresentativeFace', () => {
    it('should return face with highest score', () => {
      // Setup
      const cluster: PersonCluster = {
        id: 'cluster1',
        faces: [
          { ...createMockFace('face1'), confidence: 0.7, attributes: { smile: 0.3, eyesOpen: 0.8 } },
          { ...createMockFace('face2'), confidence: 0.9, attributes: { smile: 0.8, eyesOpen: 0.9 } },
          { ...createMockFace('face3'), confidence: 0.8, attributes: { smile: 0.5, eyesOpen: 0.7 } }
        ],
        photos: [],
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Execute
      const bestFace = personManagementService.getBestRepresentativeFace(cluster);

      // Verify
      expect(bestFace?.id).toBe('face2'); // Highest confidence + good attributes
    });

    it('should return null for empty cluster', () => {
      // Setup
      const cluster: PersonCluster = {
        id: 'cluster1',
        faces: [],
        photos: [],
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Execute
      const bestFace = personManagementService.getBestRepresentativeFace(cluster);

      // Verify
      expect(bestFace).toBeNull();
    });
  });

  describe('findPhotosOfPerson', () => {
    it('should find photos containing faces from the cluster', () => {
      // Setup
      const cluster: PersonCluster = {
        id: 'cluster1',
        faces: [createMockFace('face1'), createMockFace('face2')],
        photos: [],
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const photos: Photo[] = [
        {
          id: 'photo1',
          uri: 'photo1.jpg',
          faces: [createMockFace('face1')],
          metadata: {} as any,
          syncStatus: 'local_only' as any,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'photo2',
          uri: 'photo2.jpg',
          faces: [createMockFace('face3')],
          metadata: {} as any,
          syncStatus: 'local_only' as any,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Execute
      const foundPhotos = personManagementService.findPhotosOfPerson(cluster, photos);

      // Verify
      expect(foundPhotos).toHaveLength(1);
      expect(foundPhotos[0].id).toBe('photo1');
    });
  });
});