/**
 * Capacity Control Module
 *
 * Maintains candidate pool within target size using priority ranking
 */

import { logger } from '../utils/index.js';
import type { ObservationWithMetadata, CapacityConfig, ContextCapacityConfig } from '../types/learning.js';
import { calculateDecayedConfidence } from './temporal-decay.js';

/**
 * Calculate score for observation (used for ranking)
 *
 * Score = decayed confidence × mentions
 *
 * @param observation - Observation to score
 * @param halfLifeDays - Half-life for decay calculation
 * @returns Priority score
 */
export function calculateScore(
  observation: ObservationWithMetadata,
  halfLifeDays: number = 30
): number {
  const decayedConfidence = calculateDecayedConfidence(observation, halfLifeDays);
  return decayedConfidence * observation.mentions;
}

/**
 * Enforce capacity limits on observation pool
 *
 * Prunes lowest-scoring observations to maintain target size
 *
 * @param observations - Current pool
 * @param config - Capacity configuration
 * @param halfLifeDays - Half-life for decay
 * @returns Tuple of [kept observations, pruned observations]
 */
export function enforceCapacity(
  observations: ObservationWithMetadata[],
  config: CapacityConfig,
  halfLifeDays: number = 30
): [ObservationWithMetadata[], ObservationWithMetadata[]] {
  // No action needed if within max size
  if (observations.length <= config.maxSize) {
    logger.debug('Capacity within limits', {
      current: observations.length,
      maxSize: config.maxSize,
    });
    return [observations, []];
  }

  logger.info('Capacity control triggered', {
    current: observations.length,
    target: config.targetSize,
    maxSize: config.maxSize,
  });

  // Separate protected observations (manualOverride exists)
  const protectedObs: ObservationWithMetadata[] = [];
  const unprotectedObs: ObservationWithMetadata[] = [];

  observations.forEach(obs => {
    if (obs.manualOverride) {
      protectedObs.push(obs);
    } else {
      unprotectedObs.push(obs);
    }
  });

  if (protectedObs.length > 0) {
    logger.info(`Protected ${protectedObs.length} observations from capacity control`);
  }

  // Calculate max pruning allowed (30% of unprotected)
  const maxPruneCount = Math.floor(unprotectedObs.length * 0.30);

  // Calculate how many to prune
  const excessCount = observations.length - config.targetSize;
  const pruneCount = Math.min(excessCount, maxPruneCount, unprotectedObs.length);

  if (pruneCount === 0) {
    logger.warn('Cannot enforce capacity - all observations protected or max prune reached');
    return [observations, []];
  }

  // Score and rank unprotected observations
  const scored = unprotectedObs.map(obs => ({
    obs,
    score: calculateScore(obs, halfLifeDays),
  }));

  scored.sort((a, b) => b.score - a.score);

  // Keep top N, prune the rest
  const kept = scored.slice(0, unprotectedObs.length - pruneCount).map(s => s.obs);
  const pruned = scored.slice(unprotectedObs.length - pruneCount).map(s => s.obs);

  // Combine protected + kept
  const finalKept = [...protectedObs, ...kept];

  logger.info('Capacity control complete', {
    originalCount: observations.length,
    protectedCount: protectedObs.length,
    prunedCount: pruned.length,
    finalCount: finalKept.length,
    targetSize: config.targetSize,
  });

  return [finalKept, pruned];
}

/**
 * Archive pruned observations
 *
 * Adds archive metadata to pruned observations
 *
 * @param observations - Observations to archive
 * @param reason - Archive reason
 * @returns Observations with archive metadata
 */
export function archiveObservations(
  observations: ObservationWithMetadata[],
  reason: 'active_capacity' | 'context_capacity' | 'expired' | 'user_deleted' = 'active_capacity'
): ObservationWithMetadata[] {
  const now = new Date().toISOString();

  return observations.map(obs => ({
    ...obs,
    archiveTimestamp: now,
    archiveReason: reason,
  }));
}

/**
 * Prune old archived observations (> retentionDays old)
 *
 * @param archivedObservations - All archived observations
 * @param retentionDays - Days to retain (default 30)
 * @returns Filtered archived observations
 */
export function pruneOldArchivedObservations(
  archivedObservations: ObservationWithMetadata[],
  retentionDays: number = 30
): ObservationWithMetadata[] {
  const now = Date.now();
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

  const kept = archivedObservations.filter(obs => {
    if (!obs.archiveTimestamp) {
      return true; // Keep if no timestamp (shouldn't happen)
    }

    const archiveTime = new Date(obs.archiveTimestamp).getTime();
    const age = now - archiveTime;

    return age < retentionMs;
  });

  const deletedCount = archivedObservations.length - kept.length;

  if (deletedCount > 0) {
    logger.info(`Deleted ${deletedCount} expired archived observations`, {
      retentionDays,
      originalCount: archivedObservations.length,
      keptCount: kept.length,
    });
  }

  return kept;
}

/**
 * Log capacity control actions
 *
 * @param pruned - Pruned observations
 * @param protectedCount - Protected observation count
 */
