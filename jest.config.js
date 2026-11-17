module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['@shopify/flash-list/jestSetup'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/node_modules/@react-native-async-storage/async-storage/lib/module/jest/AsyncStorageMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|@shopify/flash-list|@react-native-async-storage/async-storage|zustand|react-native-screens|react-native-safe-area-context)/)',
  ],
};
