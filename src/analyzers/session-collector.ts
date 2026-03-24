import { ClaudeMemHTTPClient, UserPrompt } from '../memory/http-client.js';
import { Observation } from '../types/index.js';
import { logger } from '../utils/index.js';
import { filterSensitiveData } from '../memory/filters.js';
import { Config } from '../config/index.js';

/**
 * 会话数据采集器
 * 负责从 claude-mem HTTP API 中收集需要分析的会话记录
 */

/**
 * 采集最近的会话记录
 */
export async function collectRecentSessions(
  httpClient: ClaudeMemHTTPClient,
  lastAnalysisTime: Date | null,
  config: Config
): Promise<Observation[]> {
  // 检查是否启用 Observations 提取
  if (!config.learning?.extractObservations) {
    logger.info('Observations 提取已关闭，跳过采集');
    return [];
  }

  logger.info('开始采集会话数据...');

  // 1. 确定时间范围
  const dateStart = lastAnalysisTime
    ? lastAnalysisTime
    : new Date(Date.now() - config.filters.sessionRetentionDays * 24 * 60 * 60 * 1000);

  logger.debug(`时间范围: ${dateStart.toISOString()} 至今`);

  // 2. 通过 HTTP API 直接获取观察记录
  logger.debug('查询观察记录...');

  // 只查询关注的类型
  // 🧪 实验：添加 discovery 类型，验证能否提取沟通偏好
  const targetTypes = ['feature', 'bugfix', 'refactor', 'decision', 'discovery'];

  const observations = await httpClient.getObservationsWithRetry(
    {
      created_at_start: Math.floor(dateStart.getTime() / 1000),
      created_at_end: Math.floor(Date.now() / 1000),
      limit: 200, // 最多获取 200 条
    },
    config.httpApi.maxRetries,
    config.httpApi.retryDelay
  );

  if (observations.length === 0) {
    logger.warn('未找到新的会话记录');
    return [];
  }

  logger.success(`✓ 找到 ${observations.length} 条会话记录`);

  // 3. 客户端过滤类型
  const filteredByType = observations.filter((obs) =>
    targetTypes.includes(obs.type)
  );

  logger.debug(`类型过滤后剩余 ${filteredByType.length} 条记录`);

  if (filteredByType.length === 0) {
    logger.warn('没有符合类型的会话记录');
    return [];
  }

  // 4. 过滤敏感数据
  if (config.filters.enableSensitiveDataFilter) {
    logger.debug('正在过滤敏感数据...');

    for (const obs of filteredByType) {
      obs.narrative = filterSensitiveData(
        obs.narrative,
        config.filters.customBlacklist
      );
      obs.title = filterSensitiveData(
        obs.title,
        config.filters.customBlacklist
      );
    }

    logger.success('✓ 敏感数据过滤完成');
  }

  return filteredByType;
}

/**
 * 格式化观察记录为文本
 */
export function formatObservationsAsText(observations: Observation[]): string {
  return observations
    .map((obs) => {
      return `[${obs.created_at}] ${obs.type.toUpperCase()}: ${obs.title}
${obs.narrative}
---`;
    })
    .join('\n\n');
}

/**
 * 按类型分组观察记录
 */
export function groupObservationsByType(
  observations: Observation[]
): Map<string, Observation[]> {
  const groups = new Map<string, Observation[]>();

  for (const obs of observations) {
    const type = obs.type;
    if (!groups.has(type)) {
      groups.set(type, []);
    }
    groups.get(type)!.push(obs);
  }

  return groups;
}

/**
 * 统计观察记录
 */
export function getObservationStats(observations: Observation[]): {
  total: number;
  byType: Map<string, number>;
  totalTokens: number;
} {
  const byType = new Map<string, number>();
  let totalTokens = 0;

  for (const obs of observations) {
    // 统计类型
    const count = byType.get(obs.type) || 0;
    byType.set(obs.type, count + 1);

    // 统计 tokens
    totalTokens += (obs.tokens_read || 0) + (obs.tokens_work || 0);
  }

  return {
    total: observations.length,
    byType,
    totalTokens,
  };
}

/**
 * 采集用户 prompts (用于沟通偏好提取)
 *
 * 使用客户端时间过滤,因为 /api/search/prompts 不支持 dateRange 参数
 */
export async function collectRecentPrompts(
  httpClient: ClaudeMemHTTPClient,
  lastAnalysisTime: Date | null,
  config: Config
): Promise<UserPrompt[]> {
  logger.info('开始采集用户 prompts...');

  // 1. 确定时间范围
  const dateStart = lastAnalysisTime
    ? lastAnalysisTime
    : new Date(Date.now() - config.filters.sessionRetentionDays * 24 * 60 * 60 * 1000);

  const dateEnd = new Date();

  logger.debug(`时间范围: ${dateStart.toISOString()} 至 ${dateEnd.toISOString()}`);

  // 2. 获取 prompts (带客户端时间过滤)
  const prompts = await httpClient.getPromptsByTimeRange(dateStart, dateEnd, {
    limit: 200, // 默认获取200条,6小时内应该足够
  });

  if (prompts.length === 0) {
    logger.warn('未找到新的用户 prompts');
    return [];
  }

  logger.success(`✓ 找到 ${prompts.length} 条用户 prompts`);

  // 3. 过滤敏感数据
  if (config.filters.enableSensitiveDataFilter) {
    logger.debug('正在过滤敏感数据...');

    for (const prompt of prompts) {
      prompt.prompt_text = filterSensitiveData(
        prompt.prompt_text,
        config.filters.customBlacklist
      );
    }

    logger.success('✓ 敏感数据过滤完成');
  }

  return prompts;
}

/**
 * 格式化 prompts 为文本
 */
export function formatPromptsAsText(prompts: UserPrompt[]): string {
  return prompts
    .map((prompt) => {
      return `[${prompt.created_at}] Prompt #${prompt.prompt_number}: ${prompt.prompt_text}
---`;
    })
    .join('\n\n');
}
