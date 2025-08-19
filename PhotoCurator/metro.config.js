const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    assetExts: ['bin', 'txt', 'jpg', 'png', 'json', 'gif', 'webp', 'svg'],
    alias: {
      // Use installed expo modules if available, otherwise use polyfills
      'expo-asset': path.resolve(__dirname, 'node_modules/expo-asset'),
      'expo-file-system': path.resolve(__dirname, 'node_modules/expo-file-system'),
      'expo-constants': path.resolve(__dirname, 'node_modules/expo-constants'),
      // Fallback for expo-gl when not available
      'expo-gl': path.resolve(__dirname, 'src/utils/expo-gl-fallback.js'),
      'expo-gl-cpp': path.resolve(__dirname, 'src/utils/expo-gl-fallback.js'),
    },
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
