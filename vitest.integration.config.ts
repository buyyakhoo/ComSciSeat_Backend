import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/integration/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 15000,
    coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**/*.ts'],
        exclude: [
            'src/index.ts',
            'src/generated/**',
            '**/*.d.ts',
            'src/tests/**',
            'src/shared/**'
        ],
        reportsDirectory: './coverage-integration'
    }
  }
})