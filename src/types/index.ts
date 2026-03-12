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

// ==================== 经验提取类型 ====================
export interface Preference {
  type: 'style' | 'tool' | 'workflow' | 'communication';
  description: string;
  confidence: number;
  frequency: number;
  evidence: string[];
}

export interface Pattern {
  problem: string;
  solution: string;
  confidence: number;
  occurrences: number;
  evidence: string[];
}

export interface Workflow {
  name: string;
  steps: string[];
  frequency: number;
  confidence: number;
  evidence: string[];
}

export interface ExtractionResult {
  preferences: Preference[];
  patterns: Pattern[];
  workflows: Workflow[];
}

// ==================== 学习结果类型 ====================
export interface LearningResult {
  toApply: (Preference | Pattern | Workflow)[];
  toSuggest: (Preference | Pattern | Workflow)[];
  conflicts: ConflictItem[];
}

export interface ConflictItem {
  item: Preference | Pattern | Workflow;
  existing: string;
  reason: string;
}

// ==================== 建议类型 ====================
export interface Suggestion {
  id: string;
  type: 'preference' | 'pattern' | 'workflow';
  item: Preference | Pattern | Workflow;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
}

// ==================== 进化历史类型 ====================
export interface EvolutionHistoryEntry {
  id: string;
  timestamp: string;
  type: 'preference' | 'pattern' | 'workflow';
  action: 'added' | 'updated' | 'removed';
  content: string;
  confidence: number;
  phase: 'observation' | 'suggestion' | 'automatic';
}

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
