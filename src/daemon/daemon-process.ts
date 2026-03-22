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
import { AnalysisLogger } from '../analyzers/analysis-logger.js';
import { AnalysisExecutor } from '../analyzers/analysis-executor.js';
import {
  startComponents,
  stopComponents,
  type DaemonComponents,
} from './lifecycle.js';

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

  // 统一的分析执行器（共享 analysisLogger，daemon 生命周期管理其关闭）
  const executor = new AnalysisExecutor({ analysisLogger });

  // 适配 DaemonLogger → lifecycle DaemonLogger 接口
  const lifecycleLogger = {
    info: (msg: string) => logger.info(msg),
    error: (msg: string, error?: Error | unknown) =>
      logger.error(msg, error as Error),
  };

  let components: DaemonComponents | null = null;

  try {
    components = await startComponents({
      config,
      port,
      enableScheduler: !noScheduler && (config.scheduler?.enabled ?? true),
      enableWeb: !noWeb,
      logger: lifecycleLogger,
      executor,
    });

    logger.info('守护进程已完全启动');

    // 设置优雅关闭
    processManager.onShutdown(async () => {
      logger.info('收到关闭信号，开始优雅关闭...');

      if (components) {
        await stopComponents(components, lifecycleLogger);
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

    // 清理已启动的组件
    if (components) {
      await stopComponents(components, lifecycleLogger);
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
