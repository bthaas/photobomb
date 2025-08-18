import { TensorFlowSetup } from '../../../src/services/ai/TensorFlowSetup';
import * as tf from '@tensorflow/tfjs';
import { Platform } from 'react-native';

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs', () => ({
  ready: jest.fn(),
  setBackend: jest.fn(),
  getBackend: jest.fn(),
  findBackend: jest.fn(),
  memory: jest.fn(),
  disposeVariables: jest.fn(),
}));

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

describe('TensorFlowSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset static state
    (TensorFlowSetup as any).isInitialized = false;
    (TensorFlowSetup as any).initializationPromise = null;
  });

  describe('initialize', () => {
    it('should initialize TensorFlow.js successfully', async () => {
      (tf.ready as jest.Mock).mockResolvedValue(undefined);
      (tf.findBackend as jest.Mock).mockReturnValue(true);
      (tf.setBackend as jest.Mock).mockResolvedValue(undefined);
      (tf.getBackend as jest.Mock).mockReturnValue('webgl');

      await TensorFlowSetup.initialize();

      expect(tf.ready).toHaveBeenCalled();
      expect(tf.setBackend).toHaveBeenCalledWith('webgl');
      expect(TensorFlowSetup.isReady()).toBe(true);
    });

    it('should fallback to CPU backend when WebGL is not available', async () => {
      (tf.ready as jest.Mock).mockResolvedValue(undefined);
      (tf.findBackend as jest.Mock).mockReturnValue(false);
      (tf.setBackend as jest.Mock).mockResolvedValue(undefined);
      (tf.getBackend as jest.Mock).mockReturnValue('cpu');

      await TensorFlowSetup.initialize();

      expect(tf.setBackend).toHaveBeenCalledWith('cpu');
    });

    it('should handle WebGL backend failure and fallback to CPU', async () => {
      (tf.ready as jest.Mock).mockResolvedValue(undefined);
      (tf.findBackend as jest.Mock).mockReturnValue(true);
      (tf.setBackend as jest.Mock)
        .mockRejectedValueOnce(new Error('WebGL not supported'))
        .mockResolvedValueOnce(undefined);
      (tf.getBackend as jest.Mock).mockReturnValue('cpu');

      await TensorFlowSetup.initialize();

      expect(tf.setBackend).toHaveBeenCalledWith('webgl');
      expect(tf.setBackend).toHaveBeenCalledWith('cpu');
    });

    it('should configure for Android platform', async () => {
      (Platform as any).OS = 'android';
      (tf.ready as jest.Mock).mockResolvedValue(undefined);
      (tf.findBackend as jest.Mock).mockReturnValue(true);
      (tf.setBackend as jest.Mock).mockResolvedValue(undefined);
      (tf.getBackend as jest.Mock).mockReturnValue('webgl');

      await TensorFlowSetup.initialize();

      expect(tf.setBackend).toHaveBeenCalledWith('webgl');
    });

    it('should throw error when TensorFlow.js fails to initialize', async () => {
      const error = new Error('TensorFlow.js initialization failed');
      (tf.ready as jest.Mock).mockRejectedValue(error);

      await expect(TensorFlowSetup.initialize()).rejects.toThrow(
        'TensorFlow.js initialization failed: Error: TensorFlow.js initialization failed'
      );
    });

    it('should return same promise for concurrent initialization calls', async () => {
      (tf.ready as jest.Mock).mockResolvedValue(undefined);
      (tf.findBackend as jest.Mock).mockReturnValue(true);
      (tf.setBackend as jest.Mock).mockResolvedValue(undefined);
      (tf.getBackend as jest.Mock).mockReturnValue('webgl');

      const promise1 = TensorFlowSetup.initialize();
      const promise2 = TensorFlowSetup.initialize();

      // Both promises should resolve to the same value
      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toBe(result2);
      expect(tf.ready).toHaveBeenCalledTimes(1);
    });

    it('should not reinitialize if already initialized', async () => {
      (tf.ready as jest.Mock).mockResolvedValue(undefined);
      (tf.findBackend as jest.Mock).mockReturnValue(true);
      (tf.setBackend as jest.Mock).mockResolvedValue(undefined);
      (tf.getBackend as jest.Mock).mockReturnValue('webgl');

      await TensorFlowSetup.initialize();
      await TensorFlowSetup.initialize();

      expect(tf.ready).toHaveBeenCalledTimes(1);
    });
  });

  describe('getBackendInfo', () => {
    it('should return backend information', () => {
      (tf.getBackend as jest.Mock).mockReturnValue('webgl');
      (tf.memory as jest.Mock).mockReturnValue({ numTensors: 0, numDataBuffers: 0 });

      const info = TensorFlowSetup.getBackendInfo();

      expect(info).toEqual({
        backend: 'webgl',
        isInitialized: false,
        memoryInfo: undefined,
      });
    });

    it('should include memory info when initialized', async () => {
      (tf.ready as jest.Mock).mockResolvedValue(undefined);
      (tf.findBackend as jest.Mock).mockReturnValue(true);
      (tf.setBackend as jest.Mock).mockResolvedValue(undefined);
      (tf.getBackend as jest.Mock).mockReturnValue('webgl');
      (tf.memory as jest.Mock).mockReturnValue({ numTensors: 5, numDataBuffers: 3 });

      await TensorFlowSetup.initialize();
      const info = TensorFlowSetup.getBackendInfo();

      expect(info).toEqual({
        backend: 'webgl',
        isInitialized: true,
        memoryInfo: { numTensors: 5, numDataBuffers: 3 },
      });
    });
  });

  describe('cleanup', () => {
    it('should cleanup TensorFlow.js resources', async () => {
      (tf.ready as jest.Mock).mockResolvedValue(undefined);
      (tf.findBackend as jest.Mock).mockReturnValue(true);
      (tf.setBackend as jest.Mock).mockResolvedValue(undefined);
      (tf.getBackend as jest.Mock).mockReturnValue('webgl');

      await TensorFlowSetup.initialize();
      TensorFlowSetup.cleanup();

      expect(tf.disposeVariables).toHaveBeenCalled();
      expect(TensorFlowSetup.isReady()).toBe(false);
    });

    it('should handle cleanup when not initialized', () => {
      expect(() => TensorFlowSetup.cleanup()).not.toThrow();
      expect(tf.disposeVariables).not.toHaveBeenCalled();
    });
  });

  describe('isReady', () => {
    it('should return false when not initialized', () => {
      expect(TensorFlowSetup.isReady()).toBe(false);
    });

    it('should return true when initialized', async () => {
      (tf.ready as jest.Mock).mockResolvedValue(undefined);
      (tf.findBackend as jest.Mock).mockReturnValue(true);
      (tf.setBackend as jest.Mock).mockResolvedValue(undefined);
      (tf.getBackend as jest.Mock).mockReturnValue('webgl');

      await TensorFlowSetup.initialize();

      expect(TensorFlowSetup.isReady()).toBe(true);
    });
  });
});