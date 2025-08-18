/**
 * Unit tests for validation functions
 */

import {
  validatePhoto,
  validatePhotoMetadata,
  validateImageFeatures,
  validateQualityScore,
  validateCompositionScore,
  validateContentScore,
  validateFace,
  validateGeoLocation,
  validateExifData,
  validateColor,
  validateDetectedObject,
  isValidString,
  isValidNumber,
  isValidDate,
  isValidArray,
} from '../../src/utils/validation';
import { SyncStatus } from '../../src/types';

describe('Basic Validators', () => {
  describe('isValidString', () => {
    it('should validate required strings correctly', () => {
      expect(isValidString('valid', 'test')).toEqual([]);
      expect(isValidString('', 'test')).toEqual(['test cannot be empty']);
      expect(isValidString(null, 'test')).toEqual(['test is required']);
      expect(isValidString(undefined, 'test')).toEqual(['test is required']);
      expect(isValidString(123, 'test')).toEqual(['test must be a string']);
    });

    it('should validate optional strings correctly', () => {
      expect(isValidString(null, 'test', false)).toEqual([]);
      expect(isValidString(undefined, 'test', false)).toEqual([]);
      expect(isValidString('valid', 'test', false)).toEqual([]);
      expect(isValidString(123, 'test', false)).toEqual(['test must be a string']);
    });
  });

  describe('isValidNumber', () => {
    it('should validate required numbers correctly', () => {
      expect(isValidNumber(42, 'test')).toEqual([]);
      expect(isValidNumber(0, 'test')).toEqual([]);
      expect(isValidNumber(-5, 'test')).toEqual([]);
      expect(isValidNumber(null, 'test')).toEqual(['test is required']);
      expect(isValidNumber('42', 'test')).toEqual(['test must be a valid number']);
      expect(isValidNumber(NaN, 'test')).toEqual(['test must be a valid number']);
    });

    it('should validate number ranges correctly', () => {
      expect(isValidNumber(5, 'test', true, 0, 10)).toEqual([]);
      expect(isValidNumber(-1, 'test', true, 0, 10)).toEqual(['test must be at least 0']);
      expect(isValidNumber(15, 'test', true, 0, 10)).toEqual(['test must be at most 10']);
    });
  });

  describe('isValidDate', () => {
    it('should validate dates correctly', () => {
      expect(isValidDate(new Date(), 'test')).toEqual([]);
      expect(isValidDate(new Date('invalid'), 'test')).toEqual(['test must be a valid Date']);
      expect(isValidDate(null, 'test')).toEqual(['test is required']);
      expect(isValidDate('2023-01-01', 'test')).toEqual(['test must be a valid Date']);
    });
  });

  describe('isValidArray', () => {
    it('should validate arrays correctly', () => {
      expect(isValidArray([], 'test')).toEqual([]);
      expect(isValidArray([1, 2, 3], 'test')).toEqual([]);
      expect(isValidArray(null, 'test')).toEqual(['test is required']);
      expect(isValidArray('not array', 'test')).toEqual(['test must be an array']);
      expect(isValidArray([], 'test', true, 1)).toEqual(['test must have at least 1 items']);
    });
  });
});

