import fs from 'fs-extra';
import path from 'path';
import { ExtractionResult, LearningResult, LearningPhase } from '../types/index.js';
import { Config } from '../config/index.js';
import { getEvolutionDir } from '../config/loader.js';
import { logger } from '../utils/index.js';

/**
 * 偏好学习器
 * 负责根据学习阶段决定如何处理提取的经验
 */

/**
 * 学习偏好并决定处理方式
 */
export async function learnPreferences(
  extractedData: ExtractionResult,
  currentPhase: LearningPhase,
  config: Config
): Promise<LearningResult> {
  logger.info(`当前学习阶段: ${currentPhase}`);

  const result: LearningResult = {
    toApply: [],
    toSuggest: [],
    conflicts: [],
  };

  // 处理偏好
  for (const pref of extractedData.preferences) {
    await processPreference(pref, currentPhase, config, result);
  }

  // 处理模式
  for (const pattern of extractedData.patterns) {
    await processPattern(pattern, currentPhase, config, result);
  }

  // 处理工作流程
  for (const workflow of extractedData.workflows) {
    await processWorkflow(workflow, currentPhase, config, result);
  }

  logger.success(
    `✓ 学习完成: ${result.toApply.length} 自动应用, ` +
      `${result.toSuggest.length} 待审批, ${result.conflicts.length} 冲突`
  );

  return result;
}

/**
 * 处理单个偏好
 */
async function processPreference(
  pref: ExtractionResult['preferences'][0],
  currentPhase: LearningPhase,
  config: Config,
  result: LearningResult
): Promise<void> {
  // 检查冲突
  const conflict = await detectPreferenceConflict(pref);
  if (conflict) {
    result.conflicts.push({
      item: pref,
      existing: conflict.content,
      reason: conflict.reason,
    });
    return;
  }

  // 根据阶段决定处理方式
  if (currentPhase === 'observation') {
    // 观察期: 全部记录但不应用
    result.toSuggest.push(pref);
  } else if (currentPhase === 'suggestion') {
    // 建议期: 全部需要用户确认
    result.toSuggest.push(pref);
  } else {
    // 自动期: 高置信度自动应用
    if (pref.confidence >= config.learningPhases.automatic.confidenceThreshold) {
      result.toApply.push(pref);
    } else {
      result.toSuggest.push(pref);
    }
  }
}

/**
 * 处理单个模式
 */
async function processPattern(
  pattern: ExtractionResult['patterns'][0],
  currentPhase: LearningPhase,
  config: Config,
  result: LearningResult
): Promise<void> {
  const conflict = await detectPatternConflict(pattern);
  if (conflict) {
    result.conflicts.push({
      item: pattern,
      existing: conflict.content,
      reason: conflict.reason,
    });
    return;
  }

  if (currentPhase === 'observation') {
    result.toSuggest.push(pattern);
  } else if (currentPhase === 'suggestion') {
    result.toSuggest.push(pattern);
  } else {
    if (pattern.confidence >= config.learningPhases.automatic.confidenceThreshold) {
      result.toApply.push(pattern);
    } else {
      result.toSuggest.push(pattern);
    }
  }
}

/**
 * 处理单个工作流程
 */
async function processWorkflow(
  workflow: ExtractionResult['workflows'][0],
  currentPhase: LearningPhase,
  config: Config,
  result: LearningResult
): Promise<void> {
  const conflict = await detectWorkflowConflict(workflow);
  if (conflict) {
    result.conflicts.push({
      item: workflow,
      existing: conflict.content,
      reason: conflict.reason,
    });
    return;
  }

  if (currentPhase === 'observation') {
    result.toSuggest.push(workflow);
  } else if (currentPhase === 'suggestion') {
    result.toSuggest.push(workflow);
  } else {
    if (workflow.confidence >= config.learningPhases.automatic.confidenceThreshold) {
      result.toApply.push(workflow);
    } else {
      result.toSuggest.push(workflow);
    }
  }
}

/**
 * 检测偏好冲突
 */
async function detectPreferenceConflict(
  pref: ExtractionResult['preferences'][0]
): Promise<{ content: string; reason: string } | null> {
  const evolutionDir = getEvolutionDir();
  const sourceDir = path.join(evolutionDir, 'source');

  // 读取所有 source 文件
  const sourceFiles = await fs.readdir(sourceDir);
  for (const file of sourceFiles) {
    if (!file.endsWith('.md')) continue;

    const filePath = path.join(sourceDir, file);
    const content = await fs.readFile(filePath, 'utf-8');

    // 简单的关键词冲突检测
    const keywords = extractKeywords(pref.description);
    for (const keyword of keywords) {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        // 检查是否是相反的描述
        if (isConflicting(pref.description, content)) {
          return {
            content: `${file}: 包含关键词 "${keyword}"`,
            reason: '可能存在冲突的配置',
          };
        }
      }
    }
  }

  return null;
}

/**
 * 检测模式冲突
 */
async function detectPatternConflict(
  pattern: ExtractionResult['patterns'][0]
): Promise<{ content: string; reason: string } | null> {
  // 检查 learned/solutions.md 是否已有相同的问题解决方案
  const evolutionDir = getEvolutionDir();
  const learnedFile = path.join(evolutionDir, 'learned/solutions.md');

  if (await fs.pathExists(learnedFile)) {
    const content = await fs.readFile(learnedFile, 'utf-8');
    if (content.includes(pattern.problem)) {
      return {
        content: 'solutions.md: 已存在类似问题的解决方案',
        reason: '重复的问题模式',
      };
    }
  }

  return null;
}

/**
 * 检测工作流程冲突
 */
async function detectWorkflowConflict(
  workflow: ExtractionResult['workflows'][0]
): Promise<{ content: string; reason: string } | null> {
  const evolutionDir = getEvolutionDir();
  const learnedFile = path.join(evolutionDir, 'learned/workflows.md');

  if (await fs.pathExists(learnedFile)) {
    const content = await fs.readFile(learnedFile, 'utf-8');
    if (content.includes(workflow.name)) {
      return {
        content: 'workflows.md: 已存在同名工作流程',
        reason: '重复的工作流程',
      };
    }
  }

  return null;
}

/**
 * 从描述中提取关键词
 */
function extractKeywords(description: string): string[] {
  // 简单的关键词提取 (可以改进)
  const words = description
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  return words;
}

/**
 * 检查两段文本是否冲突
 */
function isConflicting(newText: string, existingText: string): boolean {
  // 简单的冲突检测: 查找否定词
  const negationWords = ['不', '禁止', '避免', 'never', 'avoid', 'not'];

  const newHasNegation = negationWords.some((word) =>
    newText.toLowerCase().includes(word)
  );
  const existingHasNegation = negationWords.some((word) =>
    existingText.toLowerCase().includes(word)
  );

  // 如果一个有否定一个没有,可能是冲突
  return newHasNegation !== existingHasNegation;
}
