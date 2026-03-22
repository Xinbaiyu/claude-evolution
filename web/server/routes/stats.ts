import express from 'express';
import { AnalysisLogger } from '../../../src/analyzers/analysis-logger.js';
import {
  loadActiveObservations,
  loadContextObservations,
  loadArchivedObservations,
} from '../../../src/memory/observation-manager.js';

const router = express.Router();
const analysisLogger = new AnalysisLogger();

const TREND_DAYS = 30;

/**
 * GET /api/stats/overview
 * 返回看板图表所需的聚合统计数据
 */
router.get('/stats/overview', async (_req, res) => {
  try {
    // 1. 观察类型分布：从 active + context JSON 文件聚合
    const [active, context] = await Promise.all([
      loadActiveObservations(),
      loadContextObservations(),
    ]);

    const allObservations = [...active, ...context];
    const typeCounts = new Map<string, number>();
    for (const obs of allObservations) {
      const t = obs.type || 'unknown';
      typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
    }
    const typeDistribution = Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // 2. 分析趋势：从 SQLite analysis_runs 表按日期聚合近 N 天
    const runs = await analysisLogger.getAllRuns({ limit: 500, offset: 0 });

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - TREND_DAYS);
    const cutoffStr = cutoff.toISOString();

    const dailyMap = new Map<string, { runCount: number; mergedCount: number }>();
    for (const run of runs) {
      if (run.startTime < cutoffStr) continue;
      const date = run.startTime.slice(0, 10); // YYYY-MM-DD
      const entry = dailyMap.get(date) || { runCount: 0, mergedCount: 0 };
      entry.runCount += 1;
      entry.mergedCount += run.stats?.merged || 0;
      dailyMap.set(date, entry);
    }

    const analysisTrend = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        typeDistribution,
        analysisTrend,
        trendDays: TREND_DAYS,
      },
    });
  } catch (error: any) {
    console.error('Failed to get stats overview:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve stats overview',
    });
  }
});

export default router;
