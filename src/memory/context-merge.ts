/**
 * Context Pool LLM Merge Module
 *
 * Merges semantically similar observations in the context pool
 * and resolves conflicts when user preferences have evolved.
 * Pinned observations are excluded from merge processing.
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger, withLLMRetry, groupBySimilarity, pMapLimited, getFulfilledValues } from '../utils/index.js';
import type { ObservationWithMetadata, MergeResult } from '../types/learning.js';

/**
 * Context merge result with statistics
 */
export interface ContextMergeResult {
  observations: ObservationWithMetadata[];
  merged: number;
  conflicts: number;
}

/**
 * Split context pool into pinned and unpinned groups
 */
export function splitByPinned(
  observations: ObservationWithMetadata[]
): { pinned: ObservationWithMetadata[]; unpinned: ObservationWithMetadata[] } {
  const pinned: ObservationWithMetadata[] = [];
  const unpinned: ObservationWithMetadata[] = [];

  for (const obs of observations) {
    if (obs.pinned) {
      pinned.push(obs);
    } else {
      unpinned.push(obs);
    }
  }

  return { pinned, unpinned };
}

/**
 * Create context merge prompt
 *
 * Instructs the LLM to merge similar observations and resolve conflicts.
 */
function createContextMergePrompt(
  observations: ObservationWithMetadata[]
): string {
  return `You are a code learning assistant responsible for consolidating context pool observations.

# Input Data

## Context Pool Observations (${observations.length} items)
${JSON.stringify(observations, null, 2)}

# Task

1. **Merge Similar**: Identify semantically similar observations (same topic/preference) and merge them into one comprehensive observation
2. **Resolve Conflicts**: If two observations contradict each other (e.g., old says "prefer verbose comments", new says "prefer minimal comments"), keep the one with the more recent \`lastSeen\` timestamp. If timestamps are within 24 hours, keep the one with higher \`mentions\` count
3. **Preserve Unique**: Keep all observations that are not similar to any other

# Merge Rules

- **Preference**: Same \`item.type\` + similar \`item.description\` → merge into one with the most complete description
- **Pattern**: Same \`problem\` topic → merge, keeping the most refined solution
- **Workflow**: Same \`name\` or highly similar steps → merge

When merging:
- \`mentions\` = sum of all source mentions
- \`confidence\` = max of all source confidences
- \`evidence\` = concatenate and deduplicate all evidence arrays
- \`lastSeen\` = most recent timestamp
- \`firstSeen\` = earliest timestamp
- \`originalConfidence\` = max of all source originalConfidence values
- \`promotedAt\` = earliest promotedAt from sources
- \`inContext\` = true (always, these are context pool observations)

When resolving conflicts:
- The losing observation is discarded entirely
- The winning observation may have its description updated to reflect the current preference

# Output Format

Return a JSON object with two fields:
- \`results\`: Array where each element contains:
  - \`observation\`: The merged/kept observation object
  - \`mergedFrom\`: Array of source observation IDs (single ID if unchanged, multiple if merged)
  - \`action\`: "kept" | "merged" | "conflict_resolved"
- \`conflictsResolved\`: Number of conflicts that were resolved

CRITICAL: Output ONLY valid JSON, no markdown code blocks, no explanations.

Example:
{
  "results": [
    {
      "observation": { ...merged observation... },
      "mergedFrom": ["id-1", "id-2"],
      "action": "merged"
    },
    {
      "observation": { ...kept observation... },
      "mergedFrom": ["id-3"],
      "action": "kept"
    }
  ],
  "conflictsResolved": 0
}

Begin now. Return only the JSON object.`;
}

/**
 * Attempt to recover complete items from a truncated JSON response.
 *
 * When stop_reason === 'max_tokens', the JSON is cut mid-stream.
 * Finds the last complete object boundary and attempts to parse.
 */
