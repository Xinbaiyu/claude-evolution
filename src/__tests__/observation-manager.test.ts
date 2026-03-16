/**
 * Unit Tests: Observation Manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import {
  loadActiveObservations,
  saveActiveObservations,
  loadContextObservations,
  saveContextObservations,
  loadArchivedObservations,
  saveArchivedObservations,
  getObservationPaths,
  ensureMemoryDirectory,
} from '../memory/observation-manager.js';
import type { ObservationWithMetadata } from '../types/learning.js';

describe('Observation Manager', () => {
  const testDir = path.join(process.cwd(), '.test-memory');
  const mockObservations: ObservationWithMetadata[] = [
    {
      id: 'obs-1',
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
      id: 'obs-2',
      sessionId: 'session-2',
      timestamp: '2026-03-02T10:00:00Z',
      type: 'pattern',
      confidence: 0.92,
      evidence: ['session-2: refactored nested if'],
      item: {
        problem: 'Deep nesting',
        solution: 'Early return pattern',
        occurrences: 8,
      },
      mentions: 8,
      lastSeen: '2026-03-02T10:00:00Z',
      firstSeen: '2026-02-20T10:00:00Z',
      originalConfidence: 0.92,
      inContext: true,
      promotedAt: '2026-03-02T10:00:00Z',
      promotionReason: 'auto',
    },
  ];

  beforeEach(async () => {
    // Set test directory via environment variable
    process.env.CLAUDE_EVOLUTION_DIR = testDir;
    await ensureMemoryDirectory();
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.remove(testDir);
    delete process.env.CLAUDE_EVOLUTION_DIR;
  });

  describe('ensureMemoryDirectory', () => {
    it('should create memory/observations directory', async () => {
      const { memoryDir } = getObservationPaths();
      const exists = await fs.pathExists(memoryDir);
      expect(exists).toBe(true);
    });
  });

  describe('loadActiveObservations', () => {
    it('should return empty array when file does not exist', async () => {
      const observations = await loadActiveObservations();
      expect(observations).toEqual([]);
    });

    it('should load observations from active.json', async () => {
      await saveActiveObservations(mockObservations);
      const observations = await loadActiveObservations();
      expect(observations).toHaveLength(2);
      expect(observations[0].id).toBe('obs-1');
    });

    it('should throw error for invalid schema', async () => {
      const { active } = getObservationPaths();
      await fs.writeJSON(active, [{ invalid: 'data' }]);
      await expect(loadActiveObservations()).rejects.toThrow('Invalid observation file format');
    });
  });

  describe('saveActiveObservations', () => {
    it('should save observations to active.json', async () => {
      await saveActiveObservations(mockObservations);
      const { active } = getObservationPaths();
      const content = await fs.readJSON(active);
      expect(content).toHaveLength(2);
      expect(content[0].id).toBe('obs-1');
    });

    it('should create directory if not exists', async () => {
      await fs.remove(testDir);
      await saveActiveObservations(mockObservations);
      const { memoryDir } = getObservationPaths();
      const exists = await fs.pathExists(memoryDir);
      expect(exists).toBe(true);
    });

    it('should validate schema before saving', async () => {
      const invalid = [{ invalid: 'data' }] as any;
      await expect(saveActiveObservations(invalid)).rejects.toThrow();
    });
  });

  describe('loadContextObservations', () => {
    it('should return empty array when file does not exist', async () => {
      const observations = await loadContextObservations();
      expect(observations).toEqual([]);
    });

    it('should load observations from context.json', async () => {
      await saveContextObservations(mockObservations);
      const observations = await loadContextObservations();
      expect(observations).toHaveLength(2);
    });
  });

  describe('saveContextObservations', () => {
    it('should save observations to context.json', async () => {
      await saveContextObservations(mockObservations);
      const { context } = getObservationPaths();
      const content = await fs.readJSON(context);
      expect(content).toHaveLength(2);
    });
  });

  describe('loadArchivedObservations', () => {
    it('should return empty array when file does not exist', async () => {
      const observations = await loadArchivedObservations();
      expect(observations).toEqual([]);
    });

    it('should load observations from archived.json', async () => {
      const archived = mockObservations.map(obs => ({
        ...obs,
        archiveTimestamp: '2026-03-10T10:00:00Z',
        archiveReason: 'capacity_control' as const,
      }));
      await saveArchivedObservations(archived);
      const observations = await loadArchivedObservations();
      expect(observations).toHaveLength(2);
      expect(observations[0].archiveReason).toBe('capacity_control');
    });
  });

  describe('saveArchivedObservations', () => {
    it('should save observations to archived.json', async () => {
      const archived = mockObservations.map(obs => ({
        ...obs,
        archiveTimestamp: '2026-03-10T10:00:00Z',
        archiveReason: 'capacity_control' as const,
      }));
      await saveArchivedObservations(archived);
      const { archived: archivedPath } = getObservationPaths();
      const content = await fs.readJSON(archivedPath);
      expect(content).toHaveLength(2);
      expect(content[0].archiveTimestamp).toBe('2026-03-10T10:00:00Z');
    });
  });
});
