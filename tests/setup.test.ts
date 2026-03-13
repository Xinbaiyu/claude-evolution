import { describe, it, expect } from 'vitest';

/**
 * 测试环境验证
 *
 * 确保 Vitest 配置正确，测试运行环境正常
 */
describe('测试环境验证', () => {
  it('基础断言应该工作', () => {
    expect(1 + 1).toBe(2);
    expect(true).toBeTruthy();
    expect(false).toBeFalsy();
  });

  it('异步测试应该工作', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });

  it('对象断言应该工作', () => {
    const obj = { name: 'test', value: 123 };
    expect(obj).toEqual({ name: 'test', value: 123 });
    expect(obj).toHaveProperty('name');
  });

  it('数组断言应该工作', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });
});
