import { z } from 'zod';

/**
 * 调度配置
 */
const SchedulerSchema = z.object({
  enabled: z.boolean().default(true),
  interval: z.string().default('6h'), // '6h' | '12h' | '24h' | 'timepoints' | 'custom'
  scheduleTimes: z.array(
    z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, '时间格式必须为 HH:MM')
  ).max(12).optional(),
  customCron: z.string().optional(),
  runOnStartup: z.boolean().default(false),
  notifications: z.object({
    enabled: z.boolean().default(true),
    onSuccess: z.boolean().default(true),
    onFailure: z.boolean().default(true),
  }).default({}),
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
 * LLM 提供商类型
 */
export type ActiveProvider = 'claude' | 'openai' | 'ccr';

/**
 * Claude 提供商配置
 */
const ClaudeConfigSchema = z.object({
  model: z.string().min(1).default('claude-sonnet-4-6'),
  temperature: z.number().min(0).max(1).default(0.3),
  maxTokens: z.number().default(4096),
  enablePromptCaching: z.boolean().default(true),
  apiVersion: z.string().optional(),
});

/**
 * OpenAI 提供商配置
 */
const OpenAIConfigSchema = z.object({
  model: z.string().min(1).default('gpt-4-turbo'),
  temperature: z.number().min(0).max(1).default(0.3),
  maxTokens: z.number().default(4096),
  baseURL: z.string().nullish().transform(val => val === null ? undefined : val),
  apiKey: z.string().optional(),
  organization: z.string().optional(),
});

/**
 * CCR 提供商配置
 */
const CCRConfigSchema = z.object({
  model: z.string().min(1).default('claude-sonnet-4-6'),
  temperature: z.number().min(0).max(1).default(0.3),
  maxTokens: z.number().default(4096),
  baseURL: z.string().min(1).default('http://localhost:3456'),
});

/**
 * LLM 配置（嵌套结构）
 */
const LLMSchema = z.object({
  activeProvider: z.enum(['claude', 'openai', 'ccr']).default('claude'),
  claude: ClaudeConfigSchema,
  openai: OpenAIConfigSchema,
  ccr: CCRConfigSchema,
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
 * 增量学习配置 (新增)
 */
const LearningConfigSchema = z.object({
  enabled: z.boolean().default(true),
  extractObservations: z.boolean().default(false), // 是否从 Observations 中提取经验（默认关闭，仅提取 User Prompts）
  capacity: z.object({
    active: z.object({
      targetSize: z.number().min(10).max(200).default(50),
      maxSize: z.number().min(10).max(250).default(60),
      minSize: z.number().min(5).max(100).default(40),
    }).refine(
      (data) => data.minSize <= data.targetSize && data.targetSize <= data.maxSize,
      {
        message: 'Active capacity sizes must satisfy: minSize <= targetSize <= maxSize',
      }
    ),
    context: z.object({
      enabled: z.boolean().default(true),
      targetSize: z.number().min(10).max(200).default(50),
      maxSize: z.number().min(10).max(250).default(80),
      halfLifeDays: z.number().min(30).max(180).default(90),
    }).refine(
      (data) => data.targetSize <= data.maxSize,
      {
        message: 'Context capacity sizes must satisfy: targetSize <= maxSize',
      }
    ),
  }),
  decay: z.object({
    enabled: z.boolean().default(true),
    halfLifeDays: z.number().min(7).max(90).default(30),
  }),
  promotion: z.object({
    autoConfidence: z.number().min(0).max(1).default(0.90),
    autoMentions: z.number().min(1).default(10),
    highConfidence: z.number().min(0).max(1).default(0.75),
    highMentions: z.number().min(1).default(5),
    candidateConfidence: z.number().min(0).max(1).default(0.60),
    candidateMentions: z.number().min(1).default(3),
  }).refine(
    (data) =>
      data.candidateConfidence < data.highConfidence &&
      data.highConfidence < data.autoConfidence,
    {
      message: 'Promotion confidence levels must satisfy: candidate < high < auto',
    }
  ).refine(
    (data) =>
      data.candidateMentions <= data.highMentions &&
      data.highMentions <= data.autoMentions,
    {
      message: 'Promotion mention thresholds must satisfy: candidate <= high <= auto',
    }
  ),
  deletion: z.object({
    immediateThreshold: z.number().min(0).max(1).default(0.25),
    delayedThreshold: z.number().min(0).max(1).default(0.35),
    delayedDays: z.number().min(1).max(90).default(14),
  }).refine(
    (data) => data.immediateThreshold < data.delayedThreshold,
    {
      message: 'Deletion thresholds must satisfy: immediate < delayed',
    }
  ),
  retention: z.object({
    archivedDays: z.number().min(7).max(365).default(30),
  }),
});

/**
 * Webhook 端点配置
 */
const WebhookEndpointSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  preset: z.enum(['dingtalk', 'feishu', 'wecom', 'slack-incoming']).optional(),
  template: z.string().optional(),
  secret: z.string().optional(),
  headers: z.record(z.string()).optional(),
  enabled: z.boolean().default(true),
});

/**
 * 提醒系统配置
 */
const RemindersConfigSchema = z.object({
  enabled: z.boolean().default(true),
  channels: z.object({
    desktop: z.object({
      enabled: z.boolean().default(true),
    }),
    websocket: z.object({
      enabled: z.boolean().default(true),
    }),
    webhook: z.object({
      enabled: z.boolean().default(false),
      webhooks: z.array(WebhookEndpointSchema).default([]),
    }).default({ enabled: false, webhooks: [] }),
  }),
});

/**
 * 机器人配置
 */
const BotDingTalkSchema = z.object({
  enabled: z.boolean().default(false),
  clientId: z.string().default(''),
  clientSecret: z.string().default(''),
  /** 接收提醒推送的用户 ID 列表 */
  userIds: z.array(z.string()).default([]),
});

const BotChatSchema = z.object({
  enabled: z.boolean().default(true),
  contextWindow: z.number().min(1).max(100).default(20),
  contextTimeoutMinutes: z.number().min(1).max(1440).default(30),
});

/**
 * Agent 执行配置（钉钉任务、定时调研等都使用此配置）
 */
const AgentConfigSchema = z.object({
  /** Claude Code CLI 代理 URL，null 表示原生 Claude，URL 表示通过 CCR 代理 */
  baseURL: z.string().nullish().transform(val => val === null ? undefined : val),
  /** 默认工作目录 */
  defaultCwd: z.string().default('~/Desktop'),
  /** 允许执行的目录白名单，空数组表示不限制 */
  allowedDirs: z.array(z.string()).default([]),
  /** 执行超时时间（毫秒） */
  timeoutMs: z.number().min(5000).max(600_000).default(120_000),
  /** 单次执行最大预算（美元） */
  maxBudgetUsd: z.number().min(0).max(10).default(0.5),
  /** 权限模式 */
  permissionMode: z.enum(['bypassPermissions', 'auto', 'manual']).default('bypassPermissions'),
});

const BotConfigSchema = z.object({
  enabled: z.boolean().default(false),
  dingtalk: BotDingTalkSchema.default({}),
  chat: BotChatSchema.default({}),
});

/**
 * 完整配置 Schema
 */
export const ConfigSchema = z.object({
  scheduler: SchedulerSchema,
  daemon: DaemonConfigSchema.optional(), // 可选，用于向后兼容
  webUI: WebUIConfigSchema.optional(), // 可选，用于向后兼容
  learning: LearningConfigSchema.optional(), // 可选，增量学习配置
  reminders: RemindersConfigSchema.optional(), // 可选，提醒系统配置
  bot: BotConfigSchema.optional(), // 可选，机器人配置
  agent: AgentConfigSchema.nullable().optional(), // 可选，支持 null 以禁用 Agent 模式
  llm: LLMSchema,
  httpApi: HttpApiSchema,
  filters: FiltersSchema,
  mdGenerator: MDGeneratorSchema,
}).passthrough(); // 允许未知字段通过，支持旧配置兼容

export type Config = z.infer<typeof ConfigSchema>;

// LLM 配置类型导出
export type ClaudeConfig = z.infer<typeof ClaudeConfigSchema>;
export type OpenAIConfig = z.infer<typeof OpenAIConfigSchema>;
export type CCRConfig = z.infer<typeof CCRConfigSchema>;
export type LLMConfig = z.infer<typeof LLMSchema>;

// Agent 执行配置类型导出
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: Config = {
  scheduler: {
    enabled: true,
    interval: '6h',
    runOnStartup: false,
    notifications: {
      enabled: true,
      onSuccess: true,
      onFailure: true,
    },
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
  learning: {
    enabled: true,
    extractObservations: false,
    capacity: {
      active: {
        targetSize: 50,
        maxSize: 60,
        minSize: 40,
      },
      context: {
        enabled: true,
        targetSize: 50,
        maxSize: 80,
        halfLifeDays: 90,
      },
    },
    decay: {
      enabled: true,
      halfLifeDays: 30,
    },
    promotion: {
      autoConfidence: 0.90,
      autoMentions: 10,
      highConfidence: 0.75,
      highMentions: 5,
      candidateConfidence: 0.60,
      candidateMentions: 3,
    },
    deletion: {
      immediateThreshold: 0.25,
      delayedThreshold: 0.35,
      delayedDays: 14,
    },
    retention: {
      archivedDays: 30,
    },
  },
  reminders: {
    enabled: true,
    channels: {
      desktop: { enabled: true },
      websocket: { enabled: true },
      webhook: { enabled: false, webhooks: [] },
    },
  },
  // agent 默认不配置（undefined），需要用户主动配置
  // agent: undefined,
  llm: {
    activeProvider: 'claude' as ActiveProvider,
    claude: {
      model: 'claude-sonnet-4-6',
      temperature: 0.3,
      maxTokens: 4096,
      enablePromptCaching: true,
    },
    openai: {
      model: 'gpt-4-turbo',
      temperature: 0.3,
      maxTokens: 4096,
      baseURL: undefined,
      apiKey: undefined,
      organization: undefined,
    },
    ccr: {
      model: 'claude-sonnet-4-6',
      temperature: 0.3,
      maxTokens: 4096,
      baseURL: 'http://localhost:3456',
    },
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
