module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['@shopify/flash-list/jestSetup'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|@shopify/flash-list|react-native-screens|react-native-safe-area-context)/)',
  ],
};