function recoverTruncatedJsonObject(text: string): {
  results: Array<{ observation: ObservationWithMetadata; mergedFrom: string[]; action: string }>;
  conflictsResolved: number;
} | undefined {
  const trimmed = text.trim();

  // Must contain "results" to be valid
  const resultsStart = trimmed.indexOf('"results"');
  if (resultsStart === -1) {
    return undefined;
  }

  // Find the array start after "results":
  const arrayStart = trimmed.indexOf('[', resultsStart);
  if (arrayStart === -1) {
    return undefined;
  }

  // Try to find the last complete object in the results array
  for (let i = trimmed.length - 1; i >= arrayStart; i--) {
    if (trimmed[i] === '}') {
      // Try closing the array and the wrapper object here
      const candidate = trimmed.substring(0, i + 1).trimEnd();
      const cleaned = candidate.replace(/,\s*$/, '') + '], "conflictsResolved": 0}';

      // Also try wrapping from the very beginning
      const objectStart = trimmed.indexOf('{');
      if (objectStart === -1) continue;

      const fullCandidate = trimmed.substring(objectStart, i + 1).trimEnd().replace(/,\s*$/, '') + '], "conflictsResolved": 0}';
      try {
        const parsed = JSON.parse(fullCandidate);
        if (parsed.results && Array.isArray(parsed.results) && parsed.results.length > 0) {
          return parsed;
        }
      } catch {
        // Keep searching backwards
      }
    }
  }

  return undefined;
}

/**
 * Parse LLM response and extract JSON
 */
function parseLLMResponse<T>(response: string): T {
  try {
    return JSON.parse(response);
  } catch (directError) {
    const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // fall through
      }
    }

    const objectMatch = response.match(/\{[\s\S]*"results"[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // fall through
      }
    }

    throw new Error('No valid JSON found in LLM response');
  }
}

/**
 * Ensure merged observations retain correct context pool metadata
 */
function ensureContextMetadata(
  mergeResults: Array<{ observation: ObservationWithMetadata; mergedFrom: string[]; action: string }>,
  sourceObservations: ObservationWithMetadata[]
): ObservationWithMetadata[] {
  const sourceMap = new Map(sourceObservations.map(obs => [obs.id, obs]));

  return mergeResults.map(result => {
    const obs = result.observation;
    const sources = result.mergedFrom
      .map(id => sourceMap.get(id))
      .filter((s): s is ObservationWithMetadata => s !== undefined);

    const earliestPromotedAt = sources
      .map(s => s.promotedAt)
      .filter((t): t is string => t !== undefined)
      .sort()[0];

    return {
      ...obs,
      inContext: true,
      mergedFrom: result.mergedFrom.length > 1 ? result.mergedFrom : obs.mergedFrom,
      promotedAt: earliestPromotedAt ?? obs.promotedAt,
    };
  });
}

/**
 * Merge a single group of context observations using LLM.
 *
 * Returns merged observations + stats. Throws on failure (caller handles isolation).
 */
async function mergeContextGroup(
  group: ObservationWithMetadata[],
  anthropic: Anthropic,
  model: string,
  baseURL?: string
): Promise<{ observations: ObservationWithMetadata[]; merged: number; conflicts: number }> {
  const prompt = createContextMergePrompt(group);

  const response = await withLLMRetry(
    () => anthropic.messages.create({
      model,
      max_tokens: 32000,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    }),
    {
      context: 'Context Pool LLM Merge (group)',
      baseURL,
    }
  );

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in LLM response');
  }

  if (response.stop_reason === 'max_tokens') {
    logger.warn('Context merge group truncated - attempting partial recovery', {
      textLength: textContent.text.length,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });

    const recovered = recoverTruncatedJsonObject(textContent.text);
    if (recovered && recovered.results.length > 0) {
      logger.warn(`Context merge group partial recovery: ${recovered.results.length} items`);
      const mergedObs = ensureContextMetadata(recovered.results, group);
      return {
        observations: mergedObs,
        merged: group.length - mergedObs.length,
        conflicts: recovered.conflictsResolved,
      };
    }

    throw new Error('Context merge group truncation recovery failed');
  }

  const parsed = parseLLMResponse<{
    results: Array<{ observation: ObservationWithMetadata; mergedFrom: string[]; action: string }>;
    conflictsResolved: number;
  }>(textContent.text);

  const mergedObs = ensureContextMetadata(parsed.results, group);

  return {
    observations: mergedObs,
    merged: group.length - mergedObs.length,
    conflicts: parsed.conflictsResolved,
  };
}

