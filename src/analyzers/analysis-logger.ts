import fs from 'fs';
import path from 'path';
import os from 'os';
import { AnalysisDatabase } from './analysis-db.js';

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
  private db: AnalysisDatabase;
  private readonly logsDir: string;

  constructor() {
    this.logsDir = path.join(os.homedir(), '.claude-evolution', 'logs');
    this.db = new AnalysisDatabase();
    this.migrateFromJson();
  }

  /**
   * 记录分析任务开始
   */
  async logAnalysisStart(runId: string): Promise<void> {
    this.db.insertRun(runId, new Date().toISOString());
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
    const run = this.db.getRunById(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    const endTime = new Date();
    const startTime = new Date(run.start_time);
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    this.db.updateRun(runId, {
      endTime: endTime.toISOString(),
      duration,
      status: result.status,
      errorMessage: result.error?.message,
      errorStack: result.error?.stack,
      statsMerged: result.stats?.merged,
      statsPromoted: result.stats?.promoted,
      statsArchived: result.stats?.archived,
    });

    // Automatic cleanup after each analysis ends
    this.db.cleanup();
  }

  /**
   * 记录单个步骤执行情况
   */
  async logStep(runId: string, stepInfo: AnalysisStep): Promise<void> {
    const run = this.db.getRunById(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    this.db.upsertStep(runId, {
      step: stepInfo.step,
      name: stepInfo.name,
      status: stepInfo.status,
      duration: stepInfo.duration,
      output: stepInfo.output,
      error: stepInfo.error,
    });
  }

  /**
   * 获取所有分析记录
   */
  async getAllRuns(options?: PaginationOptions): Promise<AnalysisRun[]> {
    const rows = this.db.getAllRuns(options);

    return rows.map((row) => {
      const steps = this.db.getStepsByRunId(row.id);

      const run: AnalysisRun = {
        id: row.id,
        startTime: row.start_time,
        status: row.status as AnalysisRun['status'],
        steps: steps.map((s) => ({
          step: s.step,
          name: s.name,
          status: s.status as AnalysisStep['status'],
          duration: s.duration ?? undefined,
          output: s.output ?? undefined,
          error: s.error ?? undefined,
        })),
      };

      if (row.end_time) {
        run.endTime = row.end_time;
      }
      if (row.duration !== null) {
        run.duration = row.duration;
      }
      if (row.error_message) {
        run.error = {
          message: row.error_message,
          stack: row.error_stack ?? undefined,
        };
      }
      if (row.stats_merged !== null) {
        run.stats = {
          merged: row.stats_merged,
          promoted: row.stats_promoted ?? 0,
          archived: row.stats_archived ?? 0,
        };
      }

      return run;
    });
  }

  /**
   * 根据 ID 获取单条记录
   */
  async getRunById(runId: string): Promise<AnalysisRun | null> {
    const row = this.db.getRunById(runId);
    if (!row) {
      return null;
    }

    const steps = this.db.getStepsByRunId(runId);

    const run: AnalysisRun = {
      id: row.id,
      startTime: row.start_time,
      status: row.status as AnalysisRun['status'],
      steps: steps.map((s) => ({
        step: s.step,
        name: s.name,
        status: s.status as AnalysisStep['status'],
        duration: s.duration ?? undefined,
        output: s.output ?? undefined,
        error: s.error ?? undefined,
      })),
    };

    if (row.end_time) {
      run.endTime = row.end_time;
    }
    if (row.duration !== null) {
      run.duration = row.duration;
    }
    if (row.error_message) {
      run.error = {
        message: row.error_message,
        stack: row.error_stack ?? undefined,
      };
    }
    if (row.stats_merged !== null) {
      run.stats = {
        merged: row.stats_merged,
        promoted: row.stats_promoted ?? 0,
        archived: row.stats_archived ?? 0,
      };
    }

    return run;
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.db.close();
  }

  /**
   * 从旧 JSON 文件迁移数据到 SQLite
   */
  private migrateFromJson(): void {
    const jsonFile = path.join(this.logsDir, 'analysis-runs.json');
    const bakFile = path.join(this.logsDir, 'analysis-runs.json.bak');

    if (!fs.existsSync(jsonFile)) {
      return;
    }

    try {
      const content = fs.readFileSync(jsonFile, 'utf-8');
      const data: AnalysisLogFile = JSON.parse(content);

      if (!data.runs || !Array.isArray(data.runs) || data.runs.length === 0) {
        // Empty or invalid data, just rename
        fs.renameSync(jsonFile, bakFile);
        return;
      }

      this.db.bulkImport(data.runs);

      // Rename JSON file to .bak after successful migration
      fs.renameSync(jsonFile, bakFile);
    } catch (error) {
      console.error('[AnalysisLogger] JSON migration failed, skipping:', error instanceof Error ? error.message : error);
      // Don't block startup — just leave the JSON file as-is
    }
  }
}
