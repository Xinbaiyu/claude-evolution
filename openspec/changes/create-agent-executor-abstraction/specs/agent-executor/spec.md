## ADDED Requirements

### Requirement: AgentExecutor class provides execute method

The system SHALL provide an `AgentExecutor` class with an `execute()` method that accepts a prompt and optional parameters, and returns execution results.

#### Scenario: Execute with only prompt
- **WHEN** `executor.execute({ prompt: "test prompt" })` is called
- **THEN** system SHALL use config.agent.defaultCwd as working directory
- **THEN** system SHALL use config.agent.timeoutMs, maxBudgetUsd, permissionMode
- **THEN** system SHALL return AgentExecuteResult with success/result/error fields

#### Scenario: Execute with custom working directory
- **WHEN** `executor.execute({ prompt: "test", cwd: "/custom/path" })` is called
- **THEN** system SHALL use `/custom/path` instead of config.agent.defaultCwd
- **THEN** system SHALL validate cwd against config.agent.allowedDirs

#### Scenario: Execute with system prompt
- **WHEN** `executor.execute({ prompt: "test", systemPrompt: "You are a bot" })` is called
- **THEN** system SHALL pass systemPrompt to underlying executeCC()

---

### Requirement: AgentExecutor reads configuration from config.agent

The system SHALL read all execution configuration from `config.agent` and apply it automatically without requiring caller to specify.

#### Scenario: Configuration is loaded on instantiation
- **WHEN** AgentExecutor is created via constructor
- **THEN** it SHALL store reference to config object
- **THEN** it SHALL validate config.agent exists

#### Scenario: BaseURL is passed to executeCC
- **WHEN** executor.execute() is called
- **THEN** system SHALL pass config.agent.baseURL to executeCC()
- **THEN** baseURL SHALL be null for native Claude or a URL for CCR

#### Scenario: Timeout and budget are applied
- **WHEN** executor.execute() is called
- **THEN** system SHALL pass config.agent.timeoutMs to executeCC()
- **THEN** system SHALL pass config.agent.maxBudgetUsd to executeCC()

---

### Requirement: AgentExecutor validates directory whitelist

The system SHALL enforce directory whitelist from `config.agent.allowedDirs` before executing.

#### Scenario: Allowed directory passes validation
- **WHEN** cwd is in config.agent.allowedDirs
- **THEN** validation SHALL pass
- **THEN** execution SHALL proceed

#### Scenario: Disallowed directory is rejected
- **WHEN** cwd is NOT in config.agent.allowedDirs AND allowedDirs is not empty
- **THEN** system SHALL return `{ success: false, error: "Path not allowed" }`
- **THEN** system SHALL NOT call executeCC()

#### Scenario: Empty allowedDirs bypasses validation
- **WHEN** config.agent.allowedDirs is empty array
- **THEN** system SHALL allow any directory
- **THEN** validation SHALL pass

---

### Requirement: AgentExecutor provides config reload capability

The system SHALL provide a `reloadConfig()` method to refresh configuration without recreating the executor.

#### Scenario: Config is reloaded on demand
- **WHEN** `executor.reloadConfig()` is called
- **THEN** system SHALL call loadConfig() to fetch latest config
- **THEN** system SHALL update internal config reference

#### Scenario: Reloaded config is used in subsequent executions
- **WHEN** config is reloaded
- **THEN** next execute() call SHALL use updated configuration values

---

### Requirement: Global singleton factory function

The system SHALL provide `getAgentExecutor()` factory function that returns a singleton instance.

#### Scenario: First call creates singleton
- **WHEN** getAgentExecutor() is called for the first time
- **THEN** system SHALL load config via loadConfig()
- **THEN** system SHALL create new AgentExecutor instance
- **THEN** system SHALL cache instance globally

#### Scenario: Subsequent calls return cached instance
- **WHEN** getAgentExecutor() is called again
- **THEN** system SHALL return the same cached instance
- **THEN** system SHALL NOT create new instance
- **THEN** system SHALL NOT reload config

---

### Requirement: Error handling returns structured results

The system SHALL catch all errors during execution and return structured AgentExecuteResult instead of throwing.

#### Scenario: Configuration error returns error result
- **WHEN** config.agent is undefined
- **THEN** system SHALL return `{ success: false, error: "Agent config not found", durationMs: 0 }`
- **THEN** system SHALL NOT throw exception

#### Scenario: Directory validation error returns error result
- **WHEN** directory is not in whitelist
- **THEN** system SHALL return `{ success: false, error: "Path not allowed: <path>", durationMs: 0 }`
- **THEN** system SHALL NOT throw exception

#### Scenario: executeCC error is caught and wrapped
- **WHEN** executeCC() throws an exception
- **THEN** system SHALL catch the exception
- **THEN** system SHALL return `{ success: false, error: <message>, durationMs: 0 }`

---

### Requirement: AgentExecutor supports hot reload via callback registration

The system SHALL provide callback registration mechanism to reload AgentExecutor when config.agent changes, without restarting daemon.

#### Scenario: Callback registration during daemon startup
- **WHEN** daemon starts
- **THEN** system SHALL call `onAgentConfigChanged(createReloadAgentExecutor())`
- **THEN** callback SHALL be stored for later invocation

#### Scenario: Config change triggers hot reload
- **WHEN** user updates config.agent via API
- **THEN** system SHALL call `triggerAgentConfigChanged()`
- **THEN** callback SHALL invoke `executor.reloadConfig()`
- **THEN** subsequent executions SHALL use new config values

#### Scenario: Hot reload updates baseURL
- **WHEN** config.agent.baseURL changes from null to CCR URL
- **THEN** hot reload SHALL apply new baseURL
- **THEN** next execute() SHALL route through CCR

#### Scenario: Hot reload updates allowedDirs
- **WHEN** config.agent.allowedDirs changes
- **THEN** hot reload SHALL apply new whitelist
- **THEN** next execute() SHALL validate against new whitelist

#### Scenario: Reload failure does not crash daemon
- **WHEN** reloadConfig() throws error
- **THEN** system SHALL log error
- **THEN** daemon SHALL continue running with old config
- **THEN** executor SHALL remain in last valid state

---

### Requirement: DingTalk bot uses AgentExecutor

The system SHALL modify `cc-bridge.ts` to use AgentExecutor instead of directly calling executeCC().

#### Scenario: Bot constructs executor from global factory
- **WHEN** bot receives message requiring Claude Code execution
- **THEN** bot SHALL call `getAgentExecutor()` to obtain executor
- **THEN** bot SHALL NOT read config.bot.cc directly

#### Scenario: Bot calls execute with minimal parameters
- **WHEN** bot executes agent task
- **THEN** bot SHALL call `executor.execute({ prompt, systemPrompt, cwd })`
- **THEN** bot SHALL NOT pass timeoutMs, maxBudgetUsd, permissionMode, baseURL

#### Scenario: Bot handles execution result
- **WHEN** executor.execute() returns result
- **THEN** bot SHALL check result.success
- **THEN** bot SHALL send result.result or result.error via async reply
- **THEN** bot SHALL include cost and duration info in reply
