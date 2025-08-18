import { Platform, Alert, Linking } from 'react-native';
import { 
  check, 
  request, 
  PERMISSIONS, 
  RESULTS, 
  Permission,
  PermissionStatus 
} from 'react-native-permissions';
import { PhotoSource } from '../../types';

export interface PermissionResult {
  granted: boolean;
  status: PermissionStatus;
  canAskAgain: boolean;
}

export interface PermissionConfig {
  title: string;
  message: string;
  buttonPositive?: string;
  buttonNegative?: string;
}

export class PermissionManager {
  private static instance: PermissionManager;
  
  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * Request permission for photo source
   */
  async requestPhotoSourcePermission(source: PhotoSource): Promise<PermissionResult> {
    switch (source) {
      case PhotoSource.CAMERA_ROLL:
        return this.requestPhotoLibraryPermission();
      case PhotoSource.GOOGLE_PHOTOS:
        return this.requestGooglePhotosPermission();
      case PhotoSource.ICLOUD:
        return this.requestiCloudPermission();
      default:
        return {
          granted: false,
          status: RESULTS.DENIED,
          canAskAgain: false
        };
    }
  }

  /**
   * Check permission status for photo source
   */
  async checkPhotoSourcePermission(source: PhotoSource): Promise<PermissionResult> {
    switch (source) {
      case PhotoSource.CAMERA_ROLL:
        return this.checkPhotoLibraryPermission();
      case PhotoSource.GOOGLE_PHOTOS:
        return this.checkGooglePhotosPermission();
      case PhotoSource.ICLOUD:
        return this.checkiCloudPermission();
      default:
        return {
          granted: false,
          status: RESULTS.DENIED,
          canAskAgain: false
        };
    }
  }

  /**
   * Request photo library permission
   */
  private async requestPhotoLibraryPermission(): Promise<PermissionResult> {
    const permission = this.getPhotoLibraryPermission();
    
    if (!permission) {
      return {
        granted: false,
        status: RESULTS.UNAVAILABLE,
        canAskAgain: false
      };
    }

    try {
      // Check current status first
      const currentStatus = await check(permission);
      
      if (currentStatus === RESULTS.GRANTED) {
        return {
          granted: true,
          status: currentStatus,
          canAskAgain: false
        };
      }

      if (currentStatus === RESULTS.BLOCKED) {
        // Show alert to go to settings
        this.showPermissionBlockedAlert({
          title: 'Photo Library Access Required',
          message: 'Please enable photo library access in Settings to import your photos.',
        });
        
        return {
          granted: false,
          status: currentStatus,
          canAskAgain: false
        };
      }

      // Request permission
      const result = await request(permission);
      
      return {
        granted: result === RESULTS.GRANTED,
        status: result,
        canAskAgain: result !== RESULTS.BLOCKED
      };
      
    } catch (error) {
      console.error('Error requesting photo library permission:', error);
      return {
        granted: false,
        status: RESULTS.DENIED,
        canAskAgain: true
      };
    }
  }

  /**
   * Check photo library permission status
   */
  private async checkPhotoLibraryPermission(): Promise<PermissionResult> {
    const permission = this.getPhotoLibraryPermission();
    
    if (!permission) {
      return {
        granted: false,
        status: RESULTS.UNAVAILABLE,
        canAskAgain: false
      };
    }

    try {
      const status = await check(permission);
      
      return {
        granted: status === RESULTS.GRANTED,
        status,
        canAskAgain: status !== RESULTS.BLOCKED
      };
      
    } catch (error) {
      console.error('Error checking photo library permission:', error);
      return {
        granted: false,
        status: RESULTS.DENIED,
        canAskAgain: true
      };
    }
  }

  /**
   * Request Google Photos permission (placeholder)
   */
  private async requestGooglePhotosPermission(): Promise<PermissionResult> {
    // TODO: Implement Google Photos OAuth flow
    return {
      granted: false,
      status: RESULTS.UNAVAILABLE,
      canAskAgain: false
    };
  }

