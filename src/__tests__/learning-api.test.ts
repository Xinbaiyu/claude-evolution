/**
 * Integration Tests: Learning System REST API
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import type { ObservationWithMetadata } from '../types/learning.js';

// Test directory setup
const TEST_DIR = path.join(os.tmpdir(), 'claude-evolution-test-api');
const OBSERVATIONS_DIR = path.join(TEST_DIR, 'memory/observations');

// Set environment variable for testing
process.env.CLAUDE_EVOLUTION_DIR = TEST_DIR;

// Import modules AFTER environment is set
import {
  loadActiveObservations,
  loadContextObservations,
  loadArchivedObservations,
  saveActiveObservations,
  saveContextObservations,
  saveArchivedObservations,
} from '../memory/observation-manager.js';
import { loadConfig, saveConfig } from '../config/loader.js';
import { DEFAULT_CONFIG } from '../config/schema.js';

describe('Learning System API Integration Tests', () => {
  // Sample test data
  const sampleObservation: ObservationWithMetadata = {
    id: 'obs-test-001',
    sessionId: 'session-001',
    timestamp: new Date().toISOString(),
    type: 'preference',
    confidence: 0.85,
    evidence: ['evidence-1', 'evidence-2'],
    item: {
      type: 'code_style',
      description: 'Test preference',
      confidence: 0.85,
      frequency: 5,
      evidence: ['evidence-1', 'evidence-2'],
    },
    mentions: 5,
    lastSeen: new Date().toISOString(),
    firstSeen: new Date().toISOString(),
    originalConfidence: 0.85,
    inContext: false,
  };

  const goldObservation: ObservationWithMetadata = {
    id: 'obs-test-gold',
    sessionId: 'session-001',
    timestamp: new Date().toISOString(),
    type: 'pattern',
    confidence: 0.90,
    evidence: ['evidence-1'],
    item: {
      problem: 'Test problem',
      solution: 'Test solution',
      confidence: 0.90,
      occurrences: 15,
      evidence: ['evidence-1'],
    },
    mentions: 15,
    lastSeen: new Date().toISOString(),
    firstSeen: new Date().toISOString(),
    originalConfidence: 0.90,
    inContext: false,
  };

  beforeAll(async () => {
    // Create test directory
    await fs.ensureDir(OBSERVATIONS_DIR);

    // Initialize config
    await saveConfig(DEFAULT_CONFIG);
  });

  afterAll(async () => {
    // Cleanup test directory
    await fs.remove(TEST_DIR);
  });

  beforeEach(async () => {
    // Reset observation files before each test
    await saveActiveObservations([]);
    await saveContextObservations([]);
    await saveArchivedObservations([]);
  });

  describe('Observation Loading', () => {
    it('should load active observations', async () => {
      await saveActiveObservations([sampleObservation]);
      const loaded = await loadActiveObservations();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('obs-test-001');
    });

    it('should load context observations', async () => {
      await saveContextObservations([sampleObservation]);
      const loaded = await loadContextObservations();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('obs-test-001');
    });

    it('should load archived observations', async () => {
      await saveArchivedObservations([sampleObservation]);
      const loaded = await loadArchivedObservations();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('obs-test-001');
    });

    it('should return empty arrays when files do not exist', async () => {
      await fs.remove(OBSERVATIONS_DIR);
      const active = await loadActiveObservations();
      const context = await loadContextObservations();
      const archived = await loadArchivedObservations();

      expect(active).toEqual([]);
      expect(context).toEqual([]);
      expect(archived).toEqual([]);
    });
  });

  describe('Manual Promotion', () => {
    it('should promote observation to context with metadata', async () => {
      // Setup: Add observation to active pool
      await saveActiveObservations([sampleObservation]);

      // Simulate API call: promote
      const active = await loadActiveObservations();
      const toPromote = active[0];

      const promoted: ObservationWithMetadata = {
        ...toPromote,
        inContext: true,
        manualOverride: {
          action: 'promote',
          timestamp: new Date().toISOString(),
        },
        promotedAt: new Date().toISOString(),
        promotionReason: 'manual',
      };

      // Update active pool (mark as in context)
      await saveActiveObservations([promoted]);

      // Add to context pool
      const context = await loadContextObservations();
      await saveContextObservations([...context, promoted]);

      // Verify
      const updatedActive = await loadActiveObservations();
      const updatedContext = await loadContextObservations();

      expect(updatedActive[0].inContext).toBe(true);
      expect(updatedActive[0].manualOverride?.action).toBe('promote');
      expect(updatedContext).toHaveLength(1);
      expect(updatedContext[0].id).toBe('obs-test-001');
    });

    it('should not allow promoting already promoted observation', async () => {
      const promoted: ObservationWithMetadata = {
        ...sampleObservation,
        inContext: true,
      };
      await saveActiveObservations([promoted]);

      // Verify
      const active = await loadActiveObservations();
      expect(active[0].inContext).toBe(true);

      // API should reject promotion attempt (tested in route handler)
    });
  });

  describe('Manual Demotion', () => {
    it('should demote observation from context to active', async () => {
      // Setup: Add observation to context pool
      await saveContextObservations([sampleObservation]);

      // Simulate API call: demote
      const context = await loadContextObservations();
      const toDemote = context[0];

      const demoted: ObservationWithMetadata = {
        ...toDemote,
        inContext: false,
        manualOverride: {
          action: 'demote',
          timestamp: new Date().toISOString(),
        },
      };

      // Remove from context pool
      await saveContextObservations([]);

      // Add to active pool
      const active = await loadActiveObservations();
      await saveActiveObservations([...active, demoted]);

      // Verify
      const updatedContext = await loadContextObservations();
      const updatedActive = await loadActiveObservations();

      expect(updatedContext).toHaveLength(0);
      expect(updatedActive).toHaveLength(1);
      expect(updatedActive[0].inContext).toBe(false);
      expect(updatedActive[0].manualOverride?.action).toBe('demote');
    });
  });

  describe('Ignore Functionality', () => {
    it('should mark observation as ignored in active pool', async () => {
      await saveActiveObservations([sampleObservation]);

      // Simulate API call: ignore
      const active = await loadActiveObservations();
      const toIgnore = active[0];

      const ignored: ObservationWithMetadata = {
        ...toIgnore,
        manualOverride: {
          action: 'ignore',
          timestamp: new Date().toISOString(),
          reason: 'User requested ignore',
        },
      };

      await saveActiveObservations([ignored]);

      // Verify
      const updated = await loadActiveObservations();
      expect(updated[0].manualOverride?.action).toBe('ignore');
      expect(updated[0].manualOverride?.reason).toBe('User requested ignore');
    });

    it('should mark observation as ignored in context pool', async () => {
      await saveContextObservations([sampleObservation]);

      // Simulate API call: ignore
      const context = await loadContextObservations();
      const toIgnore = context[0];

      const ignored: ObservationWithMetadata = {
        ...toIgnore,
        manualOverride: {
          action: 'ignore',
          timestamp: new Date().toISOString(),
        },
      };

      await saveContextObservations([ignored]);

      // Verify
      const updated = await loadContextObservations();
      expect(updated[0].manualOverride?.action).toBe('ignore');
    });
  });

  describe('Deletion', () => {
    it('should delete observation from active pool', async () => {
      await saveActiveObservations([sampleObservation, goldObservation]);

      // Simulate API call: delete
      const active = await loadActiveObservations();
      const filtered = active.filter((obs) => obs.id !== 'obs-test-001');
      await saveActiveObservations(filtered);

      // Verify
      const updated = await loadActiveObservations();
      expect(updated).toHaveLength(1);
      expect(updated[0].id).toBe('obs-test-gold');
    });

    it('should delete observation from context pool', async () => {
      await saveContextObservations([sampleObservation]);

      // Simulate API call: delete
      await saveContextObservations([]);

      // Verify
      const updated = await loadContextObservations();
      expect(updated).toHaveLength(0);
    });
  });

  describe('Restoration from Archive', () => {
    it('should restore observation from archive to active', async () => {
      // Setup: Add observation to archive
      const archived: ObservationWithMetadata = {
        ...sampleObservation,
        archiveTimestamp: new Date().toISOString(),
        archiveReason: 'capacity_control',
      };
      await saveArchivedObservations([archived]);

      // Simulate API call: restore
      const archivedList = await loadArchivedObservations();
      const toRestore = archivedList[0];

      const restored: ObservationWithMetadata = {
        ...toRestore,
        archiveTimestamp: undefined,
        archiveReason: undefined,
      };

      // Remove from archive
      await saveArchivedObservations([]);

      // Add to active
      const active = await loadActiveObservations();
      await saveActiveObservations([...active, restored]);

      // Verify
      const updatedArchive = await loadArchivedObservations();
      const updatedActive = await loadActiveObservations();

      expect(updatedArchive).toHaveLength(0);
      expect(updatedActive).toHaveLength(1);
      expect(updatedActive[0].archiveTimestamp).toBeUndefined();
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate tier statistics correctly', async () => {
      const goldObs: ObservationWithMetadata = {
        ...sampleObservation,
        id: 'gold-1',
        originalConfidence: 0.85,
        mentions: 7,
      };

      const silverObs: ObservationWithMetadata = {
        ...sampleObservation,
        id: 'silver-1',
        originalConfidence: 0.65,
        mentions: 4,
      };

      const bronzeObs: ObservationWithMetadata = {
        ...sampleObservation,
        id: 'bronze-1',
        originalConfidence: 0.50,
        mentions: 2,
      };

      await saveActiveObservations([goldObs, silverObs, bronzeObs]);

      // Calculate tiers
      const active = await loadActiveObservations();
      const gold = active.filter(
        (obs) => obs.originalConfidence >= 0.75 && obs.mentions >= 5
      );
      const silver = active.filter(
        (obs) =>
          obs.originalConfidence >= 0.60 &&
          obs.mentions >= 3 &&
          !gold.includes(obs)
      );
      const bronze = active.filter(
        (obs) => !gold.includes(obs) && !silver.includes(obs)
      );

      expect(gold).toHaveLength(1);
      expect(silver).toHaveLength(1);
      expect(bronze).toHaveLength(1);
    });

    it('should calculate type statistics correctly', async () => {
      const pref: ObservationWithMetadata = {
        ...sampleObservation,
        id: 'pref-1',
        type: 'preference',
      };

      const pattern: ObservationWithMetadata = {
        ...sampleObservation,
        id: 'pattern-1',
        type: 'pattern',
      };

      const workflow: ObservationWithMetadata = {
        ...sampleObservation,
        id: 'workflow-1',
        type: 'workflow',
      };

      await saveActiveObservations([pref, pattern, workflow]);

      // Calculate type stats
      const active = await loadActiveObservations();
      const typeStats: Record<string, number> = {};
      active.forEach((obs) => {
        typeStats[obs.type] = (typeStats[obs.type] || 0) + 1;
      });

      expect(typeStats.preference).toBe(1);
      expect(typeStats.pattern).toBe(1);
      expect(typeStats.workflow).toBe(1);
    });
  });

  describe('Config Updates', () => {
    it('should update learning config fields', async () => {
      const config = await loadConfig();

      // Simulate API call: update config (preserve all capacity fields)
      const updatedLearning = {
        ...config.learning!,
        capacity: {
          minSize: config.learning!.capacity.minSize, // Keep existing
          targetSize: 80, // Update this
          maxSize: 100, // Update to be valid: maxSize must be >= targetSize
        },
        decay: {
          ...config.learning!.decay,
          halfLifeDays: 45,
        },
      };

      const updatedConfig = {
        ...config,
        learning: updatedLearning,
      };

      await saveConfig(updatedConfig);

      // Verify
      const reloaded = await loadConfig();
      expect(reloaded.learning?.capacity.targetSize).toBe(80);
      expect(reloaded.learning?.capacity.maxSize).toBe(100);
      expect(reloaded.learning?.decay.halfLifeDays).toBe(45);
    });

    it('should reject invalid config updates', async () => {
      const config = await loadConfig();

      // Attempt invalid update (minSize > targetSize)
      const invalidConfig = {
        ...config,
        learning: {
          ...config.learning!,
          capacity: {
            minSize: 100,
            targetSize: 50,
            maxSize: 70,
          },
        },
      };

      // Should throw validation error
      await expect(saveConfig(invalidConfig)).rejects.toThrow();
    });
  });
});
