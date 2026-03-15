import { Router, Request, Response } from 'express';
import {
  loadActiveObservations,
  loadContextObservations,
  loadArchivedObservations,
  saveActiveObservations,
  saveContextObservations,
  saveArchivedObservations,
} from '../../../src/memory/observation-manager.js';
import { promoteToContext } from '../../../src/memory/promotion.js';
import { regenerateClaudeMd } from '../../../src/memory/claudemd-generator.js';
import { loadConfig, saveConfig } from '../../../src/config/loader.js';
import type {
  ObservationWithMetadata,
  ManualOverrideAction,
} from '../../../src/types/learning.js';
import type { Config } from '../../../src/config/schema.js';
import type { WebSocketManager } from '../websocket.js';

interface RequestWithWS extends Request {
  wsManager?: WebSocketManager;
}

const router = Router();

/**
 * GET /api/learning/observations
 * 获取所有观察池（active/context/archived）
 */
router.get('/observations', async (req: Request, res: Response) => {
  try {
    const { pool } = req.query;

    // 加载所有池
    const active = await loadActiveObservations();
    const context = await loadContextObservations();
    const archived = await loadArchivedObservations();

    // 根据查询参数过滤
    if (pool === 'active') {
      return res.json({
        success: true,
        data: { active },
        meta: { total: active.length, pool: 'active' },
      });
    }

    if (pool === 'context') {
      return res.json({
        success: true,
        data: { context },
        meta: { total: context.length, pool: 'context' },
      });
    }

    if (pool === 'archived') {
      return res.json({
        success: true,
        data: { archived },
        meta: { total: archived.length, pool: 'archived' },
      });
    }

    // 返回所有池
    res.json({
      success: true,
      data: {
        active,
        context,
        archived,
      },
      meta: {
        total: active.length + context.length + archived.length,
        breakdown: {
          active: active.length,
          context: context.length,
          archived: archived.length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load observations',
    });
  }
});

/**
 * POST /api/learning/promote
 * 手动提升观察到上下文池
 */
router.post('/promote', async (req: RequestWithWS, res: Response) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: id',
      });
    }

    // 加载活跃池
    const active = await loadActiveObservations();
    const observation = active.find((obs) => obs.id === id);

    if (!observation) {
      return res.status(404).json({
        success: false,
        error: `Observation not found: ${id}`,
      });
    }

    // 检查是否已在上下文中
    if (observation.inContext) {
      return res.status(400).json({
        success: false,
        error: 'Observation is already in context',
      });
    }

    // 记录如果之前被忽略
    if (observation.manualOverride?.action === 'ignore') {
      console.log(`[Learning] Observation ${id} was previously ignored (reason: ${observation.manualOverride.reason || 'none'}), now promoting`);
    }

    // 标记手动提升
    const updatedObs: ObservationWithMetadata = {
      ...observation,
      inContext: true,
      manualOverride: {
        action: 'promote',
        timestamp: new Date().toISOString(),
      },
      promotedAt: new Date().toISOString(),
      promotionReason: 'manual',
    };

    // 从活跃池中移除（提升后不应该留在 active pool）
    const updatedActive = active.filter((obs) => obs.id !== id);
    await saveActiveObservations(updatedActive);

    // 添加到上下文池
    const context = await loadContextObservations();
    const newContext = [...context, updatedObs];
    await saveContextObservations(newContext);

    // 重新生成 CLAUDE.md
    regenerateClaudeMd(newContext).catch(err => {
      console.error('[Learning] Failed to regenerate CLAUDE.md after promote:', err);
    });

    // 发送 WebSocket 事件
    if (req.wsManager) {
      req.wsManager.emitObservationPromoted({
        id: updatedObs.id,
        type: updatedObs.type,
        confidence: updatedObs.confidence,
      });
    }

    res.json({
      success: true,
      data: {
        id,
        message: 'Observation promoted to context',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to promote observation',
    });
  }
});

/**
 * POST /api/learning/demote
 * 手动将观察从上下文池降级到活跃池
 */
