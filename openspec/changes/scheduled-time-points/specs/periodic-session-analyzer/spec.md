## MODIFIED Requirements

### Requirement: Scheduler configuration schema
The `SchedulerSchema` SHALL support `"timepoints"` as a valid value for the `interval` field, and SHALL include an optional `scheduleTimes` array of `HH:MM` strings.

#### Scenario: Valid timepoints config
- **WHEN** config contains `{ interval: "timepoints", scheduleTimes: ["06:00", "13:00"] }`
- **THEN** schema validation SHALL pass

#### Scenario: Backward compatible interval config
- **WHEN** config contains `{ interval: "6h" }` without `scheduleTimes`
- **THEN** schema validation SHALL pass and behavior SHALL be identical to current implementation

#### Scenario: Invalid interval value
- **WHEN** config contains `{ interval: "timepoints" }` without `scheduleTimes` or with empty array
- **THEN** the scheduler SHALL treat this as disabled and log a warning
