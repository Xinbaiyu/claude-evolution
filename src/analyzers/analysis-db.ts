import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

export interface AnalysisRunRow {
  id: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  status: string;
  error_message: string | null;
  error_stack: string | null;
  stats_merged: number | null;
  stats_promoted: number | null;
  stats_archived: number | null;
}

export interface AnalysisStepRow {
  id: number;
  run_id: string;
  step: number;
  name: string;
  status: string;
  duration: number | null;
  output: string | null;
  error: string | null;
}

interface PaginationOptions {
  limit?: number;
  offset?: number;
}

const MAX_RETENTION = 500;

export class AnalysisDatabase {
  private db: Database.Database;
  private readonly dbPath: string;

  // Prepared statements
  private stmtInsertRun!: Database.Statement;
  private stmtUpdateRun!: Database.Statement;
  private stmtInsertStep!: Database.Statement;
  private stmtUpdateStep!: Database.Statement;
  private stmtGetRunById!: Database.Statement;
  private stmtGetStepsByRunId!: Database.Statement;
  private stmtCountRuns!: Database.Statement;
  private stmtDeleteOldRuns!: Database.Statement;

  constructor(dbPath?: string) {
    this.dbPath = dbPath ?? path.join(os.homedir(), '.claude-evolution', 'logs', 'analysis.db');

    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.initialize();
  }

