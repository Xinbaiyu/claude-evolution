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

  describe('GET /api/status - 获取系统状态', () => {
    it('应该返回系统状态信息', async () => {
      const response = await request(app).get('/api/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('scheduler');
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('server');
    });
  });

  describe('错误响应处理', () => {
    it('应该对不存在的端点返回 404', async () => {
      const response = await request(app).get('/api/non-existent-endpoint');

      expect(response.status).toBe(404);
    });
  });
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
