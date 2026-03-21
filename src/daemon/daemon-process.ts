#!/usr/bin/env node

/**
 * Daemon Process
 *
 * 这个脚本作为独立进程运行，不依赖父进程
 * 由 start.ts 通过 fork() 启动
 */

import path from 'path';
import { homedir } from 'os';
import { loadConfig } from '../config/index.js';
import { ProcessManager, PidFileData } from './process-manager.js';
import { DaemonLogger } from './logger.js';
import { CronScheduler } from '../scheduler/cron-scheduler.js';
import { analyzeCommand } from '../cli/commands/analyze.js';
import { notifySuccess, notifyError } from '../utils/notifier.js';
import { AnalysisLogger } from '../analyzers/analysis-logger.js';
import { watchSourceFiles, stopWatching } from '../generators/file-watcher.js';
import { regenerateClaudeMdFromDisk } from '../memory/claudemd-generator.js';
import type { FSWatcher } from 'chokidar';

async function main() {
  const config = await loadConfig();
  const processManager = new ProcessManager();

  // 初始化日志
  const logFile = path.join(homedir(), '.claude-evolution/logs/daemon.log');

  const logger = new DaemonLogger({
    logFile,
    level: 'INFO',
  });

  await logger.init();
  logger.info('守护进程启动中...');

  // 初始化分析日志记录器
  const analysisLogger = new AnalysisLogger();

  // 读取环境变量
  const port = parseInt(process.env.DAEMON_PORT || '10010', 10);
  const noScheduler = process.env.DAEMON_NO_SCHEDULER === '1';
  const noWeb = process.env.DAEMON_NO_WEB === '1';

  // 写入 PID 文件
  try {
    const pidData: PidFileData = {
      pid: process.pid,
      startTime: new Date().toISOString(),
      port,
      version: '0.1.0',
    };
    await processManager.writePidFile(pidData);
    logger.info(`PID 文件已创建: ${processManager.getPidFilePath()}`);
  } catch (error) {
    logger.error('写入 PID 文件失败', error as Error);
    process.exit(1);
  }

  let scheduler: CronScheduler | null = null;
  let webServer: any = null;
  let fileWatcher: FSWatcher | null = null;

  // 提取分析回调为命名函数，供初始启动和热重载复用
  const createAnalysisCallback = () => async () => {
    const startTime = new Date();
    const runId = `run_${Date.now()}`;
    logger.info('定时分析任务开始');

    await analysisLogger.logAnalysisStart(runId);

    try {
      const { runAnalysisPipeline } = await import('../analyzers/pipeline.js');
      await runAnalysisPipeline({ runId, analysisLogger });

      const duration = Math.round((Date.now() - startTime.getTime()) / 1000);
      logger.info('定时分析任务完成');

      const currentConfig = await loadConfig();
      if (currentConfig.scheduler?.notifications?.enabled && currentConfig.scheduler?.notifications?.onSuccess) {
        await notifySuccess(
          '定时分析完成',
          `分析任务已成功完成\n耗时: ${duration}秒\n时间: ${startTime.toLocaleTimeString('zh-CN')}`
        );
      }
    } catch (error) {
      logger.error('定时分析任务失败', error as Error);

      const currentConfig = await loadConfig();
      if (currentConfig.scheduler?.notifications?.enabled && currentConfig.scheduler?.notifications?.onFailure) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await notifyError(
          '定时分析失败',
          `任务执行失败\n错误: ${errorMessage.slice(0, 100)}\n时间: ${startTime.toLocaleTimeString('zh-CN')}`
        );
      }
    }
  };

  // 调度器热重载函数
  const reloadScheduler = async () => {
    logger.info('[热重载] 检测到调度器配置变更，开始重载...');

    // 停止现有调度器
    if (scheduler) {
      scheduler.stop();
      logger.info('[热重载] 调度器已停止');
    }

    // 从磁盘重新加载配置
    const newConfig = await loadConfig();
    logger.info('[热重载] 配置已重新加载');

    // 根据新配置决定是否启动调度器
    if (newConfig.scheduler?.enabled) {
      scheduler = new CronScheduler();
      scheduler.start(newConfig, createAnalysisCallback());
      logger.info('[热重载] 调度器已使用新配置重新启动');
    } else {
      scheduler = null;
      logger.info('[热重载] 调度器已禁用，不再启动');
    }
  };

  try {
    // 启动调度器
    if (!noScheduler && config.scheduler?.enabled) {
      logger.info('启动调度器...');
      scheduler = new CronScheduler();
      scheduler.start(config, createAnalysisCallback());
      logger.info('调度器已启动');
    }

    // 启动文件监听器 (CLAUDE.md 自动更新)
    logger.info('启动文件监听器...');
    fileWatcher = watchSourceFiles();

    // 启动时立即同步一次 CLAUDE.md
    try {
      await regenerateClaudeMdFromDisk();
      logger.info('CLAUDE.md 已同步');
    } catch (error) {
      logger.error('CLAUDE.md 初始同步失败:', error as Error);
    }

    // 启动 Web 服务器
    if (!noWeb) {
      logger.info(`启动 Web 服务器 (端口 ${port})...`);

      // 动态导入 web server
      const webModule = await import('../../web/server/index.js');
      webServer = webModule.server;

      // 注册调度器配置变更回调（热重载）
      if (!noScheduler) {
        webModule.onSchedulerConfigChanged(reloadScheduler);
        logger.info('调度器热重载回调已注册');
      }

      await new Promise<void>((resolve, reject) => {
        webServer.listen(port, () => {
          logger.info(`Web 服务器已启动: http://localhost:${port}`);
          resolve();
        });

        webServer.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            logger.error(`端口 ${port} 已被占用`);
            reject(error);
          } else {
            logger.error('Web 服务器启动失败', error);
            reject(error);
          }
        });
      });
    }

    logger.info('守护进程已完全启动');

    // 设置优雅关闭
    processManager.onShutdown(async () => {
      logger.info('收到关闭信号，开始优雅关闭...');

      if (fileWatcher) {
        await stopWatching(fileWatcher);
        logger.info('文件监听器已停止');
      }

      if (scheduler) {
        scheduler.stop();
        logger.info('调度器已停止');
      }

      if (webServer) {
        await new Promise<void>((resolve) => {
          webServer.close(() => {
            logger.info('Web 服务器已关闭');
            resolve();
          });
        });
      }

      // 关闭分析日志数据库连接
      analysisLogger.close();
      logger.info('分析日志数据库已关闭');

      logger.info('PID 文件将被删除');
      await logger.close();
      console.log('守护进程已完全关闭');
    });

    processManager.setupSignalHandlers();

    // 保持进程运行
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未处理的 Promise 拒绝', reason as Error);
    });

  } catch (error) {
    logger.error('守护进程启动失败', error as Error);

    // 清理
    if (fileWatcher) {
      await stopWatching(fileWatcher);
    }

    if (scheduler) {
      scheduler.stop();
    }

    await processManager.deletePidFile();
    await logger.close();

    process.exit(1);
  }
}

// 启动守护进程
main().catch((error) => {
  console.error('守护进程启动失败:', error);
  process.exit(1);
});
