## ADDED Requirements

### Requirement: Inject existing observations into extraction prompt

The system SHALL load high-confidence observations from both context pool and active pool, format them as a reference list, and inject into the extraction prompt before calling the LLM.

This prevents the LLM from re-extracting observations that the system already knows about.

#### Scenario: Context and active pool observations injected

- **WHEN** the extraction pipeline runs with existing observations in the context pool (e.g., "优先使用中文进行技术沟通" with confidence=1.0) and active pool (e.g., "使用 pnpm 作为包管理器" with confidence=0.85)
- **THEN** the extraction prompt SHALL include a section listing these existing observations as "already known" items, instructing the LLM to skip them

#### Scenario: Observation count limited to prevent prompt bloat

- **WHEN** the combined context pool + active pool contains more than 30 high-confidence observations
- **THEN** the system SHALL select the top 30 observations sorted by `confidence * mentions` descending and inject only those into the prompt

#### Scenario: Empty pools handled gracefully

- **WHEN** both context pool and active pool are empty (first run)
- **THEN** the extraction prompt SHALL omit the "existing observations" section entirely and proceed with the original prompt format

### Requirement: Observation formatting for prompt injection

The system SHALL format each existing observation as a concise one-line summary containing only its type and core content (description for preferences, problem+solution for patterns, name for workflows).

#### Scenario: Preference observation formatted

- **WHEN** a preference observation `{ type: "communication", description: "优先使用中文进行技术沟通" }` is selected for injection
- **THEN** it SHALL be formatted as: `- [偏好/communication] 优先使用中文进行技术沟通`

#### Scenario: Pattern observation formatted

- **WHEN** a pattern observation `{ problem: "TypeScript 类型错误", solution: "使用 strict mode" }` is selected for injection
- **THEN** it SHALL be formatted as: `- [模式] TypeScript 类型错误 → 使用 strict mode`

#### Scenario: Workflow observation formatted

- **WHEN** a workflow observation `{ name: "PR 提交流程" }` is selected for injection
- **THEN** it SHALL be formatted as: `- [工作流] PR 提交流程`

### Requirement: Active pool filtering threshold

The system SHALL only inject active pool observations with `confidence >= 0.7`. Context pool observations SHALL be injected regardless of confidence (they are already promoted/validated).

#### Scenario: Low-confidence active observation excluded

- **WHEN** an active pool observation has confidence=0.55
- **THEN** it SHALL NOT be included in the injected observation list

#### Scenario: Context pool observation always included

- **WHEN** a context pool observation has confidence=0.6 (decayed)
- **THEN** it SHALL still be included in the injected observation list (context pool items are already validated)
