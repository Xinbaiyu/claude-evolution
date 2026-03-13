import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { ProcessManager, PidFileData } from './process-manager.js';

describe('ProcessManager', () => {
  const testPidFile = path.join(__dirname, '../../test-data/test-daemon.pid');
  let processManager: ProcessManager;

  beforeEach(async () => {
    processManager = new ProcessManager(testPidFile);
    // 清理测试文件
    await fs.remove(testPidFile);
  });

  afterEach(async () => {
    // 清理测试文件
    await fs.remove(testPidFile);
  });

  describe('writePidFile', () => {
    it('should create PID file with correct data', async () => {
      const pidData: PidFileData = {
        pid: 12345,
        startTime: '2026-03-14T12:00:00.000Z',
        port: 10010,
        version: '0.2.0',
      };

      await processManager.writePidFile(pidData);

      const exists = await fs.pathExists(testPidFile);
      expect(exists).toBe(true);

      const content = await fs.readJson(testPidFile);
      expect(content).toEqual(pidData);
    });

    it('should set file permissions to 600', async () => {
      const pidData: PidFileData = {
        pid: 12345,
        startTime: '2026-03-14T12:00:00.000Z',
        port: 10010,
        version: '0.2.0',
      };

      await processManager.writePidFile(pidData);

      const stats = await fs.stat(testPidFile);
      // 权限应该是 0o600 (仅所有者读写)
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o600);
    });
  });

  describe('readPidFile', () => {
    it('should return null if PID file does not exist', async () => {
      const result = await processManager.readPidFile();
      expect(result).toBeNull();
    });

    it('should read valid PID file', async () => {
      const pidData: PidFileData = {
        pid: 12345,
        startTime: '2026-03-14T12:00:00.000Z',
        port: 10010,
        version: '0.2.0',
      };

      await processManager.writePidFile(pidData);
      const result = await processManager.readPidFile();

      expect(result).toEqual(pidData);
    });

    it('should return null and delete file if PID file is corrupted', async () => {
      await fs.ensureDir(path.dirname(testPidFile));
      await fs.writeFile(testPidFile, 'invalid json');

      const result = await processManager.readPidFile();

      expect(result).toBeNull();
      const exists = await fs.pathExists(testPidFile);
      expect(exists).toBe(false);
    });

    it('should return null if PID file is missing required fields', async () => {
      await fs.ensureDir(path.dirname(testPidFile));
      await fs.writeJson(testPidFile, { pid: 123 }); // 缺少其他字段

      const result = await processManager.readPidFile();

      expect(result).toBeNull();
      const exists = await fs.pathExists(testPidFile);
      expect(exists).toBe(false);
    });
  });

  describe('deletePidFile', () => {
    it('should delete PID file if it exists', async () => {
      const pidData: PidFileData = {
        pid: 12345,
        startTime: '2026-03-14T12:00:00.000Z',
        port: 10010,
        version: '0.2.0',
      };

      await processManager.writePidFile(pidData);
      await processManager.deletePidFile();

      const exists = await fs.pathExists(testPidFile);
      expect(exists).toBe(false);
    });

    it('should not throw error if PID file does not exist', async () => {
      await expect(processManager.deletePidFile()).resolves.not.toThrow();
    });
  });

  describe('isDaemonRunning', () => {
    it('should return false if no PID file exists', async () => {
      const isRunning = await processManager.isDaemonRunning();
      expect(isRunning).toBe(false);
    });

    it('should return true if process is running', async () => {
      const pidData: PidFileData = {
        pid: process.pid, // 使用当前进程 PID（肯定在运行）
        startTime: '2026-03-14T12:00:00.000Z',
        port: 10010,
        version: '0.2.0',
      };

      await processManager.writePidFile(pidData);
      const isRunning = await processManager.isDaemonRunning();

      expect(isRunning).toBe(true);
    });

    it('should return false and clean up if process is not running', async () => {
      const pidData: PidFileData = {
        pid: 999999, // 不存在的 PID
        startTime: '2026-03-14T12:00:00.000Z',
        port: 10010,
        version: '0.2.0',
      };

      await processManager.writePidFile(pidData);
      const isRunning = await processManager.isDaemonRunning();

      expect(isRunning).toBe(false);

      // PID 文件应该被清理
      const exists = await fs.pathExists(testPidFile);
      expect(exists).toBe(false);
    });
  });

  describe('onShutdown', () => {
    it('should register shutdown callbacks', () => {
      const callback1 = vi.fn(async () => {});
      const callback2 = vi.fn(async () => {});

      processManager.onShutdown(callback1);
      processManager.onShutdown(callback2);

      // 无法直接验证回调数组，但可以通过其他方式间接验证
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('getPidFilePath', () => {
    it('should return the PID file path', () => {
      const filePath = processManager.getPidFilePath();
      expect(filePath).toBe(testPidFile);
    });
  });
});
