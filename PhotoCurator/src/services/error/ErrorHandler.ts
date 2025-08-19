import {
  AppError,
  ErrorType,
  ErrorSeverity,
  NetworkError,
  PermissionError,
  StorageError,
  MLProcessingError,
  SyncError,
  AuthenticationError,
  ValidationError,
  ErrorContext,
  RecoveryAction,
} from '../../types/error';
import { ErrorReportingService } from './ErrorReportingService';
import { OfflineModeManager } from './OfflineModeManager';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: ErrorType[];
}

export class ErrorHandler {
  private errorReportingService: ErrorReportingService;
  private offlineModeManager: OfflineModeManager;
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: [ErrorType.NETWORK, ErrorType.SYNC],
  };

  constructor() {
    this.errorReportingService = new ErrorReportingService();
    this.offlineModeManager = new OfflineModeManager();
  }

  /**
   * Handle any error with appropriate recovery strategies
   */
  public async handleError(error: Error | AppError, context?: ErrorContext): Promise<void> {
    const appError = this.normalizeError(error, context);
    
    // Set context on the error if it wasn't already set
    if (context && !appError.context) {
      (appError as any).context = context;
    }
    
    // Report error for analytics
    await this.errorReportingService.reportError(appError, context);

    // Handle specific error types
    switch (appError.type) {
      case ErrorType.NETWORK:
        await this.handleNetworkError(appError as NetworkError);
        break;
      case ErrorType.PERMISSION:
        await this.handlePermissionError(appError as PermissionError);
        break;
      case ErrorType.STORAGE:
        await this.handleStorageError(appError as StorageError);
        break;
      case ErrorType.ML_PROCESSING:
        await this.handleMLError(appError as MLProcessingError);
        break;
      case ErrorType.SYNC:
        await this.handleSyncError(appError as SyncError);
        break;
      case ErrorType.AUTHENTICATION:
        await this.handleAuthenticationError(appError as AuthenticationError);
        break;
      default:
        console.warn('Unhandled error type:', appError.type, appError.message);
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  public async retryWithBackoff<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: Error;
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry if it's the last attempt
        if (attempt === retryConfig.maxRetries) {
          break;
        }

        // Check if error is retryable
        const appError = this.normalizeError(error as Error);
        if (!retryConfig.retryableErrors.includes(appError.type)) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
          retryConfig.maxDelay
        );

        console.log(`Retrying operation in ${delay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`);
        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Handle network errors with offline mode fallback
   */
  private async handleNetworkError(error: NetworkError): Promise<void> {
    console.log('Handling network error:', error.message);
    
    // Enable offline mode if not already enabled
    if (!this.offlineModeManager.isOfflineMode()) {
      await this.offlineModeManager.enableOfflineMode();
    }
  }

  /**
   * Handle permission errors with user guidance
   */
  private async handlePermissionError(error: PermissionError): Promise<void> {
    console.log('Handling permission error:', error.message);
    
    // Permission errors typically require user action
    // The UI should display the error message and recovery actions
  }

  /**
   * Handle storage errors with cleanup strategies
   */
  private async handleStorageError(error: StorageError): Promise<void> {
    console.log('Handling storage error:', error.message);
    
    // Attempt to free up storage space
    try {
      // This would trigger cache cleanup, temporary file removal, etc.
      // Implementation would depend on specific storage services
      console.log('Attempting storage cleanup...');
    } catch (cleanupError) {
      console.error('Storage cleanup failed:', cleanupError);
    }
  }

  /**
   * Handle ML processing errors with graceful degradation
   */
  private async handleMLError(error: MLProcessingError): Promise<void> {
    console.log('Handling ML processing error:', error.message);
    
    // Enable graceful degradation mode
    // This might disable certain AI features temporarily
    console.log('Enabling graceful degradation for ML features');
  }

  /**
   * Handle sync errors with queue management
   */
  private async handleSyncError(error: SyncError): Promise<void> {
    console.log('Handling sync error:', error.message);
    
    // Sync errors should be queued for retry
    // The sync service should handle this automatically
  }

  /**
   * Handle authentication errors with re-authentication flow
   */
  private async handleAuthenticationError(error: AuthenticationError): Promise<void> {
    console.log('Handling authentication error:', error.message);
    
    // Clear invalid tokens and redirect to login
    // This would typically be handled by the auth service
  }

  /**
   * Normalize any error to AppError
   */
  private normalizeError(error: Error, context?: ErrorContext): AppError {
    if (error instanceof AppError) {
      return error;
    }

    // Try to categorize the error based on message or type
    const errorType = this.categorizeError(error);
    
    switch (errorType) {
      case ErrorType.NETWORK:
        return new NetworkError(error.message, ErrorSeverity.MEDIUM, context);
      case ErrorType.PERMISSION:
        return new PermissionError(error.message, ErrorSeverity.HIGH, context);
      case ErrorType.STORAGE:
        return new StorageError(error.message, ErrorSeverity.HIGH, context);
      case ErrorType.ML_PROCESSING:
        return new MLProcessingError(error.message, ErrorSeverity.MEDIUM, context);
      case ErrorType.SYNC:
        return new SyncError(error.message, ErrorSeverity.MEDIUM, context);
      case ErrorType.AUTHENTICATION:
        return new AuthenticationError(error.message, ErrorSeverity.HIGH, context);
      case ErrorType.VALIDATION:
        return new ValidationError(error.message, ErrorSeverity.LOW, context);
      default:
        return new (class extends AppError {
          protected getDefaultUserMessage(): string {
            return 'An unexpected error occurred. Please try again.';
          }
        })(error.message, ErrorType.UNKNOWN, ErrorSeverity.MEDIUM, undefined, context);
    }
  }

  /**
   * Categorize error based on message patterns
   */
  private categorizeError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return ErrorType.NETWORK;
    }
    
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('access denied')) {
      return ErrorType.PERMISSION;
    }
    
    if (message.includes('storage') || message.includes('disk') || message.includes('space')) {
      return ErrorType.STORAGE;
    }
    
    if (message.includes('model') || message.includes('tensorflow') || message.includes('ml')) {
      return ErrorType.ML_PROCESSING;
    }
    
    if (message.includes('sync') || message.includes('upload') || message.includes('download')) {
      return ErrorType.SYNC;
    }
    
    if (message.includes('auth') || message.includes('token') || message.includes('login')) {
      return ErrorType.AUTHENTICATION;
    }
    
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return ErrorType.VALIDATION;
    }
    
    return ErrorType.UNKNOWN;
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}