/**
 * Unit tests for photo metadata utilities
 */

import {
  extractPhotoMetadata,
  parseExifDateTime,
  formatExifDateTime,
  calculateAspectRatio,
  isPortrait,
  isLandscape,
  isSquare,
  getOrientation,
  calculateMegapixels,
  formatFileSize,
  getCameraSettings,
  updatePhotoMetadata,
  getImageFormat,
} from '../../src/utils/photoMetadata';
import { PhotoMetadata, ExifData } from '../../src/types';

// Note: In real implementation, these would be actual native modules
// For testing, we're using the mock implementations in the utility functions

describe('Photo Metadata Utilities', () => {
  describe('parseExifDateTime', () => {
    it('should parse valid EXIF date/time string', () => {
      const exifDateTime = '2023:12:25 14:30:45';
      const result = parseExifDateTime(exifDateTime);
      
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2023);
      expect(result?.getMonth()).toBe(11); // December (0-indexed)
      expect(result?.getDate()).toBe(25);
      expect(result?.getHours()).toBe(14);
      expect(result?.getMinutes()).toBe(30);
      expect(result?.getSeconds()).toBe(45);
    });

    it('should return null for invalid date string', () => {
      expect(parseExifDateTime('invalid-date')).toBeNull();
      expect(parseExifDateTime('')).toBeNull();
      expect(parseExifDateTime('2023:13:45 25:70:80')).toBeNull();
    });
  });

  describe('formatExifDateTime', () => {
    it('should format date to EXIF format', () => {
      const date = new Date(2023, 11, 25, 14, 30, 45); // December 25, 2023 14:30:45
      const result = formatExifDateTime(date);
      
      expect(result).toBe('2023:12:25 14:30:45');
    });

    it('should pad single digits with zeros', () => {
      const date = new Date(2023, 0, 5, 9, 5, 3); // January 5, 2023 09:05:03
      const result = formatExifDateTime(date);
      
      expect(result).toBe('2023:01:05 09:05:03');
    });
  });

  describe('calculateAspectRatio', () => {
    it('should calculate correct aspect ratio', () => {
      const metadata: PhotoMetadata = {
        width: 1920,
        height: 1080,
        fileSize: 2048000,
        format: 'jpeg',
        timestamp: new Date()
      };
      
      expect(calculateAspectRatio(metadata)).toBeCloseTo(1.7778, 3);
    });

    it('should handle zero height', () => {
      const metadata: PhotoMetadata = {
        width: 1920,
        height: 0,
        fileSize: 2048000,
        format: 'jpeg',
        timestamp: new Date()
      };
      
      expect(calculateAspectRatio(metadata)).toBe(1);
    });
  });

  describe('Orientation helpers', () => {
    const portraitMetadata: PhotoMetadata = {
      width: 1080,
      height: 1920,
      fileSize: 2048000,
      format: 'jpeg',
      timestamp: new Date()
    };

    const landscapeMetadata: PhotoMetadata = {
      width: 1920,
      height: 1080,
      fileSize: 2048000,
      format: 'jpeg',
      timestamp: new Date()
    };

    const squareMetadata: PhotoMetadata = {
      width: 1080,
      height: 1080,
      fileSize: 2048000,
      format: 'jpeg',
      timestamp: new Date()
    };

    describe('isPortrait', () => {
      it('should identify portrait orientation', () => {
        expect(isPortrait(portraitMetadata)).toBe(true);
        expect(isPortrait(landscapeMetadata)).toBe(false);
        expect(isPortrait(squareMetadata)).toBe(false);
      });
    });

    describe('isLandscape', () => {
      it('should identify landscape orientation', () => {
        expect(isLandscape(portraitMetadata)).toBe(false);
        expect(isLandscape(landscapeMetadata)).toBe(true);
        expect(isLandscape(squareMetadata)).toBe(false);
      });
    });

    describe('isSquare', () => {
      it('should identify square orientation', () => {
        expect(isSquare(portraitMetadata)).toBe(false);
        expect(isSquare(landscapeMetadata)).toBe(false);
        expect(isSquare(squareMetadata)).toBe(true);
      });
    });

    describe('getOrientation', () => {
      it('should return correct orientation string', () => {
        expect(getOrientation(portraitMetadata)).toBe('portrait');
        expect(getOrientation(landscapeMetadata)).toBe('landscape');
        expect(getOrientation(squareMetadata)).toBe('square');
      });
    });
  });

  describe('calculateMegapixels', () => {
    it('should calculate megapixels correctly', () => {
      const metadata: PhotoMetadata = {
        width: 4000,
        height: 3000,
        fileSize: 2048000,
        format: 'jpeg',
        timestamp: new Date()
      };
      
      expect(calculateMegapixels(metadata)).toBe(12); // 4000 * 3000 / 1,000,000
    });

    it('should handle small images', () => {
      const metadata: PhotoMetadata = {
        width: 800,
        height: 600,
        fileSize: 2048000,
        format: 'jpeg',
        timestamp: new Date()
      };
      
      expect(calculateMegapixels(metadata)).toBe(0.48); // 800 * 600 / 1,000,000
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(2560000)).toBe('2.44 MB');
    });
  });

  describe('getCameraSettings', () => {
    it('should format complete camera settings', () => {
      const exif: ExifData = {
        fNumber: 2.8,
        exposureTime: 0.008333, // 1/120
        iso: 200,
        focalLength: 85
      };
      
      const result = getCameraSettings(exif);
      expect(result).toBe('f/2.8 • 1/120s • ISO 200 • 85mm');
    });

    it('should handle partial EXIF data', () => {
      const exif: ExifData = {
        fNumber: 1.8,
        iso: 100
      };
      
      const result = getCameraSettings(exif);
      expect(result).toBe('f/1.8 • ISO 100');
    });

    it('should handle slow shutter speeds', () => {
      const exif: ExifData = {
        exposureTime: 2.5
      };
      
      const result = getCameraSettings(exif);
      expect(result).toBe('2.5s');
    });

    it('should return empty string for empty EXIF', () => {
      const result = getCameraSettings({});
      expect(result).toBe('');
    });
  });

  describe('getImageFormat', () => {
    it('should detect format from file extension', () => {
      expect(getImageFormat('photo.jpg')).toBe('jpeg');
      expect(getImageFormat('photo.jpeg')).toBe('jpeg');
      expect(getImageFormat('photo.png')).toBe('png');
      expect(getImageFormat('photo.gif')).toBe('gif');
      expect(getImageFormat('photo.webp')).toBe('webp');
      expect(getImageFormat('photo.heic')).toBe('heic');
      expect(getImageFormat('photo.unknown')).toBe('unknown');
    });

    it('should prefer MIME type over extension', () => {
      expect(getImageFormat('photo.jpg', 'image/png')).toBe('png');
      expect(getImageFormat('photo.unknown', 'image/jpeg')).toBe('jpeg');
    });

    it('should handle case insensitive extensions', () => {
      expect(getImageFormat('PHOTO.JPG')).toBe('jpeg');
      expect(getImageFormat('Photo.PNG')).toBe('png');
    });
  });

  describe('updatePhotoMetadata', () => {
    it('should merge metadata updates correctly', () => {
      const currentMetadata: PhotoMetadata = {
        width: 1920,
        height: 1080,
        fileSize: 2048000,
        format: 'jpeg',
        timestamp: new Date('2023-01-01'),
        exif: {
          make: 'Apple',
          model: 'iPhone 12'
        },
        location: {
          latitude: 37.7749,
          longitude: -122.4194
        }
      };

      const updates: Partial<PhotoMetadata> = {
        fileSize: 3072000,
        exif: {
          iso: 100
        },
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          altitude: 10
        }
      };

      const result = updatePhotoMetadata(currentMetadata, updates);

      expect(result.fileSize).toBe(3072000);
      expect(result.width).toBe(1920); // Unchanged
      expect(result.exif?.make).toBe('Apple'); // Preserved
      expect(result.exif?.iso).toBe(100); // Added
      expect(result.location?.latitude).toBe(40.7128); // Updated
      expect(result.location?.altitude).toBe(10); // Added
    });

    it('should handle null/undefined nested objects', () => {
      const currentMetadata: PhotoMetadata = {
        width: 1920,
        height: 1080,
        fileSize: 2048000,
        format: 'jpeg',
        timestamp: new Date()
      };

      const updates: Partial<PhotoMetadata> = {
        exif: {
          make: 'Canon'
        }
      };

      const result = updatePhotoMetadata(currentMetadata, updates);
      expect(result.exif?.make).toBe('Canon');
    });
  });

  describe('extractPhotoMetadata', () => {
    it('should extract metadata from URI', async () => {
      const uri = 'file://path/to/photo.jpg';
      
      // This is a mock test since we can't actually extract metadata in test environment
      const result = await extractPhotoMetadata(uri);
      
      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
      expect(result).toHaveProperty('fileSize');
      expect(result).toHaveProperty('format');
      expect(result).toHaveProperty('timestamp');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle extraction errors gracefully', async () => {
      const uri = 'invalid://uri';
      
      const result = await extractPhotoMetadata(uri);
      
      // The mock implementation still returns mock data, but in real implementation
      // this would return minimal metadata on error
      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
      expect(result).toHaveProperty('fileSize');
      expect(result).toHaveProperty('format');
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });
});