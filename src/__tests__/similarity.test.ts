/**
 * Unit Tests: tokenize() and calculateSimilarity()
 *
 * Covers: pure Chinese, pure English, mixed text, empty text,
 * identical text, completely different text, and key field bonus.
 */

import { describe, it, expect } from 'vitest';
import { tokenize, calculateSimilarity } from '../learners/llm-merge.js';
import type { ObservationWithMetadata } from '../types/learning.js';

// ---------------------------------------------------------------------------
// Helper: create a minimal ObservationWithMetadata for testing
// ---------------------------------------------------------------------------

function makeObs(
  overrides: Partial<ObservationWithMetadata> & { type: ObservationWithMetadata['type']; item: any },
): ObservationWithMetadata {
  return {
    id: `test-${Math.random().toString(36).slice(2, 7)}`,
    sessionId: 'test-session',
    timestamp: new Date().toISOString(),
    confidence: 0.8,
    evidence: [],
    mentions: 1,
    lastSeen: new Date().toISOString(),
    firstSeen: new Date().toISOString(),
    originalConfidence: 0.8,
    inContext: false,
    ...overrides,
  };
}

// ===========================================================================
// tokenize()
// ===========================================================================

describe('tokenize', () => {
  it('should extract English words longer than 2 characters', () => {
    const tokens = tokenize('prefer async await over callbacks');
    expect(tokens.has('prefer')).toBe(true);
    expect(tokens.has('async')).toBe(true);
    expect(tokens.has('await')).toBe(true);
    expect(tokens.has('over')).toBe(true);
    expect(tokens.has('callbacks')).toBe(true);
    // Short words should be filtered
    expect(tokens.has('of')).toBe(false);
    expect(tokens.has('a')).toBe(false);
  });

  it('should extract CJK character bigrams', () => {
    const tokens = tokenize('优先使用中文');
    // Expected bigrams: 优先, 先使, 使用, 用中, 中文
    expect(tokens.has('优先')).toBe(true);
    expect(tokens.has('先使')).toBe(true);
    expect(tokens.has('使用')).toBe(true);
    expect(tokens.has('用中')).toBe(true);
    expect(tokens.has('中文')).toBe(true);
    expect(tokens.size).toBe(5);
  });

  it('should handle mixed Chinese and English text', () => {
    const tokens = tokenize('使用 TypeScript 编写代码');
    // CJK bigrams from 使用: 使用
    expect(tokens.has('使用')).toBe(true);
    // English word
    expect(tokens.has('typescript')).toBe(true);
    // CJK bigrams from 编写代码: 编写, 写代, 代码
    expect(tokens.has('编写')).toBe(true);
    expect(tokens.has('写代')).toBe(true);
    expect(tokens.has('代码')).toBe(true);
  });

  it('should return empty set for empty text', () => {
    const tokens = tokenize('');
    expect(tokens.size).toBe(0);
  });

  it('should return empty set for very short tokens only', () => {
    // Only 2-char English words and single CJK character
    const tokens = tokenize('is a 好');
    expect(tokens.size).toBe(0);
  });

  it('should be case-insensitive', () => {
    const tokens = tokenize('TypeScript REACT vue');
    expect(tokens.has('typescript')).toBe(true);
    expect(tokens.has('react')).toBe(true);
    expect(tokens.has('vue')).toBe(true);
  });

  it('should handle JSON-like text (from JSON.stringify)', () => {
    const tokens = tokenize('{"type":"style","description":"优先使用中文进行沟通"}');
    expect(tokens.has('type')).toBe(true);
    expect(tokens.has('style')).toBe(true);
    expect(tokens.has('description')).toBe(true);
    // CJK bigrams
    expect(tokens.has('优先')).toBe(true);
    expect(tokens.has('使用')).toBe(true);
    expect(tokens.has('中文')).toBe(true);
  });
});

// ===========================================================================
// calculateSimilarity()
// ===========================================================================