/**
 * Merge context pool observations using LLM with chunked strategy.
 *
 * Pre-groups unpinned observations by similarity, processes each group
 * independently (with bounded concurrency), and recombines with pinned observations.
 * Singleton groups skip LLM entirely. Per-group error isolation ensures
 * one group's failure doesn't affect others.
 */
export async function mergeContextPool(
  contextObservations: ObservationWithMetadata[],
  options: {
    apiKey?: string;
    baseURL?: string;
    model?: string;
  } = {}
): Promise<ContextMergeResult> {
  const {
    apiKey = process.env.ANTHROPIC_API_KEY,
    baseURL,
    model = 'claude-3-5-haiku-20241022',
  } = options;

  // Split pinned and unpinned
  const { pinned, unpinned } = splitByPinned(contextObservations);

  // Skip merge if 0 or 1 unpinned observations
  if (unpinned.length <= 1) {
    logger.info('Context merge skipped: too few unpinned observations', {
      pinned: pinned.length,
      unpinned: unpinned.length,
    });
    return {
      observations: contextObservations,
      merged: 0,
      conflicts: 0,
    };
  }

  if (!apiKey && !baseURL) {
    logger.warn('Context merge skipped: no API key configured');
    return {
      observations: contextObservations,
      merged: 0,
      conflicts: 0,
    };
  }

  try {
    const anthropic = new Anthropic({
      apiKey: apiKey || 'dummy-key-for-local-proxy',
      ...(baseURL && { baseURL }),
    });

    // Pre-group by similarity
    const groups = groupBySimilarity(unpinned);

    // Separate singleton groups (no LLM needed) from multi-observation groups
    const singletons: ObservationWithMetadata[] = [];
    const mergeGroups: ObservationWithMetadata[][] = [];

    for (const group of groups) {
      if (group.length === 1) {
        singletons.push(group[0]);
      } else {
        mergeGroups.push(group);
      }
    }

    logger.info('Context pool LLM merge starting (chunked)', {
      total: contextObservations.length,
      pinned: pinned.length,
      unpinned: unpinned.length,
      groups: groups.length,
      singletons: singletons.length,
      mergeGroups: mergeGroups.length,
    });

    const startTime = Date.now();

    // Process merge groups in parallel with concurrency limit
    const groupResults = await pMapLimited(
      mergeGroups,
      (group) => mergeContextGroup(group, anthropic, model, baseURL),
      3
    );

    const duration = Date.now() - startTime;

    // Collect results: fulfilled groups get merged results, rejected groups return unmerged
    let totalMerged = 0;
    let totalConflicts = 0;
    const allMergedObs: ObservationWithMetadata[] = [...singletons];

    for (let i = 0; i < groupResults.length; i++) {
      const result = groupResults[i];
      if (result.status === 'fulfilled') {
        allMergedObs.push(...result.value.observations);
        totalMerged += result.value.merged;
        totalConflicts += result.value.conflicts;
      } else {
        // Error isolation: return group's observations unmerged
        logger.warn(`Context merge group ${i} failed, returning unmerged`, {
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          groupSize: mergeGroups[i].length,
        });
        allMergedObs.push(...mergeGroups[i]);
      }
    }

    // Recombine with pinned observations
    const finalObservations = [...pinned, ...allMergedObs];

    logger.info('Context pool LLM merge complete (chunked)', {
      duration: `${duration}ms`,
      unpinnedBefore: unpinned.length,
      unpinnedAfter: allMergedObs.length,
      merged: totalMerged,
      conflictsResolved: totalConflicts,
      finalTotal: finalObservations.length,
      groupsProcessed: mergeGroups.length,
      singletonsSkipped: singletons.length,
    });

    return {
      observations: finalObservations,
      merged: totalMerged,
      conflicts: totalConflicts,
    };
  } catch (error) {
    logger.warn('Context pool LLM merge failed, using unmerged pool', {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      observations: contextObservations,
      merged: 0,
      conflicts: 0,
    };
  }
}
