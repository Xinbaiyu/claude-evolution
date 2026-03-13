import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import fs from 'fs-extra';
import {
  loadPendingSuggestions,
  savePendingSuggestions,
  addSuggestion,
  addSuggestionsBatch,
  getSuggestion,
  approveSuggestion,
  rejectSuggestion,
  cleanupProcessedSuggestions,
  getItemType,
  loadApprovedSuggestions,
  batchApproveSuggestions,
  batchRejectSuggestions,
} from '../../src/learners/suggestion-manager.js';
import { useTempDir } from '../../tests/helpers/temp-dir.js';
import {
  createMockPreference,
  createMockPattern,
  createMockWorkflow,
} from '../../tests/helpers/mock-data.js';
import type { Pattern, Workflow } from '../types/index.js';

// Mock getEvolutionDir
vi.mock('../../src/config/loader.js', () => ({
  getEvolutionDir: () => testDir,
  loadConfig: vi.fn(),
}));

// Mock generators
vi.mock('../../src/generators/index.js', () => ({
  writeLearnedContent: vi.fn(),
  generateCLAUDEmd: vi.fn(),
}));

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

let testDir: string;

describe('SuggestionManager', () => {
  const { getTempDir } = useTempDir();

  beforeEach(async () => {
    testDir = getTempDir();
    // 确保 suggestions 目录存在
    await fs.ensureDir(join(testDir, 'suggestions'));
  });

  describe('loadPendingSuggestions', () => {
    it('应该返回空数组当文件不存在时', async () => {
      const suggestions = await loadPendingSuggestions();
      expect(suggestions).toEqual([]);
    });

    it('应该加载已存在的建议', async () => {
      const mockSuggestions = [
        {
          id: 'test-1',
          type: 'preference',
          item: createMockPreference(),
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      ];

      await fs.writeJSON(join(testDir, 'suggestions/pending.json'), mockSuggestions);

      const loaded = await loadPendingSuggestions();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('test-1');
    });
  });

  describe('savePendingSuggestions', () => {
    it('应该保存建议到文件', async () => {
      const suggestions = [
        {
          id: 'test-1',
          type: 'preference' as const,
          item: createMockPreference(),
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
        },
      ];

      await savePendingSuggestions(suggestions);

      const saved = await fs.readJSON(join(testDir, 'suggestions/pending.json'));
      expect(saved).toHaveLength(1);
      expect(saved[0].id).toBe('test-1');
    });
  });

  describe('addSuggestion', () => {
    it('应该添加 preference 建议', async () => {
      const pref = createMockPreference();
      const id = await addSuggestion(pref, 'preference');

      expect(id).toBeTruthy();

      const suggestions = await loadPendingSuggestions();
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('preference');
      expect(suggestions[0].item).toEqual(pref);
    });

    it('应该添加 pattern 建议', async () => {
      const pattern = createMockPattern();
      const id = await addSuggestion(pattern, 'pattern');

      const suggestions = await loadPendingSuggestions();
      expect(suggestions[0].type).toBe('pattern');
    });

    it('应该添加 workflow 建议', async () => {
      const workflow = createMockWorkflow();
      const id = await addSuggestion(workflow, 'workflow');

      const suggestions = await loadPendingSuggestions();
      expect(suggestions[0].type).toBe('workflow');
    });

    it('应该生成唯一 ID', async () => {
      const pref = createMockPreference();
      const id1 = await addSuggestion(pref, 'preference');
      const id2 = await addSuggestion(pref, 'preference');

      expect(id1).not.toBe(id2);
    });
  });

  describe('getSuggestion', () => {
    it('应该返回指定 ID 的建议', async () => {
      const pref = createMockPreference();
      const id = await addSuggestion(pref, 'preference');

      const suggestion = await getSuggestion(id);
      expect(suggestion).not.toBeNull();
      expect(suggestion?.id).toBe(id);
    });

    it('应该返回 null 当建议不存在时', async () => {
      const suggestion = await getSuggestion('non-existent-id');
      expect(suggestion).toBeNull();
    });
  });

  describe('approveSuggestion', () => {
    it('应该批准建议并从 pending 中移除', async () => {
      const pref = createMockPreference();
      const id = await addSuggestion(pref, 'preference');

      await approveSuggestion(id);

      const pending = await loadPendingSuggestions();
      expect(pending).toHaveLength(0);

      // 验证已批准文件存在
      const approvedPath = join(testDir, 'suggestions/approved.json');
      expect(await fs.pathExists(approvedPath)).toBe(true);

      const approved = await fs.readJSON(approvedPath);
      expect(approved).toHaveLength(1);
      expect(approved[0].id).toBe(id);
    });

    it('应该抛出错误当建议不存在时', async () => {
      await expect(approveSuggestion('non-existent-id')).rejects.toThrow();
    });
  });

  describe('rejectSuggestion', () => {
    it('应该拒绝建议并从 pending 中移除', async () => {
      const pref = createMockPreference();
      const id = await addSuggestion(pref, 'preference');

      await rejectSuggestion(id);

      const pending = await loadPendingSuggestions();
      expect(pending).toHaveLength(0);

      // 验证已拒绝文件存在
      const rejectedPath = join(testDir, 'suggestions/rejected.json');
      expect(await fs.pathExists(rejectedPath)).toBe(true);

      const rejected = await fs.readJSON(rejectedPath);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].id).toBe(id);
    });
  });

  describe('事务回滚', () => {
    it.todo('应该在批准失败时回滚状态 (功能未实现)', async () => {
      // TODO: approveSuggestion 目前没有实现回滚机制
      // 只有 batchApproveSuggestions 实现了回滚
      // 建议为 approveSuggestion 也添加回滚逻辑
    });
  });

  describe('数据持久化', () => {
    it('应该正确写入 JSON 格式', async () => {
      const pref = createMockPreference({ description: '测试偏好', confidence: 0.95 });
      await addSuggestion(pref, 'preference');

      const filePath = join(testDir, 'suggestions/pending.json');
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed[0].item.description).toBe('测试偏好');
      expect(parsed[0].item.confidence).toBe(0.95);
    });

    it('应该格式化 JSON（带缩进）', async () => {
      const pref = createMockPreference();
      await addSuggestion(pref, 'preference');

      const filePath = join(testDir, 'suggestions/pending.json');
      const content = await fs.readFile(filePath, 'utf-8');

      // 验证有缩进（不是压缩的 JSON）
      expect(content).toContain('\n  ');
    });
  });

  describe('getItemType', () => {
    it('应该识别 preference 类型', () => {
      const pref = createMockPreference();
      const type = getItemType(pref);
      expect(type).toBe('preference');
    });

    it('应该识别 pattern 类型', () => {
      const pattern: Pattern = {
        problem: 'test problem',
        solution: 'test solution',
        confidence: 0.8,
        occurrences: 3,
        evidence: [],
      };
      const type = getItemType(pattern);
      expect(type).toBe('pattern');
    });

    it('应该识别 workflow 类型', () => {
      const workflow: Workflow = {
        name: 'test workflow',
        steps: ['step1', 'step2'],
        confidence: 0.85,
        frequency: 5,
        evidence: [],
      };
      const type = getItemType(workflow);
      expect(type).toBe('workflow');
    });

    it('应该对未知类型抛出错误', () => {
      const unknown = { unknown: 'type' } as any;
      expect(() => getItemType(unknown)).toThrow('无法判断项目类型');
    });
  });

  describe('cleanupProcessedSuggestions', () => {
    it('应该清理非 pending 状态的建议', async () => {
      const pref1 = createMockPreference();
      const pref2 = createMockPreference();
      const pref3 = createMockPreference();

      await addSuggestion(pref1, 'preference');
      await addSuggestion(pref2, 'preference');
      await addSuggestion(pref3, 'preference');

      // 手动修改其中一个状态为 approved
      const suggestions = await loadPendingSuggestions();
      suggestions[1].status = 'approved';
      await savePendingSuggestions(suggestions);

      const removedCount = await cleanupProcessedSuggestions();

      expect(removedCount).toBe(1);
      const pending = await loadPendingSuggestions();
      expect(pending).toHaveLength(2);
      expect(pending.every((s) => s.status === 'pending')).toBe(true);
    });

    it('应该在没有已处理建议时返回 0', async () => {
      const pref = createMockPreference();
      await addSuggestion(pref, 'preference');

      const removedCount = await cleanupProcessedSuggestions();

      expect(removedCount).toBe(0);
    });
  });

  describe('loadApprovedSuggestions', () => {
    it('应该返回空数组当文件不存在时', async () => {
      const approved = await loadApprovedSuggestions();
      expect(approved).toEqual([]);
    });

    it('应该加载已批准的建议', async () => {
      // 先添加并批准一个建议
      const pref = createMockPreference();
      await addSuggestion(pref, 'preference');

      const suggestions = await loadPendingSuggestions();
      const id = suggestions[0].id;

      await approveSuggestion(id);

      // 验证可以加载已批准的建议
      const approved = await loadApprovedSuggestions();
      expect(approved).toHaveLength(1);
      expect(approved[0].status).toBe('approved');
      expect(approved[0].id).toBe(id);
    });
  });

  describe('batchApproveSuggestions', () => {
    it('应该批量批准多个建议', async () => {
      const pref1 = createMockPreference();
      const pref2 = createMockPreference();
      const pref3 = createMockPreference();

      await addSuggestion(pref1, 'preference');
      await addSuggestion(pref2, 'preference');
      await addSuggestion(pref3, 'preference');

      const suggestions = await loadPendingSuggestions();
      const ids = suggestions.slice(0, 2).map((s) => s.id);

      const result = await batchApproveSuggestions(ids);

      expect(result.success).toBe(true);
      expect(result.approved).toHaveLength(2);
      expect(result.failed).toHaveLength(0);

      const pending = await loadPendingSuggestions();
      expect(pending).toHaveLength(1);

      const approved = await loadApprovedSuggestions();
      expect(approved).toHaveLength(2);
    });

    it('应该处理部分失败的情况并回滚', async () => {
      const pref = createMockPreference();
      await addSuggestion(pref, 'preference');

      const suggestions = await loadPendingSuggestions();
      const validId = suggestions[0].id;
      const invalidId = 'non-existent-id';

      const result = await batchApproveSuggestions([validId, invalidId]);

      // 批量操作应该在遇到错误时回滚
      expect(result.success).toBe(false);
      expect(result.approved).toHaveLength(0);
      expect(result.failed.length).toBeGreaterThan(0);

      // 验证回滚 - 原始建议应该仍在 pending 中
      const pending = await loadPendingSuggestions();
      expect(pending).toHaveLength(1);
    });

    it('应该在所有失败时返回失败结果', async () => {
      const result = await batchApproveSuggestions(['id1', 'id2', 'id3']);

      expect(result.success).toBe(false);
      expect(result.approved).toHaveLength(0);
      expect(result.failed.length).toBeGreaterThan(0);
    });
  });

  describe('batchRejectSuggestions', () => {
    it('应该批量拒绝多个建议', async () => {
      const pref1 = createMockPreference();
      const pref2 = createMockPreference();

      await addSuggestion(pref1, 'preference');
      await addSuggestion(pref2, 'preference');

      const suggestions = await loadPendingSuggestions();
      const ids = suggestions.map((s) => s.id);

      const result = await batchRejectSuggestions(ids);

      expect(result.success).toBe(true);
      expect(result.rejected).toHaveLength(2);
      expect(result.failed).toHaveLength(0);

      const pending = await loadPendingSuggestions();
      expect(pending).toHaveLength(0);

      const rejectedPath = join(testDir, 'suggestions/rejected.json');
      const rejected = await fs.readJSON(rejectedPath);
      expect(rejected).toHaveLength(2);
    });

    it('应该处理部分失败的情况并回滚', async () => {
      const pref = createMockPreference();
      await addSuggestion(pref, 'preference');

      const suggestions = await loadPendingSuggestions();
      const validId = suggestions[0].id;
      const invalidId = 'non-existent-id';

      const result = await batchRejectSuggestions([validId, invalidId]);

      // 批量操作应该在遇到错误时回滚
      expect(result.success).toBe(false);
      expect(result.rejected).toHaveLength(0);
      expect(result.failed.length).toBeGreaterThan(0);

      // 验证回滚 - 原始建议应该仍在 pending 中
      const pending = await loadPendingSuggestions();
      expect(pending).toHaveLength(1);
    });
  });

  describe('addSuggestionsBatch', () => {
    it('应该批量添加多个建议', async () => {
      const pref1 = createMockPreference();
      const pref2 = createMockPreference();

      // 提供 getType 函数
      const getType = () => 'preference' as const;
      await addSuggestionsBatch([pref1, pref2], getType);

      const suggestions = await loadPendingSuggestions();
      expect(suggestions).toHaveLength(2);
    });

    it('应该处理空数组', async () => {
      const getType = () => 'preference' as const;
      await addSuggestionsBatch([], getType);

      const suggestions = await loadPendingSuggestions();
      expect(suggestions).toHaveLength(0);
    });

    it('应该支持混合类型', async () => {
      const pref = createMockPreference();
      const pattern = createMockPattern();
      const workflow = createMockWorkflow();

      // 提供判断类型的函数
      const getType = (item: any) => {
        if ('type' in item && typeof item.type === 'string') return 'preference' as const;
        if ('problem' in item) return 'pattern' as const;
        if ('steps' in item) return 'workflow' as const;
        throw new Error('Unknown type');
      };

      await addSuggestionsBatch([pref, pattern, workflow], getType);

      const suggestions = await loadPendingSuggestions();
      expect(suggestions).toHaveLength(3);
    });
  });
});
