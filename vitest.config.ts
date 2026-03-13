import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // 全局配置
    globals: true,
    environment: 'node',

    // 测试文件匹配模式
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'web'],

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      include: [
        'src/learners/**/*.ts',
        'src/analyzers/**/*.ts',
        'src/generators/**/*.ts',
        'src/cli/commands/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        '**/index.ts',
        'src/types/**',
      ],
      // 覆盖率阈值（根据实际情况调整）
      thresholds: {
        // 全局阈值设置较低，允许某些模块暂时低于目标
        lines: 60,
        functions: 75,
        branches: 70,
        statements: 60,
        // 针对核心模块的特定阈值
        'src/learners/**': {
          lines: 85,
          functions: 95,
          statements: 85,
        },
        'src/analyzers/experience-extractor.ts': {
          lines: 95,
          functions: 100,
          statements: 95,
        },
      },
      // 输出目录
      reportsDirectory: './coverage',
    },

    // 性能配置
    testTimeout: 10000, // 10 秒超时
    hookTimeout: 10000,

    // 并行配置
    threads: true,
    maxThreads: 4,
    minThreads: 1,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests'),
    },
  },
});
