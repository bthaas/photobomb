import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorReportingService, AnalyticsProvider } from '../../../src/services/error/ErrorReportingService';
import { NetworkError, ErrorSeverity } from '../../../src/types/error';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('ErrorReportingService', () => {
  let errorReportingService: ErrorReportingService;
  let mockAnalyticsProvider: jest.Mocked<AnalyticsProvider>;

  beforeEach(() => {
    errorReportingService = new ErrorReportingService();
    mockAnalyticsProvider = {
      reportError: jest.fn(),
      reportEvent: jest.fn(),
    };
    
    errorReportingService.addAnalyticsProvider(mockAnalyticsProvider);
    jest.clearAllMocks();
  });

  describe('reportError', () => {
    it('should report high severity errors to analytics providers', async () => {
      const error = new NetworkError('Connection failed', ErrorSeverity.HIGH);
      
      await errorReportingService.reportError(error);
      
      expect(mockAnalyticsProvider.reportError).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Connection failed',
            severity: ErrorSeverity.HIGH,
          }),
        })
      );
    });

    it('should not report low severity errors to analytics providers', async () => {
      const error = new NetworkError('Minor connection issue', ErrorSeverity.LOW);
      
      await errorReportingService.reportError(error);
      
      expect(mockAnalyticsProvider.reportError).not.toHaveBeenCalled();
    });

    it('should queue errors when offline', async () => {
      const error = new NetworkError('Connection failed', ErrorSeverity.HIGH);
      errorReportingService.setOnlineStatus(false);
      
      await errorReportingService.reportError(error);
      
      expect(mockAnalyticsProvider.reportError).not.toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'error_queue',
        expect.any(String)
      );
    });

    it('should include user ID and session ID in error reports', async () => {
      const error = new NetworkError('Connection failed', ErrorSeverity.HIGH);
      const userId = 'user123';
      
      errorReportingService.setUserId(userId);
      await errorReportingService.reportError(error);
      
      expect(mockAnalyticsProvider.reportError).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          context: expect.objectContaining({
            userId,
            sessionId: expect.any(String),
          }),
        })
      );
    });

    it('should handle analytics provider failures gracefully', async () => {
      const error = new NetworkError('Connection failed', ErrorSeverity.HIGH);
      mockAnalyticsProvider.reportError.mockRejectedValue(new Error('Analytics failed'));
      
      // Should not throw
      await expect(errorReportingService.reportError(error)).resolves.not.toThrow();
    });
  });

  describe('reportEvent', () => {
    it('should report events to analytics providers when online', async () => {
      const event = 'photo_imported';
      const properties = { count: 5, source: 'camera_roll' };
      
      await errorReportingService.reportEvent(event, properties);
      
      expect(mockAnalyticsProvider.reportEvent).toHaveBeenCalledWith(
        event,
        expect.objectContaining({
          ...properties,
          sessionId: expect.any(String),
          timestamp: expect.any(String),
        })
      );
    });

    it('should not report events when offline', async () => {
      errorReportingService.setOnlineStatus(false);
      
      await errorReportingService.reportEvent('test_event');
      
      expect(mockAnalyticsProvider.reportEvent).not.toHaveBeenCalled();
    });
  });

  describe('error queue management', () => {
    it('should flush queued errors when coming back online', async () => {
      const error = new NetworkError('Connection failed', ErrorSeverity.HIGH);
      
      // Go offline and report error
      errorReportingService.setOnlineStatus(false);
      await errorReportingService.reportError(error);
      
      // Come back online
      errorReportingService.setOnlineStatus(true);
      
      // Wait for flush to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockAnalyticsProvider.reportError).toHaveBeenCalled();
    });

    it('should limit error queue size to prevent memory issues', async () => {
      errorReportingService.setOnlineStatus(false);
      
      // Report many errors
      for (let i = 0; i < 150; i++) {
        const error = new NetworkError(`Error ${i}`, ErrorSeverity.HIGH);
        await errorReportingService.reportError(error);
      }
      
      // Verify queue was limited
      const setItemCalls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      if (setItemCalls.length > 0) {
        const lastCall = setItemCalls[setItemCalls.length - 1];
        if (lastCall && lastCall[1]) {
          const queueData = JSON.parse(lastCall[1]);
          expect(queueData.length).toBeLessThanOrEqual(50);
        }
      }
    });
  });

  describe('error statistics', () => {
    beforeEach(() => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        totalErrors: 10,
        errorsByType: { NETWORK: 5, STORAGE: 3, ML_PROCESSING: 2 },
        errorsBySeverity: { HIGH: 6, MEDIUM: 3, LOW: 1 },
      }));
    });

    it('should return error statistics', async () => {
      const stats = await errorReportingService.getErrorStatistics();
      
      expect(stats).toEqual({
        totalErrors: 10,
        errorsByType: { NETWORK: 5, STORAGE: 3, ML_PROCESSING: 2 },
        errorsBySeverity: { HIGH: 6, MEDIUM: 3, LOW: 1 },
      });
    });

    it('should clear error statistics', async () => {
      await errorReportingService.clearErrorStatistics();
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('error_statistics');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('error_queue');
    });

    it('should handle missing statistics gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      const stats = await errorReportingService.getErrorStatistics();
      
      expect(stats).toEqual({
        totalErrors: 0,
        errorsByType: {},
        errorsBySeverity: {},
      });
    });
  });

  describe('multiple analytics providers', () => {
    it('should report to all analytics providers', async () => {
      const secondProvider: jest.Mocked<AnalyticsProvider> = {
        reportError: jest.fn(),
        reportEvent: jest.fn(),
      };
      
      errorReportingService.addAnalyticsProvider(secondProvider);
      
      const error = new NetworkError('Connection failed', ErrorSeverity.HIGH);
      await errorReportingService.reportError(error);
      
      expect(mockAnalyticsProvider.reportError).toHaveBeenCalled();
      expect(secondProvider.reportError).toHaveBeenCalled();
    });

    it('should continue reporting to other providers if one fails', async () => {
      const secondProvider: jest.Mocked<AnalyticsProvider> = {
        reportError: jest.fn(),
        reportEvent: jest.fn(),
      };
      
      errorReportingService.addAnalyticsProvider(secondProvider);
      mockAnalyticsProvider.reportError.mockRejectedValue(new Error('Provider 1 failed'));
      
      const error = new NetworkError('Connection failed', ErrorSeverity.HIGH);
      await errorReportingService.reportError(error);
      
      expect(mockAnalyticsProvider.reportError).toHaveBeenCalled();
      expect(secondProvider.reportError).toHaveBeenCalled();
    });
  });
});