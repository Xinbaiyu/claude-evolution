/**
 * 分析流程编排
 * 整合所有模块,实现完整的分析-学习-生成流程
 */

import { loadConfig } from '../config/index.js';
import { createHTTPClient } from '../memory/http-client.js';
import {
  getLastAnalysisTime,
  updateAfterAnalysis,
  getCurrentPhase,
} from '../scheduler/index.js';
import {
  collectRecentSessions,
  extractExperience,
  getObservationStats,
} from '../analyzers/index.js';
import {
  learnPreferences,
} from '../learners/index.js';
import { generateCLAUDEmd, writeLearnedContent } from '../generators/index.js';
import { executeLearningCycle } from '../memory/learning-orchestrator.js';
import { logger } from '../utils/index.js';
import type { ObservationWithMetadata } from '../types/learning.js';
import type { ExtractionResult } from '../types/index.js';

/**
 * Convert ExtractionResult to ObservationWithMetadata array
 */
function convertToObservations(extracted: ExtractionResult): ObservationWithMetadata[] {
  const now = new Date().toISOString();
  const sessionId = `session-${Date.now()}`;
  const observations: ObservationWithMetadata[] = [];

  // Convert preferences
  for (const pref of extracted.preferences) {
    observations.push({
      id: `pref-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      sessionId,
      timestamp: now,
      type: 'preference',
      confidence: pref.confidence,
      evidence: pref.evidence || [],
      item: pref,
      mentions: pref.frequency || 1,
      lastSeen: now,
      firstSeen: now,
      originalConfidence: pref.confidence,
      inContext: false,
    });
  }

  // Convert patterns
  for (const pattern of extracted.patterns) {
    observations.push({
      id: `pattern-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      sessionId,
      timestamp: now,
      type: 'pattern',
      confidence: pattern.confidence,
      evidence: pattern.evidence || [],
      item: pattern,
      mentions: pattern.occurrences || 1,
      lastSeen: now,
      firstSeen: now,
      originalConfidence: pattern.confidence,
      inContext: false,
    });
  }

  // Convert workflows
  for (const workflow of extracted.workflows) {
    observations.push({
      id: `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      sessionId,
      timestamp: now,
      type: 'workflow',
      confidence: workflow.confidence,
      evidence: workflow.evidence || [],
      item: workflow,
      mentions: workflow.frequency || 1,
      lastSeen: now,
      firstSeen: now,
      originalConfidence: workflow.confidence,
      inContext: false,
    });
  }

  return observations;
}

/**
 * 运行完整的分析流程
 */
export async function runAnalysisPipeline(): Promise<void> {
  logger.info('========================================');
  logger.info('开始分析流程');
  logger.info('========================================');

  const startTime = Date.now();

  try {
    // 1. 加载配置
    logger.info('\n[1/8] 加载配置');
    const config = await loadConfig();
    const currentPhase = await getCurrentPhase(config);
    const lastAnalysisTime = await getLastAnalysisTime();

    logger.info(`  当前学习阶段: ${currentPhase}`);
    logger.info(`  上次分析时间: ${lastAnalysisTime?.toLocaleString() || '从未'}`);

    // 2. 连接 HTTP API
    logger.info('\n[2/8] 连接 claude-mem HTTP API');
    const httpClient = await createHTTPClient();

    try {
      // 3. 采集会话数据
      logger.info('\n[3/8] 采集会话数据');
      const observations = await collectRecentSessions(
        httpClient,
        lastAnalysisTime,
        config
      );

      if (observations.length === 0) {
        logger.warn('没有新的会话数据需要分析');
        await updateAfterAnalysis(true);
        return;
      }

      const stats = getObservationStats(observations);
      logger.info(`  总计: ${stats.total} 条记录`);
      logger.info(`  类型分布:`);
      for (const [type, count] of stats.byType) {
        logger.info(`    ${type}: ${count} 条`);
      }

      // 4. 提取经验
      logger.info('\n[4/8] 提取经验和模式');
      const extracted = await extractExperience(observations, config);

      logger.info(
        `  偏好: ${extracted.preferences.length} 项, ` +
          `模式: ${extracted.patterns.length} 项, ` +
          `工作流: ${extracted.workflows.length} 项`
      );

      // 5. 增量学习循环 (NEW!)
      logger.info('\n[5/8] 执行增量学习循环');
      const newObservations = convertToObservations(extracted);

      if (config.learning?.enabled) {
        const cycleStats = await executeLearningCycle(config, newObservations);
        logger.info('  学习循环统计:');
        logger.info(`    合并后: ${cycleStats.merged} 条`);
        logger.info(`    晋升: ${cycleStats.promoted} 条`);
        logger.info(`    删除: ${cycleStats.deleted} 条`);
        logger.info(`    归档: ${cycleStats.archived} 条`);
        logger.info(`    活跃池: ${cycleStats.finalActiveCount} 条`);
        logger.info(`    上下文: ${cycleStats.finalContextCount} 条`);
      } else {
        logger.warn('  增量学习已禁用，跳过学习循环');
      }

      // 旧的建议系统逻辑已移除，所有学习由executeLearningCycle处理

      // 8. 生成配置文件
      logger.info('\n[8/8] 生成 CLAUDE.md');
      await generateCLAUDEmd(config);

      // 更新状态
      await updateAfterAnalysis(true);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.success(`\n✅ 分析流程完成 (耗时 ${duration}s)`);
    } finally {
      // 确保断开 HTTP 连接
      await httpClient.disconnect();
    }
  } catch (error) {
    logger.error('\n❌ 分析流程失败:', error);
    await updateAfterAnalysis(false);
    throw error;
  }
}
