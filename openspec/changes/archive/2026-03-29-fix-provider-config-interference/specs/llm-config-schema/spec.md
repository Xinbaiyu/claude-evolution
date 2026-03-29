# llm-config-schema Delta Specification

## ADDED Requirements

### Requirement: Schema 支持 activeProvider 字段

系统必须扩展 `LLMConfig` schema 以包含必需的 `activeProvider` 字段，标识当前激活的提供商。

#### Scenario: activeProvider 字段接受有效值
- **WHEN** config 包含 `llm.activeProvider = "claude"`, `"openai"` 或 `"ccr"`
- **THEN** schema 验证通过

#### Scenario: activeProvider 字段拒绝无效值
- **WHEN** config 包含 `llm.activeProvider = "invalid"`
- **THEN** schema 验证失败，错误消息列出有效的提供商

#### Scenario: activeProvider 字段是必需的
- **WHEN** config 缺少 `llm.activeProvider` 字段
- **THEN** schema 验证失败，提示必须指定当前激活的提供商

### Requirement: Schema 支持嵌套的提供商配置对象

系统必须为每个提供商定义独立的配置对象 schema。

#### Scenario: Claude 配置对象验证
- **WHEN** config 包含 `llm.claude = { model: 'claude-sonnet-4-6', temperature: 0.3, maxTokens: 4096, enablePromptCaching: true }`
- **THEN** schema 验证通过

#### Scenario: OpenAI 配置对象验证
- **WHEN** config 包含 `llm.openai = { model: 'gpt-4-turbo', temperature: 0.3, maxTokens: 4096, baseURL: null, apiKey: null, organization: null }`
- **THEN** schema 验证通过

#### Scenario: CCR 配置对象验证
- **WHEN** config 包含 `llm.ccr = { model: 'claude-sonnet-4-6', temperature: 0.3, maxTokens: 4096, baseURL: 'http://localhost:3456' }`
- **THEN** schema 验证通过

#### Scenario: 提供商配置对象字段类型验证
- **WHEN** config 包含 `llm.claude.temperature = "not_a_number"`
- **THEN** schema 验证失败，提示 temperature 必须是数字类型

#### Scenario: 提供商配置对象必需字段验证
- **WHEN** config 包含 `llm.openai = { temperature: 0.3 }` 但缺少 `model` 字段
- **THEN** schema 验证失败，提示 model 是必需字段

### Requirement: Schema 验证提供商配置对象存在性

系统必须验证所有三个提供商的配置对象都存在且有效。

#### Scenario: 缺少 Claude 配置对象
- **WHEN** config 包含 `llm.activeProvider = "claude"` 但缺少 `llm.claude`
- **THEN** schema 验证失败，提示必须提供 Claude 配置

#### Scenario: 缺少 OpenAI 配置对象
- **WHEN** config 包含 `llm.openai = null`
- **THEN** schema 验证失败，提示 OpenAI 配置不能为 null

#### Scenario: 所有提供商配置对象都存在
- **WHEN** config 包含 `llm.claude`、`llm.openai`、`llm.ccr` 三个对象
- **THEN** schema 验证通过

### Requirement: Schema 生成嵌套配置的 TypeScript 类型

系统必须导出嵌套配置结构的 TypeScript 类型。

#### Scenario: ActiveProvider 类型
- **WHEN** TypeScript 代码导入 `ActiveProvider` 类型
- **THEN** 类型定义为 `"claude" | "openai" | "ccr"`

#### Scenario: ClaudeConfig 类型
- **WHEN** TypeScript 代码导入 `ClaudeConfig` 类型
- **THEN** 类型包含 `model`, `temperature`, `maxTokens`, `enablePromptCaching` 字段

#### Scenario: OpenAIConfig 类型
- **WHEN** TypeScript 代码导入 `OpenAIConfig` 类型
- **THEN** 类型包含 `model`, `temperature`, `maxTokens`, `baseURL`, `apiKey`, `organization` 字段

#### Scenario: CCRConfig 类型
- **WHEN** TypeScript 代码导入 `CCRConfig` 类型
- **THEN** 类型包含 `model`, `temperature`, `maxTokens`, `baseURL` 字段

#### Scenario: LLMConfig 类型包含嵌套对象
- **WHEN** TypeScript 代码导入 `LLMConfig` 类型
- **THEN** 类型包含 `activeProvider`, `claude`, `openai`, `ccr` 字段

