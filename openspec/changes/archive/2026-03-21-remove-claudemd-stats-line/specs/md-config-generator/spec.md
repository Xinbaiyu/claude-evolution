## MODIFIED Requirements

### Requirement: Assemble CLAUDE.md from multiple sources

The system SHALL combine source files (`source/*.md`) and promoted observations (`context.json`) into a single CLAUDE.md output. The `learned/` directory SHALL NOT be used as an input source.

Preference sub-categories SHALL be displayed with human-readable Chinese labels instead of raw English keys. The mapping SHALL be:
- `communication` → "沟通方式"
- `style` → "代码风格"
- `tool` → "工具偏好"
- `development-process` → "开发流程"
- `workflow` (legacy) → "开发流程" (same as `development-process`)

Observation entries SHALL NOT include usage statistics (mention counts, session counts, evidence counts). Each entry SHALL render only the description text, without any metadata sub-lines.

The sort order within each category SHALL use `mentions` descending to determine display priority, but the `mentions` value itself SHALL NOT appear in the output.

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
- **WHEN** generating the "用户偏好" section with preferences of type `development-process`
- **THEN** the h3 heading SHALL display "开发流程" instead of "development-process"

#### Scenario: Legacy workflow type renders correctly
- **WHEN** a preference observation has `item.type === "workflow"` (legacy data not yet migrated)
- **THEN** the system SHALL render it under the "开发流程" heading (same as `development-process`)

#### Scenario: Preference entry without statistics
- **WHEN** generating a preference entry with description "优先使用中文进行沟通" and mentions=34 and evidence.length=15
- **THEN** the output SHALL be `- **优先使用中文进行沟通**` only, with no sub-line containing "观察到" or session/mention counts

#### Scenario: Pattern entry without statistics
- **WHEN** generating a pattern entry with description "使用函数式编程模式" and mentions=12
- **THEN** the output SHALL be `- **使用函数式编程模式**` only, with no sub-line containing "出现" or counts

#### Scenario: Workflow entry without statistics
- **WHEN** generating a development-process entry with description "TDD开发流程"
- **THEN** the output SHALL be `- **TDD开发流程**` only, with no sub-line containing "使用" or counts

#### Scenario: Entries remain sorted by frequency
- **WHEN** generating entries within a category
- **THEN** entries with higher `mentions` values SHALL appear before entries with lower `mentions` values
