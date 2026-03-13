import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Observation, SearchResult, TimelineResult } from '../types/index.js';
import { logger } from '../utils/index.js';

/**
 * Claude Mem MCP 客户端
 * 实现三层检索策略:
 * 1. search - 获取索引(轻量级)
 * 2. timeline - 获取上下文
 * 3. getObservations - 获取完整内容
 */
export class ClaudeMemMCPClient {
  private client: Client | null = null;
  private connected = false;

  /**
   * 连接到 MCP 服务
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      logger.debug('正在连接 claude-mem MCP 服务...');

      const transport = new StdioClientTransport({
        command: 'npx',
        args: ['-y', 'claude-mem-mcp'],
      });

      this.client = new Client(
        {
          name: 'claude-evolution',
          version: '0.1.0',
        },
        {
          capabilities: {},
        }
      );

      await this.client.connect(transport);
      this.connected = true;

      logger.success('✓ 已连接到 claude-mem MCP 服务');
    } catch (error) {
      logger.error('连接 MCP 服务失败:', error);
      throw error;
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.close();
      this.connected = false;
      logger.debug('已断开 MCP 连接');
    }
  }

  /**
   * 确保已连接
   */
  private ensureConnected(): void {
    if (!this.connected || !this.client) {
      throw new Error('MCP 客户端未连接');
    }
  }

  /**
   * 第一层: 搜索 - 获取观察记录的索引
   */
  async search(params: {
    dateStart?: string;
    dateEnd?: string;
    project?: string;
    type?: string;
    obs_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<SearchResult[]> {
    this.ensureConnected();

    try {
      logger.debug('执行 search 查询:', params);

      const result = await this.client!.callTool({
        name: 'mcp__plugin_claude-mem_mcp-search__search',
        arguments: params,
      });

      // 解析返回结果
      const content = (result.content as any)[0];
      if (content.type !== 'text') {
        throw new Error('意外的返回类型');
      }

      const data = JSON.parse(content.text);
      logger.debug(`✓ search 返回 ${data.length} 条结果`);

      return data;
    } catch (error) {
      logger.error('search 查询失败:', error);
      throw error;
    }
  }

  /**
   * 第二层: 时间线 - 获取特定观察记录的上下文
   */
  async timeline(params: {
    anchor?: number;
    query?: string;
    depth_before?: number;
    depth_after?: number;
    project?: string;
  }): Promise<TimelineResult> {
    this.ensureConnected();

    try {
      logger.debug('执行 timeline 查询:', params);

      const result = await this.client!.callTool({
        name: 'mcp__plugin_claude-mem_mcp-search__timeline',
        arguments: params,
      });

      const content = (result.content as any)[0];
      if (content.type !== 'text') {
        throw new Error('意外的返回类型');
      }

      const data = JSON.parse(content.text);
      logger.debug('✓ timeline 查询完成');

      return data;
    } catch (error) {
      logger.error('timeline 查询失败:', error);
      throw error;
    }
  }

  /**
   * 第三层: 获取完整观察记录
   */
  async getObservations(ids: number[]): Promise<Observation[]> {
    this.ensureConnected();

    try {
      logger.debug(`执行 getObservations 查询: ${ids.length} 条记录`);

      const result = await this.client!.callTool({
        name: 'mcp__plugin_claude-mem_mcp-search__get_observations',
        arguments: { ids },
      });

      const content = (result.content as any)[0];
      if (content.type !== 'text') {
        throw new Error('意外的返回类型');
      }

      const data = JSON.parse(content.text);
      logger.debug(`✓ getObservations 返回 ${data.length} 条记录`);

      return data;
    } catch (error) {
      logger.error('getObservations 查询失败:', error);
      throw error;
    }
  }

  /**
   * 高层封装: 带重试机制的搜索
   */
  async searchWithRetry(
    params: Parameters<typeof this.search>[0],
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<SearchResult[]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.search(params);
      } catch (error) {
        lastError = error as Error;
        logger.warn(`search 尝试 ${attempt}/${maxRetries} 失败:`, error);

        if (attempt < maxRetries) {
          logger.debug(`等待 ${retryDelay}ms 后重试...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    throw lastError || new Error('搜索失败');
  }

  /**
   * 高层封装: 批量获取观察记录
   */
  async getObservationsBatch(
    ids: number[],
    batchSize: number = 10
  ): Promise<Observation[]> {
    const results: Observation[] = [];

    // 分批处理
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      logger.debug(`处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(ids.length / batchSize)}`);

      const observations = await this.getObservations(batch);
      results.push(...observations);
    }

    return results;
  }
}

/**
 * 创建并连接 MCP 客户端
 */
export async function createMCPClient(): Promise<ClaudeMemMCPClient> {
  const client = new ClaudeMemMCPClient();
  await client.connect();
  return client;
}
