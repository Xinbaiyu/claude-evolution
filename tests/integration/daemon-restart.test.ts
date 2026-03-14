import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { homedir } from 'os';
import path from 'path';
import fs from 'fs-extra';
import { ProcessManager, PidFileData } from '../../src/daemon/process-manager.js';

// 创建临时测试目录
const testDir = path.join(homedir(), '.claude-evolution-test-restart');
const testPidFile = path.join(testDir, 'daemon.pid');

// Mock ProcessManager
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

// Mock stop command
const mockStopCommand = vi.fn(async () => {
  // 模拟停止成功
});

vi.mock('../../src/cli/commands/stop.js', () => ({
  stopCommand: mockStopCommand,
}));

// Mock start command
const mockStartCommand = vi.fn(async () => {
  // 模拟启动成功
});

vi.mock('../../src/cli/commands/start.js', () => ({
  startCommand: mockStartCommand,
}));

// 导入必须在 mock 之后
const { restartCommand } = await import('../../src/cli/commands/restart.js');

// Mock console to suppress output during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Restart Command 集成测试', () => {
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

    // 清理 mock 调用记录并设置默认行为
    mockStopCommand.mockClear();
    mockStartCommand.mockClear();

    // 默认的 stopCommand 行为：删除 PID 文件
    mockStopCommand.mockImplementation(async () => {
      await processManager.deletePidFile();
    });

    // 默认的 startCommand 行为：什么都不做
    mockStartCommand.mockImplementation(async () => {});
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

  describe('进程运行中的重启', () => {
    it('应该先停止后启动运行中的进程', async () => {
      // 创建运行中进程的 PID 文件
      await processManager.writePidFile({
        pid: process.pid, // 使用当前进程 PID（肯定存在）
        startTime: new Date().toISOString(),
        port: 10010,
        version: '0.1.0',
      });

      await restartCommand();

      // 验证先调用了 stop
      expect(mockStopCommand).toHaveBeenCalledTimes(1);
      expect(mockStopCommand).toHaveBeenCalledWith({ force: false });

      // 验证后调用了 start
      expect(mockStartCommand).toHaveBeenCalledTimes(1);
    });

    it('应该传递选项给 start 命令', async () => {
      // 创建运行中进程的 PID 文件
      await processManager.writePidFile({
        pid: process.pid,
        startTime: new Date().toISOString(),
        port: 10010,
        version: '0.1.0',
      });

      const options = {
        daemon: true,
        port: 3000,
        noScheduler: true,
      };

      await restartCommand(options);

      // 验证选项被传递给 start 命令
      expect(mockStartCommand).toHaveBeenCalledWith(options);
    });
  });

  describe('进程未运行时的重启', () => {
    it('应该直接启动未运行的进程', async () => {
      // 没有 PID 文件，进程未运行
      await restartCommand();

      // 验证没有调用 stop（因为没有在运行）
      expect(mockStopCommand).toHaveBeenCalledTimes(0);

      // 验证直接调用了 start
      expect(mockStartCommand).toHaveBeenCalledTimes(1);
    });

    it('应该显示警告信息', async () => {
      await restartCommand();

      // 验证显示了未运行的警告
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('守护进程未运行')
      );
    });
  });

  describe('等待进程退出', () => {
    it('应该在停止后等待进程退出', async () => {
      // 创建运行中进程的 PID 文件
      await processManager.writePidFile({
        pid: process.pid,
        startTime: new Date().toISOString(),
        port: 10010,
        version: '0.1.0',
      });

      const startTime = Date.now();

      await restartCommand();

      const elapsed = Date.now() - startTime;

      // 验证有等待时间（至少 1 秒）
      expect(elapsed).toBeGreaterThanOrEqual(900); // 允许一些误差
    });
  });

  describe('错误处理', () => {
    it('应该处理停止失败的情况', async () => {
      // 创建运行中进程的 PID 文件
      await processManager.writePidFile({
        pid: process.pid,
        startTime: new Date().toISOString(),
        port: 10010,
        version: '0.1.0',
      });

      // 模拟停止失败
      mockStopCommand.mockRejectedValue(new Error('Stop failed'));

      await expect(async () => {
        await restartCommand();
      }).rejects.toThrow('Stop failed');

      // 验证 start 没有被调用
      expect(mockStartCommand).toHaveBeenCalledTimes(0);
    });

    it('应该处理启动失败的情况', async () => {
      // 没有运行的进程

      // 模拟启动失败
      mockStartCommand.mockRejectedValue(new Error('Start failed'));

      await expect(async () => {
        await restartCommand();
      }).rejects.toThrow('Start failed');
    });

    it('应该处理进程未完全停止的情况', async () => {
      // 创建运行中进程的 PID 文件
      await processManager.writePidFile({
        pid: process.pid,
        startTime: new Date().toISOString(),
        port: 10010,
        version: '0.1.0',
      });

      // 模拟 stop 后进程仍在运行（PID 文件仍存在）
      mockStopCommand.mockImplementation(async () => {
        // 不删除 PID 文件，模拟进程未停止
      });

      await expect(async () => {
        await restartCommand();
      }).rejects.toThrow('process.exit called');

      // 验证错误消息
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('进程未能完全停止')
      );
    });
  });

  describe('命令选项', () => {
    it('应该支持 daemon 模式', async () => {
      await restartCommand({ daemon: true });

      expect(mockStartCommand).toHaveBeenCalledWith({ daemon: true });
    });

    it('应该支持自定义端口', async () => {
      await restartCommand({ port: 3000 });

      expect(mockStartCommand).toHaveBeenCalledWith({ port: 3000 });
    });

    it('应该支持禁用组件选项', async () => {
      const options = {
        noScheduler: true,
        noWeb: false,
      };

      await restartCommand(options);

      expect(mockStartCommand).toHaveBeenCalledWith(options);
    });

    it('应该支持组合选项', async () => {
      const options = {
        daemon: true,
        port: 5000,
        noScheduler: true,
      };

      await restartCommand(options);

      expect(mockStartCommand).toHaveBeenCalledWith(options);
    });
  });

  describe('PID 文件管理', () => {
    it('应该正确检测进程状态', async () => {
      // 使用当前进程 PID（肯定存在）
      await processManager.writePidFile({
        pid: process.pid,
        startTime: new Date().toISOString(),
        port: 10010,
        version: '0.1.0',
      });

      const isRunning = await processManager.isDaemonRunning();
      expect(isRunning).toBe(true);
    });

    it('应该清理过期的 PID 文件', async () => {
      // 使用不存在的 PID
      await processManager.writePidFile({
        pid: 999999,
        startTime: new Date().toISOString(),
        port: 10010,
        version: '0.1.0',
      });

      const isRunning = await processManager.isDaemonRunning();
      expect(isRunning).toBe(false);

      // PID 文件应该被清理
      const exists = await fs.pathExists(testPidFile);
      expect(exists).toBe(false);
    });
  });
});
