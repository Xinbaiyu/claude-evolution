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

// ====== Phase 2.5.2: 事务回滚机制 ======

/**
 * 快照接口
 */
interface Snapshot {
  timestamp: string;
  pendingBackup: string;
  approvedBackup: string;
}

/**
 * 创建快照 (TX-1)
 */
async function createSnapshot(): Promise<Snapshot> {
  const evolutionDir = getEvolutionDir();
  const timestamp = new Date().toISOString().replace(/:/g, '-');

  const snapshotDir = path.join(evolutionDir, 'snapshots', timestamp);
  await fs.ensureDir(snapshotDir);

  const pendingPath = getSuggestionsPath();
  const approvedPath = getApprovedSuggestionsPath();

  const pendingBackup = path.join(snapshotDir, 'pending.json');
  const approvedBackup = path.join(snapshotDir, 'approved.json');

  // 复制文件到快照目录
  if (await fs.pathExists(pendingPath)) {
    await fs.copy(pendingPath, pendingBackup);
  }

  if (await fs.pathExists(approvedPath)) {
    await fs.copy(approvedPath, approvedBackup);
  }

  logger.debug(`✓ 创建快照: ${snapshotDir}`);

  return {
    timestamp,
    pendingBackup,
    approvedBackup,
  };
}

/**
 * 从快照回滚 (TX-2)
 */
async function rollbackFromSnapshot(snapshot: Snapshot): Promise<void> {
  logger.warn('⚠️ 检测到错误，正在回滚更改...');

  const pendingPath = getSuggestionsPath();
  const approvedPath = getApprovedSuggestionsPath();

  // 恢复备份文件
  if (await fs.pathExists(snapshot.pendingBackup)) {
    await fs.copy(snapshot.pendingBackup, pendingPath);
  }

  if (await fs.pathExists(snapshot.approvedBackup)) {
    await fs.copy(snapshot.approvedBackup, approvedPath);
  }

  logger.success('✓ 已回滚到批准前的状态');
}

/**
 * 清理快照 (TX-3)
 */
async function cleanupSnapshot(snapshot: Snapshot): Promise<void> {
  const snapshotDir = path.dirname(snapshot.pendingBackup);

  try {
    await fs.remove(snapshotDir);
    logger.debug(`✓ 清理快照: ${snapshotDir}`);
  } catch (error) {
    // 清理失败不影响主流程
    logger.debug(`清理快照失败: ${snapshotDir}`);
  }

  // 清理旧快照（保留最近 3 个）
  await cleanupOldSnapshots();
}

/**
 * 清理旧快照（保留最近 3 个）
 */
async function cleanupOldSnapshots(): Promise<void> {
  const evolutionDir = getEvolutionDir();
  const snapshotsDir = path.join(evolutionDir, 'snapshots');

  if (!(await fs.pathExists(snapshotsDir))) {
    return;
  }

  const snapshots = await fs.readdir(snapshotsDir);
  const sortedSnapshots = snapshots.sort().reverse(); // 最新的在前

  // 删除第 4 个之后的快照
  for (let i = 3; i < sortedSnapshots.length; i++) {
    const oldSnapshot = path.join(snapshotsDir, sortedSnapshots[i]);
    try {
      await fs.remove(oldSnapshot);
      logger.debug(`✓ 清理旧快照: ${sortedSnapshots[i]}`);
    } catch (error) {
      // 忽略清理错误
    }
  }
}

// ====== Phase 2.5.3: 批量批准实现 ======

/**
 * 批量批准结果接口
 */
export interface BatchApprovalResult {
  success: boolean;
  approved: string[];
  failed: string[];
  error?: string;
}

/**
 * 批量批准建议 (BATCH-1)
 */
export async function batchApproveSuggestions(
  ids: string[]
): Promise<BatchApprovalResult> {
  // 1. 创建快照
  const snapshot = await createSnapshot();

  const approved: string[] = [];
  const failed: string[] = [];
  let failedId: string | null = null;
  let errorMessage: string | null = null;

  try {
    // 2. 逐个批准（不立即生成 CLAUDE.md）
    for (const id of ids) {
      try {
        await moveSuggestionToApproved(id);
        approved.push(id);
      } catch (error) {
        // 遇到错误立即回滚
        failedId = id;
        errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await rollbackFromSnapshot(snapshot);

        return {
          success: false,
          approved: [],
          failed: [id],
          error: errorMessage,
        };
      }
    }

    // 3. 所有批准成功后，才生成 CLAUDE.md
    await regenerateLearnedContent();

    // 4. 清理快照
    await cleanupSnapshot(snapshot);

    logger.success(`✓ 批量批准完成: ${approved.length} 条建议`);

    return {
      success: true,
      approved,
      failed: [],
    };
  } catch (error) {
    // 发生意外错误，回滚所有更改
    errorMessage = error instanceof Error ? error.message : 'Batch approval failed';

    await rollbackFromSnapshot(snapshot);

    return {
      success: false,
      approved: [],
      failed: ids,
      error: errorMessage,
    };
  }
}
