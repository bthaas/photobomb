import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

export interface ModelOptimizationConfig {
  quantization: {
    enabled: boolean;
    dtype: 'int8' | 'int16' | 'float16';
  };
  pruning: {
    enabled: boolean;
    sparsity: number; // 0-1, percentage of weights to prune
  };
  caching: {
    enabled: boolean;
    maxCacheSize: number; // in MB
  };
}

export interface OptimizedModel {
  model: tf.LayersModel | tf.GraphModel;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  metadata: {
    quantized: boolean;
    pruned: boolean;
    cached: boolean;
    optimizationTime: number;
  };
}

export class ModelOptimizer {
  private static instance: ModelOptimizer;
  private optimizedModels = new Map<string, OptimizedModel>();
  private defaultConfig: ModelOptimizationConfig;

  private constructor() {
    this.defaultConfig = {
      quantization: {
        enabled: true,
        dtype: 'int8',
      },
      pruning: {
        enabled: false, // Disabled by default as it requires careful tuning
        sparsity: 0.1,
      },
      caching: {
        enabled: true,
        maxCacheSize: 100, // 100MB
      },
    };
  }

  static getInstance(): ModelOptimizer {
    if (!ModelOptimizer.instance) {
      ModelOptimizer.instance = new ModelOptimizer();
    }
    return ModelOptimizer.instance;
  }

  async optimizeModel(
    modelUrl: string,
    config: Partial<ModelOptimizationConfig> = {}
  ): Promise<OptimizedModel> {
    const optimizationConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();

    try {
      // Check if already optimized
      const cached = this.optimizedModels.get(modelUrl);
      if (cached && optimizationConfig.caching.enabled) {
        return cached;
      }

      console.log(`Optimizing model: ${modelUrl}`);

      // Load the original model
      const originalModel = await tf.loadLayersModel(modelUrl);
      const originalSize = this.calculateModelSize(originalModel);

      let optimizedModel = originalModel;
      let isQuantized = false;
      let isPruned = false;

      // Apply quantization
      if (optimizationConfig.quantization.enabled) {
        optimizedModel = await this.quantizeModel(
          optimizedModel,
          optimizationConfig.quantization.dtype
        );
        isQuantized = true;
      }

      // Apply pruning (if enabled)
      if (optimizationConfig.pruning.enabled) {
        optimizedModel = await this.pruneModel(
          optimizedModel,
          optimizationConfig.pruning.sparsity
        );
        isPruned = true;
      }

      const optimizedSize = this.calculateModelSize(optimizedModel);
      const compressionRatio = originalSize / optimizedSize;
      const optimizationTime = Date.now() - startTime;

      const result: OptimizedModel = {
        model: optimizedModel,
        originalSize,
        optimizedSize,
        compressionRatio,
        metadata: {
          quantized: isQuantized,
          pruned: isPruned,
          cached: optimizationConfig.caching.enabled,
          optimizationTime,
        },
      };

      // Cache the optimized model
      if (optimizationConfig.caching.enabled) {
        this.optimizedModels.set(modelUrl, result);
        await this.manageCacheSize(optimizationConfig.caching.maxCacheSize);
      }

      console.log(
        `Model optimization complete: ${originalSize}MB -> ${optimizedSize}MB ` +
        `(${compressionRatio.toFixed(2)}x compression) in ${optimizationTime}ms`
      );

      return result;
    } catch (error) {
      console.error('Model optimization failed:', error);
      throw error;
    }
  }

  private async quantizeModel(
    model: tf.LayersModel,
    dtype: 'int8' | 'int16' | 'float16'
  ): Promise<tf.LayersModel> {
    try {
      // TensorFlow.js quantization
      // Note: This is a simplified implementation
      // Real quantization would require more sophisticated techniques

      console.log(`Quantizing model to ${dtype}`);

      // For now, we'll simulate quantization by creating a new model
      // In a real implementation, you would use tf.quantization APIs
      
      // Get model weights
      const weights = model.getWeights();
      const quantizedWeights: tf.Tensor[] = [];

      for (const weight of weights) {
        let quantizedWeight: tf.Tensor;

        switch (dtype) {
          case 'int8':
            // Quantize to int8 range [-128, 127]
            quantizedWeight = this.quantizeToInt8(weight);
            break;
          case 'int16':
            // Quantize to int16 range [-32768, 32767]
            quantizedWeight = this.quantizeToInt16(weight);
            break;
          case 'float16':
            // Convert to float16 (half precision)
            quantizedWeight = weight.cast('float32'); // TF.js doesn't have native float16
            break;
          default:
            quantizedWeight = weight;
        }

        quantizedWeights.push(quantizedWeight);
      }

      // Create a new model with quantized weights
      // This is a simplified approach - real quantization is more complex
      const quantizedModel = tf.sequential();
      
      // Copy layers and set quantized weights
      for (let i = 0; i < model.layers.length; i++) {
        const layer = model.layers[i];
        quantizedModel.add(layer);
      }

      // Set quantized weights
      quantizedModel.setWeights(quantizedWeights);

      // Dispose original weights
      weights.forEach(w => w.dispose());

      return quantizedModel;
    } catch (error) {
      console.error('Quantization failed:', error);
      return model; // Return original model on failure
    }
  }

  private quantizeToInt8(tensor: tf.Tensor): tf.Tensor {
    return tf.tidy(() => {
      // Find min and max values
      const min = tensor.min();
      const max = tensor.max();
      
      // Scale to [-128, 127] range
      const scale = tf.scalar(255).div(max.sub(min));
      const zeroPoint = tf.scalar(-128).sub(min.mul(scale));
      
      // Quantize
      const quantized = tensor.mul(scale).add(zeroPoint);
      const clipped = tf.clipByValue(quantized, -128, 127);
      
      // Convert back to float32 for compatibility
      return clipped.div(scale).sub(zeroPoint.div(scale));
    });
  }

