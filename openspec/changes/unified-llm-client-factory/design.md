## Context

当前系统在 4 个模块中重复创建 Anthropic 客户端：
1. `src/bot/commands/chat.ts` - 钉钉机器人对话
2. `src/analyzers/experience-extractor.ts` - 经验提取
3. `src/learners/llm-merge.ts` - LLM 合并
4. `src/memory/context-merge.ts` - 上下文合并

每处都独立判断 CCR（baseURL）vs API Key 模式，代码重复且维护成本高。未来计划支持 OpenAI 格式 API，但当前架构缺乏扩展性。

**约束条件：**
- 必须保持向后兼容，现有配置无需修改
- CCR 和 Anthropic API 两种模式必须继续工作
- 不能破坏现有的 LLM 调用逻辑

**利益相关者：**
- 系统维护者：需要统一的客户端创建逻辑
- 用户：配置迁移应零感知
- 未来扩展者：需要清晰的提供商接入方式

## Goals / Non-Goals

**Goals:**
- 统一所有 LLM 客户端创建逻辑到单一工厂函数
- 建立提供商抽象层，支持 Anthropic 和 OpenAI
- 保持 100% 向后兼容，现有配置无需修改
- 提供清晰的扩展点，未来可轻松添加新提供商（如 Azure OpenAI、Claude on Vertex）

**Non-Goals:**
- 不改变现有 LLM 调用的输入输出格式
- 不实现多提供商负载均衡或故障转移
- 不引入新的配置强制迁移
- 不优化 prompt 或修改 LLM 交互逻辑

## Decisions

### 1. 提供商抽象层设计

**决策：** 定义统一的 `LLMProvider` 接口，而非直接使用 Anthropic SDK 类型。

**理由：**
- Anthropic 和 OpenAI 的 API 接口不兼容（`messages.create` vs `chat.completions.create`）
- 统一接口可让上层代码与具体提供商解耦
- 便于 mock 和单元测试

**接口设计：**
```typescript
interface LLMProvider {
  createCompletion(params: LLMCompletionParams): Promise<LLMCompletionResponse>;
  readonly providerName: string;
}

interface LLMCompletionParams {
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

interface LLMCompletionResponse {
  content: string;
  usage?: { inputTokens: number; outputTokens: number };
}
```

**替代方案考虑：**
- **方案 A**：直接暴露 Anthropic SDK 实例 → ❌ 无法支持 OpenAI
- **方案 B**：使用适配器包装原始 SDK → ✅ 选择此方案，灵活且可扩展

### 2. 工厂函数设计

**决策：** 实现智能工厂 `createLLMClient(config)`，自动检测配置并选择提供商。

**智能检测逻辑：**
1. 如果 `config.llm.provider` 显式指定 → 使用指定提供商
2. 否则，根据 `config.llm.baseURL` 和环境变量自动推断：
   - `baseURL` 存在 → AnthropicProvider（CCR 模式）
   - `ANTHROPIC_API_KEY` 存在 → AnthropicProvider（API 模式）
   - `OPENAI_API_KEY` 存在 → OpenAIProvider
   - 都不存在 → 抛出配置错误

**向后兼容性保证：**
```typescript
// 旧配置继续工作
{ llm: { baseURL: "http://127.0.0.1:3456" } } → AnthropicProvider

// 新配置可显式指定
{ llm: { provider: "openai", model: "gpt-4" } } → OpenAIProvider
```

**替代方案考虑：**
- **方案 A**：要求所有配置迁移到新格式 → ❌ 破坏兼容性
- **方案 B**：自动检测 + 可选显式配置 → ✅ 选择此方案

### 3. 提供商实现

**决策：** 使用适配器模式包装原生 SDK。

**Anthropic 提供商：**
```typescript
class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor(config: { apiKey: string; baseURL?: string }) {
    this.client = new Anthropic({
      apiKey: apiKey || 'dummy-key-for-local-proxy',
      ...(baseURL && { baseURL }),
    });
  }

  async createCompletion(params: LLMCompletionParams): Promise<LLMCompletionResponse> {
    const response = await this.client.messages.create({
      model: params.model,
      max_tokens: params.maxTokens ?? 4096,
      messages: params.messages,
      ...(params.systemPrompt && { system: params.systemPrompt }),
    });

    return {
      content: response.content[0].text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
```

**OpenAI 提供商：**
```typescript
class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  async createCompletion(params: LLMCompletionParams): Promise<LLMCompletionResponse> {
    const messages = params.systemPrompt
      ? [{ role: 'system', content: params.systemPrompt }, ...params.messages]
      : params.messages;

    const response = await this.client.chat.completions.create({
      model: params.model,
      messages,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
    });

    return {
      content: response.choices[0].message.content ?? '',
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }
}
```

**替代方案考虑：**
- **方案 A**：直接使用 SDK，上层根据类型判断 → ❌ 耦合度高
- **方案 B**：适配器模式 + 统一接口 → ✅ 选择此方案

