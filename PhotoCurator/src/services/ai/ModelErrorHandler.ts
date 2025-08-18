import { ModelConfig } from './ModelManager';

export enum ModelErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  MEMORY_ERROR = 'MEMORY_ERROR',
  INVALID_MODEL = 'INVALID_MODEL',
  INITIALIZATION_ERROR = 'INITIALIZATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}

export interface ModelError {
  type: ModelErrorType;
  message: string;
  modelName: string;
  originalError?: Error;
  timestamp: Date;
  retryable: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
  backoffMultiplier: number;
}

export interface FallbackStrategy {
  modelName: string;
  fallbackModels: string[];
  degradedFeatures: string[];
  userMessage: string;
}

/**
 * Handles model loading errors and implements fallback strategies
 */
export class ModelErrorHandler {
  private static instance: ModelErrorHandler;
  private errorHistory: ModelError[] = [];
  private retryConfigs: Map<string, RetryConfig> = new Map();
  private fallbackStrategies: Map<string, FallbackStrategy> = new Map();

  private constructor() {
    this.initializeRetryConfigs();
    this.initializeFallbackStrategies();
  }

  static getInstance(): ModelErrorHandler {
    if (!ModelErrorHandler.instance) {
      ModelErrorHandler.instance = new ModelErrorHandler();
    }
    return ModelErrorHandler.instance;
  }

  private initializeRetryConfigs(): void {
    // Default retry configuration
    const defaultConfig: RetryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
    };

    // Model-specific retry configurations
    this.retryConfigs.set('face-detection', {
      ...defaultConfig,
      maxRetries: 2, // Face detection is less critical
    });

    this.retryConfigs.set('feature-extraction', {
      ...defaultConfig,
      maxRetries: 5, // Feature extraction is critical
    });

