import { calculateSimilarity } from './llm-merge.js';
import { ObservationWithMetadata } from '../types/learning.js';
import { logger } from '../utils/index.js';

export interface CrossPoolDedupResult {
  /** Observations that should remain in active pool (no match in context) */
  kept: ObservationWithMetadata[];
  /** Observations that matched context pool entries, with match info */
  merged: Array<{
    observation: ObservationWithMetadata;
    matchedContextId: string;
    similarity: number;
  }>;
}

/**
 * Compare merged observations from the active pool against the context pool
 * to prevent duplicate observations from accumulating.
 *
 * For each merged observation, finds the best match in the context pool.
 * If the best match similarity >= threshold, the observation is considered
 * a duplicate and placed in the `merged` result. Otherwise it is `kept`.
 *
 * This function is pure — no IO. The caller (learning-orchestrator) handles
 * updating context pool entries.
 */
export function deduplicateAgainstContextPool(
  mergedObservations: ReadonlyArray<ObservationWithMetadata>,
  contextObservations: ReadonlyArray<ObservationWithMetadata>,
  threshold: number = 0.7,
): CrossPoolDedupResult {
  const kept: ObservationWithMetadata[] = [];
  const merged: CrossPoolDedupResult['merged'] = [];

  for (const observation of mergedObservations) {
    let bestSimilarity = 0;
    let bestMatchId = '';

    for (const contextObs of contextObservations) {
      const similarity = calculateSimilarity(observation, contextObs);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatchId = contextObs.id;
      }
    }

    if (bestSimilarity >= threshold && bestMatchId !== '') {
      merged.push({
        observation,
        matchedContextId: bestMatchId,
        similarity: bestSimilarity,
      });
    } else {
      kept.push(observation);
    }
  }

  logger.info(
    `Cross-pool dedup: ${kept.length} kept, ${merged.length} merged (threshold=${threshold})`,
  );

  return { kept, merged };
}
