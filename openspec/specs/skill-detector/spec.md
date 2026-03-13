# skill-detector Specification

## Purpose
TBD - created by archiving change claude-code-evolution-system. Update Purpose after archive.
## Requirements
### Requirement: Detect reusable command patterns

The system SHALL identify command sequences that are repeated frequently enough to warrant skill creation.

#### Scenario: Frequency threshold detection
- **WHEN** a command sequence appears 5+ times across sessions
- **THEN** the system marks it as a skill candidate

#### Scenario: Contextual grouping
- **WHEN** detecting patterns
- **THEN** the system groups by context (file types, project structure, tools)

#### Scenario: Skill naming suggestion
- **WHEN** identifying a skill candidate
- **THEN** the system generates a descriptive kebab-case name (e.g., "git-commit-push-flow")

