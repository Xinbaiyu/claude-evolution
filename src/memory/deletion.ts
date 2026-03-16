/**
 * Deletion Module
 *
 * Implements observation deletion based on decay and inactivity
 */

import { logger } from '../utils/index.js';
import type { ObservationWithMetadata, DeletionConfig } from '../types/learning.js';
import { calculateDecayedConfidence } from './temporal-decay.js';

/**
 * Check if observation should be deleted
 *
 * @param observation - Observation to check
 * @param config - Deletion thresholds
 * @param halfLifeDays - Half-life for decay calculation
 * @returns True if should delete
 */
export function shouldDelete(
  observation: ObservationWithMetadata,
  config: DeletionConfig,
  halfLifeDays: number = 30
): boolean {
  // Never delete observations with manual override
  if (observation.manualOverride) {
    return false;
  }

  // Never delete observations in context
  if (observation.inContext) {
    return false;
  }

  const decayedConfidence = calculateDecayedConfidence(observation, halfLifeDays);

  // Immediate deletion: confidence < immediateThreshold
  if (decayedConfidence < config.immediateThreshold) {
    logger.debug('Immediate deletion triggered', {
      id: observation.id,
      confidence: decayedConfidence.toFixed(2),
      threshold: config.immediateThreshold,
    });
    return true;
  }

  // Delayed deletion: confidence < delayedThreshold AND no growth for N days
  if (decayedConfidence < config.delayedThreshold) {
    const daysSinceLastSeen = calculateDaysSince(observation.lastSeen);

    if (daysSinceLastSeen > config.delayedDays) {
      logger.debug('Delayed deletion triggered', {
        id: observation.id,
        confidence: decayedConfidence.toFixed(2),
        threshold: config.delayedThreshold,
        daysSinceLastSeen: daysSinceLastSeen.toFixed(1),
        delayDays: config.delayedDays,
      });
      return true;
    }
  }

  return false;
}

/**
 * Calculate days since a timestamp
 *
 * @param timestamp - ISO 8601 timestamp
 * @returns Days elapsed
 */
function calculateDaysSince(timestamp: string): number {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  return diffMs / (1000 * 60 * 60 * 24);
}

/**
 * Filter observations for deletion
 *
 * @param observations - Observations to check
 * @param config - Deletion config
 * @param halfLifeDays - Half-life for decay
 * @returns Observations marked for deletion
 */
export function getObservationsToDelete(
  observations: ObservationWithMetadata[],
  config: DeletionConfig,
  halfLifeDays: number = 30
): ObservationWithMetadata[] {
  return observations.filter(obs => shouldDelete(obs, config, halfLifeDays));
}

/**
 * Remove deleted observations from active pool
 *
 * @param observations - All observations
 * @param toDelete - Observations to remove
 * @returns Filtered observations
 */
export function removeDeletedObservations(
  observations: ObservationWithMetadata[],
  toDelete: ObservationWithMetadata[]
): ObservationWithMetadata[] {
  const deleteIds = new Set(toDelete.map(obs => obs.id));
  return observations.filter(obs => !deleteIds.has(obs.id));
}

/**
 * Log deletion events
 *
 * @param observations - Deleted observations
 */
export function logDeletions(observations: ObservationWithMetadata[]): void {
  if (observations.length === 0) {
    logger.info('No observations deleted this cycle');
    return;
  }

  logger.info(`Deleted ${observations.length} observations`, {
    count: observations.length,
    ids: observations.map(obs => obs.id),
  });

  observations.forEach(obs => {
    const decayed = calculateDecayedConfidence(obs);
    logger.debug('Deleted observation', {
      id: obs.id,
      type: obs.type,
      confidence: decayed.toFixed(2),
      mentions: obs.mentions,
      age: calculateDaysSince(obs.firstSeen).toFixed(1) + ' days',
    });
  });
}

/**
 * Calculate deletion statistics
 *
 * @param observations - All observations
 * @param config - Deletion config
 * @param halfLifeDays - Half-life for decay
 * @returns Deletion statistics
 */
export function calculateDeletionStatistics(
  observations: ObservationWithMetadata[],
  config: DeletionConfig,
  halfLifeDays: number = 30
): {
  total: number;
  immediateDelete: number;
  delayedDelete: number;
  protectedCount: number;
} {
  let immediateDelete = 0;
  let delayedDelete = 0;
  let protectedCount = 0;

  observations.forEach(obs => {
    if (obs.manualOverride || obs.inContext) {
      protectedCount++;
      return;
    }

    const decayed = calculateDecayedConfidence(obs, halfLifeDays);

    if (decayed < config.immediateThreshold) {
      immediateDelete++;
    } else if (decayed < config.delayedThreshold) {
      const daysSinceLastSeen = calculateDaysSince(obs.lastSeen);
      if (daysSinceLastSeen > config.delayedDays) {
        delayedDelete++;
      }
    }
  });

  return {
    total: observations.length,
    immediateDelete,
    delayedDelete,
    protectedCount,
  };
}
