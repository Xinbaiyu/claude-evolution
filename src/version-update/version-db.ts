import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

export interface VersionUpdateRow {
  id: number;
  current_version: string;
  latest_version: string;
  check_time: string;
  notified_version: string | null;
  created_at: string;
  updated_at: string;
}

export class VersionUpdateDatabase {
  private db: Database.Database;
  private readonly dbPath: string;

  // Prepared statements
  private stmtGetLatest!: Database.Statement;
  private stmtUpsert!: Database.Statement;
  private stmtMarkNotified!: Database.Statement;

  constructor(dbPath?: string) {
    this.dbPath =
      dbPath ?? path.join(os.homedir(), '.claude-evolution', 'logs', 'version-update.db');

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

    // Create table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS version_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        current_version TEXT NOT NULL,
        latest_version TEXT NOT NULL,
        check_time TEXT NOT NULL,
        notified_version TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_version_updates_check_time
        ON version_updates(check_time DESC);
    `);

    // Prepare statements
    this.stmtGetLatest = this.db.prepare(`
      SELECT * FROM version_updates
      ORDER BY check_time DESC
      LIMIT 1
    `);

    this.stmtUpsert = this.db.prepare(`
      INSERT INTO version_updates (current_version, latest_version, check_time)
      VALUES (@current_version, @latest_version, @check_time)
    `);

    this.stmtMarkNotified = this.db.prepare(`
      UPDATE version_updates
      SET notified_version = @notified_version,
          updated_at = datetime('now')
      WHERE id = @id
    `);
  }

  /**
   * 获取最新的版本检查记录
   */
  getLatest(): VersionUpdateRow | null {
    const row = this.stmtGetLatest.get() as VersionUpdateRow | undefined;
    return row ?? null;
  }

  /**
   * 保存版本检查结果
   */
  saveVersionCheck(currentVersion: string, latestVersion: string): void {
    this.stmtUpsert.run({
      current_version: currentVersion,
      latest_version: latestVersion,
      check_time: new Date().toISOString(),
    });
  }

  /**
   * 标记版本已通知
   */
  markNotified(id: number, notifiedVersion: string): void {
    this.stmtMarkNotified.run({
      id,
      notified_version: notifiedVersion,
    });
  }

  /**
   * 清理旧记录（保留最近 10 条）
   */
  cleanup(): void {
    this.db.prepare(`
      DELETE FROM version_updates
      WHERE id NOT IN (
        SELECT id FROM version_updates
        ORDER BY check_time DESC
        LIMIT 10
      )
    `).run();
  }

  close(): void {
    this.db.close();
  }
}
