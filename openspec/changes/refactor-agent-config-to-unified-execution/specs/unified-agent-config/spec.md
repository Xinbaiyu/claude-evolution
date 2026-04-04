## ADDED Requirements

### Requirement: Agent configuration is accessible at top-level config

The system SHALL provide a top-level `agent` configuration object in `config.agent`, separate from `bot` or `llm` configurations.

#### Scenario: Agent config exists as top-level field
- **WHEN** config is loaded
- **THEN** `config.agent` object MUST be available
- **THEN** `config.agent` SHALL NOT be nested under `config.bot`

#### Scenario: Agent config has required fields
- **WHEN** accessing `config.agent`
- **THEN** it MUST contain `baseURL`, `defaultCwd`, `allowedDirs`, `timeoutMs`, `maxBudgetUsd`, `permissionMode` fields

---

### Requirement: BaseURL distinguishes execution modes

The system SHALL use the `baseURL` field to determine whether to use native Claude API or a proxy (e.g., CCR).

#### Scenario: BaseURL is null for native Claude
- **WHEN** `config.agent.baseURL` is `null`
- **THEN** `ANTHROPIC_BASE_URL` environment variable SHALL NOT be set
- **THEN** Claude CLI SHALL connect to official Anthropic API

#### Scenario: BaseURL is set for CCR proxy
- **WHEN** `config.agent.baseURL` is `"http://localhost:3456"`
- **THEN** `ANTHROPIC_BASE_URL` environment variable SHALL be set to `"http://localhost:3456"`
- **THEN** Claude CLI SHALL route requests through CCR

---

### Requirement: Common config applies to both modes

The system SHALL use the same `defaultCwd`, `allowedDirs`, `timeoutMs`, `maxBudgetUsd`, and `permissionMode` configuration for both native Claude and CCR modes.

#### Scenario: Config applies regardless of baseURL
- **WHEN** `config.agent.baseURL` is `null` OR has a value
- **THEN** `config.agent.defaultCwd` SHALL be used as the working directory
- **THEN** `config.agent.allowedDirs` SHALL be enforced for directory access
- **THEN** `config.agent.timeoutMs` SHALL be used for execution timeout
- **THEN** `config.agent.maxBudgetUsd` SHALL be used for budget limit

---

### Requirement: Config migration from bot.cc to agent

The system SHALL automatically migrate existing `config.bot.cc` configuration to `config.agent` on first load.

#### Scenario: Migration happens when bot.cc exists and agent does not
- **WHEN** config file contains `bot.cc` and does NOT contain `agent`
- **THEN** system SHALL create `config.agent` with values from `bot.cc`
- **THEN** system SHALL delete `config.bot.cc` from the in-memory config
- **THEN** system SHALL persist the migrated config to disk

#### Scenario: Migration is skipped when agent already exists
- **WHEN** config file contains both `bot.cc` and `agent`
- **THEN** system SHALL log a warning about duplicate config
- **THEN** system SHALL use `config.agent` and ignore `bot.cc`
- **THEN** system SHALL NOT overwrite existing `config.agent`

#### Scenario: No migration when bot.cc does not exist
- **WHEN** config file does NOT contain `bot.cc`
- **THEN** no migration SHALL occur
- **THEN** `config.agent` SHALL use default values if not present

---

### Requirement: All agent execution reads from unified config

The system SHALL read agent execution configuration from `config.agent` for all scenarios that spawn Claude Code CLI.

#### Scenario: DingTalk bot uses unified agent config
- **WHEN** DingTalk bot receives a message requiring Claude Code execution
- **THEN** bot SHALL read configuration from `config.agent`
- **THEN** bot SHALL NOT read from `config.bot.cc`

#### Scenario: Future scheduled research tasks use unified agent config
- **WHEN** a scheduled research task triggers
- **THEN** task SHALL read configuration from `config.agent`
- **THEN** task SHALL use the same `baseURL`, `defaultCwd`, etc. as DingTalk bot

---

### Requirement: WebUI provides Agent Execution tab

The system SHALL provide a dedicated "Agent 执行" tab in the Settings page for configuring agent execution.

#### Scenario: Agent Execution tab is visible
- **WHEN** user navigates to Settings page
- **THEN** "Agent 执行" tab MUST be present
- **THEN** tab SHALL be positioned between "LLM 提供商" and "增量学习"

#### Scenario: Agent Execution tab displays mode selector
- **WHEN** user opens "Agent 执行" tab
- **THEN** UI SHALL show radio buttons for "原生 Claude" and "CCR 代理"
- **THEN** selecting "原生 Claude" SHALL set `baseURL` to `null`
- **THEN** selecting "CCR 代理" SHALL show an input field for baseURL

#### Scenario: Agent Execution tab displays common config fields
- **WHEN** user opens "Agent 执行" tab
- **THEN** UI SHALL display input fields for: 默认工作目录, 白名单目录, 超时(秒), 单次预算($), 权限模式
- **THEN** all fields SHALL be editable regardless of execution mode

---

### Requirement: LLM Provider tab renamed from Claude Model

The system SHALL rename the "Claude 模型" tab to "LLM 提供商" to accurately reflect that it contains multiple providers (Claude, OpenAI, CCR).

#### Scenario: Tab displays new name
- **WHEN** user views Settings page
- **THEN** tab SHALL be labeled "LLM 提供商"
- **THEN** tab SHALL NOT be labeled "Claude 模型"

---

### Requirement: Claude Code Bridge section removed from Notifications tab

The system SHALL remove the "Claude Code 桥接" configuration section from the "通知通道" tab.

#### Scenario: CC Bridge section does not appear in Notifications
- **WHEN** user opens "通知通道" tab
- **THEN** "Claude Code 桥接" section SHALL NOT be visible
- **THEN** only Webhook and DingTalk bot sections SHALL be present

---

### Requirement: Config validation enforces agent schema

The system SHALL validate that `config.agent` conforms to the AgentConfigSchema when loading or saving configuration.

#### Scenario: Valid config passes validation
- **WHEN** `config.agent` contains all required fields with correct types
- **THEN** validation SHALL pass
- **THEN** config SHALL be loaded successfully

#### Scenario: Invalid baseURL is rejected
- **WHEN** `config.agent.baseURL` is a number instead of string or null
- **THEN** validation SHALL fail
- **THEN** system SHALL throw a validation error

#### Scenario: Missing required field is rejected
- **WHEN** `config.agent` is missing `defaultCwd` field
- **THEN** validation SHALL use default value from schema
- **THEN** config SHALL be loaded with defaults

---

### Requirement: Backward compatibility with bot.cc for 3 versions

The system SHALL continue to support reading `config.bot.cc` for 3 minor versions after this change, with deprecation warnings.

#### Scenario: Deprecation warning is logged
- **WHEN** system detects `config.bot.cc` during migration
- **THEN** system SHALL log a warning: "bot.cc is deprecated, migrating to agent config"
- **THEN** migration SHALL proceed automatically

#### Scenario: bot.cc removed after deprecation period
- **WHEN** 3 minor versions have passed since deprecation
- **THEN** `bot.cc` schema definition SHALL be removed
- **THEN** migration logic SHALL be removed
- **THEN** system SHALL NOT read from `bot.cc`
