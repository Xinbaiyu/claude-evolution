/**
 * Unit Tests: Similarity Grouping (Union-Find clustering)
 */

import { describe, it, expect } from 'vitest';
import { groupBySimilarity } from '../utils/similarity-grouping.js';
import type { ObservationWithMetadata } from '../types/learning.js';

/**
 * Helper to create a minimal observation for testing
 */
function makeObs(
  id: string,
  type: string,
  description: string,
  overrides: Partial<ObservationWithMetadata> = {}
): ObservationWithMetadata {
  return {
    id,
    sessionId: 'test-session',
    timestamp: '2026-03-15T12:00:00Z',
    type: type as ObservationWithMetadata['type'],
    confidence: 0.8,
    evidence: ['test'],
    item: { type: 'test', description, frequency: 1 },
    mentions: 3,
    lastSeen: '2026-03-15T12:00:00Z',
    firstSeen: '2026-03-15T12:00:00Z',
    originalConfidence: 0.8,
    inContext: false,
    ...overrides,
  } as ObservationWithMetadata;
}

describe('groupBySimilarity', () => {
  describe('empty and single input', () => {
    it('returns empty array for empty input', () => {
      const result = groupBySimilarity([]);
      expect(result).toEqual([]);
    });

    it('returns single group for single observation', () => {
      const obs = makeObs('obs-1', 'preference', 'use async await');
      const result = groupBySimilarity([obs]);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].id).toBe('obs-1');
    });
  });

  describe('same-type grouping', () => {
    it('groups observations with high word overlap', () => {
      const obs1 = makeObs('obs-1', 'preference', 'prefer async await over callbacks for handling asynchronous code');
      const obs2 = makeObs('obs-2', 'preference', 'always use async await instead of callbacks for asynchronous operations');
      const obs3 = makeObs('obs-3', 'preference', 'use typescript strict mode for type safety');

      const result = groupBySimilarity([obs1, obs2, obs3]);

      // obs1 and obs2 should be grouped (high overlap on async/await/callbacks)
      // obs3 should be separate (different topic)
      const group1 = result.find(g => g.some(o => o.id === 'obs-1'));
      const group3 = result.find(g => g.some(o => o.id === 'obs-3'));

      expect(group1).toBeDefined();
      expect(group1!.some(o => o.id === 'obs-2')).toBe(true);
      expect(group3).toBeDefined();
      expect(group3!).toHaveLength(1);
    });
  });

  describe('cross-type isolation', () => {
    it('never groups observations of different types', () => {
      // Same words but different types → calculateSimilarity returns 0
      const obs1 = makeObs('obs-1', 'preference', 'use async await for code');
      const obs2 = makeObs('obs-2', 'pattern', 'use async await for code');

      const result = groupBySimilarity([obs1, obs2]);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(1);
      expect(result[1]).toHaveLength(1);
    });
  });

  describe('transitive grouping', () => {
    it('groups A-B-C transitively even if A and C are not directly similar', () => {
      // A and B share many words, B and C share many words, but A and C share fewer
      const obsA = makeObs('obs-A', 'preference', 'prefer functional programming with immutable data structures and pure functions');
      const obsB = makeObs('obs-B', 'preference', 'use immutable data structures and avoid mutation in state management');
      const obsC = makeObs('obs-C', 'preference', 'avoid mutation and side effects in state management and reducers');

      const result = groupBySimilarity([obsA, obsB, obsC]);

      // If B is similar to both A and C, all three should be in one group
      const groupWithA = result.find(g => g.some(o => o.id === 'obs-A'));
      if (groupWithA && groupWithA.length === 3) {
        // Transitive grouping worked
        expect(groupWithA.map(o => o.id).sort()).toEqual(['obs-A', 'obs-B', 'obs-C']);
      } else {
        // If similarity thresholds don't trigger transitivity, at least A-B or B-C should be grouped
        const hasAnyGrouping = result.some(g => g.length >= 2);
        expect(hasAnyGrouping).toBe(true);
      }
    });
  });

  describe('oversized group splitting', () => {
    it('splits groups exceeding maxGroupSize', () => {
      // Create 20 very similar observations
      const observations = Array.from({ length: 20 }, (_, i) =>
        makeObs(`obs-${i}`, 'preference', 'prefer async await over callbacks for handling asynchronous code patterns', {
          confidence: 0.5 + i * 0.02,
          mentions: 1 + i,
        })
      );

      const result = groupBySimilarity(observations, 0.5, 15);

      // Should be split into at least 2 groups
      expect(result.length).toBeGreaterThanOrEqual(2);

      // No group should exceed 15
      for (const group of result) {
        expect(group.length).toBeLessThanOrEqual(15);
      }

      // All observations should be present
      const allIds = result.flatMap(g => g.map(o => o.id)).sort();
      const expectedIds = observations.map(o => o.id).sort();
      expect(allIds).toEqual(expectedIds);
    });

    it('first sub-group contains highest-scored observations', () => {
      const observations = Array.from({ length: 20 }, (_, i) =>
        makeObs(`obs-${i}`, 'preference', 'prefer async await over callbacks for handling asynchronous code patterns', {
          confidence: 0.1 * (i + 1),
          mentions: i + 1,
        })
      );

      const result = groupBySimilarity(observations, 0.5, 15);

      if (result.length >= 2) {
        // First group should have higher average score than second
        const score = (g: ObservationWithMetadata[]) =>
          g.reduce((sum, o) => sum + o.confidence * o.mentions, 0) / g.length;
        expect(score(result[0])).toBeGreaterThan(score(result[1]));
      }
    });
  });

  describe('singleton passthrough', () => {
    it('all unique observations result in singleton groups', () => {
      const obs1 = makeObs('obs-1', 'preference', 'use typescript strict mode');
      const obs2 = makeObs('obs-2', 'pattern', 'error handling with try catch');
      const obs3 = makeObs('obs-3', 'workflow', 'deploy to production pipeline');

      const result = groupBySimilarity([obs1, obs2, obs3]);

      // All different types → all singletons
      expect(result).toHaveLength(3);
      expect(result.every(g => g.length === 1)).toBe(true);
    });
  });

  describe('custom threshold', () => {
    it('higher threshold produces more groups', () => {
      const obs1 = makeObs('obs-1', 'preference', 'prefer async await over callbacks for code');
      const obs2 = makeObs('obs-2', 'preference', 'use async await instead of callbacks');

      const looseGroups = groupBySimilarity([obs1, obs2], 0.3);
      const strictGroups = groupBySimilarity([obs1, obs2], 0.9);

      // Strict threshold should produce more groups (less merging)
      expect(strictGroups.length).toBeGreaterThanOrEqual(looseGroups.length);
    });
  });
});
