/**
 * Unit Tests: Promotion, Deletion, Capacity Control
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateTier,
  shouldPromote,
  promoteToContext,
  isDuplicateInContext,
  manualPromote,
  manualDemote,
} from '../memory/promotion.js';
import {
  shouldDelete,
  getObservationsToDelete,
  removeDeletedObservations,
} from '../memory/deletion.js';
import {
  calculateScore,
  enforceCapacity,
  archiveObservations,
  pruneOldArchivedObservations,
} from '../memory/capacity-control.js';
import type { ObservationWithMetadata, PromotionConfig, DeletionConfig, CapacityConfig } from '../types/learning.js';

const baseDate = new Date('2026-03-15T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(baseDate);
});

afterEach(() => {
  vi.useRealTimers();
});

const mockPromotionConfig: PromotionConfig = {
  autoConfidence: 0.90,
  autoMentions: 10,
  highConfidence: 0.75,
  highMentions: 5,
  candidateConfidence: 0.60,
  candidateMentions: 3,
};

const mockDeletionConfig: DeletionConfig = {
  immediateThreshold: 0.25,
  delayedThreshold: 0.35,
  delayedDays: 14,
};

const mockCapacityConfig: CapacityConfig = {
  targetSize: 50,
  maxSize: 60,
  minSize: 40,
};

describe('Promotion Module', () => {
  const goldObs: ObservationWithMetadata = {
    id: 'gold-1',
    sessionId: 'session-1',
    timestamp: '2026-03-15T12:00:00Z',
    type: 'preference',
    confidence: 0.92,
    evidence: ['test'],
    item: { type: 'test', description: 'test', frequency: 12 },
    mentions: 12,
    lastSeen: '2026-03-15T12:00:00Z',
    firstSeen: '2026-03-15T12:00:00Z', // Same as baseDate (zero decay)
    originalConfidence: 0.92,
    inContext: false,
  };

  const silverObs: ObservationWithMetadata = {
    ...goldObs,
    id: 'silver-1',
    originalConfidence: 0.78,
    confidence: 0.78,
    mentions: 6,
  };

  const bronzeObs: ObservationWithMetadata = {
    ...goldObs,
    id: 'bronze-1',
    originalConfidence: 0.62,
    confidence: 0.62,
    mentions: 3,
  };

  describe('calculateTier', () => {
    it('should classify gold tier observation', () => {
      const tier = calculateTier(goldObs, mockPromotionConfig, 30);
      expect(tier).toBe('gold');
    });

    it('should classify silver tier observation', () => {
      const tier = calculateTier(silverObs, mockPromotionConfig, 30);
      expect(tier).toBe('silver');
    });

    it('should classify bronze tier observation', () => {
      const tier = calculateTier(bronzeObs, mockPromotionConfig, 30);
      expect(tier).toBe('bronze');
    });

    it('should return none for already promoted observation', () => {
      const promoted = { ...goldObs, inContext: true };
      const tier = calculateTier(promoted, mockPromotionConfig, 30);
      expect(tier).toBe('none');
    });
  });

  describe('shouldPromote', () => {
    it('should promote gold tier observation', () => {
      expect(shouldPromote(goldObs, mockPromotionConfig, 30)).toBe(true);
    });

    it('should not promote silver tier observation', () => {
      expect(shouldPromote(silverObs, mockPromotionConfig, 30)).toBe(false);
    });

    it('should not promote if manual override ignore', () => {
      const ignored = {
        ...goldObs,
        manualOverride: { action: 'ignore' as const, timestamp: '2026-03-15T10:00:00Z' },
      };
      expect(shouldPromote(ignored, mockPromotionConfig, 30)).toBe(false);
    });
  });

  describe('promoteToContext', () => {
    it('should add promotion metadata', () => {
      const promoted = promoteToContext([goldObs]);
      expect(promoted[0].inContext).toBe(true);
      expect(promoted[0].promotedAt).toBeDefined();
      expect(promoted[0].promotionReason).toBe('auto');
    });
  });

  describe('isDuplicateInContext', () => {
    it('should detect duplicate by ID', () => {
      const isDup = isDuplicateInContext(goldObs, [goldObs]);
      expect(isDup).toBe(true);
    });

    it('should detect duplicate by content (preference)', () => {
      const similar = { ...goldObs, id: 'different-id' };
      const isDup = isDuplicateInContext(similar, [goldObs]);
      expect(isDup).toBe(true);
    });

    it('should not detect different type as duplicate', () => {
      const different = { ...goldObs, id: 'different-id', type: 'pattern' as const };
      const isDup = isDuplicateInContext(different, [goldObs]);
      expect(isDup).toBe(false);
    });
  });

  describe('manualPromote', () => {
    it('should force high confidence and mentions', () => {
      const result = manualPromote(bronzeObs);
      expect(result.inContext).toBe(true);
      expect(result.originalConfidence).toBe(0.95);
      expect(result.mentions).toBe(20);
      expect(result.promotionReason).toBe('manual');
    });
  });

  describe('manualDemote', () => {
    it('should remove from context', () => {
      const promoted = { ...goldObs, inContext: true };
      const result = manualDemote(promoted);
      expect(result.inContext).toBe(false);
      expect(result.manualOverride?.action).toBe('demote');
    });
  });
});

describe('Deletion Module', () => {
  const lowConfObs: ObservationWithMetadata = {
    id: 'low-1',
    sessionId: 'session-1',
    timestamp: '2026-03-15T10:00:00Z',
    type: 'preference',
    confidence: 0.20,
    evidence: ['test'],
    item: { type: 'test', description: 'test', frequency: 1 },
    mentions: 1,
    lastSeen: '2026-03-01T10:00:00Z', // 14 days ago
    firstSeen: '2025-12-15T10:00:00Z', // 90 days ago → heavily decayed
    originalConfidence: 0.40,
    inContext: false,
  };

  describe('shouldDelete', () => {
    it('should delete observation below immediate threshold', () => {
      expect(shouldDelete(lowConfObs, mockDeletionConfig, 30)).toBe(true);
    });

    it('should not delete observation with manual override', () => {
      const protectedObs = {
        ...lowConfObs,
        manualOverride: { action: 'ignore' as const, timestamp: '2026-03-15T10:00:00Z' },
      };
      expect(shouldDelete(protectedObs, mockDeletionConfig, 30)).toBe(false);
    });

    it('should not delete observation in context', () => {
      const inContext = { ...lowConfObs, inContext: true };
      expect(shouldDelete(inContext, mockDeletionConfig, 30)).toBe(false);
    });
  });

  describe('getObservationsToDelete', () => {
    it('should filter observations for deletion', () => {
      const obs = [lowConfObs, { ...lowConfObs, id: 'low-2' }];
      const toDelete = getObservationsToDelete(obs, mockDeletionConfig, 30);
      expect(toDelete.length).toBe(2);
    });
  });

  describe('removeDeletedObservations', () => {
    it('should remove deleted observations', () => {
      const all = [lowConfObs, { ...lowConfObs, id: 'keep-1', originalConfidence: 0.90 }];
      const toDelete = [lowConfObs];
      const result = removeDeletedObservations(all, toDelete);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('keep-1');
    });
  });
});

describe('Capacity Control Module', () => {
  const highScoreObs: ObservationWithMetadata = {
    id: 'high-1',
    sessionId: 'session-1',
    timestamp: '2026-03-15T12:00:00Z',
    type: 'preference',
    confidence: 0.90,
    evidence: ['test'],
    item: { type: 'test', description: 'test', frequency: 10 },
    mentions: 10,
    lastSeen: '2026-03-15T12:00:00Z',
    firstSeen: '2026-03-15T12:00:00Z', // Same as baseDate (zero decay)
    originalConfidence: 0.90,
    inContext: false,
  };

  const lowScoreObs: ObservationWithMetadata = {
    ...highScoreObs,
    id: 'low-1',
    originalConfidence: 0.40,
    confidence: 0.40,
    mentions: 2,
  };

  describe('calculateScore', () => {
    it('should calculate score as confidence × mentions', () => {
      const score = calculateScore(highScoreObs, 30);
      expect(score).toBeCloseTo(0.90 * 10, 1);
    });
  });

  describe('enforceCapacity', () => {
    it('should not prune if within max size', () => {
      const obs = [highScoreObs, lowScoreObs];
      const [kept, pruned] = enforceCapacity(obs, mockCapacityConfig, 30);
      expect(kept.length).toBe(2);
      expect(pruned.length).toBe(0);
    });

    it('should prune lowest-scoring observations', () => {
      const obs = Array.from({ length: 70 }, (_, i) => ({
        ...highScoreObs,
        id: `obs-${i}`,
        mentions: i, // Different scores
      }));

      const [kept, pruned] = enforceCapacity(obs, mockCapacityConfig, 30);
      expect(kept.length).toBeLessThan(70);
      expect(pruned.length).toBeGreaterThan(0);
    });

    it('should protect observations with manual override', () => {
      const protectedObs = {
        ...lowScoreObs,
        manualOverride: { action: 'ignore' as const, timestamp: '2026-03-15T10:00:00Z' },
      };

      const obs = Array.from({ length: 70 }, (_, i) => ({
        ...highScoreObs,
        id: `obs-${i}`,
        mentions: i,
      }));
      obs.push(protectedObs);

      const [kept] = enforceCapacity(obs, mockCapacityConfig, 30);
      const protectedKept = kept.find(o => o.id === protectedObs.id);
      expect(protectedKept).toBeDefined();
    });
  });

  describe('archiveObservations', () => {
    it('should add archive metadata', () => {
      const archived = archiveObservations([lowScoreObs], 'capacity_control');
      expect(archived[0].archiveTimestamp).toBeDefined();
      expect(archived[0].archiveReason).toBe('capacity_control');
    });
  });

  describe('pruneOldArchivedObservations', () => {
    it('should remove observations older than retention days', () => {
      const old = {
        ...highScoreObs,
        archiveTimestamp: '2026-02-01T10:00:00Z', // 43 days ago
        archiveReason: 'capacity_control' as const,
      };

      const recent = {
        ...highScoreObs,
        id: 'recent-1',
        archiveTimestamp: '2026-03-10T10:00:00Z', // 5 days ago
        archiveReason: 'capacity_control' as const,
      };

      const result = pruneOldArchivedObservations([old, recent], 30);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('recent-1');
    });
  });
});
