/**
 * LLM Merge Module
 *
 * Implements two-stage LLM merge for deduplicating and consolidating observations
 */

import type Anthropic from '@anthropic-ai/sdk';
import { logger, withLLMRetry, groupBySimilarity, pMapLimited, getFulfilledValues } from '../utils/index.js';
import type { ObservationWithMetadata, MergeResult, SimilarityWarning } from '../types/learning.js';
import { loadArchivedObservations, saveArchivedObservations } from '../memory/observation-manager.js';
import { deduplicateAgainstContextPool } from './cross-pool-dedup.js';
import type { Config } from '../config/index.js';
import { createLLMClient } from '../llm/client-factory.js';
import { AnthropicProvider } from '../llm/providers/anthropic.js';

/**
 * Stage 1: Merge and Deduplicate Prompt Template
 *
 * This prompt instructs the LLM to merge similar observations
 */
function createMergeDeduplicatePrompt(
  oldObservations: ObservationWithMetadata[],
  newObservations: ObservationWithMetadata[]
): string {
  return `You are a code learning assistant responsible for merging and deduplicating observation data.

# Input Data

## Old Observations (${oldObservations.length} items)
${JSON.stringify(oldObservations, null, 2)}

## New Observations (${newObservations.length} items)
${JSON.stringify(newObservations, null, 2)}

# Task

1. **Deduplicate**: Identify duplicate or highly similar observations (similarity > 80%)
2. **Merge**: Combine observations on the same topic, preserving the most complete evidence chain
3. **Update**: Update mentions count and lastSeen timestamp
4. **Preserve**: Keep all non-duplicate observations

# Merge Rules

- **Preference**: Same type + similar description → merge
  - Example: "prefer async/await" + "always use async/await" → merge
- **Pattern**: Same problem + similar solution → merge
  - Example: "avoid deep nesting → early return" + "nested if-else → guard clauses" → merge
- **Workflow**: Same name + similar steps → merge
  - Example: Two workflows with same name but slightly different steps → merge

When merging:
- mentions = sum of all mentions
- confidence = max of all confidences
- evidence = concatenate all evidence arrays and deduplicate
- lastSeen = most recent timestamp
- firstSeen = earliest timestamp
- originalConfidence = max of all originalConfidence values

# Output Format

Return a JSON array where each element contains:
- observation: The merged observation object (ObservationWithMetadata)
- mergedFrom: Array of original observation IDs that were merged into this one

CRITICAL: Output ONLY valid JSON, no markdown code blocks, no explanations.

Example output structure:
[
  {
    "observation": {
      "id": "obs-merged-1",
      "sessionId": "session-latest",
      "timestamp": "2026-03-14T12:00:00Z",
      "type": "preference",
      "confidence": 0.92,
      "evidence": ["session-1: used async", "session-2: refactored to async"],
      "item": { "type": "async-await", "description": "Prefer async/await over callbacks", "frequency": 8 },
      "mentions": 8,
      "lastSeen": "2026-03-14T12:00:00Z",
      "firstSeen": "2026-02-15T10:00:00Z",
      "originalConfidence": 0.92,
      "inContext": false
    },
    "mergedFrom": ["obs-1", "obs-2"]
  }
]

Begin merging now. Return only the JSON array.`;
}

/**
 * Stage 2: Confidence Adjustment Prompt Template
 *
 * This prompt instructs the LLM to adjust confidence based on quality signals
 */
