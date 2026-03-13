import fs from 'fs-extra';
import path from 'path';
import { homedir } from 'os';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LoggerOptions {
  logFile?: string;
  level?: LogLevel;
  maxSize?: number; // 最大文件大小（字节）
  maxFiles?: number; // 保留的文件数量
}

/**
 * 守护进程日志系统
 * 支持文件输出、日志轮转、级别过滤
 */
export class DaemonLogger {
  private logFile: string;
  private level: LogLevel;
  private maxSize: number;
  private maxFiles: number;
  private stream: fs.WriteStream | null = null;

  private static readonly LOG_LEVELS: Record<LogLevel, number> = {
    INFO: 0,
    WARN: 1,
    ERROR: 2,
  };

  constructor(options: LoggerOptions = {}) {
    this.logFile =
      options.logFile ||
      path.join(homedir(), '.claude-evolution', 'logs', 'daemon.log');
    this.level = options.level || 'INFO';
    this.maxSize = options.maxSize || 10 * 1024 * 1024; // 默认 10MB
    this.maxFiles = options.maxFiles || 7; // 默认保留 7 个文件
  }

  /**
   * 初始化日志系统
   */
  async init(): Promise<void> {
    const dir = path.dirname(this.logFile);
    await fs.ensureDir(dir);
    this.stream = fs.createWriteStream(this.logFile, { flags: 'a' });
  }

  /**
   * 记录 INFO 日志
   */
  info(message: string): void {
    this.log('INFO', message);
  }

  /**
   * 记录 WARN 日志
   */
  warn(message: string): void {
    this.log('WARN', message);
  }

  /**
   * 记录 ERROR 日志
   */
  error(message: string, error?: Error): void {
    let fullMessage = message;
    if (error) {
      fullMessage += `\n${error.stack || error.message}`;
    }
    this.log('ERROR', fullMessage);
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string): void {
    // 级别过滤
    if (DaemonLogger.LOG_LEVELS[level] < DaemonLogger.LOG_LEVELS[this.level]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level}] ${message}\n`;

    // 写入文件
    if (this.stream) {
      this.stream.write(line);
    }

    // 同时输出到控制台（如果是前台模式）
    if (level === 'ERROR') {
      console.error(line.trim());
    } else if (level === 'WARN') {
      console.warn(line.trim());
    } else {
      console.log(line.trim());
    }

    // 检查是否需要轮转（异步执行，不阻塞）
    this.checkRotationAsync();
  }

  /**
   * 异步检查并执行日志轮转
   */
  private checkRotationAsync(): void {
    // 使用 setImmediate 避免阻塞当前日志写入
    setImmediate(async () => {
      try {
        const stats = await fs.stat(this.logFile);
        if (stats.size >= this.maxSize) {
          await this.rotate();
        }
      } catch (error) {
        // 忽略错误
      }
    });
  }

  /**
   * 执行日志轮转
   */
  private async rotate(): Promise<void> {
    try {
      // 关闭当前流
      if (this.stream) {
        await new Promise<void>((resolve) => {
          this.stream!.end(() => resolve());
        });
      }

      // 轮转现有文件
      for (let i = this.maxFiles - 1; i >= 1; i--) {
        const oldFile = `${this.logFile}.${i}`;
        const newFile = `${this.logFile}.${i + 1}`;

        if (i === this.maxFiles - 1) {
          // 删除最旧的文件
          await fs.remove(newFile);
        }

        if (await fs.pathExists(oldFile)) {
          await fs.rename(oldFile, newFile);
        }
      }

      // 重命名当前日志文件
      if (await fs.pathExists(this.logFile)) {
        await fs.rename(this.logFile, `${this.logFile}.1`);
      }

      // 创建新的日志流
      this.stream = fs.createWriteStream(this.logFile, { flags: 'a' });

      this.info('日志文件已轮转');
    } catch (error) {
      console.error('日志轮转失败:', error);
    }
  }

  /**
   * 关闭日志系统
   */
  async close(): Promise<void> {
    if (this.stream) {
      return new Promise((resolve) => {
        this.stream!.end(() => {
          this.stream = null;
          resolve();
        });
      });
    }
  }

  /**
   * 获取日志文件路径
   */
  getLogFile(): string {
    return this.logFile;
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }
}
