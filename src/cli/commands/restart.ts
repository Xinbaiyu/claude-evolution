import chalk from 'chalk';
import { stopCommand } from './stop.js';
import { startCommand } from './start.js';
import { ProcessManager } from '../../daemon/process-manager.js';

interface RestartOptions {
  daemon?: boolean;
  port?: number;
  noScheduler?: boolean;
  noWeb?: boolean;
}

/**
 * Restart command - 重启守护进程
 */
export async function restartCommand(options: RestartOptions = {}): Promise<void> {
  console.log(chalk.bold.cyan('🔄 重启守护进程'));
  console.log('');

  const processManager = new ProcessManager();

  // 1. 检查守护进程是否在运行
  const isRunning = await processManager.isDaemonRunning();

  if (isRunning) {
    // 2. 停止现有进程
    console.log(chalk.gray('正在停止现有进程...'));
    try {
      await stopCommand({ force: false });
    } catch (error) {
      console.error(chalk.red('❌ 停止进程失败'));
      console.log('');
      console.log(chalk.cyan('💡 尝试强制停止: claude-evolution stop --force'));
      console.log(chalk.cyan('💡 然后手动启动: claude-evolution start'));
      throw error;
    }

    // 3. 等待进程完全退出
    console.log('');
    console.log(chalk.gray('等待进程完全退出...'));
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 4. 验证进程已停止
    const stillRunning = await processManager.isDaemonRunning();
    if (stillRunning) {
      console.error(chalk.red('❌ 进程未能完全停止'));
      console.log('');
      console.log(chalk.cyan('💡 请手动停止进程，然后重新启动'));
      process.exit(1);
    }
  } else {
    // 进程未运行，直接启动
    console.log(chalk.yellow('⚠️  守护进程未运行，直接启动...'));
    console.log('');
  }

  // 5. 启动新进程
  console.log(chalk.gray('正在启动新进程...'));
  console.log('');

  try {
    await startCommand(options);
  } catch (error) {
    console.error(chalk.red('❌ 启动进程失败'));
    throw error;
  }
}
