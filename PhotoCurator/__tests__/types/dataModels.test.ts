/**
 * Integration tests for data models
 */

import {
  Photo,
  PhotoMetadata,
  ImageFeatures,
  QualityScore,
  CompositionScore,
  ContentScore,
  Face,
  PhotoCluster,
  PersonCluster,
  EventCluster,
  CurationResult,
  SyncStatus,
  ClusterType,
  CurationGoal,
} from '../../src/types';
import { validatePhoto } from '../../src/utils/validation';
import { extractPhotoMetadata, calculateAspectRatio } from '../../src/utils/photoMetadata';

describe('Data Models Integration', () => {
  describe('Photo Model', () => {
    it('should create a complete photo object with all properties', () => {
      const photo: Photo = {
        id: 'photo-123',
        uri: 'file://path/to/photo.jpg',
        metadata: {
          width: 1920,
          height: 1080,
          fileSize: 2048000,
          format: 'jpeg',
          timestamp: new Date('2023-01-01T12:00:00Z'),
          exif: {
            make: 'Apple',
            model: 'iPhone 14 Pro',
            iso: 100,
            fNumber: 1.8,
            exposureTime: 0.008333,
            focalLength: 26
          },
          location: {
            latitude: 37.7749,
            longitude: -122.4194,
            altitude: 100
          }
        },
        features: {
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
          dominantColors: [{
            r: 255,
            g: 128,
            b: 0,
            hex: '#FF8000',
            percentage: 45.2
          }],
          objects: [{
            label: 'person',
            confidence: 0.95,
            boundingBox: {
              x: 100,
              y: 200,
              width: 300,
              height: 400
            }
          }],
          scenes: [{
            label: 'outdoor',
            confidence: 0.88
          }]
        },
        qualityScore: {
          overall: 0.85,
          sharpness: 0.9,
          exposure: 0.8,
          colorBalance: 0.85,
          noise: 0.9
        },
        compositionScore: {
          overall: 0.75,
          ruleOfThirds: 0.8,
          leadingLines: 0.6,
          symmetry: 0.7,
          subjectPlacement: 0.9
        },
        contentScore: {
          overall: 0.8,
          faceQuality: 0.85,
          emotionalSentiment: 0.75,
          interestingness: 0.8
        },
        faces: [{
          id: 'face-456',
          boundingBox: {
            x: 150,
            y: 250,
            width: 200,
            height: 250
          },
          landmarks: {
            leftEye: { x: 180, y: 280 },
            rightEye: { x: 220, y: 280 },
            nose: { x: 200, y: 320 },
            leftMouth: { x: 185, y: 360 },
            rightMouth: { x: 215, y: 360 }
          },
          embedding: [0.2, 0.4, 0.6, 0.8],
          confidence: 0.92,
          attributes: {
            age: 25,
            gender: 'female',
            emotion: 'happy',
            smile: 0.9,
            eyesOpen: 0.95
          }
        }],
        clusterId: 'cluster-789',
        syncStatus: SyncStatus.SYNCED,
        createdAt: new Date('2023-01-01T12:00:00Z'),
        updatedAt: new Date('2023-01-01T12:30:00Z')
      };

      // Validate the photo object
      const validation = validatePhoto(photo);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);

      // Test utility functions
      expect(calculateAspectRatio(photo.metadata)).toBeCloseTo(1.7778, 3);
      expect(photo.features?.embedding).toHaveLength(5);
      expect(photo.faces).toHaveLength(1);
    });

    it('should work with minimal photo data', () => {
      const minimalPhoto: Photo = {
        id: 'photo-minimal',
        uri: 'file://minimal.jpg',
        metadata: {
          width: 800,
          height: 600,
          fileSize: 512000,
          format: 'jpeg',
          timestamp: new Date()
        },
        syncStatus: SyncStatus.LOCAL_ONLY,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const validation = validatePhoto(minimalPhoto);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Clustering Models', () => {
    it('should create photo clusters with proper relationships', () => {
      const photos: Photo[] = [
        {
          id: 'photo-1',
          uri: 'file://photo1.jpg',
          metadata: {
            width: 1920,
            height: 1080,
            fileSize: 2048000,
            format: 'jpeg',
            timestamp: new Date()
          },
          syncStatus: SyncStatus.LOCAL_ONLY,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'photo-2',
          uri: 'file://photo2.jpg',
          metadata: {
            width: 1920,
            height: 1080,
            fileSize: 1536000,
            format: 'jpeg',
            timestamp: new Date()
          },
          syncStatus: SyncStatus.LOCAL_ONLY,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const cluster: PhotoCluster = {
        id: 'cluster-visual-1',
        type: ClusterType.VISUAL_SIMILARITY,
        photos,
        centroid: [0.1, 0.2, 0.3, 0.4, 0.5],
        confidence: 0.85,
        label: 'Beach Photos',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(cluster.photos).toHaveLength(2);
      expect(cluster.type).toBe(ClusterType.VISUAL_SIMILARITY);
      expect(cluster.confidence).toBeGreaterThan(0.8);
    });

    it('should create person clusters with face data', () => {
      const faces: Face[] = [
        {
          id: 'face-1',
          boundingBox: { x: 100, y: 100, width: 150, height: 200 },
          embedding: [0.1, 0.2, 0.3],
          confidence: 0.95,
          landmarks: {
            leftEye: { x: 120, y: 130 },
            rightEye: { x: 160, y: 130 },
            nose: { x: 140, y: 160 },
            leftMouth: { x: 125, y: 190 },
            rightMouth: { x: 155, y: 190 }
          },
          attributes: {
            age: 30,
            gender: 'male',
            emotion: 'happy'
          }
        }
      ];

      const personCluster: PersonCluster = {
        id: 'person-cluster-1',
        name: 'John Doe',
        faces,
        photos: [], // Would be populated with photos containing these faces
        confidence: 0.92,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(personCluster.faces).toHaveLength(1);
      expect(personCluster.name).toBe('John Doe');
      expect(personCluster.confidence).toBeGreaterThan(0.9);
    });

    it('should create event clusters with time and location data', () => {
      const eventCluster: EventCluster = {
        id: 'event-cluster-1',
        name: 'Beach Vacation 2023',
        photos: [], // Would contain related photos
        timeRange: {
          start: new Date('2023-07-01T00:00:00Z'),
          end: new Date('2023-07-07T23:59:59Z')
        },
        location: {
          latitude: 36.7783,
          longitude: -119.4179,
          altitude: 50
        },
        confidence: 0.88,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(eventCluster.timeRange.start).toBeInstanceOf(Date);
      expect(eventCluster.timeRange.end).toBeInstanceOf(Date);
      expect(eventCluster.location?.latitude).toBeDefined();
      expect(eventCluster.name).toBe('Beach Vacation 2023');
    });
  });

  describe('Curation Models', () => {
    it('should create curation results with ranked photos', () => {
      const photo: Photo = {
        id: 'photo-curated',
        uri: 'file://curated.jpg',
        metadata: {
          width: 1920,
          height: 1080,
          fileSize: 2048000,
          format: 'jpeg',
          timestamp: new Date()
        },
        qualityScore: {
          overall: 0.9,
          sharpness: 0.95,
          exposure: 0.85,
          colorBalance: 0.9,
          noise: 0.95
        },
        compositionScore: {
          overall: 0.8,
          ruleOfThirds: 0.85,
          leadingLines: 0.7,
          symmetry: 0.8,
          subjectPlacement: 0.9
        },
        contentScore: {
          overall: 0.85,
          faceQuality: 0.9,
          emotionalSentiment: 0.8,
          interestingness: 0.85
        },
        syncStatus: SyncStatus.LOCAL_ONLY,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const curationResult: CurationResult = {
        goal: CurationGoal.BEST_PORTRAITS,
        selectedPhotos: [{
          photo,
          rank: 1,
          score: 0.87,
          scoreBreakdown: {
            quality: 0.9,
            composition: 0.8,
            content: 0.85,
            uniqueness: 0.9,
            emotional: 0.8
          },
          reasoning: [
            'High quality score (0.9)',
            'Good composition with rule of thirds',
            'Strong emotional content'
          ]
        }],
        totalPhotos: 50,
        processingTime: 1250,
        weights: {
          qualityWeight: 0.3,
          compositionWeight: 0.25,
          contentWeight: 0.3,
          uniquenessWeight: 0.1,
          emotionalWeight: 0.05
        },
        createdAt: new Date()
      };

      expect(curationResult.selectedPhotos).toHaveLength(1);
      expect(curationResult.selectedPhotos[0].rank).toBe(1);
      expect(curationResult.selectedPhotos[0].score).toBeGreaterThan(0.8);
      expect(curationResult.goal).toBe(CurationGoal.BEST_PORTRAITS);
      expect(curationResult.selectedPhotos[0].reasoning).toContain('High quality score (0.9)');
    });
  });

  describe('Type Safety and Enums', () => {
    it('should enforce enum values correctly', () => {
      // Test SyncStatus enum
      const syncStatuses = Object.values(SyncStatus);
      expect(syncStatuses).toContain(SyncStatus.LOCAL_ONLY);
      expect(syncStatuses).toContain(SyncStatus.SYNCED);
      expect(syncStatuses).toContain(SyncStatus.PENDING_UPLOAD);

      // Test ClusterType enum
      const clusterTypes = Object.values(ClusterType);
      expect(clusterTypes).toContain(ClusterType.VISUAL_SIMILARITY);
      expect(clusterTypes).toContain(ClusterType.FACE_GROUP);
      expect(clusterTypes).toContain(ClusterType.EVENT);

      // Test CurationGoal enum
      const curationGoals = Object.values(CurationGoal);
      expect(curationGoals).toContain(CurationGoal.BEST_PORTRAITS);
      expect(curationGoals).toContain(CurationGoal.BEST_SCENIC);
      expect(curationGoals).toContain(CurationGoal.BALANCED);
    });

    it('should maintain type safety across model relationships', () => {
      // Create a photo with all related data
      const photo: Photo = {
        id: 'type-safety-test',
        uri: 'file://test.jpg',
        metadata: {
          width: 1920,
          height: 1080,
          fileSize: 2048000,
          format: 'jpeg',
          timestamp: new Date()
        },
        syncStatus: SyncStatus.LOCAL_ONLY,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Ensure the photo can be used in clusters
      const cluster: PhotoCluster = {
        id: 'cluster-type-test',
        type: ClusterType.VISUAL_SIMILARITY,
        photos: [photo], // Type-safe assignment
        centroid: [0.1, 0.2, 0.3],
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Verify relationships are maintained
      expect(cluster.photos[0].id).toBe(photo.id);
      expect(cluster.photos[0].syncStatus).toBe(SyncStatus.LOCAL_ONLY);
    });
  });

  describe('Async Metadata Extraction', () => {
    it('should extract metadata asynchronously', async () => {
      const uri = 'file://test-async.jpg';
      const metadata = await extractPhotoMetadata(uri);

      expect(metadata).toHaveProperty('width');
      expect(metadata).toHaveProperty('height');
      expect(metadata).toHaveProperty('fileSize');
      expect(metadata).toHaveProperty('format');
      expect(metadata).toHaveProperty('timestamp');
      expect(metadata.timestamp).toBeInstanceOf(Date);
    });
  });
});