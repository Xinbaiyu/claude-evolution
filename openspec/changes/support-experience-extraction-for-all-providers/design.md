## Context

### 历史调查结果

通过 git 历史分析（commit `c74df86`），发现 `instanceof AnthropicProvider` 检查是在"统一 LLM 客户端工厂"重构时引入的。

**重构前**（用户报告的"原来 CCR 是好使的"时期）：
```typescript
// 直接创建 Anthropic 客户端，支持自定义 baseURL
const anthropic = new Anthropic({
  apiKey: apiKey || 'dummy-key-for-local-proxy',
  baseURL: config.llm.baseURL,  // CCR proxy 可以正常工作
});
```

**重构后**（引入 LLM 客户端工厂）：
```typescript
const llmProvider = await createLLMClient(config);

// 添加了硬编码检查，阻止了 OpenAI 和 CCR provider
if (!(llmProvider instanceof AnthropicProvider)) {
  throw new Error('Experience extraction currently requires Anthropic provider');
}
const anthropic = llmProvider.getClient();
```

**检查引入的原因**：
- 重构时需要获取底层 Anthropic 客户端以使用 prompt caching 等 Anthropic 专有特性
- 使用 `getClient()` 方法获取底层客户端时，需要确保 provider 是 AnthropicProvider
- **但是这个检查过于严格**：CCR 本质上是 Anthropic API 的代理，应该能使用 AnthropicProvider

### 当前问题

1. **CCR 被错误阻止**：CCR 使用的是 Anthropic Messages API 格式，应该能直接使用 AnthropicProvider，但当前配置架构将其视为独立 provider
2. **OpenAI 不兼容**：OpenAI Chat Completions API 格式与 Anthropic Messages API 不同，需要适配层
3. **Prompt Caching 依赖**：Experience extraction 依赖 Anthropic 的 prompt caching 优化，失去它会增加成本

## Goals / Non-Goals

**Goals:**
1. 恢复 CCR 的 experience extraction 功能（回归修复）
2. 为 OpenAI-Compatible provider 添加 experience extraction 支持
3. 保持 Anthropic provider 的 prompt caching 优化
4. 为无 prompt caching 的 provider 记录成本警告

**Non-Goals:**
1. 不为 OpenAI provider 实现 prompt caching 替代方案（超出范围）
2. 不重构整个 experience extraction 的 prompt 设计
3. 不改变 experience extraction 的核心逻辑

## Decisions

### Decision 1: 统一 Provider 接口 — 支持多种 API 格式

**问题**：当前 LLMProvider 接口假设所有 provider 都使用相同的 API 格式。

**方案 A（推荐）**：扩展 LLMProvider 接口，添加 `supportsPromptCaching()` 和 `extractExperience()` 方法
```typescript
interface LLMProvider {
  generate(prompt: string, options?: any): Promise<string>;
  supportsPromptCaching(): boolean;
  // 新增：为 experience extraction 提供统一接口
  extractExperience(prompt: string, systemMessage: string): Promise<string>;
}
```

**方案 B**：在 experience-extractor 中为每个 provider 写分支逻辑
- ❌ 违反开闭原则，每次添加 provider 需要修改 extractor
- ❌ 代码重复，维护困难

**选择 A 的原因**：
- ✅ 符合开闭原则，新 provider 只需实现接口
- ✅ 保持 experience-extractor 的简洁性
- ✅ 便于测试和 mock

### Decision 2: CCR Provider 路由策略

**问题**：CCR 是 Anthropic API 的代理，应该使用 AnthropicProvider 还是独立的 CCRProvider？

**方案 A**：CCR 使用 AnthropicProvider（通过 baseURL 配置）
```typescript
// config.llm.activeProvider = 'ccr' 时
if (activeProvider === 'ccr') {
  // 创建 AnthropicProvider，但使用 CCR 的 baseURL
  return new AnthropicProvider({
    ...config.llm.ccr,
    // CCR 使用 Anthropic API 格式，所以可以复用 AnthropicProvider
  });
}
```
- ✅ 自动获得 prompt caching 支持
- ✅ 代码复用，无需重复实现
- ✅ 恢复"原来 CCR 是好使的"行为
- ❌ 配置架构上 CCR 是独立 provider，但实现上复用 Anthropic

**方案 B**：创建独立的 CCRProvider 包装 AnthropicProvider
- ❌ 增加复杂度，仅为命名一致性
- ❌ 需要大量转发代码

**选择 A 的原因**：
- CCR 的本质是"Anthropic API 的代理"，不是不同的 API 格式
- 用户不关心内部实现，只关心功能可用
- 最小化代码变更

### Decision 3: OpenAI Provider 的 Experience Extraction 实现

**问题**：OpenAI Chat Completions API 格式与 Anthropic Messages API 不同，需要适配。

**方案 A（推荐）**：在 OpenAIProvider 中实现 `extractExperience()` 适配方法
```typescript
class OpenAIProvider implements LLMProvider {
  async extractExperience(prompt: string, systemMessage: string): Promise<string> {
    // 转换为 Chat Completions 格式
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
    });
    return response.choices[0].message.content || '';
  }
}
```
- ✅ 封装 API 差异
- ✅ 保持 experience-extractor 的通用性
- ⚠️ 失去 prompt caching，成本可能增加

