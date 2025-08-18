import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
import { Platform } from 'react-native';

/**
 * TensorFlow.js setup and initialization for React Native
 * Handles platform-specific configurations and backend selection
 */
export class TensorFlowSetup {
  private static isInitialized = false;
  private static initializationPromise: Promise<void> | null = null;

  /**
   * Initialize TensorFlow.js with platform-specific configurations
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private static async performInitialization(): Promise<void> {
    try {
      // Wait for TensorFlow.js to be ready
      await tf.ready();

      // Set platform-specific configurations
      if (Platform.OS === 'ios') {
        await this.configureForIOS();
      } else if (Platform.OS === 'android') {
        await this.configureForAndroid();
      }

      // Verify backend is available
      const backend = tf.getBackend();
      console.log(`TensorFlow.js initialized with backend: ${backend}`);

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize TensorFlow.js:', error);
      throw new Error(`TensorFlow.js initialization failed: ${error}`);
    }
  }

  private static async configureForIOS(): Promise<void> {
    try {
      // Try to use WebGL backend for better performance on iOS
      if (tf.findBackend('webgl')) {
        await tf.setBackend('webgl');
      } else {
        await tf.setBackend('cpu');
      }
    } catch (error) {
      console.warn('WebGL backend not available on iOS, falling back to CPU:', error);
      await tf.setBackend('cpu');
    }
  }

  private static async configureForAndroid(): Promise<void> {
    try {
      // Try to use WebGL backend for better performance on Android
      if (tf.findBackend('webgl')) {
        await tf.setBackend('webgl');
      } else {
        await tf.setBackend('cpu');
      }
    } catch (error) {
      console.warn('WebGL backend not available on Android, falling back to CPU:', error);
      await tf.setBackend('cpu');
    }
  }

  /**
   * Get current backend information
   */
  static getBackendInfo(): {
    backend: string;
    isInitialized: boolean;
    memoryInfo?: tf.MemoryInfo;
  } {
    return {
      backend: tf.getBackend(),
      isInitialized: this.isInitialized,
      memoryInfo: this.isInitialized ? tf.memory() : undefined,
    };
  }

  /**
   * Clean up TensorFlow.js resources
   */
  static cleanup(): void {
    if (this.isInitialized) {
      tf.disposeVariables();
      this.isInitialized = false;
      this.initializationPromise = null;
    }
  }

  /**
   * Check if TensorFlow.js is ready for use
   */
  static isReady(): boolean {
    return this.isInitialized;
  }
}