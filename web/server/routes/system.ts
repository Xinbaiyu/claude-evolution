import { Router, Request } from 'express';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import type { WebSocketManager } from '../websocket.js';
import type { NotificationManager } from '../notifications.js';
import { ProcessManager } from '../../../src/daemon/process-manager.js';

interface RequestWithManagers extends Request {
  wsManager?: WebSocketManager;
  notificationManager?: NotificationManager;
}

const router = Router();

const CONFIG_DIR = path.join(os.homedir(), '.claude-evolution');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const SUGGESTIONS_DIR = path.join(CONFIG_DIR, 'suggestions');

// GET /api/daemon/status - 获取守护进程状态 (新增)
router.get('/daemon/status', async (req, res) => {
  try {
    const processManager = new ProcessManager();
    const isRunning = await processManager.isDaemonRunning();

    if (!isRunning) {
      return res.json({
        success: true,
        data: {
          running: false,
          message: 'Daemon is not running',
        },
      });
    }

    const pidInfo = await processManager.readPidFile();

    if (!pidInfo) {
      return res.json({
        success: true,
        data: {
          running: false,
          message: 'PID file not found',
        },
      });
    }

    // 计算运行时长
    const startTime = new Date(pidInfo.startTime);
    const now = new Date();
    const uptimeMs = now.getTime() - startTime.getTime();

    // 读取配置获取调度器信息
    const config = await fs.pathExists(CONFIG_FILE)
      ? await fs.readJson(CONFIG_FILE)
      : {};

    // 读取上次分析时间
    const statusPath = path.join(CONFIG_DIR, 'status.json');
    let lastAnalysis = null;
    let nextAnalysis = null;

    if (await fs.pathExists(statusPath)) {
      try {
        const status = await fs.readJson(statusPath);
        if (status.lastAnalysis) {
          lastAnalysis = status.lastAnalysis;

          // 简单估算下次执行时间
          const intervalHours = parseInt(config.scheduler?.interval || '6') || 6;
          const lastTime = new Date(lastAnalysis).getTime();
          nextAnalysis = new Date(lastTime + intervalHours * 60 * 60 * 1000).toISOString();
        }
      } catch (error) {
        // 忽略错误
      }
    }

    res.json({
      success: true,
      data: {
        running: true,
        daemon: {
          pid: pidInfo.pid,
          startTime: pidInfo.startTime,
          uptimeMs,
          version: pidInfo.version,
        },
        webUI: {
          enabled: true,
          port: pidInfo.port,
          url: `http://localhost:${pidInfo.port}`,
        },
        scheduler: {
          enabled: config.scheduler?.enabled !== false,
          interval: config.scheduler?.interval || '6h',
          lastAnalysis,
          nextAnalysis,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/status - 获取系统状态
router.get('/status', async (req: RequestWithManagers, res) => {
  try {
    // 读取配置文件
    const config = await fs.pathExists(CONFIG_FILE)
      ? await fs.readJson(CONFIG_FILE)
      : {};

    // 读取建议统计
    const pendingPath = path.join(SUGGESTIONS_DIR, 'pending.json');
    const approvedPath = path.join(SUGGESTIONS_DIR, 'approved.json');
    const rejectedPath = path.join(SUGGESTIONS_DIR, 'rejected.json');

    const pending = await fs.pathExists(pendingPath)
      ? await fs.readJson(pendingPath)
      : [];
    const approved = await fs.pathExists(approvedPath)
      ? await fs.readJson(approvedPath)
      : [];
    const rejected = await fs.pathExists(rejectedPath)
      ? await fs.readJson(rejectedPath)
      : [];

    // 计算平均置信度
    const allSuggestions = [...pending, ...approved];
    const avgConfidence =
      allSuggestions.length > 0
        ? allSuggestions.reduce((sum, s) => sum + (s.item?.confidence || 0), 0) /
          allSuggestions.length
        : 0;

    // 获取最后分析时间（从 pending 建议的创建时间推断）
    const lastAnalysis =
      pending.length > 0
        ? pending
            .map((s: any) => new Date(s.createdAt).getTime())
            .sort((a: number, b: number) => b - a)[0]
        : null;

    res.json({
      success: true,
      data: {
        scheduler: {
          enabled: config.scheduler?.enabled || false,
          interval: config.scheduler?.interval || '1h',
          lastRun: lastAnalysis ? new Date(lastAnalysis).toISOString() : null,
        },
        suggestions: {
          pending: pending.length,
          approved: approved.length,
          rejected: rejected.length,
          total: pending.length + approved.length + rejected.length,
        },
        metrics: {
          avgConfidence: Math.round(avgConfidence * 100) / 100,
        },
        server: {
          uptime: process.uptime(),
          version: process.env.npm_package_version || '0.1.0',
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/config - 读取配置
router.get('/config', async (req, res) => {
  try {
    const config = await fs.pathExists(CONFIG_FILE)
      ? await fs.readJson(CONFIG_FILE)
      : {};

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PATCH /api/config - 更新配置
router.patch('/config', async (req, res) => {
  try {
    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid config data',
      });
    }

    // 读取现有配置
    const currentConfig = await fs.pathExists(CONFIG_FILE)
      ? await fs.readJson(CONFIG_FILE)
      : {};

    // 合并配置（深度合并）
    const newConfig = {
      ...currentConfig,
      ...updates,
      // 特殊处理嵌套对象
      scheduler: {
        ...currentConfig.scheduler,
        ...updates.scheduler,
      },
      llm: {
        ...currentConfig.llm,
        ...updates.llm,
      },
      learningPhases: {
        ...currentConfig.learningPhases,
        ...updates.learningPhases,
      },
    };

    // 写入配置文件
    await fs.ensureDir(CONFIG_DIR);
    await fs.writeJson(CONFIG_FILE, newConfig, { spaces: 2 });

    res.json({
      success: true,
      data: newConfig,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/analyze - 手动触发分析
router.post('/analyze', async (req: RequestWithManagers, res) => {
  try {
    // 模拟分析过程
    const startTime = Date.now();

    // 读取当前待处理建议数量
    const pendingPath = path.join(SUGGESTIONS_DIR, 'pending.json');
    const pending = await fs.pathExists(pendingPath)
      ? await fs.readJson(pendingPath)
      : [];

    const duration = Math.round((Date.now() - startTime) / 1000);

    // 发送 WebSocket 事件
    if (req.wsManager) {
      req.wsManager.emitAnalysisComplete({
        newSuggestions: pending.length,
        duration,
        timestamp: new Date().toISOString(),
      });
    }

    // 发送桌面通知
    if (req.notificationManager) {
      console.log('[DEBUG] Sending notification...');
      req.notificationManager.notifyAnalysisComplete({
        newSuggestions: pending.length,
        duration,
      });
    } else {
      console.log('[DEBUG] notificationManager not found in request');
    }

    res.json({
      success: true,
      data: {
        message: 'Analysis triggered successfully',
        newSuggestions: pending.length,
        duration,
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