function createConfidenceAdjustmentPrompt(
  mergedObservations: ObservationWithMetadata[]
): string {
  return `You are a code learning assistant responsible for adjusting observation confidence based on quality signals.

# Input Data

${JSON.stringify(mergedObservations, null, 2)}

# Task

Adjust confidence (±5%) based on the following factors:

## 1. Evidence Quality
- **High diversity** (evidence from multiple different sessions): +5%
- **Low diversity** (all evidence from single session): -5%

## 2. Description Clarity
- **Specific and actionable** (e.g., "use Zod for input validation"): +5%
- **Vague or generic** (e.g., "write better code"): -5%

## 3. Consistency
- **Consistent with existing rules**: +5%
- **Conflicts with existing rules**: -10%

# Rules

- Maximum adjustment: ±5% per factor
- Total adjustment range: -15% to +15%
- Final confidence must stay within [0, 1]
- originalConfidence should NOT be modified (only confidence field)

# Output Format

Return a JSON array with adjusted observations. Include an "adjustmentReason" field explaining why confidence was changed.

CRITICAL: Output ONLY valid JSON, no markdown code blocks, no explanations.

Example output structure:
[
  {
    "observation": { ...observation with adjusted confidence... },
    "adjustmentReason": "Diverse evidence (+5%), clear description (+5%): +10% total"
  }
]

Begin adjustment now. Return only the JSON array.`;
}

/**
 * Attempt to recover complete items from a truncated JSON array string.
 *
 * When stop_reason === 'max_tokens', the JSON is cut mid-stream.
 * We find the last complete object boundary and close the array.
 *
 * @returns Parsed array if recovery succeeds, undefined otherwise.
 */
function recoverTruncatedJsonArray<T>(text: string): T[] | undefined {
  // Find the last complete object by locating the last "}," or "}" before truncation
  // Strategy: progressively trim from the end to find a valid JSON array
  const trimmed = text.trim();

  // Must start with '[' to be an array
  const arrayStart = trimmed.indexOf('[');
  if (arrayStart === -1) {
    return undefined;
  }

  const arrayContent = trimmed.substring(arrayStart);

  // Find the last complete "}" that could end an object in the array
  let lastValidEnd = -1;
  for (let i = arrayContent.length - 1; i >= 0; i--) {
    if (arrayContent[i] === '}') {
      // Try to close the array here
      const candidate = arrayContent.substring(0, i + 1).trimEnd();
      // Remove trailing comma if present
      const cleaned = candidate.replace(/,\s*$/, '') + ']';
      try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Keep searching backwards
      }
      lastValidEnd = i;
    }
  }

  return undefined;
}

/**
 * Parse LLM response and extract JSON
 *
 * Handles responses with or without markdown code blocks
 */
function parseLLMResponse<T>(response: string): T {
  try {
    // Try direct JSON parse first
    return JSON.parse(response);
  } catch (directError) {
    // Try extracting from markdown code block
    const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (blockError) {
        logger.error('Failed to parse JSON from markdown block', {
          blockContent: jsonMatch[1].substring(0, 500),
          error: blockError instanceof Error ? blockError.message : String(blockError),
        });
      }
    }

    // Try finding JSON array pattern
    const arrayMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (arrayError) {
        logger.error('Failed to parse matched JSON array', {
          arrayContent: arrayMatch[0].substring(0, 500),
          error: arrayError instanceof Error ? arrayError.message : String(arrayError),
        });
      }
    }

    // Log the full response for debugging
    logger.error('No valid JSON found in LLM response', {
      responsePreview: response.substring(0, 1000),
      responseLength: response.length,
      directParseError: directError instanceof Error ? directError.message : String(directError),
      hasMarkdownBlock: !!jsonMatch,
      hasArrayPattern: !!arrayMatch,
    });

    throw new Error('No valid JSON found in LLM response');
  }
}

/**
 * Tokenize text into a set of tokens for similarity comparison.
 * Supports both English words and CJK character bigrams.
 *
 * - English: extracts words via /[a-z]+/g, filters length > 2
 * - CJK: extracts character bigrams from consecutive CJK characters
 * - Mixed text: produces both token types in a single set
 */
export function tokenize(text: string): Set<string> {
  const normalized = text.toLowerCase().trim();
  const tokens = new Set<string>();

  // English words (length > 2)
  const englishWords = normalized.match(/[a-z]+/g) || [];
  for (const w of englishWords) {
    if (w.length > 2) {
      tokens.add(w);
    }
  }

  // CJK character bigrams (CJK Unified Ideographs + Extension A)
  const cjkChars = normalized.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || [];
  for (let i = 0; i < cjkChars.length - 1; i++) {
    tokens.add(cjkChars[i] + cjkChars[i + 1]);
  }

  return tokens;
}

