import cron from 'node-cron';
import { VersionChecker } from './version-checker.js';

export class VersionUpdateScheduler {
  private task: cron.ScheduledTask | null = null;
  private versionChecker: VersionChecker;
  private isRunning = false;

  constructor() {
    this.versionChecker = new VersionChecker();
  }

  /**
   * 启动版本检查定时任务（每天 11:00）
   */
  start(onUpdate?: (result: any) => void): void {
    if (this.isRunning) {
      console.log('[版本检查] 调度器已在运行中');
      return;
    }

    // 每天 11:00 执行
    const cronExpression = '0 11 * * *';

    this.task = cron.schedule(cronExpression, async () => {
      console.log('[版本检查] 开始检查版本更新...');
      await this.versionChecker.scheduleCheck(onUpdate);
    });

    this.isRunning = true;
    console.log('[版本检查] 调度器已启动，将在每天 11:00 执行');
  }

  /**
   * 停止定时任务
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      this.isRunning = false;
      console.log('[版本检查] 调度器已停止');
    }

    this.versionChecker.close();
  }

  /**
   * 检查任务是否在运行
   */
  isTaskRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 手动触发版本检查
   */
  async checkNow(): Promise<void> {
    console.log('[版本检查] 手动触发版本检查...');
    await this.versionChecker.checkForUpdates();
  }
}
