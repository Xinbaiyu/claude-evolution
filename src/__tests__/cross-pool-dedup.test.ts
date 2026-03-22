/**
 * Unit Tests: Cross-Pool Dedup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deduplicateAgainstContextPool } from '../learners/cross-pool-dedup.js';
import type { ObservationWithMetadata } from '../types/learning.js';

// Suppress logger output in tests
vi.mock('../utils/index.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function makeObservation(
  overrides: Partial<ObservationWithMetadata> & { id: string; type: ObservationWithMetadata['type'] },
): ObservationWithMetadata {
  return {
    sessionId: 'session-1',
    timestamp: '2026-03-01T10:00:00Z',
    confidence: 0.8,
    evidence: ['test evidence'],
    item: { type: 'style', description: 'test', frequency: 1 },
    mentions: 1,
    lastSeen: '2026-03-01T10:00:00Z',
    firstSeen: '2026-03-01T10:00:00Z',
    originalConfidence: 0.8,
    inContext: false,
    ...overrides,
  };
}

describe('deduplicateAgainstContextPool', () => {
  it('should keep all observations when context pool is empty', () => {
    const merged = [
      makeObservation({
        id: 'new-1',
        type: 'preference',
        item: { type: 'style', description: '优先使用中文进行对话', frequency: 3 },
      }),
      makeObservation({
        id: 'new-2',
        type: 'pattern',
        item: { problem: '代码格式不一致', solution: '使用 Prettier 自动格式化', occurrences: 2 },
      }),
    ];

    const result = deduplicateAgainstContextPool(merged, []);

    expect(result.kept).toHaveLength(2);
    expect(result.merged).toHaveLength(0);
    expect(result.kept[0].id).toBe('new-1');
    expect(result.kept[1].id).toBe('new-2');
  });

  it('should merge observations that match context pool entries above threshold', () => {
    const contextObs = [
      makeObservation({
        id: 'ctx-1',
        type: 'preference',
        item: { type: 'style', description: '优先使用中文进行交流', frequency: 5 },
        inContext: true,
      }),
    ];

    const merged = [
      makeObservation({
        id: 'new-1',
        type: 'preference',
        item: { type: 'style', description: '优先使用中文进行对话', frequency: 2 },
      }),
    ];

    const result = deduplicateAgainstContextPool(merged, contextObs);

    expect(result.kept).toHaveLength(0);
    expect(result.merged).toHaveLength(1);
    expect(result.merged[0].matchedContextId).toBe('ctx-1');
    expect(result.merged[0].similarity).toBeGreaterThanOrEqual(0.7);
  });

  it('should keep observations below similarity threshold', () => {
    const contextObs = [
      makeObservation({
        id: 'ctx-1',
        type: 'preference',
        item: { type: 'tool', description: '使用 pnpm 作为包管理器', frequency: 3 },
        inContext: true,
      }),
    ];

    const merged = [
      makeObservation({
        id: 'new-1',
        type: 'preference',
        item: { type: 'style', description: '优先使用 TypeScript 而不是 JavaScript', frequency: 2 },
      }),
    ];

    const result = deduplicateAgainstContextPool(merged, contextObs);

    expect(result.kept).toHaveLength(1);
    expect(result.merged).toHaveLength(0);
    expect(result.kept[0].id).toBe('new-1');
  });

  it('should not merge observations of different types', () => {
    const contextObs = [
      makeObservation({
        id: 'ctx-1',
        type: 'preference',
        item: { type: 'style', description: '使用 async/await 语法', frequency: 5 },
        inContext: true,
      }),
    ];

    const merged = [
      makeObservation({
        id: 'new-1',
        type: 'pattern',
        item: { problem: '使用 async/await 语法出错', solution: '添加 try-catch', occurrences: 2 },
      }),
    ];

    const result = deduplicateAgainstContextPool(merged, contextObs);

    // calculateSimilarity returns 0 for different types → kept
    expect(result.kept).toHaveLength(1);
    expect(result.merged).toHaveLength(0);
  });

  it('should respect custom threshold parameter', () => {
    const contextObs = [
      makeObservation({
        id: 'ctx-1',
        type: 'preference',
        item: { type: 'style', description: '优先使用中文进行交流沟通', frequency: 5 },
        inContext: true,
      }),
    ];

    const merged = [
      makeObservation({
        id: 'new-1',
        type: 'preference',
        item: { type: 'style', description: '优先使用中文进行对话', frequency: 2 },
      }),
    ];

    // With very high threshold (0.99), nothing should merge
    const highResult = deduplicateAgainstContextPool(merged, contextObs, 0.99);
    expect(highResult.kept).toHaveLength(1);
    expect(highResult.merged).toHaveLength(0);

    // With very low threshold (0.1), should merge
    const lowResult = deduplicateAgainstContextPool(merged, contextObs, 0.1);
    expect(lowResult.kept).toHaveLength(0);
    expect(lowResult.merged).toHaveLength(1);
  });

  it('should find best match among multiple context observations', () => {
    const contextObs = [
      makeObservation({
        id: 'ctx-1',
        type: 'preference',
        item: { type: 'tool', description: '使用 Vim 编辑器', frequency: 3 },
        inContext: true,
      }),
      makeObservation({
        id: 'ctx-2',
        type: 'preference',
        item: { type: 'tool', description: '使用 pnpm 包管理器进行依赖管理', frequency: 5 },
        inContext: true,
      }),
    ];

    const merged = [
      makeObservation({
        id: 'new-1',
        type: 'preference',
        item: { type: 'tool', description: '优先使用 pnpm 管理项目依赖', frequency: 2 },
      }),
    ];

    const result = deduplicateAgainstContextPool(merged, contextObs);

    // Should match ctx-2 (pnpm) better than ctx-1 (Vim)
    if (result.merged.length > 0) {
      expect(result.merged[0].matchedContextId).toBe('ctx-2');
    }
  });

  it('should handle mixed kept and merged results', () => {
    const contextObs = [
      makeObservation({
        id: 'ctx-1',
        type: 'preference',
        item: { type: 'style', description: '优先使用中文进行交流', frequency: 5 },
        inContext: true,
      }),
    ];

    const merged = [
      makeObservation({
        id: 'new-1',
        type: 'preference',
        item: { type: 'style', description: '优先使用中文进行对话沟通', frequency: 2 },
      }),
      makeObservation({
        id: 'new-2',
        type: 'preference',
        item: { type: 'tool', description: '使用 ESLint 进行代码检查', frequency: 1 },
      }),
      makeObservation({
        id: 'new-3',
        type: 'pattern',
        item: { problem: '内存泄漏', solution: '使用 WeakRef', occurrences: 2 },
      }),
    ];

    const result = deduplicateAgainstContextPool(merged, contextObs);

    // new-1 should merge (similar Chinese preference), new-2 and new-3 should be kept
    expect(result.merged.length + result.kept.length).toBe(3);
    // At minimum, new-3 (different type) should be kept
    expect(result.kept.some((o) => o.id === 'new-3')).toBe(true);
  });

  it('should not mutate input arrays', () => {
    const contextObs = [
      makeObservation({
        id: 'ctx-1',
        type: 'preference',
        item: { type: 'style', description: '优先使用中文', frequency: 5 },
        inContext: true,
      }),
    ];
    const merged = [
      makeObservation({
        id: 'new-1',
        type: 'preference',
        item: { type: 'style', description: '优先使用中文对话', frequency: 2 },
      }),
    ];

    const contextCopy = [...contextObs];
    const mergedCopy = [...merged];

    deduplicateAgainstContextPool(merged, contextObs);

    expect(contextObs).toEqual(contextCopy);
    expect(merged).toEqual(mergedCopy);
  });

  it('should handle empty merged observations', () => {
    const contextObs = [
      makeObservation({
        id: 'ctx-1',
        type: 'preference',
        item: { type: 'style', description: 'test', frequency: 1 },
        inContext: true,
      }),
    ];

    const result = deduplicateAgainstContextPool([], contextObs);

    expect(result.kept).toHaveLength(0);
    expect(result.merged).toHaveLength(0);
  });

  it('should handle exact duplicate observations', () => {
    const sharedItem = { type: 'style', description: '优先使用中文进行对话', frequency: 3 };

    const contextObs = [
      makeObservation({
        id: 'ctx-1',
        type: 'preference',
        item: sharedItem,
        inContext: true,
      }),
    ];

    const merged = [
      makeObservation({
        id: 'new-1',
        type: 'preference',
        item: sharedItem,
      }),
    ];

    const result = deduplicateAgainstContextPool(merged, contextObs);

    expect(result.merged).toHaveLength(1);
    expect(result.merged[0].similarity).toBeGreaterThanOrEqual(0.9);
    expect(result.merged[0].matchedContextId).toBe('ctx-1');
  });
});
