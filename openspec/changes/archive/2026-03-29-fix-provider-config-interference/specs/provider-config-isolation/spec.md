# provider-config-isolation Specification

## Purpose
确保每个 LLM 提供商（Claude、OpenAI、CCR）拥有独立的配置存储，切换提供商时不会互相干扰或覆盖彼此的配置。

## Requirements

### Requirement: 每个提供商有独立配置对象

系统必须为每个 LLM 提供商维护独立的配置对象，配置字段包括但不限于 model、temperature、maxTokens。

#### Scenario: Claude 提供商有独立配置
- **WHEN** 用户配置 Claude 提供商的 model 为 `claude-sonnet-4-6`
- **THEN** 该配置存储在 `config.llm.claude.model` 字段

#### Scenario: OpenAI 提供商有独立配置
- **WHEN** 用户配置 OpenAI 提供商的 model 为 `gpt-4-turbo`
- **THEN** 该配置存储在 `config.llm.openai.model` 字段

#### Scenario: CCR 提供商有独立配置
- **WHEN** 用户配置 CCR 提供商的 model 为 `claude-opus-4-6`
- **THEN** 该配置存储在 `config.llm.ccr.model` 字段

### Requirement: 切换提供商不影响其他提供商配置

切换当前激活的提供商时，其他提供商的已保存配置必须保持不变。

#### Scenario: 从 Claude 切换到 OpenAI 保留 Claude 配置
- **WHEN** 用户在 Claude 模式设置 model 为 `claude-sonnet-4-6`
- **WHEN** 用户切换到 OpenAI 模式
- **THEN** `config.llm.claude.model` 仍然是 `claude-sonnet-4-6`

#### Scenario: 从 OpenAI 切换到 CCR 保留 OpenAI 配置
- **WHEN** 用户在 OpenAI 模式设置 temperature 为 `0.7`
- **WHEN** 用户切换到 CCR 模式
- **THEN** `config.llm.openai.temperature` 仍然是 `0.7`

#### Scenario: 多次切换提供商配置均保留
- **WHEN** 用户依次配置 Claude (model=A), OpenAI (model=B), CCR (model=C)
- **WHEN** 用户在三个提供商间多次切换
- **THEN** 每个提供商的 model 配置保持原值 (A, B, C)

### Requirement: 修改配置只影响当前激活提供商

用户修改配置参数时，仅修改当前激活提供商的配置，不影响其他提供商。

#### Scenario: 在 Claude 模式修改 temperature
- **WHEN** 当前激活 Claude 提供商
- **WHEN** 用户修改 temperature 为 `0.5`
- **THEN** `config.llm.claude.temperature` 变为 `0.5`
- **THEN** `config.llm.openai.temperature` 和 `config.llm.ccr.temperature` 保持不变

#### Scenario: 在 OpenAI 模式修改 model
- **WHEN** 当前激活 OpenAI 提供商
- **WHEN** 用户修改 model 为 `gpt-4`
- **THEN** `config.llm.openai.model` 变为 `gpt-4`
- **THEN** `config.llm.claude.model` 和 `config.llm.ccr.model` 保持不变

#### Scenario: 在 CCR 模式修改 maxTokens
- **WHEN** 当前激活 CCR 提供商
- **WHEN** 用户修改 maxTokens 为 `8192`
- **THEN** `config.llm.ccr.maxTokens` 变为 `8192`
- **THEN** `config.llm.claude.maxTokens` 和 `config.llm.openai.maxTokens` 保持不变

### Requirement: 系统使用当前激活提供商的配置

当系统需要调用 LLM 时，必须使用当前激活提供商对应的配置对象。

#### Scenario: 激活 Claude 时使用 Claude 配置
- **WHEN** `config.llm.activeProvider` 为 `claude`
- **WHEN** 系统需要调用 LLM
- **THEN** 系统从 `config.llm.claude` 读取配置参数

#### Scenario: 激活 OpenAI 时使用 OpenAI 配置
- **WHEN** `config.llm.activeProvider` 为 `openai`
- **WHEN** 系统需要调用 LLM
- **THEN** 系统从 `config.llm.openai` 读取配置参数

#### Scenario: 激活 CCR 时使用 CCR 配置
- **WHEN** `config.llm.activeProvider` 为 `ccr`
- **WHEN** 系统需要调用 LLM
- **THEN** 系统从 `config.llm.ccr` 读取配置参数

### Requirement: 配置持久化保留所有提供商配置

保存配置到文件时，必须持久化所有提供商的配置，而不仅仅是当前激活的提供商。

#### Scenario: 保存配置包含所有提供商
- **WHEN** 用户点击"保存配置"按钮
- **THEN** 配置文件包含 `config.llm.claude`、`config.llm.openai`、`config.llm.ccr` 三个对象
- **THEN** 每个对象包含该提供商的完整配置

#### Scenario: 重启后加载所有提供商配置
- **WHEN** daemon 重启并加载配置文件
- **THEN** `config.llm.claude`、`config.llm.openai`、`config.llm.ccr` 三个配置对象均被正确加载
- **THEN** 用户切换到任意提供商时，该提供商的配置立即可用

### Requirement: 未配置的提供商使用合理默认值

首次使用或切换到未配置过的提供商时，系统必须提供合理的默认配置值。

#### Scenario: 首次使用 Claude 时提供默认值
- **WHEN** 用户首次切换到 Claude 提供商
- **WHEN** `config.llm.claude` 不存在或为空
- **THEN** 系统使用默认值 `{ model: 'claude-sonnet-4-6', temperature: 0.3, maxTokens: 4096, enablePromptCaching: true }`

#### Scenario: 首次使用 OpenAI 时提供默认值
- **WHEN** 用户首次切换到 OpenAI 提供商
- **WHEN** `config.llm.openai` 不存在或为空
- **THEN** 系统使用默认值 `{ model: 'gpt-4-turbo', temperature: 0.3, maxTokens: 4096, baseURL: null }`

#### Scenario: 首次使用 CCR 时提供默认值
- **WHEN** 用户首次切换到 CCR 提供商
- **WHEN** `config.llm.ccr` 不存在或为空
- **THEN** 系统使用默认值 `{ model: 'claude-sonnet-4-6', temperature: 0.3, maxTokens: 4096, baseURL: 'http://localhost:3456' }`
