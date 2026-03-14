/**
 * Claude Mem HTTP 客户端
 * 基于 claude-mem Worker Service API (port 37777)
 *
 * API 文档参考: claude-mem-architecture-guide.md
 */

import { Observation } from '../types/index.js';
import { logger } from '../utils/index.js';

/**
 * HTTP API 响应类型
 * @private (currently unused but kept for future API improvements)
 */
 
interface _ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

/**
 * Observations 查询参数
 */
interface ObservationsQuery {
  offset?: number;
  limit?: number;
  project?: string;
  memory_session_id?: string;
  type?: string;
  created_at_start?: number; // Unix timestamp (epoch)
  created_at_end?: number;   // Unix timestamp (epoch)
}

/**
 * Claude Mem HTTP 客户端
 */
export class ClaudeMemHTTPClient {
  private baseUrl: string;
  private connected = false;

  constructor(baseUrl: string = 'http://localhost:37777') {
    this.baseUrl = baseUrl;
  }

  /**
   * 连接到 claude-mem Worker Service
   * (HTTP 不需要显式连接,这里只是验证服务可用性)
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      logger.debug('正在验证 claude-mem HTTP 服务可用性...');

      // 尝试获取统计数据验证服务是否运行
      const response = await fetch(`${this.baseUrl}/api/stats`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5秒超时
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.connected = true;
      logger.success('✓ claude-mem HTTP 服务可用');
    } catch (error) {
      logger.error('连接 claude-mem HTTP 服务失败:', error);
      throw new Error(
        `无法连接到 claude-mem Worker Service (${this.baseUrl}). 请确认服务正在运行。`
      );
    }
  }

  /**
   * 断开连接 (HTTP 无需断开)
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    logger.debug('HTTP 客户端已关闭');
  }

  /**
   * 确保已连接
   */
  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('HTTP 客户端未连接');
    }
  }

  /**
   * 获取观察记录 (主要方法)
   */
  async getObservations(query: ObservationsQuery = {}): Promise<Observation[]> {
    this.ensureConnected();

    try {
      // 构建查询参数
      const params = new URLSearchParams();
      if (query.offset !== undefined) params.set('offset', query.offset.toString());
      if (query.limit !== undefined) params.set('limit', query.limit.toString());
      if (query.project) params.set('project', query.project);
      if (query.memory_session_id) params.set('memory_session_id', query.memory_session_id);
      if (query.type) params.set('type', query.type);
      if (query.created_at_start) params.set('created_at_start', query.created_at_start.toString());
      if (query.created_at_end) params.set('created_at_end', query.created_at_end.toString());

      const url = `${this.baseUrl}/api/observations?${params.toString()}`;
      logger.debug(`GET ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000), // 30秒超时
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();

      // 根据实际 API 响应,可能的结构:
      // 1. {items: [...], hasMore: boolean, offset: number, limit: number}
      // 2. {observations: [...]}
      // 3. {data: [...]}
      // 4. 直接是数组 [...]
      let observations: Observation[];

      if (Array.isArray(data)) {
        observations = data;
      } else if (data.items && Array.isArray(data.items)) {
        observations = data.items;
      } else if (data.observations && Array.isArray(data.observations)) {
        observations = data.observations;
      } else if (data.data && Array.isArray(data.data)) {
        observations = data.data;
      } else {
        logger.warn('API 返回格式未知:', JSON.stringify(data).substring(0, 200));
        throw new Error('API 返回格式不正确');
      }

      logger.debug(`✓ 获取到 ${observations.length} 条观察记录`);
      return observations;
    } catch (error) {
      logger.error('获取观察记录失败:', error);
      throw error;
    }
  }

  /**
   * 根据时间范围获取观察记录
   */
  async getObservationsByTimeRange(
    startDate: Date | null,
    endDate: Date = new Date(),
    options: Partial<ObservationsQuery> = {}
  ): Promise<Observation[]> {
    const query: ObservationsQuery = {
      ...options,
      limit: options.limit || 200, // 默认最多获取200条
    };

    // 设置时间范围 (转换为 Unix epoch)
    if (startDate) {
      query.created_at_start = Math.floor(startDate.getTime() / 1000);
    }
    query.created_at_end = Math.floor(endDate.getTime() / 1000);

    logger.debug(`时间范围: ${startDate?.toISOString() || '最早'} 至 ${endDate.toISOString()}`);

    return this.getObservations(query);
  }

  /**
   * 根据类型获取观察记录
   */
  async getObservationsByType(
    type: string | string[],
    options: Partial<ObservationsQuery> = {}
  ): Promise<Observation[]> {
    const typeQuery = Array.isArray(type) ? type.join(',') : type;

    return this.getObservations({
      ...options,
      type: typeQuery,
    });
  }

  /**
   * 根据项目获取观察记录
   */
  async getObservationsByProject(
    project: string,
    options: Partial<ObservationsQuery> = {}
  ): Promise<Observation[]> {
    return this.getObservations({
      ...options,
      project,
    });
  }

  /**
   * 带重试机制的查询
   */
  async getObservationsWithRetry(
    query: ObservationsQuery,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<Observation[]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.getObservations(query);
      } catch (error) {
        lastError = error as Error;
        logger.warn(`查询尝试 ${attempt}/${maxRetries} 失败:`, error);

        if (attempt < maxRetries) {
          logger.debug(`等待 ${retryDelay}ms 后重试...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          // 指数退避
          retryDelay *= 2;
        }
      }
    }

    throw lastError || new Error('查询失败');
  }

  /**
   * 分页获取所有观察记录
   */
  async getAllObservations(
    query: Partial<ObservationsQuery> = {},
    pageSize: number = 100
  ): Promise<Observation[]> {
    const allObservations: Observation[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const page = await this.getObservations({
        ...query,
        offset,
        limit: pageSize,
      });

      allObservations.push(...page);

      if (page.length < pageSize) {
        hasMore = false;
      } else {
        offset += pageSize;
      }

      logger.debug(`已获取 ${allObservations.length} 条记录...`);
    }

    logger.success(`✓ 总计获取 ${allObservations.length} 条观察记录`);
    return allObservations;
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    total_observations: number;
    total_projects: number;
    by_type: Record<string, number>;
  }> {
    this.ensureConnected();

    try {
      const response = await fetch(`${this.baseUrl}/api/stats`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();
      return data as {
        total_observations: number;
        total_projects: number;
        by_type: Record<string, number>;
      };
    } catch (error) {
      logger.error('获取统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 搜索观察记录 (语义搜索)
   */
  async search(query: string, limit: number = 20): Promise<Observation[]> {
    this.ensureConnected();

    try {
      const params = new URLSearchParams({
        query,
        limit: limit.toString(),
      });

      const response = await fetch(`${this.baseUrl}/api/search?${params.toString()}`, {
        method: 'GET',
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();

      // 解析可能的响应格式
      let results: Observation[];
      if (Array.isArray(data)) {
        results = data;
      } else if (data.items && Array.isArray(data.items)) {
        results = data.items;
      } else if (data.results && Array.isArray(data.results)) {
        results = data.results;
      } else if (data.data && Array.isArray(data.data)) {
        results = data.data;
      } else {
        results = [];
      }

      logger.debug(`✓ 搜索到 ${results.length} 条相关记录`);
      return results;
    } catch (error) {
      logger.error('搜索失败:', error);
      throw error;
    }
  }
}

/**
 * 创建并连接 HTTP 客户端
 */
export async function createHTTPClient(baseUrl?: string): Promise<ClaudeMemHTTPClient> {
  const client = new ClaudeMemHTTPClient(baseUrl);
  await client.connect();
  return client;
}
