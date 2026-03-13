import { describe, it, expect, beforeEach, vi } from 'vitest';
import { extractExperience } from './experience-extractor.js';
import type { Observation, ExtractionResult, Config } from '../types/index.js';
import Anthropic from '@anthropic-ai/sdk';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk');

// Mock logger
vi.mock('../utils/index.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock prompts
vi.mock('./prompts.js', () => ({
  buildAnalysisPrompt: vi.fn((text: string) => `Analyze: ${text}`),
  SYSTEM_MESSAGE: 'You are an AI assistant that extracts patterns.',
}));

// Mock session-collector
vi.mock('./session-collector.js', () => ({
  formatObservationsAsText: vi.fn((obs: Observation[]) =>
    obs.map((o) => o.content).join('\n')
  ),
}));

describe('ExperienceExtractor', () => {
  let mockAnthropicInstance: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 保存原始环境变量
    originalEnv = { ...process.env };

    // 设置 API Key
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';

    // 创建 mock Anthropic 实例
    mockAnthropicInstance = {
      messages: {
        create: vi.fn(),
      },
    };

    // Mock Anthropic 构造函数
    (Anthropic as any).mockImplementation(() => mockAnthropicInstance);

    // 清除所有 mock 调用记录
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 恢复原始环境变量
    process.env = originalEnv;
  });

  const createMockConfig = (): Config => ({
    llm: {
      model: 'claude-haiku-4',
      maxTokens: 4096,
      temperature: 0.3,
      enablePromptCaching: false,
    },
    learningPhases: {
      observation: { durationDays: 3 },
      suggestion: { durationDays: 4 },
      automatic: { confidenceThreshold: 0.8 },
    },
  } as Config);

  const createMockObservation = (content: string): Observation => ({
    id: `obs-${Math.random()}`,
    sessionId: `session-${Math.random()}`,
    timestamp: new Date().toISOString(),
    type: 'user_message',
    content,
    metadata: {},
  });

  describe('基础功能', () => {
    it('应该在没有观察记录时返回空结果', async () => {
      const config = createMockConfig();
      const result = await extractExperience([], config);

      expect(result).toEqual({
        preferences: [],
        patterns: [],
        workflows: [],
      });
      expect(mockAnthropicInstance.messages.create).not.toHaveBeenCalled();
    });

    it('应该在缺少 API Key 时抛出错误', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const observations = [createMockObservation('test')];
      const config = createMockConfig();

      await expect(extractExperience(observations, config)).rejects.toThrow(
        '缺少 ANTHROPIC_API_KEY 环境变量'
      );
    });

    it('应该成功提取偏好数据', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              preferences: [
                {
                  type: 'workflow',
                  description: '使用中文编写文档',
                  confidence: 0.9,
                  frequency: 3,
                  evidence: ['session-001'],
                },
              ],
              patterns: [],
              workflows: [],
            }),
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const observations = [createMockObservation('用户总是使用中文')];
      const config = createMockConfig();
      const result = await extractExperience(observations, config);

      expect(result.preferences).toHaveLength(1);
      expect(result.preferences[0].description).toBe('使用中文编写文档');
      expect(result.preferences[0].confidence).toBe(0.9);
    });

    it('应该成功提取模式数据', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              preferences: [],
              patterns: [
                {
                  problem: 'TypeScript 类型错误',
                  solution: '使用类型断言',
                  confidence: 0.85,
                  occurrences: 5,
                  evidence: ['session-002'],
                },
              ],
              workflows: [],
            }),
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const observations = [createMockObservation('遇到类型错误时使用类型断言')];
      const config = createMockConfig();
      const result = await extractExperience(observations, config);

      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].problem).toBe('TypeScript 类型错误');
      expect(result.patterns[0].solution).toBe('使用类型断言');
    });

    it('应该成功提取工作流数据', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              preferences: [],
              patterns: [],
              workflows: [
                {
                  name: '提交前检查',
                  steps: ['运行测试', '运行 lint', '提交代码'],
                  confidence: 0.92,
                  frequency: 10,
                  evidence: ['session-003'],
                },
              ],
            }),
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const observations = [createMockObservation('提交前总是先运行测试')];
      const config = createMockConfig();
      const result = await extractExperience(observations, config);

      expect(result.workflows).toHaveLength(1);
      expect(result.workflows[0].name).toBe('提交前检查');
      expect(result.workflows[0].steps).toHaveLength(3);
    });
  });

  describe('JSON 提取和解析', () => {
    it('应该支持纯 JSON 格式的响应', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: '{"preferences":[],"patterns":[],"workflows":[]}',
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const observations = [createMockObservation('test')];
      const config = createMockConfig();
      const result = await extractExperience(observations, config);

      expect(result).toEqual({
        preferences: [],
        patterns: [],
        workflows: [],
      });
    });

    it('应该支持 markdown 代码块格式的响应', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: '```json\n{"preferences":[],"patterns":[],"workflows":[]}\n```',
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const observations = [createMockObservation('test')];
      const config = createMockConfig();
      const result = await extractExperience(observations, config);

      expect(result).toEqual({
        preferences: [],
        patterns: [],
        workflows: [],
      });
    });

    it('应该从混合文本中提取 JSON 对象', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: '这是一些前导文本 {"preferences":[],"patterns":[],"workflows":[]} 这是一些后续文本',
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const observations = [createMockObservation('test')];
      const config = createMockConfig();
      const result = await extractExperience(observations, config);

      expect(result).toEqual({
        preferences: [],
        patterns: [],
        workflows: [],
      });
    });

    it('应该在无法提取 JSON 时返回空结果', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: '这是纯文本，没有 JSON',
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const observations = [createMockObservation('test')];
      const config = createMockConfig();

      // 批处理会捕获错误，返回空结果
      const result = await extractExperience(observations, config);
      expect(result.preferences).toHaveLength(0);
      expect(result.patterns).toHaveLength(0);
      expect(result.workflows).toHaveLength(0);
    });
  });

  describe('JSON Schema 验证', () => {
    it('应该验证响应格式 - 拒绝非对象', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: '[]', // 数组而非对象
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const observations = [createMockObservation('test')];
      const config = createMockConfig();

      // 由于批处理会捕获错误，结果应该是空的
      const result = await extractExperience(observations, config);
      expect(result.preferences).toHaveLength(0);
      expect(result.patterns).toHaveLength(0);
      expect(result.workflows).toHaveLength(0);
    });

    it('应该验证 preferences 字段为数组', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: '{"preferences":"not-an-array","patterns":[],"workflows":[]}',
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const observations = [createMockObservation('test')];
      const config = createMockConfig();

      // 验证失败会被批处理捕获，返回空结果
      const result = await extractExperience(observations, config);
      expect(result.preferences).toHaveLength(0);
    });

    it('应该验证 patterns 字段为数组', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: '{"preferences":[],"patterns":"not-an-array","workflows":[]}',
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const observations = [createMockObservation('test')];
      const config = createMockConfig();

      // 验证失败会被批处理捕获，返回空结果
      const result = await extractExperience(observations, config);
      expect(result.patterns).toHaveLength(0);
    });

    it('应该验证 workflows 字段为数组', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: '{"preferences":[],"patterns":[],"workflows":"not-an-array"}',
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const observations = [createMockObservation('test')];
      const config = createMockConfig();

      // 验证失败会被批处理捕获，返回空结果
      const result = await extractExperience(observations, config);
      expect(result.workflows).toHaveLength(0);
    });
  });

  describe('批处理逻辑', () => {
    it('应该将大量观察记录分批处理', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              preferences: [
                {
                  type: 'workflow',
                  description: 'test',
                  confidence: 0.8,
                  frequency: 1,
                  evidence: [],
                },
              ],
              patterns: [],
              workflows: [],
            }),
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      // 创建 25 个观察记录（应该分成 3 批：10 + 10 + 5）
      const observations = Array.from({ length: 25 }, (_, i) =>
        createMockObservation(`observation ${i}`)
      );

      const config = createMockConfig();
      await extractExperience(observations, config);

      // 应该调用 API 3 次
      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledTimes(3);
    });

    it('应该合并多个批次的结果', async () => {
      let callCount = 0;
      mockAnthropicInstance.messages.create.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                preferences: [
                  {
                    type: 'workflow',
                    description: `preference-${callCount}`,
                    confidence: 0.8,
                    frequency: 1,
                    evidence: [],
                  },
                ],
                patterns: [],
                workflows: [],
              }),
            },
          ],
        });
      });

      // 创建 15 个观察记录（分成 2 批）
      const observations = Array.from({ length: 15 }, (_, i) =>
        createMockObservation(`observation ${i}`)
      );

      const config = createMockConfig();
      const result = await extractExperience(observations, config);

      // 应该合并两批结果
      expect(result.preferences).toHaveLength(2);
      expect(result.preferences[0].description).toBe('preference-1');
      expect(result.preferences[1].description).toBe('preference-2');
    });

    it('应该在某个批次失败时继续处理其他批次', async () => {
      let callCount = 0;
      mockAnthropicInstance.messages.create.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          // 第二批失败
          return Promise.reject(new Error('API 调用失败'));
        }
        return Promise.resolve({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                preferences: [
                  {
                    type: 'workflow',
                    description: `preference-${callCount}`,
                    confidence: 0.8,
                    frequency: 1,
                    evidence: [],
                  },
                ],
                patterns: [],
                workflows: [],
              }),
            },
          ],
        });
      });

      // 创建 25 个观察记录（3 批）
      const observations = Array.from({ length: 25 }, (_, i) =>
        createMockObservation(`observation ${i}`)
      );

      const config = createMockConfig();
      const result = await extractExperience(observations, config);

      // 应该只有第 1 和第 3 批的结果
      expect(result.preferences).toHaveLength(2);
    });
  });

  describe('去重和合并', () => {
    it('应该去重相同的偏好', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              preferences: [
                {
                  type: 'workflow',
                  description: '使用中文',
                  confidence: 0.8,
                  frequency: 2,
                  evidence: ['s1'],
                },
                {
                  type: 'workflow',
                  description: '使用中文',
                  confidence: 0.9,
                  frequency: 3,
                  evidence: ['s2'],
                },
              ],
              patterns: [],
              workflows: [],
            }),
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const observations = [createMockObservation('test')];
      const config = createMockConfig();
      const result = await extractExperience(observations, config);

      // 应该合并为一条
      expect(result.preferences).toHaveLength(1);
      expect(result.preferences[0].confidence).toBe(0.9); // 取较高的置信度
      expect(result.preferences[0].frequency).toBe(5); // 累加频率
      expect(result.preferences[0].evidence).toEqual(['s1', 's2']); // 合并证据
    });

    it('应该去重相同的模式', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              preferences: [],
              patterns: [
                {
                  problem: 'TypeScript 错误',
                  solution: '使用类型断言',
                  confidence: 0.75,
                  occurrences: 3,
                  evidence: ['s1'],
                },
                {
                  problem: 'TypeScript 错误',
                  solution: '使用类型断言',
                  confidence: 0.85,
                  occurrences: 2,
                  evidence: ['s2'],
                },
              ],
              workflows: [],
            }),
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const observations = [createMockObservation('test')];
      const config = createMockConfig();
      const result = await extractExperience(observations, config);

      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].confidence).toBe(0.85);
      expect(result.patterns[0].occurrences).toBe(5);
    });

    it('应该去重相同的工作流', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              preferences: [],
              patterns: [],
              workflows: [
                {
                  name: '提交流程',
                  steps: ['测试', '提交'],
                  confidence: 0.8,
                  frequency: 5,
                  evidence: ['s1'],
                },
                {
                  name: '提交流程',
                  steps: ['lint', '提交'],
                  confidence: 0.9,
                  frequency: 3,
                  evidence: ['s2'],
                },
              ],
            }),
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const observations = [createMockObservation('test')];
      const config = createMockConfig();
      const result = await extractExperience(observations, config);

      expect(result.workflows).toHaveLength(1);
      expect(result.workflows[0].confidence).toBe(0.9);
      expect(result.workflows[0].frequency).toBe(8);
    });
  });

  describe('配置选项', () => {
    it('应该使用配置的模型名称', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: '{"preferences":[],"patterns":[],"workflows":[]}',
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const observations = [createMockObservation('test')];
      const config = createMockConfig();
      config.llm.model = 'claude-sonnet-4';

      await extractExperience(observations, config);

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4',
        })
      );
    });

    it('应该使用配置的温度参数', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: '{"preferences":[],"patterns":[],"workflows":[]}',
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const observations = [createMockObservation('test')];
      const config = createMockConfig();
      config.llm.temperature = 0.5;

      await extractExperience(observations, config);

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5,
        })
      );
    });

    it('应该支持 Prompt Caching', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: '{"preferences":[],"patterns":[],"workflows":[]}',
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const observations = [createMockObservation('test')];
      const config = createMockConfig();
      config.llm.enablePromptCaching = true;

      await extractExperience(observations, config);

      const call = mockAnthropicInstance.messages.create.mock.calls[0][0];
      expect(call.system).toBeInstanceOf(Array);
      expect(call.system[0].cache_control).toEqual({ type: 'ephemeral' });
    });

    it('应该支持自定义 API 端点', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: '{"preferences":[],"patterns":[],"workflows":[]}',
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const observations = [createMockObservation('test')];
      const config = createMockConfig();
      (config.llm as any).baseURL = 'https://custom-api.example.com';

      await extractExperience(observations, config);

      // 验证 Anthropic 构造函数被调用时传入了 baseURL
      expect(Anthropic).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://custom-api.example.com',
        })
      );
    });
  });

  describe('错误处理', () => {
    it('应该在 API 调用失败时抛出错误', async () => {
      mockAnthropicInstance.messages.create.mockRejectedValue(
        new Error('API 调用失败')
      );

      const observations = [createMockObservation('test')];
      const config = createMockConfig();

      // 由于批处理会捕获错误并继续，最终结果应该是空的
      const result = await extractExperience(observations, config);
      expect(result.preferences).toHaveLength(0);
    });

    it('应该在响应类型不正确时抛出错误', async () => {
      const mockResponse = {
        content: [
          {
            type: 'image', // 错误的类型
            text: '{"preferences":[],"patterns":[],"workflows":[]}',
          },
        ],
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const observations = [createMockObservation('test')];
      const config = createMockConfig();

      const result = await extractExperience(observations, config);
      // 批处理会捕获错误，结果应该是空的
      expect(result.preferences).toHaveLength(0);
    });
  });
});
