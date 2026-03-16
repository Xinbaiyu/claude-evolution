## ADDED Requirements

### Requirement: Batch promote observations
The system SHALL allow users to promote multiple selected observations to the context pool in a single operation.

#### Scenario: Successful batch promote
- **WHEN** user selects 10 observations AND clicks "Batch Promote" button
- **THEN** all 10 observations are moved to context pool AND success toast shows "Promoted 10 observations"

#### Scenario: Batch promote with already-in-context observations
- **WHEN** user selects 10 observations where 3 are already in context AND clicks "Batch Promote"
- **THEN** only 7 observations are promoted AND warning toast shows "Promoted 7 observations (3 already in context)"

#### Scenario: Batch promote failure handling
- **WHEN** batch promote operation fails for observation #5 of 10
- **THEN** system rolls back all changes AND error toast shows "Promote failed: <error message>" AND observations remain in original state

### Requirement: Batch ignore observations
The system SHALL allow users to mark multiple selected observations as ignored in a single operation.

#### Scenario: Successful batch ignore
- **WHEN** user selects 15 observations AND clicks "Batch Ignore" button
- **THEN** all 15 observations receive manualOverride.action = 'ignore' AND success toast shows "Ignored 15 observations"

#### Scenario: Batch ignore with optional reason
- **WHEN** user selects observations AND clicks "Batch Ignore" AND enters reason "test noise"
- **THEN** all observations receive manualOverride.reason = "test noise"

### Requirement: Batch delete observations
The system SHALL allow users to delete multiple selected observations in a single operation.

#### Scenario: Successful batch delete
- **WHEN** user selects 20 observations AND clicks "Batch Delete" AND confirms deletion
- **THEN** all 20 observations are moved to archived pool AND success toast shows "Deleted 20 observations"

#### Scenario: Batch delete confirmation dialog
- **WHEN** user clicks "Batch Delete" with 20 selected observations
- **THEN** confirmation dialog appears showing "Delete 20 observations? This will move them to the archived pool for 30 days."

#### Scenario: User cancels batch delete
- **WHEN** user clicks "Batch Delete" AND clicks "Cancel" in confirmation dialog
- **THEN** no observations are deleted AND selection remains unchanged

### Requirement: Batch operation size limits
The system SHALL enforce reasonable limits on batch operation sizes to prevent performance issues.

#### Scenario: Batch operation within limit
- **WHEN** user selects 50 observations AND performs batch operation
- **THEN** operation executes normally

#### Scenario: Batch operation exceeds soft limit
- **WHEN** user selects 75 observations AND performs batch operation
- **THEN** warning dialog appears: "Large selection (75 items) may take longer. Continue?"

#### Scenario: Batch operation exceeds hard limit
- **WHEN** user attempts to perform batch operation on 250 observations
- **THEN** error dialog appears: "Cannot process more than 200 observations at once. Please refine your selection."

### Requirement: Batch operation progress indication
The system SHALL provide real-time progress feedback during batch operations.

#### Scenario: Progress indicator for long operations
- **WHEN** user performs batch operation on 100 observations
- **THEN** progress toast displays "Processing 35/100..." updating in real-time

#### Scenario: Chunked execution for large batches
- **WHEN** user performs batch operation on 150 observations
- **THEN** system executes in chunks of 50 AND progress indicator shows chunk progress

### Requirement: Batch operation error handling
The system SHALL handle partial failures gracefully and report specific errors to users.

#### Scenario: Partial failure in batch operation
- **WHEN** batch operation fails on 3 of 50 observations
- **THEN** successful operations complete AND error toast shows "47 succeeded, 3 failed: <error details>"

#### Scenario: Complete failure in batch operation
- **WHEN** batch operation fails due to network error
- **THEN** no changes are persisted AND error toast shows "Operation failed: <error message>. Please try again."

### Requirement: Post-operation selection behavior
The system SHALL clear selection after successful batch operation completion.

#### Scenario: Selection cleared after batch promote
- **WHEN** user promotes 10 observations via batch operation
- **THEN** selection count shows zero AND batch action bar is hidden
