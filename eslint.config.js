import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'web/client/dist/**',
      'web/client/node_modules/**',
      '**/*.d.ts',
      'coverage/**',
      '**/*.bak',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript 特定规则
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_', // 允许 catch (_error)
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-require-imports': 'warn', // 降级为警告

      // 通用规则
      'no-console': 'off', // CLI 工具需要 console
      'no-debugger': 'error',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always'],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.js'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
