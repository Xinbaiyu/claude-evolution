/**
 * Auto-Promotion Module
 *
 * Implements automatic promotion of high-confidence observations to context
 */

import { logger } from '../utils/index.js';
import type { ObservationWithMetadata, ObservationTier, PromotionConfig } from '../types/learning.js';
import { calculateDecayedConfidence } from './temporal-decay.js';

/**
 * Calculate observation tier based on decayed confidence and mentions
 *
 * @param observation - Observation to classify
 * @param config - Promotion thresholds configuration
 * @param halfLifeDays - Half-life for decay calculation
 * @returns Tier classification
 */
export function calculateTier(
  observation: ObservationWithMetadata,
  config: PromotionConfig,
  halfLifeDays: number = 30
): ObservationTier {
  // Skip if already in context (don't re-promote)
  if (observation.inContext) {
    return 'none';
  }

  // Skip if manually demoted
  if (observation.manualOverride?.action === 'demote') {
    return 'none';
  }

  const decayedConfidence = calculateDecayedConfidence(observation, halfLifeDays);

  // Gold tier: Auto-promote
  if (
    decayedConfidence >= config.autoConfidence &&
    observation.mentions >= config.autoMentions
  ) {
    return 'gold';
  }

  // Silver tier: High-priority for manual review
  if (
    decayedConfidence >= config.highConfidence &&
    observation.mentions >= config.highMentions
  ) {
    return 'silver';
  }

  // Bronze tier: Candidate, keep observing
  if (
    decayedConfidence >= config.candidateConfidence &&
    observation.mentions >= config.candidateMentions
  ) {
    return 'bronze';
  }

  return 'none';
}

/**
 * Check if observation should be auto-promoted
 *
 * @param observation - Observation to check
 * @param config - Promotion thresholds configuration
 * @param halfLifeDays - Half-life for decay calculation
 * @returns True if should auto-promote
 */
export function shouldPromote(
  observation: ObservationWithMetadata,
  config: PromotionConfig,
  halfLifeDays: number = 30
): boolean {
  // Respect manual override (force-promoted or ignored)
  if (observation.manualOverride?.action === 'promote') {
    return false; // Already promoted by manual action
  }

  if (observation.manualOverride?.action === 'ignore') {
    return false; // User chose to ignore, don't auto-promote
  }

  // Check if already promoted
  if (observation.inContext) {
    return false;
  }

  // Auto-promote gold tier only
  const tier = calculateTier(observation, config, halfLifeDays);
  return tier === 'gold';
}

/**
 * Promote observations to context
 *
 * Updates observations with promotion metadata and inContext flag
 *
 * @param observations - Observations to promote
 * @returns Updated observations with promotion metadata
 */
export function promoteToContext(
  observations: ObservationWithMetadata[]
): ObservationWithMetadata[] {
  const now = new Date().toISOString();

  return observations.map(obs => ({
    ...obs,
    inContext: true,
    promotedAt: now,
    promotionReason: 'auto' as const,
  }));
}

/**
 * Check for duplicate observations in context
 *
 * Prevents promoting observations that already exist in context
 *
 * @param candidate - Observation to check
 * @param contextObservations - Existing context observations
 * @returns True if duplicate found
 */
export function isDuplicateInContext(
  candidate: ObservationWithMetadata,
  contextObservations: ObservationWithMetadata[]
): boolean {
  return contextObservations.some(existing => {
    // Same ID
    if (existing.id === candidate.id) {
      return true;
    }

    // Same type and similar content
    if (existing.type !== candidate.type) {
      return false;
    }

    // Type-specific duplicate detection
    if (candidate.type === 'preference') {
      const candidateItem = candidate.item as any;
      const existingItem = existing.item as any;
      return candidateItem.type === existingItem.type;
    }

    if (candidate.type === 'pattern') {
      const candidateItem = candidate.item as any;
      const existingItem = existing.item as any;
      return candidateItem.problem === existingItem.problem;
    }

    if (candidate.type === 'workflow') {
      const candidateItem = candidate.item as any;
      const existingItem = existing.item as any;
      return candidateItem.name === existingItem.name;
    }

    return false;
  });
}

