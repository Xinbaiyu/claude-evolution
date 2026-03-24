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
  collectRecentPrompts,
  extractExperience,
  getObservationStats,
  formatPromptsAsText,
} from '../analyzers/index.js';
import { regenerateClaudeMdFromDisk } from '../memory/claudemd-generator.js';
import { executeLearningCycle } from '../memory/learning-orchestrator.js';
import { logger } from '../utils/index.js';
import type { ObservationWithMetadata } from '../types/learning.js';
import type { ExtractionResult } from '../types/index.js';
import { AnalysisLogger } from './analysis-logger.js';

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
export async function runAnalysisPipeline(options?: {
  runId?: string;
  analysisLogger?: AnalysisLogger;
}): Promise<void> {
  logger.info('========================================');
  logger.info('开始分析流程');
  logger.info('========================================');

  const startTime = Date.now();
  const { runId, analysisLogger } = options || {};

  // 辅助函数：记录步骤
  const logStep = async (
    step: number,
    name: string,
    status: 'success' | 'failed' | 'skipped',
    output?: string,
    error?: string
  ) => {
    if (runId && analysisLogger) {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      await analysisLogger.logStep(runId, {
        step,
        name,
        status,
        duration,
        output,
        error,
      });
    }
  };

  try {
    // 1. 加载配置
    logger.info('\n[1/8] 加载配置');
    const config = await loadConfig();
    const currentPhase = await getCurrentPhase(config);
    const lastAnalysisTime = await getLastAnalysisTime();

    logger.info(`  当前学习阶段: ${currentPhase}`);
    logger.info(`  上次分析时间: ${lastAnalysisTime?.toLocaleString() || '从未'}`);
    await logStep(1, '加载配置', 'success', `学习阶段: ${currentPhase}`);

    // 2. 连接 HTTP API
    logger.info('\n[2/8] 连接 claude-mem HTTP API');
    const httpClient = await createHTTPClient();
    await logStep(2, '连接 HTTP API', 'success', 'API 连接成功');

    try {
      // 3. 采集会话数据
      logger.info('\n[3/8] 采集会话数据');
      const observations = await collectRecentSessions(
        httpClient,
        lastAnalysisTime,
        config
      );

      if (observations.length > 0) {
        const stats = getObservationStats(observations);
        logger.info(`  总计: ${stats.total} 条记录`);
        logger.info(`  类型分布:`);
        for (const [type, count] of stats.byType) {
          logger.info(`    ${type}: ${count} 条`);
        }
        await logStep(3, '采集会话数据', 'success', `找到 ${stats.total} 条观察`);
      } else {
        logger.info('  Observations 为空（可能已关闭提取）');
        await logStep(3, '采集会话数据', 'success', 'Observations 为空');
      }

      // 3.5. 采集用户 prompts (用于沟通偏好提取)
      logger.info('\n[3.5/8] 采集用户 prompts');
      const prompts = await collectRecentPrompts(
        httpClient,
        lastAnalysisTime,
        config
      );

      logger.info(`  采集到 ${prompts.length} 条用户 prompts`);
      await logStep(4, '采集用户 prompts', 'success', `采集到 ${prompts.length} 条 prompts`);

      // 如果 observations 和 prompts 都为空，无需继续
      if (observations.length === 0 && prompts.length === 0) {
        logger.warn('没有新数据需要分析');
        await updateAfterAnalysis(true);
        return;
      }

      // 4. 提取经验
      logger.info('\n[4/8] 提取经验和模式');

      // 将 prompts 格式化为文本,作为额外上下文传给 LLM
      const promptsContext = prompts.length > 0
        ? formatPromptsAsText(prompts)
        : null;

      const extracted = await extractExperience(observations, config, promptsContext);

      logger.info(
        `  偏好: ${extracted.preferences.length} 项, ` +
          `模式: ${extracted.patterns.length} 项, ` +
          `工作流: ${extracted.workflows.length} 项`
      );
      await logStep(
        5,
        '提取经验和模式',
        'success',
        `偏好: ${extracted.preferences.length}, 模式: ${extracted.patterns.length}, 工作流: ${extracted.workflows.length}`
      );

      // 5. 增量学习循环 (NEW!)
      logger.info('\n[5/8] 执行增量学习循环');
      const newObservations = convertToObservations(extracted);

      let cycleStats = {
        merged: 0,
        promoted: 0,
        deleted: 0,
        archived: 0,
        finalActiveCount: 0,
        finalContextCount: 0,
      };

      if (config.learning?.enabled) {
        cycleStats = await executeLearningCycle(config, newObservations);
        logger.info('  学习循环统计:');
        logger.info(`    合并后: ${cycleStats.merged} 条`);
        logger.info(`    晋升: ${cycleStats.promoted} 条`);
        logger.info(`    删除: ${cycleStats.deleted} 条`);
        logger.info(`    归档: ${cycleStats.archived} 条`);
        logger.info(`    活跃池: ${cycleStats.finalActiveCount} 条`);
        logger.info(`    上下文: ${cycleStats.finalContextCount} 条`);
        await logStep(
          6,
          '执行增量学习循环',
          'success',
          `合并: ${cycleStats.merged}, 晋升: ${cycleStats.promoted}, 归档: ${cycleStats.archived}`
        );
      } else {
        logger.warn('  增量学习已禁用，跳过学习循环');
        await logStep(6, '执行增量学习循环', 'skipped', '增量学习已禁用');
      }

      // 旧的建议系统逻辑已移除，所有学习由executeLearningCycle处理

      // 8. 生成配置文件 (fallback: 如果 daemon 的 watcher 未运行则主动生成)
      logger.info('\n[8/8] 更新 CLAUDE.md');
      await regenerateClaudeMdFromDisk();
      await logStep(7, '生成 CLAUDE.md', 'success', 'CLAUDE.md 已更新');

      // 更新状态
      await updateAfterAnalysis(true);
      await logStep(8, '更新状态', 'success', '分析状态已更新');

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.success(`\n✅ 分析流程完成 (耗时 ${duration}s)`);

      // 更新 daemon-process 中的统计信息
      if (runId && analysisLogger) {
        await analysisLogger.logAnalysisEnd(runId, {
          status: 'success',
          stats: {
            merged: cycleStats.merged,
            promoted: cycleStats.promoted,
            archived: cycleStats.archived,
          },
        });
      }
    } finally {
      // 确保断开 HTTP 连接
      await httpClient.disconnect();
    }
  } catch (error) {
    logger.error('\n❌ 分析流程失败:', error);

    // 记录失败的步骤
    if (runId && analysisLogger) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 尝试确定失败的步骤
      let failedStep = 1;
      let failedStepName = '未知步骤';

      if (errorMessage.includes('HTTP') || errorMessage.includes('连接')) {
        failedStep = 2;
        failedStepName = '连接 HTTP API';
      } else if (errorMessage.includes('采集') || errorMessage.includes('session')) {
        failedStep = 3;
        failedStepName = '采集会话数据';
      } else if (errorMessage.includes('提取') || errorMessage.includes('经验')) {
        failedStep = 5;
        failedStepName = '提取经验和模式';
      } else if (errorMessage.includes('学习') || errorMessage.includes('循环')) {
        failedStep = 6;
        failedStepName = '执行增量学习循环';
      }

      await analysisLogger.logStep(runId, {
        step: failedStep,
        name: failedStepName,
        status: 'failed',
        error: errorMessage,
      });
    }

    await updateAfterAnalysis(false);
    throw error;
  }
}