export function logCapacityControl(
  pruned: ObservationWithMetadata[],
  protectedCount: number
): void {
  if (pruned.length === 0) {
    return;
  }

  logger.info(`Capacity control: pruned ${pruned.length} observations`, {
    count: pruned.length,
    protectedCount,
    prunedIds: pruned.map(obs => obs.id),
  });

  // Log score range of pruned items
  if (pruned.length > 0) {
    const scores = pruned.map(obs => calculateScore(obs));
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    logger.debug('Pruned score range', {
      minScore: minScore.toFixed(2),
      maxScore: maxScore.toFixed(2),
    });
  }
}

/**
 * Calculate capacity statistics
 *
 * @param observations - All observations
 * @param config - Capacity config
 * @returns Capacity statistics
 */
export function calculateCapacityStatistics(
  observations: ObservationWithMetadata[],
  config: CapacityConfig
): {
  current: number;
  target: number;
  maxSize: number;
  utilizationPercent: number;
  needsPruning: boolean;
  protectedCount: number;
} {
  const protectedCount = observations.filter(obs => obs.manualOverride).length;
  const current = observations.length;
  const utilizationPercent = (current / config.maxSize) * 100;
  const needsPruning = current > config.maxSize;

  return {
    current,
    target: config.targetSize,
    maxSize: config.maxSize,
    utilizationPercent,
    needsPruning,
    protectedCount,
  };
}

/**
 * Enforce capacity limits on Context Pool
 *
 * Similar to enforceCapacity but:
 * - Uses longer half-life (default 90 days)
 * - Protects pinned observations (pinned = true)
 * - Archives with 'context_capacity' reason
 *
 * @param observations - Current Context Pool observations
 * @param config - Context Pool capacity configuration
 * @returns Tuple of [kept observations, pruned observations]
 */
export function enforceContextCapacity(
  observations: ObservationWithMetadata[],
  config: ContextCapacityConfig
): [ObservationWithMetadata[], ObservationWithMetadata[]] {
  // No action needed if within max size
  if (observations.length <= config.maxSize) {
    logger.debug('Context Pool capacity within limits', {
      current: observations.length,
      maxSize: config.maxSize,
    });
    return [observations, []];
  }

  logger.info('Context Pool capacity control triggered', {
    current: observations.length,
    target: config.targetSize,
    maxSize: config.maxSize,
  });

  // Separate pinned observations (absolute protection)
  const pinnedObs: ObservationWithMetadata[] = [];
  const unpinnedObs: ObservationWithMetadata[] = [];

  observations.forEach(obs => {
    if (obs.pinned === true) {
      pinnedObs.push(obs);
    } else {
      unpinnedObs.push(obs);
    }
  });

  if (pinnedObs.length > 0) {
    logger.info(`Protected ${pinnedObs.length} pinned observations from Context Pool capacity control`);
  }

  // Calculate how many to prune from unpinned observations
  const targetUnpinned = config.maxSize - pinnedObs.length;
  const pruneCount = Math.max(0, unpinnedObs.length - targetUnpinned);

  if (pruneCount === 0) {
    logger.info('Context Pool capacity control: no pruning needed', {
      pinnedCount: pinnedObs.length,
      unpinnedCount: unpinnedObs.length,
    });
    return [observations, []];
  }

  // Score and rank unpinned observations using Context Pool half-life
  const scored = unpinnedObs.map(obs => ({
    obs,
    score: calculateScore(obs, config.halfLifeDays),
  }));

  scored.sort((a, b) => b.score - a.score);

  // Keep top observations, prune the rest
  const kept = scored.slice(0, unpinnedObs.length - pruneCount).map(s => s.obs);
  const pruned = scored.slice(unpinnedObs.length - pruneCount).map(s => s.obs);

  // Combine pinned + kept
  const finalKept = [...pinnedObs, ...kept];

  logger.info('Context Pool capacity control complete', {
    originalCount: observations.length,
    pinnedCount: pinnedObs.length,
    prunedCount: pruned.length,
    finalCount: finalKept.length,
    targetSize: config.targetSize,
  });

  return [finalKept, pruned];
}

/**
 * Calculate Context Pool capacity statistics
 *
 * @param observations - All Context Pool observations
 * @param config - Context Pool capacity config
 * @returns Capacity statistics
 */
export function calculateContextCapacityStatistics(
  observations: ObservationWithMetadata[],
  config: ContextCapacityConfig
): {
  current: number;
  target: number;
  maxSize: number;
  utilizationPercent: number;
  needsPruning: boolean;
  pinnedCount: number;
} {
  const pinnedCount = observations.filter(obs => obs.pinned === true).length;
  const current = observations.length;
  const utilizationPercent = (current / config.maxSize) * 100;
  const needsPruning = current > config.maxSize;

  return {
    current,
    target: config.targetSize,
    maxSize: config.maxSize,
    utilizationPercent,
    needsPruning,
    pinnedCount,
  };
}
