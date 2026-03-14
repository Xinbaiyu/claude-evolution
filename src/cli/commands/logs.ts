import chalk from 'chalk';
import fs from 'fs-extra';
import { homedir } from 'os';
import path from 'path';
import { spawn } from 'child_process';

interface LogsOptions {
  follow?: boolean;
  lines?: number;
  level?: 'INFO' | 'WARN' | 'ERROR';
}

/**
 * Logs command - 查看守护进程日志
 */
export async function logsCommand(options: LogsOptions = {}): Promise<void> {
  const logFile = path.join(homedir(), '.claude-evolution/logs/daemon.log');

  // 1. 检查日志文件是否存在
  const exists = await fs.pathExists(logFile);
  if (!exists) {
    console.log(chalk.yellow('⚠️  日志文件不存在'));
    console.log('');
    console.log(chalk.gray('可能原因：'));
    console.log(chalk.gray('  - 守护进程从未启动过'));
    console.log(chalk.gray('  - 日志文件被删除'));
    console.log('');
    console.log(chalk.cyan('💡 启动守护进程: claude-evolution start'));
    return;
  }

  const lines = options.lines ?? 50;

  // 2. 如果是 follow 模式，使用 tail -f
  if (options.follow) {
    console.log(chalk.bold.cyan(`📋 跟踪日志（Ctrl+C 退出）`));
    console.log(chalk.gray(`文件: ${logFile}`));
    console.log('');

    const tail = spawn('tail', ['-f', '-n', String(lines), logFile], {
      stdio: 'inherit',
    });

    // 优雅退出处理
    process.on('SIGINT', () => {
      tail.kill();
      console.log('');
      process.exit(0);
    });

    // 等待 tail 进程结束
    await new Promise<void>((resolve) => {
      tail.on('close', () => {
        resolve();
      });
    });

    return;
  }

  // 3. 读取最后 N 行
  const content = await fs.readFile(logFile, 'utf-8');
  const allLines = content.split('\n').filter((line) => line.trim());

  // 4. 过滤日志级别
  let filteredLines = allLines;
  if (options.level) {
    const levelFilter = options.level;
    filteredLines = allLines.filter((line) => {
      // 检查日志行是否包含指定级别或更高级别
      if (levelFilter === 'ERROR') {
        return line.includes('[ERROR]');
      } else if (levelFilter === 'WARN') {
        return line.includes('[WARN]') || line.includes('[ERROR]');
      } else {
        // INFO 级别显示所有
        return true;
      }
    });
  }

  // 5. 获取最后 N 行
  const lastLines = filteredLines.slice(-lines);

  // 6. 彩色输出
  console.log(chalk.bold.cyan(`📋 最近 ${lastLines.length} 条日志`));
  console.log(chalk.gray(`文件: ${logFile}`));
  console.log('');

  for (const line of lastLines) {
    // 根据日志级别着色
    if (line.includes('[ERROR]')) {
      console.log(chalk.red(line));
    } else if (line.includes('[WARN]')) {
      console.log(chalk.yellow(line));
    } else if (line.includes('[INFO]')) {
      console.log(chalk.white(line));
    } else {
      console.log(chalk.gray(line));
    }
  }

  console.log('');
  console.log(chalk.gray('💡 实时跟踪日志: claude-evolution logs --follow'));
}
