## MODIFIED Requirements

### Requirement: Analysis status recovery on page refresh
The system SHALL restore the correct analysis running state on page refresh regardless of whether the analysis was triggered manually or automatically. When the backend reports an active analysis via GET /api/analyze/status, the ManualAnalysisTrigger component SHALL enter loading state and display elapsed time calculated from the backend-reported startTime.

#### Scenario: Page refresh during auto-triggered analysis
- **WHEN** an analysis is running (triggered by scheduler) AND the user refreshes the page
- **THEN** the ManualAnalysisTrigger button SHALL display loading state with correct elapsed time

#### Scenario: Page refresh during manually-triggered analysis
- **WHEN** an analysis is running (triggered by manual click) AND the user refreshes the page
- **THEN** the ManualAnalysisTrigger button SHALL display loading state with correct elapsed time (existing behavior, preserved)

#### Scenario: Page refresh when no analysis is running
- **WHEN** no analysis is running AND the user refreshes the page
- **THEN** the ManualAnalysisTrigger button SHALL display its default idle state

## ADDED Requirements

### Requirement: Dashboard subscribes to analysis_started WebSocket event
The Dashboard SHALL listen for `analysis_started` WebSocket events. When received, the ManualAnalysisTrigger component SHALL transition to loading state using the startTime and runId from the event payload, without requiring a page refresh.

#### Scenario: Auto-triggered analysis starts while user is on Dashboard
- **WHEN** the user is viewing the Dashboard AND the scheduler triggers an analysis
- **THEN** the ManualAnalysisTrigger button SHALL transition to loading state in real-time

#### Scenario: WebSocket event received with startTime
- **WHEN** an `analysis_started` event is received with `startTime` and `runId` fields
- **THEN** the component SHALL set isRunning=true and compute elapsed time from the received startTime
