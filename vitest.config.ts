import { defineConfig } from 'vitest/config'

// Feature tests use Vitest (*.spec.ts). The older suites use `npm test` (tsx --test, *.test.ts).
export default defineConfig({
  test: {
    include: ['src/features/**/__tests__/**/*.spec.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/features/subject-line-tester/engine/**/*.ts'],
      exclude: ['src/features/subject-line-tester/engine/types.ts'],
      reporter: ['text', 'json-summary'],
      thresholds: { lines: 90 },
    },
  },
})
