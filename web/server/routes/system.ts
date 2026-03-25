import { Router, Request } from 'express';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import type { WebSocketManager } from '../websocket.js';
import type { NotificationManager } from '../notifications.js';
import { ProcessManager } from '../../../src/daemon/process-manager.js';
import { getEvolutionDir } from '../../../src/config/loader.js';
import {
  AnalysisExecutor,
  AnalysisAlreadyRunningError,
} from '../../../src/analyzers/analysis-executor.js';
import { CronScheduler } from '../../../src/scheduler/cron-scheduler.js';
import { triggerSchedulerConfigChanged } from '../index.js';

interface RequestWithManagers extends Request {
  wsManager?: WebSocketManager;
  notificationManager?: NotificationManager;
}

const router = Router();

const CONFIG_DIR = path.join(os.homedir(), '.claude-evolution');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// ---------------------------------------------------------------------------
// AnalysisExecutor — 由外部 (lifecycle / web index) 注入
// ---------------------------------------------------------------------------
let sharedExecutor: AnalysisExecutor | null = null;

/** 注入共享 executor 实例（由 lifecycle startComponents 调用） */
export function setExecutor(executor: AnalysisExecutor): void {
  sharedExecutor = executor;
}

/** 获取当前 executor（POST /api/analyze 等路由使用） */
function getExecutor(): AnalysisExecutor {
  if (!sharedExecutor) {
    throw new Error('AnalysisExecutor not initialized — call setExecutor() first');
  }
  return sharedExecutor;
}

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

          const schedulerInterval = config.scheduler?.interval || '6h';

          if (schedulerInterval === 'timepoints' && config.scheduler?.scheduleTimes?.length > 0) {
            // 定时模式：找下一个最近的时间点
            nextAnalysis = CronScheduler.getNextTimepointExecution(config.scheduler.scheduleTimes);
          } else {
            // 间隔模式：简单估算下次执行时间
            const intervalHours = parseInt(schedulerInterval) || 6;
            const lastTime = new Date(lastAnalysis).getTime();
            nextAnalysis = new Date(lastTime + intervalHours * 60 * 60 * 1000).toISOString();
          }
        }
      } catch (error) {
        // 忽略错误
      }
    }

    const schedulerMode = config.scheduler?.interval === 'timepoints' ? 'timepoints' : 'interval';

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
          mode: schedulerMode,
          scheduleTimes: config.scheduler?.scheduleTimes || [],
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

    // 读取观察池统计（新系统）
    const MEMORY_DIR = path.join(getEvolutionDir(), 'memory', 'observations');
    const activePath = path.join(MEMORY_DIR, 'active.json');
    const contextPath = path.join(MEMORY_DIR, 'context.json');

    const activeObs = await fs.pathExists(activePath)
      ? await fs.readJson(activePath)
      : [];
    const contextObs = await fs.pathExists(contextPath)
      ? await fs.readJson(contextPath)
      : [];

    // 计算平均置信度
    const allItems = [...activeObs, ...contextObs];

    const avgConfidence =
      allItems.length > 0
        ? allItems.reduce((sum, item) => sum + (item.confidence || item.item?.confidence || 0), 0) /
          allItems.length
        : 0;

    // 获取最后分析时间
    const lastAnalysis =
      activeObs.length > 0
        ? activeObs
            .map((obs: any) => new Date(obs.timestamp || obs.createdAt).getTime())
            .sort((a: number, b: number) => b - a)[0]
        : null;

    res.json({
      success: true,
      data: {
        scheduler: {
          enabled: config.scheduler?.enabled || false,
          interval: config.scheduler?.interval || '6h',
          scheduleTimes: config.scheduler?.scheduleTimes || [],
          lastRun: lastAnalysis ? new Date(lastAnalysis).toISOString() : null,
        },
        observations: {
          active: activeObs.length,
          context: contextObs.length,
          total: activeObs.length + contextObs.length,
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
      reminders: {
        ...currentConfig.reminders,
        ...updates.reminders,
        channels: {
          ...currentConfig.reminders?.channels,
          ...updates.reminders?.channels,
          webhook: updates.reminders?.channels?.webhook !== undefined
            ? updates.reminders.channels.webhook
            : currentConfig.reminders?.channels?.webhook,
        },
      },
      bot: updates.bot !== undefined
        ? {
            ...currentConfig.bot,
            ...updates.bot,
            dingtalk: {
              ...currentConfig.bot?.dingtalk,
              ...updates.bot?.dingtalk,
            },
            chat: {
              ...currentConfig.bot?.chat,
              ...updates.bot?.chat,
            },
          }
        : currentConfig.bot,
    };

    // 写入配置文件
    await fs.ensureDir(CONFIG_DIR);
    await fs.writeJson(CONFIG_FILE, newConfig, { spaces: 2 });

    // 检测调度器配置变更并触发热重载
    const schedulerChanged = updates.scheduler !== undefined;
    if (schedulerChanged) {
      triggerSchedulerConfigChanged();
    }

    // 广播配置变更事件
    const typedReq = req as RequestWithManagers;
    const changedKeys = Object.keys(updates);
    if (typedReq.wsManager) {
      typedReq.wsManager.emitConfigChanged({ changedKeys, schedulerChanged });
    }

    res.json({
      success: true,
      data: newConfig,
      schedulerReloaded: schedulerChanged,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/analyze/status - 查询当前分析运行状态
router.get('/analyze/status', (req, res) => {
  try {
    const state = getExecutor().getState();
    res.json({
      success: true,
      data: {
        isRunning: state.isRunning,
        startTime: state.startTime,
        runId: state.runId,
      },
    });
  } catch {
    // executor 尚未注入时返回默认状态
    res.json({
      success: true,
      data: { isRunning: false, startTime: null, runId: null },
    });
  }
});

// POST /api/webhook/test - 测试 webhook 连通性
router.post('/webhook/test', async (req, res) => {
  try {
    const { name, url, preset, secret } = req.body || {};

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'url 是必填项' });
    }

    // 动态导入 webhook 工具
    const { renderTemplate, signDingTalkUrl } = await import('../../../src/notifications/webhook-utils.js');
    const { WEBHOOK_PRESETS } = await import('../../../src/notifications/webhook-presets.js');

    const presetConfig = preset ? WEBHOOK_PRESETS.get(preset) : undefined;
    const template = presetConfig?.template ?? '{"text":"{{title}}: {{body}}"}';
    const contentType = presetConfig?.contentType ?? 'application/json';

    const body = renderTemplate(template, {
      title: '测试通知',
      body: `来自 claude-evolution 的 webhook 连通性测试 (${name || 'unnamed'})`,
      type: 'system',
      timestamp: new Date().toISOString(),
    });

    let finalUrl = url;
    if (secret && presetConfig?.signFn) {
      finalUrl = presetConfig.signFn(finalUrl, secret);
    }

    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return res.json({ success: false, error: `HTTP ${response.status}: ${text.slice(0, 200)}` });
    }

    const result = await response.json().catch(() => ({})) as Record<string, unknown>;
    // 钉钉/飞书返回 errcode
    if (result.errcode !== undefined && result.errcode !== 0) {
      return res.json({ success: false, error: `${result.errmsg || 'Unknown error'} (errcode: ${result.errcode})` });
    }

    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /api/analyze - 手动触发分析
router.post('/analyze', async (req: RequestWithManagers, res) => {
  try {
    const executor = getExecutor();

    // 检查是否已有分析在运行
    if (executor.getState().isRunning) {
      return res.status(409).json({
        success: false,
        error: '分析正在进行中，请稍候',
      });
    }

    // 立即返回 202 Accepted，异步执行分析
    res.status(202).json({
      success: true,
      message: '分析已启动',
    });

    // 异步执行（executor 内部处理状态、日志、hooks 通知）
    try {
      const result = await executor.execute();
      console.log(`[API] 分析完成，用时 ${result.duration}s，发现 ${result.observationsCount} 条观察`);
    } catch (error) {
      console.error('[API] 分析失败:', error);
    }
  } catch (error) {
    // 仅在 executor 未初始化等启动异常时到达
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
});

export default router;
