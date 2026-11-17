module.exports = {
  preset: '@react-native/jest-preset',
  resolver: '<rootDir>/node_modules/react-native-reanimated/jest/resolver.js',
  setupFilesAfterEnv: ['@shopify/flash-list/jestSetup'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/node_modules/@react-native-async-storage/async-storage/lib/module/jest/AsyncStorageMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|@shopify/flash-list|@react-native-async-storage/async-storage|zustand|react-native-reanimated|react-native-worklets|react-native-screens|react-native-safe-area-context)/)',
  ],
};
