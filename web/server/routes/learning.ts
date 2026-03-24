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

    // 创建归档观察
    const archivedObs: ObservationWithMetadata = {
      ...observation,
      manualOverride: {
        action: 'ignore',
        timestamp: new Date().toISOString(),
        reason,
      },
      archiveReason: 'user_ignored',
      archiveTimestamp: new Date().toISOString(),
    };

    // 从源池移除
    if (pool === 'active') {
      const updated = active.filter((obs) => obs.id !== id);
      await saveActiveObservations(updated);
    } else {
      const context = await loadContextObservations();
      const updated = context.filter((obs) => obs.id !== id);
      await saveContextObservations(updated);

      // 重新生成 CLAUDE.md (因为修改了 context pool)
      regenerateClaudeMd(updated).catch(err => {
        console.error('[Learning] Failed to regenerate CLAUDE.md after ignore:', err);
      });
    }

    // 添加到归档池
    const archived = await loadArchivedObservations();
    await saveArchivedObservations([...archived, archivedObs]);

    // 发送 WebSocket 事件
    if (req.wsManager) {
      req.wsManager.emitObservationArchived({
        id: archivedObs.id,
        type: archivedObs.type,
        reason: 'user_ignored',
      });
    }

    res.json({
      success: true,
      data: {
        id,
        pool,
        message: 'Observation marked as ignored and moved to archive',
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
      archiveReason: 'user_deleted',
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
            pinnedCount: context.filter((obs) => obs.pinned === true).length,
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
      ...(updates.extractObservations !== undefined && { extractObservations: updates.extractObservations }),
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

/**
 * POST /api/learning/unignore
 * 从 Archive Pool 恢复单个观察到 Active 或 Context Pool
 */
router.post('/unignore', async (req: RequestWithWS, res: Response) => {
  try {
    const { id, targetPool } = req.body as { id: string; targetPool: 'active' | 'context' };

    // 验证参数
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Observation ID is required',
      });
    }

    if (!targetPool || !['active', 'context'].includes(targetPool)) {
      return res.status(400).json({
        success: false,
        error: 'targetPool must be either "active" or "context"',
      });
    }

    // 从 Archive Pool 加载
    const archived = await loadArchivedObservations();
    const observation = archived.find((obs) => obs.id === id);

    if (!observation) {
      return res.status(404).json({
        success: false,
        error: 'Observation not found in archive',
      });
    }

    // 清理归档元数据
    const restoredObs: ObservationWithMetadata = {
      ...observation,
      archiveTimestamp: undefined,
      archiveReason: undefined,
      manualOverride: undefined,
      inContext: targetPool === 'context', // 设置 inContext 标记
    };

    // 添加到目标池
    if (targetPool === 'context') {
      const context = await loadContextObservations();
      context.push(restoredObs);
      await saveContextObservations(context);

      // 触发 CLAUDE.md 重新生成
      regenerateClaudeMd(context).catch((err) => {
        console.error('Failed to regenerate CLAUDE.md:', err);
      });
    } else {
      const active = await loadActiveObservations();
      active.push(restoredObs);
      await saveActiveObservations(active);
    }

    // 从归档池移除
    const updatedArchive = archived.filter((obs) => obs.id !== id);
    await saveArchivedObservations(updatedArchive);

    // 发送 WebSocket 事件
    if (req.wsManager) {
      req.wsManager.broadcast('observation:restored', { id, targetPool });
    }

    res.json({
      success: true,
      data: { observation: restoredObs, targetPool },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore observation',
    });
  }
});

/**
 * POST /api/learning/batch/unignore
 * 批量从 Archive Pool 恢复观察
 */
router.post('/batch/unignore', async (req: RequestWithWS, res: Response) => {
  try {
    const { ids, targetPool } = req.body as { ids: string[]; targetPool: 'active' | 'context' };

    // 验证参数
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids array is required and must not be empty',
      });
    }

    if (!targetPool || !['active', 'context'].includes(targetPool)) {
      return res.status(400).json({
        success: false,
        error: 'targetPool must be either "active" or "context"',
      });
    }

    const archived = await loadArchivedObservations();
    const restoredObservations: ObservationWithMetadata[] = [];
    const notFound: string[] = [];

    // 查找并准备恢复的观察
    for (const id of ids) {
      const observation = archived.find((obs) => obs.id === id);
      if (observation) {
        const restoredObs: ObservationWithMetadata = {
          ...observation,
          archiveTimestamp: undefined,
          archiveReason: undefined,
          manualOverride: undefined,
          inContext: targetPool === 'context', // 设置 inContext 标记
        };
        restoredObservations.push(restoredObs);
      } else {
        notFound.push(id);
      }
    }

    if (restoredObservations.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'None of the provided IDs were found in archive',
        data: { notFound },
      });
    }

    // 批量添加到目标池
    if (targetPool === 'context') {
      const context = await loadContextObservations();
      context.push(...restoredObservations);
      await saveContextObservations(context);

      // 触发 CLAUDE.md 重新生成（只生成一次）
      regenerateClaudeMd(context).catch((err) => {
        console.error('Failed to regenerate CLAUDE.md:', err);
      });
    } else {
      const active = await loadActiveObservations();
      active.push(...restoredObservations);
      await saveActiveObservations(active);
    }

    // 从归档池移除
    const restoredIds = new Set(restoredObservations.map((obs) => obs.id));
    const updatedArchive = archived.filter((obs) => !restoredIds.has(obs.id));
    await saveArchivedObservations(updatedArchive);

    // 发送 WebSocket 事件
    if (req.wsManager) {
      req.wsManager.broadcast('observation:batch_restored', { ids: Array.from(restoredIds), targetPool });
    }

    res.json({
      success: true,
      data: {
        restored: restoredObservations.length,
        targetPool,
        notFound: notFound.length > 0 ? notFound : undefined,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to batch restore observations',
    });
  }
});

