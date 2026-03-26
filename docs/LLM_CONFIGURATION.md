# LLM 配置指南

本文档说明如何配置和使用统一的 LLM 客户端工厂。

---

## 目录

- [配置选项](#配置选项)
- [提供商自动检测](#提供商自动检测)
- [配置示例](#配置示例)
- [从旧配置迁移](#从旧配置迁移)
- [扩展指南](#扩展指南)

---

## 配置选项

### 基础配置

在 `~/.claude-evolution/config.json` 中的 `llm` 字段:

```typescript
{
  "llm": {
    // 核心配置
    "model": "claude-3-5-haiku-20241022",    // LLM 模型
    "maxTokens": 4096,                       // 最大输出 token 数
    "temperature": 0.3,                      // 温度参数 (可选)

    // 提供商配置 (自动检测,可选)
    "provider": "anthropic",                 // 显式指定提供商: "anthropic" | "openai"
    "apiKey": "sk-ant-...",                  // API Key (可选,优先使用环境变量)
    "baseURL": "http://localhost:3456",      // CCR 代理地址 (可选)

    // 提供商特定配置 (可选)
    "anthropic": {
      "apiVersion": "2023-06-01"             // Anthropic API 版本
    },
    "openai": {
      "organization": "org-..."              // OpenAI 组织 ID
    }
  }
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `provider` | `"anthropic"` \| `"openai"` | 否 | 显式指定提供商,未设置时自动检测 |
| `model` | `string` | 是 | LLM 模型名称 |
| `maxTokens` | `number` | 否 | 最大输出 token 数,默认 4096 |
| `temperature` | `number` | 否 | 温度参数 0-1,控制随机性 |
| `apiKey` | `string` | 否 | API Key,优先使用环境变量 |
| `baseURL` | `string` | 否 | 自定义 API 端点 (如 CCR 代理) |
| `anthropic` | `object` | 否 | Anthropic 特定配置 |
| `openai` | `object` | 否 | OpenAI 特定配置 |

---

## 提供商自动检测

如果未设置 `provider` 字段,系统按以下优先级自动检测:

### 检测优先级

1. **显式配置优先**
   ```json
   { "llm": { "provider": "anthropic" } }
   ```
   → 使用 Anthropic,即使设置了 `OPENAI_API_KEY`

2. **baseURL → Anthropic (CCR 模式)**
   ```json
   { "llm": { "baseURL": "http://localhost:3456" } }
   ```
   → 自动使用 Anthropic + CCR 代理

3. **ANTHROPIC_API_KEY 环境变量**
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```
   → 使用 Anthropic 官方 API

4. **OPENAI_API_KEY 环境变量**
   ```bash
   export OPENAI_API_KEY="sk-..."
   ```
   → 使用 OpenAI

5. **无法检测 → 报错**
   ```
   Error: Cannot determine LLM provider. Set llm.provider, llm.baseURL,
   ANTHROPIC_API_KEY, or OPENAI_API_KEY
   ```

---

## 配置示例

### 示例 1: CCR 模式 (本地代理)

**适用场景**: 通过 Claude Code Router 本地代理调用 Anthropic API

```json
{
  "llm": {
    "model": "claude-3-5-haiku-20241022",
    "baseURL": "http://localhost:3456",
    "maxTokens": 4096
  }
}
```

**特点**:
- 无需设置 API Key (CCR 代理已有)
- 自动检测为 Anthropic 提供商
- 适合团队共享 CCR 代理

### 示例 2: Anthropic 官方 API

**适用场景**: 直接调用 Anthropic 官方 API

```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-haiku-20241022",
    "apiKey": "sk-ant-api03-xxx",
    "maxTokens": 4096
  }
}
```

或使用环境变量:

```bash
export ANTHROPIC_API_KEY="sk-ant-api03-xxx"
```

```json
{
  "llm": {
    "model": "claude-3-5-haiku-20241022",
    "maxTokens": 4096
  }
}
```

### 示例 3: OpenAI API

**适用场景**: 使用 OpenAI GPT 模型

```json
{
  "llm": {
    "provider": "openai",
    "model": "gpt-4o",
    "apiKey": "sk-...",
    "maxTokens": 4096,
    "openai": {
      "organization": "org-..."
    }
  }
}
```

或使用环境变量:

```bash
export OPENAI_API_KEY="sk-..."
```

```json
{
  "llm": {
    "provider": "openai",
    "model": "gpt-4o",
    "maxTokens": 4096
  }
}
```

### 示例 4: 混合环境 (多个 API Key)

**场景**: 同时有多个提供商的 API Key,需要显式选择

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
```

**使用 Anthropic**:
```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-haiku-20241022"
  }
}
```

**使用 OpenAI**:
```json
{
  "llm": {
    "provider": "openai",
    "model": "gpt-4o"
  }
}
```

---

## 从旧配置迁移

### 迁移前 (0.1.x 版本)

旧配置直接使用 Anthropic SDK:

```json
{
  "llm": {
    "model": "claude-3-5-haiku-20241022",
    "apiKey": "sk-ant-...",
    "baseURL": "http://localhost:3456",
    "maxTokens": 4096
  }
}
```

代码直接创建 Anthropic 客户端:

```typescript
const anthropic = new Anthropic({
  apiKey: config.llm.apiKey || process.env.ANTHROPIC_API_KEY,
  ...(config.llm.baseURL && { baseURL: config.llm.baseURL }),
});

const response = await anthropic.messages.create({
  model: config.llm.model,
  max_tokens: config.llm.maxTokens,
  messages: [{ role: 'user', content: prompt }],
});
```

### 迁移后 (0.2.x 版本)

**配置文件**: 无需修改! 自动检测 baseURL → Anthropic

**代码修改**:

```typescript
import { createLLMClient } from './llm/client-factory.js';

// 使用工厂函数创建客户端
const llmClient = await createLLMClient(config);

// 使用统一接口
const response = await llmClient.createCompletion({
  model: config.llm.model,
  messages: [{ role: 'user', content: prompt }],
  maxTokens: config.llm.maxTokens,
});

// 响应已统一格式
const content = response.content;
const usage = response.usage;
```

### 迁移步骤

1. **更新代码导入**
   ```diff
   - import Anthropic from '@anthropic-ai/sdk';
   + import { createLLMClient } from './llm/client-factory.js';
   ```

2. **替换客户端创建**
   ```diff
   - const anthropic = new Anthropic({ ... });
   + const llmClient = await createLLMClient(config);
   ```

3. **使用统一接口**
   ```diff
   - const response = await anthropic.messages.create({
   -   model,
   -   max_tokens: maxTokens,
   -   messages: [{ role: 'user', content: prompt }],
   -   system: systemPrompt,
   - });
   - const content = response.content[0]?.text ?? '';
   + const response = await llmClient.createCompletion({
   +   model,
   +   messages: [{ role: 'user', content: prompt }],
   +   systemPrompt,
   +   maxTokens,
   + });
   + const content = response.content;
   ```

4. **(可选) 添加显式 provider 配置**

   如果希望明确配置提供商:
   ```json
   {
     "llm": {
       "provider": "anthropic",
       "model": "claude-3-5-haiku-20241022",
       "baseURL": "http://localhost:3456",
       "maxTokens": 4096
     }
   }
   ```

### 兼容性保证

- ✅ **向后兼容**: 旧配置文件无需修改
- ✅ **自动检测**: baseURL 自动识别为 Anthropic
- ✅ **环境变量**: 继续支持 `ANTHROPIC_API_KEY`

---

## 扩展指南

### 添加新的 LLM 提供商

**场景**: 添加对 Google Gemini 的支持

#### 步骤 1: 实现提供商类

创建 `src/llm/providers/gemini.ts`:

```typescript
import type {
  LLMProvider,
  LLMCompletionParams,
  LLMCompletionResponse,
} from '../types.js';

/** Gemini Provider 配置 */
export interface GeminiProviderConfig {
  apiKey?: string;
  baseURL?: string;
}

/**
 * Google Gemini LLM 提供商
 */
export class GeminiProvider implements LLMProvider {
  readonly providerName = 'gemini';
  private readonly client: any;

  constructor(config: GeminiProviderConfig) {
    // 动态导入 Gemini SDK
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      this.client = new GoogleGenerativeAI(
        config.apiKey || process.env.GEMINI_API_KEY
      );
    } catch (error) {
      throw new Error(
        'Gemini provider requires "@google/generative-ai" package. ' +
        'Install it with: npm install @google/generative-ai'
      );
    }
  }

  async createCompletion(
    params: LLMCompletionParams
  ): Promise<LLMCompletionResponse> {
    const { model, messages, maxTokens, temperature, systemPrompt } = params;

    // 转换消息格式
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // 注入 system prompt
    if (systemPrompt) {
      contents.unshift({
        role: 'user',
        parts: [{ text: systemPrompt }],
      });
    }

    // 调用 Gemini API
    const geminiModel = this.client.getGenerativeModel({ model });
    const result = await geminiModel.generateContent({
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    });

    const response = result.response;

    // 转换响应格式
    return {
      content: response.text(),
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  }
}
```

#### 步骤 2: 注册到工厂函数

修改 `src/llm/client-factory.ts`:

```typescript
import { GeminiProvider } from './providers/gemini.js';

type LLMProviderType = 'anthropic' | 'openai' | 'gemini';  // 添加 'gemini'

function detectProvider(config: Config): LLMProviderType {
  // ... 现有逻辑 ...

  // 添加 Gemini 检测
  if (process.env.GEMINI_API_KEY) {
    return 'gemini';
  }

  throw new Error('Cannot determine LLM provider...');
}

async function createProviderInstance(
  providerType: LLMProviderType,
  config: Config
): Promise<LLMProvider> {
  const llmConfig = config.llm;

  switch (providerType) {
    case 'anthropic':
      // ... 现有逻辑 ...

    case 'openai':
      // ... 现有逻辑 ...

    case 'gemini':  // 新增
      return new GeminiProvider({
        apiKey: llmConfig.apiKey,
        baseURL: llmConfig.baseURL,
      });

    default:
      throw new Error(`Unsupported LLM provider: ${providerType}`);
  }
}
```

#### 步骤 3: 更新配置 Schema

修改 `src/config/schema.ts`:

```typescript
const LLMSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'gemini']).optional(),  // 添加 'gemini'
  model: z.string().default('claude-3-5-haiku-20241022'),
  // ... 其他字段 ...

  // 添加 Gemini 特定配置
  gemini: z.object({
    // Gemini 特定字段 (如果有)
  }).optional(),
});
```

#### 步骤 4: 添加单元测试

创建 `src/llm/__tests__/gemini.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { GeminiProvider } from '../providers/gemini.js';