/**
 * Compute Jaccard similarity between two token sets.
 * Returns |intersection| / |union|, or 0 if both sets are empty.
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  let intersectionSize = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersectionSize++;
    }
  }

  const unionSize = a.size + b.size - intersectionSize;
  if (unionSize === 0) {
    return 0;
  }

  return intersectionSize / unionSize;
}

/**
 * Compare key fields of two observations for bonus similarity.
 * Returns a bonus between 0 and 0.15 based on field-level overlap.
 *
 * - preference: same `item.type` → +0.15
 * - pattern: `item.problem` token overlap > 0.5 → +0.15
 * - workflow: `item.name` token overlap > 0.5 → +0.15
 */
function compareKeyFields(obs1: ObservationWithMetadata, obs2: ObservationWithMetadata): number {
  const BONUS = 0.15;

  if (obs1.type === 'preference' && obs2.type === 'preference') {
    const type1 = (obs1.item as any)?.type;
    const type2 = (obs2.item as any)?.type;
    if (type1 && type2 && type1 === type2) {
      return BONUS;
    }
    return 0;
  }

  if (obs1.type === 'pattern' && obs2.type === 'pattern') {
    const problem1 = (obs1.item as any)?.problem || '';
    const problem2 = (obs2.item as any)?.problem || '';
    const sim = jaccardSimilarity(tokenize(problem1), tokenize(problem2));
    return sim > 0.5 ? BONUS : 0;
  }

  if (obs1.type === 'workflow' && obs2.type === 'workflow') {
    const name1 = (obs1.item as any)?.name || '';
    const name2 = (obs2.item as any)?.name || '';
    const sim = jaccardSimilarity(tokenize(name1), tokenize(name2));
    return sim > 0.5 ? BONUS : 0;
  }

  return 0;
}

/**
 * Calculate similarity between two observations using hybrid tokenization.
 * Uses Jaccard similarity on mixed tokens (English words + CJK bigrams)
 * with a key-field matching bonus.
 *
 * Returns a score between 0 and 1.
 */
export function calculateSimilarity(obs1: ObservationWithMetadata, obs2: ObservationWithMetadata): number {
  // Must be same type
  if (obs1.type !== obs2.type) {
    return 0;
  }

  // Normalize and compare item content
  const text1 = JSON.stringify(obs1.item).toLowerCase();
  const text2 = JSON.stringify(obs2.item).toLowerCase();

  // Hybrid tokenization: English words + CJK bigrams
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);

  const tokenSim = jaccardSimilarity(tokens1, tokens2);

  // Key field matching bonus
  const fieldBonus = compareKeyFields(obs1, obs2);

  return Math.min(tokenSim + fieldBonus, 1.0);
}

/**
 * Check if new observation is similar to any archived (deleted) observations
 * Returns similarity warning if match found above threshold
 */
function checkSimilarityToDeleted(
  newObs: ObservationWithMetadata,
  archivedObservations: ObservationWithMetadata[],
  threshold: number = 0.8
): SimilarityWarning | undefined {
  const userDeletedObs = archivedObservations.filter(
    obs => obs.archiveReason?.includes('user_deleted')
  );

  for (const deletedObs of userDeletedObs) {
    const similarity = calculateSimilarity(newObs, deletedObs);

    if (similarity >= threshold) {
      return {
        deletedId: deletedObs.id,
        deletedAt: deletedObs.archiveTimestamp || 'unknown',
        similarity,
      };
    }
  }

  return undefined;
}

/**
 * Check similarity to ignored observations
 *
 * Returns the most similar ignored observation if similarity exceeds threshold.
 * This is used to prevent merging new observations that match previously ignored ones.
 */
