import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Suggestion, Preference, Pattern, Workflow } from '../types/index.js';
import { getEvolutionDir } from '../config/loader.js';
import { logger } from '../utils/index.js';
import { writeLearnedContent, generateCLAUDEmd } from '../generators/index.js';
import { loadConfig } from '../config/index.js';

/**
 * 建议管理器
 * 负责保存、加载和管理待审批的建议
 */

/**
 * 获取建议文件路径
 */
function getSuggestionsPath(): string {
  return path.join(getEvolutionDir(), 'suggestions/pending.json');
}

/**
 * 加载所有待审批建议
 */
export async function loadPendingSuggestions(): Promise<Suggestion[]> {
  const filePath = getSuggestionsPath();

  if (!(await fs.pathExists(filePath))) {
    return [];
  }

  try {
    return await fs.readJSON(filePath);
  } catch (error) {
    logger.error('加载建议失败:', error);
    return [];
  }
}

/**
 * 保存待审批建议
 */
export async function savePendingSuggestions(suggestions: Suggestion[]): Promise<void> {
  const filePath = getSuggestionsPath();
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJSON(filePath, suggestions, { spaces: 2 });
}

/**
 * 添加新建议
 */
export async function addSuggestion(
  item: Preference | Pattern | Workflow,
  type: 'preference' | 'pattern' | 'workflow'
): Promise<string> {
  const suggestions = await loadPendingSuggestions();

  const suggestion: Suggestion = {
    id: uuidv4(),
    type,
    item,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  suggestions.push(suggestion);
  await savePendingSuggestions(suggestions);

  logger.debug(`✓ 添加建议: ${suggestion.id} (${type})`);
  return suggestion.id;
}

/**
 * 批量添加建议
 */
export async function addSuggestionsBatch(
  items: (Preference | Pattern | Workflow)[],
  getType: (item: any) => 'preference' | 'pattern' | 'workflow'
): Promise<string[]> {
  const ids: string[] = [];

  for (const item of items) {
    const type = getType(item);
    const id = await addSuggestion(item, type);
    ids.push(id);
  }

  return ids;
}

/**
 * 获取单个建议
 */
export async function getSuggestion(id: string): Promise<Suggestion | null> {
  const suggestions = await loadPendingSuggestions();
  return suggestions.find((s) => s.id === id) || null;
}

/**
 * 批准建议 (BUG-4: 使用新逻辑)
 */
export async function approveSuggestion(id: string): Promise<void> {
  await moveSuggestionToApproved(id);
  await regenerateLearnedContent();
  logger.success(`✓ 已批准建议: ${id}`);
}

/**
 * 拒绝建议
 */
export async function rejectSuggestion(id: string): Promise<void> {
  const pending = await loadPendingSuggestions();
  const rejectedPath = path.join(getEvolutionDir(), 'suggestions/rejected.json');

  const index = pending.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error(`建议不存在: ${id}`);
  }

  const suggestion = pending[index];
  if (suggestion.status !== 'pending') {
    throw new Error(`建议已处理: ${id} (${suggestion.status})`);
  }

  // 从 pending 中移除
  pending.splice(index, 1);

  // 更新状态
  suggestion.status = 'rejected';
  suggestion.reviewedAt = new Date().toISOString();

  // 添加到 rejected.json
  const rejected = (await fs.pathExists(rejectedPath))
    ? await fs.readJSON(rejectedPath)
    : [];
  rejected.push(suggestion);

  // 保存两个文件
  await savePendingSuggestions(pending);
  await fs.writeJSON(rejectedPath, rejected, { spaces: 2 });

  logger.success(`✓ 已拒绝建议: ${id}`);
}

/**
 * 清理已处理的建议
 */
export async function cleanupProcessedSuggestions(): Promise<number> {
  const suggestions = await loadPendingSuggestions();
  const beforeCount = suggestions.length;

  // 只保留 pending 状态的建议
  const pending = suggestions.filter((s) => s.status === 'pending');

  await savePendingSuggestions(pending);

  const removedCount = beforeCount - pending.length;
  if (removedCount > 0) {
    logger.debug(`✓ 清理了 ${removedCount} 条已处理的建议`);
  }

  return removedCount;
}

/**
 * 判断项目类型
 */
export function getItemType(
  item: Preference | Pattern | Workflow
): 'preference' | 'pattern' | 'workflow' {
  if ('type' in item && typeof item.type === 'string') {
    return 'preference';
  }
  if ('problem' in item && 'solution' in item) {
    return 'pattern';
  }
  if ('name' in item && 'steps' in item) {
    return 'workflow';
  }
  throw new Error('无法判断项目类型');
}

/**
 * 获取已批准建议文件路径
 */
function getApprovedSuggestionsPath(): string {
  return path.join(getEvolutionDir(), 'suggestions/approved.json');
}

/**
 * 加载所有已批准建议 (BUG-1)
 */
export async function loadApprovedSuggestions(): Promise<Suggestion[]> {
  const filePath = getApprovedSuggestionsPath();

  if (!(await fs.pathExists(filePath))) {
    return [];
  }

  try {
    return await fs.readJSON(filePath);
  } catch (error) {
    logger.error('加载已批准建议失败:', error);
    return [];
  }
}

/**
 * 保存已批准建议
 */
async function saveApprovedSuggestions(suggestions: Suggestion[]): Promise<void> {
  const filePath = getApprovedSuggestionsPath();
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJSON(filePath, suggestions, { spaces: 2 });
}

/**
 * 移动建议到已批准列表 (BUG-2)
 */
async function moveSuggestionToApproved(id: string): Promise<Suggestion> {
  const pending = await loadPendingSuggestions();
  const approved = await loadApprovedSuggestions();

  const index = pending.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error(`建议不存在: ${id}`);
  }

  const suggestion = pending[index];
  if (suggestion.status !== 'pending') {
    throw new Error(`建议已处理: ${id} (${suggestion.status})`);
  }

  // 从 pending 中移除
  pending.splice(index, 1);

  // 更新状态并添加到 approved
  suggestion.status = 'approved';
  suggestion.reviewedAt = new Date().toISOString();
  approved.push(suggestion);

  // 保存两个文件
  await savePendingSuggestions(pending);
  await saveApprovedSuggestions(approved);

  return suggestion;
}

/**
 * 重新生成学习内容 (BUG-3)
 */
async function regenerateLearnedContent(): Promise<void> {
  const approved = await loadApprovedSuggestions();

  // 按类型分组
  const preferences = approved
    .filter((s) => s.type === 'preference')
    .map((s) => s.item as Preference);

  const patterns = approved
    .filter((s) => s.type === 'pattern')
    .map((s) => s.item as Pattern);

  const workflows = approved
    .filter((s) => s.type === 'workflow')
    .map((s) => s.item as Workflow);

  // 重新生成 learned/ 文件（包含所有已批准内容）
  await writeLearnedContent(preferences, patterns, workflows);

  // 重新生成 CLAUDE.md
  const config = await loadConfig();
  await generateCLAUDEmd(config);
}
