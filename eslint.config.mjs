import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['.codex/skills/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.node,
      },
      sourceType: 'module',
    },
  },
];
