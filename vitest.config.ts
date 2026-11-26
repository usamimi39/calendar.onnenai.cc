import { defineConfig } from 'vitest/config'

// ロジック（src/lib）と Worker のハンドラ（src/worker）を Node で試す。画面のテストはしない
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
  },
})