**方案 B**：在 experience-extractor 中判断 provider 类型并分别调用
- ❌ 违反单一职责原则
- ❌ experience-extractor 需要了解所有 provider 的 API 细节

**选择 A 的原因**：
- 每个 provider 自己负责 API 格式转换
- experience-extractor 只需调用统一接口

### Decision 4: Prompt Caching 缺失的处理策略

**问题**：OpenAI provider 不支持 prompt caching，可能导致每次分析成本增加。

**策略**：
1. **警告日志**：首次使用不支持 prompt caching 的 provider 时，记录警告
```typescript
if (!llmProvider.supportsPromptCaching()) {
  logger.warn('当前 LLM provider 不支持 prompt caching，token 成本可能较高');
  logger.warn(`建议切换到 Claude provider 以获得最佳性价比`);
}
```

2. **配置文档说明**：在用户文档中说明不同 provider 的成本差异

3. **不阻止使用**：即使没有 prompt caching，仍然允许用户使用 experience extraction

**Non-solution**：
- ❌ 不实现"简化 prompt"来降低 token 数（会影响提取质量）
- ❌ 不阻止用户使用不支持 prompt caching 的 provider（用户自主选择）

## Risks / Trade-offs

### Risk 1: OpenAI Provider 成本增加

**风险**：失去 prompt caching 后，每次 experience extraction 可能消耗 2-3 倍的 tokens。

**缓解措施**：
- 在日志中警告用户
- 在配置文档中说明 provider 选择的成本考虑
- 允许用户通过 `learning.extractObservations` 配置关闭 experience extraction

**接受理由**：用户可能使用第三方 OpenAI-compatible API（如 DeepSeek、Qwen），这些 API 的 token 成本远低于 Claude，即使没有 prompt caching 也可能更便宜。

### Risk 2: CCR 配置架构不一致

**风险**：在配置层面，CCR 是独立的 provider；但在实现层面，它复用 AnthropicProvider。这种不一致可能引起困惑。

**缓解措施**：
- 在代码注释中明确说明 CCR 的本质是"Anthropic API proxy"
- 在文档中解释 CCR 与 Anthropic 的关系
- 保持对用户透明：用户不需要知道这个实现细节

**接受理由**：这是配置架构重构时的遗留问题。从用户角度看，他们只关心"CCR 能用"，不关心它内部如何实现。未来可以在配置架构层面统一，但当前不必为此重构。

### Risk 3: API 格式差异导致提取质量下降

**风险**：不同 provider 对相同 prompt 的响应可能不同，导致提取质量不一致。

**缓解措施**：
- 使用相同的 system message 和 prompt 模板
- 在测试中验证三个 provider 的提取结果质量
- 如果发现质量问题，为不同 provider 提供微调的 prompt

**监控**：
- 在分析日志中记录使用的 provider
- 未来可以添加质量指标监控不同 provider 的提取效果

## Migration Plan

### 实施步骤

**Phase 1: 扩展 LLMProvider 接口**
1. 在 `src/llm/types.ts` 中添加 `extractExperience()` 和 `supportsPromptCaching()` 方法
2. 在 AnthropicProvider 中实现这些方法（保持现有逻辑）
3. 在 OpenAIProvider 中实现适配逻辑

**Phase 2: 修复 CCR 路由**
1. 在 `src/llm/client-factory.ts` 中，当 `activeProvider === 'ccr'` 时创建 AnthropicProvider
2. 使用 `config.llm.ccr.baseURL` 作为 AnthropicProvider 的 baseURL
3. 添加代码注释说明 CCR 的本质

**Phase 3: 移除硬编码检查**
1. 在 `experience-extractor.ts` 中移除 `instanceof AnthropicProvider` 检查
2. 改为调用 `llmProvider.extractExperience()`
3. 添加 prompt caching 警告（针对不支持的 provider）

**Phase 4: 测试和文档**
1. 为三个 provider 添加 experience extraction 测试
2. 更新用户文档，说明不同 provider 的成本考虑
3. 添加回归测试确保 CCR 可用

### 回滚策略

如果出现问题：
1. 立即恢复 `instanceof AnthropicProvider` 检查（保守策略）
2. 调查具体 provider 的问题
3. 临时禁用有问题的 provider，保持 Anthropic 可用

### 兼容性

**破坏性变更**：无

**向后兼容**：
- Anthropic provider 行为完全保持不变
- CCR 从"不可用"变为"可用"（功能恢复）
- OpenAI provider 从"不可用"变为"可用"（新功能）

## Open Questions

1. **是否需要为不同 provider 提供不同的 prompt 模板？**
   - 当前假设：所有 provider 对相同 prompt 的理解一致
   - 后续监控：在测试和实际使用中观察质量差异
   - 如果需要：可以在 provider 实现中微调 prompt

2. **是否需要添加 experience extraction 的 provider 开关？**
   - 例如：`config.learning.allowedProvidersForExtraction: ['claude', 'ccr']`
   - 当前决策：不添加，让所有 provider 都可用
   - 理由：用户可以通过选择 `activeProvider` 来控制

3. **CCR 是否真的支持 prompt caching？**
   - 假设：如果 CCR 代理了 Anthropic API，应该透传 prompt caching 头
   - 验证方法：在测试中检查 CCR 返回的 usage 中是否包含 `cache_read_input_tokens`
   - 如果不支持：记录警告，但不阻止使用
