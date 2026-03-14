import { z } from 'zod';

/**
 * 学习阶段配置
 */
const LearningPhaseSchema = z.object({
  enabled: z.boolean(),
  durationDays: z.number().min(1).max(90),
  description: z.string(),
});

const LearningPhasesSchema = z.object({
  observation: LearningPhaseSchema.default({
    enabled: true,
    durationDays: 3,
    description: '观察期: 仅收集数据,不生成建议',
  }),
  suggestion: LearningPhaseSchema.default({
    enabled: true,
    durationDays: 4,
    description: '建议期: 生成建议但需用户确认',
  }),
  automatic: z.object({
    enabled: z.boolean().default(true),
    confidenceThreshold: z.number().min(0).max(1).default(0.8),
    description: z.string().default('自动期: 高置信度建议自动应用'),
  }),
});

/**
 * 调度配置
 */
const SchedulerSchema = z.object({
  enabled: z.boolean().default(true),
  interval: z.string().default('6h'), // 改为 string 类型以支持更多格式
  customCron: z.string().optional(),
  runOnStartup: z.boolean().default(false),
});

/**
 * 守护进程配置 (新增)
 */
const DaemonConfigSchema = z.object({
  enabled: z.boolean().default(true),
  pidFile: z.string().default('~/.claude-evolution/daemon.pid'),
  logFile: z.string().default('~/.claude-evolution/logs/daemon.log'),
  logLevel: z.enum(['info', 'warn', 'error', 'debug']).default('info'),
  logRotation: z.object({
    maxSize: z.string().default('10MB'),
    maxFiles: z.number().default(7),
  }),
  gracefulShutdownTimeout: z.number().default(30000), // 30秒
});

/**
 * Web UI 配置 (新增)
 */
const WebUIConfigSchema = z.object({
  enabled: z.boolean().default(true),
  port: z.number().min(1).max(65535).default(10010),
  host: z.string().default('127.0.0.1'),
  autoOpenBrowser: z.boolean().default(false),
  corsOrigins: z.array(z.string()).default(['http://localhost:10010']),
});

/**
 * LLM 配置
 */
const LLMSchema = z.object({
  model: z.enum([
    'claude-haiku-4-5',
    'claude-sonnet-4-6',
    'claude-opus-4-6',
    'claude-3-5-haiku-20241022',
    'claude-3-5-sonnet-20241022'
  ]).default('claude-3-5-haiku-20241022'),
  maxTokens: z.number().default(4096),
  temperature: z.number().min(0).max(1).default(0.3),
  enablePromptCaching: z.boolean().default(true),
  // 自定义 API 配置（用于代理/路由服务）
  baseURL: z.string().optional(), // 自定义 API 端点
  defaultHeaders: z.record(z.string()).optional(), // 自定义请求头
});

/**
 * HTTP API 配置
 */
const HttpApiSchema = z.object({
  baseUrl: z.string().default('http://localhost:37777'),
  maxRetries: z.number().default(3),
  retryDelay: z.number().default(1000),
  timeout: z.number().default(30000), // 30秒超时
});

/**
 * 数据过滤配置
 */
const FiltersSchema = z.object({
  enableSensitiveDataFilter: z.boolean().default(true),
  customBlacklist: z.array(z.string()).default([]),
  sessionRetentionDays: z.number().default(30),
});

/**
 * MD 生成配置
 */
const MDGeneratorSchema = z.object({
  maxChars: z.number().default(20000),
  includeMetadata: z.boolean().default(true),
  backupBeforeOverwrite: z.boolean().default(true),
  maxBackups: z.number().default(30),
});

/**
 * 完整配置 Schema
 */
export const ConfigSchema = z.object({
  learningPhases: LearningPhasesSchema,
  scheduler: SchedulerSchema,
  daemon: DaemonConfigSchema.optional(), // 可选，用于向后兼容
  webUI: WebUIConfigSchema.optional(), // 可选，用于向后兼容
  llm: LLMSchema,
  httpApi: HttpApiSchema,
  filters: FiltersSchema,
  mdGenerator: MDGeneratorSchema,
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: Config = {
  learningPhases: {
    observation: {
      enabled: true,
      durationDays: 3,
      description: '观察期: 仅收集数据,不生成建议',
    },
    suggestion: {
      enabled: true,
      durationDays: 4,
      description: '建议期: 生成建议但需用户确认',
    },
    automatic: {
      enabled: true,
      confidenceThreshold: 0.8,
      description: '自动期: 高置信度建议自动应用',
    },
  },
  scheduler: {
    enabled: true,
    interval: '6h',
    runOnStartup: false,
  },
  daemon: {
    enabled: true,
    pidFile: '~/.claude-evolution/daemon.pid',
    logFile: '~/.claude-evolution/logs/daemon.log',
    logLevel: 'info',
    logRotation: {
      maxSize: '10MB',
      maxFiles: 7,
    },
    gracefulShutdownTimeout: 30000,
  },
  webUI: {
    enabled: true,
    port: 10010,
    host: '127.0.0.1',
    autoOpenBrowser: false,
    corsOrigins: ['http://localhost:10010'],
  },
  llm: {
    model: 'claude-3-5-haiku-20241022',
    maxTokens: 4096,
    temperature: 0.3,
    enablePromptCaching: true,
  },
  httpApi: {
    baseUrl: 'http://localhost:37777',
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000,
  },
  filters: {
    enableSensitiveDataFilter: true,
    customBlacklist: [],
    sessionRetentionDays: 30,
  },
  mdGenerator: {
    maxChars: 20000,
    includeMetadata: true,
    backupBeforeOverwrite: true,
    maxBackups: 30,
  },
};
