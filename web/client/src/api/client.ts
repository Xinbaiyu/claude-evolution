/**
 * API 客户端封装
 * 统一处理所有后端 API 调用、错误处理和 Toast 提示
 */

const API_BASE_URL = 'http://localhost:10010/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SystemStatus {
  scheduler: {
    enabled: boolean;
    interval: string;
    lastRun: string | null;
  };
  observations: {
    active: number;
    context: number;
    total: number;
  };
  metrics: {
    avgConfidence: number;
  };
  server: {
    uptime: number;
    version: string;
  };
}

export interface LearningStats {
  pools: {
    active: {
      total: number;
      tiers: {
        gold: number;
        silver: number;
        bronze: number;
      };
      types: Record<string, number>;
      manualOverrides: {
        promoted: number;
        demoted: number;
        ignored: number;
      };
    };
    context: {
      total: number;
      tiers: {
        gold: number;
        silver: number;
        bronze: number;
      };
      types: Record<string, number>;
      manualOverrides: {
        promoted: number;
        demoted: number;
        ignored: number;
      };
    };
    archived: {
      total: number;
      types: Record<string, number>;
    };
  };
  summary: {
    totalObservations: number;
    activeObservations: number;
    contextObservations: number;
    archivedObservations: number;
  };
}

export interface SimilarityWarning {
  deletedId: string;
  deletedAt: string;
  similarity: number;
}

export interface ObservationWithMetadata {
  id: string;
  sessionId: string;
  timestamp: string;
  type: 'preference' | 'pattern' | 'workflow';
  confidence: number;
  evidence: string[];
  item: {
    type?: string;
    description?: string;
    problem?: string;
    solution?: string;
    name?: string;
    steps?: string[];
    confidence?: number;
    frequency?: number;
    occurrences?: number;
  };
  mentions: number;
  lastSeen: string;
  firstSeen: string;
  originalConfidence: number;
  inContext: boolean;
  manualOverride?: {
    action: 'promote' | 'demote' | 'ignore';
    timestamp: string;
    reason?: string;
    inheritedFrom?: string;
  };
  mergedFrom?: string[];
  promotedAt?: string;
  promotionReason?: 'auto' | 'manual';
  archiveTimestamp?: string;
  archiveReason?: 'active_capacity' | 'context_capacity' | 'user_ignored' | 'user_deleted' | 'expired';
  suppressSimilar?: boolean;
  suppressionCount?: number;
  lastBlockedAt?: string;
  similarToDeleted?: SimilarityWarning;
  // Pinning fields
  pinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: string;
  // Merge info
  mergeInfo?: {
    mergedFromIgnored?: boolean;
    originalIgnoredId?: string;
  };
}

export interface LearningObservations {
  active?: ObservationWithMetadata[];
  context?: ObservationWithMetadata[];
  archived?: ObservationWithMetadata[];
}

export interface Config {
  learningPhases: {
    observation: { durationDays: number };
    suggestion: { durationDays: number };
    automatic: { confidenceThreshold: number };
  };
  scheduler: {
    enabled: boolean;
    interval: string;
  };
  llm: {
    model: string;
    maxTokens: number;
    temperature: number;
    enablePromptCaching?: boolean;
    baseURL?: string;
  };
  learning?: {
    enabled: boolean;
    capacity: {
      active: {
        targetSize: number;
        maxSize: number;
        minSize: number;
      };
      context: {
        enabled: boolean;
        targetSize: number;
        maxSize: number;
        halfLifeDays: number;
      };
    };
    decay: {
      enabled: boolean;
      halfLifeDays: number;
    };
    promotion: {
      autoConfidence: number;
      autoMentions: number;
      highConfidence: number;
      highMentions: number;
      candidateConfidence: number;
      candidateMentions: number;
    };
    deletion: {
      immediateThreshold: number;
      delayedThreshold: number;
      delayedDays: number;
    };
    retention: {
      archivedDays: number;
    };
  };
}

export interface AnalysisStatus {
  isRunning: boolean;
  startTime: string | null;
  runId: string | null;
}

export interface StatsOverview {
  typeDistribution: Array<{ type: string; count: number }>;
  analysisTrend: Array<{ date: string; runCount: number; mergedCount: number }>;
  trendDays: number;
}

export interface AnalysisStep {
  step: number;
  name: string;
  status: 'success' | 'failed' | 'skipped';
  duration?: number;
  output?: string;
  error?: string;
}

export interface AnalysisRun {
  id: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'running' | 'success' | 'failed';
  error?: {
    message: string;
    stack?: string;
  };
  steps: AnalysisStep[];
  stats?: {
    merged: number;
    promoted: number;
    archived: number;
  };
}

class ApiError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

