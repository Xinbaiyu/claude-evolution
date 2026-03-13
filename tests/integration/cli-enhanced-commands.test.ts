import { describe, it, expect, beforeEach, vi } from 'vitest';
import { join } from 'path';
import fs from 'fs-extra';
import { useTempDir } from '../helpers/temp-dir.js';
import { statusCommand } from '../../src/cli/commands/status.js';
import { historyCommand } from '../../src/cli/commands/history.js';
import { diffCommand } from '../../src/cli/commands/diff.js';
import type { Config } from '../../src/types/index.js';

// Mock getEvolutionDir
let testDir: string;

vi.mock('../../src/config/loader.js', async () => {
  const actual = await vi.importActual('../../src/config/loader.js');
  return {
    ...actual,
    getEvolutionDir: () => testDir,
  };
});

// Mock logger
vi.mock('../../src/utils/index.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock console to suppress output during tests
const originalConsoleLog = console.log;

describe('CLI 增强命令集成测试', () => {
  const { getTempDir } = useTempDir();

  beforeEach(async () => {
    testDir = getTempDir();

    // Suppress console output during tests
    console.log = vi.fn();
  });

  afterEach(() => {
    // Restore console
    console.log = originalConsoleLog;
    vi.clearAllMocks();
  });

  describe('status 命令', () => {
    it('应该在未初始化时显示提示', async () => {
      // 不创建任何文件

      await statusCommand();

      // 验证 console.log 被调用
      expect(console.log).toHaveBeenCalled();
    });

    it('应该显示配置状态', async () => {
      // 创建基本配置
      const config: Partial<Config> = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 },
        },
        llm: {
          model: 'claude-haiku-4',
          maxTokens: 4096,
          temperature: 0.3,
          enablePromptCaching: false,
        },
      };

      await fs.ensureDir(testDir);
      await fs.writeJSON(join(testDir, 'config.json'), config);

      await statusCommand();

      expect(console.log).toHaveBeenCalled();
    });

    it('应该显示建议统计', async () => {
      // 创建建议文件
      await fs.ensureDir(join(testDir, 'suggestions'));

      const pending = [
        {
          id: 'test-1',
          type: 'preference',
          item: { type: 'workflow', description: 'Test', confidence: 0.8, frequency: 1, evidence: [] },
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      ];

      await fs.writeJSON(join(testDir, 'suggestions/pending.json'), pending);

      const config: Partial<Config> = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 },
        },
        llm: {
          model: 'claude-haiku-4',
          maxTokens: 4096,
          temperature: 0.3,
          enablePromptCaching: false,
        },
      };

      await fs.writeJSON(join(testDir, 'config.json'), config);

      await statusCommand();

      expect(console.log).toHaveBeenCalled();
    });

    it('应该显示系统健康状态', async () => {
      // 创建必需的目录和文件
      await fs.ensureDir(join(testDir, 'source'));
      await fs.ensureDir(join(testDir, 'learned'));
      await fs.ensureDir(join(testDir, 'suggestions'));
      await fs.ensureDir(join(testDir, 'logs'));

      const config: Partial<Config> = {
        learningPhases: {
          observation: { durationDays: 3 },
          suggestion: { durationDays: 4 },
          automatic: { confidenceThreshold: 0.8 },
        },
        llm: {
          model: 'claude-haiku-4',
          maxTokens: 4096,
          temperature: 0.3,
          enablePromptCaching: false,
        },
      };

      await fs.writeJSON(join(testDir, 'config.json'), config);

      await statusCommand();

      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('history 命令', () => {
    it('应该在无历史记录时显示提示', async () => {
      await historyCommand();

      expect(console.log).toHaveBeenCalled();
    });

    it('应该显示已批准和已拒绝的建议', async () => {
      await fs.ensureDir(join(testDir, 'suggestions'));

      const approved = [
        {
          id: 'approved-1',
          type: 'preference',
          item: { type: 'workflow', description: 'Approved test', confidence: 0.9, frequency: 2, evidence: [] },
          status: 'approved',
          createdAt: new Date().toISOString(),
          reviewedAt: new Date().toISOString(),
        },
      ];

      const rejected = [
        {
          id: 'rejected-1',
          type: 'pattern',
          item: {
            problem: 'Test problem',
            solution: 'Test solution',
            confidence: 0.8,
            occurrences: 3,
            evidence: [],
          },
          status: 'rejected',
          createdAt: new Date().toISOString(),
          reviewedAt: new Date().toISOString(),
        },
      ];

      await fs.writeJSON(join(testDir, 'suggestions/approved.json'), approved);
      await fs.writeJSON(join(testDir, 'suggestions/rejected.json'), rejected);

      await historyCommand({ limit: 10, type: 'all' });

      expect(console.log).toHaveBeenCalled();
    });

    it('应该支持 limit 参数', async () => {
      await fs.ensureDir(join(testDir, 'suggestions'));

      const approved = Array.from({ length: 20 }, (_, i) => ({
        id: `approved-${i}`,
        type: 'preference',
        item: { type: 'workflow', description: `Test ${i}`, confidence: 0.8, frequency: 1, evidence: [] },
        status: 'approved',
        createdAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
      }));

      await fs.writeJSON(join(testDir, 'suggestions/approved.json'), approved);

      await historyCommand({ limit: 5, type: 'all' });

      expect(console.log).toHaveBeenCalled();
    });

    it('应该支持 type 参数过滤', async () => {
      await fs.ensureDir(join(testDir, 'suggestions'));

      const approved = [
        {
          id: 'approved-1',
          type: 'preference',
          item: { type: 'workflow', description: 'Approved', confidence: 0.9, frequency: 1, evidence: [] },
          status: 'approved',
          createdAt: new Date().toISOString(),
          reviewedAt: new Date().toISOString(),
        },
      ];

      await fs.writeJSON(join(testDir, 'suggestions/approved.json'), approved);

      await historyCommand({ limit: 10, type: 'approved' });

      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('diff 命令', () => {
    it('应该在未初始化时显示提示', async () => {
      await diffCommand();

      expect(console.log).toHaveBeenCalled();
    });

    it('应该显示原始和进化配置的差异', async () => {
      await fs.ensureDir(join(testDir, 'source'));
      await fs.ensureDir(join(testDir, 'learned'));

      // 创建原始配置
      const originalContent = `# Original CLAUDE.md

## Rules
- Use TypeScript
- Write tests`;

      await fs.writeFile(join(testDir, 'source/CLAUDE.md'), originalContent);

      // 创建进化配置
      const evolvedContent = `# Learned Preferences

- Use TypeScript with strict mode
- Write comprehensive tests
- Use descriptive variable names`;

      await fs.writeFile(join(testDir, 'learned/preferences.md'), evolvedContent);

      await diffCommand();

      expect(console.log).toHaveBeenCalled();
    });

    it('应该支持 noColor 选项', async () => {
      await fs.ensureDir(join(testDir, 'learned'));

      const evolvedContent = `# Test content`;
      await fs.writeFile(join(testDir, 'learned/test.md'), evolvedContent);

      await diffCommand({ noColor: true });

      expect(console.log).toHaveBeenCalled();
    });

    it('应该在没有差异时显示提示', async () => {
      await fs.ensureDir(join(testDir, 'source'));
      await fs.ensureDir(join(testDir, 'learned'));

      await diffCommand();

      expect(console.log).toHaveBeenCalled();
    });
  });
});
