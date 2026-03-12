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
  addSuggestionsBatch,
  getItemType,
} from '../learners/index.js';
import { generateCLAUDEmd, writeLearnedContent } from '../generators/index.js';
import { logger } from '../utils/index.js';

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
    logger.info('\n[1/7] 加载配置');
    const config = await loadConfig();
    const currentPhase = await getCurrentPhase(config);
    const lastAnalysisTime = await getLastAnalysisTime();

    logger.info(`  当前学习阶段: ${currentPhase}`);
    logger.info(`  上次分析时间: ${lastAnalysisTime?.toLocaleString() || '从未'}`);

    // 2. 连接 HTTP API
    logger.info('\n[2/7] 连接 claude-mem HTTP API');
    const httpClient = await createHTTPClient();

    try {
      // 3. 采集会话数据
      logger.info('\n[3/7] 采集会话数据');
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
      logger.info('\n[4/7] 提取经验和模式');
      const extracted = await extractExperience(observations, config);

      logger.info(
        `  偏好: ${extracted.preferences.length} 项, ` +
          `模式: ${extracted.patterns.length} 项, ` +
          `工作流: ${extracted.workflows.length} 项`
      );

      // 5. 学习和决策
      logger.info('\n[5/7] 学习偏好并决策');
      const learningResult = await learnPreferences(extracted, currentPhase, config);

      logger.info(`  自动应用: ${learningResult.toApply.length} 项`);
      logger.info(`  待审批: ${learningResult.toSuggest.length} 项`);
      logger.info(`  冲突: ${learningResult.conflicts.length} 项`);

      // 6. 应用学习结果
      logger.info('\n[6/7] 应用学习结果');

      // 自动应用的项目
      if (learningResult.toApply.length > 0) {
        const preferences = learningResult.toApply.filter(
          (item) => getItemType(item as any) === 'preference'
        );
        const patterns = learningResult.toApply.filter(
          (item) => getItemType(item as any) === 'pattern'
        );
        const workflows = learningResult.toApply.filter(
          (item) => getItemType(item as any) === 'workflow'
        );

        await writeLearnedContent(preferences, patterns, workflows);
        logger.success(`  ✓ 已自动应用 ${learningResult.toApply.length} 项`);
      }

      // 需要审批的项目
      if (learningResult.toSuggest.length > 0) {
        const ids = await addSuggestionsBatch(
          learningResult.toSuggest as any[],
          getItemType
        );
        logger.success(`  ✓ 已添加 ${ids.length} 条待审批建议`);
        logger.info(`  运行 'claude-evolution review' 查看建议`);
      }

      // 冲突项目
      if (learningResult.conflicts.length > 0) {
        logger.warn(`  ⚠ 发现 ${learningResult.conflicts.length} 项冲突:`);
        for (const conflict of learningResult.conflicts) {
          logger.warn(`    - ${conflict.reason}`);
        }
      }

      // 7. 生成配置文件
      logger.info('\n[7/7] 生成 CLAUDE.md');
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
