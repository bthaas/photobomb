import { AIService } from '../../../src/services/ai/AIService';
import { TensorFlowSetup } from '../../../src/services/ai/TensorFlowSetup';
import { ModelManager } from '../../../src/services/ai/ModelManager';
import { ModelErrorHandler } from '../../../src/services/ai/ModelErrorHandler';

// Mock dependencies
jest.mock('../../../src/services/ai/TensorFlowSetup');
jest.mock('../../../src/services/ai/ModelManager');
jest.mock('../../../src/services/ai/ModelErrorHandler');

describe('AIService', () => {
  let aiService: AIService;
  let mockModelManager: jest.Mocked<ModelManager>;
  let mockErrorHandler: jest.Mocked<ModelErrorHandler>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (AIService as any).instance = undefined;
    aiService = AIService.getInstance();

    // Mock ModelManager
    mockModelManager = {
      loadModel: jest.fn(),
      getAvailableModels: jest.fn(),
      isModelLoaded: jest.fn(),
      getLoadedModel: jest.fn(),
      unloadModel: jest.fn(),
      clearAllModels: jest.fn(),
      getCacheStats: jest.fn(),
      cleanupCache: jest.fn(),
    } as any;
    (ModelManager.getInstance as jest.Mock).mockReturnValue(mockModelManager);

    // Mock ErrorHandler
    mockErrorHandler = {
      handleModelError: jest.fn(),
      getModelErrorStats: jest.fn(),
      getUserFriendlyMessage: jest.fn(),
      getRecoveryActions: jest.fn(),
    } as any;
    (ModelErrorHandler.getInstance as jest.Mock).mockReturnValue(mockErrorHandler);

    // Mock TensorFlowSetup
    (TensorFlowSetup.initialize as jest.Mock).mockResolvedValue(undefined);
    (TensorFlowSetup.getBackendInfo as jest.Mock).mockReturnValue({
      backend: 'webgl',
      isInitialized: true,
      memoryInfo: { numTensors: 0 },
    });
    (TensorFlowSetup.cleanup as jest.Mock).mockImplementation(() => {});
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AIService.getInstance();
      const instance2 = AIService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await aiService.initialize();

      expect(TensorFlowSetup.initialize).toHaveBeenCalled();
      expect(mockModelManager.cleanupCache).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      await aiService.initialize();
      await aiService.initialize();

      expect(TensorFlowSetup.initialize).toHaveBeenCalledTimes(1);
      expect(mockModelManager.cleanupCache).toHaveBeenCalledTimes(1);
    });

    it('should return same promise for concurrent initialization', async () => {
      const promise1 = aiService.initialize();
      const promise2 = aiService.initialize();

      expect(promise1).toBe(promise2);
      await promise1;
      await promise2;
    });

    it('should throw error if initialization fails', async () => {
      const error = new Error('Initialization failed');
      (TensorFlowSetup.initialize as jest.Mock).mockRejectedValue(error);

      await expect(aiService.initialize()).rejects.toThrow('Initialization failed');
    });
  });

  describe('loadModel', () => {
    beforeEach(() => {
      mockModelManager.loadModel.mockResolvedValue({
        model: {} as any,
        loadTime: 1000,
        fromCache: false,
      });
    });

    it('should load model successfully', async () => {
      const result = await aiService.loadModel('face-detection');

      expect(aiService.initialize).toHaveBeenCalled();
      expect(mockModelManager.loadModel).toHaveBeenCalledWith('face-detection', undefined);
      expect(result.loadTime).toBe(1000);
    });

    it('should handle progress callback', async () => {
      const onProgress = jest.fn();
      
      await aiService.loadModel('face-detection', { onProgress });

      expect(mockModelManager.loadModel).toHaveBeenCalledWith('face-detection', onProgress);
    });

    it('should handle timeout', async () => {
      mockModelManager.loadModel.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 2000))
      );

      await expect(
        aiService.loadModel('face-detection', { timeout: 1000 })
      ).rejects.toThrow('Model loading timeout');
    });

    it('should retry on error', async () => {
      const error = new Error('Network error');
      mockModelManager.loadModel
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          model: {} as any,
          loadTime: 1000,
          fromCache: false,
        });

      mockErrorHandler.handleModelError.mockResolvedValue({
        shouldRetry: true,
        delay: 100,
      });

      const result = await aiService.loadModel('face-detection');

      expect(mockErrorHandler.handleModelError).toHaveBeenCalledWith(error, 'face-detection', 1);
      expect(mockModelManager.loadModel).toHaveBeenCalledTimes(2);
      expect(result.loadTime).toBe(1000);
    });

    it('should use fallback model when retries exhausted', async () => {
      const error = new Error('Network error');
      mockModelManager.loadModel
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          model: {} as any,
          loadTime: 500,
          fromCache: false,
        });

      mockErrorHandler.handleModelError.mockResolvedValue({
        shouldRetry: false,
        delay: 0,
        fallbackModel: 'fallback-model',
      });

      const result = await aiService.loadModel('face-detection');

      expect(mockModelManager.loadModel).toHaveBeenCalledWith('face-detection', undefined);
      expect(mockModelManager.loadModel).toHaveBeenCalledWith('fallback-model', undefined);
      expect(result.loadTime).toBe(500);
    });

    it('should call error callback', async () => {
      const error = new Error('Network error');
      const onError = jest.fn();
      
      mockModelManager.loadModel.mockRejectedValue(error);
      mockErrorHandler.handleModelError.mockResolvedValue({
        shouldRetry: false,
        delay: 0,
      });

      await expect(
        aiService.loadModel('face-detection', { onError })
      ).rejects.toThrow('Network error');

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Network error',
          modelName: 'face-detection',
        })
      );
    });
  });

  describe('loadModels', () => {
    it('should load multiple models concurrently', async () => {
      mockModelManager.loadModel.mockResolvedValue({
        model: {} as any,
        loadTime: 1000,
        fromCache: false,
      });

      const results = await aiService.loadModels(['face-detection', 'feature-extraction']);

      expect(mockModelManager.loadModel).toHaveBeenCalledTimes(2);
      expect(results.size).toBe(2);
      expect(results.has('face-detection')).toBe(true);
      expect(results.has('feature-extraction')).toBe(true);
    });

    it('should continue loading other models if one fails', async () => {
      mockModelManager.loadModel
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({
          model: {} as any,
          loadTime: 1000,
          fromCache: false,
        });

      mockErrorHandler.handleModelError.mockResolvedValue({
        shouldRetry: false,
        delay: 0,
      });

      const results = await aiService.loadModels(['face-detection', 'feature-extraction']);

      expect(results.size).toBe(1);
      expect(results.has('feature-extraction')).toBe(true);
    });
  });

  describe('preloadEssentialModels', () => {
    it('should preload feature extraction model', async () => {
      mockModelManager.loadModel.mockResolvedValue({
        model: {} as any,
        loadTime: 1000,
        fromCache: false,
      });

      await aiService.preloadEssentialModels();

      expect(mockModelManager.loadModel).toHaveBeenCalledWith('feature-extraction', { onProgress: undefined });
    });

    it('should not throw error if preloading fails', async () => {
      mockModelManager.loadModel.mockRejectedValue(new Error('Failed'));
      mockErrorHandler.handleModelError.mockResolvedValue({
        shouldRetry: false,
        delay: 0,
      });

      await expect(aiService.preloadEssentialModels()).resolves.not.toThrow();
    });
  });

  describe('loadModelsForFeatures', () => {
    beforeEach(() => {
      mockModelManager.getAvailableModels.mockReturnValue([
        {
          name: 'face-detection',
          url: 'test-url',
          version: '1.0.0',
          size: 1024,
          description: 'Test model',
          requiredFor: ['face-detection', 'face-clustering'],
        },
        {
          name: 'feature-extraction',
          url: 'test-url',
          version: '1.0.0',
          size: 2048,
          description: 'Test model',
          requiredFor: ['feature-extraction', 'clustering'],
        },
      ]);

      mockModelManager.loadModel.mockResolvedValue({
        model: {} as any,
        loadTime: 1000,
        fromCache: false,
      });
    });

    it('should load models required for features', async () => {
      await aiService.loadModelsForFeatures(['face-detection', 'clustering']);

      expect(mockModelManager.loadModel).toHaveBeenCalledTimes(2);
      expect(mockModelManager.loadModel).toHaveBeenCalledWith('face-detection', undefined);
      expect(mockModelManager.loadModel).toHaveBeenCalledWith('feature-extraction', undefined);
    });

    it('should not load models if no features match', async () => {
      await aiService.loadModelsForFeatures(['unknown-feature']);

      expect(mockModelManager.loadModel).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return service status', () => {
      mockModelManager.getAvailableModels.mockReturnValue([
        {
          name: 'face-detection',
          url: 'test-url',
          version: '1.0.0',
          size: 1024,
          description: 'Test model',
          requiredFor: ['face-detection'],
        },
      ]);
      mockModelManager.isModelLoaded.mockReturnValue(true);

      const status = aiService.getStatus();

      expect(status.isInitialized).toBe(true);
      expect(status.backend).toBe('webgl');
      expect(status.loadedModels).toContain('face-detection');
      expect(status.availableModels).toHaveLength(1);
      expect(status.memoryUsage).toEqual({ numTensors: 0 });
    });
  });

  describe('getModel', () => {
    it('should return loaded model', () => {
      const mockModel = {} as any;
      mockModelManager.getLoadedModel.mockReturnValue(mockModel);

      const model = aiService.getModel('face-detection');

      expect(model).toBe(mockModel);
      expect(mockModelManager.getLoadedModel).toHaveBeenCalledWith('face-detection');
    });
  });

  describe('isModelReady', () => {
    it('should check if model is ready', () => {
      mockModelManager.isModelLoaded.mockReturnValue(true);

      const isReady = aiService.isModelReady('face-detection');

      expect(isReady).toBe(true);
      expect(mockModelManager.isModelLoaded).toHaveBeenCalledWith('face-detection');
    });
  });

  describe('unloadModel', () => {
    it('should unload model', async () => {
      await aiService.unloadModel('face-detection');

      expect(mockModelManager.unloadModel).toHaveBeenCalledWith('face-detection');
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const mockStats = { totalSize: 1024, modelCount: 1, models: [] };
      mockModelManager.getCacheStats.mockResolvedValue(mockStats);

      const stats = await aiService.getCacheStats();

      expect(stats).toBe(mockStats);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources', async () => {
      await aiService.cleanup();

      expect(mockModelManager.clearAllModels).toHaveBeenCalled();
      expect(TensorFlowSetup.cleanup).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should get error statistics', () => {
      const mockStats = { totalErrors: 1, errorsByType: {}, lastError: undefined };
      mockErrorHandler.getModelErrorStats.mockReturnValue(mockStats);

      const stats = aiService.getErrorStats('face-detection');

      expect(stats).toBe(mockStats);
      expect(mockErrorHandler.getModelErrorStats).toHaveBeenCalledWith('face-detection');
    });

    it('should get user-friendly error message', () => {
      const mockMessage = 'User friendly message';
      mockErrorHandler.getModelErrorStats.mockReturnValue({
        totalErrors: 1,
        errorsByType: {},
        lastError: {} as any,
      });
      mockErrorHandler.getUserFriendlyMessage.mockReturnValue(mockMessage);

      const message = aiService.getUserFriendlyErrorMessage('face-detection');

      expect(message).toBe(mockMessage);
    });

    it('should get recovery actions', () => {
      const mockActions = ['Action 1', 'Action 2'];
      mockErrorHandler.getModelErrorStats.mockReturnValue({
        totalErrors: 1,
        errorsByType: {},
        lastError: {} as any,
      });
      mockErrorHandler.getRecoveryActions.mockReturnValue(mockActions);

      const actions = aiService.getRecoveryActions('face-detection');

      expect(actions).toBe(mockActions);
    });
  });
});