describe('calculateSimilarity', () => {
  it('should return 0 for different observation types', () => {
    const obs1 = makeObs({
      type: 'preference',
      item: { type: 'style', description: '优先使用中文进行沟通' },
    });
    const obs2 = makeObs({
      type: 'pattern',
      item: { problem: '使用中文', solution: '中文沟通' },
    });
    expect(calculateSimilarity(obs1, obs2)).toBe(0);
  });

  it('should return 1.0 for identical observations', () => {
    const item = { type: 'communication', description: '优先使用中文进行技术沟通' };
    const obs1 = makeObs({ type: 'preference', item });
    const obs2 = makeObs({ type: 'preference', item });
    expect(calculateSimilarity(obs1, obs2)).toBe(1.0);
  });

  it('should return high similarity for similar Chinese text', () => {
    const obs1 = makeObs({
      type: 'preference',
      item: { type: 'communication', description: '优先使用中文进行技术沟通' },
    });
    const obs2 = makeObs({
      type: 'preference',
      item: { type: 'communication', description: '使用中文进行沟通和交互' },
    });
    const sim = calculateSimilarity(obs1, obs2);
    // Should be significantly above 0 thanks to CJK bigrams + field bonus
    expect(sim).toBeGreaterThan(0.3);
  });

  it('should return high similarity for similar English text', () => {
    const obs1 = makeObs({
      type: 'preference',
      item: { type: 'style', description: 'prefer async await over callbacks for handling asynchronous code' },
    });
    const obs2 = makeObs({
      type: 'preference',
      item: { type: 'style', description: 'always use async await instead of callbacks for asynchronous operations' },
    });
    const sim = calculateSimilarity(obs1, obs2);
    expect(sim).toBeGreaterThan(0.3);
  });

  it('should return near 0 for completely different text', () => {
    const obs1 = makeObs({
      type: 'preference',
      item: { type: 'tool', description: '使用 pnpm 作为包管理器' },
    });
    const obs2 = makeObs({
      type: 'preference',
      item: { type: 'style', description: 'prefer early return pattern for readability' },
    });
    const sim = calculateSimilarity(obs1, obs2);
    expect(sim).toBeLessThan(0.2);
  });

  it('should add field bonus for matching preference types', () => {
    const obs1 = makeObs({
      type: 'preference',
      item: { type: 'communication', description: 'something completely unique alpha' },
    });
    const obs2 = makeObs({
      type: 'preference',
      item: { type: 'communication', description: 'something entirely different beta' },
    });
    const simWithBonus = calculateSimilarity(obs1, obs2);

    // Same test but different item.type — no bonus
    const obs3 = makeObs({
      type: 'preference',
      item: { type: 'tool', description: 'something completely unique alpha' },
    });
    const obs4 = makeObs({
      type: 'preference',
      item: { type: 'style', description: 'something entirely different beta' },
    });
    const simWithoutBonus = calculateSimilarity(obs3, obs4);

    // The bonus version should be higher
    expect(simWithBonus).toBeGreaterThan(simWithoutBonus);
  });

  it('should add field bonus for matching pattern problems', () => {
    const obs1 = makeObs({
      type: 'pattern',
      item: { problem: '处理异步错误的最佳方式', solution: '使用 try catch 包装', occurrences: 3 },
    });
    const obs2 = makeObs({
      type: 'pattern',
      item: { problem: '异步错误处理的最佳实践', solution: '使用 promise catch 处理', occurrences: 2 },
    });
    const sim = calculateSimilarity(obs1, obs2);
    // Should get a field bonus because problem texts overlap
    expect(sim).toBeGreaterThan(0.2);
  });

  it('should handle empty item gracefully', () => {
    const obs1 = makeObs({ type: 'preference', item: {} });
    const obs2 = makeObs({ type: 'preference', item: {} });
    const sim = calculateSimilarity(obs1, obs2);
    // Both serialize to "{}" — identical but no useful tokens
    expect(sim).toBeGreaterThanOrEqual(0);
    expect(sim).toBeLessThanOrEqual(1);
  });

  it('should cap similarity at 1.0 even with field bonus', () => {
    // Identical content + matching field type
    const item = { type: 'communication', description: '优先使用中文进行技术沟通' };
    const obs1 = makeObs({ type: 'preference', item });
    const obs2 = makeObs({ type: 'preference', item });
    const sim = calculateSimilarity(obs1, obs2);
    expect(sim).toBeLessThanOrEqual(1.0);
  });
});
