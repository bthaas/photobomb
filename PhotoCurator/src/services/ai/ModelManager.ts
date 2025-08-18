import * as tf from '@tensorflow/tfjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { TensorFlowSetup } from './TensorFlowSetup';

export interface ModelConfig {
  name: string;
  url: string;
  version: string;
  size: number; // Size in bytes
  description: string;
  requiredFor: string[]; // Features that require this model
}

export interface ModelLoadResult {
  model: tf.LayersModel | tf.GraphModel;
  loadTime: number;
  fromCache: boolean;
}

export interface ModelDownloadProgress {
  modelName: string;
  bytesLoaded: number;
  totalBytes: number;
  percentage: number;
}

/**
 * Manages ML model loading, caching, and lifecycle
 * Implements lazy loading and efficient caching strategies
 */
export class ModelManager {
  private static instance: ModelManager;
  private loadedModels: Map<string, tf.LayersModel | tf.GraphModel> = new Map();
  private modelConfigs: Map<string, ModelConfig> = new Map();
  private loadingPromises: Map<string, Promise<ModelLoadResult>> = new Map();
  private readonly modelCacheDir: string;
  private readonly maxCacheSize = 500 * 1024 * 1024; // 500MB cache limit

  private constructor() {
    this.modelCacheDir = `${RNFS.DocumentDirectoryPath}/ml_models`;
    this.initializeModelConfigs();
  }

  static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  /**
   * Initialize available model configurations
   */
  private initializeModelConfigs(): void {
    // Face detection model
    this.modelConfigs.set('face-detection', {
      name: 'face-detection',
      url: 'https://tfhub.dev/mediapipe/tfjs-model/face_detection/short/1',
      version: '1.0.0',
      size: 2.5 * 1024 * 1024, // 2.5MB
      description: 'MediaPipe Face Detection model',
      requiredFor: ['face-detection', 'face-clustering'],
    });

    // Image feature extraction model (MobileNet)
    this.modelConfigs.set('feature-extraction', {
      name: 'feature-extraction',
      url: 'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v2_100_224/feature_vector/3',
      version: '3.0.0',
      size: 9.2 * 1024 * 1024, // 9.2MB
      description: 'MobileNet v2 feature extraction model',
      requiredFor: ['feature-extraction', 'clustering', 'quality-analysis'],
    });

    // Image classification model
    this.modelConfigs.set('image-classification', {
      name: 'image-classification',
      url: 'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v2_100_224/classification/3',
      version: '3.0.0',
      size: 13.4 * 1024 * 1024, // 13.4MB
      description: 'MobileNet v2 image classification model',
      requiredFor: ['content-analysis', 'scene-detection'],
    });
  }

  /**
   * Load a model with lazy loading and caching
   */
  async loadModel(modelName: string, onProgress?: (progress: ModelDownloadProgress) => void): Promise<ModelLoadResult> {
    // Ensure TensorFlow.js is initialized
    await TensorFlowSetup.initialize();

    // Return cached model if already loaded
    if (this.loadedModels.has(modelName)) {
      return {
        model: this.loadedModels.get(modelName)!,
        loadTime: 0,
        fromCache: true,
      };
    }

    // Return existing loading promise if model is currently being loaded
    if (this.loadingPromises.has(modelName)) {
      return this.loadingPromises.get(modelName)!;
    }

    // Start loading the model
    const loadingPromise = this.performModelLoad(modelName, onProgress);
    this.loadingPromises.set(modelName, loadingPromise);

    try {
      const result = await loadingPromise;
      this.loadedModels.set(modelName, result.model);
      return result;
    } finally {
      this.loadingPromises.delete(modelName);
    }
  }

  private async performModelLoad(
    modelName: string,
    onProgress?: (progress: ModelDownloadProgress) => void
  ): Promise<ModelLoadResult> {
    const startTime = Date.now();
    const config = this.modelConfigs.get(modelName);

    if (!config) {
      throw new Error(`Model configuration not found: ${modelName}`);
    }

    try {
      // Check if model exists in local cache
      const cachedModelPath = await this.getCachedModelPath(modelName);
      if (cachedModelPath) {
        console.log(`Loading model ${modelName} from cache`);
        const model = await tf.loadLayersModel(`file://${cachedModelPath}`);
        return {
          model,
          loadTime: Date.now() - startTime,
          fromCache: true,
        };
      }

      // Download and cache the model
      console.log(`Downloading model ${modelName} from ${config.url}`);
      const model = await this.downloadAndCacheModel(config, onProgress);

      return {
        model,
        loadTime: Date.now() - startTime,
        fromCache: false,
      };
    } catch (error) {
      console.error(`Failed to load model ${modelName}:`, error);
      throw new Error(`Model loading failed for ${modelName}: ${error}`);
    }
  }

  private async downloadAndCacheModel(
    config: ModelConfig,
    onProgress?: (progress: ModelDownloadProgress) => void
  ): Promise<tf.LayersModel | tf.GraphModel> {
    try {
      // Create progress tracking wrapper
      const progressHandler = (bytesLoaded: number, totalBytes: number) => {
        if (onProgress) {
          onProgress({
            modelName: config.name,
            bytesLoaded,
            totalBytes,
            percentage: (bytesLoaded / totalBytes) * 100,
          });
        }
      };

      // Load model with progress tracking
      const model = await tf.loadLayersModel(config.url, {
        onProgress: progressHandler,
      });

      // Cache the model locally
      await this.cacheModel(config.name, model);

      // Update model metadata
      await this.updateModelMetadata(config);

      return model;
    } catch (error) {
      // Try loading as GraphModel if LayersModel fails
      try {
        const model = await tf.loadGraphModel(config.url);
        await this.cacheModel(config.name, model);
        await this.updateModelMetadata(config);
        return model;
      } catch (graphError) {
        throw new Error(`Failed to load model as both LayersModel and GraphModel: ${error}, ${graphError}`);
      }
    }
  }

