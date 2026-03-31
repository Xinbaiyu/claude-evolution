import { describe, it, expect } from 'vitest';
import { ConfigSchema, DEFAULT_CONFIG } from '../../src/config/schema.js';

describe('Config Schema', () => {
  describe('ConfigSchema 验证', () => {
    it('应该接受完整的默认配置', () => {
      const result = ConfigSchema.safeParse(DEFAULT_CONFIG);
      expect(result.success).toBe(true);
    });

    it('应该接受缺少 daemon 和 webUI 的配置（向后兼容）', () => {
      const oldConfig = {
        scheduler: DEFAULT_CONFIG.scheduler,
        llm: DEFAULT_CONFIG.llm,
        httpApi: DEFAULT_CONFIG.httpApi,
        filters: DEFAULT_CONFIG.filters,
        mdGenerator: DEFAULT_CONFIG.mdGenerator,
      };

      const result = ConfigSchema.safeParse(oldConfig);
      expect(result.success).toBe(true);
    });

    it('应该填充默认值', () => {
      const minimalConfig = {
        scheduler: {},
        llm: {},
        httpApi: {},
        filters: {},
        mdGenerator: {},
      };

      const result = ConfigSchema.parse(minimalConfig);

      // 验证默认值被填充
      expect(result.scheduler.enabled).toBe(true);
      expect(result.scheduler.interval).toBe('6h');
      expect(result.llm.model).toBe('claude-3-5-haiku-20241022');
      expect(result.httpApi.baseUrl).toBe('http://localhost:37777');
    });
  });

  describe('DaemonConfig Schema', () => {
    it('应该接受有效的守护进程配置', () => {
      const config = {
        ...DEFAULT_CONFIG,
        daemon: {
          enabled: true,
          pidFile: '/custom/path/daemon.pid',
          logFile: '/custom/path/daemon.log',
          logLevel: 'debug' as const,
          logRotation: {
            maxSize: '20MB',
            maxFiles: 10,
          },
          gracefulShutdownTimeout: 60000,
        },
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('应该拒绝无效的日志级别', () => {
      const config = {
        ...DEFAULT_CONFIG,
        daemon: {
          ...DEFAULT_CONFIG.daemon!,
          logLevel: 'invalid',
        },
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('WebUIConfig Schema', () => {
    it('应该接受有效的 Web UI 配置', () => {
      const config = {
        ...DEFAULT_CONFIG,
        webUI: {
          enabled: true,
          port: 3000,
          host: '0.0.0.0',
          autoOpenBrowser: true,
          corsOrigins: ['http://localhost:3000', 'http://example.com'],
        },
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('应该拒绝无效的端口号', () => {
      const config = {
        ...DEFAULT_CONFIG,
        webUI: {
          ...DEFAULT_CONFIG.webUI!,
          port: 70000, // 超过最大值
        },
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('应该拒绝端口为 0', () => {
      const config = {
        ...DEFAULT_CONFIG,
        webUI: {
          ...DEFAULT_CONFIG.webUI!,
          port: 0,
        },
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('Scheduler Schema', () => {
    it('应该接受字符串类型的 interval', () => {
      const config = {
        ...DEFAULT_CONFIG,
        scheduler: {
          enabled: true,
          interval: '2h',
          runOnStartup: false,
        },
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('应该接受 customCron 选项', () => {
      const config = {
        ...DEFAULT_CONFIG,
        scheduler: {
          enabled: true,
          interval: '6h',
          customCron: '0 */6 * * *',
          runOnStartup: false,
        },
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe('默认配置', () => {
    it('DEFAULT_CONFIG 应该包含所有必需字段', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('scheduler');
      expect(DEFAULT_CONFIG).toHaveProperty('daemon');
      expect(DEFAULT_CONFIG).toHaveProperty('webUI');
      expect(DEFAULT_CONFIG).toHaveProperty('llm');
      expect(DEFAULT_CONFIG).toHaveProperty('httpApi');
      expect(DEFAULT_CONFIG).toHaveProperty('filters');
      expect(DEFAULT_CONFIG).toHaveProperty('mdGenerator');
    });

    it('daemon 配置应该有合理的默认值', () => {
      expect(DEFAULT_CONFIG.daemon?.enabled).toBe(true);
      expect(DEFAULT_CONFIG.daemon?.logLevel).toBe('info');
      expect(DEFAULT_CONFIG.daemon?.logRotation.maxFiles).toBe(7);
      expect(DEFAULT_CONFIG.daemon?.gracefulShutdownTimeout).toBe(30000);
    });

    it('webUI 配置应该有合理的默认值', () => {
      expect(DEFAULT_CONFIG.webUI?.enabled).toBe(true);
      expect(DEFAULT_CONFIG.webUI?.port).toBe(10010);
      expect(DEFAULT_CONFIG.webUI?.host).toBe('127.0.0.1');
      expect(DEFAULT_CONFIG.webUI?.autoOpenBrowser).toBe(false);
      expect(DEFAULT_CONFIG.webUI?.corsOrigins).toEqual(['http://localhost:10010']);
    });
  });
});