    this.retryConfigs.set('image-classification', {
      ...defaultConfig,
      maxRetries: 3,
    });
  }

  private initializeFallbackStrategies(): void {
    // Face detection fallback
    this.fallbackStrategies.set('face-detection', {
      modelName: 'face-detection',
      fallbackModels: [], // No fallback for face detection
      degradedFeatures: ['face-clustering', 'person-grouping'],
      userMessage: 'Face detection is temporarily unavailable. Photo organization will continue without face grouping.',
    });

    // Feature extraction fallback
    this.fallbackStrategies.set('feature-extraction', {
      modelName: 'feature-extraction',
      fallbackModels: ['image-classification'], // Use classification model for basic features
      degradedFeatures: ['advanced-clustering', 'similarity-search'],
      userMessage: 'Advanced photo analysis is temporarily limited. Basic organization features remain available.',
    });

    // Image classification fallback
    this.fallbackStrategies.set('image-classification', {
      modelName: 'image-classification',
      fallbackModels: ['feature-extraction'], // Use feature extraction for basic content analysis
      degradedFeatures: ['scene-detection', 'object-recognition'],
      userMessage: 'Scene and object detection is temporarily unavailable. Photo organization will continue with reduced accuracy.',
    });
  }

  /**
   * Handle model loading error with retry logic
   */
  async handleModelError(
    error: Error,
    modelName: string,
    attemptNumber: number = 1
  ): Promise<{ shouldRetry: boolean; delay: number; fallbackModel?: string }> {
    const modelError = this.categorizeError(error, modelName);
    this.logError(modelError);

    const retryConfig = this.retryConfigs.get(modelName) || this.getDefaultRetryConfig();

    // Check if we should retry
    if (modelError.retryable && attemptNumber <= retryConfig.maxRetries) {
      const delay = this.calculateRetryDelay(attemptNumber, retryConfig);
      return { shouldRetry: true, delay };
    }

    // No more retries, check for fallback strategies
    const fallbackStrategy = this.fallbackStrategies.get(modelName);
    if (fallbackStrategy && fallbackStrategy.fallbackModels.length > 0) {
      const fallbackModel = fallbackStrategy.fallbackModels[0]; // Use first fallback
      console.warn(`Using fallback model ${fallbackModel} for ${modelName}`);
      return { shouldRetry: false, delay: 0, fallbackModel };
    }

    return { shouldRetry: false, delay: 0 };
  }

  private categorizeError(error: Error, modelName: string): ModelError {
    let errorType: ModelErrorType;
    let retryable = true;

    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
      errorType = ModelErrorType.NETWORK_ERROR;
    } else if (errorMessage.includes('storage') || errorMessage.includes('disk') || errorMessage.includes('space')) {
      errorType = ModelErrorType.STORAGE_ERROR;
    } else if (errorMessage.includes('memory') || errorMessage.includes('oom')) {
      errorType = ModelErrorType.MEMORY_ERROR;
    } else if (errorMessage.includes('invalid') || errorMessage.includes('corrupt') || errorMessage.includes('format')) {
      errorType = ModelErrorType.INVALID_MODEL;
      retryable = false; // Don't retry invalid models
    } else if (errorMessage.includes('initialization') || errorMessage.includes('backend')) {
      errorType = ModelErrorType.INITIALIZATION_ERROR;
    } else {
      errorType = ModelErrorType.TIMEOUT_ERROR;
    }

    return {
      type: errorType,
      message: error.message,
      modelName,
      originalError: error,
      timestamp: new Date(),
      retryable,
    };
  }

  private logError(error: ModelError): void {
    this.errorHistory.push(error);
    
    // Keep only last 100 errors
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-100);
    }

    console.error(`Model Error [${error.type}] for ${error.modelName}:`, error.message);
  }

  private calculateRetryDelay(attemptNumber: number, config: RetryConfig): number {
    const delay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, attemptNumber - 1),
      config.maxDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  private getDefaultRetryConfig(): RetryConfig {
    return {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
    };
  }

  /**
   * Get fallback strategy for a model
   */
  getFallbackStrategy(modelName: string): FallbackStrategy | null {
    return this.fallbackStrategies.get(modelName) || null;
  }

  /**
   * Check if a model has experienced recent errors
   */
  hasRecentErrors(modelName: string, timeWindowMs: number = 300000): boolean {
    const cutoffTime = new Date(Date.now() - timeWindowMs);
    return this.errorHistory.some(
      error => error.modelName === modelName && error.timestamp > cutoffTime
    );
  }

  /**
   * Get error statistics for a model
   */
  getModelErrorStats(modelName: string): {
    totalErrors: number;
    errorsByType: Record<ModelErrorType, number>;
    lastError?: ModelError;
  } {
    const modelErrors = this.errorHistory.filter(error => error.modelName === modelName);
    
    const errorsByType = modelErrors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<ModelErrorType, number>);

    return {
      totalErrors: modelErrors.length,
      errorsByType,
      lastError: modelErrors[modelErrors.length - 1],
    };
  }

  /**
   * Clear error history for a model
   */
  clearErrorHistory(modelName?: string): void {
    if (modelName) {
      this.errorHistory = this.errorHistory.filter(error => error.modelName !== modelName);
    } else {
      this.errorHistory = [];
    }
  }

  /**
   * Get user-friendly error message for model loading failure
   */
  getUserFriendlyMessage(modelName: string, error: ModelError): string {
    const fallbackStrategy = this.fallbackStrategies.get(modelName);
    
    if (fallbackStrategy) {
      return fallbackStrategy.userMessage;
    }

    switch (error.type) {
      case ModelErrorType.NETWORK_ERROR:
        return 'Unable to download AI models. Please check your internet connection and try again.';
      case ModelErrorType.STORAGE_ERROR:
        return 'Insufficient storage space for AI models. Please free up some space and try again.';
      case ModelErrorType.MEMORY_ERROR:
        return 'Not enough memory to load AI models. Please close other apps and try again.';
      case ModelErrorType.INVALID_MODEL:
        return 'AI model is corrupted. The app will attempt to re-download it.';
      case ModelErrorType.INITIALIZATION_ERROR:
        return 'AI system initialization failed. Please restart the app.';
      default:
        return 'AI features are temporarily unavailable. Please try again later.';
    }
  }

  /**
   * Suggest recovery actions for an error
   */
  getRecoveryActions(error: ModelError): string[] {
    const actions: string[] = [];

    switch (error.type) {
      case ModelErrorType.NETWORK_ERROR:
        actions.push('Check internet connection');
        actions.push('Try again later');
        actions.push('Use offline features only');
        break;
      case ModelErrorType.STORAGE_ERROR:
        actions.push('Free up storage space');
        actions.push('Clear app cache');
        actions.push('Move photos to cloud storage');
        break;
      case ModelErrorType.MEMORY_ERROR:
        actions.push('Close other apps');
        actions.push('Restart the app');
        actions.push('Process fewer photos at once');
        break;
      case ModelErrorType.INVALID_MODEL:
        actions.push('Clear model cache');
        actions.push('Re-download models');
        break;
      case ModelErrorType.INITIALIZATION_ERROR:
        actions.push('Restart the app');
        actions.push('Update the app');
        break;
      default:
        actions.push('Try again later');
        actions.push('Restart the app');
    }

    return actions;
  }
}