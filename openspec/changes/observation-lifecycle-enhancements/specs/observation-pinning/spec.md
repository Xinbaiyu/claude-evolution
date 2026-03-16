## ADDED Requirements

### Requirement: Users SHALL pin observations in Context Pool
The system SHALL allow users to mark observations as pinned to protect them from automatic removal during capacity enforcement.

#### Scenario: Pin observation via API
- **WHEN** user calls POST /api/learning/pin with observation ID
- **THEN** observation SHALL have `pinned = true`
- **THEN** observation SHALL have `pinnedBy = 'user'`
- **THEN** observation SHALL have `pinnedAt` set to current timestamp
- **THEN** Context Pool SHALL be saved with updated observation

#### Scenario: Unpin observation via API
- **WHEN** user calls POST /api/learning/unpin with pinned observation ID
- **THEN** observation's `pinned`, `pinnedBy`, and `pinnedAt` fields SHALL be cleared
- **THEN** observation SHALL become eligible for capacity enforcement

#### Scenario: Pin nonexistent observation
- **WHEN** user attempts to pin observation ID not in Context Pool
- **THEN** system SHALL return 404 error with message "Observation not found in Context Pool"

#### Scenario: Pin observation already pinned
- **WHEN** user pins observation that is already pinned
- **THEN** system SHALL return success without changes (idempotent operation)

### Requirement: Pinned observations SHALL be protected from removal
The system SHALL exclude pinned observations from capacity enforcement calculations and archival.

#### Scenario: Capacity enforcement skips pinned observations
- **WHEN** Context Pool capacity enforcement runs
- **THEN** observations with `pinned = true` SHALL NOT be scored
- **THEN** pinned observations SHALL NOT be archived regardless of age or confidence
- **THEN** available capacity SHALL be calculated as (maxSize - pinnedCount)

#### Scenario: Pinned observation protection is absolute
- **WHEN** Context Pool has 80 observations with maxSize=80 and all are pinned
- **THEN** capacity enforcement SHALL NOT archive any observations
- **THEN** new promotions SHALL be blocked until observations are unpinned or manually removed

### Requirement: UI SHALL provide pin functionality
The Web UI SHALL allow users to pin and unpin observations through Context Pool interface.

#### Scenario: Display pin button in Context Pool
- **WHEN** user views Context Pool page
- **THEN** each observation card SHALL display a pin button (📌 icon)
- **THEN** pinned observations SHALL show filled pin icon and "Pinned" badge
- **THEN** unpinned observations SHALL show outline pin icon

#### Scenario: Pin observation via UI
- **WHEN** user clicks pin button on unpinned observation
- **THEN** system SHALL call pin API
- **THEN** observation SHALL move to top of Context Pool list
- **THEN** observation SHALL display filled pin icon and "Pinned" badge

#### Scenario: Unpin observation via UI
- **WHEN** user clicks pin button on pinned observation
- **THEN** system SHALL call unpin API
- **THEN** observation SHALL return to normal sort order
- **THEN** observation SHALL display outline pin icon

#### Scenario: Batch pin observations
- **WHEN** user selects multiple observations and clicks "Pin Selected"
- **THEN** system SHALL call pin API for each selected observation
- **THEN** all selected observations SHALL become pinned

#### Scenario: Pin limit warning
- **WHEN** user has pinned 20 or more observations
- **THEN** UI SHALL display warning "You have X pinned observations. Consider reviewing older pins."
- **THEN** user SHALL still be able to pin more observations (soft limit, not enforced)
