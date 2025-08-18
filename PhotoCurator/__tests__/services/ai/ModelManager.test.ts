import { ModelManager } from '../../../src/services/ai/ModelManager';
import { TensorFlowSetup } from '../../../src/services/ai/TensorFlowSetup';
import * as tf from '@tensorflow/tfjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

// Mock dependencies
jest.mock('../../../src/services/ai/TensorFlowSetup');
jest.mock('@tensorflow/tfjs');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-fs');

describe('ModelManager', () => {
  let modelManager: ModelManager;
  let mockModel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (ModelManager as any).instance = undefined;
    modelManager = ModelManager.getInstance();

    // Mock model
    mockModel = {
      dispose: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };

    // Mock TensorFlow.js
    (tf.loadLayersModel as jest.Mock).mockResolvedValue(mockModel);
    (tf.loadGraphModel as jest.Mock).mockResolvedValue(mockModel);

    // Mock TensorFlowSetup
    (TensorFlowSetup.initialize as jest.Mock).mockResolvedValue(undefined);

    // Mock AsyncStorage
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

    // Mock RNFS
    (RNFS.exists as jest.Mock).mockResolvedValue(false);
    (RNFS.mkdir as jest.Mock).mockResolvedValue(undefined);
    (RNFS.unlink as jest.Mock).mockResolvedValue(undefined);
    (RNFS.DocumentDirectoryPath as any) = '/mock/documents';
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ModelManager.getInstance();
      const instance2 = ModelManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('loadModel', () => {
    it('should load model successfully', async () => {
      const result = await modelManager.loadModel('face-detection');

      expect(TensorFlowSetup.initialize).toHaveBeenCalled();
      expect(tf.loadLayersModel).toHaveBeenCalled();
      expect(result.model).toBe(mockModel);
      expect(result.fromCache).toBe(false);
      expect(result.loadTime).toBeGreaterThan(0);
    });

    it('should return cached model if already loaded', async () => {
      // Load model first time
      await modelManager.loadModel('face-detection');
      
      // Load model second time
      const result = await modelManager.loadModel('face-detection');

      expect(result.fromCache).toBe(true);
      expect(result.loadTime).toBe(0);
      expect(tf.loadLayersModel).toHaveBeenCalledTimes(1);
    });

    it('should load model from local cache if available', async () => {
      // Mock cached model exists
      (RNFS.exists as jest.Mock).mockResolvedValue(true);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ version: '1.0.0' })
      );

      const result = await modelManager.loadModel('face-detection');

      expect(result.fromCache).toBe(true);
      expect(tf.loadLayersModel).toHaveBeenCalledWith('file:///mock/documents/ml_models/face-detection');
    });

    it('should handle progress callback during download', async () => {
      const onProgress = jest.fn();
      
      // Mock progress callback in tf.loadLayersModel
      (tf.loadLayersModel as jest.Mock).mockImplementation((url, options) => {
        if (options?.onProgress) {
          options.onProgress(1024, 2048);
        }
        return Promise.resolve(mockModel);
      });

      await modelManager.loadModel('face-detection', onProgress);

      expect(onProgress).toHaveBeenCalledWith({
        modelName: 'face-detection',
        bytesLoaded: 1024,
        totalBytes: 2048,
        percentage: 50,
      });
    });

    it('should fallback to GraphModel if LayersModel fails', async () => {
      (tf.loadLayersModel as jest.Mock).mockRejectedValue(new Error('LayersModel failed'));
      (tf.loadGraphModel as jest.Mock).mockResolvedValue(mockModel);

      const result = await modelManager.loadModel('face-detection');

      expect(tf.loadLayersModel).toHaveBeenCalled();
      expect(tf.loadGraphModel).toHaveBeenCalled();
      expect(result.model).toBe(mockModel);
    });

    it('should throw error for unknown model', async () => {
      await expect(modelManager.loadModel('unknown-model')).rejects.toThrow(
        'Model configuration not found: unknown-model'
      );
    });

    it('should handle concurrent loading of same model', async () => {
      const promise1 = modelManager.loadModel('face-detection');
      const promise2 = modelManager.loadModel('face-detection');

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.model).toBe(mockModel);
      expect(result2.model).toBe(mockModel);
      expect(tf.loadLayersModel).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAvailableModels', () => {
    it('should return list of available models', () => {
      const models = modelManager.getAvailableModels();

      expect(models).toHaveLength(3);
      expect(models.map(m => m.name)).toContain('face-detection');
      expect(models.map(m => m.name)).toContain('feature-extraction');
      expect(models.map(m => m.name)).toContain('image-classification');
    });
  });

  describe('isModelLoaded', () => {
    it('should return false for unloaded model', () => {
      expect(modelManager.isModelLoaded('face-detection')).toBe(false);
    });

    it('should return true for loaded model', async () => {
      await modelManager.loadModel('face-detection');
      expect(modelManager.isModelLoaded('face-detection')).toBe(true);
    });
  });

  describe('getLoadedModel', () => {
    it('should return null for unloaded model', () => {
      expect(modelManager.getLoadedModel('face-detection')).toBeNull();
    });

    it('should return model for loaded model', async () => {
      await modelManager.loadModel('face-detection');
      expect(modelManager.getLoadedModel('face-detection')).toBe(mockModel);
    });
  });

  describe('unloadModel', () => {
    it('should unload model and dispose resources', async () => {
      await modelManager.loadModel('face-detection');
      await modelManager.unloadModel('face-detection');

      expect(mockModel.dispose).toHaveBeenCalled();
      expect(modelManager.isModelLoaded('face-detection')).toBe(false);
    });

    it('should handle unloading non-existent model', async () => {
      await expect(modelManager.unloadModel('non-existent')).resolves.not.toThrow();
    });
  });

  describe('clearAllModels', () => {
    it('should clear all loaded models', async () => {
      await modelManager.loadModel('face-detection');
      await modelManager.loadModel('feature-extraction');
      
      await modelManager.clearAllModels();

      expect(mockModel.dispose).toHaveBeenCalledTimes(2);
      expect(modelManager.isModelLoaded('face-detection')).toBe(false);
      expect(modelManager.isModelLoaded('feature-extraction')).toBe(false);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify({
          name: 'face-detection',
          size: 1024,
          cachedAt: '2023-01-01T00:00:00.000Z',
        }))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const stats = await modelManager.getCacheStats();

      expect(stats.totalSize).toBe(1024);
      expect(stats.modelCount).toBe(1);
      expect(stats.models).toHaveLength(1);
      expect(stats.models[0].name).toBe('face-detection');
    });
  });

  describe('cleanupCache', () => {
    it('should cleanup old models when cache exceeds limit', async () => {
      // Mock large cache size
      const mockStats = {
        totalSize: 600 * 1024 * 1024, // 600MB (exceeds 500MB limit)
        modelCount: 2,
        models: [
          { name: 'old-model', size: 300 * 1024 * 1024, cachedAt: '2023-01-01T00:00:00.000Z' },
          { name: 'new-model', size: 300 * 1024 * 1024, cachedAt: '2023-01-02T00:00:00.000Z' },
        ],
      };

      jest.spyOn(modelManager, 'getCacheStats').mockResolvedValue(mockStats);
      (RNFS.exists as jest.Mock).mockResolvedValue(true);

      await modelManager.cleanupCache();

      expect(RNFS.unlink).toHaveBeenCalledWith('/mock/documents/ml_models/old-model');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('model_metadata_old-model');
    });

    it('should not cleanup when cache is within limit', async () => {
      const mockStats = {
        totalSize: 100 * 1024 * 1024, // 100MB (within 500MB limit)
        modelCount: 1,
        models: [
          { name: 'model', size: 100 * 1024 * 1024, cachedAt: '2023-01-01T00:00:00.000Z' },
        ],
      };

      jest.spyOn(modelManager, 'getCacheStats').mockResolvedValue(mockStats);

      await modelManager.cleanupCache();

      expect(RNFS.unlink).not.toHaveBeenCalled();
    });
  });
});