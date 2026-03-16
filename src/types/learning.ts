/**
 * Learning System Types
 *
 * Extended types for incremental learning with temporal decay
 */

import { Preference, Pattern, Workflow } from './index.js';

/**
 * Manual override action types
 */
export type ManualOverrideAction = 'promote' | 'demote' | 'ignore';

/**
 * Manual override metadata
 */
export interface ManualOverride {
  action: ManualOverrideAction;
  timestamp: string; // ISO 8601
  reason?: string;
  inheritedFrom?: string; // ID of observation this override was inherited from (for ignore state)
}

/**
 * Observation tier for prioritization
 */
export type ObservationTier = 'gold' | 'silver' | 'bronze' | 'none';

/**
 * Similarity warning for observations similar to deleted ones
 */
export interface SimilarityWarning {
  deletedId: string; // ID of the deleted observation
  deletedAt: string; // When it was deleted (ISO 8601)
  similarity: number; // Similarity score (0-1)
}

/**
 * Merge information for tracking ignore state inheritance
 */
export interface MergeInfo {
  mergedFromIgnored?: boolean; // Whether this observation was merged with an ignored observation
  originalIgnoredId?: string; // ID of the original ignored observation
}

/**
 * Learning observation with metadata
 *
 * Separate from claude-mem's Observation type
 */
export interface ObservationWithMetadata {
  // Core identification
  id: string;
  sessionId: string;
  timestamp: string;

  // Type and content
  type: 'preference' | 'pattern' | 'workflow';
  confidence: number;
  evidence: string[];
  item: Preference | Pattern | Workflow;

  // Learning metadata
  mentions: number; // Cumulative mention count across sessions
  lastSeen: string; // Last observation timestamp (ISO 8601)
  firstSeen: string; // First observation timestamp (ISO 8601)
  originalConfidence: number; // Initial confidence (0-1) before decay
  inContext: boolean; // Whether promoted to context.json
  manualOverride?: ManualOverride; // User manual actions
  mergedFrom?: string[]; // IDs of observations merged into this one
  promotedAt?: string; // Timestamp of promotion to context
  promotionReason?: 'auto' | 'manual'; // How it was promoted

  // Pinning metadata
  pinned?: boolean; // Whether this observation is pinned (protected from removal)
  pinnedBy?: 'user' | 'system'; // Who pinned this observation
  pinnedAt?: string; // When this observation was pinned (ISO 8601)

  // Merge tracking
  mergeInfo?: MergeInfo; // Information about ignore state inheritance during merge

  // Archive metadata
  archiveTimestamp?: string; // When archived (for archived.json)
  archiveReason?: 'user_deleted' | 'user_ignored' | 'expired' | 'active_capacity' | 'context_capacity'; // Why archived
  suppressSimilar?: boolean; // Whether to suppress similar observations
  suppressionCount?: number; // How many times similar obs were re-deleted
  lastBlockedAt?: string; // Last time a similar observation was blocked

  // Deletion awareness
  similarToDeleted?: SimilarityWarning; // Warning if similar to deleted observation
}

/**
 * Learning configuration
 */
export interface LearningConfig {
  enabled: boolean; // Feature flag
  capacity: {
    active: CapacityConfig; // Active Pool capacity config
    context: ContextCapacityConfig; // Context Pool capacity config
  };
  decay: DecayConfig;
  promotion: PromotionConfig;
  deletion: DeletionConfig;
}

/**
 * Capacity control configuration
 */
export interface CapacityConfig {
  targetSize: number; // Target pool size (default: 50)
  maxSize: number; // Hard limit triggers pruning (default: 60)
  minSize: number; // Soft lower bound (default: 40)
}

/**
 * Context Pool capacity control configuration
 */
export interface ContextCapacityConfig {
  enabled: boolean; // Enable/disable Context Pool capacity management (default: true)
  targetSize: number; // Target Context Pool size (default: 50)
  maxSize: number; // Hard limit triggers pruning (default: 80)
  halfLifeDays: number; // Half-life for Context Pool decay (default: 90)
}

/**
 * Temporal decay configuration
 */
export interface DecayConfig {
  enabled: boolean; // Enable/disable decay (default: true)
  halfLifeDays: number; // Half-life in days (default: 30)
}

/**
 * Auto-promotion configuration
 */
export interface PromotionConfig {
  autoConfidence: number; // Auto-promote confidence threshold (0-1, default: 0.90)
  autoMentions: number; // Auto-promote mentions threshold (default: 10)
  highConfidence: number; // High-priority confidence threshold (default: 0.75)
  highMentions: number; // High-priority mentions threshold (default: 5)
  candidateConfidence: number; // Candidate confidence threshold (default: 0.60)
  candidateMentions: number; // Candidate mentions threshold (default: 3)
}

/**
 * Deletion configuration
 */
export interface DeletionConfig {
  immediateThreshold: number; // Immediate delete below this confidence (default: 0.25)
  delayedThreshold: number; // Delayed delete below this (default: 0.35)
  delayedDays: number; // Days without growth before delayed delete (default: 14)
}

/**
 * Merge result from LLM
 */
export interface MergeResult {
  observation: ObservationWithMetadata;
  mergedFrom: string[]; // IDs of original observations
}

/**
 * Pool statistics
 */
export interface PoolStatistics {
  total: number;
  gold: number;
  silver: number;
  bronze: number;
  none: number;
  lastMerge?: string; // ISO 8601 timestamp
}
