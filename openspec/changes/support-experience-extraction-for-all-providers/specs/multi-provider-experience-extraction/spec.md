# multi-provider-experience-extraction Specification

## Purpose
确保 experience extraction（经验提取）功能支持所有 LLM provider（Claude Official API、OpenAI-Compatible API、CCR Proxy），而非仅限 Anthropic provider。

## ADDED Requirements

### Requirement: Experience extraction 支持 Anthropic Provider

系统 SHALL 支持使用 Anthropic Official API 进行 experience extraction，保持 prompt caching 等优化特性。

#### Scenario: Anthropic Provider 执行 experience extraction
- **WHEN** `config.llm.activeProvider` 为 `claude`
- **WHEN** 系统执行 experience extraction
- **THEN** 使用 Anthropic Messages API 调用 LLM
- **THEN** 使用 prompt caching 优化重复内容

#### Scenario: Anthropic Provider 记录 cache_read_input_tokens
- **WHEN** 使用 Anthropic Provider 执行 experience extraction
- **WHEN** prompt caching 命中
- **THEN** 日志中记录 `cache_read_input_tokens > 0`
- **THEN** 用户可见 token 成本降低

### Requirement: Experience extraction 支持 OpenAI-Compatible Provider

系统 SHALL 支持使用 OpenAI-Compatible API 进行 experience extraction，适配 Chat Completions API 格式。

#### Scenario: OpenAI Provider 执行 experience extraction
- **WHEN** `config.llm.activeProvider` 为 `openai`
- **WHEN** 系统执行 experience extraction
- **THEN** 使用 OpenAI Chat Completions API 调用 LLM
- **THEN** 系统消息和用户 prompt 正确转换为 messages 格式

#### Scenario: OpenAI Provider 不支持 prompt caching 时记录警告
- **WHEN** 使用 OpenAI Provider 执行 experience extraction
- **THEN** 日志记录警告："当前 LLM provider 不支持 prompt caching，token 成本可能较高"
- **THEN** 建议用户切换到 Claude provider 以获得最佳性价比

#### Scenario: OpenAI Provider 提取结果格式正确
- **WHEN** 使用 OpenAI Provider 执行 experience extraction
- **THEN** 返回的 JSON 格式与 Anthropic Provider 一致
- **THEN** 包含 preferences, patterns, workflows 三个数组

### Requirement: Experience extraction 支持 CCR Proxy

系统 SHALL 支持使用 CCR Proxy 进行 experience extraction，复用 Anthropic API 格式和优化。

#### Scenario: CCR Provider 执行 experience extraction
- **WHEN** `config.llm.activeProvider` 为 `ccr`
- **WHEN** 系统执行 experience extraction
- **THEN** 通过 CCR baseURL 调用 Anthropic Messages API
- **THEN** 使用与 Anthropic Provider 相同的 API 格式

#### Scenario: CCR Provider 保持 prompt caching 支持
- **WHEN** 使用 CCR Provider 执行 experience extraction
- **WHEN** CCR 代理支持 prompt caching
- **THEN** prompt caching 头正确传递给上游 Anthropic API
- **THEN** 日志中记录 cache 命中情况

#### Scenario: CCR Provider 不支持 prompt caching 时降级
- **WHEN** 使用 CCR Provider 执行 experience extraction
- **WHEN** CCR 代理不支持 prompt caching
- **THEN** experience extraction 仍能正常工作
- **THEN** 记录警告说明失去了 prompt caching 优化

### Requirement: LLMProvider 接口统一 experience extraction

所有 LLMProvider 实现 SHALL 提供统一的 `extractExperience()` 方法，封装 API 格式差异。

#### Scenario: LLMProvider 接口包含 extractExperience 方法
- **WHEN** 实现新的 LLMProvider
- **THEN** MUST 实现 `extractExperience(prompt: string, systemMessage: string): Promise<string>` 方法
- **THEN** 方法返回 LLM 的 JSON 响应文本

#### Scenario: LLMProvider 接口包含 supportsPromptCaching 方法
- **WHEN** 实现新的 LLMProvider
- **THEN** MUST 实现 `supportsPromptCaching(): boolean` 方法
- **THEN** 返回 true 表示支持 prompt caching，false 表示不支持

#### Scenario: AnthropicProvider 实现 extractExperience
- **WHEN** 调用 `AnthropicProvider.extractExperience()`
- **THEN** 使用 Anthropic Messages API 格式
- **THEN** 包含 `system` 参数和 prompt caching 标记

#### Scenario: OpenAIProvider 实现 extractExperience
- **WHEN** 调用 `OpenAIProvider.extractExperience()`
- **THEN** 转换为 Chat Completions API 格式
- **THEN** `systemMessage` 转换为 `{ role: 'system', content: ... }`
- **THEN** `prompt` 转换为 `{ role: 'user', content: ... }`

### Requirement: 移除硬编码 Anthropic Provider 检查

系统 SHALL NOT 硬编码限制 experience extraction 只能使用 Anthropic Provider。

#### Scenario: 不阻止非 Anthropic Provider 的 experience extraction
- **WHEN** `config.llm.activeProvider` 为 `openai` 或 `ccr`
- **WHEN** 系统执行 experience extraction
- **THEN** 不抛出 "Experience extraction currently requires Anthropic provider" 错误
- **THEN** 正常执行 experience extraction

#### Scenario: 使用 provider-agnostic 的实现
- **WHEN** experience-extractor.ts 调用 LLM
- **THEN** 通过 `llmProvider.extractExperience()` 调用
- **THEN** 不检查 `llmProvider instanceof AnthropicProvider`

### Requirement: 记录 provider 使用信息

系统 SHALL 在日志中记录当前使用的 LLM provider，便于调试和成本分析。

#### Scenario: 记录 provider 类型
- **WHEN** 开始 experience extraction
- **THEN** 日志记录 `提供商: claude` 或 `openai` 或 `ccr`

#### Scenario: 记录 prompt caching 支持状态
- **WHEN** 开始 experience extraction
- **THEN** 日志记录 provider 是否支持 prompt caching
- **THEN** 对于不支持的 provider，记录成本警告

#### Scenario: 记录 token 使用统计
- **WHEN** experience extraction 完成
- **THEN** 日志记录 input_tokens, output_tokens
- **THEN** 对于支持 prompt caching 的 provider，记录 cache_read_input_tokens

### Requirement: 保持 experience extraction 结果一致性

无论使用哪个 provider，experience extraction 的输出格式和质量 SHALL 保持一致。

#### Scenario: 所有 provider 返回相同的 JSON 结构
- **WHEN** 使用任意 provider 执行 experience extraction
- **THEN** 返回 JSON 包含 `preferences`, `patterns`, `workflows` 字段
- **THEN** 每个字段是对象数组，符合 ExtractionResult 类型

#### Scenario: 相同输入在不同 provider 产生相似结果
- **WHEN** 使用相同的 observations 和 promptsContext
- **WHEN** 分别用 Claude、OpenAI、CCR provider 执行 extraction
- **THEN** 提取的 preferences/patterns/workflows 主题相似（允许表述差异）
- **THEN** 提取的观察数量在合理范围内（±20%）