function checkSimilarityToIgnoredObservations(
  newObs: ObservationWithMetadata,
  archivedObservations: ObservationWithMetadata[],
  threshold: number = 0.8
): { ignoredObs: ObservationWithMetadata; similarity: number } | undefined {
  // Filter for user-ignored observations
  const ignoredObs = archivedObservations.filter(
    obs => obs.manualOverride?.action === 'ignore'
  );

  if (ignoredObs.length === 0) {
    return undefined;
  }

  // Find the most similar ignored observation
  let mostSimilar: ObservationWithMetadata | undefined;
  let highestSimilarity = 0;

  for (const ignored of ignoredObs) {
    const similarity = calculateSimilarity(newObs, ignored);

    if (similarity >= threshold && similarity > highestSimilarity) {
      mostSimilar = ignored;
      highestSimilarity = similarity;
    }
  }

  if (mostSimilar) {
    return {
      ignoredObs: mostSimilar,
      similarity: highestSimilarity,
    };
  }

  return undefined;
}

/**
 * Calculate score for observation ranking
 */
function calculateObservationScore(obs: ObservationWithMetadata): number {
  return obs.confidence * obs.mentions;
}

/**
 * Limit observations by score (top N)
 */
function limitObservationsByScore(
  observations: ObservationWithMetadata[],
  maxCount: number
): ObservationWithMetadata[] {
  if (observations.length <= maxCount) {
    return observations;
  }

  const scored = observations
    .map(obs => ({ obs, score: calculateObservationScore(obs) }))
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, maxCount).map(s => s.obs);
}

/**
 * Stage 1: Merge and Deduplicate using LLM
 */