### 4. 配置 Schema 扩展

**决策：** 扩展 `config.llm` 支持 `provider` 字段，但保持可选。

**新 Schema：**
```typescript
interface LLMConfig {
  provider?: 'anthropic' | 'openai';  // 新增，可选
  model: string;
  maxTokens: number;
  temperature: number;
  baseURL?: string;  // 保留，用于 CCR
  defaultHeaders?: Record<string, string>;
  enablePromptCaching?: boolean;
}
```

**检测优先级：**
1. `provider` 显式指定 → 使用指定
2. `baseURL` 存在 → Anthropic（CCR）
3. 环境变量 `ANTHROPIC_API_KEY` → Anthropic
4. 环境变量 `OPENAI_API_KEY` → OpenAI
5. 都不满足 → 抛出错误

### 5. 迁移策略

**决策：** 渐进式迁移，逐个文件替换，保持单元测试通过。

**迁移顺序（风险从低到高）：**
1. `src/bot/commands/chat.ts` - 独立模块，最安全
2. `src/analyzers/experience-extractor.ts` - 低频调用
3. `src/learners/llm-merge.ts` - 核心逻辑，需仔细测试
4. `src/memory/context-merge.ts` - 核心逻辑，最后迁移

**每个文件迁移步骤：**
```typescript
// Before
const anthropic = new Anthropic({
  apiKey: apiKey || 'dummy-key-for-local-proxy',
  ...(baseURL && { baseURL }),
});
const response = await anthropic.messages.create({...});

// After
const llmClient = await createLLMClient(config);
const response = await llmClient.createCompletion({
  model: config.llm.model,
  messages: [...],
  maxTokens: config.llm.maxTokens,
});
```

## Risks / Trade-offs

### Risk 1: 性能开销
**风险：** 增加抽象层可能导致轻微性能损失（额外的函数调用）。

**缓解：**
- 抽象层开销极小（<1ms），相比网络请求（秒级）可忽略
- 工厂函数可缓存实例，避免重复创建

### Risk 2: OpenAI 依赖可选性
**风险：** 如果 `openai` 包未安装，OpenAI 提供商无法使用。

**缓解：**
- 使用动态 import，仅在需要时加载
- 启动时检测配置，如果指定 OpenAI 但包不存在，立即报错

```typescript
async function loadOpenAIProvider(): Promise<typeof OpenAIProvider> {
  try {
    const module = await import('./providers/openai.js');
    return module.OpenAIProvider;
  } catch {
    throw new Error('OpenAI provider requires "openai" package. Run: npm install openai');
  }
}
```

### Risk 3: 接口不完全匹配
**风险：** Anthropic 和 OpenAI API 特性不完全对等（如 prompt caching、streaming）。

**缓解：**
- 第一版仅支持基础 `createCompletion`
- 特殊特性（如 streaming）通过 `providerName` 判断后调用原生接口
- 在 spec 中明确标注不支持的特性

### Risk 4: 迁移过程中的行为差异
**风险：** 新旧实现可能产生微妙的行为差异。

**缓解：**
- 每个文件迁移后立即运行相关测试
- 在测试环境验证 CCR 和 API 两种模式都正常工作
- 提供回滚路径（保留旧代码注释）

## Migration Plan

### Phase 1: 基础设施搭建（Day 1）
1. 创建 `src/llm/` 目录结构
2. 实现 `LLMProvider` 接口和 `AnthropicProvider`
3. 实现 `createLLMClient()` 工厂函数
4. 编写单元测试（覆盖率 >80%）

### Phase 2: 渐进式迁移（Day 2-3）
1. 迁移 `chat.ts` 并测试钉钉机器人对话
2. 迁移 `experience-extractor.ts` 并运行分析任务
3. 迁移 `llm-merge.ts` 和 `context-merge.ts`，重点测试学习系统

### Phase 3: OpenAI 支持（Day 4，可选）
1. 实现 `OpenAIProvider`
2. 添加配置示例和文档
3. 可选安装 `openai` 包

### Phase 4: 文档和清理（Day 5）
1. 更新配置文档说明新字段
2. 删除旧代码注释
3. 更新 ARCHITECTURE.md

### Rollback 策略
- 保留旧代码作为注释，直到新实现验证稳定
- 如果发现问题，取消注释旧代码，删除新调用
- 配置向后兼容，无需回滚配置

## Open Questions

1. **OpenAI 模型映射**：是否需要在工厂层提供模型别名映射（如 `claude-sonnet-4` → `gpt-4`）？
   - 建议：不做映射，用户显式配置模型名

2. **流式响应支持**：是否在第一版支持 streaming？
   - 建议：延后到 v2，当前先支持基础场景

3. **Prompt Caching**：Anthropic 特有功能，如何在抽象层处理？
   - 建议：通过 `providerSpecificOptions` 传递，不纳入统一接口

4. **错误处理统一化**：不同提供商的错误格式不同，是否需要统一？
   - 建议：第一版保留原始错误，不做转换
