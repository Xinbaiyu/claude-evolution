## ADDED Requirements

### Requirement: Settings UI SHALL provide Context Pool capacity controls
The Web UI Settings page SHALL allow users to configure Context Pool capacity parameters.

#### Scenario: Display capacity configuration section
- **WHEN** user navigates to Settings page
- **THEN** page SHALL display "Context Pool Capacity" section
- **THEN** section SHALL include enable/disable toggle
- **THEN** section SHALL include input fields for targetSize, maxSize, and halfLifeDays
- **THEN** current values SHALL be loaded from config file

#### Scenario: Update capacity configuration
- **WHEN** user modifies capacity settings and clicks Save
- **THEN** system SHALL validate inputs (targetSize ≤ maxSize, values > 0, halfLifeDays > 0)
- **THEN** system SHALL update config file at ~/.claude-evolution/config.json
- **THEN** system SHALL show success notification
- **THEN** new settings SHALL take effect on next learning cycle

#### Scenario: Invalid configuration input
- **WHEN** user enters targetSize > maxSize
- **THEN** system SHALL display validation error "Target size must be ≤ max size"
- **THEN** Save button SHALL be disabled until validation passes

#### Scenario: Disable capacity management
- **WHEN** user toggles capacity management to disabled
- **THEN** system SHALL set config.learning.capacity.context.enabled = false
- **THEN** targetSize, maxSize, and halfLifeDays inputs SHALL be visually disabled
- **THEN** Context Pool capacity enforcement SHALL be skipped in future learning cycles

#### Scenario: Enable capacity management
- **WHEN** user toggles capacity management to enabled
- **THEN** system SHALL set config.learning.capacity.context.enabled = true
- **THEN** targetSize, maxSize, and halfLifeDays inputs SHALL become editable
- **THEN** capacity enforcement SHALL run on next learning cycle

### Requirement: Settings UI SHALL display capacity statistics
The Settings page SHALL show current Context Pool capacity utilization to help users tune parameters.

#### Scenario: Display capacity statistics
- **WHEN** user views Context Pool Capacity settings section
- **THEN** page SHALL display current observation count
- **THEN** page SHALL display current pinned observation count
- **THEN** page SHALL display utilization percentage (current / maxSize × 100%)
- **THEN** page SHALL display "Capacity OK" or "Over capacity" status

#### Scenario: Capacity warning indicator
- **WHEN** current Context Pool size > maxSize
- **THEN** settings SHALL display warning indicator
- **THEN** warning message SHALL be "Context Pool is over capacity. Next learning cycle will archive observations."
