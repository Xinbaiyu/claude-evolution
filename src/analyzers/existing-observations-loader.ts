/**
 * Existing Observations Loader
 *
 * Loads and formats existing observations (context pool + high-confidence
 * active pool) as a text summary for injection into the extraction prompt.
 * This prevents the LLM from re-extracting observations the system already knows.
 */

import {
  loadContextObservations,
  loadActiveObservations,
} from '../memory/observation-manager.js';
import { logger } from '../utils/index.js';
import type { ObservationWithMetadata } from '../types/learning.js';

/**
 * Minimum confidence threshold for active pool observations to be included.
 */
const ACTIVE_POOL_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Format a single observation as a concise one-line summary.
 */
function formatObservationSummary(obs: ObservationWithMetadata): string {
  const item = obs.item as unknown as Record<string, unknown>;

  switch (obs.type) {
    case 'preference':
      return `- [偏好] ${item.description || ''}`;
    case 'pattern':
      return `- [模式] 问题: ${item.problem || ''} → 方案: ${item.solution || ''}`;
    case 'workflow':
      return `- [工作流] ${item.name || ''}`;
    default:
      return `- [${obs.type}] ${JSON.stringify(item).slice(0, 80)}`;
  }
}

/**
 * Compute a sort score for ranking observations by importance.
 * Higher = more important (should appear first in the summary).
 */
function observationScore(obs: ObservationWithMetadata): number {
  return obs.confidence * Math.log2(Math.max(obs.mentions, 1) + 1);
}

/**
 * Load existing observations from both pools and format as a text summary.
 *
 * - Context pool: all observations (these are already promoted / high-value)
 * - Active pool: only those with confidence > threshold
 * - Combined, deduplicated by id, sorted by importance, limited to maxItems
 *
 * Returns empty string if no observations are available.
 */
export async function loadExistingObservationsSummary(
  maxItems: number = 30,
): Promise<string> {
  try {
    const [contextObs, activeObs] = await Promise.all([
      loadContextObservations(),
      loadActiveObservations(),
    ]);

    // Active pool: filter by confidence threshold
    const highConfActive = activeObs.filter(
      (obs) => obs.confidence >= ACTIVE_POOL_CONFIDENCE_THRESHOLD,
    );

    // Merge and deduplicate by id (context pool takes precedence)
    const seen = new Set<string>();
    const combined: ObservationWithMetadata[] = [];

    for (const obs of contextObs) {
      if (!seen.has(obs.id)) {
        seen.add(obs.id);
        combined.push(obs);
      }
    }

    for (const obs of highConfActive) {
      if (!seen.has(obs.id)) {
        seen.add(obs.id);
        combined.push(obs);
      }
    }

    if (combined.length === 0) {
      return '';
    }

    // Sort by importance score (descending) and take top N
    const sorted = [...combined].sort(
      (a, b) => observationScore(b) - observationScore(a),
    );
    const limited = sorted.slice(0, maxItems);

    // Format each observation as a one-line summary
    const lines = limited.map(formatObservationSummary);

    logger.debug(
      `已加载 ${limited.length} 条已有观察摘要 (context: ${contextObs.length}, active高置信: ${highConfActive.length})`,
    );

    return lines.join('\n');
  } catch (error) {
    logger.warn('加载已有观察摘要失败，将跳过注入:', error);
    return '';
  }
}
