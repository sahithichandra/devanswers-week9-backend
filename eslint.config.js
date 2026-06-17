import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['tests/**/*.js', 'vitest.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
    },
    rules: {
      'no-import-assign': 'off',
      'no-unused-vars': 'off',
    },
  },
];
