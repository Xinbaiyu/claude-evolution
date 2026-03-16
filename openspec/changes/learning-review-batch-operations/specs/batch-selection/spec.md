## ADDED Requirements

### Requirement: Individual observation selection
The system SHALL allow users to select individual observations using checkboxes displayed on each observation card.

#### Scenario: User selects single observation
- **WHEN** user clicks checkbox on an observation card
- **THEN** checkbox displays checked state AND observation ID is added to selection set

#### Scenario: User deselects single observation
- **WHEN** user clicks checked checkbox on an observation card
- **THEN** checkbox displays unchecked state AND observation ID is removed from selection set

### Requirement: Select all observations
The system SHALL provide a "Select All" control that selects all currently filtered observations in the active tab.

#### Scenario: User clicks select all with no filters
- **WHEN** user clicks "Select All" checkbox in header
- **THEN** all observations in current tab are selected AND all checkboxes display checked state

#### Scenario: User clicks select all with active filters
- **WHEN** user has filters applied (tier: Gold, type: preference) AND clicks "Select All"
- **THEN** only observations matching current filters are selected AND hidden observations remain unselected

### Requirement: Deselect all observations
The system SHALL provide a "Deselect All" or "Clear Selection" control that removes all selections.

#### Scenario: User clears selection
- **WHEN** user clicks "Deselect All" button
- **THEN** all checkboxes display unchecked state AND selection count shows zero

### Requirement: Selection persistence across filter changes
The system SHALL preserve selected observation IDs when users change filters, even if selected observations are hidden by the new filter.

#### Scenario: Selected observations hidden by filter
- **WHEN** user selects 5 Gold observations AND changes filter to "Silver only"
- **THEN** selection count shows "5 selected (5 hidden by filter)" AND previously selected IDs remain in selection set

#### Scenario: Selected observations become visible again
- **WHEN** user has 5 hidden selected observations AND removes filter
- **THEN** previously hidden observations appear with checked checkboxes

### Requirement: Selection count display
The system SHALL display the count of currently selected observations in a prominent location.

#### Scenario: Selection count updates dynamically
- **WHEN** user selects observations one by one
- **THEN** selection count updates in real-time showing "X selected"

#### Scenario: No observations selected
- **WHEN** no observations are selected
- **THEN** selection count and batch action bar are hidden

### Requirement: Visual feedback for selected state
The system SHALL provide clear visual feedback to distinguish selected observations from unselected ones.

#### Scenario: Selected observation styling
- **WHEN** observation is selected
- **THEN** observation card displays visual highlight (e.g., border color change, background tint)

### Requirement: Keyboard accessibility
The system SHALL support keyboard navigation and selection using space bar or enter key.

#### Scenario: Keyboard selection
- **WHEN** user navigates to checkbox using Tab key AND presses Space
- **THEN** observation selection state toggles
