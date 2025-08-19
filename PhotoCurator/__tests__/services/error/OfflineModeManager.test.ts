import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { OfflineModeManager } from '../../../src/services/error/OfflineModeManager';

// Mock dependencies
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('OfflineModeManager', () => {
  let offlineModeManager: OfflineModeManager;
  let mockNetInfoListener: jest.Mock;

  beforeEach(() => {
    mockNetInfoListener = jest.fn();
    (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
      mockNetInfoListener = callback;
      return jest.fn(); // unsubscribe function
    });
    
    offlineModeManager = new OfflineModeManager();
    jest.clearAllMocks();
  });

  afterEach(() => {
    offlineModeManager.destroy();
  });

  describe('offline mode management', () => {
    it('should enable offline mode manually', async () => {
      const offlineListener = jest.fn();
      offlineModeManager.on('offlineModeEnabled', offlineListener);
      
      await offlineModeManager.enableOfflineMode();
      
      expect(offlineModeManager.isOfflineMode()).toBe(true);
      expect(offlineListener).toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_mode_state',
        expect.stringContaining('"isOffline":true')
      );
    });

    it('should disable offline mode manually', async () => {
      await offlineModeManager.enableOfflineMode();
      
      const onlineListener = jest.fn();
      offlineModeManager.on('offlineModeDisabled', onlineListener);
      
      await offlineModeManager.disableOfflineMode();
      
      expect(offlineModeManager.isOfflineMode()).toBe(false);
      expect(onlineListener).toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_mode_state',
        expect.stringContaining('"isOffline":false')
      );
    });

    it('should automatically enable offline mode when network disconnects', async () => {
      const offlineListener = jest.fn();
      offlineModeManager.on('offlineModeEnabled', offlineListener);
      
      // Simulate network disconnection
      mockNetInfoListener({ isConnected: false });
      
      expect(offlineModeManager.isOfflineMode()).toBe(true);
      expect(offlineListener).toHaveBeenCalled();
    });

    it('should automatically disable offline mode when network reconnects', async () => {
      await offlineModeManager.enableOfflineMode();
      
      const onlineListener = jest.fn();
      const functionalityRestoredListener = jest.fn();
      offlineModeManager.on('offlineModeDisabled', onlineListener);
      offlineModeManager.on('functionalityRestored', functionalityRestoredListener);
      
      // Simulate network reconnection
      mockNetInfoListener({ isConnected: true });
      
      expect(offlineModeManager.isOfflineMode()).toBe(false);
      expect(onlineListener).toHaveBeenCalled();
      expect(functionalityRestoredListener).toHaveBeenCalled();
    });
  });

  describe('feature availability', () => {
    it('should return correct feature availability', () => {
      expect(offlineModeManager.isFeatureAvailable('photo_viewing')).toBe(true);
      expect(offlineModeManager.isFeatureAvailable('photo_editing')).toBe(true);
      expect(offlineModeManager.isFeatureAvailable('ai_analysis')).toBe(true);
      expect(offlineModeManager.isFeatureAvailable('photo_sync')).toBe(false);
      expect(offlineModeManager.isFeatureAvailable('cloud_backup')).toBe(false);
    });

    it('should return fallback messages for unavailable features', () => {
      const syncMessage = offlineModeManager.getFeatureFallbackMessage('photo_sync');
      const backupMessage = offlineModeManager.getFeatureFallbackMessage('cloud_backup');
      
      expect(syncMessage).toBe('Sync will resume when online.');
      expect(backupMessage).toBe('Backup will resume when online.');
    });

    it('should update feature capabilities', () => {
      const capabilityListener = jest.fn();
      offlineModeManager.on('capabilityUpdated', capabilityListener);
      
      offlineModeManager.updateFeatureCapability(
        'custom_feature',
        false,
        'Custom feature unavailable'
      );
      
      expect(offlineModeManager.isFeatureAvailable('custom_feature')).toBe(false);
      expect(offlineModeManager.getFeatureFallbackMessage('custom_feature'))
        .toBe('Custom feature unavailable');
      expect(capabilityListener).toHaveBeenCalledWith({
        feature: 'custom_feature',
        isAvailable: false,
        fallbackMessage: 'Custom feature unavailable',
      });
    });

    it('should return all offline capabilities', () => {
      const capabilities = offlineModeManager.getOfflineCapabilities();
      
      expect(capabilities).toHaveLength(8);
      expect(capabilities.find(c => c.feature === 'photo_viewing')?.isAvailable).toBe(true);
      expect(capabilities.find(c => c.feature === 'photo_sync')?.isAvailable).toBe(false);
    });
  });

  describe('graceful degradation', () => {
    it('should handle graceful degradation for supported features', async () => {
      const degradationListener = jest.fn();
      offlineModeManager.on('gracefulDegradation', degradationListener);
      
      await offlineModeManager.handleGracefulDegradation('photo_sync');
      
      expect(offlineModeManager.isFeatureAvailable('photo_sync')).toBe(false);
      expect(degradationListener).toHaveBeenCalledWith({ feature: 'photo_sync' });
    });

    it('should handle graceful degradation for user authentication', async () => {
      await offlineModeManager.handleGracefulDegradation('user_authentication');
      
      expect(offlineModeManager.isFeatureAvailable('user_authentication')).toBe(true);
      expect(offlineModeManager.getFeatureFallbackMessage('user_authentication'))
        .toBe('Using cached authentication.');
    });

    it('should restore full functionality when coming back online', async () => {
      await offlineModeManager.handleGracefulDegradation('photo_sync');
      expect(offlineModeManager.isFeatureAvailable('photo_sync')).toBe(false);
      
      const functionalityListener = jest.fn();
      offlineModeManager.on('functionalityRestored', functionalityListener);
      
      await offlineModeManager.restoreFullFunctionality();
      
      expect(offlineModeManager.isFeatureAvailable('photo_sync')).toBe(true);
      expect(functionalityListener).toHaveBeenCalled();
    });
  });

  describe('persistence', () => {
    it('should save offline state to storage', async () => {
      await offlineModeManager.enableOfflineMode();
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_mode_state',
        expect.stringContaining('"isOffline":true')
      );
    });

    it('should load offline state from storage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        isOffline: true,
        timestamp: new Date().toISOString(),
      }));
      
      await offlineModeManager.loadOfflineState();
      
      expect(offlineModeManager.isOfflineMode()).toBe(true);
    });

    it('should handle missing offline state gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      await offlineModeManager.loadOfflineState();
      
      expect(offlineModeManager.isOfflineMode()).toBe(false);
    });
  });

  describe('retry mechanism', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start retry timer when offline mode is enabled', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });
      
      await offlineModeManager.enableOfflineMode();
      
      // Fast-forward time
      jest.advanceTimersByTime(30000);
      
      expect(NetInfo.fetch).toHaveBeenCalled();
    });

    it('should disable offline mode when retry detects connectivity', async () => {
      await offlineModeManager.enableOfflineMode();
      
      const onlineListener = jest.fn();
      offlineModeManager.on('offlineModeDisabled', onlineListener);
      
      // Mock network coming back online
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
      
      // Fast-forward time to trigger retry
      jest.advanceTimersByTime(30000);
      
      // Wait for async operations
      await Promise.resolve();
      
      expect(offlineModeManager.isOfflineMode()).toBe(false);
      expect(onlineListener).toHaveBeenCalled();
    });

    it('should stop retry timer when offline mode is disabled', async () => {
      await offlineModeManager.enableOfflineMode();
      await offlineModeManager.disableOfflineMode();
      
      (NetInfo.fetch as jest.Mock).mockClear();
      
      // Fast-forward time
      jest.advanceTimersByTime(30000);
      
      expect(NetInfo.fetch).not.toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customManager = new OfflineModeManager({
        enableAutoOfflineMode: false,
        offlineRetryInterval: 60000,
        maxOfflineQueueSize: 500,
        gracefulDegradationFeatures: ['custom_feature'],
      });
      
      // Test that custom config is applied
      expect(customManager.isOfflineMode()).toBe(false);
      
      customManager.destroy();
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources when destroyed', () => {
      const removeListenersSpy = jest.spyOn(offlineModeManager, 'removeAllListeners');
      
      offlineModeManager.destroy();
      
      expect(removeListenersSpy).toHaveBeenCalled();
    });
  });
});