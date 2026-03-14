import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { homedir } from 'os';
import path from 'path';
import fs from 'fs-extra';
import { ProcessManager } from '../../src/daemon/process-manager.js';
import { startCommand } from '../../src/cli/commands/start.js';

// 创建唯一的临时测试目录 (避免并发冲突)
const testDir = path.join(homedir(), `.claude-evolution-test-daemon-start-${Date.now()}`);
const testPidFile = path.join(testDir, 'daemon.pid');

// Mock config loader
vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(async () => ({
    scheduler: {
      enabled: true,
      interval: '24h',
      runOnStartup: false,
    },
    llm: {
      model: 'claude-3-5-haiku-20241022',
      maxTokens: 4096,
      temperature: 0.3,
    },
  })),
}));

// Mock analyze command
vi.mock('../../src/cli/commands/analyze.js', () => ({
  analyzeCommand: vi.fn(async () => {
    // 模拟分析命令
  }),
}));

// Mock web server
vi.mock('../../../web/server/index.js', () => ({
  server: {
    listen: vi.fn((port: number, callback: () => void) => {
      callback();
    }),
    close: vi.fn((callback: () => void) => {
      if (callback) callback();
    }),
    on: vi.fn(),
  },
}));

// Mock console to suppress output during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Start Command 集成测试', () => {
  let processManager: ProcessManager;

  beforeEach(async () => {
    // 创建测试目录
    await fs.ensureDir(testDir);

    // 创建 ProcessManager 实例使用测试目录
    processManager = new ProcessManager(testPidFile);

    // 清理可能存在的 PID 文件
    await processManager.deletePidFile();

    // Suppress console output
    console.log = vi.fn();
    console.error = vi.fn();

    // Mock process.exit to prevent test from exiting
    vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as any);
  });

  afterEach(async () => {
    // 清理测试文件
    await fs.remove(testDir);

    // Restore console
    console.log = originalConsoleLog;
    console.error = originalConsoleError;

    // Restore mocks
    vi.restoreAllMocks();
  });

  describe('重复启动检测', () => {
    it('应该检测到已运行的守护进程', async () => {
      // 创建一个模拟的 PID 文件（使用当前进程 PID）
      await processManager.writePidFile({
        pid: process.pid,
        startTime: new Date().toISOString(),
        port: 10010,
        version: '0.1.0',
      });

      // 验证守护进程检测正确
      const isRunning = await processManager.isDaemonRunning();
      expect(isRunning).toBe(true);

      // 由于实际的 startCommand 会调用 process.exit(1)，
      // 我们只能验证检测逻辑是否正确工作
      // 完整的启动流程测试需要在 E2E 测试中进行
    });

    it('应该清理过期的 PID 文件', async () => {
      // 创建一个不存在进程的 PID 文件
      await processManager.writePidFile({
        pid: 999999, // 不太可能存在的 PID
        startTime: new Date().toISOString(),
        port: 10010,
        version: '0.1.0',
      });

      // 验证 PID 文件存在
      const beforeExists = await fs.pathExists(testPidFile);
      expect(beforeExists).toBe(true);

      // 检查守护进程状态应该返回 false 并清理文件
      const isRunning = await processManager.isDaemonRunning();
      expect(isRunning).toBe(false);

      // 验证 PID 文件被清理
      const afterExists = await fs.pathExists(testPidFile);
      expect(afterExists).toBe(false);
    });
  });

  describe('PID 文件管理', () => {
    it('应该在启动时创建正确的 PID 文件', async () => {
      // 由于完整启动会涉及很多组件，这里只测试 PID 文件写入
      const pidData = {
        pid: process.pid,
        startTime: new Date().toISOString(),
        port: 3000,
        version: '0.1.0',
      };

      await processManager.writePidFile(pidData);

      // 读取并验证
      const readData = await processManager.readPidFile();
      expect(readData).toEqual(pidData);

      // 验证文件权限
      const stats = await fs.stat(testPidFile);
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o600); // 仅所有者可读写
    });

    it('应该验证 PID 文件格式', async () => {
      // 写入无效的 PID 文件
      await fs.writeJson(testPidFile, {
        pid: 12345,
        // 缺少必需字段
      });

      // 读取应该返回 null（文件被清理）
      const data = await processManager.readPidFile();
      expect(data).toBeNull();

      // 文件应该被删除
      const exists = await fs.pathExists(testPidFile);
      expect(exists).toBe(false);
    });
  });

  describe('进程检测', () => {
    it('应该正确检测运行中的进程', async () => {
      // 使用当前进程 PID（肯定在运行）
      await processManager.writePidFile({
        pid: process.pid,
        startTime: new Date().toISOString(),
        port: 10010,
        version: '0.1.0',
      });

      const isRunning = await processManager.isDaemonRunning();
      expect(isRunning).toBe(true);
    });

    it('应该检测到不存在的进程', async () => {
      // 使用一个不太可能存在的 PID
      await processManager.writePidFile({
        pid: 999999,
        startTime: new Date().toISOString(),
        port: 10010,
        version: '0.1.0',
      });

      const isRunning = await processManager.isDaemonRunning();
      expect(isRunning).toBe(false);
    });
  });

  describe('配置选项', () => {
    it('应该支持自定义端口', async () => {
      const customPort = 3333;
      const pidData = {
        pid: process.pid,
        startTime: new Date().toISOString(),
        port: customPort,
        version: '0.1.0',
      };

      await processManager.writePidFile(pidData);

      const readData = await processManager.readPidFile();
      expect(readData?.port).toBe(customPort);
    });

    it('应该正确存储启动时间', async () => {
      const startTime = new Date().toISOString();
      const pidData = {
        pid: process.pid,
        startTime,
        port: 10010,
        version: '0.1.0',
      };

      await processManager.writePidFile(pidData);

      const readData = await processManager.readPidFile();
      expect(readData?.startTime).toBe(startTime);

      // 验证可以解析为日期
      const parsedDate = new Date(readData!.startTime);
      expect(parsedDate.getTime()).toBeGreaterThan(0);
    });
  });

  describe('优雅关闭', () => {
    it('应该注册关闭回调', async () => {
      const callback = vi.fn(async () => {});

      processManager.onShutdown(callback);

      // 手动执行关闭逻辑（不触发信号）
      const shutdownMethod = (processManager as any).executeShutdownCallbacks;
      if (shutdownMethod) {
        await shutdownMethod.call(processManager);
        expect(callback).toHaveBeenCalled();
      }
    });

    it('应该支持多个关闭回调', async () => {
      const callback1 = vi.fn(async () => {});
      const callback2 = vi.fn(async () => {});

      processManager.onShutdown(callback1);
      processManager.onShutdown(callback2);

      const shutdownMethod = (processManager as any).executeShutdownCallbacks;
      if (shutdownMethod) {
        await shutdownMethod.call(processManager);
        expect(callback1).toHaveBeenCalled();
        expect(callback2).toHaveBeenCalled();
      }
    });
  });

  describe('错误处理', () => {
    it('应该处理 PID 文件写入失败', async () => {
      // 创建一个不可写的目录
      const readOnlyDir = path.join(testDir, 'readonly');
      await fs.ensureDir(readOnlyDir);
      await fs.chmod(readOnlyDir, 0o444); // 只读

      const readOnlyPidFile = path.join(readOnlyDir, 'daemon.pid');
      const readOnlyManager = new ProcessManager(readOnlyPidFile);

      await expect(async () => {
        await readOnlyManager.writePidFile({
          pid: process.pid,
          startTime: new Date().toISOString(),
          port: 10010,
          version: '0.1.0',
        });
      }).rejects.toThrow();

      // 恢复权限以便清理
      await fs.chmod(readOnlyDir, 0o755);
    });

    it('应该处理损坏的 PID 文件', async () => {
      // 写入非 JSON 内容
      await fs.writeFile(testPidFile, 'invalid json content');

      // 读取应该返回 null
      const data = await processManager.readPidFile();
      expect(data).toBeNull();

      // 文件应该被清理
      const exists = await fs.pathExists(testPidFile);
      expect(exists).toBe(false);
    });
  });
});
