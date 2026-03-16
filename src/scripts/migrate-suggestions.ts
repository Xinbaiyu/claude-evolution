/**
 * Migration Script: pending.json → active.json
 *
 * Converts v0.2.x suggestion format to v0.3.0 observation format
 */

import fs from 'fs-extra';
import path from 'path';
import { getEvolutionDir } from '../config/loader.js';
import { loadActiveObservations, saveActiveObservations } from '../memory/observation-manager.js';
import type { ObservationWithMetadata } from '../types/learning.js';
import type { Preference, Pattern, Workflow } from '../types/index.js';
import { logger } from '../utils/index.js';

interface LegacySuggestion {
  id: string;
  type: 'preference' | 'pattern' | 'workflow';
  item: Preference | Pattern | Workflow;
  confidence?: number;
  createdAt?: string;
  evidence?: string[];
}

/**
 * Convert legacy suggestion to observation format
 */
function convertSuggestionToObservation(
  suggestion: LegacySuggestion,
  sessionId: string
): ObservationWithMetadata {
  const now = new Date().toISOString();
  const confidence = suggestion.confidence || 0.7;

  // Extract frequency/mentions from item
  let mentions = 1;
  if (suggestion.type === 'preference' && 'frequency' in suggestion.item) {
    mentions = (suggestion.item as any).frequency || 1;
  } else if (suggestion.type === 'pattern' && 'occurrences' in suggestion.item) {
    mentions = (suggestion.item as any).occurrences || 1;
  } else if (suggestion.type === 'workflow' && 'frequency' in suggestion.item) {
    mentions = (suggestion.item as any).frequency || 1;
  }

  const observation: ObservationWithMetadata = {
    id: suggestion.id || `migrated-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sessionId: sessionId,
    timestamp: suggestion.createdAt || now,
    type: suggestion.type,
    confidence: confidence,
    evidence: suggestion.evidence || [],
    item: suggestion.item,
    mentions: mentions,
    lastSeen: suggestion.createdAt || now,
    firstSeen: suggestion.createdAt || now,
    originalConfidence: confidence,
    inContext: false,
  };

  return observation;
}

/**
 * Check if migration has already been performed
 */
async function checkMigrationMarker(): Promise<boolean> {
  const evolutionDir = getEvolutionDir();
  const markerPath = path.join(evolutionDir, 'learned', '.migrated');
  return await fs.pathExists(markerPath);
}

/**
 * Create migration marker file
 */
async function createMigrationMarker(): Promise<void> {
  const evolutionDir = getEvolutionDir();
  const learnedDir = path.join(evolutionDir, 'learned');
  await fs.ensureDir(learnedDir);

  const markerPath = path.join(learnedDir, '.migrated');
  const markerContent = {
    migratedAt: new Date().toISOString(),
    version: '0.4.0',
  };

  await fs.writeJson(markerPath, markerContent, { spaces: 2 });
}

/**
 * Create backup of pending.json
 */
async function backupPendingFile(pendingPath: string): Promise<string> {
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const backupPath = `${pendingPath}.backup-${timestamp}`;

  await fs.copy(pendingPath, backupPath);
  logger.info(`Created backup: ${backupPath}`);

  return backupPath;
}

/**
 * Load legacy pending.json
 */
async function loadPendingSuggestions(): Promise<LegacySuggestion[]> {
  const evolutionDir = getEvolutionDir();
  // Try suggestions/pending.json first (v0.2.x location)
  let pendingPath = path.join(evolutionDir, 'suggestions', 'pending.json');

  // Fallback to learned/pending.json (if moved)
  if (!(await fs.pathExists(pendingPath))) {
    pendingPath = path.join(evolutionDir, 'learned', 'pending.json');
  }

  if (!(await fs.pathExists(pendingPath))) {
    return [];
  }

  const content = await fs.readJson(pendingPath);
  return Array.isArray(content) ? content : [];
}

/**
 * Main migration function
 */
export async function migrateSuggestions(): Promise<{
  success: boolean;
  migratedCount: number;
  backupPath?: string;
  error?: string;
}> {
  try {
    logger.info('Starting suggestion migration...');

    // Check if already migrated
    if (await checkMigrationMarker()) {
      logger.info('Migration already completed (marker file exists)');
      return {
        success: true,
        migratedCount: 0,
        error: 'Already migrated. Marker file exists at learned/.migrated',
      };
    }

    // Load legacy suggestions
    const suggestions = await loadPendingSuggestions();

    if (suggestions.length === 0) {
      logger.info('No pending suggestions found');
      return {
        success: true,
        migratedCount: 0,
        error: 'No legacy data found. suggestions/pending.json is empty or missing.',
      };
    }

    // Backup original file (find actual location)
    const evolutionDir = getEvolutionDir();
    let pendingPath = path.join(evolutionDir, 'suggestions', 'pending.json');
    if (!(await fs.pathExists(pendingPath))) {
      pendingPath = path.join(evolutionDir, 'learned', 'pending.json');
    }
    const backupPath = await backupPendingFile(pendingPath);

    // Convert to observations
    const sessionId = `migration-${Date.now()}`;
    const observations = suggestions.map(s => convertSuggestionToObservation(s, sessionId));

    logger.info(`Converted ${observations.length} suggestions to observations`);

    // Load existing active observations
    const existingObservations = await loadActiveObservations();

    // Merge (append) new observations
    const merged = [...existingObservations, ...observations];

    // Save to active.json
    await saveActiveObservations(merged);

    logger.info(`Saved ${merged.length} total observations to active.json`);

    // Create migration marker
    await createMigrationMarker();

    return {
      success: true,
      migratedCount: observations.length,
      backupPath: backupPath,
    };
  } catch (error) {
    logger.error('Migration failed', { error });
    return {
      success: false,
      migratedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