router.post('/demote', async (req: RequestWithWS, res: Response) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: id',
      });
    }

    // 加载上下文池
    const context = await loadContextObservations();
    const observation = context.find((obs) => obs.id === id);

    if (!observation) {
      return res.status(404).json({
        success: false,
        error: `Observation not found in context: ${id}`,
      });
    }

    // 标记手动降级
    const updatedObs: ObservationWithMetadata = {
      ...observation,
      inContext: false,
      manualOverride: {
        action: 'demote',
        timestamp: new Date().toISOString(),
      },
    };

    // 从上下文池移除
    const newContext = context.filter((obs) => obs.id !== id);
    await saveContextObservations(newContext);

    // 加载活跃池并添加
    const active = await loadActiveObservations();
    const newActive = [...active, updatedObs];
    await saveActiveObservations(newActive);

    // 发送 WebSocket 事件
    if (req.wsManager) {
      req.wsManager.emitObservationDemoted({
        id: updatedObs.id,
        type: updatedObs.type,
        confidence: updatedObs.confidence,
      });
    }

    res.json({
      success: true,
      data: {
        id,
        message: 'Observation demoted from context',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to demote observation',
    });
  }
});

/**
 * POST /api/learning/ignore
 * 设置手动覆盖标记（忽略自动处理）
 */
router.post('/ignore', async (req: RequestWithWS, res: Response) => {
  try {
    const { id, reason } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: id',
      });
    }

    // 尝试从活跃池查找
    const active = await loadActiveObservations();
    let observation = active.find((obs) => obs.id === id);
    let pool: 'active' | 'context' = 'active';

    // 如果不在活跃池，尝试上下文池
    if (!observation) {
      const context = await loadContextObservations();
      observation = context.find((obs) => obs.id === id);
      pool = 'context';
    }

    if (!observation) {
      return res.status(404).json({
        success: false,
        error: `Observation not found: ${id}`,
      });
    }

    // 设置忽略标记
    const updatedObs: ObservationWithMetadata = {
      ...observation,
      manualOverride: {
        action: 'ignore',
        timestamp: new Date().toISOString(),
        reason,
      },
    };

    // 更新对应的池
    if (pool === 'active') {
      const updated = active.map((obs) => (obs.id === id ? updatedObs : obs));
      await saveActiveObservations(updated);
    } else {
      const context = await loadContextObservations();
      const updated = context.map((obs) => (obs.id === id ? updatedObs : obs));
      await saveContextObservations(updated);

      // 重新生成 CLAUDE.md (因为修改了 context pool)
      regenerateClaudeMd(updated).catch(err => {
        console.error('[Learning] Failed to regenerate CLAUDE.md after ignore:', err);
      });
    }

    // 发送 WebSocket 事件（archived 表示被忽略）
    if (req.wsManager) {
      req.wsManager.emitObservationArchived({
        id: updatedObs.id,
        type: updatedObs.type,
        reason: 'ignored',
      });
    }

    res.json({
      success: true,
      data: {
        id,
        pool,
        message: 'Observation marked as ignored',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to ignore observation',
    });
  }
});

/**
 * POST /api/learning/delete
 * 删除观察（移动到归档池而非永久删除）
 * ⚠️ BREAKING CHANGE: 现在会归档而非永久删除
 */
router.post('/delete', async (req: RequestWithWS, res: Response) => {
  try {
    const { id, reason } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: id',
      });
    }

    let observation: ObservationWithMetadata | undefined;
    let pool: 'active' | 'context' | null = null;

    // 尝试从活跃池查找
    const active = await loadActiveObservations();
    observation = active.find((obs) => obs.id === id);
    if (observation) {
      pool = 'active';
    }

    // 尝试从上下文池查找
    if (!observation) {
      const context = await loadContextObservations();
      observation = context.find((obs) => obs.id === id);
      if (observation) {
        pool = 'context';
      }
    }

    if (!observation) {
      return res.status(404).json({
        success: false,
        error: `Observation not found: ${id}`,
      });
    }

    // 添加归档元数据
    const archivedObs: ObservationWithMetadata = {
      ...observation,
      archiveReason: reason ? `user_deleted: ${reason}` : 'user_deleted',
      archiveTimestamp: new Date().toISOString(),
      suppressSimilar: true,
    };

    // 从源池移除
    if (pool === 'active') {
      const filtered = active.filter((obs) => obs.id !== id);
      await saveActiveObservations(filtered);
    } else {
      const context = await loadContextObservations();
      const filtered = context.filter((obs) => obs.id !== id);
      await saveContextObservations(filtered);

      // 重新生成 CLAUDE.md (因为从 context pool 删除)
      regenerateClaudeMd(filtered).catch(err => {
        console.error('[Learning] Failed to regenerate CLAUDE.md after delete:', err);
      });
    }

    // 添加到归档池
    const archived = await loadArchivedObservations();
    const newArchived = [...archived, archivedObs];
    await saveArchivedObservations(newArchived);

    // 发送 WebSocket 事件
    if (req.wsManager) {
      req.wsManager.emitObservationArchived({
        id: archivedObs.id,
        type: archivedObs.type,
        reason: 'user_deleted',
      });
    }

    res.json({
      success: true,
      data: {
        id,
        pool,
        message: 'Observation archived successfully',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive observation',
    });
  }
});

