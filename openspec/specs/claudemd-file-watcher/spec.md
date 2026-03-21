# claudemd-file-watcher Specification

## Purpose
Watches source files and context pool for changes, triggering CLAUDE.md regeneration automatically via debounced file system events, eliminating duplicate regeneration calls from the learning pipeline.

## Requirements
### Requirement: Watch source files for changes
The system SHALL monitor `~/.claude-evolution/source/*.md` files for add/change/unlink events using chokidar.

#### Scenario: Source file edited
- **WHEN** a user edits any `.md` file in `source/` directory
- **THEN** the system triggers CLAUDE.md regeneration within 500ms debounce window

#### Scenario: Source file added
- **WHEN** a new `.md` file is added to `source/` directory
- **THEN** the system triggers CLAUDE.md regeneration

#### Scenario: Source file removed
- **WHEN** a `.md` file is deleted from `source/` directory
- **THEN** the system triggers CLAUDE.md regeneration

### Requirement: Watch context pool for changes
The system SHALL monitor `~/.claude-evolution/memory/observations/context.json` for changes.

#### Scenario: Context pool updated after learning cycle
- **WHEN** the learning orchestrator writes updated context.json (e.g. after auto-promotion)
- **THEN** the system triggers CLAUDE.md regeneration within 500ms debounce window

#### Scenario: Context pool updated via WebUI
- **WHEN** the user promotes/demotes/ignores observations through the WebUI API
- **THEN** the system triggers CLAUDE.md regeneration

### Requirement: Debounce rapid changes
The system SHALL debounce multiple file change events within a configurable window (default 500ms) into a single regeneration.

#### Scenario: Rapid multiple edits
- **WHEN** multiple source files are edited within 500ms
- **THEN** the system triggers exactly one CLAUDE.md regeneration after the last event

### Requirement: Integrate watcher into daemon lifecycle
The system SHALL start the file watcher when the daemon starts and stop it on shutdown.

#### Scenario: Daemon start
- **WHEN** the daemon process starts (via `claude-evolution start` or `claude-evolution daemon`)
- **THEN** the file watcher is initialized and actively monitoring

#### Scenario: Daemon shutdown
- **WHEN** the daemon process receives SIGTERM/SIGINT
- **THEN** the file watcher is closed cleanly (no leaked handles)

### Requirement: Eliminate duplicate regeneration in pipeline
The learning orchestrator SHALL NOT directly call any CLAUDE.md generator. It SHALL only write `context.json`, and the watcher handles regeneration.

#### Scenario: Learning cycle completes with promotions
- **WHEN** the learning orchestrator promotes observations and saves context.json
- **THEN** only the file watcher triggers CLAUDE.md regeneration (not the orchestrator)

#### Scenario: Pipeline analysis completes
- **WHEN** the analysis pipeline finishes all steps
- **THEN** there is no explicit `generateCLAUDEmd()` call in the pipeline; regeneration is handled by the watcher reacting to context.json changes
