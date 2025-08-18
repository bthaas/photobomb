import { PermissionManager } from '../../src/services/photo/PermissionManager';
import { PhotoSource } from '../../src/types';
import { Platform, Alert, Linking } from 'react-native';

// Mock dependencies
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
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openSettings: jest.fn(),
  },
}));

import { check, request, RESULTS } from 'react-native-permissions';

describe('PermissionManager', () => {
  let permissionManager: PermissionManager;
  
  beforeEach(() => {
    permissionManager = PermissionManager.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = PermissionManager.getInstance();
      const instance2 = PermissionManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('requestPhotoSourcePermission', () => {
    describe('Camera Roll', () => {
      it('should return granted when permission is already granted', async () => {
        (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

        const result = await permissionManager.requestPhotoSourcePermission(PhotoSource.CAMERA_ROLL);

        expect(result.granted).toBe(true);
        expect(result.status).toBe(RESULTS.GRANTED);
        expect(result.canAskAgain).toBe(false);
        expect(request).not.toHaveBeenCalled();
      });

      it('should request permission when not granted', async () => {
        (check as jest.Mock).mockResolvedValue(RESULTS.DENIED);
        (request as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

        const result = await permissionManager.requestPhotoSourcePermission(PhotoSource.CAMERA_ROLL);

        expect(result.granted).toBe(true);
        expect(result.status).toBe(RESULTS.GRANTED);
        expect(request).toHaveBeenCalled();
      });

      it('should show settings alert when permission is blocked', async () => {
        (check as jest.Mock).mockResolvedValue(RESULTS.BLOCKED);

        const result = await permissionManager.requestPhotoSourcePermission(PhotoSource.CAMERA_ROLL);

        expect(result.granted).toBe(false);
        expect(result.status).toBe(RESULTS.BLOCKED);
        expect(result.canAskAgain).toBe(false);
        expect(Alert.alert).toHaveBeenCalledWith(
          'Photo Library Access Required',
          'Please enable photo library access in Settings to import your photos.',
          expect.any(Array)
        );
      });

      it('should handle permission request errors', async () => {
        (check as jest.Mock).mockRejectedValue(new Error('Permission check failed'));

        const result = await permissionManager.requestPhotoSourcePermission(PhotoSource.CAMERA_ROLL);

        expect(result.granted).toBe(false);
        expect(result.status).toBe(RESULTS.DENIED);
        expect(result.canAskAgain).toBe(true);
      });
    });

    describe('Google Photos', () => {
      it('should return unavailable for Google Photos', async () => {
        const result = await permissionManager.requestPhotoSourcePermission(PhotoSource.GOOGLE_PHOTOS);

        expect(result.granted).toBe(false);
        expect(result.status).toBe(RESULTS.UNAVAILABLE);
        expect(result.canAskAgain).toBe(false);
      });
    });

    describe('iCloud', () => {
      it('should return unavailable for iCloud', async () => {
        const result = await permissionManager.requestPhotoSourcePermission(PhotoSource.ICLOUD);

        expect(result.granted).toBe(false);
        expect(result.status).toBe(RESULTS.UNAVAILABLE);
        expect(result.canAskAgain).toBe(false);
      });
    });
  });

  describe('checkPhotoSourcePermission', () => {
    it('should check camera roll permission status', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const result = await permissionManager.checkPhotoSourcePermission(PhotoSource.CAMERA_ROLL);

      expect(result.granted).toBe(true);
      expect(result.status).toBe(RESULTS.GRANTED);
      expect(check).toHaveBeenCalled();
    });

    it('should handle permission check errors', async () => {
      (check as jest.Mock).mockRejectedValue(new Error('Check failed'));

      const result = await permissionManager.checkPhotoSourcePermission(PhotoSource.CAMERA_ROLL);

      expect(result.granted).toBe(false);
      expect(result.status).toBe(RESULTS.DENIED);
      expect(result.canAskAgain).toBe(true);
    });
  });

  describe('showPermissionRationale', () => {
    it('should show rationale alert for camera roll', async () => {
      const mockAlert = Alert.alert as jest.Mock;
      mockAlert.mockImplementation((title, message, buttons) => {
        // Simulate user pressing "Allow"
        buttons[1].onPress();
      });

      const result = await permissionManager.showPermissionRationale(PhotoSource.CAMERA_ROLL);

      expect(result).toBe(true);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Photo Library Access',
        expect.stringContaining('PhotoCurator needs access to your photo library'),
        expect.any(Array)
      );
    });

    it('should return false when user cancels rationale', async () => {
      const mockAlert = Alert.alert as jest.Mock;
      mockAlert.mockImplementation((title, message, buttons) => {
        // Simulate user pressing "Not Now"
        buttons[0].onPress();
      });

      const result = await permissionManager.showPermissionRationale(PhotoSource.CAMERA_ROLL);

      expect(result).toBe(false);
    });
  });

  describe('checkAllRequiredPermissions', () => {
    it('should check permissions for all photo sources', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const results = await permissionManager.checkAllRequiredPermissions();

      expect(results).toHaveProperty(PhotoSource.CAMERA_ROLL);
      expect(results).toHaveProperty(PhotoSource.GOOGLE_PHOTOS);
      expect(results).toHaveProperty(PhotoSource.ICLOUD);
      expect(results[PhotoSource.CAMERA_ROLL].granted).toBe(true);
    });
  });

  describe('requestAllRequiredPermissions', () => {
    it('should request permissions for all photo sources', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.DENIED);
      (request as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const results = await permissionManager.requestAllRequiredPermissions();

      expect(results).toHaveProperty(PhotoSource.CAMERA_ROLL);
      expect(results).toHaveProperty(PhotoSource.GOOGLE_PHOTOS);
      expect(results).toHaveProperty(PhotoSource.ICLOUD);
    });
  });

  describe('Platform-specific behavior', () => {
    it('should use correct Android permission for API 33+', async () => {
      (Platform as any).OS = 'android';
      (Platform as any).Version = 33;
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      await permissionManager.checkPhotoSourcePermission(PhotoSource.CAMERA_ROLL);

      // Should use READ_MEDIA_IMAGES for Android 33+
      expect(check).toHaveBeenCalledWith('android.permission.READ_MEDIA_IMAGES');
      
      // Reset platform
      (Platform as any).OS = 'ios';
      (Platform as any).Version = 16;
    });

    it('should use correct Android permission for API < 33', async () => {
      (Platform as any).OS = 'android';
      (Platform as any).Version = 32;
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      await permissionManager.checkPhotoSourcePermission(PhotoSource.CAMERA_ROLL);

      // Should use READ_EXTERNAL_STORAGE for Android < 33
      expect(check).toHaveBeenCalledWith('android.permission.READ_EXTERNAL_STORAGE');
      
      // Reset platform
      (Platform as any).OS = 'ios';
      (Platform as any).Version = 16;
    });

    it('should use iOS photo library permission', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      await permissionManager.checkPhotoSourcePermission(PhotoSource.CAMERA_ROLL);

      expect(check).toHaveBeenCalledWith('ios.permission.PHOTO_LIBRARY');
    });
  });
});