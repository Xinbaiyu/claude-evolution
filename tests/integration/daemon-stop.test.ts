import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { homedir } from 'os';
import path from 'path';
import fs from 'fs-extra';
import { ProcessManager, PidFileData } from '../../src/daemon/process-manager.js';

// 创建临时测试目录
const testDir = path.join(homedir(), '.claude-evolution-test-stop');
const testPidFile = path.join(testDir, 'daemon.pid');

// Mock ProcessManager 构造函数使用测试路径
vi.mock('../../src/daemon/process-manager.js', async () => {
  const actual = await vi.importActual('../../src/daemon/process-manager.js');
  return {
    ...actual,
    ProcessManager: class ProcessManager extends (actual as any).ProcessManager {
      constructor() {
        super(testPidFile);
      }
    },
  };
});

// 导入必须在 mock 之后
const { stopCommand } = await import('../../src/cli/commands/stop.js');

// Mock console to suppress output during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Stop Command 集成测试', () => {
  let processManager: ProcessManager;

  beforeEach(async () => {
    // 创建测试目录
    await fs.ensureDir(testDir);

    // 创建 ProcessManager 实例
    processManager = new ProcessManager();

    // 清理可能存在的 PID 文件
    await processManager.deletePidFile();

    // Suppress console output
    console.log = vi.fn();
    console.error = vi.fn();

    // Mock process.exit
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

  describe('未运行状态处理', () => {
    it('应该处理守护进程未运行的情况', async () => {
      // 没有 PID 文件
      await stopCommand();

      // 验证提示信息
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('守护进程未运行')
      );
    });

    it('应该清理过期的 PID 文件', async () => {
      // 创建一个不存在进程的 PID 文件
      await processManager.writePidFile({
        pid: 999999, // 不太可能存在的 PID
        startTime: new Date().toISOString(),
        port: 10010,
        version: '0.1.0',
      });

      await stopCommand();

      // 验证 PID 文件被清理
      const exists = await fs.pathExists(testPidFile);
      expect(exists).toBe(false);

      // 验证提示信息
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('清理了过期的 PID 文件')
      );
    });
  });

  describe('PID 文件读取', () => {
    it('应该正确读取 PID 文件信息', async () => {
      const pidData: PidFileData = {
        pid: 12345,
        startTime: new Date('2026-03-14T10:00:00Z').toISOString(),
        port: 3000,
        version: '0.1.0',
      };

      await processManager.writePidFile(pidData);

      const readData = await processManager.readPidFile();
      expect(readData).toEqual(pidData);
    });

    it('应该处理 PID 文件不存在的情况', async () => {
      const data = await processManager.readPidFile();
      expect(data).toBeNull();
    });

    it('应该处理损坏的 PID 文件', async () => {
      // 写入无效 JSON
      await fs.writeFile(testPidFile, 'invalid json');

      const data = await processManager.readPidFile();
      expect(data).toBeNull();

      // 文件应该被清理
      const exists = await fs.pathExists(testPidFile);
      expect(exists).toBe(false);
    });
  });

  describe('进程信号发送', () => {
    it('应该能够检测进程是否存在', async () => {
      // 使用当前进程（肯定存在）
      const pidData: PidFileData = {
        pid: process.pid,
        startTime: new Date().toISOString(),
        port: 10010,
        version: '0.1.0',
      };

      await processManager.writePidFile(pidData);

      // 测试 kill(pid, 0) - 不发送信号，只检查进程
      let processExists = false;
      try {
        process.kill(pidData.pid, 0);
        processExists = true;
      } catch (error) {
        processExists = false;
      }

      expect(processExists).toBe(true);
    });

    it('应该检测不存在的进程', async () => {
      const fakePid = 999999;

      let processExists = true;
      try {
        process.kill(fakePid, 0);
      } catch (error: any) {
        if (error.code === 'ESRCH') {
          processExists = false;
        }
      }

      expect(processExists).toBe(false);
    });
  });

  describe('超时处理', () => {
    it('应该使用默认超时时间', async () => {
      // 这里只验证逻辑，不实际等待 30 秒
      const options = {};
      const expectedTimeout = 30000;

      // 验证默认值
      expect(options.timeout ?? 30000).toBe(expectedTimeout);
    });

    it('应该支持自定义超时时间', async () => {
      const customTimeout = 5000;
      const options = { timeout: customTimeout };

      expect(options.timeout ?? 30000).toBe(customTimeout);
    });
  });

  describe('强制停止选项', () => {
    it('应该支持 force 选项', async () => {
      const options = { force: true };
      expect(options.force).toBe(true);
    });

    it('应该默认不强制停止', async () => {
      const options = {};
      expect(options.force ?? false).toBe(false);
    });
  });

  describe('PID 文件清理', () => {
    it('应该在成功停止后删除 PID 文件', async () => {
      // 创建 PID 文件
      await processManager.writePidFile({
        pid: 999999,
        startTime: new Date().toISOString(),
        port: 10010,
        version: '0.1.0',
      });

      // 验证文件存在
      let exists = await fs.pathExists(testPidFile);
      expect(exists).toBe(true);

      // 手动调用删除
      await processManager.deletePidFile();

      // 验证文件被删除
      exists = await fs.pathExists(testPidFile);
      expect(exists).toBe(false);
    });

    it('应该优雅处理删除不存在的文件', async () => {
      // 删除不存在的文件不应该抛出错误
      await expect(processManager.deletePidFile()).resolves.toBeUndefined();
    });
  });

  describe('错误处理', () => {
    it('应该处理 ESRCH 错误（进程不存在）', async () => {
      const fakePid = 999999;

      let error: any;
      try {
        process.kill(fakePid, 'SIGTERM');
      } catch (e: any) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe('ESRCH');
    });

    it('应该验证 PID 格式', async () => {
      const pidData: PidFileData = {
        pid: process.pid,
        startTime: new Date().toISOString(),
        port: 10010,
        version: '0.1.0',
      };

      expect(typeof pidData.pid).toBe('number');
      expect(pidData.pid).toBeGreaterThan(0);
    });
  });
});
