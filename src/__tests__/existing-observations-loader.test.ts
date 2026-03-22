/**
 * Unit Tests: Existing Observations Loader
 *
 * Tests for loadExistingObservationsSummary which loads context pool
 * and active pool observations, filters, sorts, and formats them as text.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ObservationWithMetadata } from '../types/learning.js';

vi.mock('../../src/memory/observation-manager.js', () => ({
  loadContextObservations: vi.fn(),
  loadActiveObservations: vi.fn(),
}));

vi.mock('../../src/utils/index.js', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  loadContextObservations,
  loadActiveObservations,
} from '../../src/memory/observation-manager.js';
import { loadExistingObservationsSummary } from '../analyzers/existing-observations-loader.js';

const mockedLoadContext = loadContextObservations as ReturnType<typeof vi.fn>;
const mockedLoadActive = loadActiveObservations as ReturnType<typeof vi.fn>;

/**
 * Helper to create an ObservationWithMetadata with sensible defaults.
 */
function makeObservation(
  overrides: Partial<ObservationWithMetadata> & { id: string; type: ObservationWithMetadata['type'] },
): ObservationWithMetadata {
  const now = '2026-03-20T10:00:00Z';
  return {
    sessionId: 'session-1',
    timestamp: now,
    confidence: 0.8,
    evidence: ['evidence-1'],
    item: {},
    mentions: 1,
    lastSeen: now,
    firstSeen: now,
    originalConfidence: 0.8,
    inContext: false,
    ...overrides,
  };
}

function makePreference(
  id: string,
  description: string,
  overrides: Partial<ObservationWithMetadata> = {},
): ObservationWithMetadata {
  return makeObservation({
    id,
    type: 'preference',
    item: {
      type: 'tool',
      description,
      frequency: 3,
      evidence: [],
      confidence: 0.8,
    },
    ...overrides,
  });
}

function makePattern(
  id: string,
  problem: string,
  solution: string,
  overrides: Partial<ObservationWithMetadata> = {},
): ObservationWithMetadata {
  return makeObservation({
    id,
    type: 'pattern',
    item: {
      problem,
      solution,
      occurrences: 2,
      evidence: [],
      confidence: 0.7,
    },
    ...overrides,
  });
}

function makeWorkflow(
  id: string,
  name: string,
  overrides: Partial<ObservationWithMetadata> = {},
): ObservationWithMetadata {
  return makeObservation({
    id,
    type: 'workflow',
    item: {
      name,
      steps: ['build', 'test', 'deploy'],
      frequency: 1,
      evidence: [],
      confidence: 0.9,
    },
    ...overrides,
  });
}

