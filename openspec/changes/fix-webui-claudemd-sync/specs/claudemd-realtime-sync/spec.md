## ADDED Requirements

### Requirement: CLAUDE.md regenerates after context pool modification
The system SHALL automatically regenerate CLAUDE.md whenever the context pool is modified through Web UI operations.

#### Scenario: Promote operation triggers regeneration
- **WHEN** user promotes an observation from Active pool to Context pool via Web UI
- **THEN** CLAUDE.md is regenerated with the newly added observation

#### Scenario: Delete operation triggers regeneration
- **WHEN** user deletes an observation from Context pool via Web UI
- **THEN** CLAUDE.md is regenerated without the deleted observation

#### Scenario: Ignore operation on context observation triggers regeneration
- **WHEN** user marks a Context pool observation as ignored via Web UI
- **THEN** CLAUDE.md is regenerated to reflect the current context state

#### Scenario: Restore operation triggers regeneration if observation goes to context
- **WHEN** user restores an archived observation that has inContext=true
- **THEN** CLAUDE.md is regenerated to include the restored observation

#### Scenario: Batch operations trigger single regeneration
- **WHEN** user performs batch promote/delete/ignore on multiple observations
- **THEN** CLAUDE.md is regenerated once after all operations complete

### Requirement: CLAUDE.md generation is non-blocking
The system SHALL NOT block HTTP responses while generating CLAUDE.md.

#### Scenario: API responds before CLAUDE.md completes
- **WHEN** user performs a context-modifying operation via Web UI
- **THEN** API responds with success status immediately
- **THEN** CLAUDE.md generation happens asynchronously without blocking the response

### Requirement: CLAUDE.md generation failures are logged
The system SHALL log errors if CLAUDE.md generation fails, without causing the API operation to fail.

#### Scenario: Generation error does not fail API operation
- **WHEN** CLAUDE.md generation encounters an error during a context modification
- **THEN** the context.json file is still updated successfully
- **THEN** the error is logged with appropriate context
- **THEN** the API operation returns success
