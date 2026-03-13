import chalk from 'chalk';
import { ProcessManager } from '../../daemon/process-manager.js';

interface StopOptions {
  force?: boolean;
  timeout?: number;
}

/**
 * Stop command - 停止守护进程
 */
export async function stopCommand(options: StopOptions = {}): Promise<void> {
  const processManager = new ProcessManager();

  console.log(chalk.bold.cyan('🛑 停止守护进程'));
  console.log('');

  // 1. 读取 PID 文件
  const pidInfo = await processManager.readPidFile();
  if (!pidInfo) {
    console.log(chalk.yellow('⚠️  守护进程未运行'));
    console.log('');
    console.log(chalk.cyan('💡 启动服务: claude-evolution start'));
    return;
  }

  // 2. 检查进程是否真的在运行
  try {
    process.kill(pidInfo.pid, 0);
  } catch (error) {
    // 进程不存在，清理 PID 文件
    await processManager.deletePidFile();
    console.log(chalk.yellow('⚠️  守护进程已停止（清理了过期的 PID 文件）'));
    return;
  }

  console.log(chalk.gray(`   PID: ${pidInfo.pid}`));
  console.log(chalk.gray(`   端口: ${pidInfo.port}`));
  console.log(chalk.gray(`   启动时间: ${new Date(pidInfo.startTime).toLocaleString('zh-CN')}`));
  console.log('');

  // 3. 发送 SIGTERM 信号
  console.log(chalk.gray('发送停止信号...'));

  try {
    process.kill(pidInfo.pid, 'SIGTERM');
  } catch (error: any) {
    if (error.code === 'ESRCH') {
      // 进程不存在
      await processManager.deletePidFile();
      console.log(chalk.yellow('⚠️  进程已不存在，已清理 PID 文件'));
      return;
    }
    throw error;
  }

  // 4. 等待进程退出
  const timeout = options.timeout ?? 30000; // 默认 30 秒超时
  const startTime = Date.now();
  const checkInterval = 100; // 每 100ms 检查一次

  let processExited = false;

  while (Date.now() - startTime < timeout) {
    await new Promise((resolve) => setTimeout(resolve, checkInterval));

    try {
      process.kill(pidInfo.pid, 0);
      // 进程仍然存在
    } catch (error) {
      // 进程已退出
      processExited = true;
      break;
    }
  }

  if (processExited) {
    // 5. 进程正常退出，清理 PID 文件
    await processManager.deletePidFile();
    console.log(chalk.green('✓ 守护进程已停止'));
    return;
  }

  // 6. 超时处理
  if (options.force) {
    console.log(chalk.yellow('⚠️  优雅关闭超时，强制终止...'));

    try {
      process.kill(pidInfo.pid, 'SIGKILL');

      // 等待一小段时间确保进程被杀死
      await new Promise((resolve) => setTimeout(resolve, 500));

      await processManager.deletePidFile();
      console.log(chalk.green('✓ 守护进程已强制终止'));
    } catch (error: any) {
      if (error.code === 'ESRCH') {
        await processManager.deletePidFile();
        console.log(chalk.green('✓ 守护进程已停止'));
      } else {
        throw error;
      }
    }
  } else {
    console.log(chalk.red('❌ 停止超时'));
    console.log('');
    console.log(chalk.cyan('💡 强制停止: claude-evolution stop --force'));
    console.log(chalk.gray(`   进程 PID: ${pidInfo.pid}`));
    console.log(chalk.gray(`   或手动执行: kill -9 ${pidInfo.pid}`));
    process.exit(1);
  }
}
