import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { VersionChecker } from '../../../src/version-update/version-checker.js';

const execAsync = promisify(exec);
const router = express.Router();
const versionChecker = new VersionChecker();

/**
 * GET /api/version-update
 * 获取版本更新信息
 */
router.get('/', async (req, res) => {
  try {
    const result = await versionChecker.checkForUpdates();

    res.json({
      success: true,
      data: {
        currentVersion: result.currentVersion,
        latestVersion: result.latestVersion,
        hasUpdate: result.hasUpdate,
        needsNotify: result.needsNotify,
        notifiedVersion: result.notifiedVersion,
      },
    });
  } catch (error) {
    console.error('[版本检查] API 错误:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '版本检查失败',
    });
  }
});

/**
 * POST /api/version-update/mark-read
 * 标记版本更新已读
 */
router.post('/mark-read', async (req, res) => {
  try {
    const { version } = req.body;

    if (!version) {
      return res.status(400).json({
        success: false,
        error: '缺少 version 参数',
      });
    }

    versionChecker.markAsNotified(version);

    res.json({
      success: true,
      message: '已标记为已读',
    });
  } catch (error) {
    console.error('[版本检查] 标记已读失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '标记失败',
    });
  }
});

/**
 * POST /api/version-update/upgrade
 * 执行升级（需要全局安装权限）
 */
router.post('/upgrade', async (req, res) => {
  try {
    console.log('[版本升级] 开始升级...');

    // 检查是否有新版本
    const result = await versionChecker.checkForUpdates();
    if (!result.hasUpdate) {
      return res.json({
        success: false,
        message: '当前已是最新版本',
      });
    }

    // 尝试全局更新（可能需要 sudo）
    const command = 'npm install -g claude-evolution@latest';
    console.log(`[版本升级] 执行命令: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command);
      console.log('[版本升级] npm 输出:', stdout);
      if (stderr) {
        console.log('[版本升级] npm stderr:', stderr);
      }

      // 升级成功后，触发重启
      console.log('[版本升级] 升级成功，准备重启服务...');

      res.json({
        success: true,
        message: '升级成功，服务将在 2 秒后重启',
        data: {
          oldVersion: result.currentVersion,
          newVersion: result.latestVersion,
        },
      });

      // 延迟 2 秒后重启，给客户端时间接收响应
      setTimeout(async () => {
        try {
          console.log('[版本升级] 执行重启命令...');
          // 后台重启，使用 nohup 防止进程被杀掉
          exec('nohup claude-evolution restart > /tmp/claude-evolution-restart.log 2>&1 &');
        } catch (error) {
          console.error('[版本升级] 重启失败:', error);
        }
      }, 2000);
    } catch (error: any) {
      // 检查是否是权限问题
      if (error.message.includes('EACCES') || error.message.includes('permission')) {
        return res.status(403).json({
          success: false,
          error: '权限不足',
          message: '需要管理员权限才能更新全局包。请手动执行：sudo npm install -g claude-evolution@latest',
          requiresSudo: true,
        });
      }

      throw error;
    }
  } catch (error) {
    console.error('[版本升级] 升级失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '升级失败',
    });
  }
});

export default router;
