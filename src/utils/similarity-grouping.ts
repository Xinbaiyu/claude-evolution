/**
 * Similarity Grouping Module
 *
 * Groups observations by type + Jaccard similarity using Union-Find clustering.
 * Used by both llm-merge.ts and context-merge.ts to split large observation sets
 * into small chunks before LLM calls.
 */

import type { ObservationWithMetadata } from '../types/learning.js';
import { calculateSimilarity } from '../learners/llm-merge.js';

/**
 * Union-Find (Disjoint Set) data structure
 */
class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = new Array(size).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // path compression
    }
    return this.parent[x];
  }

  union(x: number, y: number): void {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX === rootY) return;

    // union by rank
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }
  }
}

/**
 * Calculate observation score for ranking (used when splitting oversized groups)
 */
function observationScore(obs: ObservationWithMetadata): number {
  return obs.confidence * obs.mentions;
}

/**
 * Split a group into sub-groups of at most maxSize, sorted by score descending.
 */
function splitOversizedGroup(
  group: ObservationWithMetadata[],
  maxSize: number
): ObservationWithMetadata[][] {
  if (group.length <= maxSize) {
    return [group];
  }

  const sorted = [...group].sort((a, b) => observationScore(b) - observationScore(a));
  const subGroups: ObservationWithMetadata[][] = [];

  for (let i = 0; i < sorted.length; i += maxSize) {
    subGroups.push(sorted.slice(i, i + maxSize));
  }

  return subGroups;
}

/**
 * Group observations by type + Jaccard similarity using Union-Find clustering.
 *
 * @param observations - All observations to group
 * @param threshold - Minimum similarity score to group together (default 0.5)
 * @param maxGroupSize - Maximum observations per group (default 15)
 * @returns Array of observation groups
 */
export function groupBySimilarity(
  observations: ObservationWithMetadata[],
  threshold: number = 0.5,
  maxGroupSize: number = 15
): ObservationWithMetadata[][] {
  if (observations.length === 0) {
    return [];
  }

  if (observations.length === 1) {
    return [[observations[0]]];
  }

  const uf = new UnionFind(observations.length);

  // Compare all pairs and union similar ones
  for (let i = 0; i < observations.length; i++) {
    for (let j = i + 1; j < observations.length; j++) {
      const similarity = calculateSimilarity(observations[i], observations[j]);
      if (similarity > threshold) {
        uf.union(i, j);
      }
    }
  }

  // Collect groups by root
  const groupMap = new Map<number, ObservationWithMetadata[]>();
  for (let i = 0; i < observations.length; i++) {
    const root = uf.find(i);
    const group = groupMap.get(root);
    if (group) {
      group.push(observations[i]);
    } else {
      groupMap.set(root, [observations[i]]);
    }
  }

  // Split oversized groups and flatten
  const result: ObservationWithMetadata[][] = [];
  for (const group of groupMap.values()) {
    result.push(...splitOversizedGroup(group, maxGroupSize));
  }

  return result;
}
