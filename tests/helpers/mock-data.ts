import type { Preference, Pattern, Workflow } from '../../src/types/index.js';

/**
 * 测试数据生成器
 *
 * 提供模拟建议、偏好、会话等测试数据的工厂函数
 */

/**
 * 生成模拟偏好数据
 */
export function createMockPreference(overrides?: Partial<Preference>): Preference {
  return {
    type: 'workflow',
    description: '使用中文编写文档',
    confidence: 0.85,
    frequency: 3,
    evidence: [
      'session-001/observation-123',
      'session-002/observation-456',
      'session-003/observation-789',
    ],
    ...overrides,
  };
}

/**
 * 生成模拟模式数据
 */
export function createMockPattern(overrides?: Partial<Pattern>): Pattern {
  return {
    problem: 'TypeScript 类型错误',
    solution: '使用类型断言或类型守卫',
    confidence: 0.75,
    occurrences: 5,
    evidence: [
      'session-001/observation-111',
      'session-002/observation-222',
    ],
    ...overrides,
  };
}

/**
 * 生成模拟工作流数据
 */
export function createMockWorkflow(overrides?: Partial<Workflow>): Workflow {
  return {
    name: '提交前检查流程',
    steps: [
      '运行 npm test',
      '运行 npm run lint',
      '检查 git status',
      '编写 commit message',
      'git commit',
    ],
    confidence: 0.90,
    frequency: 10,
    evidence: [
      'session-005/observation-501',
      'session-006/observation-601',
    ],
    ...overrides,
  };
}

/**
 * 生成模拟建议数据（包含 id 和 createdAt）
 */
export function createMockSuggestion(type: 'preference' | 'pattern' | 'workflow', overrides?: any) {
  const id = `test-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const createdAt = new Date().toISOString();

  let item;
  switch (type) {
    case 'preference':
      item = createMockPreference(overrides);
      break;
    case 'pattern':
      item = createMockPattern(overrides);
      break;
    case 'workflow':
      item = createMockWorkflow(overrides);
      break;
  }

  return {
    id,
    type,
    item,
    createdAt,
  };
}

/**
 * 生成多个模拟建议
 */
export function createMockSuggestions(count: number) {
  const types: Array<'preference' | 'pattern' | 'workflow'> = ['preference', 'pattern', 'workflow'];
  const suggestions = [];

  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    suggestions.push(createMockSuggestion(type));
  }

  return suggestions;
}

/**
 * 生成模拟会话数据
 */
export function createMockSession(overrides?: any) {
  return {
    sessionId: `session-${Date.now()}`,
    timestamp: new Date().toISOString(),
    observations: [
      {
        id: 'obs-001',
        type: 'code_change',
        content: '用户修改了 TypeScript 文件',
        metadata: {},
      },
      {
        id: 'obs-002',
        type: 'command',
        content: '用户运行了 npm test',
        metadata: {},
      },
    ],
    ...overrides,
  };
}

/**
 * 生成模拟配置数据
 */
export function createMockConfig(overrides?: any) {
  return {
    analysisInterval: '12h',
    confidenceThreshold: 0.8,
    maxSuggestions: 50,
    enabledFeatures: {
      sessionAnalysis: true,
      preferLearning: true,
      autoApprove: false,
    },
    ...overrides,
  };
}
