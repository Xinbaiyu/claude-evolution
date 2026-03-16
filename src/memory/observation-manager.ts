/**
 * Observation Manager
 *
 * Core module for loading and saving observation data
 */

import fs from 'fs-extra';
import path from 'path';
import { z } from 'zod';
import { getEvolutionDir } from '../config/loader.js';
import { logger } from '../utils/index.js';
import type { ObservationWithMetadata } from '../types/learning.js';

/**
 * Observation file paths
 */
export function getObservationPaths() {
  const evolutionDir = getEvolutionDir();
  const memoryDir = path.join(evolutionDir, 'memory', 'observations');

  return {
    memoryDir,
    active: path.join(memoryDir, 'active.json'),
    context: path.join(memoryDir, 'context.json'),
    archived: path.join(memoryDir, 'archived.json'),
  };
}

/**
 * Ensure memory directory exists
 */
export async function ensureMemoryDirectory(): Promise<void> {
  const { memoryDir } = getObservationPaths();
  await fs.ensureDir(memoryDir);
}

/**
 * Zod schema for ObservationWithMetadata validation
 */
const ManualOverrideSchema = z.object({
  action: z.enum(['promote', 'demote', 'ignore']),
  timestamp: z.string(),
  reason: z.string().optional(),
  inheritedFrom: z.string().optional(),
});

const MergeInfoSchema = z.object({
  mergedFromIgnored: z.boolean().optional(),
  originalIgnoredId: z.string().optional(),
});

const ObservationWithMetadataSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  timestamp: z.string(),
  type: z.enum(['preference', 'pattern', 'workflow']),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()),
  item: z.any().optional(), // Preference | Pattern | Workflow (complex validation omitted, optional for schema flexibility)

  // Metadata fields
  mentions: z.number().int().min(0),
  lastSeen: z.string(),
  firstSeen: z.string(),
  originalConfidence: z.number().min(0).max(1),
  inContext: z.boolean(),
  manualOverride: ManualOverrideSchema.optional(),
  mergedFrom: z.array(z.string()).optional(),
  promotedAt: z.string().optional(),
  promotionReason: z.enum(['auto', 'manual']).optional(),
  archiveTimestamp: z.string().optional(),
  archiveReason: z.enum(['active_capacity', 'context_capacity', 'user_ignored', 'user_deleted', 'expired']).optional(),
  // Pinning fields
  pinned: z.boolean().optional(),
  pinnedBy: z.string().optional(),
  pinnedAt: z.string().optional(),
  // Merge info
  mergeInfo: MergeInfoSchema.optional(),
});

const ObservationArraySchema = z.array(ObservationWithMetadataSchema);

/**
 * Load observations from a JSON file
 */
async function loadObservationsFromFile(
  filePath: string
): Promise<ObservationWithMetadata[]> {
  try {
    // Check if file exists
    if (!(await fs.pathExists(filePath))) {
      logger.debug(`Observation file not found: ${filePath}`);
      return [];
    }

    // Read file
    const content = await fs.readJSON(filePath);

    // Validate schema
    const observations = ObservationArraySchema.parse(content) as ObservationWithMetadata[];

    logger.debug(`Loaded ${observations.length} observations from ${filePath}`);
    return observations;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error(`Schema validation failed for ${filePath}:`, error.errors);
      throw new Error(`Invalid observation file format: ${filePath}`);
    }

    logger.error(`Failed to load observations from ${filePath}:`, error);
    throw error;
  }
}

/**
 * Save observations to a JSON file
 */
async function saveObservationsToFile(
  filePath: string,
  observations: ObservationWithMetadata[]
): Promise<void> {
  try {
    // Ensure directory exists
    await fs.ensureDir(path.dirname(filePath));

    // Validate schema before saving
    ObservationArraySchema.parse(observations);

    // Write file with pretty formatting
    await fs.writeJSON(filePath, observations, { spaces: 2 });

    logger.debug(`Saved ${observations.length} observations to ${filePath}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error(`Schema validation failed before save:`, error.errors);
      throw new Error(`Invalid observations data`);
    }

    logger.error(`Failed to save observations to ${filePath}:`, error);
    throw error;
  }
}

/**
 * Load active observations (candidate pool)
 */
export async function loadActiveObservations(): Promise<ObservationWithMetadata[]> {
  const { active } = getObservationPaths();
  return loadObservationsFromFile(active);
}

/**
 * Save active observations (candidate pool)
 */
export async function saveActiveObservations(
  observations: ObservationWithMetadata[]
): Promise<void> {
  const { active } = getObservationPaths();
  await saveObservationsToFile(active, observations);
}

/**
 * Load context observations (promoted rules)
 */
export async function loadContextObservations(): Promise<ObservationWithMetadata[]> {
  const { context } = getObservationPaths();
  return loadObservationsFromFile(context);
}

/**
 * Save context observations (promoted rules)
 */
export async function saveContextObservations(
  observations: ObservationWithMetadata[]
): Promise<void> {
  const { context } = getObservationPaths();
  await saveObservationsToFile(context, observations);
}

/**
 * Load archived observations
 */
export async function loadArchivedObservations(): Promise<ObservationWithMetadata[]> {
  const { archived } = getObservationPaths();
  return loadObservationsFromFile(archived);
}

/**
 * Save archived observations
 */
export async function saveArchivedObservations(
  observations: ObservationWithMetadata[]
): Promise<void> {
  const { archived } = getObservationPaths();
  await saveObservationsToFile(archived, observations);
}

/**
 * Create backup of observation file
 */
export async function backupObservationFile(
  filePath: string
): Promise<void> {
  if (await fs.pathExists(filePath)) {
    const backupPath = `${filePath}.bak`;
    await fs.copy(filePath, backupPath, { overwrite: true });
    logger.debug(`Backed up ${filePath} to ${backupPath}`);
  }
}
