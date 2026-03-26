import type Anthropic from '@anthropic-ai/sdk';
import { Observation, ExtractionResult } from '../types/index.js';
import { Config } from '../config/index.js';
import { logger, withLLMRetry, pMapLimited, getFulfilledValues } from '../utils/index.js';
import { buildAnalysisPrompt, SYSTEM_MESSAGE } from './prompts.js';
import { formatObservationsAsText } from './session-collector.js';
import { loadExistingObservationsSummary } from './existing-observations-loader.js';
import { createLLMClient } from '../llm/client-factory.js';
import { AnthropicProvider } from '../llm/providers/anthropic.js';

/**
 * 经验提取器
 * 使用 LLM 从会话记录中提取偏好、模式和工作流程
 */

/**
 * 提取经验和模式
 *
 * @param observations - 观察记录 (来自 claude-mem)
 * @param config - 配置
 * @param promptsContext - 可选的用户 prompts 文本上下文 (用于提取沟通偏好)
 */
export async function extractExperience(
  observations: Observation[],
  config: Config,
  promptsContext?: string | null
): Promise<ExtractionResult> {
  if (observations.length === 0 && !promptsContext) {
    logger.warn('没有观察记录和用户 prompts 可供分析');
    return {
      preferences: [],
      patterns: [],
      workflows: [],
    };
  }

  logger.info('开始使用 LLM 提取经验...');
  logger.debug(`模型: ${config.llm.model}`);
  logger.debug(`温度: ${config.llm.temperature}`);
  logger.debug(`最大 tokens: ${config.llm.maxTokens}`);
  if (config.llm.baseURL) {
    logger.debug(`使用自定义 baseURL: ${config.llm.baseURL}`);
  }

  if (promptsContext) {
    logger.info('  包含用户 prompts 上下文用于沟通偏好提取');
  }

  // 使用统一的 LLM 客户端工厂
  const llmProvider = await createLLMClient(config);

  // 获取底层 Anthropic 客户端（用于 prompt caching 等特有功能）
  if (!(llmProvider instanceof AnthropicProvider)) {
    throw new Error('Experience extraction currently requires Anthropic provider');
  }
  const anthropic = llmProvider.getClient();

  // 加载已有观察摘要，注入到提取 prompt 中防止重复提取
  let existingObsSummary: string | null = null;
  try {
    existingObsSummary = await loadExistingObservationsSummary(30);
    if (existingObsSummary) {
      logger.info(`  已加载 ${existingObsSummary.split('\n').length} 条已知观察用于去重`);
    }
  } catch (error) {
    logger.warn('加载已有观察摘要失败，将不进行提取去重:', error);
  }

  // 分批处理观察记录
  const batchSize = 10; // 固定批次大小
  // 当 observations 为空但有 promptsContext 时，仍需至少一个批次来提取沟通偏好
  const batches = observations.length > 0
    ? chunkArray(observations, batchSize)
    : [[] as Observation[]];

  logger.info(`经验提取: ${batches.length} 个批次, 并发数 3`);

  // 并行处理各批次（有限并发，单批失败不影响其他批次）
  const batchResults = await pMapLimited(
    batches,
    async (batch, i) => {
      logger.debug(`处理批次 ${i + 1}/${batches.length} (${batch.length} 条记录)...`);
      const result = await extractFromBatch(batch, config, anthropic, promptsContext, existingObsSummary);
      logger.success(`✓ 批次 ${i + 1} 提取完成`);
      return result;
    },
    3
  );

  const allResults = getFulfilledValues(batchResults);

  // 记录失败的批次
  const failedCount = batchResults.filter(r => r.status === 'rejected').length;
  if (failedCount > 0) {
    logger.warn(`${failedCount} 个批次提取失败，已跳过`);
  }

  // 合并所有批次的结果
  const merged = mergeExtractionResults(allResults);

  logger.success(
    `✓ 经验提取完成: ${merged.preferences.length} 偏好, ` +
      `${merged.patterns.length} 模式, ${merged.workflows.length} 工作流`
  );

  return merged;
}

/**
 * 从单个批次提取经验
 */
