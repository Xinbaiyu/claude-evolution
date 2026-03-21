## MODIFIED Requirements

### Requirement: Assemble CLAUDE.md from multiple sources

The system SHALL combine source files (`source/*.md`) and promoted observations (`context.json`) into a single CLAUDE.md output. The `learned/` directory SHALL NOT be used as an input source.

Preference sub-categories SHALL be displayed with human-readable Chinese labels instead of raw English keys. The mapping SHALL be:
- `communication` → "沟通方式"
- `style` → "代码风格"
- `tool` → "工具偏好"
- `process` → "开发流程"
- `workflow` (legacy) → "开发流程" (same as `process`)

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

#### Scenario: Preference sub-group uses Chinese labels
- **WHEN** generating the "用户偏好" section with preferences of type `process`
- **THEN** the h3 heading SHALL display "开发流程" instead of "process"

#### Scenario: Legacy workflow type renders correctly
- **WHEN** a preference observation has `item.type === "workflow"` (legacy data not yet migrated)
- **THEN** the system SHALL render it under the "开发流程" heading (same as `process`)

## ADDED Requirements

### Requirement: Migrate legacy preference type values on load

The system SHALL normalize legacy `Preference.type` values when loading observations from disk. Specifically, `item.type === "workflow"` SHALL be rewritten to `process` and the updated data SHALL be persisted back to disk.

#### Scenario: context.json contains legacy workflow type
- **WHEN** `regenerateClaudeMdFromDisk()` loads context.json and finds observations with `item.type === "workflow"`
- **THEN** the system SHALL update those values to `process` and write the corrected data back to context.json

#### Scenario: active.json contains legacy workflow type
- **WHEN** the migration logic loads active.json and finds observations with `item.type === "workflow"`
- **THEN** the system SHALL update those values to `process` and write the corrected data back to active.json

#### Scenario: No legacy data present
- **WHEN** no observations have `item.type === "workflow"`
- **THEN** the system SHALL skip migration and not modify any files
