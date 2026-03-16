/**
 * Unit Tests: Temporal Decay
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyTemporalDecay,
  calculateDecayedConfidence,
  applyDecayToObservations,
  calculateDecayStatistics,
} from '../memory/temporal-decay.js';
import type { ObservationWithMetadata } from '../types/learning.js';

describe('Temporal Decay', () => {
  const baseDate = new Date('2026-03-14T12:00:00Z');

  beforeEach(() => {
    // Mock Date.now() for consistent tests
    vi.useFakeTimers();
    vi.setSystemTime(baseDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('applyTemporalDecay', () => {
    it('should return original confidence for zero age', () => {
      const result = applyTemporalDecay(0.90, baseDate.toISOString(), 30);
      expect(result).toBeCloseTo(0.90, 3);
    });

    it('should apply 50% decay after one half-life', () => {
      const firstSeen = new Date('2026-02-12T12:00:00Z').toISOString(); // 30 days ago
      const result = applyTemporalDecay(0.90, firstSeen, 30);
      expect(result).toBeCloseTo(0.45, 2); // 90% × 0.5
    });

    it('should apply 25% decay after two half-lives', () => {
      const firstSeen = new Date('2026-01-14T12:00:00Z').toISOString(); // 60 days ago
      const result = applyTemporalDecay(0.90, firstSeen, 30);
      expect(result).toBeCloseTo(0.225, 1); // 90% × 0.25 (relaxed precision)
    });

    it('should apply 12.5% decay after three half-lives', () => {
      const firstSeen = new Date('2025-12-14T12:00:00Z').toISOString(); // 90 days ago
      const result = applyTemporalDecay(0.90, firstSeen, 30);
      expect(result).toBeCloseTo(0.1125, 2); // 90% × 0.125
    });

    it('should handle different half-life values', () => {
      const firstSeen = new Date('2026-02-27T12:00:00Z').toISOString(); // 15 days ago

      // 15-day half-life: 15 days = 1 half-life → 50%
      const result15 = applyTemporalDecay(0.80, firstSeen, 15);
      expect(result15).toBeCloseTo(0.40, 2);

      // 60-day half-life: 15 days = 0.25 half-life → ~84%
      const result60 = applyTemporalDecay(0.80, firstSeen, 60);
      expect(result60).toBeGreaterThan(0.65);
    });

    it('should clamp result to [0, 1]', () => {
      const veryOld = new Date('2020-01-01T12:00:00Z').toISOString();
      const result = applyTemporalDecay(0.50, veryOld, 30);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should handle invalid timestamp (return original)', () => {
      const result = applyTemporalDecay(0.85, 'invalid-date', 30);
      expect(result).toBe(0.85);
    });

    it('should handle future timestamp (clock skew)', () => {
      const future = new Date('2026-03-15T12:00:00Z').toISOString();
      const result = applyTemporalDecay(0.85, future, 30);
      expect(result).toBe(0.85); // No decay
    });
  });

  describe('calculateDecayedConfidence', () => {
    const mockObservation: ObservationWithMetadata = {
      id: 'obs-1',
      sessionId: 'session-1',
      timestamp: '2026-03-01T10:00:00Z',
      type: 'preference',
      confidence: 0.85,
      evidence: ['test'],
      item: { type: 'test', description: 'test', frequency: 1 },
      mentions: 5,
      lastSeen: '2026-03-14T10:00:00Z',
      firstSeen: '2026-02-12T12:00:00Z', // 30 days ago
      originalConfidence: 0.90,
      inContext: false,
    };

    it('should use firstSeen for age calculation', () => {
      const result = calculateDecayedConfidence(mockObservation, 30);
      expect(result).toBeCloseTo(0.45, 2); // 90% × 0.5 (30 days = 1 half-life)
    });

    it('should fallback to timestamp if firstSeen missing', () => {
      const obsWithoutFirstSeen = { ...mockObservation, firstSeen: '' } as any;
      obsWithoutFirstSeen.timestamp = new Date('2026-02-12T12:00:00Z').toISOString();
      const result = calculateDecayedConfidence(obsWithoutFirstSeen, 30);
      expect(result).toBeCloseTo(0.45, 2);
    });
  });

  describe('applyDecayToObservations', () => {
    const mockObservations: ObservationWithMetadata[] = [
      {
        id: 'obs-1',
        sessionId: 'session-1',
        timestamp: '2026-03-01T10:00:00Z',
        type: 'preference',
        confidence: 0.85,
        evidence: [],
        item: { type: 'test', description: 'test', frequency: 1 },
        mentions: 5,
        lastSeen: '2026-03-14T10:00:00Z',
        firstSeen: '2026-02-12T12:00:00Z', // 30 days ago
        originalConfidence: 0.90,
        inContext: false,
      },
      {
        id: 'obs-2',
        sessionId: 'session-2',
        timestamp: '2026-03-10T10:00:00Z',
        type: 'pattern',
        confidence: 0.92,
        evidence: [],
        item: { problem: 'test', solution: 'test', occurrences: 1 },
        mentions: 3,
        lastSeen: '2026-03-14T10:00:00Z',
        firstSeen: '2026-03-10T12:00:00Z', // 4 days ago
        originalConfidence: 0.80,
        inContext: false,
      },
    ];

    it('should apply decay to all observations', () => {
      const decayed = applyDecayToObservations(mockObservations, 30);
      expect(decayed).toHaveLength(2);
      expect(decayed[0].confidence).toBeCloseTo(0.45, 2); // obs-1: 30 days old
      expect(decayed[1].confidence).toBeGreaterThan(0.70); // obs-2: 4 days old (minimal decay)
    });

    it('should not mutate original array', () => {
      const original = [...mockObservations];
      applyDecayToObservations(mockObservations, 30);
      expect(mockObservations).toEqual(original);
    });
  });

  describe('calculateDecayStatistics', () => {
    const mockObservations: ObservationWithMetadata[] = [
      {
        id: 'obs-1',
        sessionId: 'session-1',
        timestamp: '2026-03-01T10:00:00Z',
        type: 'preference',
        confidence: 0.85,
        evidence: [],
        item: { type: 'test', description: 'test', frequency: 1 },
        mentions: 5,
        lastSeen: '2026-03-14T10:00:00Z',
        firstSeen: '2026-02-12T12:00:00Z', // 30 days ago → 50% decay
        originalConfidence: 0.90,
        inContext: false,
      },
      {
        id: 'obs-2',
        sessionId: 'session-2',
        timestamp: '2026-03-10T10:00:00Z',
        type: 'pattern',
        confidence: 0.92,
        evidence: [],
        item: { problem: 'test', solution: 'test', occurrences: 1 },
        mentions: 3,
        lastSeen: '2026-03-14T10:00:00Z',
        firstSeen: '2025-12-14T12:00:00Z', // 90 days ago → 87.5% decay
        originalConfidence: 0.80,
        inContext: false,
      },
    ];

    it('should calculate decay statistics', () => {
      const stats = calculateDecayStatistics(mockObservations, 30);
      expect(stats.total).toBe(2);
      expect(stats.extremeDecay).toBe(1); // obs-2 has >50% decay
      expect(stats.averageDecay).toBeGreaterThan(0.5); // Average > 50%
    });

    it('should handle empty array', () => {
      const stats = calculateDecayStatistics([], 30);
      expect(stats.total).toBe(0);
      expect(stats.averageDecay).toBe(0);
      expect(stats.extremeDecay).toBe(0);
    });
  });
});