async function extractFromBatch(
  observations: Observation[],
  config: Config,
  anthropic: Anthropic,
  promptsContext?: string | null,
  existingObsSummary?: string | null
): Promise<ExtractionResult> {
  // 格式化观察记录为文本
  const sessionsText = formatObservationsAsText(observations);

  // 构建提示词
  const userPrompt = buildAnalysisPrompt(sessionsText, promptsContext, existingObsSummary);

  // 准备消息
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: userPrompt,
    },
  ];

  // 构建系统消息 (支持 prompt caching)
  const system: any = config.llm.enablePromptCaching
    ? [
        {
          type: 'text',
          text: SYSTEM_MESSAGE,
          cache_control: { type: 'ephemeral' },
        },
      ]
    : SYSTEM_MESSAGE;

  // 调用 API (使用重试机制)
  const response = await withLLMRetry(
    () => anthropic.messages.create({
      model: config.llm.model, // 直接使用配置的模型名
      max_tokens: config.llm.maxTokens,
      temperature: config.llm.temperature,
      system,
      messages,
    }),
    {
      context: 'Experience Extraction',
      baseURL: config.llm.baseURL,
    }
  );

  // 解析响应
  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('意外的响应类型');
  }

  // 提取 JSON (支持 markdown 代码块)
  const jsonText = extractJSON(content.text);
  const result = JSON.parse(jsonText) as ExtractionResult;

  // 验证结果
  validateExtractionResult(result);

  return result;
}

/**
 * 从文本中提取 JSON
 */
function extractJSON(text: string): string {
  // 尝试直接解析
  try {
    JSON.parse(text);
    return text;
  } catch {
    // 尝试从 markdown 代码块中提取
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) {
      return match[1];
    }

    // 尝试查找 JSON 对象
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    throw new Error('无法从响应中提取 JSON');
  }
}

/**
 * 验证提取结果的格式
 */
function validateExtractionResult(result: any): asserts result is ExtractionResult {
  if (!result || typeof result !== 'object') {
    throw new Error('无效的提取结果: 不是对象');
  }

  if (!Array.isArray(result.preferences)) {
    throw new Error('无效的提取结果: preferences 不是数组');
  }

  if (!Array.isArray(result.patterns)) {
    throw new Error('无效的提取结果: patterns 不是数组');
  }

  if (!Array.isArray(result.workflows)) {
    throw new Error('无效的提取结果: workflows 不是数组');
  }
}

/**
 * 合并多个提取结果
 */
function mergeExtractionResults(results: ExtractionResult[]): ExtractionResult {
  const merged: ExtractionResult = {
    preferences: [],
    patterns: [],
    workflows: [],
  };

  for (const result of results) {
    merged.preferences.push(...result.preferences);
    merged.patterns.push(...result.patterns);
    merged.workflows.push(...result.workflows);
  }

  // 去重和合并相似项 (简单实现)
  merged.preferences = deduplicatePreferences(merged.preferences);
  merged.patterns = deduplicatePatterns(merged.patterns);
  merged.workflows = deduplicateWorkflows(merged.workflows);

  return merged;
}

/**
 * 去重偏好
 */
function deduplicatePreferences(
  preferences: ExtractionResult['preferences']
): ExtractionResult['preferences'] {
  const seen = new Map<string, (typeof preferences)[0]>();

  for (const pref of preferences) {
    const key = `${pref.type}:${pref.description}`;
    const existing = seen.get(key);

    if (existing) {
      // 合并: 取更高的置信度,累加频率
      existing.confidence = Math.max(existing.confidence, pref.confidence);
      existing.frequency += pref.frequency;
      existing.evidence.push(...pref.evidence);
    } else {
      seen.set(key, { ...pref });
    }
  }

  return Array.from(seen.values());
}

/**
 * 去重模式
 */
function deduplicatePatterns(
  patterns: ExtractionResult['patterns']
): ExtractionResult['patterns'] {
  const seen = new Map<string, (typeof patterns)[0]>();

  for (const pattern of patterns) {
    const key = `${pattern.problem}:${pattern.solution}`;
    const existing = seen.get(key);

    if (existing) {
      existing.confidence = Math.max(existing.confidence, pattern.confidence);
      existing.occurrences += pattern.occurrences;
      existing.evidence.push(...pattern.evidence);
    } else {
      seen.set(key, { ...pattern });
    }
  }

  return Array.from(seen.values());
}

/**
 * 去重工作流程
 */
function deduplicateWorkflows(
  workflows: ExtractionResult['workflows']
): ExtractionResult['workflows'] {
  const seen = new Map<string, (typeof workflows)[0]>();

  for (const workflow of workflows) {
    const key = workflow.name;
    const existing = seen.get(key);

    if (existing) {
      existing.confidence = Math.max(existing.confidence, workflow.confidence);
      existing.frequency += workflow.frequency;
      existing.evidence.push(...workflow.evidence);
    } else {
      seen.set(key, { ...workflow });
    }
  }

  return Array.from(seen.values());
}

/**
 * 将数组分块
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
