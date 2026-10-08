import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.venv/**',
      '.npm-cache/**',
      '**/cdk.out/**',
      '**/cdk.test.out/**',
      'infra/.cdk/**',
      '.tools/**',
      '.browser-profile/**',
      '.deployment/**',
      '.tmp/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  prettier,
);
