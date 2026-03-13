import { Router, Request } from 'express';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import type { WebSocketManager } from '../websocket.js';
import type { NotificationManager } from '../notifications.js';
import { approveSuggestion, rejectSuggestion, batchApproveSuggestions } from '../../../dist/learners/index.js';

// 扩展 Express Request 类型以包含 wsManager 和 notificationManager
interface RequestWithWS extends Request {
  wsManager?: WebSocketManager;
  notificationManager?: NotificationManager;
}

const router = Router();

// 获取配置目录路径
const CONFIG_DIR = path.join(os.homedir(), '.claude-evolution');
const SUGGESTIONS_DIR = path.join(CONFIG_DIR, 'suggestions');

// 加载建议文件
async function loadPendingSuggestions() {
  const pendingPath = path.join(SUGGESTIONS_DIR, 'pending.json');
  if (await fs.pathExists(pendingPath)) {
    return await fs.readJson(pendingPath);
  }
  return [];
}

// GET /api/suggestions - 获取建议列表
router.get('/suggestions', async (req, res) => {
  try {
    const { status } = req.query;
    const suggestions = await loadPendingSuggestions();

    let filtered = suggestions;
    if (status) {
      filtered = suggestions.filter((s) => s.status === status);
    }

    res.json({
      success: true,
      data: filtered,
      meta: {
        total: filtered.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/suggestions/:id - 获取单个建议详情
router.get('/suggestions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const suggestions = await loadPendingSuggestions();
    const suggestion = suggestions.find((s) => s.id === id || s.id.startsWith(id));

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        error: 'Suggestion not found',
      });
    }

    res.json({
      success: true,
      data: suggestion,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/suggestions/:id/approve - 批准建议
router.post('/suggestions/:id/approve', async (req: RequestWithWS, res) => {
  try {
    const { id } = req.params;

    // 调用 SuggestionManager（内部已处理 CLAUDE.md 更新）
    await approveSuggestion(id);

    // 触发 WebSocket 事件
    if (req.wsManager) {
      req.wsManager.emitSuggestionApproved({ id });
    }

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/suggestions/:id/reject - 拒绝建议
router.post('/suggestions/:id/reject', async (req: RequestWithWS, res) => {
  try {
    const { id } = req.params;

    // 调用 SuggestionManager
    await rejectSuggestion(id);

    // 触发 WebSocket 事件
    if (req.wsManager) {
      req.wsManager.emitSuggestionRejected({ id });
    }

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/suggestions/batch/approve - 批量批准 (BATCH-2)
router.post('/suggestions/batch/approve', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids must be a non-empty array',
      });
    }

    // 调用 SuggestionManager 批量批准
    const result = await batchApproveSuggestions(ids);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
        data: {
          approved: result.approved,
          failed: result.failed,
        },
      });
    }

    res.json({
      success: true,
      data: {
        approved: result.approved,
        count: result.approved.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