/**
 * POST /api/learning/restore
 * 从归档池恢复观察到活跃池
 */
router.post('/restore', async (req: RequestWithWS, res: Response) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: id',
      });
    }

    // 从归档池查找
    const archived = await loadArchivedObservations();
    const observation = archived.find((obs) => obs.id === id);

    if (!observation) {
      return res.status(404).json({
        success: false,
        error: `Observation not found in archive: ${id}`,
      });
    }

    // 清除归档元数据
    const restoredObs: ObservationWithMetadata = {
      ...observation,
      archiveTimestamp: undefined,
      archiveReason: undefined,
      suppressSimilar: undefined,
      suppressionCount: undefined,
      lastBlockedAt: undefined,
    };

    // 从归档池移除
    const newArchived = archived.filter((obs) => obs.id !== id);
    await saveArchivedObservations(newArchived);

    // 根据 inContext 标志决定恢复到哪个池
    if (restoredObs.inContext) {
      // 恢复到 context pool
      const context = await loadContextObservations();
      const newContext = [...context, restoredObs];
      await saveContextObservations(newContext);

      // 重新生成 CLAUDE.md (因为添加到 context pool)
      regenerateClaudeMd(newContext).catch(err => {
        console.error('[Learning] Failed to regenerate CLAUDE.md after restore:', err);
      });
    } else {
      // 恢复到 active pool
      const active = await loadActiveObservations();
      const newActive = [...active, restoredObs];
      await saveActiveObservations(newActive);
    }

    // 发送 WebSocket 事件
    if (req.wsManager) {
      req.wsManager.emitObservationRestored({
        id: restoredObs.id,
        type: restoredObs.type,
      });
    }

    res.json({
      success: true,
      data: {
        id,
        message: 'Observation restored from archive',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore observation',
    });
  }
});

/**
 * GET /api/learning/stats
 * 获取学习系统统计数据
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const active = await loadActiveObservations();
    const context = await loadContextObservations();
    const archived = await loadArchivedObservations();

    // 计算分层统计
    const calculateTierStats = (observations: ObservationWithMetadata[]) => {
      const gold = observations.filter(
        (obs) => obs.originalConfidence >= 0.75 && obs.mentions >= 5
      );
      const silver = observations.filter(
        (obs) =>
          obs.originalConfidence >= 0.60 &&
          obs.mentions >= 3 &&
          !gold.includes(obs)
      );
      const bronze = observations.filter(
        (obs) => !gold.includes(obs) && !silver.includes(obs)
      );

      return {
        gold: gold.length,
        silver: silver.length,
        bronze: bronze.length,
      };
    };

    const activeTiers = calculateTierStats(active);
    const contextTiers = calculateTierStats(context);

    // 类型统计
    const typeStats = (observations: ObservationWithMetadata[]) => {
      const counts: Record<string, number> = {};
      observations.forEach((obs) => {
        counts[obs.type] = (counts[obs.type] || 0) + 1;
      });
      return counts;
    };

    // 手动覆盖统计
    const manualOverrideStats = (observations: ObservationWithMetadata[]) => {
      const promoted = observations.filter(
        (obs) => obs.manualOverride?.action === 'promote'
      ).length;
      const demoted = observations.filter(
        (obs) => obs.manualOverride?.action === 'demote'
      ).length;
      const ignored = observations.filter(
        (obs) => obs.manualOverride?.action === 'ignore'
      ).length;

      return { promoted, demoted, ignored };
    };

    res.json({
      success: true,
      data: {
        pools: {
          active: {
            total: active.length,
            tiers: activeTiers,
            types: typeStats(active),
            manualOverrides: manualOverrideStats(active),
          },
          context: {
            total: context.length,
            tiers: contextTiers,
            types: typeStats(context),
            manualOverrides: manualOverrideStats(context),
          },
          archived: {
            total: archived.length,
            types: typeStats(archived),
          },
        },
        summary: {
          totalObservations: active.length + context.length + archived.length,
          activeObservations: active.length,
          contextObservations: context.length,
          archivedObservations: archived.length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load statistics',
    });
  }
});

/**
 * PUT /api/learning/config
 * 更新学习系统配置
 */
