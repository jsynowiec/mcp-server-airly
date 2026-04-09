// ABOUTME: ESLint flat config for TypeScript.
// ABOUTME: Uses typescript-eslint recommended rules.

import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/'],
  },
  ...tseslint.configs.recommended,
);