describe('GeminiProvider', () => {
  it('should have correct provider name', () => {
    const provider = new GeminiProvider({
      apiKey: 'test-key',
    });
    expect(provider.providerName).toBe('gemini');
  });

  // 更多测试...
});
```

#### 步骤 5: 添加到 package.json

将 Gemini SDK 添加为可选依赖:

```json
{
  "optionalDependencies": {
    "openai": "^4.28.0",
    "@google/generative-ai": "^0.1.0"
  }
}
```

#### 步骤 6: 更新文档

在本文档添加 Gemini 配置示例:

```json
{
  "llm": {
    "provider": "gemini",
    "model": "gemini-1.5-pro",
    "apiKey": "AIza...",
    "maxTokens": 4096
  }
}
```

---

## 常见问题

### Q: 为什么需要统一的 LLM 客户端工厂?

**A**: 旧代码中有 4 处重复创建 Anthropic 客户端的逻辑:
- `src/bot/commands/chat.ts`
- `src/analyzers/experience-extractor.ts`
- `src/learners/llm-merge.ts`
- `src/memory/context-merge.ts`

统一工厂函数的好处:
1. **避免重复**: 单一的客户端创建逻辑
2. **易于扩展**: 添加新提供商只需实现接口
3. **自动检测**: 无需手动判断 CCR/API Key 模式
4. **单例缓存**: 避免重复创建客户端实例

### Q: 如何访问 Anthropic 特定功能 (如 Prompt Caching)?

**A**: 使用 `getClient()` 方法获取底层客户端:

```typescript
const llmProvider = await createLLMClient(config);

