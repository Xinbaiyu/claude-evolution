import chalk from 'chalk';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SUCCESS = 'success',
}

/**
 * 日志输出函数
 */
export function log(level: LogLevel, message: string, ...args: any[]): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}]`;

  switch (level) {
    case LogLevel.DEBUG:
      console.log(chalk.gray(prefix), chalk.gray(message), ...args);
      break;
    case LogLevel.INFO:
      console.log(chalk.blue(prefix), message, ...args);
      break;
    case LogLevel.WARN:
      console.warn(chalk.yellow(prefix), chalk.yellow(message), ...args);
      break;
    case LogLevel.ERROR:
      console.error(chalk.red(prefix), chalk.red(message), ...args);
      break;
    case LogLevel.SUCCESS:
      console.log(chalk.green(prefix), chalk.green(message), ...args);
      break;
  }
}

/**
 * 便捷日志函数
 */
export const logger = {
  debug: (message: string, ...args: any[]) => log(LogLevel.DEBUG, message, ...args),
  info: (message: string, ...args: any[]) => log(LogLevel.INFO, message, ...args),
  warn: (message: string, ...args: any[]) => log(LogLevel.WARN, message, ...args),
  error: (message: string, ...args: any[]) => log(LogLevel.ERROR, message, ...args),
  success: (message: string, ...args: any[]) => log(LogLevel.SUCCESS, message, ...args),
};