  /**
   * Check Google Photos permission (placeholder)
   */
  private async checkGooglePhotosPermission(): Promise<PermissionResult> {
    // TODO: Check Google Photos authentication status
    return {
      granted: false,
      status: RESULTS.UNAVAILABLE,
      canAskAgain: false
    };
  }

  /**
   * Request iCloud permission (placeholder)
   */
  private async requestiCloudPermission(): Promise<PermissionResult> {
    // TODO: Implement iCloud authentication
    return {
      granted: false,
      status: RESULTS.UNAVAILABLE,
      canAskAgain: false
    };
  }

  /**
   * Check iCloud permission (placeholder)
   */
  private async checkiCloudPermission(): Promise<PermissionResult> {
    // TODO: Check iCloud authentication status
    return {
      granted: false,
      status: RESULTS.UNAVAILABLE,
      canAskAgain: false
    };
  }

  /**
   * Get appropriate photo library permission for platform
   */
  private getPhotoLibraryPermission(): Permission | null {
    if (Platform.OS === 'ios') {
      return PERMISSIONS.IOS.PHOTO_LIBRARY;
    } else if (Platform.OS === 'android') {
      // Use appropriate permission based on Android version
      if (Platform.Version >= 33) {
        return PERMISSIONS.ANDROID.READ_MEDIA_IMAGES;
      } else {
        return PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
      }
    }
    return null;
  }

  /**
   * Show alert when permission is blocked
   */
  private showPermissionBlockedAlert(config: PermissionConfig): void {
    Alert.alert(
      config.title,
      config.message,
      [
        {
          text: config.buttonNegative || 'Cancel',
          style: 'cancel'
        },
        {
          text: config.buttonPositive || 'Open Settings',
          onPress: () => Linking.openSettings()
        }
      ]
    );
  }

  /**
   * Show permission rationale alert
   */
  showPermissionRationale(source: PhotoSource): Promise<boolean> {
    return new Promise((resolve) => {
      const config = this.getPermissionRationaleConfig(source);
      
      Alert.alert(
        config.title,
        config.message,
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Allow',
            onPress: () => resolve(true)
          }
        ]
      );
    });
  }

  /**
   * Get permission rationale configuration
   */
  private getPermissionRationaleConfig(source: PhotoSource): PermissionConfig {
    switch (source) {
      case PhotoSource.CAMERA_ROLL:
        return {
          title: 'Photo Library Access',
          message: 'PhotoCurator needs access to your photo library to import and organize your photos. Your photos will be processed locally on your device for privacy.'
        };
      case PhotoSource.GOOGLE_PHOTOS:
        return {
          title: 'Google Photos Access',
          message: 'PhotoCurator needs access to your Google Photos to import your cloud photos. You can revoke this access at any time.'
        };
      case PhotoSource.ICLOUD:
        return {
          title: 'iCloud Photos Access',
          message: 'PhotoCurator needs access to your iCloud Photos to import your cloud photos. You can revoke this access at any time.'
        };
      default:
        return {
          title: 'Permission Required',
          message: 'PhotoCurator needs permission to access your photos.'
        };
    }
  }

  /**
   * Check if all required permissions are granted
   */
  async checkAllRequiredPermissions(): Promise<{ [key in PhotoSource]: PermissionResult }> {
    const results = {} as { [key in PhotoSource]: PermissionResult };
    
    for (const source of Object.values(PhotoSource)) {
      results[source] = await this.checkPhotoSourcePermission(source);
    }
    
    return results;
  }

  /**
   * Request all required permissions
   */
  async requestAllRequiredPermissions(): Promise<{ [key in PhotoSource]: PermissionResult }> {
    const results = {} as { [key in PhotoSource]: PermissionResult };
    
    for (const source of Object.values(PhotoSource)) {
      results[source] = await this.requestPhotoSourcePermission(source);
    }
    
    return results;
  }
}

export default PermissionManager;