## MODIFIED Requirements

### Requirement: Schema retains existing fields

系统必须保留提供商特定配置对象内的现有字段，不破坏向后兼容性。

#### Scenario: enablePromptCaching 在 Claude 配置中保留
- **WHEN** config 包含 `llm.claude.enablePromptCaching = true`
- **THEN** schema 验证通过

#### Scenario: baseURL 在 OpenAI 配置中保留
- **WHEN** config 包含 `llm.openai.baseURL = "https://api.openai.com"`
- **THEN** schema 验证通过

#### Scenario: baseURL 在 CCR 配置中是必需的
- **WHEN** config 包含 `llm.ccr = { model: 'claude-sonnet-4-6' }` 但缺少 `baseURL`
- **THEN** schema 验证失败，提示 CCR 配置必须包含 baseURL

### Requirement: Schema validates provider-specific constraints

系统必须执行提供商特定的验证规则。

#### Scenario: Claude 的 enablePromptCaching 字段有效
- **WHEN** config 包含 `llm.claude.enablePromptCaching = true`
- **THEN** schema 验证通过且该字段被传递给 AnthropicProvider

#### Scenario: OpenAI 配置不包含 enablePromptCaching
- **WHEN** config 包含 `llm.openai.enablePromptCaching = true`
- **THEN** schema 验证记录警告，提示 OpenAI 不支持 prompt caching

#### Scenario: CCR 的 baseURL 必须是有效 URL
- **WHEN** config 包含 `llm.ccr.baseURL = "not_a_url"`
- **THEN** schema 验证失败，提示 baseURL 必须是有效的 URL 格式

## REMOVED Requirements

### Requirement: Schema supports provider field

**Reason**: `provider` 字段被 `activeProvider` 替代，后者语义更清晰且支持 CCR 模式

**Migration**:
- 旧配置中的 `llm.provider = "anthropic"` 迁移为 `llm.activeProvider = "claude"`
- 旧配置中的 `llm.provider = "openai"` 迁移为 `llm.activeProvider = "openai"`
- 旧配置中存在 `llm.baseURL` 且 `llm.provider` 未设置时，迁移为 `llm.activeProvider = "ccr"`

### Requirement: Schema requires top-level model field

**Reason**: `model` 字段移动到提供商特定配置对象内，避免提供商间配置互相干扰

**Migration**:
- 旧配置中的 `llm.model` 迁移到 `llm.[activeProvider].model`
- 例如：如果 `activeProvider = "claude"`，则 `llm.model = "claude-sonnet-4-6"` 迁移为 `llm.claude.model = "claude-sonnet-4-6"`

### Requirement: Schema requires top-level temperature field

**Reason**: `temperature` 字段移动到提供商特定配置对象内，每个提供商可以有独立的温度设置

**Migration**:
- 旧配置中的 `llm.temperature` 迁移到 `llm.[activeProvider].temperature`
- 未激活的提供商使用默认值 `0.3`

### Requirement: Schema requires top-level maxTokens field

**Reason**: `maxTokens` 字段移动到提供商特定配置对象内，每个提供商可以有独立的 token 限制

**Migration**:
- 旧配置中的 `llm.maxTokens` 迁移到 `llm.[activeProvider].maxTokens`
- 未激活的提供商使用默认值 `4096`

### Requirement: Schema supports top-level baseURL field

**Reason**: `baseURL` 字段移动到 OpenAI 和 CCR 配置对象内，Claude 不使用 baseURL

**Migration**:
- 如果 `activeProvider = "openai"`，`llm.baseURL` 迁移到 `llm.openai.baseURL`
- 如果 `activeProvider = "ccr"`，`llm.baseURL` 迁移到 `llm.ccr.baseURL`
- 如果 `activeProvider = "claude"`，`llm.baseURL` 被忽略（Claude 使用官方 API 端点）

### Requirement: Schema supports provider-specific options at top level

**Reason**: 提供商特定配置字段（`llm.anthropic` 和 `llm.openai`）合并到对应的提供商配置对象内

**Migration**:
- `llm.anthropic.apiVersion` 迁移到 `llm.claude.apiVersion`
- `llm.openai.apiKey` 迁移到 `llm.openai.apiKey`（保持不变）
- `llm.openai.organization` 迁移到 `llm.openai.organization`（保持不变）
- 删除顶层的 `llm.anthropic` 和 `llm.openai` 对象
