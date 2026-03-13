import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import fs from 'fs-extra';
import { learnPreferences } from './preference-learner.js';
import { useTempDir } from '../../tests/helpers/temp-dir.js';
import { createMockPreference, createMockPattern, createMockWorkflow } from '../../tests/helpers/mock-data.js';
import type { ExtractionResult, LearningPhase, Config } from '../types/index.js';

// Mock getEvolutionDir
let testDir: string;

vi.mock('../config/loader.js', () => ({
  getEvolutionDir: () => testDir,
  loadConfig: vi.fn(),
}));

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

describe('PreferenceLearner', () => {
  const { getTempDir } = useTempDir();

  beforeEach(async () => {
    testDir = getTempDir();
    // 创建必要的目录结构
    await fs.ensureDir(join(testDir, 'source'));
    await fs.ensureDir(join(testDir, 'learned'));
  });

  describe('learnPreferences - 基础功能', () => {
    it('应该在观察期将所有偏好放入待建议列表', async () => {
      const extractedData: ExtractionResult = {
        preferences: [
          createMockPreference({ description: '使用中文编写文档', confidence: 0.9 }),
          createMockPreference({ description: '使用 TypeScript', confidence: 0.8 }),
        ],
        patterns: [],
        workflows: [],
      };

      const config: Config = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 },
        },
      } as Config;

      const result = await learnPreferences(extractedData, 'observation', config);

      expect(result.toApply).toHaveLength(0);
      expect(result.toSuggest).toHaveLength(2);
      expect(result.conflicts).toHaveLength(0);
    });

    it('应该在建议期将所有偏好放入待建议列表', async () => {
      const extractedData: ExtractionResult = {
        preferences: [
          createMockPreference({ confidence: 0.95 }), // 高置信度
          createMockPreference({ confidence: 0.5 }), // 低置信度
        ],
        patterns: [],
        workflows: [],
      };

      const config: Config = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 },
        },
      } as Config;

      const result = await learnPreferences(extractedData, 'suggestion', config);

      expect(result.toApply).toHaveLength(0);
      expect(result.toSuggest).toHaveLength(2);
    });

    it('应该在自动期根据置信度自动应用高置信度偏好', async () => {
      const extractedData: ExtractionResult = {
        preferences: [
          createMockPreference({ description: '高置信度偏好', confidence: 0.95 }),
          createMockPreference({ description: '低置信度偏好', confidence: 0.5 }),
        ],
        patterns: [],
        workflows: [],
      };

      const config: Config = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 },
        },
      } as Config;

      const result = await learnPreferences(extractedData, 'automatic', config);

      expect(result.toApply).toHaveLength(1);
      expect(result.toApply[0].description).toBe('高置信度偏好');
      expect(result.toSuggest).toHaveLength(1);
      expect(result.toSuggest[0].description).toBe('低置信度偏好');
    });
  });

  describe('learnPreferences - 模式处理', () => {
    it('应该正确处理问题-解决方案模式', async () => {
      const extractedData: ExtractionResult = {
        preferences: [],
        patterns: [
          createMockPattern({
            problem: 'TypeScript 类型错误',
            solution: '使用类型断言',
            confidence: 0.9,
          }),
        ],
        workflows: [],
      };

      const config: Config = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 },
        },
      } as Config;

      const result = await learnPreferences(extractedData, 'automatic', config);

      expect(result.toApply).toHaveLength(1);
      expect(result.toApply[0]).toMatchObject({
        problem: 'TypeScript 类型错误',
        solution: '使用类型断言',
      });
    });
  });

  describe('learnPreferences - 工作流处理', () => {
    it('应该正确处理工作流程', async () => {
      const extractedData: ExtractionResult = {
        preferences: [],
        patterns: [],
        workflows: [
          createMockWorkflow({
            name: '提交前检查',
            steps: ['运行测试', '运行 lint', '提交'],
            confidence: 0.85,
          }),
        ],
      };

      const config: Config = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 },
        },
      } as Config;

      const result = await learnPreferences(extractedData, 'automatic', config);

      expect(result.toApply).toHaveLength(1);
      expect(result.toApply[0]).toMatchObject({
        name: '提交前检查',
        steps: expect.arrayContaining(['运行测试', '运行 lint', '提交']),
      });
    });
  });

  describe('冲突检测 - 偏好冲突', () => {
    it('应该检测到与现有规则冲突的偏好', async () => {
      // 创建一个现有的 source 文件
      await fs.writeFile(
        join(testDir, 'source/coding-style.md'),
        '# Coding Style\n\n永远不要使用 console.log'
      );

      const extractedData: ExtractionResult = {
        preferences: [
          createMockPreference({
            description: '使用 console.log 调试',
            confidence: 0.8,
          }),
        ],
        patterns: [],
        workflows: [],
      };

      const config: Config = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 },
        },
      } as Config;

      const result = await learnPreferences(extractedData, 'automatic', config);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].reason).toContain('可能存在冲突的配置');
      expect(result.toApply).toHaveLength(0);
      expect(result.toSuggest).toHaveLength(0);
    });

    it('应该允许不冲突的偏好通过', async () => {
      await fs.writeFile(
        join(testDir, 'source/coding-style.md'),
        '# Coding Style\n\n使用 TypeScript'
      );

      const extractedData: ExtractionResult = {
        preferences: [
          createMockPreference({
            description: '使用中文编写文档',
            confidence: 0.9,
          }),
        ],
        patterns: [],
        workflows: [],
      };

      const config: Config = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 },
        },
      } as Config;

      const result = await learnPreferences(extractedData, 'automatic', config);

      expect(result.conflicts).toHaveLength(0);
      expect(result.toApply).toHaveLength(1);
    });
  });

  describe('冲突检测 - 模式冲突', () => {
    it('应该检测到重复的问题模式', async () => {
      // 创建已有的解决方案
      await fs.writeFile(
        join(testDir, 'learned/solutions.md'),
        '# Solutions\n\n## TypeScript 类型错误\n\n使用类型守卫'
      );

      const extractedData: ExtractionResult = {
        preferences: [],
        patterns: [
          createMockPattern({
            problem: 'TypeScript 类型错误',
            solution: '使用类型断言',
            confidence: 0.9,
          }),
        ],
        workflows: [],
      };

      const config: Config = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 },
        },
      } as Config;

      const result = await learnPreferences(extractedData, 'automatic', config);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].reason).toBe('重复的问题模式');
    });

    it('应该允许新的问题模式通过', async () => {
      await fs.writeFile(
        join(testDir, 'learned/solutions.md'),
        '# Solutions\n\n## React Hooks 问题\n\n使用 useEffect'
      );

      const extractedData: ExtractionResult = {
        preferences: [],
        patterns: [
          createMockPattern({
            problem: 'TypeScript 类型错误',
            solution: '使用类型断言',
            confidence: 0.9,
          }),
        ],
        workflows: [],
      };

      const config: Config = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 },
        },
      } as Config;

      const result = await learnPreferences(extractedData, 'automatic', config);

      expect(result.conflicts).toHaveLength(0);
      expect(result.toApply).toHaveLength(1);
    });
  });

  describe('冲突检测 - 工作流冲突', () => {
    it('应该检测到重复的工作流名称', async () => {
      await fs.writeFile(
        join(testDir, 'learned/workflows.md'),
        '# Workflows\n\n## 提交前检查\n\n1. 运行测试'
      );

      const extractedData: ExtractionResult = {
        preferences: [],
        patterns: [],
        workflows: [
          createMockWorkflow({
            name: '提交前检查',
            steps: ['运行 lint'],
            confidence: 0.9,
          }),
        ],
      };

      const config: Config = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 },
        },
      } as Config;

      const result = await learnPreferences(extractedData, 'automatic', config);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].reason).toBe('重复的工作流程');
    });
  });

  describe('置信度阈值', () => {
    it('应该根据配置的置信度阈值决定自动应用', async () => {
      const extractedData: ExtractionResult = {
        preferences: [
          createMockPreference({ confidence: 0.85 }),
          createMockPreference({ confidence: 0.75 }),
        ],
        patterns: [],
        workflows: [],
      };

      const config: Config = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 }, // 阈值 0.8
        },
      } as Config;

      const result = await learnPreferences(extractedData, 'automatic', config);

      expect(result.toApply).toHaveLength(1); // 0.85 >= 0.8
      expect(result.toSuggest).toHaveLength(1); // 0.75 < 0.8
    });

    it('应该支持不同的置信度阈值配置', async () => {
      const extractedData: ExtractionResult = {
        preferences: [
          createMockPreference({ confidence: 0.95 }),
          createMockPreference({ confidence: 0.85 }),
          createMockPreference({ confidence: 0.75 }),
        ],
        patterns: [],
        workflows: [],
      };

      const config: Config = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.9 }, // 高阈值
        },
      } as Config;

      const result = await learnPreferences(extractedData, 'automatic', config);

      expect(result.toApply).toHaveLength(1); // 只有 0.95
      expect(result.toSuggest).toHaveLength(2); // 0.85 和 0.75
    });
  });

  describe('混合数据处理', () => {
    it('应该同时处理偏好、模式和工作流', async () => {
      const extractedData: ExtractionResult = {
        preferences: [createMockPreference({ confidence: 0.9 })],
        patterns: [createMockPattern({ confidence: 0.85 })],
        workflows: [createMockWorkflow({ confidence: 0.88 })],
      };

      const config: Config = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 },
        },
      } as Config;

      const result = await learnPreferences(extractedData, 'automatic', config);

      expect(result.toApply).toHaveLength(3); // 全部高于阈值
      expect(result.toSuggest).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
    });

    it('应该正确分类不同置信度的混合数据', async () => {
      const extractedData: ExtractionResult = {
        preferences: [
          createMockPreference({ confidence: 0.95 }), // 应该自动应用
          createMockPreference({ confidence: 0.6 }), // 应该待建议
        ],
        patterns: [
          createMockPattern({ confidence: 0.85 }), // 应该自动应用
        ],
        workflows: [
          createMockWorkflow({ confidence: 0.7 }), // 应该待建议
        ],
      };

      const config: Config = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 },
        },
      } as Config;

      const result = await learnPreferences(extractedData, 'automatic', config);

      expect(result.toApply).toHaveLength(2); // preference(0.95) + pattern(0.85)
      expect(result.toSuggest).toHaveLength(2); // preference(0.6) + workflow(0.7)
    });
  });

  describe('边界情况', () => {
    it('应该处理空的提取结果', async () => {
      const extractedData: ExtractionResult = {
        preferences: [],
        patterns: [],
        workflows: [],
      };

      const config: Config = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 },
        },
      } as Config;

      const result = await learnPreferences(extractedData, 'automatic', config);

      expect(result.toApply).toHaveLength(0);
      expect(result.toSuggest).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
    });

    it('应该处理置信度为边界值的情况', async () => {
      const extractedData: ExtractionResult = {
        preferences: [
          createMockPreference({ confidence: 0.8 }), // 正好等于阈值
          createMockPreference({ confidence: 0.7999 }), // 略低于阈值
          createMockPreference({ confidence: 0.8001 }), // 略高于阈值
        ],
        patterns: [],
        workflows: [],
      };

      const config: Config = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 },
        },
      } as Config;

      const result = await learnPreferences(extractedData, 'automatic', config);

      // >= 0.8 应该自动应用
      expect(result.toApply).toHaveLength(2); // 0.8 和 0.8001
      expect(result.toSuggest).toHaveLength(1); // 0.7999
    });

    it('应该处理 source 目录不存在的情况', async () => {
      // 删除 source 目录
      await fs.remove(join(testDir, 'source'));

      const extractedData: ExtractionResult = {
        preferences: [createMockPreference({ confidence: 0.9 })],
        patterns: [],
        workflows: [],
      };

      const config: Config = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 },
        },
      } as Config;

      // 不应该抛出错误
      await expect(learnPreferences(extractedData, 'automatic', config)).resolves.toBeDefined();
    });

    it('应该处理 learned 目录不存在的情况', async () => {
      await fs.remove(join(testDir, 'learned'));

      const extractedData: ExtractionResult = {
        preferences: [],
        patterns: [createMockPattern({ confidence: 0.9 })],
        workflows: [createMockWorkflow({ confidence: 0.9 })],
      };

      const config: Config = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 },
        },
      } as Config;

      // 不应该抛出错误，且应该正常处理
      const result = await learnPreferences(extractedData, 'automatic', config);
      expect(result.toApply).toHaveLength(2);
    });
  });

  describe('学习阶段转换', () => {
    it('应该在不同学习阶段表现不同', async () => {
      const extractedData: ExtractionResult = {
        preferences: [createMockPreference({ confidence: 0.95 })],
        patterns: [],
        workflows: [],
      };

      const config: Config = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 },
        },
      } as Config;

      // 观察期
      const observationResult = await learnPreferences(extractedData, 'observation', config);
      expect(observationResult.toApply).toHaveLength(0);
      expect(observationResult.toSuggest).toHaveLength(1);

      // 建议期
      const suggestionResult = await learnPreferences(extractedData, 'suggestion', config);
      expect(suggestionResult.toApply).toHaveLength(0);
      expect(suggestionResult.toSuggest).toHaveLength(1);

      // 自动期
      const automaticResult = await learnPreferences(extractedData, 'automatic', config);
      expect(automaticResult.toApply).toHaveLength(1); // 高置信度自动应用
      expect(automaticResult.toSuggest).toHaveLength(0);
    });
  });
});
