import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger.js';

const execAsync = promisify(exec);

/**
 * LLM 调用重试工具
 * 支持自动重启 CCR 服务并重试
 */

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  restartCommand?: string;
  shouldRestart?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * 检查是否是连接错误
 */
export function isConnectionError(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();
  const errorString = error.toString().toLowerCase();

  const connectionErrors = [
    'econnrefused',
    'enotfound',
    'etimedout',
    'econnreset',
    'socket hang up',
    'network error',
    'fetch failed',
    'connect timeout',
  ];

  return connectionErrors.some(
    pattern => errorMessage.includes(pattern) || errorString.includes(pattern)
  );
}

/**
 * 检查是否是 CCR 服务错误
 */
export function isCCRServiceError(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();

  const ccrErrors = [
    'service unavailable',
    'bad gateway',
    '502',
    '503',
    '504',
    'upstream',
  ];

  return isConnectionError(error) || ccrErrors.some(
    pattern => errorMessage.includes(pattern)
  );
}

/**
 * 重启 CCR 服务
 */
export async function restartCCRService(command: string = 'ccr restart'): Promise<void> {
  logger.info('尝试重启 CCR 服务...', { command });

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 30000, // 30秒超时
    });

    if (stdout) {
      logger.debug('CCR restart stdout:', stdout);
    }
    if (stderr) {
      logger.debug('CCR restart stderr:', stderr);
    }

    logger.info('✓ CCR 服务重启命令已执行');

    // 等待服务启动
    logger.info('等待 CCR 服务启动...');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    logger.error('CCR 服务重启失败', error as Error);
    throw new Error(`Failed to restart CCR service: ${error}`);
  }
}

/**
 * 带重试的异步函数执行
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 2000,
    restartCommand = 'ccr restart',
    shouldRestart = isCCRServiceError,
    onRetry,
  } = options;

  let lastError: Error | undefined;
  let restarted = false;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`尝试执行 (第 ${attempt}/${maxRetries} 次)`);
      return await fn();
    } catch (error) {
      lastError = error as Error;

      logger.warn(`执行失败 (第 ${attempt}/${maxRetries} 次)`, {
        error: lastError.message,
        isConnectionError: isConnectionError(lastError),
      });

      // 如果这是最后一次尝试，直接抛出错误
      if (attempt === maxRetries) {
        logger.error('已达到最大重试次数，放弃执行', {
          attempts: maxRetries,
          lastError: lastError.message,
        });
        throw lastError;
      }

      // 调用重试回调
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // 检查是否需要重启服务
      if (!restarted && shouldRestart(lastError)) {
        logger.warn('检测到 CCR 服务错误，尝试重启...');

        try {
          await restartCCRService(restartCommand);
          restarted = true;
          logger.info('✓ CCR 服务已重启，继续重试...');

          // 重启后立即重试，不等待
          continue;
        } catch (restartError) {
          logger.error('CCR 服务重启失败，继续使用延迟重试', restartError as Error);
          // 重启失败，继续使用普通延迟重试
        }
      }

      // 延迟后重试
      const delay = retryDelay * attempt; // 指数退避
      logger.info(`等待 ${delay}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // 理论上不会到这里，但为了类型安全
  throw lastError || new Error('Unknown error during retry');
}

/**
 * 检查是否使用本地代理
 */
export function isLocalProxy(baseURL?: string): boolean {
  if (!baseURL) {
    return false;
  }

  const url = baseURL.toLowerCase();
  return url.includes('localhost') ||
         url.includes('127.0.0.1') ||
         url.includes('0.0.0.0') ||
         url.startsWith('http://192.168.') ||
         url.startsWith('http://10.');
}

/**
 * LLM 调用专用重试包装器
 */
export async function withLLMRetry<T>(
  fn: () => Promise<T>,
  options: {
    context?: string;
    baseURL?: string;
  } = {}
): Promise<T> {
  const { context = 'LLM调用', baseURL } = options;

  // 只有使用本地代理时才启用 CCR 重启
  const enableRestart = isLocalProxy(baseURL);

  return withRetry(fn, {
    maxRetries: 3,
    retryDelay: 2000,
    restartCommand: enableRestart ? 'ccr restart' : undefined,
    shouldRestart: enableRestart ? isCCRServiceError : () => false,
    onRetry: (attempt, error) => {
      logger.warn(`${context} 失败，准备重试`, {
        attempt,
        error: error.message,
        willRestart: enableRestart,
      });
    },
  });
}

/**
 * 健康检查：测试 CCR 服务是否可用
 */
export async function checkCCRHealth(baseURL: string): Promise<boolean> {
  try {
    const healthEndpoints = [
      `${baseURL}/health`,
      `${baseURL}/v1/models`,
      baseURL,
    ];

    for (const endpoint of healthEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          logger.debug('CCR 服务健康检查通过', { endpoint });
          return true;
        }
      } catch {
        // 继续尝试下一个端点
      }
    }

    return false;
  } catch (error) {
    logger.error('CCR 健康检查失败', error as Error);
    return false;
  }
}