router.put('/config', async (req: Request, res: Response) => {
  try {
    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body: expected object',
      });
    }

    // 加载当前配置
    const config = await loadConfig();

    // 验证学习配置存在
    if (!config.learning) {
      return res.status(400).json({
        success: false,
        error: 'Learning system is not enabled in configuration',
      });
    }

    // 深度合并更新（仅合并提供的字段）
    const updatedLearningConfig = {
      ...config.learning,
      ...(updates.enabled !== undefined && { enabled: updates.enabled }),
      ...(updates.capacity && {
        capacity: {
          ...config.learning.capacity,
          ...updates.capacity,
        },
      }),
      ...(updates.decay && {
        decay: {
          ...config.learning.decay,
          ...updates.decay,
        },
      }),
      ...(updates.promotion && {
        promotion: {
          ...config.learning.promotion,
          ...updates.promotion,
        },
      }),
      ...(updates.deletion && {
        deletion: {
          ...config.learning.deletion,
          ...updates.deletion,
        },
      }),
      ...(updates.retention && {
        retention: {
          ...config.learning.retention,
          ...updates.retention,
        },
      }),
    };

    // 更新完整配置
    const updatedConfig: Config = {
      ...config,
      learning: updatedLearningConfig,
    };

    // 保存配置（会自动验证 schema）
    await saveConfig(updatedConfig);

    res.json({
      success: true,
      data: {
        message: 'Learning configuration updated successfully',
        updated: updatedLearningConfig,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update configuration',
    });
  }
});

/**
 * POST /api/learning/batch/promote
 * 批量提升观察到上下文池
 */
router.post('/batch/promote', async (req: RequestWithWS, res: Response) => {
  try {
    const { ids }: { ids: string[] } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid field: ids (expected non-empty array)',
      });
    }

    // 强制限制
    if (ids.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'Cannot process more than 200 observations at once',
      });
    }

    // 加载池
    const active = await loadActiveObservations();
    const context = await loadContextObservations();

    // 执行批量提升
    const results: { id: string; success: boolean; error?: string }[] = [];
    const promotedIds: string[] = [];

    for (const id of ids) {
      const observation = active.find((obs) => obs.id === id);

      if (!observation) {
        results.push({ id, success: false, error: 'Observation not found' });
        continue;
      }

      if (observation.inContext) {
        results.push({
          id,
          success: false,
          error: 'Already in context',
        });
        continue;
      }

      promotedIds.push(id);
      results.push({ id, success: true });
    }

    // 从活跃池中移除已提升的观察
    const updatedActive = active.filter((obs) => !promotedIds.includes(obs.id));
    await saveActiveObservations(updatedActive);

    // 准备要添加到上下文池的观察（带有提升标记）
    const promotedObservations = active
      .filter((obs) => promotedIds.includes(obs.id))
      .map((obs) => ({
        ...obs,
        inContext: true,
        manualOverride: {
          action: 'promote' as ManualOverrideAction,
          timestamp: new Date().toISOString(),
        },
        promotedAt: new Date().toISOString(),
        promotionReason: 'manual' as const,
      }));

    // 添加到上下文池
    const newContext = [...context, ...promotedObservations];
    await saveContextObservations(newContext);

    // 重新生成 CLAUDE.md (批量提升后)
    regenerateClaudeMd(newContext).catch(err => {
      console.error('[Learning] Failed to regenerate CLAUDE.md after batch promote:', err);
    });

    // WebSocket 事件
    if (req.wsManager) {
      promotedObservations.forEach((obs) => {
        req.wsManager!.emitObservationPromoted({
          id: obs.id,
          type: obs.type,
          confidence: obs.confidence,
        });
      });
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      data: {
        total: ids.length,
        succeeded: successCount,
        failed: failureCount,
        results,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to batch promote observations',
    });
  }
});

/**
 * POST /api/learning/batch/ignore
 * 批量忽略观察
 */