async function mergeLLMStage1(
  anthropic: Anthropic,
  oldObservations: ObservationWithMetadata[],
  newObservations: ObservationWithMetadata[],
  model: string = 'claude-3-5-haiku-20241022',
  baseURL?: string
): Promise<MergeResult[]> {
  const prompt = createMergeDeduplicatePrompt(oldObservations, newObservations);

  logger.info('Stage 1: Merging observations', {
    oldCount: oldObservations.length,
    newCount: newObservations.length,
  });

  const startTime = Date.now();

  // 使用重试机制调用 LLM
  const response = await withLLMRetry(
    () => anthropic.messages.create({
      model,
      max_tokens: 32000, // Increased from 16000 to handle larger merges
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
    {
      context: 'LLM Merge Stage 1',
      baseURL,
    }
  );

  const duration = Date.now() - startTime;

  // Extract text content
  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    logger.error('No text content in LLM response', {
      contentTypes: response.content.map(c => c.type),
      stopReason: response.stop_reason,
    });
    throw new Error('No text content in LLM response');
  }

  logger.debug('LLM response received', {
    model: response.model,
    stopReason: response.stop_reason,
    textLength: textContent.text.length,
    textPreview: textContent.text.substring(0, 500),
  });

  // Check if response was truncated
  if (response.stop_reason === 'max_tokens') {
    logger.warn('Stage 1 LLM response truncated - attempting partial recovery', {
      model,
      maxTokens: 32000,
      textLength: textContent.text.length,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });

    const recovered = recoverTruncatedJsonArray<MergeResult>(textContent.text);
    if (recovered && recovered.length > 0) {
      logger.warn(`Stage 1 partial recovery succeeded: ${recovered.length} items recovered from truncated response`);
      return recovered;
    }

    throw new Error('Stage 1 truncation recovery failed - no complete items could be parsed');
  }

  // Parse JSON response
  const mergeResults = parseLLMResponse<MergeResult[]>(textContent.text);

  // Log token usage
  logger.info('Stage 1 complete', {
    duration: `${duration}ms`,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    resultCount: mergeResults.length,
  });

  return mergeResults;
}

/**
 * Stage 2: Adjust Confidence using LLM
 */
async function mergeLLMStage2(
  anthropic: Anthropic,
  mergedObservations: ObservationWithMetadata[],
  model: string = 'claude-3-5-haiku-20241022',
  baseURL?: string
): Promise<ObservationWithMetadata[]> {
  const prompt = createConfidenceAdjustmentPrompt(mergedObservations);

  logger.info('Stage 2: Adjusting confidence', {
    observationCount: mergedObservations.length,
  });

  const startTime = Date.now();

  // 使用重试机制调用 LLM
  const response = await withLLMRetry(
    () => anthropic.messages.create({
      model,
      max_tokens: 40000, // Further increased from 24000 to handle large batches
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
    {
      context: 'LLM Merge Stage 2',
      baseURL,
    }
  );

  const duration = Date.now() - startTime;

  // Extract text content
  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    logger.error('No text content in Stage 2 LLM response', {
      contentTypes: response.content.map(c => c.type),
      stopReason: response.stop_reason,
    });
    throw new Error('No text content in LLM response');
  }

  logger.debug('Stage 2 LLM response received', {
    model: response.model,
    stopReason: response.stop_reason,
    textLength: textContent.text.length,
    textPreview: textContent.text.substring(0, 500),
  });

  // Check if response was truncated
  if (response.stop_reason === 'max_tokens') {
    logger.warn('Stage 2 LLM response truncated - attempting partial recovery', {
      model,
      maxTokens: 40000,
      textLength: textContent.text.length,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });

    const recovered = recoverTruncatedJsonArray<{
      observation: ObservationWithMetadata;
      adjustmentReason: string;
    }>(textContent.text);

    if (recovered && recovered.length > 0) {
      logger.warn(`Stage 2 partial recovery succeeded: ${recovered.length} items recovered from truncated response`);
      // Return recovered observations plus any unprocessed originals
      const recoveredIds = new Set(recovered.map(r => r.observation.id));
      const unprocessed = mergedObservations.filter(obs => !recoveredIds.has(obs.id));
      return [...recovered.map(r => r.observation), ...unprocessed];
    }

    // Recovery failed — return input observations without confidence adjustment
    logger.warn('Stage 2 truncation recovery failed, skipping confidence adjustment');
    return mergedObservations;
  }

  // Parse JSON response
  const adjustmentResults = parseLLMResponse<Array<{
    observation: ObservationWithMetadata;
    adjustmentReason: string;
  }>>(textContent.text);

  // Log token usage and adjustments
  logger.info('Stage 2 complete', {
    duration: `${duration}ms`,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    totalTokens: response.usage.input_tokens + response.usage.output_tokens,
  });

  adjustmentResults.forEach(result => {
    logger.debug('Confidence adjusted', {
      id: result.observation.id,
      reason: result.adjustmentReason,
    });
  });

  return adjustmentResults.map(r => r.observation);
}

/**
 * Detect merge quality issues
 *
 * Warns if merge reduced observation count by > 50%
 */
function detectMergeQualityIssues(
  inputCount: number,
  outputCount: number
): boolean {
  const reductionPercent = ((inputCount - outputCount) / inputCount) * 100;

  if (reductionPercent > 50) {
    logger.warn('Aggressive merge detected', {
      inputCount,
      outputCount,
      reductionPercent: reductionPercent.toFixed(1) + '%',
      message: 'More than 50% of observations were merged - review quality',
    });
    return true;
  }

  logger.info('Merge quality check passed', {
    inputCount,
    outputCount,
    reductionPercent: reductionPercent.toFixed(1) + '%',
  });

  return false;
}

/**
 * Main LLM Merge Function
 *
 * Merges old and new observations using two-stage LLM process
 * Also checks for similarity to deleted observations
 */
export async function mergeLLM(
  oldObservations: ObservationWithMetadata[],
  newObservations: ObservationWithMetadata[],
  options: {
    config: Config;
    maxOldObservations?: number;
    maxNewObservations?: number;
    checkDeletedSimilarity?: boolean;
    contextPoolObservations?: ObservationWithMetadata[];
  }
): Promise<ObservationWithMetadata[]> {
  const {
    config,
    maxOldObservations = 50,
    maxNewObservations = 20,
    checkDeletedSimilarity = true,
    contextPoolObservations: contextPoolObs = [],
  } = options;

  // Use unified LLM client factory
  const llmProvider = await createLLMClient(config);

  // Get underlying Anthropic client (needed for direct API calls)
  if (!(llmProvider instanceof AnthropicProvider)) {
    throw new Error('LLM merge currently requires Anthropic provider');
  }
  const anthropic = llmProvider.getClient();
  const model = config.llm.model;
  const baseURL = config.llm.baseURL;

  // Load archived observations for similarity checking
  let archivedObservations: ObservationWithMetadata[] = [];
  if (checkDeletedSimilarity) {
    try {
      archivedObservations = await loadArchivedObservations();
      logger.info(`Loaded ${archivedObservations.length} archived observations for similarity check`);
    } catch (error) {
      logger.warn('Failed to load archived observations:', error);
    }
  }

  // Limit input size for cost control
  const limitedOld = limitObservationsByScore(oldObservations, maxOldObservations);
  const limitedNew = limitObservationsByScore(newObservations, maxNewObservations);

  if (limitedOld.length < oldObservations.length) {
    logger.info(`Limited old observations: ${oldObservations.length} → ${limitedOld.length}`);
  }
  if (limitedNew.length < newObservations.length) {
    logger.info(`Limited new observations: ${newObservations.length} → ${limitedNew.length}`);
  }

  const totalInput = limitedOld.length + limitedNew.length;

  try {
    // Stage 1: Chunked Merge and Deduplicate
    // Pre-group all observations by similarity, process each group independently
    const allInputObs = [...limitedOld, ...limitedNew];
    const groups = groupBySimilarity(allInputObs);

    // Separate singletons from multi-observation groups
    const singletons: MergeResult[] = [];
    const mergeGroups: ObservationWithMetadata[][] = [];

    for (const group of groups) {
      if (group.length === 1) {
        singletons.push({ observation: group[0], mergedFrom: [group[0].id] });
      } else {
        mergeGroups.push(group);
      }
    }

    logger.info('Stage 1: Chunked merge starting', {
      totalInput,
      groups: groups.length,
      singletons: singletons.length,
      mergeGroups: mergeGroups.length,
    });

    // Process merge groups in parallel with concurrency limit
    const groupResults = await pMapLimited(
      mergeGroups,
      (group) => {
        // Split group into "old" and "new" based on whether they were in limitedOld or limitedNew
        const oldIds = new Set(limitedOld.map(o => o.id));
        const groupOld = group.filter(o => oldIds.has(o.id));
        const groupNew = group.filter(o => !oldIds.has(o.id));
        return mergeLLMStage1(anthropic, groupOld, groupNew, model, baseURL);
      },
      3
    );

    // Combine results: fulfilled groups get merged results, rejected groups return unmerged
    const allMergeResults: MergeResult[] = [...singletons];

    for (let i = 0; i < groupResults.length; i++) {
      const result = groupResults[i];
      if (result.status === 'fulfilled') {
        allMergeResults.push(...result.value);
      } else {
        // Error isolation: return group's observations unmerged
        logger.warn(`Stage 1 group ${i} failed, returning unmerged`, {
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          groupSize: mergeGroups[i].length,
        });
        for (const obs of mergeGroups[i]) {
          allMergeResults.push({ observation: obs, mergedFrom: [obs.id] });
        }
      }
    }

    // Extract observations from merge results
    const mergedObservations = allMergeResults.map(r => r.observation);

    // Check merge quality
    const hasQualityIssue = detectMergeQualityIssues(totalInput, mergedObservations.length);

    if (hasQualityIssue) {
      // TODO: Optionally prompt user to review merge
    }

    // Stage 2: Adjust Confidence
    const adjustedObservations = await mergeLLMStage2(anthropic, mergedObservations, model, baseURL);

    // Stage 2.5: Check similarity to ignored observations and inherit ignore state
    const observationsAfterIgnoreCheck: ObservationWithMetadata[] = [];
    const toArchive: ObservationWithMetadata[] = [];

    for (const obs of adjustedObservations) {
      if (checkDeletedSimilarity && archivedObservations.length > 0) {
        const similarIgnored = checkSimilarityToIgnoredObservations(obs, archivedObservations);

        if (similarIgnored) {
          // Found similar ignored observation - inherit ignore state
          logger.info(
            `Observation ${obs.id.slice(0, 8)} similar to ignored observation ${similarIgnored.ignoredObs.id.slice(0, 8)} (${(similarIgnored.similarity * 100).toFixed(0)}%) - inheriting ignore state`
          );

          const ignoredObs: ObservationWithMetadata = {
            ...obs,
            manualOverride: {
              action: 'ignore',
              timestamp: new Date().toISOString(),
              inheritedFrom: similarIgnored.ignoredObs.id,
            },
            mergeInfo: {
              mergedFromIgnored: true,
              originalIgnoredId: similarIgnored.ignoredObs.id,
            },
            archiveReason: 'user_ignored',
          };

          toArchive.push(ignoredObs);
          continue; // Skip adding to active observations
        }
      }

      observationsAfterIgnoreCheck.push(obs);
    }

    // Log ignored observations count
    if (toArchive.length > 0) {
      logger.info(
        `${toArchive.length} observation(s) inherited ignore state and will be auto-archived`,
        {
          ids: toArchive.map(o => o.id.slice(0, 8)),
        }
      );
    }

    // Stage 3: Cross-pool deduplication
    let observationsForDeletedCheck = observationsAfterIgnoreCheck;
    let crossPoolMatchCount = 0;
    if (contextPoolObs.length > 0) {
      const crossPoolResult = deduplicateAgainstContextPool(
        observationsAfterIgnoreCheck,
        contextPoolObs,
      );
      crossPoolMatchCount = crossPoolResult.merged.length;
      if (crossPoolMatchCount > 0) {
        logger.info(`Cross-pool dedup: ${crossPoolMatchCount} observation(s) matched context pool entries`);
      }
      observationsForDeletedCheck = crossPoolResult.kept;
    }

    // Stage 4: Check similarity to deleted observations
    const finalObservations = observationsForDeletedCheck.map(obs => {
      if (checkDeletedSimilarity && archivedObservations.length > 0) {
        const similarityWarning = checkSimilarityToDeleted(obs, archivedObservations);
        if (similarityWarning) {
          logger.info(`Observation ${obs.id.slice(0, 8)} similar to deleted observation ${similarityWarning.deletedId.slice(0, 8)} (${(similarityWarning.similarity * 100).toFixed(0)}%)`);
          return {
            ...obs,
            similarToDeleted: similarityWarning,
          };
        }
      }
      return obs;
    });

    // Save auto-archived observations (those that inherited ignore state)
    if (toArchive.length > 0) {
      try {
        const currentArchived = await loadArchivedObservations();
        const updatedArchived = [...currentArchived, ...toArchive];
        await saveArchivedObservations(updatedArchived);
        logger.info(`Auto-archived ${toArchive.length} observation(s) with inherited ignore state`);
      } catch (error) {
        logger.error('Failed to save auto-archived observations:', error);
        // Continue processing - don't fail the merge due to archive error
      }
    }

    logger.info('LLM merge complete', {
      oldCount: oldObservations.length,
      newCount: newObservations.length,
      inputCount: totalInput,
      outputCount: finalObservations.length,
      ignoredInherited: toArchive.length,
      crossPoolMatches: crossPoolMatchCount,
      similarityWarnings: finalObservations.filter(o => o.similarToDeleted).length,
    });

    return finalObservations;
  } catch (error) {
    logger.error('LLM merge failed, falling back to no-merge strategy', {
      error: error instanceof Error ? error.message : String(error),
    });
    return fallbackNoMerge(limitedOld, limitedNew);
  }
}

/**
 * Fallback strategy: No-merge mode
 *
 * Returns old + new observations without merging (fallback when LLM fails)
 */
export function fallbackNoMerge(
  oldObservations: ObservationWithMetadata[],
  newObservations: ObservationWithMetadata[]
): ObservationWithMetadata[] {
  logger.warn('Using fallback no-merge strategy - observations will not be deduplicated');
  return [...oldObservations, ...newObservations];
}
