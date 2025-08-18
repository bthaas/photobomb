import { ModelErrorHandler, ModelErrorType } from '../../../src/services/ai/ModelErrorHandler';

describe('ModelErrorHandler', () => {
  let errorHandler: ModelErrorHandler;

  beforeEach(() => {
    // Reset singleton instance
    (ModelErrorHandler as any).instance = undefined;
    errorHandler = ModelErrorHandler.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ModelErrorHandler.getInstance();
      const instance2 = ModelErrorHandler.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('handleModelError', () => {
    it('should handle network error with retry', async () => {
      const error = new Error('Network request failed');
      
      const result = await errorHandler.handleModelError(error, 'face-detection', 1);

      expect(result.shouldRetry).toBe(true);
      expect(result.delay).toBeGreaterThan(0);
      expect(result.fallbackModel).toBeUndefined();
    });

    it('should handle storage error with retry', async () => {
      const error = new Error('Insufficient storage space');
      
      const result = await errorHandler.handleModelError(error, 'face-detection', 1);

      expect(result.shouldRetry).toBe(true);
      expect(result.delay).toBeGreaterThan(0);
    });

    it('should not retry invalid model error', async () => {
      const error = new Error('Invalid model format');
      
      const result = await errorHandler.handleModelError(error, 'face-detection', 1);

      expect(result.shouldRetry).toBe(false);
    });

    it('should stop retrying after max attempts', async () => {
      const error = new Error('Network request failed');
      
      const result = await errorHandler.handleModelError(error, 'face-detection', 3);

      expect(result.shouldRetry).toBe(false);
    });

    it('should suggest fallback model when retries exhausted', async () => {
      const error = new Error('Network request failed');
      
      const result = await errorHandler.handleModelError(error, 'feature-extraction', 6); // Exceed max retries (5)

      expect(result.shouldRetry).toBe(false);
      expect(result.fallbackModel).toBe('image-classification');
    });

    it('should calculate exponential backoff delay', async () => {
      const error = new Error('Network request failed');
      
      const result1 = await errorHandler.handleModelError(error, 'face-detection', 1);
      const result2 = await errorHandler.handleModelError(error, 'face-detection', 2);

      expect(result1.shouldRetry).toBe(true);
      expect(result2.shouldRetry).toBe(true);
      expect(result2.delay).toBeGreaterThan(result1.delay);
    });
  });

  describe('error categorization', () => {
    it('should categorize network errors', async () => {
      const errors = [
        new Error('Network request failed'),
        new Error('Fetch timeout'),
        new Error('Connection refused'),
      ];

      for (const error of errors) {
        await errorHandler.handleModelError(error, 'test-model', 1);
      }

      const stats = errorHandler.getModelErrorStats('test-model');
      expect(stats.errorsByType[ModelErrorType.NETWORK_ERROR]).toBeGreaterThanOrEqual(2);
    });

    it('should categorize storage errors', async () => {
      const errors = [
        new Error('Insufficient storage space'),
        new Error('Disk full'),
        new Error('Storage quota exceeded'),
      ];

      for (const error of errors) {
        await errorHandler.handleModelError(error, 'test-model', 1);
      }

      const stats = errorHandler.getModelErrorStats('test-model');
      expect(stats.errorsByType[ModelErrorType.STORAGE_ERROR]).toBe(3);
    });

    it('should categorize memory errors', async () => {
      const errors = [
        new Error('Out of memory'),
        new Error('Memory allocation failed'),
      ];

      for (const error of errors) {
        await errorHandler.handleModelError(error, 'test-model', 1);
      }

      const stats = errorHandler.getModelErrorStats('test-model');
      expect(stats.errorsByType[ModelErrorType.MEMORY_ERROR]).toBe(2);
    });

    it('should categorize invalid model errors', async () => {
      const errors = [
        new Error('Invalid model format'),
        new Error('Corrupt model file'),
      ];

      for (const error of errors) {
        await errorHandler.handleModelError(error, 'test-model', 1);
      }

      const stats = errorHandler.getModelErrorStats('test-model');
      expect(stats.errorsByType[ModelErrorType.INVALID_MODEL]).toBe(2);
    });
  });

  describe('getFallbackStrategy', () => {
    it('should return fallback strategy for feature extraction', () => {
      const strategy = errorHandler.getFallbackStrategy('feature-extraction');

      expect(strategy).toBeDefined();
      expect(strategy!.fallbackModels).toContain('image-classification');
      expect(strategy!.degradedFeatures).toContain('advanced-clustering');
    });

    it('should return null for unknown model', () => {
      const strategy = errorHandler.getFallbackStrategy('unknown-model');
      expect(strategy).toBeNull();
    });
  });

  describe('hasRecentErrors', () => {
    it('should detect recent errors', async () => {
      const error = new Error('Test error');
      await errorHandler.handleModelError(error, 'test-model', 1);

      expect(errorHandler.hasRecentErrors('test-model')).toBe(true);
    });

    it('should not detect old errors', async () => {
      const error = new Error('Test error');
      await errorHandler.handleModelError(error, 'test-model', 1);

      // Wait a bit and check for errors in a very short time window
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(errorHandler.hasRecentErrors('test-model', 1)).toBe(false);
    });

    it('should not detect errors for different model', async () => {
      const error = new Error('Test error');
      await errorHandler.handleModelError(error, 'model-a', 1);

      expect(errorHandler.hasRecentErrors('model-b')).toBe(false);
    });
  });

  describe('getModelErrorStats', () => {
    it('should return error statistics', async () => {
      const error1 = new Error('Network error');
      const error2 = new Error('Storage error');
      
      await errorHandler.handleModelError(error1, 'test-model', 1);
      await errorHandler.handleModelError(error2, 'test-model', 1);

      const stats = errorHandler.getModelErrorStats('test-model');

      expect(stats.totalErrors).toBe(2);
      expect(stats.errorsByType[ModelErrorType.NETWORK_ERROR]).toBe(1);
      expect(stats.errorsByType[ModelErrorType.STORAGE_ERROR]).toBe(1);
      expect(stats.lastError).toBeDefined();
      expect(stats.lastError!.message).toBe('Storage error');
    });

    it('should return empty stats for model with no errors', () => {
      const stats = errorHandler.getModelErrorStats('clean-model');

      expect(stats.totalErrors).toBe(0);
      expect(stats.errorsByType).toEqual({});
      expect(stats.lastError).toBeUndefined();
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return fallback strategy message when available', async () => {
      const error = new Error('Network error');
      await errorHandler.handleModelError(error, 'face-detection', 1);

      const message = errorHandler.getUserFriendlyMessage('face-detection', {
        type: ModelErrorType.NETWORK_ERROR,
        message: 'Network error',
        modelName: 'face-detection',
        timestamp: new Date(),
        retryable: true,
      });

      expect(message).toContain('Face detection is temporarily unavailable');
    });

    it('should return generic message for network errors', () => {
      const message = errorHandler.getUserFriendlyMessage('unknown-model', {
        type: ModelErrorType.NETWORK_ERROR,
        message: 'Network error',
        modelName: 'unknown-model',
        timestamp: new Date(),
        retryable: true,
      });

      expect(message).toContain('check your internet connection');
    });

    it('should return appropriate message for storage errors', () => {
      const message = errorHandler.getUserFriendlyMessage('unknown-model', {
        type: ModelErrorType.STORAGE_ERROR,
        message: 'Storage error',
        modelName: 'unknown-model',
        timestamp: new Date(),
        retryable: true,
      });

      expect(message).toContain('Insufficient storage space');
    });
  });

  describe('getRecoveryActions', () => {
    it('should suggest recovery actions for network errors', () => {
      const actions = errorHandler.getRecoveryActions({
        type: ModelErrorType.NETWORK_ERROR,
        message: 'Network error',
        modelName: 'test-model',
        timestamp: new Date(),
        retryable: true,
      });

      expect(actions).toContain('Check internet connection');
      expect(actions).toContain('Try again later');
    });

    it('should suggest recovery actions for storage errors', () => {
      const actions = errorHandler.getRecoveryActions({
        type: ModelErrorType.STORAGE_ERROR,
        message: 'Storage error',
        modelName: 'test-model',
        timestamp: new Date(),
        retryable: true,
      });

      expect(actions).toContain('Free up storage space');
      expect(actions).toContain('Clear app cache');
    });

    it('should suggest recovery actions for memory errors', () => {
      const actions = errorHandler.getRecoveryActions({
        type: ModelErrorType.MEMORY_ERROR,
        message: 'Memory error',
        modelName: 'test-model',
        timestamp: new Date(),
        retryable: true,
      });

      expect(actions).toContain('Close other apps');
      expect(actions).toContain('Restart the app');
    });
  });

  describe('clearErrorHistory', () => {
    it('should clear error history for specific model', async () => {
      const error = new Error('Test error');
      await errorHandler.handleModelError(error, 'model-a', 1);
      await errorHandler.handleModelError(error, 'model-b', 1);

      errorHandler.clearErrorHistory('model-a');

      expect(errorHandler.getModelErrorStats('model-a').totalErrors).toBe(0);
      expect(errorHandler.getModelErrorStats('model-b').totalErrors).toBe(1);
    });

    it('should clear all error history when no model specified', async () => {
      const error = new Error('Test error');
      await errorHandler.handleModelError(error, 'model-a', 1);
      await errorHandler.handleModelError(error, 'model-b', 1);

      errorHandler.clearErrorHistory();

      expect(errorHandler.getModelErrorStats('model-a').totalErrors).toBe(0);
      expect(errorHandler.getModelErrorStats('model-b').totalErrors).toBe(0);
    });
  });
});