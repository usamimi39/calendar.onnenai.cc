//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    // tsconfig を 画面 / Worker / Node に分けたので、型情報はそれぞれから読む
    languageOptions: {
      parserOptions: {
        project: [
          './tsconfig.app.json',
          './tsconfig.worker.json',
          './tsconfig.node.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      // astryx theme build / theme add の生成物
      'src/astryx-themes.ts',
      'src/themes/*/*.js',
      'src/themes/*/*.d.ts',
      'src/themes/*/*.doc.mjs',
      // wrangler types の生成物
      'worker-configuration.d.ts',
      'dist',
      '.wrangler',
    ],
  },
]
