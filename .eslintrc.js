const reactImports = [
  { name: 'react', message: 'Esta capa no puede depender de React.' },
  { name: 'react-native', message: 'Esta capa no puede depender de React Native.' },
];

module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      // Domain: TypeScript puro. No conoce React, ni data, ni presentation.
      files: ['src/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: reactImports,
            patterns: [
              { group: ['**/data/**', '**/presentation/**', '**/app/**', '**/core/**'], message: 'Domain no depende de capas externas.' },
            ],
          },
        ],
      },
    },
    {
      // Data: implementa puertos de dominio. Sin React ni presentation.
      files: ['src/data/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: reactImports,
            patterns: [
              { group: ['**/presentation/**', '**/app/**', '**/core/theme/**'], message: 'Data no conoce la UI.' },
            ],
          },
        ],
      },
    },
    {
      // Presentation: solo habla con dominio (interfaces) vía DI. Nunca con data.
      files: ['src/presentation/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              { group: ['**/data/**'], message: 'Presentation consume puertos de dominio inyectados (app/di), no implementaciones.' },
            ],
          },
        ],
      },
    },
  ],
};