  private initialize(): void {
    // Enable WAL mode for better concurrent read/write performance
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS analysis_runs (
        id TEXT PRIMARY KEY,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration INTEGER,
        status TEXT NOT NULL DEFAULT 'running',
        error_message TEXT,
        error_stack TEXT,
        stats_merged INTEGER,
        stats_promoted INTEGER,
        stats_archived INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS analysis_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT NOT NULL,
        step INTEGER NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        duration INTEGER,
        output TEXT,
        error TEXT,
        FOREIGN KEY (run_id) REFERENCES analysis_runs(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_runs_start_time ON analysis_runs(start_time DESC);
      CREATE INDEX IF NOT EXISTS idx_runs_status ON analysis_runs(status);
      CREATE INDEX IF NOT EXISTS idx_steps_run_id ON analysis_steps(run_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_steps_run_step ON analysis_steps(run_id, step);
    `);

    // Prepare statements
    this.stmtInsertRun = this.db.prepare(`
      INSERT INTO analysis_runs (id, start_time, status)
      VALUES (@id, @start_time, @status)
    `);

    this.stmtUpdateRun = this.db.prepare(`
      UPDATE analysis_runs
      SET end_time = @end_time,
          duration = @duration,
          status = @status,
          error_message = @error_message,
          error_stack = @error_stack,
          stats_merged = @stats_merged,
          stats_promoted = @stats_promoted,
          stats_archived = @stats_archived
      WHERE id = @id
    `);

    this.stmtInsertStep = this.db.prepare(`
      INSERT INTO analysis_steps (run_id, step, name, status, duration, output, error)
      VALUES (@run_id, @step, @name, @status, @duration, @output, @error)
    `);

    this.stmtUpdateStep = this.db.prepare(`
      UPDATE analysis_steps
      SET name = @name, status = @status, duration = @duration, output = @output, error = @error
      WHERE run_id = @run_id AND step = @step
    `);

    this.stmtGetRunById = this.db.prepare(`
      SELECT * FROM analysis_runs WHERE id = ?
    `);

    this.stmtGetStepsByRunId = this.db.prepare(`
      SELECT * FROM analysis_steps WHERE run_id = ? ORDER BY step ASC
    `);

    this.stmtCountRuns = this.db.prepare(`
      SELECT COUNT(*) as count FROM analysis_runs
    `);

    this.stmtDeleteOldRuns = this.db.prepare(`
      DELETE FROM analysis_runs
      WHERE id IN (
        SELECT id FROM analysis_runs
        ORDER BY start_time DESC
        LIMIT -1 OFFSET ?
      )
    `);
  }

  insertRun(id: string, startTime: string): void {
    this.stmtInsertRun.run({
      id,
      start_time: startTime,
      status: 'running',
    });
  }

  updateRun(
    id: string,
    data: {
      endTime?: string;
      duration?: number;
      status: string;
      errorMessage?: string | null;
      errorStack?: string | null;
      statsMerged?: number | null;
      statsPromoted?: number | null;
      statsArchived?: number | null;
    }
  ): void {
    this.stmtUpdateRun.run({
      id,
      end_time: data.endTime ?? null,
      duration: data.duration ?? null,
      status: data.status,
      error_message: data.errorMessage ?? null,
      error_stack: data.errorStack ?? null,
      stats_merged: data.statsMerged ?? null,
      stats_promoted: data.statsPromoted ?? null,
      stats_archived: data.statsArchived ?? null,
    });
  }

  insertStep(runId: string, stepData: {
    step: number;
    name: string;
    status: string;
    duration?: number;
    output?: string;
    error?: string;
  }): void {
    this.stmtInsertStep.run({
      run_id: runId,
      step: stepData.step,
      name: stepData.name,
      status: stepData.status,
      duration: stepData.duration ?? null,
      output: stepData.output ?? null,
      error: stepData.error ?? null,
    });
  }

  updateStep(runId: string, stepData: {
    step: number;
    name: string;
    status: string;
    duration?: number;
    output?: string;
    error?: string;
  }): void {
    this.stmtUpdateStep.run({
      run_id: runId,
      step: stepData.step,
      name: stepData.name,
      status: stepData.status,
      duration: stepData.duration ?? null,
      output: stepData.output ?? null,
      error: stepData.error ?? null,
    });
  }

  /**
   * Insert or update a step (upsert behavior)
   */
  upsertStep(runId: string, stepData: {
    step: number;
    name: string;
    status: string;
    duration?: number;
    output?: string;
    error?: string;
  }): void {
    const existing = this.db.prepare(
      'SELECT id FROM analysis_steps WHERE run_id = ? AND step = ?'
    ).get(runId, stepData.step);

    if (existing) {
      this.updateStep(runId, stepData);
    } else {
      this.insertStep(runId, stepData);
    }
  }

  getAllRuns(options?: PaginationOptions): AnalysisRunRow[] {
    const { limit = 50, offset = 0 } = options ?? {};
    const runs = this.db.prepare(`
      SELECT * FROM analysis_runs
      ORDER BY start_time DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as AnalysisRunRow[];

    return runs;
  }

  getStepsByRunId(runId: string): AnalysisStepRow[] {
    return this.stmtGetStepsByRunId.all(runId) as AnalysisStepRow[];
  }

  getRunById(runId: string): AnalysisRunRow | null {
    const run = this.stmtGetRunById.get(runId) as AnalysisRunRow | undefined;
    return run ?? null;
  }

  cleanup(): void {
    const { count } = this.stmtCountRuns.get() as { count: number };
    if (count > MAX_RETENTION) {
      this.stmtDeleteOldRuns.run(MAX_RETENTION);
    }
  }

  /**
   * Bulk import runs and steps within a transaction (for JSON migration)
   */
  bulkImport(runs: Array<{
    id: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    status: string;
    error?: { message: string; stack?: string };
    stats?: { merged: number; promoted: number; archived: number };
    steps: Array<{
      step: number;
      name: string;
      status: string;
      duration?: number;
      output?: string;
      error?: string;
    }>;
  }>): void {
    const importTransaction = this.db.transaction((runsToImport: typeof runs) => {
      for (const run of runsToImport) {
        // Check if run already exists (idempotent migration)
        const existing = this.stmtGetRunById.get(run.id);
        if (existing) {
          continue;
        }

        this.stmtInsertRun.run({
          id: run.id,
          start_time: run.startTime,
          status: run.status,
        });

        if (run.endTime || run.duration || run.error || run.stats) {
          this.stmtUpdateRun.run({
            id: run.id,
            end_time: run.endTime ?? null,
            duration: run.duration ?? null,
            status: run.status,
            error_message: run.error?.message ?? null,
            error_stack: run.error?.stack ?? null,
            stats_merged: run.stats?.merged ?? null,
            stats_promoted: run.stats?.promoted ?? null,
            stats_archived: run.stats?.archived ?? null,
          });
        }

        for (const step of run.steps) {
          this.stmtInsertStep.run({
            run_id: run.id,
            step: step.step,
            name: step.name,
            status: step.status,
            duration: step.duration ?? null,
            output: step.output ?? null,
            error: step.error ?? null,
          });
        }
      }
    });

    importTransaction(runs);
  }

  close(): void {
    this.db.close();
  }
}
