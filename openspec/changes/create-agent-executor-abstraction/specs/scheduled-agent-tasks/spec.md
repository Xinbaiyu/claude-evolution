## ADDED Requirements

### Requirement: Reminder type supports agent-task

The system SHALL extend `Reminder` type to support `taskType` field with values `'notification'` or `'agent-task'`.

#### Scenario: taskType determines reminder behavior
- **WHEN** reminder has `taskType: 'notification'`
- **THEN** system SHALL use `message` field for notification content
- **THEN** system SHALL NOT execute agent task

#### Scenario: agent-task type uses agentTask field
- **WHEN** reminder has `taskType: 'agent-task'`
- **THEN** system SHALL use `agentTask.prompt` for execution
- **THEN** system SHALL ignore `message` field if present

---

### Requirement: agent-task reminder has prompt and cwd

The system SHALL define `agentTask` field on Reminder with `prompt` (required) and `cwd` (optional).

#### Scenario: agentTask with prompt only
- **WHEN** reminder is created with `{ taskType: 'agent-task', agentTask: { prompt: "research NASDAQ" } }`
- **THEN** system SHALL store prompt
- **THEN** system SHALL use config.agent.defaultCwd when executing

#### Scenario: agentTask with custom cwd
- **WHEN** reminder is created with `{ taskType: 'agent-task', agentTask: { prompt: "...", cwd: "~/projects" } }`
- **THEN** system SHALL store cwd
- **THEN** system SHALL use ~/projects when executing

---

### Requirement: Trigger handler executes agent tasks

The system SHALL extend `reminders/service.ts` handleTrigger() to detect agent-task type and execute via AgentExecutor.

#### Scenario: notification task triggers notification
- **WHEN** reminder with `taskType: 'notification'` triggers
- **THEN** system SHALL call dispatcher.dispatch() with message
- **THEN** system SHALL NOT execute agent

#### Scenario: agent-task triggers execution
- **WHEN** reminder with `taskType: 'agent-task'` triggers
- **THEN** system SHALL call `getAgentExecutor()`
- **THEN** system SHALL call `executor.execute({ prompt: agentTask.prompt, cwd: agentTask.cwd })`
- **THEN** system SHALL await execution result

---

### Requirement: Execution result is sent as notification

The system SHALL send agent task execution result via notification dispatcher after task completes.

#### Scenario: Successful execution sends result
- **WHEN** agent task executes successfully
- **THEN** system SHALL dispatch notification with title "调研完成"
- **THEN** system SHALL include result.result in notification body
- **THEN** system SHALL include cost and duration info

#### Scenario: Failed execution sends error
- **WHEN** agent task execution fails
- **THEN** system SHALL dispatch notification with title "任务失败"
- **THEN** system SHALL include result.error in notification body
- **THEN** system SHALL include duration info

---

### Requirement: API supports creating agent-task reminders

The system SHALL extend `/api/reminders` POST endpoint to accept `taskType` and `agentTask` fields.

#### Scenario: Create agent-task with one-shot schedule
- **WHEN** POST /api/reminders with `{ taskType: 'agent-task', agentTask: { prompt: "..." }, triggerAt: "2026-04-02T10:00:00+08:00" }`
- **THEN** system SHALL create reminder with taskType='agent-task'
- **THEN** system SHALL store agentTask.prompt
- **THEN** system SHALL schedule trigger at specified time

#### Scenario: Create agent-task with recurring schedule
- **WHEN** POST /api/reminders with `{ taskType: 'agent-task', agentTask: { prompt: "..." }, schedule: "0 9 * * *" }`
- **THEN** system SHALL create recurring reminder
- **THEN** system SHALL execute task every day at 9am

---

### Requirement: API validation for agent-task

The system SHALL validate that agent-task reminders have required agentTask.prompt field.

#### Scenario: Missing prompt is rejected
- **WHEN** POST /api/reminders with `{ taskType: 'agent-task', agentTask: {} }`
- **THEN** system SHALL return 400 Bad Request
- **THEN** system SHALL return error: "agentTask.prompt is required"

#### Scenario: Missing agentTask is rejected
- **WHEN** POST /api/reminders with `{ taskType: 'agent-task' }` without agentTask field
- **THEN** system SHALL return 400 Bad Request
- **THEN** system SHALL return error: "agentTask is required for agent-task type"

---

### Requirement: One-shot agent-task is marked triggered after execution

The system SHALL mark one-shot agent-task reminders as 'triggered' status after execution completes.

#### Scenario: One-shot task status updated
- **WHEN** one-shot agent-task completes execution
- **THEN** system SHALL set reminder.status to 'triggered'
- **THEN** system SHALL persist updated status to disk

#### Scenario: Recurring task status unchanged
- **WHEN** recurring agent-task completes execution
- **THEN** system SHALL keep reminder.status as 'active'
- **THEN** task SHALL trigger again on next schedule
