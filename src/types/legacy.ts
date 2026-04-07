/**
 * Legacy Type Definitions (DEPRECATED)
 *
 * ⚠️ WARNING: These types are from the v0.2.x suggestion system and are DEPRECATED.
 *
 * The suggestion system (pending/approved/rejected workflow) has been replaced
 * with the observation-based learning system in v0.4.0+.
 *
 * These types remain temporarily to support:
 * 1. Migration script (migrate-suggestions command)
 * 2. Existing test files
 *
 * DO NOT use these types in new code. Use ObservationWithMetadata from
 * src/types/learning.ts instead.
 *
 * @deprecated since v0.4.0 - Will be removed in v0.5.0
 */

// ==================== 经验提取类型 (DEPRECATED) ====================

/**
 * @deprecated Use ObservationWithMetadata instead
 */
export interface Preference {
  type: 'style' | 'tool' | 'development-process' | 'communication';
  description: string;
  confidence: number;
  frequency: number;
  evidence: string[];
}

/**
 * @deprecated Use ObservationWithMetadata instead
 */
export interface Pattern {
  problem: string;
  solution: string;
  confidence: number;
  occurrences: number;
  evidence: string[];
}

/**
 * @deprecated Use ObservationWithMetadata instead
 */
export interface Workflow {
  name: string;
  steps: string[];
  frequency: number;
  confidence: number;
  evidence: string[];
}

/**
 * @deprecated Use ObservationWithMetadata[] instead
 */
export interface ExtractionResult {
  preferences: Preference[];
  patterns: Pattern[];
  workflows: Workflow[];
}

// ==================== 学习结果类型 (DEPRECATED) ====================

/**
 * @deprecated The toApply/toSuggest split is no longer used in v0.4.0+
 */
export interface LearningResult {
  toApply: (Preference | Pattern | Workflow)[];
  toSuggest: (Preference | Pattern | Workflow)[];
  conflicts: ConflictItem[];
}

/**
 * @deprecated Conflict resolution is now handled by the observation merger
 */
export interface ConflictItem {
  item: Preference | Pattern | Workflow;
  existing: string;
  reason: string;
}

// ==================== 建议类型 (DEPRECATED) ====================

/**
 * @deprecated The pending/approved/rejected suggestion system has been replaced
 * with active/context observation pools in v0.4.0
 */
export interface Suggestion {
  id: string;
  type: 'preference' | 'pattern' | 'workflow';
  item: Preference | Pattern | Workflow;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
}

// ==================== 进化历史类型 (DEPRECATED) ====================

/**
 * @deprecated Evolution history is now tracked through observation metadata
 */
export interface EvolutionHistoryEntry {
  id: string;
  timestamp: string;
  type: 'preference' | 'pattern' | 'workflow';
  action: 'added' | 'updated' | 'removed';
  content: string;
  confidence: number;
  phase: 'observation' | 'suggestion' | 'automatic';
}
