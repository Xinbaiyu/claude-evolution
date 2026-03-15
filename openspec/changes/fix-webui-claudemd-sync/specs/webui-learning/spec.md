## MODIFIED Requirements

### Requirement: User can promote observations to context pool
The system SHALL allow users to manually promote observations from Active pool to Context pool via Web UI, overriding any previous ignore flags.

#### Scenario: Promote clean observation
- **WHEN** user clicks promote button on an observation without manual override
- **THEN** observation is marked as inContext=true
- **THEN** observation is added to context.json
- **THEN** manualOverride is set to {action: 'promote', timestamp: <now>}

#### Scenario: Promote previously ignored observation
- **WHEN** user clicks promote button on an observation with manualOverride.action='ignore'
- **THEN** observation is marked as inContext=true
- **THEN** observation is added to context.json
- **THEN** manualOverride is updated to {action: 'promote', timestamp: <now>}
- **THEN** the previous ignore flag is cleared

#### Scenario: Cannot promote already promoted observation
- **WHEN** user clicks promote button on an observation with inContext=true
- **THEN** system returns error "Observation is already in context"
- **THEN** no changes are made to the observation

### Requirement: State transitions are logged
The system SHALL log all observation state transitions triggered by user actions.

#### Scenario: Log ignore to promote transition
- **WHEN** user promotes an observation that was previously ignored
- **THEN** system logs "Observation {id} was previously ignored, now promoting"
- **THEN** log includes previous and new manualOverride values
