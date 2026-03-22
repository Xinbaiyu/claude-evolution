/**
 * AnalysisExecutor - 统一的分析执行器
 *
 * 所有分析路径（API 手动触发、调度器定时触发、CLI 命令）共享此类。
 * 职责：并发控制、runId 生成、AnalysisLogger 管理、钩子通知。
 */

import path from 'path';
import fs from 'fs-extra';
import { getEvolutionDir } from '../config/loader.js';
import { runAnalysisPipeline } from './pipeline.js';
import { AnalysisLogger } from './analysis-logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalysisHooks {
  /** 分析开始时调用（WS 广播、状态同步） */
  onStart?: (ctx: { runId: string; startTime: string }) => void;
  /** 分析成功时调用 */
  onComplete?: (result: AnalysisResult) => void;
  /** 分析失败时调用 */
  onFailed?: (ctx: { runId: string; error: string; timestamp: string }) => void;
}

export interface AnalysisResult {
  runId: string;
  duration: number;
  observationsCount: number;
  timestamp: string;
}

export interface AnalysisExecutorOptions {
  hooks?: AnalysisHooks;
  /** 外部传入的共享 logger（executor 不会关闭它） */
  analysisLogger?: AnalysisLogger;
}

// ---------------------------------------------------------------------------
// AnalysisExecutor
// ---------------------------------------------------------------------------

export class AnalysisExecutor {
  private isRunning = false;
  private currentRunId: string | null = null;
  private currentStartTime: string | null = null;
  private hooks: AnalysisHooks;
  private readonly sharedLogger: AnalysisLogger | null;

  constructor(options?: AnalysisExecutorOptions) {
    this.hooks = options?.hooks ?? {};
    this.sharedLogger = options?.analysisLogger ?? null;
  }

  /** 查询当前分析状态（供 API 端点使用） */
  getState(): { isRunning: boolean; runId: string | null; startTime: string | null } {
    return {
      isRunning: this.isRunning,
      runId: this.currentRunId,
      startTime: this.currentStartTime,
    };
  }

  /** 延迟注入 hooks（daemon 模式：executor 先创建，web server 后启动） */
  setHooks(hooks: AnalysisHooks): void {
    this.hooks = { ...this.hooks, ...hooks };
  }

  /** 执行一次完整的分析流程 */
  async execute(): Promise<AnalysisResult> {
    if (this.isRunning) {
      throw new AnalysisAlreadyRunningError('分析正在进行中，请稍候');
    }

    const startTime = Date.now();
    const runId = `run_${startTime}`;
    const startTimeISO = new Date(startTime).toISOString();

    // 设置运行状态
    this.isRunning = true;
    this.currentRunId = runId;
    this.currentStartTime = startTimeISO;

    // 决定 logger 生命周期
    const logger = this.sharedLogger ?? new AnalysisLogger();
    const ownsLogger = this.sharedLogger === null;

    // 通知开始
    this.hooks.onStart?.({ runId, startTime: startTimeISO });

    try {
      await logger.logAnalysisStart(runId);
      await runAnalysisPipeline({ runId, analysisLogger: logger });

      const duration = Math.round((Date.now() - startTime) / 1000);
      const observationsCount = await this.readObservationsCount();
      const timestamp = new Date().toISOString();

      const result: AnalysisResult = {
        runId,
        duration,
        observationsCount,
        timestamp,
      };

      this.hooks.onComplete?.(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '分析失败';
      const timestamp = new Date().toISOString();

      // 记录失败日志
      try {
        await logger.logAnalysisEnd(runId, {
          status: 'failed',
          error: {
            message: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
          },
        });
      } catch {
        // 日志记录失败不应阻断主流程
      }

      this.hooks.onFailed?.({ runId, error: errorMessage, timestamp });
      throw error;
    } finally {
      this.isRunning = false;
      this.currentRunId = null;
      this.currentStartTime = null;
      if (ownsLogger) {
        logger.close();
      }
    }
  }

  private async readObservationsCount(): Promise<number> {
    try {
      const activePath = path.join(
        getEvolutionDir(), 'memory', 'observations', 'active.json'
      );
      const active = await fs.pathExists(activePath)
        ? await fs.readJson(activePath)
        : [];
      return active.length;
    } catch {
      return 0;
    }
  }
}

// ---------------------------------------------------------------------------
// Error Types
// ---------------------------------------------------------------------------

export class AnalysisAlreadyRunningError extends Error {
  readonly statusCode = 409;

  constructor(message: string) {
    super(message);
    this.name = 'AnalysisAlreadyRunningError';
  }
}
