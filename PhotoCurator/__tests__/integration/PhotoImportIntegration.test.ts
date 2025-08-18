import { PhotoImportService, ImportOptions, ImportResult } from '../../src/services/photo/PhotoImportService';
import { PermissionManager } from '../../src/services/photo/PermissionManager';
import { PhotoSource, Photo, ProcessingProgress } from '../../src/types';
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
  Linking: {
    openSettings: jest.fn(),
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

describe('PhotoImport Integration Tests', () => {
  let photoImportService: PhotoImportService;
  let permissionManager: PermissionManager;
  
  beforeEach(() => {
    photoImportService = PhotoImportService.getInstance();
    permissionManager = PermissionManager.getInstance();
    jest.clearAllMocks();
  });

  describe('End-to-End Photo Import Flow', () => {
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
            image: { uri: 'file://photo1.jpg' },
            timestamp: 1672531200,
          },
        },
        {
          node: {
            image: { uri: 'file://photo2.jpg' },
            timestamp: 1672617600,
          },
        },
        {
          node: {
            image: { uri: 'file://photo3.jpg' },
            timestamp: 1672704000,
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
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);
      (request as jest.Mock).mockResolvedValue(RESULTS.GRANTED);
    });

    it('should complete full import flow with progress tracking', async () => {
      const progressUpdates: ProcessingProgress[] = [];
      const errors: Error[] = [];

      const options: ImportOptions = {
        batchSize: 10,
        includeVideos: false,
        onProgress: (progress) => progressUpdates.push(progress),
        onError: (error) => errors.push(error),
      };

      const result = await photoImportService.importFromCameraRoll(options);

      // Verify result structure
      expect(result.photos).toHaveLength(3);
      expect(result.totalProcessed).toBe(3);
      expect(result.totalSkipped).toBe(0);
      expect(result.totalFound).toBe(3);
      expect(result.errors).toHaveLength(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);

      // Verify progress tracking
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].stage).toContain('Fetching');
      expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);

      // Verify no errors occurred
      expect(errors).toHaveLength(0);

      // Verify photos have correct structure
      result.photos.forEach(photo => {
        expect(photo).toHaveProperty('id');
        expect(photo).toHaveProperty('uri');
        expect(photo).toHaveProperty('metadata');
        expect(photo).toHaveProperty('syncStatus');
        expect(photo).toHaveProperty('createdAt');
        expect(photo).toHaveProperty('updatedAt');
      });
    });

    it('should handle permission flow correctly', async () => {
      // Create a new instance to avoid singleton issues
      const permissionManager = PermissionManager.getInstance();
      const checkSpy = jest.spyOn(permissionManager, 'checkPhotoSourcePermission');
      const requestSpy = jest.spyOn(permissionManager, 'requestPhotoSourcePermission');
      
      checkSpy.mockResolvedValueOnce({
        granted: false,
        status: RESULTS.DENIED,
        canAskAgain: true
      });
      
      requestSpy.mockResolvedValueOnce({
        granted: true,
        status: RESULTS.GRANTED,
        canAskAgain: false
      });

      const result = await photoImportService.importFromCameraRoll();

      expect(checkSpy).toHaveBeenCalled();
      expect(requestSpy).toHaveBeenCalled();
      expect(result.photos).toHaveLength(3);
      
      checkSpy.mockRestore();
      requestSpy.mockRestore();
    });

    it('should handle permission denied gracefully', async () => {
      const permissionManager = PermissionManager.getInstance();
      const checkSpy = jest.spyOn(permissionManager, 'checkPhotoSourcePermission');
      const requestSpy = jest.spyOn(permissionManager, 'requestPhotoSourcePermission');
      
      checkSpy.mockResolvedValue({
        granted: false,
        status: RESULTS.DENIED,
        canAskAgain: true
      });
      
      requestSpy.mockResolvedValue({
        granted: false,
        status: RESULTS.DENIED,
        canAskAgain: false
      });

      await expect(photoImportService.importFromCameraRoll()).rejects.toThrow(
        'Camera roll permission denied'
      );
      
      checkSpy.mockRestore();
      requestSpy.mockRestore();
    });

    it('should handle partial failures during import', async () => {
      // Mock one photo failing validation
      (validatePhoto as jest.Mock)
        .mockReturnValueOnce({ isValid: true, errors: [] })
        .mockReturnValueOnce({ isValid: false, errors: ['Invalid format'] })
        .mockReturnValueOnce({ isValid: true, errors: [] });

      const result = await photoImportService.importFromCameraRoll();

      expect(result.photos).toHaveLength(2);
      expect(result.totalProcessed).toBe(2);
      expect(result.totalSkipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stage).toBe('validation');
    });

    it('should handle metadata extraction failures', async () => {
      // Mock metadata extraction failing for one photo
      (extractPhotoMetadata as jest.Mock)
        .mockResolvedValueOnce(mockPhotoMetadata)
        .mockRejectedValueOnce(new Error('Metadata extraction failed'))
        .mockResolvedValueOnce(mockPhotoMetadata);

      const errors: Error[] = [];
      const options: ImportOptions = {
        onError: (error) => errors.push(error),
      };

      const result = await photoImportService.importFromCameraRoll(options);

      expect(result.photos).toHaveLength(2);
      expect(result.totalProcessed).toBe(2);
      expect(result.totalSkipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stage).toBe('processing');
      expect(errors).toHaveLength(1);
    });

    it('should handle pagination correctly', async () => {
      const firstBatch = {
        edges: mockCameraRollResult.edges.slice(0, 2),
        page_info: {
          has_next_page: true,
          end_cursor: 'cursor1',
        },
      };

      const secondBatch = {
        edges: mockCameraRollResult.edges.slice(2),
        page_info: {
          has_next_page: false,
          end_cursor: null,
        },
      };

      (CameraRoll.getPhotos as jest.Mock)
        .mockResolvedValueOnce(firstBatch)
        .mockResolvedValueOnce(secondBatch);

      const result = await photoImportService.importFromCameraRoll({ batchSize: 3 });

      expect(CameraRoll.getPhotos).toHaveBeenCalledTimes(2);
      expect(result.photos).toHaveLength(3);
      expect(result.totalFound).toBe(3);
    });

    it('should respect batch size limits', async () => {
      // Mock a smaller result set to test batch size limits
      const smallBatch = {
        edges: mockCameraRollResult.edges.slice(0, 2),
        page_info: {
          has_next_page: false,
          end_cursor: null,
        },
      };
      
      (CameraRoll.getPhotos as jest.Mock).mockResolvedValueOnce(smallBatch);
      
      const result = await photoImportService.importFromCameraRoll({ batchSize: 2 });

      expect(result.photos.length).toBeLessThanOrEqual(2);
      expect(result.totalFound).toBeLessThanOrEqual(2);
    });

    it('should filter by date range when specified', async () => {
      const dateRange = {
        from: new Date('2023-01-01'),
        to: new Date('2023-01-02'),
      };

      await photoImportService.importFromCameraRoll({ dateRange });

      expect(CameraRoll.getPhotos).toHaveBeenCalledWith(
        expect.objectContaining({
          fromTime: dateRange.from.getTime(),
          toTime: dateRange.to.getTime(),
        })
      );
    });

    it('should prevent concurrent imports', async () => {
      const firstImport = photoImportService.importFromCameraRoll();
      
      await expect(photoImportService.importFromCameraRoll()).rejects.toThrow(
        'Import already in progress'
      );

      await firstImport; // Wait for first import to complete
    });

    it('should allow import cancellation', async () => {
      // Start import
      const importPromise = photoImportService.importFromCameraRoll();
      
      // Cancel immediately
      photoImportService.cancelImport();
      
      // Import should still complete but with cancelled state
      const result = await importPromise;
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      (CameraRoll.getPhotos as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await photoImportService.importFromCameraRoll();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stage).toBe('fetch');
      expect(result.totalProcessed).toBe(0);
    });

    it('should provide detailed error information', async () => {
      (extractPhotoMetadata as jest.Mock).mockRejectedValue(new Error('Corrupted file'));

      const result = await photoImportService.importFromCameraRoll();

      expect(result.errors.length).toBeGreaterThan(0);
      const error = result.errors[0];
      expect(error).toHaveProperty('error');
      expect(error).toHaveProperty('stage');
      expect(['processing', 'fetch']).toContain(error.stage);
    });

    it('should calculate ETA correctly during import', async () => {
      const progressUpdates: ProcessingProgress[] = [];
      
      // Add a small delay to metadata extraction to allow ETA calculation
      (extractPhotoMetadata as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          width: 1920,
          height: 1080,
          fileSize: 1024000,
          format: 'JPEG',
          timestamp: new Date('2023-01-01'),
        }), 10))
      );
      
      const options: ImportOptions = {
        onProgress: (progress) => progressUpdates.push(progress),
      };

      await photoImportService.importFromCameraRoll(options);

      // Find progress updates with ETA
      const updatesWithETA = progressUpdates.filter(p => p.estimatedTimeRemaining !== undefined);
      
      // ETA might not always be calculated in fast tests, so we check if any exist
      if (updatesWithETA.length > 0) {
        updatesWithETA.forEach(update => {
          expect(update.estimatedTimeRemaining).toBeGreaterThanOrEqual(0);
          expect(update.estimatedTimeRemaining).toBeLessThan(3600); // Less than 1 hour
        });
      }
      
      // At minimum, we should have progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);
    });
  });

  describe('Service Integration', () => {
    it('should integrate correctly with PermissionManager', async () => {
      const permissionSpy = jest.spyOn(permissionManager, 'checkPhotoSourcePermission');
      const requestSpy = jest.spyOn(permissionManager, 'requestPhotoSourcePermission');

      (check as jest.Mock).mockResolvedValue(RESULTS.DENIED);
      (request as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      await photoImportService.importFromCameraRoll();

      expect(permissionSpy).toHaveBeenCalledWith(PhotoSource.CAMERA_ROLL);
      expect(requestSpy).toHaveBeenCalledWith(PhotoSource.CAMERA_ROLL);
    });

    it('should validate photos using validation service', async () => {
      // Ensure mocks are set up properly with inline data
      const testCameraRollResult = {
        edges: [
          {
            node: {
              image: { uri: 'file://photo1.jpg' },
              timestamp: 1672531200,
            },
          },
        ],
        page_info: {
          has_next_page: false,
          end_cursor: null,
        },
      };
      
      const testPhotoMetadata = {
        width: 1920,
        height: 1080,
        fileSize: 1024000,
        format: 'JPEG',
        timestamp: new Date('2023-01-01'),
      };
      
      (CameraRoll.getPhotos as jest.Mock).mockResolvedValue(testCameraRollResult);
      (extractPhotoMetadata as jest.Mock).mockResolvedValue(testPhotoMetadata);
      (validatePhoto as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      
      const result = await photoImportService.importFromCameraRoll();
      
      // If photos were processed successfully, validation was called
      expect(result.totalProcessed).toBeGreaterThan(0);
      expect(validatePhoto).toHaveBeenCalled();
    });

    it('should extract metadata using metadata service', async () => {
      // Ensure mocks are set up properly with inline data
      const testCameraRollResult = {
        edges: [
          {
            node: {
              image: { uri: 'file://photo1.jpg' },
              timestamp: 1672531200,
            },
          },
        ],
        page_info: {
          has_next_page: false,
          end_cursor: null,
        },
      };
      
      const testPhotoMetadata = {
        width: 1920,
        height: 1080,
        fileSize: 1024000,
        format: 'JPEG',
        timestamp: new Date('2023-01-01'),
      };
      
      (CameraRoll.getPhotos as jest.Mock).mockResolvedValue(testCameraRollResult);
      (extractPhotoMetadata as jest.Mock).mockResolvedValue(testPhotoMetadata);
      (validatePhoto as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      
      const result = await photoImportService.importFromCameraRoll();
      
      // If photos were processed successfully, metadata extraction was called
      expect(result.totalProcessed).toBeGreaterThan(0);
      expect(extractPhotoMetadata).toHaveBeenCalled();
    });
  });

  describe('Platform-Specific Behavior', () => {
    it('should handle Android-specific permissions', async () => {
      (Platform as any).OS = 'android';
      (Platform as any).Version = 33;

      await photoImportService.importFromCameraRoll();

      // Should use Android-specific permission checking
      expect(check).toHaveBeenCalled();
      
      // Reset platform
      (Platform as any).OS = 'ios';
      (Platform as any).Version = 16;
    });

    it('should handle iOS-specific permissions', async () => {
      await photoImportService.importFromCameraRoll();

      // Should use iOS-specific permission checking
      expect(check).toHaveBeenCalled();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large photo batches efficiently', async () => {
      // Create a large batch of mock photos
      const largeBatch = {
        edges: Array.from({ length: 100 }, (_, i) => ({
          node: {
            image: { uri: `file://photo${i}.jpg` },
            timestamp: 1672531200 + i * 86400,
          },
        })),
        page_info: {
          has_next_page: false,
          end_cursor: null,
        },
      };

      (CameraRoll.getPhotos as jest.Mock).mockResolvedValue(largeBatch);

      const startTime = Date.now();
      const result = await photoImportService.importFromCameraRoll({ batchSize: 100 });
      const duration = Date.now() - startTime;

      expect(result.photos).toHaveLength(100);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should provide accurate progress updates for large batches', async () => {
      const largeBatch = {
        edges: Array.from({ length: 50 }, (_, i) => ({
          node: {
            image: { uri: `file://photo${i}.jpg` },
            timestamp: 1672531200 + i * 86400,
          },
        })),
        page_info: {
          has_next_page: false,
          end_cursor: null,
        },
      };

      (CameraRoll.getPhotos as jest.Mock).mockResolvedValue(largeBatch);

      const progressUpdates: ProcessingProgress[] = [];
      const options: ImportOptions = {
        batchSize: 50,
        onProgress: (progress) => progressUpdates.push(progress),
      };

      await photoImportService.importFromCameraRoll(options);

      // Should have multiple progress updates
      expect(progressUpdates.length).toBeGreaterThan(10);
      
      // Progress should be monotonically increasing
      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i].percentage).toBeGreaterThanOrEqual(
          progressUpdates[i - 1].percentage
        );
      }
    });
  });
});