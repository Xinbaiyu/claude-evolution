/**
 * Unit Tests: Context Pool LLM Merge
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ObservationWithMetadata } from '../types/learning.js';

// Mock withLLMRetry to call fn once without retries (avoids 10s+ timeout)
vi.mock('../utils/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/index.js')>();
  return {
    ...actual,
    withLLMRetry: async (fn: () => Promise<unknown>) => fn(),
  };
});

// Mock Anthropic SDK so LLM error test doesn't make real HTTP calls
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockRejectedValue(new Error('Mocked API Error')),
      },
    })),
  };
});

import { splitByPinned, mergeContextPool } from '../memory/context-merge.js';

const baseDate = new Date('2026-03-15T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(baseDate);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function makeObs(overrides: Partial<ObservationWithMetadata> = {}): ObservationWithMetadata {
  return {
    id: 'obs-1',
    sessionId: 'session-1',
    timestamp: '2026-03-15T12:00:00Z',
    type: 'preference',
    confidence: 0.90,
    evidence: ['test evidence'],
    item: { type: 'communication', description: 'test', confidence: 0.9, frequency: 10, evidence: ['e'] },
    mentions: 10,
    lastSeen: '2026-03-15T12:00:00Z',
    firstSeen: '2026-03-10T12:00:00Z',
    originalConfidence: 0.90,
    inContext: true,
    promotedAt: '2026-03-12T12:00:00Z',
    promotionReason: 'auto',
    ...overrides,
  };
}

describe('splitByPinned', () => {
  it('should separate pinned and unpinned observations', () => {
    const pinnedObs = makeObs({ id: 'pinned-1', pinned: true });
    const unpinnedObs = makeObs({ id: 'unpinned-1' });

    const { pinned, unpinned } = splitByPinned([pinnedObs, unpinnedObs]);

    expect(pinned).toHaveLength(1);
    expect(pinned[0].id).toBe('pinned-1');
    expect(unpinned).toHaveLength(1);
    expect(unpinned[0].id).toBe('unpinned-1');
  });

  it('should return all pinned when all are pinned', () => {
    const obs1 = makeObs({ id: 'p1', pinned: true });
    const obs2 = makeObs({ id: 'p2', pinned: true });

    const { pinned, unpinned } = splitByPinned([obs1, obs2]);

    expect(pinned).toHaveLength(2);
    expect(unpinned).toHaveLength(0);
  });

  it('should return all unpinned when none are pinned', () => {
    const obs1 = makeObs({ id: 'u1' });
    const obs2 = makeObs({ id: 'u2' });

    const { pinned, unpinned } = splitByPinned([obs1, obs2]);

    expect(pinned).toHaveLength(0);
    expect(unpinned).toHaveLength(2);
  });

  it('should handle empty array', () => {
    const { pinned, unpinned } = splitByPinned([]);

    expect(pinned).toHaveLength(0);
    expect(unpinned).toHaveLength(0);
  });
});

describe('mergeContextPool', () => {
  it('should skip merge when all observations are pinned', async () => {
    const obs1 = makeObs({ id: 'p1', pinned: true });
    const obs2 = makeObs({ id: 'p2', pinned: true });

    const result = await mergeContextPool([obs1, obs2], {});

    expect(result.merged).toBe(0);
    expect(result.conflicts).toBe(0);
    expect(result.observations).toHaveLength(2);
  });

  it('should skip merge when only 1 unpinned observation', async () => {
    const pinnedObs = makeObs({ id: 'p1', pinned: true });
    const unpinnedObs = makeObs({ id: 'u1' });

    const result = await mergeContextPool([pinnedObs, unpinnedObs], {});

    expect(result.merged).toBe(0);
    expect(result.observations).toHaveLength(2);
  });

  it('should skip merge when no API key configured', async () => {
    const obs1 = makeObs({ id: 'u1' });
    const obs2 = makeObs({ id: 'u2' });

    // Remove ANTHROPIC_API_KEY from env
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const result = await mergeContextPool([obs1, obs2], {});

    // Restore
    if (originalKey) {
      process.env.ANTHROPIC_API_KEY = originalKey;
    }

    expect(result.merged).toBe(0);
    expect(result.observations).toHaveLength(2);
  });

  it('should fallback to unmerged pool on LLM error', async () => {
    const obs1 = makeObs({ id: 'u1' });
    const obs2 = makeObs({ id: 'u2' });

    // Use a baseURL that will cause an immediate connection error
    const result = await mergeContextPool([obs1, obs2], {
      apiKey: 'test-key',
      baseURL: 'http://127.0.0.1:1',
    });

    expect(result.merged).toBe(0);
    expect(result.conflicts).toBe(0);
    expect(result.observations).toHaveLength(2);
    expect(result.observations[0].id).toBe('u1');
    expect(result.observations[1].id).toBe('u2');
  });

  it('should preserve pinned observations unchanged after merge', async () => {
    const pinnedObs = makeObs({
      id: 'pinned-1',
      pinned: true,
      item: { type: 'communication', description: 'pinned preference', confidence: 1, frequency: 50, evidence: [] },
    });
    const unpinnedObs1 = makeObs({ id: 'u1' });
    const unpinnedObs2 = makeObs({ id: 'u2' });

    // With no API key, merge is skipped — pinned should still be there
    const result = await mergeContextPool([pinnedObs, unpinnedObs1, unpinnedObs2], {});

    const pinnedResult = result.observations.find(o => o.id === 'pinned-1');
    expect(pinnedResult).toBeDefined();
    expect(pinnedResult?.pinned).toBe(true);
    expect(pinnedResult?.item).toEqual(pinnedObs.item);
  });
});

describe('mergeContextPool with getObservationsToPromote', () => {
  it('should allow same-type observations to be promoted (isDuplicateInContext removed)', async () => {
    // This test verifies the promotion change:
    // Previously, isDuplicateInContext would block same item.type preferences
    // Now they should all be promoted if they reach gold tier
    const { getObservationsToPromote } = await import('../memory/promotion.js');

    const existingContext = makeObs({
      id: 'existing-comm',
      inContext: true,
      item: { type: 'communication', description: 'old communication pref', confidence: 0.9, frequency: 10, evidence: [] },
    });

    const newGoldObs = makeObs({
      id: 'new-comm',
      inContext: false,
      confidence: 0.95,
      originalConfidence: 0.95,
      mentions: 15,
      firstSeen: '2026-03-15T12:00:00Z',
      item: { type: 'communication', description: 'new communication pref', confidence: 0.95, frequency: 15, evidence: [] },
    });

    const config = {
      autoConfidence: 0.90,
      autoMentions: 10,
      highConfidence: 0.75,
      highMentions: 5,
      candidateConfidence: 0.60,
      candidateMentions: 3,
    };

    const toPromote = getObservationsToPromote([newGoldObs], [existingContext], config, 30);

    // Should NOT be blocked — the old isDuplicateInContext would have returned true
    expect(toPromote).toHaveLength(1);
    expect(toPromote[0].id).toBe('new-comm');
  });
});
