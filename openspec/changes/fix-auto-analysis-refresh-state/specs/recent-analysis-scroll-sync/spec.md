## ADDED Requirements

### Requirement: RecentAnalysisWidget refreshes on analysis_started event
The RecentAnalysisWidget SHALL reload its run list when an `analysis_started` WebSocket event is received or when the backend analysis status indicates a running analysis on mount. This ensures a newly started analysis record appears in the list promptly.

#### Scenario: Auto-triggered analysis starts while widget is mounted
- **WHEN** an `analysis_started` WebSocket event is received
- **THEN** the widget SHALL reload the analysis run list within 500ms

#### Scenario: Page refresh during active analysis
- **WHEN** the page is refreshed while an analysis is running
- **THEN** the widget SHALL load the run list on mount, which SHALL include the in-progress run with status 'running'

### Requirement: Scroll pauses when first record is running
The RecentAnalysisWidget auto-scroll animation SHALL pause and reset to the top position when the first item in the run list has status 'running'. This ensures the user can see the in-progress analysis clearly.

#### Scenario: First run is in running status after refresh
- **WHEN** the run list is loaded AND the first run has status 'running'
- **THEN** the auto-scroll animation SHALL be paused AND the list SHALL be positioned at the top (translateY=0)

#### Scenario: Analysis completes and first run is no longer running
- **WHEN** an `analysis_complete` or `analysis_failed` event is received AND the first run status is no longer 'running'
- **THEN** the auto-scroll animation SHALL resume
