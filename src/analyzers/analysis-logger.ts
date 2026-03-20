import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface AnalysisStep {
  step: number;
  name: string;
  status: 'success' | 'failed' | 'skipped';
  duration?: number;
  output?: string;
  error?: string;
}

export interface AnalysisRun {
  id: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'running' | 'success' | 'failed';
  error?: {
    message: string;
    stack?: string;
  };
  steps: AnalysisStep[];
  stats?: {
    merged: number;
    promoted: number;
    archived: number;
  };
}

interface AnalysisLogFile {
  schema_version: string;
  runs: AnalysisRun[];
}

interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export class AnalysisLogger {
  private logFile: string;
  private lockFile: string;

  constructor() {
    const homeDir = os.homedir();
    const logsDir = path.join(homeDir, '.claude-evolution', 'logs');
    this.logFile = path.join(logsDir, 'analysis-runs.json');
    this.lockFile = path.join(logsDir, 'analysis-runs.lock');
  }

  /**
   * 记录分析任务开始
   */
  async logAnalysisStart(runId: string): Promise<void> {
    await this.withLock(async () => {
      const data = await this.readLogFile();

      const newRun: AnalysisRun = {
        id: runId,
        startTime: new Date().toISOString(),
        status: 'running',
        steps: [],
      };

      data.runs.unshift(newRun);
      await this.writeLogFile(data);
    });
  }

  /**
   * 记录分析任务结束
   */
  async logAnalysisEnd(
    runId: string,
    result: {
      status: 'success' | 'failed';
      error?: { message: string; stack?: string };
      stats?: { merged: number; promoted: number; archived: number };
    }
  ): Promise<void> {
    await this.withLock(async () => {
      const data = await this.readLogFile();
      const run = data.runs.find((r) => r.id === runId);

      if (!run) {
        throw new Error(`Run ${runId} not found`);
      }

      const endTime = new Date();
      const startTime = new Date(run.startTime);
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      run.endTime = endTime.toISOString();
      run.duration = duration;
      run.status = result.status;
      if (result.error) {
        run.error = result.error;
      }
      if (result.stats) {
        run.stats = result.stats;
      }

      await this.writeLogFile(data);
    });
  }

  /**
   * 记录单个步骤执行情况
   */
  async logStep(runId: string, stepInfo: AnalysisStep): Promise<void> {
    await this.withLock(async () => {
      const data = await this.readLogFile();
      const run = data.runs.find((r) => r.id === runId);

      if (!run) {
        throw new Error(`Run ${runId} not found`);
      }

      // 如果步骤已存在则更新，否则添加
      const existingIndex = run.steps.findIndex((s) => s.step === stepInfo.step);
      if (existingIndex >= 0) {
        run.steps[existingIndex] = stepInfo;
      } else {
        run.steps.push(stepInfo);
      }

      // 按步骤编号排序
      run.steps.sort((a, b) => a.step - b.step);

      await this.writeLogFile(data);
    });
  }

  /**
   * 获取所有分析记录
   */
  async getAllRuns(options?: PaginationOptions): Promise<AnalysisRun[]> {
    const data = await this.readLogFile();
    const { limit = 50, offset = 0 } = options || {};

    return data.runs.slice(offset, offset + limit);
  }

  /**
   * 根据 ID 获取单条记录
   */
  async getRunById(runId: string): Promise<AnalysisRun | null> {
    const data = await this.readLogFile();
    return data.runs.find((r) => r.id === runId) || null;
  }

  /**
   * 读取日志文件
   */
  private async readLogFile(): Promise<AnalysisLogFile> {
    try {
      const content = await fs.readFile(this.logFile, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // 文件不存在，返回空数据
        return {
          schema_version: '1.0',
          runs: [],
        };
      }
      throw error;
    }
  }

  /**
   * 写入日志文件
   */
  private async writeLogFile(data: AnalysisLogFile): Promise<void> {
    // 确保目录存在
    await fs.mkdir(path.dirname(this.logFile), { recursive: true });
    await fs.writeFile(this.logFile, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * 文件锁机制，防止并发写入冲突
   */
  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    let retries = 10;
    while (retries > 0) {
      try {
        // 尝试创建锁文件
        await fs.mkdir(path.dirname(this.lockFile), { recursive: true });
        await fs.writeFile(this.lockFile, process.pid.toString(), { flag: 'wx' });

        try {
          return await fn();
        } finally {
          // 释放锁
          await fs.unlink(this.lockFile).catch(() => {});
        }
      } catch (error: any) {
        if (error.code === 'EEXIST') {
          // 锁已存在，等待后重试
          await new Promise((resolve) => setTimeout(resolve, 100));
          retries--;
          continue;
        }
        throw error;
      }
    }
    throw new Error('Failed to acquire lock after multiple retries');
  }
}
