/**
 * Concurrent Execution Utilities
 *
 * Provides bounded-concurrency parallel execution for LLM calls.
 */

import { logger } from './logger.js';

/**
 * Result of a single item in pMapLimited - mirrors Promise.allSettled semantics.
 */
export type SettledResult<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: unknown };

/**
 * Execute an async function over an array of items with bounded concurrency.
 * Uses allSettled semantics: individual failures don't abort other items.
 *
 * @param items - Array of items to process
 * @param fn - Async function to apply to each item
 * @param concurrency - Maximum concurrent executions (default 3)
 * @returns Array of settled results in the same order as input items
 */
export async function pMapLimited<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number = 3
): Promise<SettledResult<R>[]> {
  if (items.length === 0) {
    return [];
  }

  const results: SettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      try {
        const value = await fn(items[currentIndex], currentIndex);
        results[currentIndex] = { status: 'fulfilled', value };
      } catch (reason) {
        results[currentIndex] = { status: 'rejected', reason };
        logger.warn(`pMapLimited: item ${currentIndex} failed`, {
          error: reason instanceof Error ? reason.message : String(reason),
        });
      }
    }
  }

  // Launch workers up to the concurrency limit
  const workerCount = Math.min(concurrency, items.length);
  const workers: Promise<void>[] = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  return results;
}

/**
 * Convenience: extract fulfilled values from settled results, discarding failures.
 */
export function getFulfilledValues<T>(results: SettledResult<T>[]): T[] {
  return results
    .filter((r): r is { status: 'fulfilled'; value: T } => r.status === 'fulfilled')
    .map(r => r.value);
}