describe('Model Validators', () => {
  describe('validateGeoLocation', () => {
    it('should validate valid geo location', () => {
      const validLocation = {
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 100,
        accuracy: 5
      };
      
      const result = validateGeoLocation(validLocation);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid coordinates', () => {
      const invalidLocation = {
        latitude: 91, // Invalid latitude
        longitude: -181, // Invalid longitude
      };
      
      const result = validateGeoLocation(invalidLocation);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('latitude must be at most 90');
      expect(result.errors).toContain('longitude must be at least -180');
    });

    it('should reject non-object input', () => {
      const result = validateGeoLocation('not an object');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('GeoLocation must be an object');
    });
  });

  describe('validateExifData', () => {
    it('should validate valid EXIF data', () => {
      const validExif = {
        make: 'Apple',
        model: 'iPhone 14',
        dateTime: '2023:01:01 12:00:00',
        orientation: 1,
        exposureTime: 0.008,
        fNumber: 1.8,
        iso: 100,
        focalLength: 26
      };
      
      const result = validateExifData(validExif);
      expect(result.isValid).toBe(true);
    });

    it('should allow null/undefined EXIF (optional)', () => {
      expect(validateExifData(null).isValid).toBe(true);
      expect(validateExifData(undefined).isValid).toBe(true);
    });

    it('should reject invalid orientation', () => {
      const invalidExif = { orientation: 10 }; // Valid range is 1-8
      const result = validateExifData(invalidExif);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('orientation must be at most 8');
    });
  });

  describe('validatePhotoMetadata', () => {
    it('should validate complete metadata', () => {
      const validMetadata = {
        width: 1920,
        height: 1080,
        fileSize: 2048000,
        format: 'jpeg',
        timestamp: new Date(),
        exif: {
          make: 'Apple',
          model: 'iPhone 14'
        },
        location: {
          latitude: 37.7749,
          longitude: -122.4194
        }
      };
      
      const result = validatePhotoMetadata(validMetadata);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid dimensions', () => {
      const invalidMetadata = {
        width: 0,
        height: -1,
        fileSize: 2048000,
        format: 'jpeg',
        timestamp: new Date()
      };
      
      const result = validatePhotoMetadata(invalidMetadata);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('width must be at least 1');
      expect(result.errors).toContain('height must be at least 1');
    });
  });

  describe('validateColor', () => {
    it('should validate valid color', () => {
      const validColor = {
        r: 255,
        g: 128,
        b: 0,
        hex: '#FF8000',
        percentage: 25.5
      };
      
      const result = validateColor(validColor);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid RGB values', () => {
      const invalidColor = {
        r: 256,
        g: -1,
        b: 'blue',
        hex: '#FF8000',
        percentage: 25.5
      };
      
      const result = validateColor(invalidColor);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('r must be at most 255');
      expect(result.errors).toContain('g must be at least 0');
      expect(result.errors).toContain('b must be a valid number');
    });

    it('should reject invalid hex format', () => {
      const invalidColor = {
        r: 255,
        g: 128,
        b: 0,
        hex: 'FF8000', // Missing #
        percentage: 25.5
      };
      
      const result = validateColor(invalidColor);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('hex must be a valid hex color code');
    });
  });

  describe('validateDetectedObject', () => {
    it('should validate valid detected object', () => {
      const validObject = {
        label: 'person',
        confidence: 0.95,
        boundingBox: {
          x: 100,
          y: 200,
          width: 150,
          height: 300
        }
      };
      
      const result = validateDetectedObject(validObject);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid confidence', () => {
      const invalidObject = {
        label: 'person',
        confidence: 1.5, // Must be 0-1
        boundingBox: {
          x: 100,
          y: 200,
          width: 150,
          height: 300
        }
      };
      
      const result = validateDetectedObject(invalidObject);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('confidence must be at most 1');
    });
  });

  describe('validateImageFeatures', () => {
    it('should validate valid image features', () => {
      const validFeatures = {
        embedding: [0.1, 0.2, 0.3, 0.4],
        dominantColors: [{
          r: 255,
          g: 0,
          b: 0,
          hex: '#FF0000',
          percentage: 50
        }],
        objects: [{
          label: 'person',
          confidence: 0.9,
          boundingBox: { x: 0, y: 0, width: 100, height: 200 }
        }],
        scenes: [{
          label: 'outdoor',
          confidence: 0.8
        }]
      };
      
      const result = validateImageFeatures(validFeatures);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid embedding values', () => {
      const invalidFeatures = {
        embedding: [0.1, 'invalid', 0.3],
        dominantColors: [],
        objects: [],
        scenes: []
      };
      
      const result = validateImageFeatures(invalidFeatures);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('embedding[1] must be a valid number');
    });
  });

  describe('validateQualityScore', () => {
    it('should validate valid quality score', () => {
      const validScore = {
        overall: 0.85,
        sharpness: 0.9,
        exposure: 0.8,
        colorBalance: 0.75,
        noise: 0.95
      };
      
      const result = validateQualityScore(validScore);
      expect(result.isValid).toBe(true);
    });

    it('should reject scores outside 0-1 range', () => {
      const invalidScore = {
        overall: 1.5,
        sharpness: -0.1,
        exposure: 0.8,
        colorBalance: 0.75,
        noise: 0.95
      };
      
      const result = validateQualityScore(invalidScore);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('overall must be at most 1');
      expect(result.errors).toContain('sharpness must be at least 0');
    });
  });

  describe('validateFace', () => {
    it('should validate valid face', () => {
      const validFace = {
        id: 'face-123',
        boundingBox: {
          x: 100,
          y: 200,
          width: 150,
          height: 200
        },
        embedding: [0.1, 0.2, 0.3],
        confidence: 0.95,
        landmarks: {
          leftEye: { x: 120, y: 220 },
          rightEye: { x: 180, y: 220 },
          nose: { x: 150, y: 250 },
          leftMouth: { x: 130, y: 280 },
          rightMouth: { x: 170, y: 280 }
        }
      };
      
      const result = validateFace(validFace);
      expect(result.isValid).toBe(true);
    });

    it('should reject missing bounding box', () => {
      const invalidFace = {
        id: 'face-123',
        embedding: [0.1, 0.2, 0.3],
        confidence: 0.95
      };
      
      const result = validateFace(invalidFace);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('boundingBox is required and must be an object');
    });
  });

  describe('validatePhoto', () => {
    it('should validate complete photo', () => {
      const validPhoto = {
        id: 'photo-123',
        uri: 'file://path/to/photo.jpg',
        metadata: {
          width: 1920,
          height: 1080,
          fileSize: 2048000,
          format: 'jpeg',
          timestamp: new Date()
        },
        features: {
          embedding: [0.1, 0.2, 0.3],
          dominantColors: [{
            r: 255,
            g: 0,
            b: 0,
            hex: '#FF0000',
            percentage: 50
          }],
          objects: [],
          scenes: []
        },
        qualityScore: {
          overall: 0.85,
          sharpness: 0.9,
          exposure: 0.8,
          colorBalance: 0.75,
          noise: 0.95
        },
        syncStatus: SyncStatus.LOCAL_ONLY,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = validatePhoto(validPhoto);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid sync status', () => {
      const invalidPhoto = {
        id: 'photo-123',
        uri: 'file://path/to/photo.jpg',
        metadata: {
          width: 1920,
          height: 1080,
          fileSize: 2048000,
          format: 'jpeg',
          timestamp: new Date()
        },
        syncStatus: 'invalid_status',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = validatePhoto(invalidPhoto);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('syncStatus must be a valid SyncStatus value');
    });

    it('should propagate nested validation errors', () => {
      const invalidPhoto = {
        id: 'photo-123',
        uri: 'file://path/to/photo.jpg',
        metadata: {
          width: -1, // Invalid
          height: 1080,
          fileSize: 2048000,
          format: 'jpeg',
          timestamp: new Date()
        },
        qualityScore: {
          overall: 1.5, // Invalid
          sharpness: 0.9,
          exposure: 0.8,
          colorBalance: 0.75,
          noise: 0.95
        },
        syncStatus: SyncStatus.LOCAL_ONLY,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = validatePhoto(invalidPhoto);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('metadata.width must be at least 1');
      expect(result.errors).toContain('qualityScore.overall must be at most 1');
    });
  });
});