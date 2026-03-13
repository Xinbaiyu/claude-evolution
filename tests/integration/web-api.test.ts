import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';

// Set test environment
process.env.NODE_ENV = 'test';

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

describe('Web API 集成测试', () => {
  let app: any;

  beforeAll(async () => {
    // Import app after mocks are set up
    const module = await import('../../web/server/index.js');
    app = module.app;
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/health - 健康检查', () => {
    it('应该返回健康状态', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/suggestions - 获取建议列表', () => {
    it('应该返回建议列表（可能为空）', async () => {
      const response = await request(app).get('/api/suggestions');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('应该支持状态过滤参数', async () => {
      const response = await request(app).get('/api/suggestions?status=pending');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/status - 获取系统状态', () => {
    it('应该返回系统状态信息', async () => {
      const response = await request(app).get('/api/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('scheduler');
      expect(response.body.data).toHaveProperty('suggestions');
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('server');
    });
  });

  describe('POST /api/suggestions/:id/approve - 批准建议', () => {
    it('应该对不存在的建议返回错误', async () => {
      const response = await request(app).post('/api/suggestions/non-existent-id/approve');

      // 应该返回 500 错误（建议不存在）
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/suggestions/:id/reject - 拒绝建议', () => {
    it('应该对不存在的建议返回错误', async () => {
      const response = await request(app).post('/api/suggestions/non-existent-id/reject');

      // 应该返回 500 错误（建议不存在）
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/suggestions/batch/approve - 批量批准', () => {
    it('应该验证 ids 参数为数组', async () => {
      const response = await request(app)
        .post('/api/suggestions/batch/approve')
        .send({ ids: 'not-an-array' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('must be a non-empty array');
    });

    it('应该验证 ids 数组不为空', async () => {
      const response = await request(app)
        .post('/api/suggestions/batch/approve')
        .send({ ids: [] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('应该对缺少 ids 参数返回错误', async () => {
      const response = await request(app)
        .post('/api/suggestions/batch/approve')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/suggestions/batch/reject - 批量拒绝', () => {
    it('应该验证 ids 参数', async () => {
      const response = await request(app)
        .post('/api/suggestions/batch/reject')
        .send({ ids: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('错误响应处理', () => {
    it('应该对无效请求返回 400', async () => {
      const response = await request(app)
        .post('/api/suggestions/batch/approve')
        .send({ invalid: 'data' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('应该对不存在的端点返回 404', async () => {
      const response = await request(app).get('/api/non-existent-endpoint');

      expect(response.status).toBe(404);
    });
  });

  describe('CORS 支持', () => {
    it('应该包含 CORS 头', async () => {
      const response = await request(app).get('/api/health');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });
});
