/**
 * Model History Management
 * 管理 LLM Provider 模型名称的历史记录（localStorage）
 */

const STORAGE_KEY = 'claude-evolution:model-history';
const MAX_HISTORY_SIZE = 10;

export type ProviderType = 'openai' | 'claude' | 'ccr';

interface ModelHistory {
  openai: string[];
  claude: string[];
  ccr: string[];
}

/**
 * 从 localStorage 读取历史记录
 */
function readHistory(): ModelHistory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { openai: [], claude: [], ccr: [] };
    }

    const parsed = JSON.parse(raw);
    // 验证数据结构
    if (
      typeof parsed === 'object' &&
      Array.isArray(parsed.openai) &&
      Array.isArray(parsed.claude) &&
      Array.isArray(parsed.ccr)
    ) {
      return parsed;
    }

    // 数据损坏，清空重建
    console.warn('[modelHistory] Invalid data structure, resetting...');
    return { openai: [], claude: [], ccr: [] };
  } catch (error) {
    // localStorage 不可用或数据损坏
    console.warn('[modelHistory] Failed to read history:', error);
    return { openai: [], claude: [], ccr: [] };
  }
}

/**
 * 写入历史记录到 localStorage
 */
function writeHistory(history: ModelHistory): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    // QuotaExceededError 或 localStorage 禁用
    console.warn('[modelHistory] Failed to write history:', error);

    // 尝试清空旧记录后重试
    try {
      const minimal: ModelHistory = { openai: [], claude: [], ccr: [] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
    } catch {
      // 彻底失败，静默降级（不影响核心功能）
    }
  }
}

/**
 * 获取指定 provider 的历史记录
 *
 * @param provider - Provider 类型（'openai' | 'claude' | 'ccr'）
 * @returns 历史记录数组（最新的在前面）
 *
 * @example
 * const history = getModelHistory('openai')
 * // => ['my-azure-gpt4', 'gpt-4-turbo', 'gpt-4']
 */
export function getModelHistory(provider: ProviderType): string[] {
  const history = readHistory();
  return history[provider] || [];
}

/**
 * 添加模型名称到历史记录
 * - 自动去重：如果已存在，移到最前面（LRU）
 * - 容量限制：超过 MAX_HISTORY_SIZE 时删除最旧的记录
 *
 * @param provider - Provider 类型
 * @param model - 模型名称（不能为空字符串）
 *
 * @example
 * addModelToHistory('openai', 'my-azure-gpt4')
 * addModelToHistory('openai', 'gpt-4-turbo') // 已存在，移到最前面
 */
export function addModelToHistory(provider: ProviderType, model: string): void {
  // 验证输入
  if (!model || typeof model !== 'string' || model.trim() === '') {
    return;
  }

  const trimmedModel = model.trim();
  const history = readHistory();

  // 获取当前 provider 的历史记录
  const providerHistory = history[provider] || [];

  // 去重：移除已存在的记录
  const filteredHistory = providerHistory.filter((m) => m !== trimmedModel);

  // LRU：新记录放在最前面
  const newHistory = [trimmedModel, ...filteredHistory];

  // 容量限制：只保留最近 MAX_HISTORY_SIZE 条
  const limitedHistory = newHistory.slice(0, MAX_HISTORY_SIZE);

  // 更新历史记录
  const updatedHistory: ModelHistory = {
    ...history,
    [provider]: limitedHistory,
  };

  writeHistory(updatedHistory);
}

/**
 * 清空历史记录
 *
 * @param provider - 可选，指定 provider 清空。如果省略，清空所有
 *
 * @example
 * clearModelHistory('openai')  // 只清空 OpenAI 历史
 * clearModelHistory()          // 清空所有历史
 */
export function clearModelHistory(provider?: ProviderType): void {
  if (provider) {
    // 清空指定 provider
    const history = readHistory();
    const updatedHistory: ModelHistory = {
      ...history,
      [provider]: [],
    };
    writeHistory(updatedHistory);
  } else {
    // 清空所有
    writeHistory({ openai: [], claude: [], ccr: [] });
  }
}
