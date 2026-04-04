## 1. Create AgentExecutor Core

- [ ] 1.1 Create `src/agent/types.ts` with AgentExecuteOptions and AgentExecuteResult interfaces
- [ ] 1.2 Create `src/agent/executor.ts` with AgentExecutor class skeleton
- [ ] 1.3 Implement AgentExecutor constructor that accepts Config and validates config.agent exists
- [ ] 1.4 Implement execute() method that reads config.agent and calls executeCC()
- [ ] 1.5 Implement directory whitelist validation in execute()
- [ ] 1.6 Implement error handling that returns AgentExecuteResult instead of throwing
- [ ] 1.7 Implement reloadConfig() method

## 2. Create Singleton Factory

- [ ] 2.1 Add global variable `globalExecutor: AgentExecutor | null` in executor.ts
- [ ] 2.2 Implement getAgentExecutor() factory function
- [ ] 2.3 Add singleton caching logic to getAgentExecutor()
- [ ] 2.4 Export getAgentExecutor as public API

## 3. Unit Tests for AgentExecutor

- [ ] 3.1 Write test: execute() with prompt only uses default config
- [ ] 3.2 Write test: execute() with custom cwd overrides default
- [ ] 3.3 Write test: execute() passes baseURL from config.agent to executeCC()
- [ ] 3.4 Write test: directory whitelist validation rejects disallowed paths
- [ ] 3.5 Write test: empty allowedDirs bypasses validation
- [ ] 3.6 Write test: missing config.agent returns error result
- [ ] 3.7 Write test: reloadConfig() updates internal config
- [ ] 3.8 Write test: getAgentExecutor() returns singleton
- [ ] 3.9 Mock executeCC() to avoid spawning real processes in tests

## 4. Refactor DingTalk Bot

- [ ] 4.1 Update cc-bridge.ts to import getAgentExecutor
- [ ] 4.2 Replace executeCC() call with executor.execute()
- [ ] 4.3 Remove manual config.bot.cc reading from cc-bridge.ts
- [ ] 4.4 Remove manual parameter passing (timeoutMs, maxBudgetUsd, etc.)
- [ ] 4.5 Keep systemPrompt construction logic
- [ ] 4.6 Verify bot still passes cwd from path resolver

## 5. Integration Test for DingTalk Bot

- [ ] 5.1 Test: bot receives message and executes via AgentExecutor
- [ ] 5.2 Test: bot uses config.agent.baseURL (null = native, URL = CCR)
- [ ] 5.3 Test: bot respects config.agent.allowedDirs
- [ ] 5.4 Test: bot sends async reply with result/error and cost info

## 6. Extend Reminder Types

- [ ] 6.1 Add ReminderTaskType = 'notification' | 'agent-task' to reminders/types.ts
- [ ] 6.2 Add taskType field to Reminder interface
- [ ] 6.3 Add agentTask?: { prompt: string; cwd?: string } field to Reminder interface
- [ ] 6.4 Make message field optional (only required when taskType='notification')
- [ ] 6.5 Update CreateReminderInput to include taskType and agentTask
- [ ] 6.6 Update default taskType to 'notification' for backward compatibility

## 7. Extend Reminder Service

- [ ] 7.1 Import getAgentExecutor in reminders/service.ts
- [ ] 7.2 Update handleTrigger() to check reminder.taskType
- [ ] 7.3 Add branch for taskType='notification' (existing dispatch logic)
- [ ] 7.4 Add branch for taskType='agent-task' that calls executor.execute()
- [ ] 7.5 Extract prompt and cwd from reminder.agentTask
- [ ] 7.6 Await executor.execute() result
- [ ] 7.7 Dispatch notification with execution result (success or error)
- [ ] 7.8 Include cost and duration in notification body

## 8. Extend Reminder API

- [ ] 8.1 Update CreateReminderSchema in web/server/routes/reminders.ts
- [ ] 8.2 Add taskType field validation (optional, default 'notification')
- [ ] 8.3 Add agentTask field validation (required if taskType='agent-task')
- [ ] 8.4 Add validation: agentTask.prompt is required for agent-task
- [ ] 8.5 Add validation: either message (notification) or agentTask (agent-task) must be present
- [ ] 8.6 Update error messages for new validations

## 9. Unit Tests for Scheduled Agent Tasks

- [ ] 9.1 Write test: reminder with taskType='notification' dispatches notification
- [ ] 9.2 Write test: reminder with taskType='agent-task' executes via AgentExecutor
- [ ] 9.3 Write test: successful agent execution sends success notification
- [ ] 9.4 Write test: failed agent execution sends error notification
- [ ] 9.5 Write test: one-shot agent-task is marked 'triggered' after execution
- [ ] 9.6 Write test: recurring agent-task stays 'active' after execution
- [ ] 9.7 Mock AgentExecutor to avoid real execution in tests

## 10. Integration Test for Scheduled Agent Tasks

- [ ] 10.1 Test: create agent-task reminder via API with one-shot schedule
- [ ] 10.2 Test: create agent-task reminder via API with recurring schedule
- [ ] 10.3 Test: agent-task triggers at scheduled time and executes
- [ ] 10.4 Test: execution result is sent via notification channels
- [ ] 10.5 Test: API rejects agent-task without prompt
- [ ] 10.6 Test: API rejects agent-task without agentTask field

## 11. Documentation

- [ ] 11.1 Add JSDoc comments to AgentExecutor class and methods
- [ ] 11.2 Add JSDoc comments to getAgentExecutor() factory
- [ ] 11.3 Document AgentExecuteOptions and AgentExecuteResult interfaces
- [ ] 11.4 Update README.md with AgentExecutor usage examples
- [ ] 11.5 Document agent-task reminder type in API documentation
- [ ] 11.6 Add example: create scheduled research task via API

## 12. Type Definitions Export

- [ ] 12.1 Export AgentExecuteOptions from src/agent/types.ts
- [ ] 12.2 Export AgentExecuteResult from src/agent/types.ts
- [ ] 12.3 Export ReminderTaskType from src/reminders/types.ts
- [ ] 12.4 Update web/client/src/api/client.ts Config type if needed

## 13. Hot Reload Integration

- [ ] 13.1 Add `agentConfigChangedCallback` variable to web/server/index.ts
- [ ] 13.2 Add `onAgentConfigChanged()` function to web/server/index.ts
- [ ] 13.3 Add `triggerAgentConfigChanged()` function to web/server/index.ts
- [ ] 13.4 Export both functions from web/server/index.ts
- [ ] 13.5 Create `createReloadAgentExecutor()` in src/daemon/lifecycle.ts
- [ ] 13.6 Import and register callback during daemon startup in lifecycle.ts
- [ ] 13.7 Update web/server/routes/system.ts to detect config.agent changes
- [ ] 13.8 Call triggerAgentConfigChanged() when config.agent is modified
- [ ] 13.9 Add error handling for reload failures (log but don't crash)
- [ ] 13.10 Write test: config.agent change triggers hot reload
- [ ] 13.11 Write test: hot reload updates executor's internal config
- [ ] 13.12 Write test: reload failure is logged but daemon continues
