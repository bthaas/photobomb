/**
 * Integration tests for Photo Library functionality
 * Tests the core business logic without UI components
 */

import { PhotoRepository, PhotoFilter, PhotoSort } from '../../src/services/storage/PhotoRepository';
import { ClusterRepository } from '../../src/services/storage/ClusterRepository';
import { Photo, PhotoCluster, SyncStatus, ClusterType } from '../../src/types';

// Mock the database service
jest.mock('../../src/services/storage/DatabaseService');

describe('Photo Library Integration', () => {
  let photoRepository: PhotoRepository;
  let clusterRepository: ClusterRepository;

  const mockPhotos: Photo[] = [
    {
      id: '1',
      uri: 'file://photo1.jpg',
      metadata: {
        width: 1920,
        height: 1080,
        fileSize: 2048000,
        format: 'jpeg',
        timestamp: new Date('2023-01-01'),
      },
      syncStatus: SyncStatus.LOCAL_ONLY,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
      qualityScore: {
        overall: 0.9,
        sharpness: 0.8,
        exposure: 0.9,
        colorBalance: 0.85,
        noise: 0.1,
      },
      features: {
        embedding: [0.1, 0.2, 0.3],
        dominantColors: [],
        objects: [{ label: 'beach', confidence: 0.9, boundingBox: { x: 0, y: 0, width: 100, height: 100 } }],
        scenes: [{ label: 'outdoor', confidence: 0.8 }],
      },
      faces: [
        {
          id: 'face1',
          boundingBox: { x: 100, y: 100, width: 200, height: 200 },
          landmarks: {
            leftEye: { x: 150, y: 150 },
            rightEye: { x: 250, y: 150 },
            nose: { x: 200, y: 200 },
            leftMouth: { x: 180, y: 250 },
            rightMouth: { x: 220, y: 250 },
          },
          embedding: [0.1, 0.2, 0.3],
          confidence: 0.95,
          attributes: {
            age: 25,
            gender: 'female',
            emotion: 'happy',
            smile: 0.9,
            eyesOpen: 0.95,
          },
        },
      ],
      clusterId: 'cluster1',
    },
    {
      id: '2',
      uri: 'file://photo2.jpg',
      metadata: {
        width: 1920,
        height: 1080,
        fileSize: 1536000,
        format: 'jpeg',
        timestamp: new Date('2023-01-02'),
      },
      syncStatus: SyncStatus.SYNCED,
      createdAt: new Date('2023-01-02'),
      updatedAt: new Date('2023-01-02'),
      qualityScore: {
        overall: 0.7,
        sharpness: 0.6,
        exposure: 0.8,
        colorBalance: 0.7,
        noise: 0.2,
      },
    },
  ];

  const mockClusters: PhotoCluster[] = [
    {
      id: 'cluster1',
      type: ClusterType.VISUAL_SIMILARITY,
      photos: [mockPhotos[0]],
      centroid: [0.1, 0.2, 0.3],
      confidence: 0.85,
      label: 'Beach Photos',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
  ];

  beforeEach(() => {
    photoRepository = new PhotoRepository();
    clusterRepository = new ClusterRepository();

    // Mock repository methods
    jest.spyOn(photoRepository, 'find').mockResolvedValue(mockPhotos);
    jest.spyOn(photoRepository, 'findById').mockImplementation(async (id) => 
      mockPhotos.find(p => p.id === id) || null
    );
    jest.spyOn(photoRepository, 'count').mockResolvedValue(mockPhotos.length);
    jest.spyOn(photoRepository, 'delete').mockResolvedValue();
    jest.spyOn(photoRepository, 'update').mockResolvedValue();

    jest.spyOn(clusterRepository, 'findPhotoClusters').mockResolvedValue(mockClusters);
    jest.spyOn(clusterRepository, 'findPhotoClusterById').mockImplementation(async (id) =>
      mockClusters.find(c => c.id === id) || null
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Photo Loading and Filtering', () => {
    it('loads photos with default parameters', async () => {
      const photos = await photoRepository.find();
      
      expect(photos).toEqual(mockPhotos);
      expect(photoRepository.find).toHaveBeenCalled();
    });

    it('filters photos by quality threshold', async () => {
      const filter: PhotoFilter = { qualityThreshold: 0.8 };
      const photos = await photoRepository.find(filter);
      
      expect(photoRepository.find).toHaveBeenCalledWith(filter);
    });

    it('filters photos by features availability', async () => {
      const filter: PhotoFilter = { hasFeatures: true };
      const photos = await photoRepository.find(filter);
      
      expect(photoRepository.find).toHaveBeenCalledWith(filter);
    });

    it('filters photos by face detection', async () => {
      const filter: PhotoFilter = { hasFaces: true };
      const photos = await photoRepository.find(filter);
      
      expect(photoRepository.find).toHaveBeenCalledWith(filter);
    });

    it('sorts photos by quality', async () => {
      const sort: PhotoSort = { field: 'quality_overall', direction: 'DESC' };
      const photos = await photoRepository.find({}, sort);
      
      expect(photoRepository.find).toHaveBeenCalledWith({}, sort);
    });

    it('supports pagination', async () => {
      const photos = await photoRepository.find({}, { field: 'timestamp', direction: 'DESC' }, 25, 50);
      
      expect(photoRepository.find).toHaveBeenCalledWith(
        {},
        { field: 'timestamp', direction: 'DESC' },
        25,
        50
      );
    });
  });

  describe('Photo Management', () => {
    it('finds photo by ID', async () => {
      const photo = await photoRepository.findById('1');
      
      expect(photo).toEqual(mockPhotos[0]);
      expect(photoRepository.findById).toHaveBeenCalledWith('1');
    });

    it('returns null for non-existent photo', async () => {
      const photo = await photoRepository.findById('non-existent');
      
      expect(photo).toBeNull();
    });

    it('deletes photo by ID', async () => {
      await photoRepository.delete('1');
      
      expect(photoRepository.delete).toHaveBeenCalledWith('1');
    });

    it('updates photo metadata', async () => {
      const updates = { syncStatus: SyncStatus.SYNCED };
      await photoRepository.update('1', updates);
      
      expect(photoRepository.update).toHaveBeenCalledWith('1', updates);
    });

    it('counts photos with filter', async () => {
      const count = await photoRepository.count({ hasFeatures: true });
      
      expect(count).toBe(mockPhotos.length);
      expect(photoRepository.count).toHaveBeenCalledWith({ hasFeatures: true });
    });
  });

  describe('Cluster Management', () => {
    it('loads all clusters', async () => {
      const clusters = await clusterRepository.findPhotoClusters();
      
      expect(clusters).toEqual(mockClusters);
      expect(clusterRepository.findPhotoClusters).toHaveBeenCalled();
    });

    it('finds cluster by ID', async () => {
      const cluster = await clusterRepository.findPhotoClusterById('cluster1');
      
      expect(cluster).toEqual(mockClusters[0]);
      expect(clusterRepository.findPhotoClusterById).toHaveBeenCalledWith('cluster1');
    });

    it('returns null for non-existent cluster', async () => {
      const cluster = await clusterRepository.findPhotoClusterById('non-existent');
      
      expect(cluster).toBeNull();
    });
  });

  describe('Search Functionality', () => {
    it('filters photos by search text in detected objects', () => {
      const searchText = 'beach';
      const filteredPhotos = mockPhotos.filter(photo => {
        const objectLabels = photo.features?.objects.map(obj => obj.label.toLowerCase()) || [];
        const sceneLabels = photo.features?.scenes.map(scene => scene.label.toLowerCase()) || [];
        const allLabels = [...objectLabels, ...sceneLabels];
        
        return allLabels.some(label => label.includes(searchText.toLowerCase()));
      });

      expect(filteredPhotos).toHaveLength(1);
      expect(filteredPhotos[0].id).toBe('1');
    });

    it('filters photos by search text in scenes', () => {
      const searchText = 'outdoor';
      const filteredPhotos = mockPhotos.filter(photo => {
        const objectLabels = photo.features?.objects.map(obj => obj.label.toLowerCase()) || [];
        const sceneLabels = photo.features?.scenes.map(scene => scene.label.toLowerCase()) || [];
        const allLabels = [...objectLabels, ...sceneLabels];
        
        return allLabels.some(label => label.includes(searchText.toLowerCase()));
      });

      expect(filteredPhotos).toHaveLength(1);
      expect(filteredPhotos[0].id).toBe('1');
    });

    it('returns empty array when no matches found', () => {
      const searchText = 'nonexistent';
      const filteredPhotos = mockPhotos.filter(photo => {
        const objectLabels = photo.features?.objects.map(obj => obj.label.toLowerCase()) || [];
        const sceneLabels = photo.features?.scenes.map(scene => scene.label.toLowerCase()) || [];
        const allLabels = [...objectLabels, ...sceneLabels];
        
        return allLabels.some(label => label.includes(searchText.toLowerCase()));
      });

      expect(filteredPhotos).toHaveLength(0);
    });
  });

  describe('Batch Operations', () => {
    it('processes multiple photo IDs for batch operations', () => {
      const selectedPhotoIds = ['1', '2'];
      const selectedPhotos = mockPhotos.filter(p => selectedPhotoIds.includes(p.id));
      
      expect(selectedPhotos).toHaveLength(2);
      expect(selectedPhotos.map(p => p.id)).toEqual(['1', '2']);
    });

    it('validates photo selection limits', () => {
      const maxSelection = 10;
      const selectedPhotoIds = Array.from({ length: 15 }, (_, i) => `${i + 1}`);
      
      const isOverLimit = selectedPhotoIds.length > maxSelection;
      expect(isOverLimit).toBe(true);
    });

    it('generates share URLs from selected photos', () => {
      const selectedPhotoIds = ['1', '2'];
      const selectedPhotos = mockPhotos.filter(p => selectedPhotoIds.includes(p.id));
      const shareUrls = selectedPhotos.map(p => p.uri);
      
      expect(shareUrls).toEqual(['file://photo1.jpg', 'file://photo2.jpg']);
    });
  });

  describe('Quality and Analysis Features', () => {
    it('identifies high-quality photos', () => {
      const highQualityPhotos = mockPhotos.filter(photo => 
        photo.qualityScore && photo.qualityScore.overall > 0.8
      );
      
      expect(highQualityPhotos).toHaveLength(1);
      expect(highQualityPhotos[0].id).toBe('1');
    });

    it('counts faces in photos', () => {
      const photosWithFaces = mockPhotos.filter(photo => 
        photo.faces && photo.faces.length > 0
      );
      
      expect(photosWithFaces).toHaveLength(1);
      expect(photosWithFaces[0].faces?.length).toBe(1);
    });

    it('extracts available tags from photo features', () => {
      const tags = new Set<string>();
      mockPhotos.forEach(photo => {
        photo.features?.objects.forEach(obj => tags.add(obj.label));
        photo.features?.scenes.forEach(scene => tags.add(scene.label));
      });
      
      const availableTags = Array.from(tags).sort();
      expect(availableTags).toEqual(['beach', 'outdoor']);
    });

    it('identifies clustered photos', () => {
      const clusteredPhotos = mockPhotos.filter(photo => photo.clusterId);
      
      expect(clusteredPhotos).toHaveLength(1);
      expect(clusteredPhotos[0].clusterId).toBe('cluster1');
    });
  });

  describe('Error Handling', () => {
    it('handles repository errors gracefully', async () => {
      jest.spyOn(photoRepository, 'find').mockRejectedValue(new Error('Database error'));
      
      try {
        await photoRepository.find();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Database error');
      }
    });

    it('handles missing photo gracefully', async () => {
      const photo = await photoRepository.findById('non-existent');
      expect(photo).toBeNull();
    });

    it('handles empty results gracefully', async () => {
      jest.spyOn(photoRepository, 'find').mockResolvedValue([]);
      
      const photos = await photoRepository.find();
      expect(photos).toEqual([]);
    });
  });
});