  private async cacheModel(modelName: string, model: tf.LayersModel | tf.GraphModel): Promise<void> {
    try {
      // Ensure cache directory exists
      await this.ensureCacheDirectoryExists();

      // Save model to local cache
      const modelPath = `${this.modelCacheDir}/${modelName}`;
      await model.save(`file://${modelPath}`);

      console.log(`Model ${modelName} cached successfully at ${modelPath}`);
    } catch (error) {
      console.warn(`Failed to cache model ${modelName}:`, error);
      // Don't throw error as model is still loaded in memory
    }
  }

  private async getCachedModelPath(modelName: string): Promise<string | null> {
    try {
      const modelPath = `${this.modelCacheDir}/${modelName}`;
      const modelJsonPath = `${modelPath}/model.json`;

      if (await RNFS.exists(modelJsonPath)) {
        // Verify model integrity
        const metadata = await this.getModelMetadata(modelName);
        if (metadata && metadata.version === this.modelConfigs.get(modelName)?.version) {
          return modelPath;
        }
      }
    } catch (error) {
      console.warn(`Error checking cached model ${modelName}:`, error);
    }

    return null;
  }

  private async ensureCacheDirectoryExists(): Promise<void> {
    try {
      if (!(await RNFS.exists(this.modelCacheDir))) {
        await RNFS.mkdir(this.modelCacheDir);
      }
    } catch (error) {
      throw new Error(`Failed to create model cache directory: ${error}`);
    }
  }

  private async updateModelMetadata(config: ModelConfig): Promise<void> {
    try {
      const metadata = {
        name: config.name,
        version: config.version,
        cachedAt: new Date().toISOString(),
        size: config.size,
      };

      await AsyncStorage.setItem(`model_metadata_${config.name}`, JSON.stringify(metadata));
    } catch (error) {
      console.warn(`Failed to update metadata for model ${config.name}:`, error);
    }
  }

  private async getModelMetadata(modelName: string): Promise<any | null> {
    try {
      const metadataStr = await AsyncStorage.getItem(`model_metadata_${modelName}`);
      return metadataStr ? JSON.parse(metadataStr) : null;
    } catch (error) {
      console.warn(`Failed to get metadata for model ${modelName}:`, error);
      return null;
    }
  }

  /**
   * Get information about available models
   */
  getAvailableModels(): ModelConfig[] {
    return Array.from(this.modelConfigs.values());
  }

  /**
   * Check if a model is currently loaded
   */
  isModelLoaded(modelName: string): boolean {
    return this.loadedModels.has(modelName);
  }

  /**
   * Get loaded model
   */
  getLoadedModel(modelName: string): tf.LayersModel | tf.GraphModel | null {
    return this.loadedModels.get(modelName) || null;
  }

  /**
   * Unload a specific model to free memory
   */
  async unloadModel(modelName: string): Promise<void> {
    const model = this.loadedModels.get(modelName);
    if (model) {
      model.dispose();
      this.loadedModels.delete(modelName);
      console.log(`Model ${modelName} unloaded from memory`);
    }
  }

  /**
   * Clear all loaded models from memory
   */
  async clearAllModels(): Promise<void> {
    for (const [modelName, model] of this.loadedModels) {
      model.dispose();
      console.log(`Model ${modelName} disposed`);
    }
    this.loadedModels.clear();
  }

  /**
   * Get cache usage statistics
   */
  async getCacheStats(): Promise<{
    totalSize: number;
    modelCount: number;
    models: Array<{ name: string; size: number; cachedAt: string }>;
  }> {
    try {
      const models = [];
      let totalSize = 0;

      for (const config of this.modelConfigs.values()) {
        const metadata = await this.getModelMetadata(config.name);
        if (metadata) {
          models.push({
            name: config.name,
            size: metadata.size,
            cachedAt: metadata.cachedAt,
          });
          totalSize += metadata.size;
        }
      }

      return {
        totalSize,
        modelCount: models.length,
        models,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return { totalSize: 0, modelCount: 0, models: [] };
    }
  }

  /**
   * Clean up old cached models if cache size exceeds limit
   */
  async cleanupCache(): Promise<void> {
    try {
      const stats = await this.getCacheStats();
      
      if (stats.totalSize > this.maxCacheSize) {
        // Sort models by cache date (oldest first)
        const sortedModels = stats.models.sort((a, b) => 
          new Date(a.cachedAt).getTime() - new Date(b.cachedAt).getTime()
        );

        let freedSpace = 0;
        for (const model of sortedModels) {
          if (stats.totalSize - freedSpace <= this.maxCacheSize) {
            break;
          }

          await this.removeCachedModel(model.name);
          freedSpace += model.size;
          console.log(`Removed cached model ${model.name} to free space`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup cache:', error);
    }
  }

  private async removeCachedModel(modelName: string): Promise<void> {
    try {
      const modelPath = `${this.modelCacheDir}/${modelName}`;
      if (await RNFS.exists(modelPath)) {
        await RNFS.unlink(modelPath);
      }
      await AsyncStorage.removeItem(`model_metadata_${modelName}`);
    } catch (error) {
      console.warn(`Failed to remove cached model ${modelName}:`, error);
    }
  }
}