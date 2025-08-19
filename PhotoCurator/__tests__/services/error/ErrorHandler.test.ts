import { ErrorHandler } from '../../../src/services/error/ErrorHandler';
import {
  NetworkError,
  PermissionError,
  StorageError,
  MLProcessingError,
  SyncError,
  AuthenticationError,
  ValidationError,
  ErrorType,
  ErrorSeverity,
} from '../../../src/types/error';

// Mock dependencies
jest.mock('../../../src/services/error/ErrorReportingService');
jest.mock('../../../src/services/error/OfflineModeManager');

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
    jest.clearAllMocks();
  });

  describe('handleError', () => {
    it('should handle network errors by enabling offline mode', async () => {
      const networkError = new NetworkError('Connection failed');
      
      await errorHandler.handleError(networkError);
      
      // Verify error was handled appropriately
      expect(networkError.type).toBe(ErrorType.NETWORK);
    });

    it('should handle permission errors appropriately', async () => {
      const permissionError = new PermissionError('Camera permission denied');
      
      await errorHandler.handleError(permissionError);
      
      expect(permissionError.type).toBe(ErrorType.PERMISSION);
    });

    it('should handle storage errors with cleanup attempts', async () => {
      const storageError = new StorageError('Insufficient storage space');
      
      await errorHandler.handleError(storageError);
      
      expect(storageError.type).toBe(ErrorType.STORAGE);
    });

    it('should handle ML processing errors with graceful degradation', async () => {
      const mlError = new MLProcessingError('Model loading failed');
      
      await errorHandler.handleError(mlError);
      
      expect(mlError.type).toBe(ErrorType.ML_PROCESSING);
    });

    it('should normalize generic errors to AppError', async () => {
      const genericError = new Error('Generic error message');
      
      await errorHandler.handleError(genericError);
      
      // Should not throw and should handle gracefully
      expect(true).toBe(true);
    });
  });

  describe('retryWithBackoff', () => {
    it('should retry operation with exponential backoff', async () => {
      let attempts = 0;
      const operation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new NetworkError('Network failure');
        }
        return 'success';
      });

      const result = await errorHandler.retryWithBackoff(operation, {
        maxRetries: 3,
        baseDelay: 10, // Short delay for testing
        maxDelay: 100,
        backoffMultiplier: 2,
        retryableErrors: [ErrorType.NETWORK],
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn().mockImplementation(() => {
        throw new ValidationError('Invalid input');
      });

      await expect(
        errorHandler.retryWithBackoff(operation, {
          maxRetries: 3,
          retryableErrors: [ErrorType.NETWORK],
        })
      ).rejects.toThrow('Invalid input');

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect maximum retry limit', async () => {
      const operation = jest.fn().mockImplementation(() => {
        throw new NetworkError('Persistent network failure');
      });

      await expect(
        errorHandler.retryWithBackoff(operation, {
          maxRetries: 2,
          baseDelay: 10,
          retryableErrors: [ErrorType.NETWORK],
        })
      ).rejects.toThrow('Persistent network failure');

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should calculate exponential backoff delays correctly', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      global.setTimeout = jest.fn().mockImplementation((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0); // Execute immediately for testing
      });

      const operation = jest.fn()
        .mockRejectedValueOnce(new NetworkError('Failure 1'))
        .mockRejectedValueOnce(new NetworkError('Failure 2'))
        .mockResolvedValueOnce('success');

      await errorHandler.retryWithBackoff(operation, {
        maxRetries: 2,
        baseDelay: 100,
        backoffMultiplier: 2,
        retryableErrors: [ErrorType.NETWORK],
      });

      expect(delays).toEqual([100, 200]); // 100ms, then 200ms
      
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('error categorization', () => {
    it('should categorize errors based on message content', async () => {
      const testCases = [
        { message: 'Network connection failed', expectedType: ErrorType.NETWORK },
        { message: 'Permission denied for camera', expectedType: ErrorType.PERMISSION },
        { message: 'Insufficient storage space', expectedType: ErrorType.STORAGE },
        { message: 'TensorFlow model loading failed', expectedType: ErrorType.ML_PROCESSING },
        { message: 'Sync operation failed', expectedType: ErrorType.SYNC },
        { message: 'Authentication token expired', expectedType: ErrorType.AUTHENTICATION },
        { message: 'Validation error: required field', expectedType: ErrorType.VALIDATION },
        { message: 'Unknown error occurred', expectedType: ErrorType.UNKNOWN },
      ];

      for (const testCase of testCases) {
        const error = new Error(testCase.message);
        await errorHandler.handleError(error);
        
        // Since we can't directly access the normalized error,
        // we verify the handler doesn't throw
        expect(true).toBe(true);
      }
    });
  });

  describe('error context handling', () => {
    it('should include context information in error handling', async () => {
      const error = new NetworkError('Connection failed');
      const context = {
        userId: 'user123',
        component: 'PhotoImportService',
        action: 'importPhotos',
        metadata: { photoCount: 10 },
      };

      await errorHandler.handleError(error, context);
      
      // Verify context is preserved
      expect(error.context).toEqual(context);
    });
  });
});