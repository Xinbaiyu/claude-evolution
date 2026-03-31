/**
 * Unit Tests: State Manager - Backward Compatibility
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  getLastAnalysisTime,
  updateAfterAnalysis,
  getSystemState
} from '../scheduler/state-manager.js';

describe('State Manager - Backward Compatibility', () => {
  let tempDir: string;
  let originalEvolutionDir: string | undefined;

  beforeEach(async () => {
    // Create temporary test directory
    tempDir = path.join(os.tmpdir(), `claude-evolution-test-${Date.now()}`);
    await fs.ensureDir(tempDir);

    // Mock getEvolutionDir to use temp directory
    originalEvolutionDir = process.env.CLAUDE_EVOLUTION_DIR;
    process.env.CLAUDE_EVOLUTION_DIR = tempDir;
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(tempDir);
    if (originalEvolutionDir) {
      process.env.CLAUDE_EVOLUTION_DIR = originalEvolutionDir;
    } else {
      delete process.env.CLAUDE_EVOLUTION_DIR;
    }
  });

  describe('Loading old state files with currentPhase', () => {
    it('should load old state.json with currentPhase field without error', async () => {
      const oldState = {
        installDate: '2024-01-01T00:00:00.000Z',
        lastAnalysisTime: '2024-03-01T12:00:00.000Z',
        lastAnalysisSuccess: true,
        totalAnalyses: 10,
        currentPhase: 'automatic', // Old field
      };

      const statePath = path.join(tempDir, 'state.json');
      await fs.writeJSON(statePath, oldState);

      // Should not throw error
      const state = await getSystemState();

      expect(state).toBeDefined();
      expect(state.installDate).toBe(oldState.installDate);
      expect(state.lastAnalysisTime).toBe(oldState.lastAnalysisTime);
      expect(state.lastAnalysisSuccess).toBe(oldState.lastAnalysisSuccess);
      expect(state.totalAnalyses).toBe(oldState.totalAnalyses);

      // currentPhase field is preserved but not used by SystemState type
      // This is acceptable backward compatibility behavior
    });

    it('should handle state file with all legacy fields', async () => {
      const legacyState = {
        installDate: '2024-01-01T00:00:00.000Z',
        lastAnalysisTime: '2024-03-01T12:00:00.000Z',
        lastAnalysisSuccess: true,
        totalAnalyses: 5,
        currentPhase: 'suggestion',
        someOtherLegacyField: 'value',
      };

      const statePath = path.join(tempDir, 'state.json');
      await fs.writeJSON(statePath, legacyState);

      const state = await getSystemState();

      expect(state.installDate).toBe(legacyState.installDate);
      expect(state.totalAnalyses).toBe(legacyState.totalAnalyses);
    });
  });

  describe('Saving new state files without currentPhase', () => {
    it('should save state without currentPhase field', async () => {
      // Initialize with a state file
      const statePath = path.join(tempDir, 'state.json');
      const initialState = {
        installDate: '2024-01-01T00:00:00.000Z',
        lastAnalysisTime: null,
        lastAnalysisSuccess: false,
        totalAnalyses: 0,
      };
      await fs.writeJSON(statePath, initialState);

      // Update state
      await updateAfterAnalysis(true);

      // Read saved state
      const savedState = await fs.readJSON(statePath);

      expect(savedState.lastAnalysisTime).toBeDefined();
      expect(savedState.lastAnalysisSuccess).toBe(true);
      expect(savedState.totalAnalyses).toBe(1);

      // Should not have currentPhase
      expect(savedState.currentPhase).toBeUndefined();

      // Should not have any other unexpected fields
      const expectedKeys = ['installDate', 'lastAnalysisTime', 'lastAnalysisSuccess', 'totalAnalyses'];
      const actualKeys = Object.keys(savedState);
      expect(actualKeys).toEqual(expect.arrayContaining(expectedKeys));
      expect(actualKeys.length).toBe(expectedKeys.length);
    });

    it('should update state successfully even with legacy currentPhase field', async () => {
      const statePath = path.join(tempDir, 'state.json');

      // Create old state with currentPhase
      const oldState = {
        installDate: '2024-01-01T00:00:00.000Z',
        lastAnalysisTime: '2024-03-01T12:00:00.000Z',
        lastAnalysisSuccess: true,
        totalAnalyses: 10,
        currentPhase: 'automatic',
      };
      await fs.writeJSON(statePath, oldState);

      // Update analysis state
      await updateAfterAnalysis(true);

      // Read the saved state
      const newState = await fs.readJSON(statePath);

      expect(newState.totalAnalyses).toBe(11);
      expect(newState.lastAnalysisSuccess).toBe(true);

      // Legacy fields may be preserved (acceptable for backward compatibility)
      // The important thing is that the SystemState type doesn't reference them
    });
  });

  describe('Fresh installation', () => {
    it('should create initial state without currentPhase', async () => {
      // Don't create any state file - simulate fresh install
      const state = await getSystemState();

      expect(state.installDate).toBeDefined();
      expect(state.lastAnalysisTime).toBeNull();
      expect(state.lastAnalysisSuccess).toBe(false);
      expect(state.totalAnalyses).toBe(0);

      // Should not have currentPhase
      expect((state as any).currentPhase).toBeUndefined();

      // Verify the saved file also doesn't have it
      const statePath = path.join(tempDir, 'state.json');
      const savedState = await fs.readJSON(statePath);
      expect(savedState.currentPhase).toBeUndefined();
    });
  });
});
