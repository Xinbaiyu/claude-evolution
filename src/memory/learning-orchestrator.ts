/**
 * Learning Orchestrator
 *
 * Orchestrates the complete incremental learning cycle:
 * 1. Session Analysis → Extract new observations
 * 2. LLM Merge → Merge with existing candidates
 * 3. Temporal Decay → Apply decay to all observations
 * 4. Deletion → Remove low-confidence observations
 * 5. Capacity Control → Enforce pool size limits
 * 6. Auto-Promotion → Promote gold-tier observations to context
 * 6.1. Context Pool LLM Merge → Merge similar & resolve conflicts in context
 * 7. Save State → Persist all changes
 */

import { logger } from '../utils/index.js';
import type { Config } from '../config/index.js';
import type { ObservationWithMetadata } from '../types/learning.js';

// Storage
import {
  loadActiveObservations,
  saveActiveObservations,
  loadContextObservations,
  saveContextObservations,
  loadArchivedObservations,
  saveArchivedObservations,
} from './observation-manager.js';

// LLM Merge
import { mergeLLM, fallbackNoMerge } from '../learners/llm-merge.js';

// Temporal Decay
import { applyDecayToObservations } from './temporal-decay.js';

// Auto-Promotion
import {
  getObservationsToPromote,
  promoteToContext,
  logPromotions,
} from './promotion.js';

// Deletion
import {
  getObservationsToDelete,
  removeDeletedObservations,
  logDeletions,
} from './deletion.js';

// Capacity Control
import {
  enforceCapacity,
  enforceContextCapacity,
  archiveObservations,
  pruneOldArchivedObservations,
  logCapacityControl,
} from './capacity-control.js';

// Context Pool LLM Merge
import { mergeContextPool } from './context-merge.js';

/**
 * Execute the complete learning cycle
 *
 * @param config - System configuration
 * @param newObservations - Newly extracted observations from session analysis
 * @returns Statistics about the cycle execution
 */
