import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { loadConfig } from '../../config/index.js';
import { ProcessManager, PidFileData } from '../../daemon/process-manager.js';
import { DaemonLogger } from '../../daemon/logger.js';
import { CronScheduler } from '../../scheduler/cron-scheduler.js';
import { analyzeCommand } from './analyze.js';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StartOptions {
  daemon?: boolean;
  port?: number;
  noScheduler?: boolean;
  noWeb?: boolean;
}

/**
 * Start command - 启动守护进程
 */
export async function startCommand(options: StartOptions = {}): Promise<void> {
  const config = await loadConfig();
  const processManager = new ProcessManager();

  // 1. 检查是否已经在运行
  const isRunning = await processManager.isDaemonRunning();
  if (isRunning) {
    const pidInfo = await processManager.readPidFile();
    console.error(chalk.red('❌ 守护进程已在运行'));
    if (pidInfo) {
      console.log(chalk.gray(`   PID: ${pidInfo.pid}`));
      console.log(chalk.gray(`   端口: ${pidInfo.port}`));
    }
    console.log('');
    console.log(chalk.cyan('💡 查看状态: claude-evolution status'));
    console.log(chalk.cyan('💡 停止服务: claude-evolution stop'));
    process.exit(1);
  }

  // 2. 决定启动模式
  const isDaemonMode = options.daemon ?? false;

  if (isDaemonMode) {
    // 后台模式：fork 子进程
    await startDaemonMode(options, config);
  } else {
    // 前台模式：直接运行
    await startForegroundMode(options, config, processManager);
  }
}

/**
 * 前台模式启动
 */
async function startForegroundMode(
  options: StartOptions,
  config: any,
  processManager: ProcessManager
): Promise<void> {
  console.log(chalk.bold.cyan('🚀 启动守护进程（前台模式）'));
  console.log('');

  // 初始化日志
  const logFile = path.join(homedir(), '.claude-evolution/logs/daemon.log');
  const logger = new DaemonLogger({ logFile });
  await logger.init();

  // 写入 PID 文件
  const port = options.port ?? 10010;
  const pidData: PidFileData = {
    pid: process.pid,
    startTime: new Date().toISOString(),
    port,
    version: '0.1.0', // TODO: Read from package.json
  };
  await processManager.writePidFile(pidData);

  // 启动组件
  const enableScheduler = !options.noScheduler && (config.scheduler?.enabled ?? true);
  const enableWeb = !options.noWeb;

  let scheduler: CronScheduler | null = null;
  let webServer: any = null;

  try {
    // 启动调度器
    if (enableScheduler) {
      console.log(chalk.gray('📅 启动调度器...'));
      scheduler = new CronScheduler();
      scheduler.start(config, async () => {
        logger.info('定时分析任务开始');
        try {
          await analyzeCommand({ now: true });
          logger.info('定时分析任务完成');
        } catch (error) {
          logger.error('定时分析任务失败', error as Error);
        }
      });
      console.log(chalk.green('   ✓ 调度器已启动'));
    }

    // 启动 Web 服务器
    if (enableWeb) {
      console.log(chalk.gray('🌐 启动 Web 服务器...'));

      // 动态导入 web server
      const webModule = await import('../../../web/server/index.js');

      try {
        await webModule.startServer(port);
        logger.info(`Web 服务器已启动: http://localhost:${port}`);
        console.log(chalk.green(`   ✓ Web UI 运行在 http://localhost:${port}`));

        // 保存 server 引用用于关闭
        webServer = webModule.server;
      } catch (error: any) {
        if (error.code === 'EADDRINUSE') {
          logger.error(`端口 ${port} 已被占用`);
          console.error(chalk.red(`❌ 端口 ${port} 已被占用`));
          console.log(chalk.cyan(`💡 尝试其他端口: claude-evolution start --port 3001`));
        } else {
          logger.error('Web 服务器启动失败', error);
        }
        throw error;
      }
    }

    console.log('');
    console.log(chalk.bold.green('✓ 守护进程已启动'));

    if (enableScheduler) {
      console.log(chalk.gray(`   调度器: 每 ${config.scheduler.interval} 自动分析`));
    }
    if (enableWeb) {
      console.log(chalk.gray(`   Web UI: http://localhost:${port}`));
    }

    console.log('');
    console.log(chalk.gray('按 Ctrl+C 停止服务'));

    // 设置优雅关闭
    processManager.onShutdown(async () => {
      console.log('');
      console.log(chalk.yellow('正在关闭守护进程...'));

      if (scheduler) {
        scheduler.stop();
      }

      if (webServer) {
        await new Promise<void>((resolve) => {
          webServer.close(() => {
            resolve();
          });
        });
      }

      await logger.close();

      console.log(chalk.green('✓ 守护进程已关闭'));
    });

    processManager.setupSignalHandlers();

  } catch (error) {
    logger.error('启动失败', error as Error);

    // 清理
    if (scheduler) {
      scheduler.stop();
    }

    await logger.close();
    await processManager.deletePidFile();

    throw error;
  }
}

/**
 * 后台模式启动（fork 子进程）
 */
async function startDaemonMode(
  options: StartOptions,
  config: any
): Promise<void> {
  console.log(chalk.bold.cyan('🚀 启动守护进程（后台模式）'));
  console.log('');

  // 构建 daemon 进程脚本路径
  const daemonScript = path.join(__dirname, '../../daemon/daemon-process.js');

  // Fork 子进程
  const child = fork(daemonScript, [], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      DAEMON_PORT: String(options.port ?? 10010),
      DAEMON_NO_SCHEDULER: options.noScheduler ? '1' : '0',
      DAEMON_NO_WEB: options.noWeb ? '1' : '0',
    },
  });

  // 分离子进程
  child.unref();

  console.log(chalk.green('✓ 守护进程已在后台启动'));
  console.log(chalk.gray(`   PID: ${child.pid}`));
  console.log('');
  console.log(chalk.cyan('💡 查看状态: claude-evolution status'));
  console.log(chalk.cyan('💡 查看日志: claude-evolution logs -f'));
  console.log(chalk.cyan('💡 停止服务: claude-evolution stop'));
}
