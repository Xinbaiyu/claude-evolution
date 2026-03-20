import express from 'express';
import { AnalysisLogger } from '../../../src/analyzers/analysis-logger.js';

const router = express.Router();
const analysisLogger = new AnalysisLogger();

/**
 * GET /api/analysis-logs
 * 获取分析日志列表
 * Query params:
 *   - limit: 每页数量 (default: 50)
 *   - offset: 偏移量 (default: 0)
 */
router.get('/analysis-logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const runs = await analysisLogger.getAllRuns({ limit, offset });

    res.json({
      success: true,
      data: runs,
      meta: {
        limit,
        offset,
        total: runs.length,
      },
    });
  } catch (error: any) {
    console.error('Failed to get analysis logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve analysis logs',
    });
  }
});

/**
 * GET /api/analysis-logs/:runId
 * 获取单条分析记录详情
 */
router.get('/analysis-logs/:runId', async (req, res) => {
  try {
    const { runId } = req.params;
    const run = await analysisLogger.getRunById(runId);

    if (!run) {
      return res.status(404).json({
        success: false,
        error: 'Analysis run not found',
      });
    }

    res.json({
      success: true,
      data: run,
    });
  } catch (error: any) {
    console.error('Failed to get analysis run:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve analysis run',
    });
  }
});

export default router;
