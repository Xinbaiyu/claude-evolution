import cron from 'node-cron';
import { Config } from '../config/index.js';
import { logger } from '../utils/index.js';

/**
 * Cron 调度器
 * 负责定时触发分析任务
 * 支持间隔模式 (6h/12h/24h) 和定时模式 (指定每天的具体时间点)
 */
export class CronScheduler {
  private tasks: cron.ScheduledTask[] = [];
  private isRunning = false;
  private isAnalysisRunning = false;

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

    const wrappedCallback = async () => {
      if (this.isAnalysisRunning) {
        logger.warn('分析任务正在运行中，跳过本次触发');
        return;
      }
      this.isAnalysisRunning = true;
      logger.info(`定时分析任务开始 [${new Date().toISOString()}]`);
      try {
        await analysisCallback();
        logger.success('定时分析任务完成');
      } catch (error) {
        logger.error('定时分析任务失败:', error);
      } finally {
        this.isAnalysisRunning = false;
      }
    };

    try {
      if (config.scheduler.interval === 'timepoints') {
        this.startTimepointsMode(config, wrappedCallback);
      } else {
        this.startIntervalMode(config, wrappedCallback);
      }

      this.isRunning = true;
    } catch (error) {
      logger.error('启动定时任务失败:', error);
      throw error;
    }
  }

  /**
   * 间隔模式：使用单个 cron 表达式
   */
  private startIntervalMode(config: Config, callback: () => Promise<void>): void {
    const cronExpression = this.getCronExpression(config.scheduler);
    const task = cron.schedule(cronExpression, callback);
    this.tasks.push(task);
    logger.success(`✓ 定时任务已启动 (间隔模式): ${cronExpression}`);
    logger.info(`  下次执行: ${this.getNextExecutionTime(cronExpression)}`);
  }

  /**
   * 定时模式：为每个时间点创建独立的 cron 任务
   */
  private startTimepointsMode(config: Config, callback: () => Promise<void>): void {
    const scheduleTimes = config.scheduler.scheduleTimes;

    if (!scheduleTimes || scheduleTimes.length === 0) {
      logger.warn('定时模式已配置但未设置时间点，调度器不会启动');
      return;
    }

    const sortedTimes = [...scheduleTimes].sort();

    for (const time of sortedTimes) {
      const cronExpr = CronScheduler.timeToCronExpression(time);
      const task = cron.schedule(cronExpr, callback);
      this.tasks.push(task);
      logger.info(`  ✓ 已注册时间点: ${time} (${cronExpr})`);
    }

    const nextTime = CronScheduler.getNextTimepointExecution(sortedTimes);
    logger.success(`✓ 定时任务已启动 (定时模式): ${sortedTimes.length} 个时间点`);
    logger.info(`  时间点: ${sortedTimes.join(', ')}`);
    logger.info(`  下次执行: ${nextTime}`);
  }

  /**
   * 停止定时任务
   */
  stop(): void {
    if (this.tasks.length > 0) {
      for (const task of this.tasks) {
        task.stop();
      }
      this.tasks = [];
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
   * 将 HH:MM 时间转换为 cron 表达式
   */
  static timeToCronExpression(time: string): string {
    const [hour, minute] = time.split(':');
    return `${parseInt(minute)} ${parseInt(hour)} * * *`;
  }

  /**
   * 计算下一个最近的时间点执行时间
   */
  static getNextTimepointExecution(scheduleTimes: string[]): string {
    try {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // 找今天还没到的最近时间点
      for (const time of [...scheduleTimes].sort()) {
        const [h, m] = time.split(':').map(Number);
        const timeMinutes = h * 60 + m;
        if (timeMinutes > currentMinutes) {
          const next = new Date(now);
          next.setHours(h, m, 0, 0);
          return next.toLocaleString('zh-CN');
        }
      }

      // 今天所有时间点都过了，返回明天第一个
      const firstTime = [...scheduleTimes].sort()[0];
      const [h, m] = firstTime.split(':').map(Number);
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(h, m, 0, 0);
      return next.toLocaleString('zh-CN');
    } catch {
      return '(无法计算)';
    }
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
