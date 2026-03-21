/**
 * Unit Tests: LLM Merge
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import {
  mergeLLM,
  fallbackNoMerge,
} from '../learners/llm-merge.js';
import type { ObservationWithMetadata } from '../types/learning.js';

describe('LLM Merge', () => {
  const mockOldObservations: ObservationWithMetadata[] = [
    {
      id: 'old-1',
      sessionId: 'session-1',
      timestamp: '2026-03-01T10:00:00Z',
      type: 'preference',
      confidence: 0.85,
      evidence: ['session-1: used async/await'],
      item: {
        type: 'async-await',
        description: 'Prefer async/await over callbacks',
        frequency: 5,
      },
      mentions: 5,
      lastSeen: '2026-03-01T10:00:00Z',
      firstSeen: '2026-02-15T10:00:00Z',
      originalConfidence: 0.85,
      inContext: false,
    },
    {
      id: 'old-2',
      sessionId: 'session-2',
      timestamp: '2026-03-02T10:00:00Z',
      type: 'pattern',
      confidence: 0.75,
      evidence: ['session-2: used early return'],
      item: {
        problem: 'Deep nesting',
        solution: 'Early return pattern',
        occurrences: 3,
      },
      mentions: 3,
      lastSeen: '2026-03-02T10:00:00Z',
      firstSeen: '2026-02-20T10:00:00Z',
      originalConfidence: 0.75,
      inContext: false,
    },
  ];

  const mockNewObservations: ObservationWithMetadata[] = [
    {
      id: 'new-1',
      sessionId: 'session-3',
      timestamp: '2026-03-14T10:00:00Z',
      type: 'preference',
      confidence: 0.90,
      evidence: ['session-3: refactored to async'],
      item: {
        type: 'async-await',
        description: 'Always use async/await syntax',
        frequency: 3,
      },
      mentions: 3,
      lastSeen: '2026-03-14T10:00:00Z',
      firstSeen: '2026-03-14T10:00:00Z',
      originalConfidence: 0.90,
      inContext: false,
    },
  ];

  describe('fallbackNoMerge', () => {
    it('should concatenate old and new observations', () => {
      const result = fallbackNoMerge(mockOldObservations, mockNewObservations);
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('old-1');
      expect(result[2].id).toBe('new-1');
    });

    it('should not mutate input arrays', () => {
      const oldCopy = [...mockOldObservations];
      const newCopy = [...mockNewObservations];
      fallbackNoMerge(mockOldObservations, mockNewObservations);
      expect(mockOldObservations).toEqual(oldCopy);
      expect(mockNewObservations).toEqual(newCopy);
    });
  });

  describe('mergeLLM', () => {
    beforeEach(() => {
      // Mock Anthropic SDK
      vi.mock('@anthropic-ai/sdk');
    });

    it('should throw error when ANTHROPIC_API_KEY not set', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      await expect(
        mergeLLM(mockOldObservations, mockNewObservations)
      ).rejects.toThrow('ANTHROPIC_API_KEY not configured');
    });

    it('should call Anthropic API with correct model', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';

      const mockCreate = vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              {
                observation: {
                  ...mockOldObservations[0],
                  id: 'merged-1',
                  mentions: 8,
                  confidence: 0.90,
                },
                mergedFrom: ['old-1', 'new-1'],
              },
            ]),
          },
        ],
        usage: {
          input_tokens: 1000,
          output_tokens: 500,
        },
      });

      const mockAnthropicInstance = {
        messages: {
          create: mockCreate,
        },
      };

      vi.mocked(Anthropic).mockImplementation(() => mockAnthropicInstance as any);

      const result = await mergeLLM(mockOldObservations, mockNewObservations, {
        apiKey: 'test-key',
      });

      // With chunked strategy: all 3 observations are singletons (Jaccard < 0.5),
      // so Stage 1 makes 0 LLM calls, only Stage 2 fires = 1 call total
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-5-haiku-20241022',
        })
      );
    });

    it('should limit old observations to maxOldObservations', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';

      const manyOldObservations = Array.from({ length: 100 }, (_, i) => ({
        ...mockOldObservations[0],
        id: `old-${i}`,
        mentions: i, // Different scores for ranking
      }));

      const mockCreate = vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              {
                observation: mockOldObservations[0],
                mergedFrom: [],
              },
            ]),
          },
        ],
        usage: { input_tokens: 1000, output_tokens: 500 },
      });

      vi.mocked(Anthropic).mockImplementation(
        () => ({ messages: { create: mockCreate } } as any)
      );

      await mergeLLM(manyOldObservations, mockNewObservations, {
        apiKey: 'test-key',
        maxOldObservations: 10,
      });

      // Check that Stage 1 prompt includes only top 10 old observations
      const stage1Call = mockCreate.mock.calls[0][0];
      const prompt = stage1Call.messages[0].content;
      expect(prompt).toContain('Old Observations (10 items)');
    });

    it('should handle LLM response with markdown code blocks', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';

      const mockMergedObs = {
        ...mockOldObservations[0],
        id: 'merged-1',
        mentions: 8,
      };

      const mockCreate = vi.fn()
        .mockResolvedValueOnce({
          // Stage 1 response with markdown
          content: [
            {
              type: 'text',
              text: `\`\`\`json\n${JSON.stringify([{
                observation: mockMergedObs,
                mergedFrom: ['old-1', 'new-1'],
              }])}\n\`\`\``,
            },
          ],
          usage: { input_tokens: 1000, output_tokens: 500 },
        })
        .mockResolvedValueOnce({
          // Stage 2 response
          content: [
            {
              type: 'text',
              text: JSON.stringify([
                {
                  observation: mockMergedObs,
                  adjustmentReason: 'Test adjustment',
                },
              ]),
            },
          ],
          usage: { input_tokens: 500, output_tokens: 200 },
        });

      vi.mocked(Anthropic).mockImplementation(
        () => ({ messages: { create: mockCreate } } as any)
      );

      // Should not throw error
      const result = await mergeLLM(mockOldObservations, mockNewObservations, {
        apiKey: 'test-key',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('merged-1');
    });
  });
});
