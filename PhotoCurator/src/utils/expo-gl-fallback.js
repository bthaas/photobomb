/**
 * Fallback for expo-gl when not using Expo
 * Provides minimal compatibility for TensorFlow.js
 */

// Mock GLView component
export const GLView = () => {
  console.warn('GLView is not available in this React Native environment. AI features may be limited.');
  return null;
};

// Mock GL context
export const GL = {
  // Add minimal GL constants that TensorFlow.js might need
  RGBA: 6408,
  UNSIGNED_BYTE: 5121,
  TEXTURE_2D: 3553,
  NEAREST: 9728,
  LINEAR: 9729,
};

// Default export for compatibility
export default {
  GLView,
  GL,
};