describe('loadExistingObservationsSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedLoadContext.mockResolvedValue([]);
    mockedLoadActive.mockResolvedValue([]);
  });

  it('returns empty string when both pools are empty', async () => {
    const result = await loadExistingObservationsSummary();

    expect(result).toBe('');
    expect(mockedLoadContext).toHaveBeenCalledOnce();
    expect(mockedLoadActive).toHaveBeenCalledOnce();
  });

  it('formats context pool observations correctly (all included regardless of confidence)', async () => {
    const lowConfPref = makePreference('ctx-1', 'Use pnpm', {
      confidence: 0.3,
      mentions: 1,
      inContext: true,
    });
    const lowConfPattern = makePattern('ctx-2', 'Deep nesting', 'Early return', {
      confidence: 0.2,
      mentions: 1,
      inContext: true,
    });

    mockedLoadContext.mockResolvedValue([lowConfPref, lowConfPattern]);

    const result = await loadExistingObservationsSummary();

    expect(result).toContain('- [偏好] Use pnpm');
    expect(result).toContain('- [模式] 问题: Deep nesting → 方案: Early return');
  });

  it('filters active pool by confidence >= 0.7', async () => {
    const highConf = makePreference('active-1', 'Use TypeScript', {
      confidence: 0.8,
      mentions: 2,
    });
    const exactThreshold = makePreference('active-2', 'Use ESLint', {
      confidence: 0.7,
      mentions: 1,
    });
    const lowConf = makePreference('active-3', 'Use Prettier', {
      confidence: 0.69,
      mentions: 5,
    });

    mockedLoadActive.mockResolvedValue([highConf, exactThreshold, lowConf]);

    const result = await loadExistingObservationsSummary();

    expect(result).toContain('Use TypeScript');
    expect(result).toContain('Use ESLint');
    expect(result).not.toContain('Use Prettier');
  });

  it('sorts by importance score (confidence * log2(mentions + 1)) descending', async () => {
    // Score = confidence * Math.log2(Math.max(mentions, 1) + 1)
    // obs-a: 0.9 * log2(11) = 0.9 * 3.459 = 3.113
    // obs-b: 0.75 * log2(21) = 0.75 * 4.459 = 3.344
    // obs-c: 0.95 * log2(2) = 0.95 * 1.0 = 0.95
    const obsA = makePreference('a', 'Obs A', { confidence: 0.9, mentions: 10 });
    const obsB = makePreference('b', 'Obs B', { confidence: 0.75, mentions: 20 });
    const obsC = makePreference('c', 'Obs C', { confidence: 0.95, mentions: 1 });

    mockedLoadActive.mockResolvedValue([obsC, obsA, obsB]);

    const result = await loadExistingObservationsSummary();
    const lines = result.split('\n');

    expect(lines[0]).toContain('Obs B');
    expect(lines[1]).toContain('Obs A');
    expect(lines[2]).toContain('Obs C');
  });

  it('respects maxItems limit (default 30)', async () => {
    const observations = Array.from({ length: 40 }, (_, i) =>
      makePreference(`obs-${i}`, `Preference ${i}`, {
        confidence: 0.8,
        mentions: 1,
      }),
    );

    mockedLoadActive.mockResolvedValue(observations);

    const resultDefault = await loadExistingObservationsSummary();
    const linesDefault = resultDefault.split('\n');
    expect(linesDefault).toHaveLength(30);

    const resultCustom = await loadExistingObservationsSummary(5);
    const linesCustom = resultCustom.split('\n');
    expect(linesCustom).toHaveLength(5);
  });

  it('handles errors gracefully and returns empty string', async () => {
    mockedLoadContext.mockRejectedValue(new Error('File read failed'));

    const result = await loadExistingObservationsSummary();

    expect(result).toBe('');
  });

  it('formats mixed types (preference, pattern, workflow) correctly', async () => {
    const pref = makePreference('mix-1', 'Use pnpm', {
      confidence: 0.85,
      mentions: 3,
    });
    const pattern = makePattern('mix-2', 'Deep nesting', 'Early return', {
      confidence: 0.9,
      mentions: 5,
    });
    const workflow = makeWorkflow('mix-3', 'Deploy flow', {
      confidence: 0.8,
      mentions: 2,
    });

    mockedLoadContext.mockResolvedValue([pref]);
    mockedLoadActive.mockResolvedValue([pattern, workflow]);

    const result = await loadExistingObservationsSummary();

    expect(result).toContain('- [偏好] Use pnpm');
    expect(result).toContain('- [模式] 问题: Deep nesting → 方案: Early return');
    expect(result).toContain('- [工作流] Deploy flow');
  });

  it('deduplicates observations by id (context pool takes precedence)', async () => {
    const contextVersion = makePreference('dup-1', 'Context version', {
      confidence: 0.5,
      mentions: 1,
      inContext: true,
    });
    const activeVersion = makePreference('dup-1', 'Active version', {
      confidence: 0.9,
      mentions: 10,
    });

    mockedLoadContext.mockResolvedValue([contextVersion]);
    mockedLoadActive.mockResolvedValue([activeVersion]);

    const result = await loadExistingObservationsSummary();

    expect(result).toContain('Context version');
    expect(result).not.toContain('Active version');
  });
});
