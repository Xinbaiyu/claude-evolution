## MODIFIED Requirements

### Requirement: Assemble CLAUDE.md from multiple sources

The system SHALL combine source files (`source/*.md`) and promoted observations (`context.json`) into a single CLAUDE.md output. The `learned/` directory SHALL NOT be used as an input source.

#### Scenario: Standard assembly
- **WHEN** generating CLAUDE.md
- **THEN** the system reads `source/*.md` files (CORE.md first, then alphabetically) and `context.json` promoted observations, combining them into a single output

#### Scenario: Section separator injection
- **WHEN** concatenating source files
- **THEN** the system inserts "---" separator between each source file

#### Scenario: Metadata header generation
- **WHEN** generating output
- **THEN** the system prepends header with: generation timestamp, version string, source file count, observation count

#### Scenario: Character limit enforcement
- **WHEN** assembled content exceeds max_chars limit (default 20000)
- **THEN** the system truncates learned observation sections first, preserving source files, then logs warning

## ADDED Requirements

### Requirement: Provide disk-based generation entry point
The system SHALL provide a `regenerateClaudeMdFromDisk()` function that loads `context.json` from disk, loads `source/*.md`, and generates CLAUDE.md without requiring observations to be passed as arguments.

#### Scenario: Watcher-triggered regeneration
- **WHEN** the file watcher detects a change and calls `regenerateClaudeMdFromDisk()`
- **THEN** the system reads current `context.json` from `~/.claude-evolution/memory/observations/context.json`, reads all `source/*.md` files, and writes `~/.claude-evolution/output/CLAUDE.md`

#### Scenario: Context pool is empty
- **WHEN** `context.json` does not exist or contains no observations
- **THEN** the system generates CLAUDE.md with only source file content (no learned sections)

#### Scenario: Fallback for CLI analyze command
- **WHEN** the `analyze` CLI command runs without daemon (no watcher active)
- **THEN** the pipeline calls `regenerateClaudeMdFromDisk()` directly as fallback

## REMOVED Requirements

### Requirement: Read learned files from learned/ directory
**Reason**: Learning content is now exclusively sourced from `context.json` (three-pool observation system). The `learned/` directory is a legacy path from the pre-incremental-learning architecture.
**Migration**: All learned content is managed through the learning orchestrator's context pool. No action needed; existing `learned/` files are preserved on disk but ignored.
