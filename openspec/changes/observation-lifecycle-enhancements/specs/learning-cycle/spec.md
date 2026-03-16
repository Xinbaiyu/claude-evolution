## ADDED Requirements

### Requirement: Learning cycle SHALL include Context Pool capacity control
The learning orchestrator SHALL execute Context Pool capacity enforcement after auto-promotion step.

#### Scenario: Execute capacity control in learning cycle
- **WHEN** learning cycle reaches capacity control phase
- **THEN** system SHALL call enforceContextCapacity() with Context Pool observations
- **THEN** capacity enforcement SHALL use config from learning.capacity.context
- **THEN** pruned observations SHALL be archived with reason='context_capacity'

#### Scenario: Skip capacity control when disabled
- **WHEN** config.learning.capacity.context.enabled = false
- **THEN** system SHALL skip Context Pool capacity enforcement
- **THEN** learning cycle SHALL log "Context Pool capacity control disabled"

#### Scenario: Learning cycle step ordering
- **WHEN** learning cycle executes
- **THEN** steps SHALL execute in order: Session Analysis → LLM Merge → Temporal Decay → Deletion → Active Capacity Control → Auto-Promotion → Context Capacity Control → Save State → Regenerate CLAUDE.md

#### Scenario: Capacity control performance
- **WHEN** Context Pool capacity enforcement runs
- **THEN** execution time SHALL be ≤ 500ms for pools with ≤ 200 observations
- **THEN** system SHALL log capacity enforcement duration

### Requirement: Learning cycle SHALL log capacity actions
The learning orchestrator SHALL provide detailed logging for Context Pool capacity decisions.

#### Scenario: Log capacity enforcement results
- **WHEN** Context Pool capacity control completes
- **THEN** log SHALL include original observation count
- **THEN** log SHALL include pinned observation count
- **THEN** log SHALL include pruned observation count
- **THEN** log SHALL include final observation count
- **THEN** log SHALL include list of archived observation IDs