/**
 * POST /api/learning/pin
 * 钉选 Context Pool 中的观察
 */
router.post('/pin', async (req: RequestWithWS, res: Response) => {
  try {
    const { id } = req.body as { id: string };

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Observation ID is required',
      });
    }

    const context = await loadContextObservations();
    const observation = context.find((obs) => obs.id === id);

    if (!observation) {
      return res.status(404).json({
        success: false,
        error: 'Observation not found in Context Pool',
      });
    }

    // 幂等性：如果已经钉选，直接返回成功
    if (observation.pinned === true) {
      return res.json({
        success: true,
        data: { observation, alreadyPinned: true },
      });
    }

    // 钉选观察
    observation.pinned = true;
    observation.pinnedBy = 'user';
    observation.pinnedAt = new Date().toISOString();

    await saveContextObservations(context);

    // 发送 WebSocket 事件
    if (req.wsManager) {
      req.wsManager.broadcast('observation:pinned', { id });
    }

    res.json({
      success: true,
      data: { observation },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to pin observation',
    });
  }
});

/**
 * POST /api/learning/unpin
 * 取消钉选 Context Pool 中的观察
 */
router.post('/unpin', async (req: RequestWithWS, res: Response) => {
  try {
    const { id } = req.body as { id: string };

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Observation ID is required',
      });
    }

    const context = await loadContextObservations();
    const observation = context.find((obs) => obs.id === id);

    if (!observation) {
      return res.status(404).json({
        success: false,
        error: 'Observation not found in Context Pool',
      });
    }

    // 幂等性：如果未钉选，直接返回成功
    if (!observation.pinned) {
      return res.json({
        success: true,
        data: { observation, alreadyUnpinned: true },
      });
    }

    // 取消钉选
    observation.pinned = undefined;
    observation.pinnedBy = undefined;
    observation.pinnedAt = undefined;

    await saveContextObservations(context);

    // 发送 WebSocket 事件
    if (req.wsManager) {
      req.wsManager.broadcast('observation:unpinned', { id });
    }

    res.json({
      success: true,
      data: { observation },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unpin observation',
    });
  }
});

/**
 * POST /api/learning/batch/pin
 * 批量钉选观察
 */
router.post('/batch/pin', async (req: RequestWithWS, res: Response) => {
  try {
    const { ids } = req.body as { ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids array is required and must not be empty',
      });
    }

    const context = await loadContextObservations();
    const pinned: string[] = [];
    const alreadyPinned: string[] = [];
    const notFound: string[] = [];

    for (const id of ids) {
      const observation = context.find((obs) => obs.id === id);
      if (!observation) {
        notFound.push(id);
        continue;
      }

      if (observation.pinned === true) {
        alreadyPinned.push(id);
        continue;
      }

      observation.pinned = true;
      observation.pinnedBy = 'user';
      observation.pinnedAt = new Date().toISOString();
      pinned.push(id);
    }

    if (pinned.length > 0) {
      await saveContextObservations(context);

      // 发送 WebSocket 事件
      if (req.wsManager) {
        req.wsManager.broadcast('observation:batch_pinned', { ids: pinned });
      }
    }

    res.json({
      success: true,
      data: {
        pinned: pinned.length,
        alreadyPinned: alreadyPinned.length,
        notFound: notFound.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to batch pin observations',
    });
  }
});

/**
 * POST /api/learning/batch/unpin
 * 批量取消钉选观察
 */
router.post('/batch/unpin', async (req: RequestWithWS, res: Response) => {
  try {
    const { ids } = req.body as { ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids array is required and must not be empty',
      });
    }

    const context = await loadContextObservations();
    const unpinned: string[] = [];
    const alreadyUnpinned: string[] = [];
    const notFound: string[] = [];

    for (const id of ids) {
      const observation = context.find((obs) => obs.id === id);
      if (!observation) {
        notFound.push(id);
        continue;
      }

      if (!observation.pinned) {
        alreadyUnpinned.push(id);
        continue;
      }

      observation.pinned = undefined;
      observation.pinnedBy = undefined;
      observation.pinnedAt = undefined;
      unpinned.push(id);
    }

    if (unpinned.length > 0) {
      await saveContextObservations(context);

      // 发送 WebSocket 事件
      if (req.wsManager) {
        req.wsManager.broadcast('observation:batch_unpinned', { ids: unpinned });
      }
    }

    res.json({
      success: true,
      data: {
        unpinned: unpinned.length,
        alreadyUnpinned: alreadyUnpinned.length,
        notFound: notFound.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to batch unpin observations',
    });
  }
});

