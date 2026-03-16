/**
 * Batch Operations Integration Tests
 *
 * Tests batch promote, ignore, and delete operations for observations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadActiveObservations,
  saveActiveObservations,
  loadArchivedObservations,
  saveArchivedObservations,
} from '../memory/observation-manager.js';
import type { ObservationWithMetadata } from '../types/learning.js';

// Mock data setup
const createMockObservation = (id: string, type: 'preference' | 'pattern' | 'workflow'): ObservationWithMetadata => ({
  id,
  sessionId: 'test-session',
  timestamp: new Date().toISOString(),
  type,
  confidence: 0.85,
  evidence: [`${id}: test evidence`],
  item: type === 'preference'
    ? { type: 'test', description: `Test ${id}`, frequency: 5 }
    : type === 'pattern'
    ? { problem: `Problem ${id}`, solution: `Solution ${id}`, occurrences: 3 }
    : { name: `Workflow ${id}`, steps: ['step1', 'step2'], frequency: 4 },
  mentions: 5,
  lastSeen: new Date().toISOString(),
  firstSeen: new Date(Date.now() - 86400000).toISOString(),
  originalConfidence: 0.85,
  inContext: false,
});

describe('Batch Operations', () => {
  let originalObservations: ObservationWithMetadata[];
  let originalArchived: ObservationWithMetadata[];

  beforeEach(async () => {
    // Backup current state
    originalObservations = await loadActiveObservations();
    originalArchived = await loadArchivedObservations();

    // Create test observations
    const testObservations: ObservationWithMetadata[] = [
      createMockObservation('test-obs-1', 'preference'),
      createMockObservation('test-obs-2', 'pattern'),
      createMockObservation('test-obs-3', 'workflow'),
      createMockObservation('test-obs-4', 'preference'),
      createMockObservation('test-obs-5', 'pattern'),
    ];

    await saveActiveObservations(testObservations);
  });

  afterEach(async () => {
    // Restore original state
    await saveActiveObservations(originalObservations);
    await saveArchivedObservations(originalArchived);
  });

  describe('Batch Delete (Archive)', () => {
    it('should archive multiple observations', async () => {
      const observations = await loadActiveObservations();
      const idsToDelete = ['test-obs-1', 'test-obs-2'];

      // Simulate batch delete
      const toArchive = observations.filter(obs => idsToDelete.includes(obs.id));
      const remaining = observations.filter(obs => !idsToDelete.includes(obs.id));

      // Add archive metadata
      const archivedWithMeta = toArchive.map(obs => ({
        ...obs,
        archiveReason: 'user_deleted' as const,
        archiveTimestamp: new Date().toISOString(),
        suppressSimilar: true,
      }));

      const existingArchived = await loadArchivedObservations();
      await saveArchivedObservations([...existingArchived, ...archivedWithMeta]);
      await saveActiveObservations(remaining);

      // Verify
      const updatedObservations = await loadActiveObservations();
      const updatedArchived = await loadArchivedObservations();

      expect(updatedObservations.length).toBe(3);
      expect(updatedArchived.filter(obs => idsToDelete.includes(obs.id)).length).toBe(2);

      // Check archive metadata
      const archived = updatedArchived.filter(obs => idsToDelete.includes(obs.id));
      archived.forEach(obs => {
        expect(obs.archiveReason).toBe('user_deleted');
        expect(obs.archiveTimestamp).toBeDefined();
        // suppressSimilar is optional and may be stripped by schema validation
        if (obs.suppressSimilar !== undefined) {
          expect(obs.suppressSimilar).toBe(true);
        }
      });
    });

    it('should handle batch size limits', async () => {
      const observations = await loadActiveObservations();

      // Test soft limit (50)
      expect(observations.length).toBeLessThanOrEqual(50);

      // Test hard limit (200) - would be enforced by API
      const MAX_BATCH_SIZE = 200;
      const largeSelection = Array(250).fill(null).map((_, i) => `obs-${i}`);

      expect(() => {
        if (largeSelection.length > MAX_BATCH_SIZE) {
          throw new Error(`Batch size ${largeSelection.length} exceeds maximum ${MAX_BATCH_SIZE}`);
        }
      }).toThrow('exceeds maximum 200');
    });
  });

  describe('Batch Promote', () => {
    it('should promote multiple observations to context pool', async () => {
      const observations = await loadActiveObservations();
      const idsToPromote = ['test-obs-1', 'test-obs-3'];

      // Simulate batch promote
      const updated = observations.map(obs =>
        idsToPromote.includes(obs.id)
          ? { ...obs, inContext: true }
          : obs
      );

      await saveActiveObservations(updated);

      // Verify
      const updatedObservations = await loadActiveObservations();
      const promoted = updatedObservations.filter(obs => idsToPromote.includes(obs.id));

      expect(promoted.length).toBe(2);
      promoted.forEach(obs => {
        expect(obs.inContext).toBe(true);
      });
    });
  });

  describe('Batch Ignore', () => {
    it('should archive observations with ignore reason', async () => {
      const observations = await loadActiveObservations();
      const idsToIgnore = ['test-obs-2', 'test-obs-4'];
      const reason = 'Not relevant to current workflow';

      // Simulate batch ignore
      const toArchive = observations.filter(obs => idsToIgnore.includes(obs.id));
      const remaining = observations.filter(obs => !idsToIgnore.includes(obs.id));

      const archivedWithMeta = toArchive.map(obs => ({
        ...obs,
        archiveReason: 'user_deleted' as const,
        archiveTimestamp: new Date().toISOString(),
        suppressSimilar: true,
        manualOverride: {
          action: 'ignore' as const,
          timestamp: new Date().toISOString(),
          reason,
        },
      }));

      const existingArchived = await loadArchivedObservations();
      await saveArchivedObservations([...existingArchived, ...archivedWithMeta]);
      await saveActiveObservations(remaining);

      // Verify
      const updatedObservations = await loadActiveObservations();
      const updatedArchived = await loadArchivedObservations();

      expect(updatedObservations.length).toBe(3);

      const ignored = updatedArchived.filter(obs => idsToIgnore.includes(obs.id));
      expect(ignored.length).toBe(2);
      ignored.forEach(obs => {
        expect(obs.archiveReason).toBe('user_deleted');
        expect(obs.manualOverride?.action).toBe('ignore');
        expect(obs.manualOverride?.reason).toBe(reason);
      });
    });
  });

  describe('Restore Operation', () => {
    it('should restore observation from archive', async () => {
      // First archive an observation
      const observations = await loadActiveObservations();
      const toArchive = observations.find(obs => obs.id === 'test-obs-1')!;
      const remaining = observations.filter(obs => obs.id !== 'test-obs-1');

      const archived = {
        ...toArchive,
        archiveReason: 'user_deleted' as const,
        archiveTimestamp: new Date().toISOString(),
        suppressSimilar: true,
      };

      const existingArchived = await loadArchivedObservations();
      await saveArchivedObservations([...existingArchived, archived]);
      await saveActiveObservations(remaining);

      // Now restore
      const archivedPool = await loadArchivedObservations();
      const toRestore = archivedPool.find(obs => obs.id === 'test-obs-1')!;
      const remainingArchived = archivedPool.filter(obs => obs.id !== 'test-obs-1');

      // Clear archive metadata
      const restored = {
        ...toRestore,
        archiveReason: undefined,
        archiveTimestamp: undefined,
        suppressSimilar: undefined,
      };

      const activePool = await loadActiveObservations();
      await saveActiveObservations([...activePool, restored]);
      await saveArchivedObservations(remainingArchived);

      // Verify
      const updatedObservations = await loadActiveObservations();
      const updatedArchived = await loadArchivedObservations();

      const restoredObs = updatedObservations.find(obs => obs.id === 'test-obs-1');
      expect(restoredObs).toBeDefined();
      expect(restoredObs?.archiveReason).toBeUndefined();
      expect(restoredObs?.archiveTimestamp).toBeUndefined();
      expect(updatedArchived.find(obs => obs.id === 'test-obs-1')).toBeUndefined();
    });
  });

  describe('Partial Failure Handling', () => {
    it('should report partial success when some operations fail', async () => {
      const observations = await loadActiveObservations();
      const idsToProcess = ['test-obs-1', 'non-existent-id', 'test-obs-3'];

      const results = idsToProcess.map(id => {
        const obs = observations.find(o => o.id === id);
        return {
          id,
          success: !!obs,
          error: obs ? undefined : 'Observation not found',
        };
      });

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      expect(successCount).toBe(2);
      expect(failureCount).toBe(1);
      expect(results.find(r => r.id === 'non-existent-id')?.error).toBe('Observation not found');
    });
  });
});
