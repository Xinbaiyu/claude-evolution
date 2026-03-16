/**
 * 全局类型定义
 */

// ==================== 观察记录类型 ====================
export interface Observation {
  id: number;
  created_at: string;
  type: 'feature' | 'bugfix' | 'refactor' | 'discovery' | 'decision';
  title: string;
  narrative: string;
  tokens_read?: number;
  tokens_work?: number;
  project?: string;
}

// ==================== MCP 相关类型 ====================
export interface SearchResult {
  id: number;
  title: string;
  type: string;
  created_at: string;
  score: number;
}

export interface TimelineResult {
  anchor: Observation;
  before: Observation[];
  after: Observation[];
}

// ==================== Legacy Types (Re-exported for Migration) ====================
// DEPRECATED: These are re-exported from legacy.ts for backward compatibility
// DO NOT use these in new code - use ObservationWithMetadata instead
export type {
  Preference,
  Pattern,
  Workflow,
  ExtractionResult,
  LearningResult,
  ConflictItem,
  Suggestion,
  EvolutionHistoryEntry,
} from './legacy.js';

// ==================== 学习阶段类型 ====================
export type LearningPhase = 'observation' | 'suggestion' | 'automatic';

// ==================== 系统状态类型 ====================
export interface SystemState {
  installDate: string;
  lastAnalysisTime: string | null;
  lastAnalysisSuccess: boolean;
  totalAnalyses: number;
  currentPhase: LearningPhase;
}
