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

export interface Suggestion {
  id: string;
  type: 'preference' | 'pattern' | 'workflow';
  item: Preference | Pattern | Workflow;
  createdAt: string;
}

export interface Preference {
  type: string;
  description: string;
  confidence: number;
  frequency: number;
  evidence?: string[];
}

export interface Pattern {
  problem: string;
  solution: string;
  confidence: number;
  occurrences: number;
  evidence?: string[];
}

export interface Workflow {
  name: string;
  steps: string[];
  confidence: number;
  frequency: number;
  evidence?: string[];
}

export interface SystemStatus {
  scheduler: {
    enabled: boolean;
    interval: string;
    lastRun: string | null;
  };
  suggestions: {
    pending: number;
    approved: number;
    rejected: number;
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
   * 获取建议列表
   */
  async getSuggestions(): Promise<Suggestion[]> {
    const response = await request<Suggestion[]>('/suggestions');
    if (!response.success || !response.data) {
      throw new ApiError(response.error || '获取建议列表失败');
    }
    return response.data;
  },

  /**
   * 获取建议详情
   */
  async getSuggestion(id: string): Promise<Suggestion> {
    const response = await request<Suggestion>(`/suggestions/${id}`);
    if (!response.success || !response.data) {
      throw new ApiError(response.error || '获取建议详情失败');
    }
    return response.data;
  },

  /**
   * 批准建议
   */
  async approveSuggestion(id: string): Promise<void> {
    const response = await request(`/suggestions/${id}/approve`, {
      method: 'POST',
    });
    if (!response.success) {
      throw new ApiError(response.error || '批准建议失败');
    }
  },

  /**
   * 拒绝建议
   */
  async rejectSuggestion(id: string): Promise<void> {
    const response = await request(`/suggestions/${id}/reject`, {
      method: 'POST',
    });
    if (!response.success) {
      throw new ApiError(response.error || '拒绝建议失败');
    }
  },

  /**
   * 批量批准建议
   */
  async batchApproveSuggestions(ids: string[]): Promise<void> {
    const response = await request('/suggestions/batch/approve', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    if (!response.success) {
      throw new ApiError(response.error || '批量批准失败');
    }
  },

  /**
   * 批量拒绝建议 (BATCH-REJECT-4)
   */
  async batchRejectSuggestions(ids: string[]): Promise<void> {
    const response = await request('/suggestions/batch/reject', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    if (!response.success) {
      throw new ApiError(response.error || '批量拒绝失败');
    }
  },

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
};

export { ApiError };
