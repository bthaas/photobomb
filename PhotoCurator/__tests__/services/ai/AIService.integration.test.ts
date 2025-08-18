import { AIService } from '../../../src/services/ai/AIService';

// Simple integration test for AIService
describe('AIService Integration', () => {
  let aiService: AIService;

  beforeEach(() => {
    // Reset singleton instance
    (AIService as any).instance = undefined;
    aiService = AIService.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AIService.getInstance();
      const instance2 = AIService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialization', () => {
    it('should initialize without throwing errors', async () => {
      await expect(aiService.initialize()).resolves.not.toThrow();
    });

    it('should return status information', () => {
      const status = aiService.getStatus();
      expect(status).toHaveProperty('isInitialized');
      expect(status).toHaveProperty('backend');
      expect(status).toHaveProperty('loadedModels');
      expect(status).toHaveProperty('availableModels');
    });
  });

  describe('model management', () => {
    it('should check if model is ready', () => {
      const isReady = aiService.isModelReady('face-detection');
      expect(typeof isReady).toBe('boolean');
    });

    it('should get model (returns null when not loaded)', () => {
      const model = aiService.getModel('face-detection');
      expect(model).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should get error statistics', () => {
      const stats = aiService.getErrorStats('face-detection');
      expect(stats).toHaveProperty('totalErrors');
      expect(stats).toHaveProperty('errorsByType');
    });

    it('should get user-friendly error message', () => {
      const message = aiService.getUserFriendlyErrorMessage('face-detection');
      expect(message === null || typeof message === 'string').toBe(true);
    });

    it('should get recovery actions', () => {
      const actions = aiService.getRecoveryActions('face-detection');
      expect(Array.isArray(actions)).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should cleanup without throwing errors', async () => {
      await expect(aiService.cleanup()).resolves.not.toThrow();
    });
  });
});