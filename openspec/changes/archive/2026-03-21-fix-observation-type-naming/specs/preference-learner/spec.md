## MODIFIED Requirements

### Requirement: Merge preferences with existing configuration

The system SHALL intelligently merge learned preferences with user's existing configuration without overwriting manually set values.

Preference items SHALL use `type` values from the set: `style | tool | process | communication`. The value `workflow` is no longer valid for `Preference.type` and SHALL be treated as an alias for `process` during reads.

#### Scenario: Non-conflicting merge
- **WHEN** learned preference is "use pnpm" and no package manager preference exists in source config
- **THEN** the system adds the preference to learned/preferences.md

#### Scenario: Conflicting preference detection
- **WHEN** learned preference conflicts with source config (e.g., source says "use npm", learned says "use pnpm")
- **THEN** the system marks as conflict and requires user review

#### Scenario: Confidence-based application
- **WHEN** preference confidence >= 0.8
- **THEN** the system auto-applies in learned/ files without user confirmation

#### Scenario: Low confidence requires confirmation
- **WHEN** preference confidence < 0.8
- **THEN** the system generates suggestion but requires user approval before applying

#### Scenario: LLM extraction uses updated type enum
- **WHEN** the LLM extracts a new preference from session analysis
- **THEN** the preference `type` field SHALL be one of `style | tool | process | communication` (not `workflow`)

#### Scenario: Legacy workflow type backward compatibility
- **WHEN** an existing observation has `item.type === "workflow"` (legacy data)
- **THEN** the system SHALL treat it as equivalent to `process` without error
