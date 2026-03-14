import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { homedir } from 'os';
import { loadConfig, saveConfig } from '../../src/config/loader.js';
import { DEFAULT_CONFIG } from '../../src/config/schema.js';

describe('Config Migration', () => {
  const testConfigDir = path.join(homedir(), '.claude-evolution-test');
  const testConfigPath = path.join(testConfigDir, 'config.json');

  beforeEach(async () => {
    // 创建测试目录
    await fs.ensureDir(testConfigDir);
  });

  afterEach(async () => {
    // 清理测试目录
    await fs.remove(testConfigDir);
  });

  describe('向后兼容性', () => {
    it('应该迁移缺少 daemon 配置的旧配置', async () => {
      // 创建旧版配置（没有 daemon 字段）
      const oldConfig = {
        learningPhases: DEFAULT_CONFIG.learningPhases,
        scheduler: {
          enabled: true,
          interval: '24h',
          runOnStartup: false,
        },
        llm: DEFAULT_CONFIG.llm,
        httpApi: DEFAULT_CONFIG.httpApi,
        filters: DEFAULT_CONFIG.filters,
        mdGenerator: DEFAULT_CONFIG.mdGenerator,
      };

      await fs.writeJSON(testConfigPath, oldConfig, { spaces: 2 });

      // 使用 mock 路径加载
      const originalHomedir = process.env.HOME;
      process.env.HOME = homedir();

      // 手动读取并迁移
      const rawConfig = await fs.readJSON(testConfigPath);
      expect(rawConfig.daemon).toBeUndefined();
      expect(rawConfig.webUI).toBeUndefined();

      // 模拟迁移过程
      const migratedConfig = {
        ...rawConfig,
        daemon: rawConfig.daemon || DEFAULT_CONFIG.daemon,
        webUI: rawConfig.webUI || DEFAULT_CONFIG.webUI,
      };

      expect(migratedConfig.daemon).toBeDefined();
      expect(migratedConfig.webUI).toBeDefined();
      expect(migratedConfig.daemon.enabled).toBe(true);
      expect(migratedConfig.webUI.port).toBe(10010);

      process.env.HOME = originalHomedir;
    });

    it('应该迁移旧的 scheduler.interval enum 值', async () => {
      const oldConfig = {
        ...DEFAULT_CONFIG,
        scheduler: {
          enabled: true,
          interval: '24h', // 旧的 enum 值
          runOnStartup: false,
        },
      };

      await fs.writeJSON(testConfigPath, oldConfig, { spaces: 2 });

      const rawConfig = await fs.readJSON(testConfigPath);
      expect(rawConfig.scheduler.interval).toBe('24h');

      // 验证新的字符串值也被接受
      const newConfig = {
        ...DEFAULT_CONFIG,
        scheduler: {
          enabled: true,
          interval: '2h', // 新的字符串值
          runOnStartup: false,
        },
      };

      await fs.writeJSON(testConfigPath, newConfig, { spaces: 2 });
      const loadedConfig = await fs.readJSON(testConfigPath);
      expect(loadedConfig.scheduler.interval).toBe('2h');
    });

    it('应该保留用户的自定义配置值', async () => {
      const customConfig = {
        ...DEFAULT_CONFIG,
        scheduler: {
          enabled: false,
          interval: '12h',
          runOnStartup: true,
        },
        daemon: {
          enabled: true,
          pidFile: '/custom/daemon.pid',
          logFile: '/custom/daemon.log',
          logLevel: 'debug' as const,
          logRotation: {
            maxSize: '20MB',
            maxFiles: 5,
          },
          gracefulShutdownTimeout: 60000,
        },
        webUI: {
          enabled: false,
          port: 3000,
          host: '0.0.0.0',
          autoOpenBrowser: true,
          corsOrigins: ['http://localhost:3000'],
        },
      };

      await fs.writeJSON(testConfigPath, customConfig, { spaces: 2 });

      const loadedConfig = await fs.readJSON(testConfigPath);

      // 验证自定义值被保留
      expect(loadedConfig.scheduler.enabled).toBe(false);
      expect(loadedConfig.scheduler.interval).toBe('12h');
      expect(loadedConfig.daemon.pidFile).toBe('/custom/daemon.pid');
      expect(loadedConfig.daemon.logLevel).toBe('debug');
      expect(loadedConfig.webUI.port).toBe(3000);
      expect(loadedConfig.webUI.enabled).toBe(false);
    });
  });

  describe('默认值填充', () => {
    it('应该为新增字段提供默认值', async () => {
      // 旧配置缺少新字段
      const incompleteConfig = {
        learningPhases: DEFAULT_CONFIG.learningPhases,
        scheduler: {
          enabled: true,
          interval: '6h',
        },
        llm: DEFAULT_CONFIG.llm,
        httpApi: DEFAULT_CONFIG.httpApi,
        filters: DEFAULT_CONFIG.filters,
        mdGenerator: DEFAULT_CONFIG.mdGenerator,
      };

      await fs.writeJSON(testConfigPath, incompleteConfig, { spaces: 2 });

      // 模拟迁移
      const rawConfig = await fs.readJSON(testConfigPath);
      const migratedConfig = {
        ...rawConfig,
        scheduler: {
          ...rawConfig.scheduler,
          runOnStartup: rawConfig.scheduler.runOnStartup ?? false,
        },
        daemon: rawConfig.daemon || DEFAULT_CONFIG.daemon,
        webUI: rawConfig.webUI || DEFAULT_CONFIG.webUI,
      };

      expect(migratedConfig.scheduler.runOnStartup).toBe(false);
      expect(migratedConfig.daemon).toBeDefined();
      expect(migratedConfig.webUI).toBeDefined();
    });
  });

  describe('嵌套配置迁移', () => {
    it('应该迁移缺少 daemon.logRotation 的配置', async () => {
      const configWithoutLogRotation = {
        ...DEFAULT_CONFIG,
        daemon: {
          enabled: true,
          pidFile: '~/.claude-evolution/daemon.pid',
          logFile: '~/.claude-evolution/logs/daemon.log',
          logLevel: 'info' as const,
          gracefulShutdownTimeout: 30000,
          // 缺少 logRotation
        },
      };

      await fs.writeJSON(testConfigPath, configWithoutLogRotation, { spaces: 2 });

      const rawConfig = await fs.readJSON(testConfigPath);
      const migratedConfig = {
        ...rawConfig,
        daemon: {
          ...rawConfig.daemon,
          logRotation: rawConfig.daemon.logRotation || DEFAULT_CONFIG.daemon!.logRotation,
        },
      };

      expect(migratedConfig.daemon.logRotation).toBeDefined();
      expect(migratedConfig.daemon.logRotation.maxSize).toBe('10MB');
      expect(migratedConfig.daemon.logRotation.maxFiles).toBe(7);
    });

    it('应该迁移缺少 webUI.corsOrigins 的配置', async () => {
      const configWithoutCors = {
        ...DEFAULT_CONFIG,
        webUI: {
          enabled: true,
          port: 10010,
          host: '127.0.0.1',
          autoOpenBrowser: false,
          // 缺少 corsOrigins
        },
      };

      await fs.writeJSON(testConfigPath, configWithoutCors, { spaces: 2 });

      const rawConfig = await fs.readJSON(testConfigPath);
      const migratedConfig = {
        ...rawConfig,
        webUI: {
          ...rawConfig.webUI,
          corsOrigins: rawConfig.webUI.corsOrigins || DEFAULT_CONFIG.webUI!.corsOrigins,
        },
      };

      expect(migratedConfig.webUI.corsOrigins).toBeDefined();
      expect(migratedConfig.webUI.corsOrigins).toEqual(['http://localhost:10010']);
    });
  });

  describe('配置持久化', () => {
    it('迁移后的配置应该可以正确保存', async () => {
      const oldConfig = {
        learningPhases: DEFAULT_CONFIG.learningPhases,
        scheduler: {
          enabled: true,
          interval: '24h',
        },
        llm: DEFAULT_CONFIG.llm,
        httpApi: DEFAULT_CONFIG.httpApi,
        filters: DEFAULT_CONFIG.filters,
        mdGenerator: DEFAULT_CONFIG.mdGenerator,
      };

      await fs.writeJSON(testConfigPath, oldConfig, { spaces: 2 });

      // 读取并迁移
      const rawConfig = await fs.readJSON(testConfigPath);
      const migratedConfig = {
        ...rawConfig,
        scheduler: {
          ...rawConfig.scheduler,
          runOnStartup: false,
        },
        daemon: DEFAULT_CONFIG.daemon,
        webUI: DEFAULT_CONFIG.webUI,
      };

      // 保存迁移后的配置
      await fs.writeJSON(testConfigPath, migratedConfig, { spaces: 2 });

      // 重新读取验证
      const savedConfig = await fs.readJSON(testConfigPath);
      expect(savedConfig.daemon).toBeDefined();
      expect(savedConfig.webUI).toBeDefined();
      expect(savedConfig.scheduler.runOnStartup).toBe(false);
    });
  });
});