router.post('/batch/ignore', async (req: RequestWithWS, res: Response) => {
  try {
    const { ids, reason }: { ids: string[]; reason?: string } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid field: ids (expected non-empty array)',
      });
    }

    if (ids.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'Cannot process more than 200 observations at once',
      });
    }

    const active = await loadActiveObservations();
    const context = await loadContextObservations();

    const results: { id: string; success: boolean; pool?: string; error?: string }[] =
      [];

    // 更新活跃池
    const updatedActive = active.map((obs) => {
      if (ids.includes(obs.id)) {
        results.push({ id: obs.id, success: true, pool: 'active' });
        return {
          ...obs,
          manualOverride: {
            action: 'ignore' as ManualOverrideAction,
            timestamp: new Date().toISOString(),
            reason,
          },
        };
      }
      return obs;
    });

    // 更新上下文池
    const updatedContext = context.map((obs) => {
      if (ids.includes(obs.id) && !results.find((r) => r.id === obs.id)) {
        results.push({ id: obs.id, success: true, pool: 'context' });
        return {
          ...obs,
          manualOverride: {
            action: 'ignore' as ManualOverrideAction,
            timestamp: new Date().toISOString(),
            reason,
          },
        };
      }
      return obs;
    });

    // 找出未找到的 ID
    ids.forEach((id) => {
      if (!results.find((r) => r.id === id)) {
        results.push({ id, success: false, error: 'Observation not found' });
      }
    });

    await saveActiveObservations(updatedActive);
    await saveContextObservations(updatedContext);

    // 检查是否修改了 context pool
    const contextModified = results.some((r) => r.success && r.pool === 'context');
    console.log('[Learning] batch/ignore results:', JSON.stringify(results, null, 2));
    console.log('[Learning] contextModified:', contextModified);

    if (contextModified) {
      // 重新生成 CLAUDE.md (如果修改了 context pool)
      regenerateClaudeMd(updatedContext).catch(err => {
        console.error('[Learning] Failed to regenerate CLAUDE.md after batch ignore:', err);
      });
    }

    // WebSocket 事件
    if (req.wsManager) {
      results
        .filter((r) => r.success)
        .forEach((r) => {
          const obs =
            updatedActive.find((o) => o.id === r.id) ||
            updatedContext.find((o) => o.id === r.id);
          if (obs) {
            req.wsManager!.emitObservationArchived({
              id: obs.id,
              type: obs.type,
              reason: 'ignored',
            });
          }
        });
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      data: {
        total: ids.length,
        succeeded: successCount,
        failed: failureCount,
        results,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to batch ignore observations',
    });
  }
});

/**
 * POST /api/learning/batch/delete
 * 批量删除观察（移动到归档池）
 */
router.post('/batch/delete', async (req: RequestWithWS, res: Response) => {
  try {
    const { ids }: { ids: string[] } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid field: ids (expected non-empty array)',
      });
    }

    if (ids.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'Cannot process more than 200 observations at once',
      });
    }

    const active = await loadActiveObservations();
    const context = await loadContextObservations();
    const archived = await loadArchivedObservations();

    const results: { id: string; success: boolean; pool?: string; error?: string }[] =
      [];
    const toArchive: ObservationWithMetadata[] = [];

    // 从活跃池查找
    active.forEach((obs) => {
      if (ids.includes(obs.id)) {
        results.push({ id: obs.id, success: true, pool: 'active' });
        toArchive.push({
          ...obs,
          archiveReason: 'user_deleted',
          archiveTimestamp: new Date().toISOString(),
          suppressSimilar: true,
        });
      }
    });

    // 从上下文池查找
    context.forEach((obs) => {
      if (ids.includes(obs.id) && !results.find((r) => r.id === obs.id)) {
        results.push({ id: obs.id, success: true, pool: 'context' });
        toArchive.push({
          ...obs,
          archiveReason: 'user_deleted',
          archiveTimestamp: new Date().toISOString(),
          suppressSimilar: true,
        });
      }
    });

    // 找出未找到的 ID
    ids.forEach((id) => {
      if (!results.find((r) => r.id === id)) {
        results.push({ id, success: false, error: 'Observation not found' });
      }
    });

    // 从源池移除
    const newActive = active.filter((obs) => !ids.includes(obs.id));
    const newContext = context.filter((obs) => !ids.includes(obs.id));
    await saveActiveObservations(newActive);
    await saveContextObservations(newContext);

    // 添加到归档池
    const newArchived = [...archived, ...toArchive];
    await saveArchivedObservations(newArchived);

    // 检查是否修改了 context pool
    const contextModified = results.some((r) => r.success && r.pool === 'context');
    if (contextModified) {
      // 重新生成 CLAUDE.md (如果从 context pool 删除)
      regenerateClaudeMd(newContext).catch(err => {
        console.error('[Learning] Failed to regenerate CLAUDE.md after batch delete:', err);
      });
    }

    // WebSocket 事件
    if (req.wsManager) {
      toArchive.forEach((obs) => {
        req.wsManager!.emitObservationArchived({
          id: obs.id,
          type: obs.type,
          reason: 'user_deleted',
        });
      });
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      data: {
        total: ids.length,
        succeeded: successCount,
        failed: failureCount,
        results,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to batch delete observations',
    });
  }
});

export default router;