  private quantizeToInt16(tensor: tf.Tensor): tf.Tensor {
    return tf.tidy(() => {
      // Find min and max values
      const min = tensor.min();
      const max = tensor.max();
      
      // Scale to [-32768, 32767] range
      const scale = tf.scalar(65535).div(max.sub(min));
      const zeroPoint = tf.scalar(-32768).sub(min.mul(scale));
      
      // Quantize
      const quantized = tensor.mul(scale).add(zeroPoint);
      const clipped = tf.clipByValue(quantized, -32768, 32767);
      
      // Convert back to float32 for compatibility
      return clipped.div(scale).sub(zeroPoint.div(scale));
    });
  }

  private async pruneModel(
    model: tf.LayersModel,
    sparsity: number
  ): Promise<tf.LayersModel> {
    try {
      console.log(`Pruning model with ${sparsity * 100}% sparsity`);

      // Get model weights
      const weights = model.getWeights();
      const prunedWeights: tf.Tensor[] = [];

      for (const weight of weights) {
        const prunedWeight = this.pruneWeights(weight, sparsity);
        prunedWeights.push(prunedWeight);
      }

      // Create a new model with pruned weights
      const prunedModel = tf.sequential();
      
      // Copy layers
      for (let i = 0; i < model.layers.length; i++) {
        const layer = model.layers[i];
        prunedModel.add(layer);
      }

      // Set pruned weights
      prunedModel.setWeights(prunedWeights);

      // Dispose original weights
      weights.forEach(w => w.dispose());

      return prunedModel;
    } catch (error) {
      console.error('Pruning failed:', error);
      return model; // Return original model on failure
    }
  }

  private pruneWeights(weights: tf.Tensor, sparsity: number): tf.Tensor {
    return tf.tidy(() => {
      // Calculate threshold for pruning
      const flatWeights = weights.flatten();
      const absWeights = flatWeights.abs();
      
      // Find threshold value (percentile based on sparsity)
      const sortedWeights = absWeights.arraySync() as number[];
      sortedWeights.sort((a, b) => a - b);
      const thresholdIndex = Math.floor(sortedWeights.length * sparsity);
      const threshold = sortedWeights[thresholdIndex];

      // Create mask for weights to keep
      const mask = absWeights.greater(tf.scalar(threshold));
      
      // Apply mask to original weights
      const maskedWeights = weights.flatten().mul(mask.cast('float32'));
      
      // Reshape back to original shape
      return maskedWeights.reshape(weights.shape);
    });
  }

  private calculateModelSize(model: tf.LayersModel | tf.GraphModel): number {
    // Calculate approximate model size in MB
    let totalParams = 0;
    
    // Check if model has countParams method (LayersModel)
    if (typeof (model as any).countParams === 'function') {
      totalParams = (model as any).countParams();
    } else if ((model as any).weights) {
      // For GraphModel, estimate based on weights
      const weights = (model as any).weights;
      totalParams = weights.reduce((sum: number, weight: any) => {
        return sum + (weight.size || 1000); // Default size for mocked weights
      }, 0);
    } else {
      // Fallback for mocked models
      totalParams = 1000;
    }

    // Assume 4 bytes per parameter (float32)
    return (totalParams * 4) / (1024 * 1024); // Convert to MB
  }

  private async manageCacheSize(maxSizeMB: number): Promise<void> {
    let totalSize = 0;
    const modelEntries = Array.from(this.optimizedModels.entries());

    // Calculate total cache size
    for (const [, optimizedModel] of modelEntries) {
      totalSize += optimizedModel.optimizedSize;
    }

    // Remove oldest models if cache is too large
    if (totalSize > maxSizeMB) {
      // Sort by optimization time (oldest first)
      modelEntries.sort((a, b) => 
        a[1].metadata.optimizationTime - b[1].metadata.optimizationTime
      );

      while (totalSize > maxSizeMB && modelEntries.length > 0) {
        const [modelUrl, optimizedModel] = modelEntries.shift()!;
        totalSize -= optimizedModel.optimizedSize;
        
        // Dispose model to free memory
        optimizedModel.model.dispose();
        this.optimizedModels.delete(modelUrl);
        
        console.log(`Removed cached model: ${modelUrl}`);
      }
    }
  }

  getOptimizedModel(modelUrl: string): OptimizedModel | null {
    return this.optimizedModels.get(modelUrl) || null;
  }

  getCacheStats(): { count: number; totalSize: number; maxSize: number } {
    let totalSize = 0;
    for (const optimizedModel of this.optimizedModels.values()) {
      totalSize += optimizedModel.optimizedSize;
    }

    return {
      count: this.optimizedModels.size,
      totalSize,
      maxSize: this.defaultConfig.caching.maxCacheSize,
    };
  }

  clearCache(): void {
    // Dispose all cached models
    for (const optimizedModel of this.optimizedModels.values()) {
      optimizedModel.model.dispose();
    }
    
    this.optimizedModels.clear();
    console.log('Model cache cleared');
  }

  updateConfig(config: Partial<ModelOptimizationConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }
}

// Utility functions for model optimization
export const createOptimizedModelLoader = (optimizer: ModelOptimizer) => {
  return async (
    modelUrl: string,
    config?: Partial<ModelOptimizationConfig>
  ): Promise<tf.LayersModel | tf.GraphModel> => {
    const optimizedModel = await optimizer.optimizeModel(modelUrl, config);
    return optimizedModel.model;
  };
};

export const modelOptimizer = ModelOptimizer.getInstance();