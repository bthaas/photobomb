import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple EventEmitter implementation for React Native
class SimpleEventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(...args));
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

export interface OfflineModeConfig {
  enableAutoOfflineMode: boolean;
  offlineRetryInterval: number;
  maxOfflineQueueSize: number;
  gracefulDegradationFeatures: string[];
}

export interface OfflineCapability {
  feature: string;
  isAvailable: boolean;
  fallbackMessage?: string;
}

export class OfflineModeManager extends SimpleEventEmitter {
  private isOffline: boolean = false;
  private networkState: any = null;
  private config: OfflineModeConfig;
  private offlineCapabilities: Map<string, OfflineCapability> = new Map();
  private retryTimer?: NodeJS.Timeout;

  constructor(config?: Partial<OfflineModeConfig>) {
    super();
    
    this.config = {
      enableAutoOfflineMode: true,
      offlineRetryInterval: 30000, // 30 seconds
      maxOfflineQueueSize: 1000,
      gracefulDegradationFeatures: [
        'photo_sync',
        'cloud_backup',
        'user_authentication',
        'model_updates',
      ],
      ...config,
    };

    this.initializeOfflineCapabilities();
    this.setupNetworkMonitoring();
  }

  /**
   * Check if currently in offline mode
   */
  public isOfflineMode(): boolean {
    return this.isOffline;
  }

  /**
   * Get current network state
   */
  public getNetworkState(): any {
    return this.networkState;
  }

  /**
   * Manually enable offline mode
   */
  public async enableOfflineMode(): Promise<void> {
    if (!this.isOffline) {
      this.isOffline = true;
      await this.saveOfflineState(true);
      this.emit('offlineModeEnabled');
      this.startRetryTimer();
      console.log('📴 Offline mode enabled');
    }
  }

  /**
   * Manually disable offline mode
   */
  public async disableOfflineMode(): Promise<void> {
    if (this.isOffline) {
      this.isOffline = false;
      await this.saveOfflineState(false);
      this.emit('offlineModeDisabled');
      this.stopRetryTimer();
      console.log('📶 Offline mode disabled');
    }
  }

  /**
   * Check if a feature is available in offline mode
   */
  public isFeatureAvailable(feature: string): boolean {
    const capability = this.offlineCapabilities.get(feature);
    return capability ? capability.isAvailable : false;
  }

  /**
   * Get fallback message for unavailable feature
   */
  public getFeatureFallbackMessage(feature: string): string {
    const capability = this.offlineCapabilities.get(feature);
    return capability?.fallbackMessage || 'This feature is not available offline.';
  }

  /**
   * Get all offline capabilities
   */
  public getOfflineCapabilities(): OfflineCapability[] {
    return Array.from(this.offlineCapabilities.values());
  }

  /**
   * Update offline capability for a feature
   */
  public updateFeatureCapability(
    feature: string,
    isAvailable: boolean,
    fallbackMessage?: string
  ): void {
    this.offlineCapabilities.set(feature, {
      feature,
      isAvailable,
      fallbackMessage,
    });
    
    this.emit('capabilityUpdated', { feature, isAvailable, fallbackMessage });
  }

  /**
   * Handle graceful degradation for specific features
   */
  public async handleGracefulDegradation(feature: string): Promise<void> {
    if (this.config.gracefulDegradationFeatures.includes(feature)) {
      console.log(`🔄 Enabling graceful degradation for: ${feature}`);
      
      switch (feature) {
        case 'photo_sync':
          this.updateFeatureCapability(
            'photo_sync',
            false,
            'Photos will sync when connection is restored.'
          );
          break;
          
        case 'cloud_backup':
          this.updateFeatureCapability(
            'cloud_backup',
            false,
            'Backup will resume when online.'
          );
          break;
          
        case 'user_authentication':
          this.updateFeatureCapability(
            'user_authentication',
            true, // Can work with cached tokens
            'Using cached authentication.'
          );
          break;
          
        case 'model_updates':
          this.updateFeatureCapability(
            'model_updates',
            false,
            'AI model updates will download when online.'
          );
          break;
          
        default:
          this.updateFeatureCapability(
            feature,
            false,
            'Feature temporarily unavailable offline.'
          );
      }
      
      this.emit('gracefulDegradation', { feature });
    }
  }

  /**
   * Restore full functionality when coming back online
   */
  public async restoreFullFunctionality(): Promise<void> {
    console.log('🔄 Restoring full functionality...');
    
    // Re-enable all features
    for (const [feature] of this.offlineCapabilities) {
      this.updateFeatureCapability(feature, true);
    }
    
    this.emit('functionalityRestored');
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      this.networkState = state;
      
      if (this.config.enableAutoOfflineMode) {
        if (!state.isConnected && !this.isOffline) {
          this.enableOfflineMode();
        } else if (state.isConnected && this.isOffline) {
          this.disableOfflineMode();
          this.restoreFullFunctionality();
        }
      }
      
      this.emit('networkStateChanged', state);
    });
  }

  /**
   * Initialize default offline capabilities
   */
  private initializeOfflineCapabilities(): void {
    const defaultCapabilities: OfflineCapability[] = [
      {
        feature: 'photo_viewing',
        isAvailable: true,
        fallbackMessage: 'Viewing cached photos.',
      },
      {
        feature: 'photo_editing',
        isAvailable: true,
        fallbackMessage: 'Editing available with cached tools.',
      },
      {
        feature: 'ai_analysis',
        isAvailable: true,
        fallbackMessage: 'Using on-device AI models.',
      },
      {
        feature: 'photo_organization',
        isAvailable: true,
        fallbackMessage: 'Organization available locally.',
      },
      {
        feature: 'photo_sync',
        isAvailable: false,
        fallbackMessage: 'Sync will resume when online.',
      },
      {
        feature: 'cloud_backup',
        isAvailable: false,
        fallbackMessage: 'Backup will resume when online.',
      },
      {
        feature: 'user_authentication',
        isAvailable: true,
        fallbackMessage: 'Using cached authentication.',
      },
      {
        feature: 'model_updates',
        isAvailable: false,
        fallbackMessage: 'Updates will download when online.',
      },
    ];

    defaultCapabilities.forEach(capability => {
      this.offlineCapabilities.set(capability.feature, capability);
    });
  }

  /**
   * Start retry timer to check for connectivity
   */
  private startRetryTimer(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
    }

    this.retryTimer = setInterval(async () => {
      const state = await NetInfo.fetch();
      if (state.isConnected) {
        await this.disableOfflineMode();
        await this.restoreFullFunctionality();
      }
    }, this.config.offlineRetryInterval);
  }

  /**
   * Stop retry timer
   */
  private stopRetryTimer(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = undefined;
    }
  }

  /**
   * Save offline state to storage
   */
  private async saveOfflineState(isOffline: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem('offline_mode_state', JSON.stringify({
        isOffline,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Failed to save offline state:', error);
    }
  }

  /**
   * Load offline state from storage
   */
  public async loadOfflineState(): Promise<void> {
    try {
      const stateData = await AsyncStorage.getItem('offline_mode_state');
      if (stateData) {
        const { isOffline } = JSON.parse(stateData);
        this.isOffline = isOffline;
        
        if (isOffline) {
          this.startRetryTimer();
        }
      }
    } catch (error) {
      console.error('Failed to load offline state:', error);
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopRetryTimer();
    this.removeAllListeners();
  }
}