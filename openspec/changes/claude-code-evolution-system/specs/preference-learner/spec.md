## ADDED Requirements

### Requirement: Merge preferences with existing configuration

The system SHALL intelligently merge learned preferences with user's existing configuration without overwriting manually set values.

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
