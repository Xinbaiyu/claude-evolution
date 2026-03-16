/**
 * Temporal Decay Module
 *
 * Implements exponential decay algorithm inspired by OpenClaw
 */

import { logger } from '../utils/index.js';
import type { ObservationWithMetadata } from '../types/learning.js';

/**
 * Calculate decayed confidence using exponential decay
 *
 * Formula: decayed = original × e^(-λ × age)
 * where λ = ln(2) / halfLifeDays
 *
 * @param originalConfidence - Initial confidence (0-1)
 * @param firstSeenDate - First observation timestamp (ISO 8601)
 * @param halfLifeDays - Half-life in days (default: 30)
 * @returns Decayed confidence (0-1)
 */
export function applyTemporalDecay(
  originalConfidence: number,
  firstSeenDate: string,
  halfLifeDays: number = 30
): number {
  try {
    // Parse timestamps
    const now = Date.now();
    const firstSeen = new Date(firstSeenDate).getTime();

    // Handle invalid or future timestamps (clock skew)
    if (isNaN(firstSeen) || firstSeen > now) {
      logger.warn(`Invalid firstSeen timestamp: ${firstSeenDate}, using current time`);
      return originalConfidence; // No decay for invalid timestamps
    }

    // Calculate age in days
    const ageInMs = now - firstSeen;
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

    // Handle zero age (same-day observation)
    if (ageInDays <= 0) {
      return originalConfidence;
    }

    // Calculate decay multiplier
    // λ = ln(2) / halfLife
    const lambda = Math.log(2) / halfLifeDays;

    // decayed = original × e^(-λ × age)
    const decayMultiplier = Math.exp(-lambda * ageInDays);
    const decayedConfidence = originalConfidence * decayMultiplier;

    // Log extreme decay (>90% loss)
    if (decayedConfidence < originalConfidence * 0.1) {
      logger.warn(
        `Extreme decay detected: ${originalConfidence.toFixed(2)} → ${decayedConfidence.toFixed(2)} ` +
        `(age: ${ageInDays.toFixed(1)} days, half-life: ${halfLifeDays})`
      );
    }

    return Math.max(0, Math.min(1, decayedConfidence)); // Clamp to [0, 1]
  } catch (error) {
    logger.error(`Decay calculation failed for ${firstSeenDate}:`, error);
    return originalConfidence; // Fallback to original on error
  }
}

/**
 * Apply temporal decay to a single observation
 *
 * @param observation - Observation to decay
 * @param halfLifeDays - Half-life in days
 * @returns Decayed confidence value
 */
export function calculateDecayedConfidence(
  observation: ObservationWithMetadata,
  halfLifeDays: number = 30
): number {
  // Use firstSeen for age calculation
  const firstSeen = observation.firstSeen || observation.timestamp;
  return applyTemporalDecay(observation.originalConfidence, firstSeen, halfLifeDays);
}

/**
 * Apply temporal decay to multiple observations
 *
 * Returns observations with updated confidence field (non-mutating)
 *
 * @param observations - Observations to decay
 * @param halfLifeDays - Half-life in days
 * @returns New array with decayed confidences
 */
export function applyDecayToObservations(
  observations: ObservationWithMetadata[],
  halfLifeDays: number = 30
): ObservationWithMetadata[] {
  return observations.map(obs => ({
    ...obs,
    confidence: calculateDecayedConfidence(obs, halfLifeDays),
  }));
}

/**
 * Calculate decay statistics for a set of observations
 *
 * @param observations - Observations to analyze
 * @param halfLifeDays - Half-life in days
 * @returns Decay statistics
 */
export function calculateDecayStatistics(
  observations: ObservationWithMetadata[],
  halfLifeDays: number = 30
): {
  total: number;
  averageDecay: number; // Average percentage decay
  extremeDecay: number; // Count with >50% decay
  minConfidence: number;
  maxConfidence: number;
} {
  if (observations.length === 0) {
    return {
      total: 0,
      averageDecay: 0,
      extremeDecay: 0,
      minConfidence: 0,
      maxConfidence: 0,
    };
  }

  let totalDecay = 0;
  let extremeDecayCount = 0;
  let minConfidence = 1;
  let maxConfidence = 0;

  for (const obs of observations) {
    const decayed = calculateDecayedConfidence(obs, halfLifeDays);
    const decayPercent = (obs.originalConfidence - decayed) / obs.originalConfidence;

    totalDecay += decayPercent;

    if (decayPercent > 0.5) {
      extremeDecayCount++;
    }

    minConfidence = Math.min(minConfidence, decayed);
    maxConfidence = Math.max(maxConfidence, decayed);
  }

  return {
    total: observations.length,
    averageDecay: totalDecay / observations.length,
    extremeDecay: extremeDecayCount,
    minConfidence,
    maxConfidence,
  };
}

/**
 * Log decay audit trail for an observation
 *
 * @param observation - Observation to audit
 * @param halfLifeDays - Half-life used
 */
export function logDecayAudit(
  observation: ObservationWithMetadata,
  halfLifeDays: number = 30
): void {
  const decayed = calculateDecayedConfidence(observation, halfLifeDays);
  const firstSeen = new Date(observation.firstSeen || observation.timestamp);
  const ageInDays = (Date.now() - firstSeen.getTime()) / (1000 * 60 * 60 * 24);

  logger.debug('Decay Audit:', {
    id: observation.id,
    type: observation.type,
    originalConfidence: observation.originalConfidence.toFixed(3),
    decayedConfidence: decayed.toFixed(3),
    decayPercent: ((observation.originalConfidence - decayed) / observation.originalConfidence * 100).toFixed(1) + '%',
    ageInDays: ageInDays.toFixed(1),
    halfLifeDays,
    firstSeen: firstSeen.toISOString(),
  });
}