export async function executeLearningCycle(
  config: Config,
  newObservations: ObservationWithMetadata[]
): Promise<{
  merged: number;
  promoted: number;
  deleted: number;
  archived: number;
  contextMerged: number;
  finalActiveCount: number;
  finalContextCount: number;
}> {
  logger.info('Starting learning cycle', {
    newObservations: newObservations.length,
  });

  // Ensure learning config exists
  if (!config.learning) {
    throw new Error('Learning configuration is missing');
  }

  try {
    // Load existing observations
    const [activeObs, contextObs, archivedObs] = await Promise.all([
      loadActiveObservations(),
      loadContextObservations(),
      loadArchivedObservations(),
    ]);

    logger.debug('Loaded existing observations', {
      active: activeObs.length,
      context: contextObs.length,
      archived: archivedObs.length,
    });

    // Step 1: LLM Merge (merge new observations with existing active pool)
    logger.info('Step 1: LLM Merge');
    let mergedObs: ObservationWithMetadata[];
    try {
      mergedObs = await mergeLLM(activeObs, newObservations, {
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        baseURL: config.llm.baseURL,
        model: config.llm.model,
        maxOldObservations: 50,
        maxNewObservations: 20,
        contextPoolObservations: contextObs,
      });
    } catch (mergeError) {
      logger.warn('LLM merge failed in orchestrator, using fallback no-merge', {
        error: mergeError instanceof Error ? mergeError.message : String(mergeError),
      });
      mergedObs = fallbackNoMerge(activeObs, newObservations);
    }
    logger.info(`Merged observations: ${activeObs.length} + ${newObservations.length} → ${mergedObs.length}`);

    // Step 2: Apply Temporal Decay
    logger.info('Step 2: Applying temporal decay');
    const decayedObs = applyDecayToObservations(
      mergedObs,
      config.learning.decay.halfLifeDays
    );

    // Step 3: Deletion Strategy
    logger.info('Step 3: Applying deletion strategy');
    const toDelete = getObservationsToDelete(
      decayedObs,
      config.learning.deletion,
      config.learning.decay.halfLifeDays
    );

    logDeletions(toDelete);

    const afterDeletion = removeDeletedObservations(decayedObs, toDelete);

    // Step 4: Capacity Control
    logger.info('Step 4: Enforcing capacity control');
    const [afterCapacity, pruned] = enforceCapacity(
      afterDeletion,
      config.learning.capacity.active,
      config.learning.decay.halfLifeDays
    );

    logCapacityControl(pruned, afterDeletion.length - afterCapacity.length);

    // Archive pruned observations
    const newlyArchived = archiveObservations(pruned, 'active_capacity');

    // Step 5: Auto-Promotion
    logger.info('Step 5: Auto-promoting observations');
    const toPromote = getObservationsToPromote(
      afterCapacity,
      contextObs,
      config.learning.promotion,
      config.learning.decay.halfLifeDays
    );

    logPromotions(toPromote);

    const promoted = promoteToContext(toPromote);

    // Update context and active pools
    let updatedContext = [...contextObs, ...promoted];
    const updatedActive = afterCapacity.filter(
      obs => !toPromote.some(p => p.id === obs.id)
    );

    // Step 5.1: Context Pool LLM Merge
    logger.info('Step 5.1: Context Pool LLM Merge');
    const contextMergeResult = await mergeContextPool(updatedContext, {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      baseURL: config.llm.baseURL,
      model: config.llm.model,
    });
    updatedContext = contextMergeResult.observations;

    if (contextMergeResult.merged > 0 || contextMergeResult.conflicts > 0) {
      logger.info('Context pool merge results', {
        merged: contextMergeResult.merged,
        conflicts: contextMergeResult.conflicts,
        contextSize: updatedContext.length,
      });
    }

    // Step 5.5: Context Pool Capacity Control (if enabled)
    let contextCapacityArchived: ObservationWithMetadata[] = [];
    const contextCapacityConfig = config.learning.capacity.context;

    if (contextCapacityConfig && contextCapacityConfig.enabled) {
      const startTime = Date.now();
      logger.info('Step 5.5: Context Pool capacity control');

      const [keptContext, prunedContext] = enforceContextCapacity(
        updatedContext,
        contextCapacityConfig
      );

      if (prunedContext.length > 0) {
        logger.info(`Context Pool capacity control: pruned ${prunedContext.length} observation(s)`, {
          originalCount: updatedContext.length,
          pinnedCount: updatedContext.filter(obs => obs.pinned).length,
          prunedCount: prunedContext.length,
          finalCount: keptContext.length,
        });

        // Archive pruned Context Pool observations
        const contextArchived = archiveObservations(prunedContext, 'context_capacity');
        contextCapacityArchived = contextArchived;

        updatedContext = keptContext;
      }

      const duration = Date.now() - startTime;
      logger.info(`Context Pool capacity enforcement completed in ${duration}ms`);
    } else {
      logger.debug('Context Pool capacity control disabled');
    }

    // Step 6: Archive Cleanup (prune old archived observations)
    logger.info('Step 6: Cleaning up old archives');
    const combinedArchived = [...archivedObs, ...newlyArchived, ...contextCapacityArchived];
    const cleanedArchived = pruneOldArchivedObservations(
      combinedArchived,
      config.learning.retention.archivedDays
    );

    // Step 7: Save State
    logger.info('Step 7: Persisting state');
    await Promise.all([
      saveActiveObservations(updatedActive),
      saveContextObservations(updatedContext),
      saveArchivedObservations(cleanedArchived),
    ]);

    // CLAUDE.md regeneration is now handled by the file watcher
    // (triggered automatically when context.json is saved above)

    const stats = {
      merged: mergedObs.length,
      promoted: promoted.length,
      deleted: toDelete.length,
      archived: newlyArchived.length + contextCapacityArchived.length,
      contextMerged: contextMergeResult.merged,
      contextCapacityArchived: contextCapacityArchived.length,
      finalActiveCount: updatedActive.length,
      finalContextCount: updatedContext.length,
    };

    logger.success('Learning cycle completed', stats);

    return stats;
  } catch (error) {
    logger.error('Learning cycle failed', error);
    throw error;
  }
}

/**
 * Execute merge and promote without new observations
 *
 * Useful for periodic maintenance (decay + cleanup + promotion)
 *
 * @param config - System configuration
 */
export async function executeMaintenanceCycle(
  config: Config
): Promise<void> {
  logger.info('Starting maintenance cycle (no new observations)');

  await executeLearningCycle(config, []);

  logger.success('Maintenance cycle completed');
}
