# md-config-generator Specification

## Purpose
TBD - created by archiving change claude-code-evolution-system. Update Purpose after archive.
## Requirements
### Requirement: Assemble CLAUDE.md from multiple sources

The system SHALL combine source files and learned files into a single CLAUDE.md output.

#### Scenario: Standard assembly
- **WHEN** generating CLAUDE.md
- **THEN** the system concatenates in order: source/CORE.md, source/STYLE.md, source/CODING.md, learned/preferences.md, learned/workflows.md, learned/solutions.md

#### Scenario: Section separator injection
- **WHEN** concatenating files
- **THEN** the system inserts "---" separator between each file

#### Scenario: Metadata header generation
- **WHEN** generating output
- **THEN** the system prepends header with: generation timestamp, profile name, source file versions

#### Scenario: Character limit enforcement
- **WHEN** assembled content exceeds max_chars limit (default 20000)
- **THEN** the system truncates learned files first, then logs warning

