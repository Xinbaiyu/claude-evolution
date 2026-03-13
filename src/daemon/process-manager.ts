import fs from 'fs-extra';
import path from 'path';
import { homedir } from 'os';

/**
 * PID 文件数据结构
 */
export interface PidFileData {
  pid: number;
  startTime: string;
  port: number;
  version: string;
}

/**
 * 进程管理器
 * 负责 PID 文件管理、进程检测、信号处理
 */
export class ProcessManager {
  private pidFilePath: string;
  private shutdownCallbacks: Array<() => Promise<void>> = [];
  private isShuttingDown = false;

  constructor(pidFilePath?: string) {
    this.pidFilePath = pidFilePath || path.join(homedir(), '.claude-evolution', 'daemon.pid');
  }

  /**
   * 写入 PID 文件
   */
  async writePidFile(data: PidFileData): Promise<void> {
    const dir = path.dirname(this.pidFilePath);
    await fs.ensureDir(dir);
    await fs.writeJson(this.pidFilePath, data, { spaces: 2 });

    // 设置权限为 600（仅所有者可读写）
    await fs.chmod(this.pidFilePath, 0o600);
  }

  /**
   * 读取 PID 文件
   */
  async readPidFile(): Promise<PidFileData | null> {
    try {
      if (!(await fs.pathExists(this.pidFilePath))) {
        return null;
      }
      const data = await fs.readJson(this.pidFilePath);

      // 验证必需字段
      if (!data.pid || !data.startTime || !data.port || !data.version) {
        throw new Error('Invalid PID file format');
      }

      return data;
    } catch (error) {
      // PID 文件损坏，删除它
      await this.deletePidFile();
      return null;
    }
  }

  /**
   * 删除 PID 文件
   */
  async deletePidFile(): Promise<void> {
    try {
      await fs.remove(this.pidFilePath);
    } catch (error) {
      // 忽略删除错误
    }
  }

  /**
   * 检查守护进程是否正在运行
   */
  async isDaemonRunning(): Promise<boolean> {
    const pidData = await this.readPidFile();
    if (!pidData) {
      return false;
    }

    try {
      // 使用 kill(pid, 0) 检查进程是否存在
      // 不会真正发送信号，只检查权限
      process.kill(pidData.pid, 0);
      return true;
    } catch (error) {
      // 进程不存在，清理过期的 PID 文件
      await this.deletePidFile();
      return false;
    }
  }

  /**
   * 注册关闭回调
   */
  onShutdown(callback: () => Promise<void>): void {
    this.shutdownCallbacks.push(callback);
  }

  /**
   * 设置信号处理器
   */
  setupSignalHandlers(): void {
    const handleShutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        return;
      }
      this.isShuttingDown = true;

      console.log(`\n收到 ${signal} 信号，开始优雅关闭...`);

      try {
        // 执行所有关闭回调（最多 30 秒）
        await this.executeShutdownCallbacks();

        // 删除 PID 文件
        await this.deletePidFile();

        console.log('✅ 优雅关闭完成');
        process.exit(0);
      } catch (error) {
        console.error('❌ 关闭时发生错误:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  }

  /**
   * 执行关闭回调（带超时）
   */
  private async executeShutdownCallbacks(): Promise<void> {
    const timeout = 30000; // 30 秒超时

    const shutdownPromise = (async () => {
      for (const callback of this.shutdownCallbacks) {
        try {
          await callback();
        } catch (error) {
          console.error('关闭回调执行失败:', error);
        }
      }
    })();

    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Shutdown timeout')), timeout);
    });

    try {
      await Promise.race([shutdownPromise, timeoutPromise]);
    } catch (error) {
      console.warn('⚠️  关闭超时，强制退出');
    }
  }

  /**
   * 获取 PID 文件路径
   */
  getPidFilePath(): string {
    return this.pidFilePath;
  }
}
