import cron from 'node-cron';
import { Config } from '../config/index.js';
import { logger } from '../utils/index.js';

/**
 * Cron 调度器
 * 负责定时触发分析任务
 */
export class CronScheduler {
  private task: cron.ScheduledTask | null = null;
  private isRunning = false;

  /**
   * 启动定时任务
   */
  start(config: Config, analysisCallback: () => Promise<void>): void {
    if (!config.scheduler.enabled) {
      logger.info('定时任务已禁用');
      return;
    }

    if (this.isRunning) {
      logger.warn('定时任务已在运行中');
      return;
    }

    const cronExpression = this.getCronExpression(config.scheduler);

    try {
      this.task = cron.schedule(cronExpression, async () => {
        logger.info(`定时分析任务开始 [${new Date().toISOString()}]`);
        try {
          await analysisCallback();
          logger.success('定时分析任务完成');
        } catch (error) {
          logger.error('定时分析任务失败:', error);
        }
      });

      this.isRunning = true;
      logger.success(`✓ 定时任务已启动: ${cronExpression}`);
      logger.info(`  下次执行: ${this.getNextExecutionTime(cronExpression)}`);
    } catch (error) {
      logger.error('启动定时任务失败:', error);
      throw error;
    }
  }

  /**
   * 停止定时任务
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.isRunning = false;
      logger.info('定时任务已停止');
    }
  }

  /**
   * 检查任务是否在运行
   */
  isTaskRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 将配置转换为 cron 表达式
   */
  private getCronExpression(scheduler: Config['scheduler']): string {
    switch (scheduler.interval) {
      case '6h':
        return '0 */6 * * *'; // 每6小时运行一次
      case '12h':
        return '0 */12 * * *'; // 每12小时运行一次
      case '24h':
        return '0 0 * * *'; // 每天凌晨运行
      case 'custom':
        if (!scheduler.customCron) {
          throw new Error('自定义调度需要提供 customCron 表达式');
        }
        return scheduler.customCron;
      default:
        return '0 0 * * *'; // 默认每天凌晨
    }
  }

  /**
   * 获取下次执行时间
   */
  private getNextExecutionTime(cronExpression: string): string {
    try {
      // 简单估算下次执行时间
      const now = new Date();
      const parts = cronExpression.split(' ');

      // 解析小时部分
      const hourPart = parts[1];
      if (hourPart.startsWith('*/')) {
        const interval = parseInt(hourPart.slice(2));
        const nextHour = Math.ceil(now.getHours() / interval) * interval;
        const next = new Date(now);
        next.setHours(nextHour, 0, 0, 0);
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        return next.toLocaleString('zh-CN');
      }

      // 固定时间
      if (hourPart === '0' && parts[0] === '0') {
        const next = new Date(now);
        next.setHours(0, 0, 0, 0);
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        return next.toLocaleString('zh-CN');
      }

      return '(待计算)';
    } catch {
      return '(无法计算)';
    }
  }

  /**
   * 验证 cron 表达式是否有效
   */
  static validateCronExpression(expression: string): boolean {
    return cron.validate(expression);
  }
}

/**
 * 创建并启动调度器
 */
export function createScheduler(
  config: Config,
  analysisCallback: () => Promise<void>
): CronScheduler {
  const scheduler = new CronScheduler();
  scheduler.start(config, analysisCallback);
  return scheduler;
}