/**
 * GET /api/learning/capacity/config
 * 获取当前容量配置
 */
router.get('/capacity/config', async (req: Request, res: Response) => {
  try {
    const config = await loadConfig();

    if (!config.learning?.capacity) {
      return res.status(404).json({
        success: false,
        error: 'Capacity configuration not found',
      });
    }

    res.json({
      success: true,
      data: {
        active: config.learning.capacity.active,
        context: config.learning.capacity.context,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load capacity config',
    });
  }
});

/**
 * POST /api/learning/capacity/config
 * 更新容量配置
 *
 * Body:
 *   active?: { targetSize, maxSize, minSize }
 *   context?: { enabled, targetSize, maxSize, halfLifeDays }
 */
router.post('/capacity/config', async (req: RequestWithWS, res: Response) => {
  try {
    const { active, context } = req.body;

    if (!active && !context) {
      return res.status(400).json({
        success: false,
        error: 'At least one of "active" or "context" must be provided',
      });
    }

    const config = await loadConfig();

    if (!config.learning?.capacity) {
      return res.status(500).json({
        success: false,
        error: 'Learning capacity config missing',
      });
    }

    // 验证并更新 Active Pool 配置
    if (active) {
      const { targetSize, maxSize, minSize } = active;

      if (targetSize !== undefined) {
        if (targetSize < 10 || targetSize > 200) {
          return res.status(400).json({
            success: false,
            error: 'Active Pool targetSize must be between 10 and 200',
          });
        }
      }

      if (maxSize !== undefined) {
        if (maxSize < 10 || maxSize > 250) {
          return res.status(400).json({
            success: false,
            error: 'Active Pool maxSize must be between 10 and 250',
          });
        }
      }

      if (minSize !== undefined) {
        if (minSize < 5 || minSize > 100) {
          return res.status(400).json({
            success: false,
            error: 'Active Pool minSize must be between 5 and 100',
          });
        }
      }

      const newTargetSize = targetSize ?? config.learning.capacity.active.targetSize;
      const newMaxSize = maxSize ?? config.learning.capacity.active.maxSize;
      const newMinSize = minSize ?? config.learning.capacity.active.minSize;

      if (newMinSize > newTargetSize || newTargetSize > newMaxSize) {
        return res.status(400).json({
          success: false,
          error: 'Active Pool sizes must satisfy: minSize ≤ targetSize ≤ maxSize',
        });
      }

      config.learning.capacity.active = {
        targetSize: newTargetSize,
        maxSize: newMaxSize,
        minSize: newMinSize,
      };
    }

    // 验证并更新 Context Pool 配置
    if (context) {
      const { enabled, targetSize, maxSize, halfLifeDays } = context;

      if (enabled !== undefined && typeof enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Context Pool enabled must be a boolean',
        });
      }

      if (targetSize !== undefined) {
        if (targetSize < 10 || targetSize > 200) {
          return res.status(400).json({
            success: false,
            error: 'Context Pool targetSize must be between 10 and 200',
          });
        }
      }

      if (maxSize !== undefined) {
        if (maxSize < 10 || maxSize > 250) {
          return res.status(400).json({
            success: false,
            error: 'Context Pool maxSize must be between 10 and 250',
          });
        }
      }

      if (halfLifeDays !== undefined) {
        if (halfLifeDays < 30 || halfLifeDays > 180) {
          return res.status(400).json({
            success: false,
            error: 'Context Pool halfLifeDays must be between 30 and 180',
          });
        }
      }

      const newTargetSize = targetSize ?? config.learning.capacity.context.targetSize;
      const newMaxSize = maxSize ?? config.learning.capacity.context.maxSize;

      if (newTargetSize > newMaxSize) {
        return res.status(400).json({
          success: false,
          error: 'Context Pool sizes must satisfy: targetSize ≤ maxSize',
        });
      }

      config.learning.capacity.context = {
        enabled: enabled ?? config.learning.capacity.context.enabled,
        targetSize: newTargetSize,
        maxSize: newMaxSize,
        halfLifeDays: halfLifeDays ?? config.learning.capacity.context.halfLifeDays,
      };
    }

    // 保存更新后的配置
    await saveConfig(config);

    // 发送 WebSocket 事件通知配置更新
    if (req.wsManager) {
      req.wsManager.broadcast('config:capacity_updated', {
          active: config.learning.capacity.active,
          context: config.learning.capacity.context,
        });
    }

    res.json({
      success: true,
      data: {
        active: config.learning.capacity.active,
        context: config.learning.capacity.context,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update capacity config',
    });
  }
});

export default router;
