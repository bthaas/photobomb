// Polyfills for Expo modules in plain React Native
// This allows TensorFlow.js React Native to work without full Expo setup

// Mock expo-asset
if (!global.expo) {
  global.expo = {};
}

// Simple Asset polyfill
const Asset = {
  fromModule: (module) => ({
    uri: module,
    localUri: module,
    downloaded: true,
    downloadAsync: () => Promise.resolve(),
  }),
  loadAsync: (assets) => Promise.resolve(assets),
};

// Simple FileSystem polyfill using react-native-fs
const FileSystem = {
  documentDirectory: require('react-native-fs').DocumentDirectoryPath + '/',
  cacheDirectory: require('react-native-fs').CachesDirectoryPath + '/',
  
  readAsStringAsync: (uri) => {
    return require('react-native-fs').readFile(uri, 'utf8');
  },
  
  writeAsStringAsync: (uri, contents) => {
    return require('react-native-fs').writeFile(uri, contents, 'utf8');
  },
  
  deleteAsync: (uri) => {
    return require('react-native-fs').unlink(uri);
  },
  
  getInfoAsync: (uri) => {
    return require('react-native-fs').stat(uri).then(stats => ({
      exists: true,
      isDirectory: stats.isDirectory(),
      size: stats.size,
      modificationTime: stats.mtime.getTime(),
    })).catch(() => ({ exists: false }));
  },
};

// Simple Constants polyfill
const Constants = {
  platform: {
    ios: require('react-native').Platform.OS === 'ios' ? {} : undefined,
    android: require('react-native').Platform.OS === 'android' ? {} : undefined,
  },
  deviceName: 'React Native Device',
  isDevice: true,
};

// Export polyfills
module.exports = {
  Asset,
  FileSystem,
  Constants,
};