if (llmProvider instanceof AnthropicProvider) {
  const anthropic = llmProvider.getClient();  // 获取原生 Anthropic SDK

  // 使用 Prompt Caching
  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' }  // Anthropic 特有
      }
    ],
    messages: messages,
  });
}
```

### Q: OpenAI 提供商目前是否可用?

**A**: OpenAI 提供商已实现基础框架,但仅作为占位符。如需完整支持,需要:
1. 安装 `openai` npm 包
2. 完善 `src/llm/providers/openai.ts` 实现
3. 添加完整的单元测试

当前测试覆盖率:
- **Anthropic**: 95% ✅
- **OpenAI**: 51% (占位符实现)

### Q: 如何测试新的提供商实现?

**A**: 运行以下命令:

```bash
# 测试单个提供商
npm test src/llm/__tests__/gemini.test.ts

# 测试所有 LLM 模块并查看覆盖率
npx vitest run --coverage --coverage.include='src/llm/**/*.ts' src/llm/__tests__/

# 目标: ≥ 80% 覆盖率
```

---

## 参考链接

- [架构文档](./ARCHITECTURE.md#72-llm-客户端工厂-统一提供商抽象)
- [Anthropic API 文档](https://docs.anthropic.com/claude/reference)
- [OpenAI API 文档](https://platform.openai.com/docs/api-reference)
- [Google Gemini API 文档](https://ai.google.dev/docs)

---

**维护者**: Claude Code
**最后更新**: 2026-03-25
**版本**: 0.2.0