/**
 * Filter observations ready for auto-promotion
 *
 * @param activeObservations - Candidate pool observations
 * @param contextObservations - Existing context observations
 * @param config - Promotion configuration
 * @param halfLifeDays - Half-life for decay
 * @returns Observations ready for promotion
 */
export function getObservationsToPromote(
  activeObservations: ObservationWithMetadata[],
  contextObservations: ObservationWithMetadata[],
  config: PromotionConfig,
  halfLifeDays: number = 30
): ObservationWithMetadata[] {
  return activeObservations.filter(obs => {
    // Check if should promote
    if (!shouldPromote(obs, config, halfLifeDays)) {
      return false;
    }

    // Check for duplicates
    if (isDuplicateInContext(obs, contextObservations)) {
      logger.warn('Duplicate observation detected, skipping promotion', {
        id: obs.id,
        type: obs.type,
      });
      return false;
    }

    return true;
  });
}

/**
 * Log promotion event
 *
 * @param observations - Promoted observations
 */
export function logPromotions(observations: ObservationWithMetadata[]): void {
  if (observations.length === 0) {
    logger.info('No observations promoted this cycle');
    return;
  }

  logger.info(`Auto-promoted ${observations.length} observations`, {
    count: observations.length,
    ids: observations.map(obs => obs.id),
  });

  observations.forEach(obs => {
    const decayed = calculateDecayedConfidence(obs);
    logger.debug('Auto-promoted observation', {
      id: obs.id,
      type: obs.type,
      tier: 'gold',
      confidence: decayed.toFixed(2),
      mentions: obs.mentions,
    });
  });
}

/**
 * Manual promotion with forced metadata
 *
 * Used when user manually promotes an observation via UI
 *
 * @param observation - Observation to promote
 * @returns Updated observation with manual promotion metadata
 */
export function manualPromote(
  observation: ObservationWithMetadata
): ObservationWithMetadata {
  const now = new Date().toISOString();

  return {
    ...observation,
    inContext: true,
    promotedAt: now,
    promotionReason: 'manual',
    // Force high values to prevent auto-demotion
    originalConfidence: 0.95,
    confidence: 0.95,
    mentions: 20,
    manualOverride: {
      action: 'promote',
      timestamp: now,
      reason: 'Manually promoted by user',
    },
  };
}

/**
 * Manual demotion
 *
 * Used when user manually demotes an observation from context
 *
 * @param observation - Observation to demote
 * @returns Updated observation moved back to active pool
 */
export function manualDemote(
  observation: ObservationWithMetadata
): ObservationWithMetadata {
  const now = new Date().toISOString();

  return {
    ...observation,
    inContext: false,
    promotedAt: undefined,
    promotionReason: undefined,
    manualOverride: {
      action: 'demote',
      timestamp: now,
      reason: 'Manually demoted by user',
    },
  };
}

/**
 * Calculate promotion statistics
 *
 * @param observations - All observations
 * @param config - Promotion config
 * @param halfLifeDays - Half-life for decay
 * @returns Statistics by tier
 */
export function calculatePromotionStatistics(
  observations: ObservationWithMetadata[],
  config: PromotionConfig,
  halfLifeDays: number = 30
): {
  total: number;
  gold: number;
  silver: number;
  bronze: number;
  none: number;
  inContext: number;
} {
  let gold = 0;
  let silver = 0;
  let bronze = 0;
  let none = 0;
  let inContext = 0;

  observations.forEach(obs => {
    if (obs.inContext) {
      inContext++;
      return;
    }

    const tier = calculateTier(obs, config, halfLifeDays);
    if (tier === 'gold') gold++;
    else if (tier === 'silver') silver++;
    else if (tier === 'bronze') bronze++;
    else none++;
  });

  return {
    total: observations.length,
    gold,
    silver,
    bronze,
    none,
    inContext,
  };
}
