import { mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * 测试临时目录管理工具
 *
 * 提供测试隔离的临时目录创建和清理功能
 */
export class TestTempDir {
  private tempDir: string | null = null;

  /**
   * 创建临时测试目录
   * @returns 临时目录路径
   */
  create(): string {
    if (this.tempDir) {
      throw new Error('临时目录已存在，请先调用 cleanup()');
    }

    this.tempDir = mkdtempSync(join(tmpdir(), 'claude-evolution-test-'));
    return this.tempDir;
  }

  /**
   * 获取当前临时目录路径
   * @returns 临时目录路径或 null
   */
  getPath(): string | null {
    return this.tempDir;
  }

  /**
   * 清理临时目录
   */
  cleanup(): void {
    if (this.tempDir && existsSync(this.tempDir)) {
      try {
        rmSync(this.tempDir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`清理临时目录失败: ${this.tempDir}`, error);
      }
      this.tempDir = null;
    }
  }

  /**
   * 确保清理（即使出错也会尝试清理）
   */
  ensureCleanup(): void {
    try {
      this.cleanup();
    } catch (error) {
      // 忽略清理错误
    }
  }
}

/**
 * Vitest 辅助函数：在每个测试前创建临时目录，测试后清理
 *
 * @example
 * ```ts
 * import { beforeEach, afterEach, describe, it } from 'vitest';
 * import { useTempDir } from '@tests/helpers/temp-dir';
 *
 * describe('My Test', () => {
 *   const { getTempDir } = useTempDir();
 *
 *   it('should work', () => {
 *     const tempDir = getTempDir();
 *     // 使用 tempDir 进行测试
 *   });
 * });
 * ```
 */
export function useTempDir() {
  const testTempDir = new TestTempDir();

  beforeEach(() => {
    testTempDir.create();
  });

  afterEach(() => {
    testTempDir.ensureCleanup();
  });

  return {
    getTempDir: () => {
      const path = testTempDir.getPath();
      if (!path) {
        throw new Error('临时目录未创建，请确保在 beforeEach 之后调用');
      }
      return path;
    },
  };
}
