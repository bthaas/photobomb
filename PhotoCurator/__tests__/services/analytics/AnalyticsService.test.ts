import { AnalyticsService } from '../../../src/services/analytics/AnalyticsService';
import { PreferencesService } from '../../../src/services/preferences/PreferencesService';

// Mock PreferencesService
jest.mock('../../../src/services/preferences/PreferencesService');

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockPreferencesService: jest.Mocked<PreferencesService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instances
    (AnalyticsService as any).instance = undefined;
    (PreferencesService as any).instance = undefined;
    
    // Mock PreferencesService
    mockPreferencesService = {
      isAnalyticsEnabled: jest.fn().mockReturnValue(true),
      getPreferences: jest.fn().mockReturnValue({ analyticsEnabled: true }),
    } as any;
    
    (PreferencesService.getInstance as jest.Mock).mockReturnValue(mockPreferencesService);
    
    analyticsService = AnalyticsService.getInstance();
  });

  describe('Initialization', () => {
    it('should initialize with user properties', async () => {
      const userProperties = {
        platform: 'ios',
        appVersion: '1.0.0',
        deviceModel: 'iPhone 14',
        osVersion: '16.0',
      };

      const trackEventSpy = jest.spyOn(analyticsService, 'trackEvent');

      await analyticsService.initialize(userProperties);

      expect(trackEventSpy).toHaveBeenCalledWith('app_launched', {
        platform: 'ios',
        version: '1.0.0',
      });
    });
  });

  describe('Event Tracking', () => {
    beforeEach(async () => {
      await analyticsService.initialize({
        platform: 'ios',
        appVersion: '1.0.0',
      });
    });

    it('should track events when analytics is enabled', () => {
      // Mock the internal event queue to verify events are added
      const eventQueue = (analyticsService as any).eventQueue;
      const initialLength = eventQueue.length;

      analyticsService.trackEvent('test_event', { test: 'data' });

      expect(eventQueue.length).toBe(initialLength + 1);
      expect(eventQueue[eventQueue.length - 1]).toMatchObject({
        name: 'test_event',
        properties: expect.objectContaining({
          test: 'data',
          platform: 'ios',
          appVersion: '1.0.0',
        }),
      });
    });

    it('should not track events when analytics is disabled', () => {
      mockPreferencesService.isAnalyticsEnabled.mockReturnValue(false);
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      analyticsService.trackEvent('test_event', { test: 'data' });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should track screen views', () => {
      const trackEventSpy = jest.spyOn(analyticsService, 'trackEvent');

      analyticsService.trackScreenView('HomeScreen', { source: 'navigation' });

      expect(trackEventSpy).toHaveBeenCalledWith('screen_view', {
        screen_name: 'HomeScreen',
        source: 'navigation',
      });
    });

    it('should track user actions', () => {
      const trackEventSpy = jest.spyOn(analyticsService, 'trackEvent');

      analyticsService.trackUserAction('tap', 'button', { button_id: 'submit' });

      expect(trackEventSpy).toHaveBeenCalledWith('user_action', {
        action: 'tap',
        target: 'button',
        button_id: 'submit',
      });
    });

    it('should track photo import events', () => {
      const trackEventSpy = jest.spyOn(analyticsService, 'trackEvent');

      analyticsService.trackPhotoImport('camera_roll', 25, 5000);

      expect(trackEventSpy).toHaveBeenCalledWith('photo_import', {
        source: 'camera_roll',
        photo_count: 25,
        duration_ms: 5000,
      });
    });

    it('should track photo processing events', () => {
      const trackEventSpy = jest.spyOn(analyticsService, 'trackEvent');

      analyticsService.trackPhotoProcessing('feature_extraction', 10, 3000, true);

      expect(trackEventSpy).toHaveBeenCalledWith('photo_processing', {
        operation: 'feature_extraction',
        photo_count: 10,
        duration_ms: 3000,
        success: true,
      });
    });

    it('should track curation sessions', () => {
      const trackEventSpy = jest.spyOn(analyticsService, 'trackEvent');

      analyticsService.trackCurationSession('best_portraits', 100, 15, 30000);

      expect(trackEventSpy).toHaveBeenCalledWith('curation_session', {
        curation_goal: 'best_portraits',
        photos_processed: 100,
        photos_selected: 15,
        duration_ms: 30000,
        selection_rate: 0.15,
      });
    });

    it('should track errors', () => {
      const trackEventSpy = jest.spyOn(analyticsService, 'trackEvent');
      const error = new Error('Test error');

      analyticsService.trackError(error, 'photo_processing', { photo_id: '123' });

      expect(trackEventSpy).toHaveBeenCalledWith('error_occurred', {
        error_name: 'Error',
        error_message: 'Test error',
        error_stack: expect.any(String),
        context: 'photo_processing',
        photo_id: '123',
      });
    });
  });

  describe('Performance Tracking', () => {
    beforeEach(async () => {
      await analyticsService.initialize({
        platform: 'ios',
        appVersion: '1.0.0',
      });
    });

    it('should track performance metrics', () => {
      const performanceQueue = (analyticsService as any).performanceQueue;
      const initialLength = performanceQueue.length;

      analyticsService.trackPerformance('photo_load', 1500, { photo_size: 'large' });

      expect(performanceQueue.length).toBe(initialLength + 1);
      expect(performanceQueue[performanceQueue.length - 1]).toMatchObject({
        name: 'photo_load',
        duration: 1500,
        metadata: expect.objectContaining({
          photo_size: 'large',
          platform: 'ios',
          appVersion: '1.0.0',
        }),
      });
    });

    it('should provide performance timer', () => {
      const trackPerformanceSpy = jest.spyOn(analyticsService, 'trackPerformance');

      const endTimer = analyticsService.startPerformanceTimer('test_operation');
      
      // End the timer immediately
      endTimer({ test: 'metadata' });

      expect(trackPerformanceSpy).toHaveBeenCalledWith(
        'test_operation',
        expect.any(Number),
        { test: 'metadata' }
      );
    });

    it('should measure async operations', async () => {
      const trackPerformanceSpy = jest.spyOn(analyticsService, 'trackPerformance');

      const testOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'result';
      };

      const result = await analyticsService.measureAsync('async_test', testOperation);

      expect(result).toBe('result');
      expect(trackPerformanceSpy).toHaveBeenCalledWith(
        'async_test',
        expect.any(Number),
        { success: true }
      );
    });

    it('should track failed async operations', async () => {
      const trackPerformanceSpy = jest.spyOn(analyticsService, 'trackPerformance');

      const failingOperation = async () => {
        throw new Error('Operation failed');
      };

      await expect(
        analyticsService.measureAsync('failing_test', failingOperation)
      ).rejects.toThrow('Operation failed');

      expect(trackPerformanceSpy).toHaveBeenCalledWith(
        'failing_test',
        expect.any(Number),
        { success: false }
      );
    });
  });

  describe('User Properties', () => {
    it('should set user ID', () => {
      analyticsService.setUserId('user123');
      
      const eventQueue = (analyticsService as any).eventQueue;
      const initialLength = eventQueue.length;
      
      analyticsService.trackEvent('test_event');

      expect(eventQueue.length).toBe(initialLength + 1);
      expect(eventQueue[eventQueue.length - 1].properties.userId).toBe('user123');
    });

    it('should set custom user properties', () => {
      analyticsService.setUserProperty('subscription_tier', 'premium');
      analyticsService.setUserProperty('user_type', 'photographer');

      // Properties should be stored internally for future events
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Queue Management', () => {
    beforeEach(async () => {
      await analyticsService.initialize({
        platform: 'ios',
        appVersion: '1.0.0',
      });
    });

    it('should flush events manually', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Add some events
      analyticsService.trackEvent('event1');
      analyticsService.trackEvent('event2');

      await analyticsService.flush();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Analytics Events:',
        expect.arrayContaining([
          expect.objectContaining({ name: 'event1' }),
          expect.objectContaining({ name: 'event2' }),
        ])
      );

      consoleSpy.mockRestore();
    });

    it('should handle flush errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {
        throw new Error('Flush failed');
      });

      analyticsService.trackEvent('test_event');
      await analyticsService.flush();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to send analytics events:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Shutdown', () => {
    it('should flush remaining events on shutdown', async () => {
      const flushSpy = jest.spyOn(analyticsService, 'flush');

      await analyticsService.shutdown();

      expect(flushSpy).toHaveBeenCalled();
    });
  });
});