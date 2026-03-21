/**
 * Daemon Lifecycle
 *
 * Shared startup/shutdown logic for both foreground (start.ts) and
 * background (daemon-process.ts) modes.
 *
 * Each mode injects its own logger, analysis runner, and notification
 * config via DaemonStartOptions, avoiding any conditional branches.
 */

import { loadConfig, Config } from '../config/index.js';
import { CronScheduler } from '../scheduler/cron-scheduler.js';
import { watchSourceFiles, stopWatching } from '../generators/file-watcher.js';
import { regenerateClaudeMdFromDisk } from '../memory/claudemd-generator.js';
import { migratePreferenceWorkflowType } from '../memory/observation-manager.js';
import { notifySuccess, notifyError } from '../utils/notifier.js';
import type { FSWatcher } from 'chokidar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal logger interface accepted by lifecycle functions */
export interface LifecycleLogger {
  info(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
}

/** Running daemon components returned by startComponents */
export interface DaemonComponents {
  scheduler: CronScheduler | null;
  fileWatcher: FSWatcher | null;
  webServer: any | null;
}

/** Options for startComponents — each mode fills in its own values */
export interface DaemonStartOptions {
  config: Config;
  port: number;
  enableScheduler: boolean;
  enableWeb: boolean;
  /** The function that actually runs analysis (different per mode) */
  analysisRunner: () => Promise<void>;
  logger: LifecycleLogger;
}

// ---------------------------------------------------------------------------
// Analysis Callback Factory
// ---------------------------------------------------------------------------

/**
 * Wrap an analysisRunner with notification logic.
 * Returns an async function suitable for CronScheduler.start().
 */
export function createAnalysisCallback(
  runner: () => Promise<void>,
  log: LifecycleLogger
): () => Promise<void> {
  return async () => {
    const startTime = new Date();
    log.info('定时分析任务开始');

    try {
      await runner();

      const duration = Math.round((Date.now() - startTime.getTime()) / 1000);
      log.info('定时分析任务完成');

      const currentConfig = await loadConfig();
      if (
        currentConfig.scheduler?.notifications?.enabled &&
        currentConfig.scheduler?.notifications?.onSuccess
      ) {
        await notifySuccess(
          '定时分析完成',
          `分析任务已成功完成\n耗时: ${duration}秒\n时间: ${startTime.toLocaleTimeString('zh-CN')}`
        );
      }
    } catch (error) {
      log.error('定时分析任务失败', error as Error);

      const currentConfig = await loadConfig();
      if (
        currentConfig.scheduler?.notifications?.enabled &&
        currentConfig.scheduler?.notifications?.onFailure
      ) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await notifyError(
          '定时分析失败',
          `任务执行失败\n错误: ${errorMessage.slice(0, 100)}\n时间: ${startTime.toLocaleTimeString('zh-CN')}`
        );
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Scheduler Hot-Reload
// ---------------------------------------------------------------------------

/**
 * Create a reload function that stops the current scheduler, reloads config,
 * and starts a new scheduler with the updated config.
 *
 * The returned function is registered as the web-server callback for
 * "scheduler config changed" events.
 */
export function createReloadScheduler(
  components: DaemonComponents,
  makeCallback: () => () => Promise<void>,
  log: LifecycleLogger
): () => Promise<void> {
  return async () => {
    log.info('[热重载] 检测到调度器配置变更，开始重载...');

    if (components.scheduler) {
      components.scheduler.stop();
      log.info('[热重载] 调度器已停止');
    }

    const newConfig = await loadConfig();
    log.info('[热重载] 配置已重新加载');

    if (newConfig.scheduler?.enabled) {
      components.scheduler = new CronScheduler();
      components.scheduler.start(newConfig, makeCallback());
      log.info('[热重载] 调度器已使用新配置重新启动');
    } else {
      components.scheduler = null;
      log.info('[热重载] 调度器已禁用，不再启动');
    }
  };
}

// ---------------------------------------------------------------------------
// Start Components
// ---------------------------------------------------------------------------

/**
 * Start all daemon components (scheduler, file watcher, web server).
 *
 * On failure the caller is responsible for error handling / process exit;
 * this function only propagates the error after cleaning up partially
 * started components.
 */
export async function startComponents(
  opts: DaemonStartOptions
): Promise<DaemonComponents> {
  const { config, port, enableScheduler, enableWeb, logger: log } = opts;

  const components: DaemonComponents = {
    scheduler: null,
    fileWatcher: null,
    webServer: null,
  };

  const analysisCallback = createAnalysisCallback(opts.analysisRunner, log);

  try {
    // 1. Scheduler
    if (enableScheduler && config.scheduler?.enabled) {
      log.info('启动调度器...');
      components.scheduler = new CronScheduler();
      components.scheduler.start(config, analysisCallback);
      log.info('调度器已启动');
    }

    // 2. Data migration (idempotent, runs before file watcher)
    try {
      const migrated = await migratePreferenceWorkflowType();
      if (migrated > 0) {
        log.info(`数据迁移完成: ${migrated} 条偏好类型已从 'workflow' 更新为 'development-process'`);
      }
    } catch (error) {
      log.error('数据迁移失败', error as Error);
    }

    // 3. File watcher (CLAUDE.md auto-regeneration)
    log.info('启动文件监听器...');
    components.fileWatcher = watchSourceFiles();
    try {
      await regenerateClaudeMdFromDisk();
      log.info('CLAUDE.md 已同步');
    } catch (error) {
      log.error('CLAUDE.md 初始同步失败', error as Error);
    }

    // 3. Web server
    if (enableWeb) {
      log.info(`启动 Web 服务器 (端口 ${port})...`);

      const webModule = await import('../../web/server/index.js');

      // Register scheduler hot-reload callback
      if (enableScheduler) {
        const makeCallback = () =>
          createAnalysisCallback(opts.analysisRunner, log);
        const reloadFn = createReloadScheduler(components, makeCallback, log);
        webModule.onSchedulerConfigChanged(reloadFn);
        log.info('调度器热重载回调已注册');
      }

      await webModule.startServer(port);
      components.webServer = webModule.server;
      log.info(`Web 服务器已启动: http://localhost:${port}`);
    }

    return components;
  } catch (error) {
    // Partial cleanup on startup failure
    await stopComponents(components, log);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Stop Components
// ---------------------------------------------------------------------------

/**
 * Gracefully stop all running components.
 */
export async function stopComponents(
  components: DaemonComponents,
  log: LifecycleLogger
): Promise<void> {
  if (components.fileWatcher) {
    await stopWatching(components.fileWatcher);
    components.fileWatcher = null;
    log.info('文件监听器已停止');
  }

  if (components.scheduler) {
    components.scheduler.stop();
    components.scheduler = null;
    log.info('调度器已停止');
  }

  if (components.webServer) {
    await new Promise<void>((resolve) => {
      components.webServer.close(() => {
        log.info('Web 服务器已关闭');
        resolve();
      });
    });
    components.webServer = null;
  }
}
