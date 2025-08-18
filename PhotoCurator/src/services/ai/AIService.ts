import { TensorFlowSetup } from './TensorFlowSetup';
import { ModelManager, ModelConfig, ModelLoadResult, ModelDownloadProgress } from './ModelManager';
import { ModelErrorHandler, ModelError } from './ModelErrorHandler';

export interface AIServiceStatus {
  isInitialized: boolean;
  backend: string;
  loadedModels: string[];
  availableModels: ModelConfig[];
  memoryUsage?: any;
  lastError?: ModelError;
}

export interface ModelLoadOptions {
  priority?: 'high' | 'medium' | 'low';
  timeout?: number;
  onProgress?: (progress: ModelDownloadProgress) => void;
  onError?: (error: ModelError) => void;
}

/**
 * Main AI service that orchestrates TensorFlow.js setup and model management
 * Provides a unified interface for all AI-related operations
 */
export class AIService {
  private static instance: AIService;
  private modelManager: ModelManager;
  private errorHandler: ModelErrorHandler;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    this.modelManager = ModelManager.getInstance();
    this.errorHandler = ModelErrorHandler.getInstance();
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Initialize the AI service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      console.log('Initializing AI Service...');
      
      // Initialize TensorFlow.js
      await TensorFlowSetup.initialize();
      
      // Clean up old cached models if needed
      await this.modelManager.cleanupCache();
      
      this.isInitialized = true;
      console.log('AI Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI Service:', error);
      throw error;
    }
  }

  /**
   * Load a model with error handling and retry logic
   */
  async loadModel(modelName: string, options: ModelLoadOptions = {}): Promise<ModelLoadResult> {
    await this.initialize();

    const { timeout = 30000, onProgress, onError } = options;
    let attemptNumber = 1;

    while (true) {
      try {
        // Set timeout for model loading
        const loadPromise = this.modelManager.loadModel(modelName, onProgress);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Model loading timeout')), timeout);
        });

        const result = await Promise.race([loadPromise, timeoutPromise]);
        
        console.log(`Model ${modelName} loaded successfully (attempt ${attemptNumber})`);
        return result;
      } catch (error) {
        const errorResult = await this.errorHandler.handleModelError(
          error as Error,
          modelName,
          attemptNumber
        );

        if (onError) {
          const modelError = {
            type: 'NETWORK_ERROR' as any,
            message: (error as Error).message,
            modelName,
            originalError: error as Error,
            timestamp: new Date(),
            retryable: errorResult.shouldRetry,
          };
          onError(modelError);
        }

        if (errorResult.shouldRetry) {
          console.log(`Retrying model ${modelName} load in ${errorResult.delay}ms (attempt ${attemptNumber + 1})`);
          await this.delay(errorResult.delay);
          attemptNumber++;
          continue;
        }

        if (errorResult.fallbackModel) {
          console.log(`Loading fallback model ${errorResult.fallbackModel} for ${modelName}`);
          return this.loadModel(errorResult.fallbackModel, options);
        }

        throw error;
      }
    }
  }

  /**
   * Load multiple models concurrently
   */
  async loadModels(
    modelNames: string[],
    options: ModelLoadOptions = {}
  ): Promise<Map<string, ModelLoadResult>> {
    await this.initialize();

    const results = new Map<string, ModelLoadResult>();
    const loadPromises = modelNames.map(async (modelName) => {
      try {
        const result = await this.loadModel(modelName, options);
        results.set(modelName, result);
      } catch (error) {
        console.error(`Failed to load model ${modelName}:`, error);
        // Continue loading other models even if one fails
      }
    });

    await Promise.allSettled(loadPromises);
    return results;
  }

  /**
   * Preload essential models for core functionality
   */
  async preloadEssentialModels(onProgress?: (progress: ModelDownloadProgress) => void): Promise<void> {
    const essentialModels = ['feature-extraction']; // Start with most critical model
    
    try {
      await this.loadModel('feature-extraction', { onProgress });
      console.log('Essential models preloaded successfully');
    } catch (error) {
      console.warn('Failed to preload essential models:', error);
      // Don't throw error as app can still function with degraded features
    }
  }

  /**
   * Load models on demand based on required features
   */
  async loadModelsForFeatures(features: string[]): Promise<void> {
    const requiredModels = new Set<string>();
    const availableModels = this.modelManager.getAvailableModels();

    // Determine which models are needed for the requested features
    for (const model of availableModels) {
      if (model.requiredFor.some(feature => features.includes(feature))) {
        requiredModels.add(model.name);
      }
    }

    // Load required models
    const modelNames = Array.from(requiredModels);
    if (modelNames.length > 0) {
      console.log(`Loading models for features [${features.join(', ')}]: [${modelNames.join(', ')}]`);
      await this.loadModels(modelNames);
    }
  }

  /**
   * Get the current status of the AI service
   */
  getStatus(): AIServiceStatus {
    const backendInfo = TensorFlowSetup.getBackendInfo();
    const availableModels = this.modelManager.getAvailableModels();
    const loadedModels = availableModels
      .filter(model => this.modelManager.isModelLoaded(model.name))
      .map(model => model.name);

    return {
      isInitialized: this.isInitialized && backendInfo.isInitialized,
      backend: backendInfo.backend,
      loadedModels,
      availableModels,
      memoryUsage: backendInfo.memoryInfo,
    };
  }

  /**
   * Get a loaded model
   */
  getModel(modelName: string) {
    return this.modelManager.getLoadedModel(modelName);
  }

  /**
   * Check if a model is loaded and ready
   */
  isModelReady(modelName: string): boolean {
    return this.modelManager.isModelLoaded(modelName);
  }

  /**
   * Unload a model to free memory
   */
  async unloadModel(modelName: string): Promise<void> {
    await this.modelManager.unloadModel(modelName);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return this.modelManager.getCacheStats();
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.modelManager.clearAllModels();
    TensorFlowSetup.cleanup();
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  /**
   * Get error statistics for troubleshooting
   */
  getErrorStats(modelName?: string) {
    if (modelName) {
      return this.errorHandler.getModelErrorStats(modelName);
    }
    
    // Return stats for all models
    const availableModels = this.modelManager.getAvailableModels();
    const stats: Record<string, any> = {};
    
    for (const model of availableModels) {
      stats[model.name] = this.errorHandler.getModelErrorStats(model.name);
    }
    
    return stats;
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyErrorMessage(modelName: string): string | null {
    const stats = this.errorHandler.getModelErrorStats(modelName);
    if (stats.lastError) {
      return this.errorHandler.getUserFriendlyMessage(modelName, stats.lastError);
    }
    return null;
  }

  /**
   * Get recovery actions for model errors
   */
  getRecoveryActions(modelName: string): string[] {
    const stats = this.errorHandler.getModelErrorStats(modelName);
    if (stats.lastError) {
      return this.errorHandler.getRecoveryActions(stats.lastError);
    }
    return [];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}