/**
 * 发送 HTTP 请求
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // 网络错误或其他错误
    throw new ApiError(
      error instanceof Error ? error.message : '网络请求失败'
    );
  }
}

/**
 * API 客户端
 */
export const apiClient = {
  /**
   * 获取系统状态
   */
  async getStatus(): Promise<SystemStatus> {
    const response = await request<SystemStatus>('/status');
    if (!response.success || !response.data) {
      throw new ApiError(response.error || '获取系统状态失败');
    }
    return response.data;
  },

  /**
   * 获取配置
   */
  async getConfig(): Promise<Config> {
    const response = await request<Config>('/config');
    if (!response.success || !response.data) {
      throw new ApiError(response.error || '获取配置失败');
    }
    return response.data;
  },

  /**
   * 更新配置
   */
  async updateConfig(config: Partial<Config>): Promise<void> {
    const response = await request('/config', {
      method: 'PATCH',
      body: JSON.stringify(config),
    });
    if (!response.success) {
      throw new ApiError(response.error || '更新配置失败');
    }
  },

  /**
   * 手动触发分析
   */
  async triggerAnalysis(): Promise<void> {
    const response = await request('/analyze', {
      method: 'POST',
    });
    if (!response.success) {
      throw new ApiError(response.error || '触发分析失败');
    }
  },

  // ========== Learning System API ==========

  /**
   * 获取学习系统观察列表
   */
  async getLearningObservations(pool?: 'active' | 'context' | 'archived'): Promise<LearningObservations> {
    const params = pool ? `?pool=${pool}` : '';
    const response = await request<LearningObservations>(`/learning/observations${params}`);
    if (!response.success || !response.data) {
      throw new ApiError(response.error || '获取观察列表失败');
    }
    return response.data;
  },

  /**
   * 手动提升观察到上下文
   */
  async promoteObservation(id: string): Promise<void> {
    const response = await request('/learning/promote', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
    if (!response.success) {
      throw new ApiError(response.error || '提升观察失败');
    }
  },

  /**
   * 手动降级观察
   */
  async demoteObservation(id: string): Promise<void> {
    const response = await request('/learning/demote', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
    if (!response.success) {
      throw new ApiError(response.error || '降级观察失败');
    }
  },

  /**
   * 标记观察为忽略
   */
  async ignoreObservation(id: string, reason?: string): Promise<void> {
    const response = await request('/learning/ignore', {
      method: 'POST',
      body: JSON.stringify({ id, reason }),
    });
    if (!response.success) {
      throw new ApiError(response.error || '忽略观察失败');
    }
  },

  /**
   * 删除观察
   */
  async deleteObservation(id: string): Promise<void> {
    const response = await request('/learning/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
    if (!response.success) {
      throw new ApiError(response.error || '删除观察失败');
    }
  },

  /**
   * 从归档恢复观察
   */
  async restoreObservation(id: string): Promise<void> {
    const response = await request('/learning/restore', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
    if (!response.success) {
      throw new ApiError(response.error || '恢复观察失败');
    }
  },

  /**
   * 获取学习系统统计数据
   */
  async getLearningStats(): Promise<LearningStats> {
    const response = await request<LearningStats>('/learning/stats');
    if (!response.success || !response.data) {
      throw new ApiError(response.error || '获取学习统计失败');
    }
    return response.data;
  },

  /**
   * 更新学习系统配置
   */
  async updateLearningConfig(config: Partial<Config['learning']>): Promise<void> {
    const response = await request('/learning/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
    if (!response.success) {
      throw new ApiError(response.error || '更新学习配置失败');
    }
  },

  // ========== Batch Operations ==========

  /**
   * 批量提升观察到上下文
   */
  async batchPromoteObservations(ids: string[]): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    results: Array<{ id: string; success: boolean; error?: string }>;
  }> {
    const response = await request<{
      total: number;
      succeeded: number;
      failed: number;
      results: Array<{ id: string; success: boolean; error?: string }>;
    }>('/learning/batch/promote', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    if (!response.success || !response.data) {
      throw new ApiError(response.error || '批量提升观察失败');
    }
    return response.data;
  },

  /**
   * 批量忽略观察
   */
  async batchIgnoreObservations(
    ids: string[],
    reason?: string
  ): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    results: Array<{ id: string; success: boolean; pool?: string; error?: string }>;
  }> {
    const response = await request<{
      total: number;
      succeeded: number;
      failed: number;
      results: Array<{ id: string; success: boolean; pool?: string; error?: string }>;
    }>('/learning/batch/ignore', {
      method: 'POST',
      body: JSON.stringify({ ids, reason }),
    });
    if (!response.success || !response.data) {
      throw new ApiError(response.error || '批量忽略观察失败');
    }
    return response.data;
  },

  /**
   * 批量删除观察（移动到归档池）
   */
  async batchDeleteObservations(ids: string[]): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    results: Array<{ id: string; success: boolean; pool?: string; error?: string }>;
  }> {
    const response = await request<{
      total: number;
      succeeded: number;
      failed: number;
      results: Array<{ id: string; success: boolean; pool?: string; error?: string }>;
    }>('/learning/batch/delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    if (!response.success || !response.data) {
      throw new ApiError(response.error || '批量删除观察失败');
    }
    return response.data;
  },

  // ========== Pin/Unpin Operations ==========

  /**
   * Pin observation in Context Pool
   */
  async pinObservation(id: string): Promise<void> {
    const response = await request('/learning/pin', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
    if (!response.success) {
      throw new ApiError(response.error || 'Pin observation failed');
    }
  },

  /**
   * Unpin observation in Context Pool
   */
  async unpinObservation(id: string): Promise<void> {
    const response = await request('/learning/unpin', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
    if (!response.success) {
      throw new ApiError(response.error || 'Unpin observation failed');
    }
  },

  /**
   * Batch pin observations
   */
  async batchPinObservations(ids: string[]): Promise<{
    pinned: number;
    alreadyPinned: number;
    notFound: number;
  }> {
    const response = await request<{
      pinned: number;
      alreadyPinned: number;
      notFound: number;
    }>('/learning/batch/pin', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    if (!response.success || !response.data) {
      throw new ApiError(response.error || 'Batch pin observations failed');
    }
    return response.data;
  },

  /**
   * Batch unpin observations
   */
  async batchUnpinObservations(ids: string[]): Promise<{
    unpinned: number;
    alreadyUnpinned: number;
    notFound: number;
  }> {
    const response = await request<{
      unpinned: number;
      alreadyUnpinned: number;
      notFound: number;
    }>('/learning/batch/unpin', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    if (!response.success || !response.data) {
      throw new ApiError(response.error || 'Batch unpin observations failed');
    }
    return response.data;
  },

  /**
   * Restore observation from archive
   */
  async unignoreObservation(id: string, targetPool: 'active' | 'context'): Promise<void> {
    const response = await request('/learning/unignore', {
      method: 'POST',
      body: JSON.stringify({ id, targetPool }),
    });
    if (!response.success) {
      throw new ApiError(response.error || 'Restore observation failed');
    }
  },

  /**
   * Batch restore observations from archive
   */
  async batchUnignoreObservations(
    ids: string[],
    targetPool: 'active' | 'context'
  ): Promise<{
    restored: number;
    alreadyRestored: number;
    notFound: number;
  }> {
    const response = await request<{
      restored: number;
      alreadyRestored: number;
      notFound: number;
    }>('/learning/batch/unignore', {
      method: 'POST',
      body: JSON.stringify({ ids, targetPool }),
    });
    if (!response.success || !response.data) {
      throw new ApiError(response.error || 'Batch restore observations failed');
    }
    return response.data;
  },

  // ========== Stats API ==========

  /**
   * 获取统计概览数据（图表用）
   * 网络失败时静默降级
   */
  async getStatsOverview(): Promise<StatsOverview> {
    try {
      const response = await request<StatsOverview>('/stats/overview');
      if (!response.success || !response.data) {
        return { typeDistribution: [], analysisTrend: [], trendDays: 30 };
      }
      return response.data;
    } catch {
      return { typeDistribution: [], analysisTrend: [], trendDays: 30 };
    }
  },

  // ========== Analysis Status API ==========

  /**
   * 查询当前分析运行状态（用于页面刷新后恢复 loading 状态）
   * 网络失败时静默降级，不抛出异常
   */
  async getAnalysisStatus(): Promise<AnalysisStatus> {
    try {
      const response = await request<AnalysisStatus>('/analyze/status');
      if (!response.success || !response.data) {
        return { isRunning: false, startTime: null, runId: null };
      }
      return response.data;
    } catch {
      return { isRunning: false, startTime: null, runId: null };
    }
  },

  // ========== Analysis Logs API ==========

  /**
   * 获取分析日志列表
   */
  async getAnalysisLogs(options?: { limit?: number; offset?: number }): Promise<AnalysisRun[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    const query = params.toString() ? `?${params.toString()}` : '';

    const response = await request<AnalysisRun[]>(`/analysis-logs${query}`);
    if (!response.success || !response.data) {
      throw new ApiError(response.error || '获取分析日志失败');
    }
    return response.data;
  },

  /**
   * 根据 ID 获取单条分析记录
   */
  async getAnalysisLogById(runId: string): Promise<AnalysisRun> {
    const response = await request<AnalysisRun>(`/analysis-logs/${runId}`);
    if (!response.success || !response.data) {
      throw new ApiError(response.error || '获取分析记录失败');
    }
    return response.data;
  },
};

export { ApiError };
