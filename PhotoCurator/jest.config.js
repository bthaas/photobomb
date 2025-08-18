module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/src/**/*.test.ts',
    '**/src/**/*.test.tsx',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/**/*.stories.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '@tensorflow/tfjs': '<rootDir>/__mocks__/@tensorflow/tfjs.js',
    '@tensorflow/tfjs-react-native': '<rootDir>/__mocks__/@tensorflow/tfjs-react-native.js',
    '@tensorflow/tfjs-backend-cpu': '<rootDir>/__mocks__/@tensorflow/tfjs-backend-cpu.js',
    '@tensorflow/tfjs-backend-webgl': '<rootDir>/__mocks__/@tensorflow/tfjs-backend-webgl.js',
    'react-native-fs': '<rootDir>/__mocks__/react-native-fs.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-reanimated|react-native-gesture-handler|@react-navigation|@tensorflow)/)',
  ],
};
