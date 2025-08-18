import { PhotoImportService, ImportOptions } from '../../src/services/photo/PhotoImportService';
import { PhotoSource, Photo } from '../../src/types';
import { Platform } from 'react-native';

// Mock dependencies
jest.mock('@react-native-camera-roll/camera-roll', () => ({
  CameraRoll: {
    getPhotos: jest.fn(),
  },
}));

jest.mock('react-native-permissions', () => ({
  check: jest.fn(),
  request: jest.fn(),
  PERMISSIONS: {
    IOS: {
      PHOTO_LIBRARY: 'ios.permission.PHOTO_LIBRARY',
    },
    ANDROID: {
      READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
      READ_MEDIA_IMAGES: 'android.permission.READ_MEDIA_IMAGES',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    UNAVAILABLE: 'unavailable',
  },
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: 16,
  },
  PermissionsAndroid: {
    PERMISSIONS: {
      READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
      READ_MEDIA_IMAGES: 'android.permission.READ_MEDIA_IMAGES',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
    },
    request: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('../../src/utils/photoMetadata', () => ({
  extractPhotoMetadata: jest.fn(),
}));

jest.mock('../../src/utils/validation', () => ({
  validatePhoto: jest.fn(),
}));

import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { check, request, RESULTS } from 'react-native-permissions';
import { extractPhotoMetadata } from '../../src/utils/photoMetadata';
import { validatePhoto } from '../../src/utils/validation';

describe('PhotoImportService', () => {
  let photoImportService: PhotoImportService;
  
  beforeEach(() => {
    photoImportService = PhotoImportService.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = PhotoImportService.getInstance();
      const instance2 = PhotoImportService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('importFromCameraRoll', () => {
    const mockPhotoMetadata = {
      width: 1920,
      height: 1080,
      fileSize: 1024000,
      format: 'JPEG',
      timestamp: new Date('2023-01-01'),
    };

    const mockCameraRollResult = {
      edges: [
        {
          node: {
            image: {
              uri: 'file://photo1.jpg',
            },
            timestamp: 1672531200, // 2023-01-01
          },
        },
        {
          node: {
            image: {
              uri: 'file://photo2.jpg',
            },
            timestamp: 1672617600, // 2023-01-02
          },
        },
      ],
      page_info: {
        has_next_page: false,
        end_cursor: null,
      },
    };

    beforeEach(() => {
      (CameraRoll.getPhotos as jest.Mock).mockResolvedValue(mockCameraRollResult);
      (extractPhotoMetadata as jest.Mock).mockResolvedValue(mockPhotoMetadata);
      (validatePhoto as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (request as jest.Mock).mockResolvedValue(RESULTS.GRANTED);
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);
    });

    it('should import photos from camera roll successfully', async () => {
      const options: ImportOptions = {
        batchSize: 50,
        includeVideos: false,
      };

      const result = await photoImportService.importFromCameraRoll(options);

      expect(result.photos).toHaveLength(2);
      expect(result.totalProcessed).toBe(2);
      expect(result.totalSkipped).toBe(0);
      expect(result.totalFound).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);

      // Verify photo structure
      const photo = result.photos[0];
      expect(photo.id).toBe('file://photo1.jpg');
      expect(photo.uri).toBe('file://photo1.jpg');
      expect(photo.metadata).toEqual(mockPhotoMetadata);
      expect(photo.syncStatus).toBe('local_only');
    });

    it('should call progress callback during import', async () => {
      const onProgress = jest.fn();
      const options: ImportOptions = {
        onProgress,
      };

      await photoImportService.importFromCameraRoll(options);

      expect(onProgress).toHaveBeenCalledTimes(5); // Updated for enhanced progress tracking
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          current: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number),
          stage: expect.any(String),
        })
      );
    });

    it('should handle validation errors', async () => {
      (validatePhoto as jest.Mock)
        .mockReturnValueOnce({ isValid: false, errors: ['Invalid format'] })
        .mockReturnValueOnce({ isValid: true, errors: [] });

      const result = await photoImportService.importFromCameraRoll();

      expect(result.photos).toHaveLength(1);
      expect(result.totalProcessed).toBe(1);
      expect(result.totalSkipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error.message).toContain('Invalid photo');
      expect(result.errors[0].stage).toBe('validation');
    });

    it('should handle metadata extraction errors', async () => {
      (extractPhotoMetadata as jest.Mock)
        .mockRejectedValueOnce(new Error('Metadata extraction failed'))
        .mockResolvedValueOnce(mockPhotoMetadata);

      const onError = jest.fn();
      const options: ImportOptions = { onError };

      const result = await photoImportService.importFromCameraRoll(options);

      expect(result.photos).toHaveLength(1);
      expect(result.totalProcessed).toBe(1);
      expect(result.totalSkipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stage).toBe('processing');
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should throw error when permission denied', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.DENIED);
      (request as jest.Mock).mockResolvedValue(RESULTS.DENIED);

      await expect(photoImportService.importFromCameraRoll()).rejects.toThrow(
        'Failed to import from camera roll: Camera roll permission denied'
      );
    });

    it('should filter by date range when provided', async () => {
      const options: ImportOptions = {
        dateRange: {
          from: new Date('2023-01-01'),
          to: new Date('2023-01-01'),
        },
      };

      await photoImportService.importFromCameraRoll(options);

      expect(CameraRoll.getPhotos).toHaveBeenCalledWith(
        expect.objectContaining({
          assetType: 'Photos',
          fromTime: new Date('2023-01-01').getTime(),
          toTime: new Date('2023-01-01').getTime(),
        })
      );
    });
  });

  describe('importFromGooglePhotos', () => {
    it('should throw not implemented error', async () => {
      const credentials = {
        accessToken: 'token',
        refreshToken: 'refresh',
      };

      await expect(
        photoImportService.importFromGooglePhotos(credentials)
      ).rejects.toThrow('Failed to import from Google Photos');
    });
  });

  describe('importFromiCloud', () => {
    it('should throw not implemented error', async () => {
      const credentials = {
        appleId: 'user@example.com',
        token: 'token',
      };

      await expect(
        photoImportService.importFromiCloud(credentials)
      ).rejects.toThrow('Failed to import from iCloud');
    });
  });

  describe('validatePermissions', () => {
    it('should validate camera roll permissions', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const result = await photoImportService.validatePermissions(PhotoSource.CAMERA_ROLL);

      expect(result).toBe(true);
      expect(check).toHaveBeenCalled();
    });

    it('should return false for unsupported sources', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.DENIED);
      
      const result = await photoImportService.validatePermissions(PhotoSource.GOOGLE_PHOTOS);
      expect(result).toBe(false);
    });
  });

  describe('getAvailablePhotoSources', () => {
    it('should return camera roll as available source', () => {
      const sources = photoImportService.getAvailablePhotoSources();
      expect(sources).toContain(PhotoSource.CAMERA_ROLL);
    });
  });

  describe('isPhotoSourceAvailable', () => {
    it('should return true for camera roll', async () => {
      const result = await photoImportService.isPhotoSourceAvailable(PhotoSource.CAMERA_ROLL);
      expect(result).toBe(true);
    });

    it('should return false for Google Photos', async () => {
      const result = await photoImportService.isPhotoSourceAvailable(PhotoSource.GOOGLE_PHOTOS);
      expect(result).toBe(false);
    });

    it('should return true for iCloud on iOS', async () => {
      const result = await photoImportService.isPhotoSourceAvailable(PhotoSource.ICLOUD);
      expect(result).toBe(true); // Platform.OS is mocked as 'ios'
    });

    it('should return false for iCloud on Android', async () => {
      (Platform as any).OS = 'android';
      
      const result = await photoImportService.isPhotoSourceAvailable(PhotoSource.ICLOUD);
      expect(result).toBe(false);
      
      // Reset platform
      (Platform as any).OS = 'ios';
    });
  });
});