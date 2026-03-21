## MODIFIED Requirements

### Requirement: Safe initialization with existing configuration protection

The system SHALL detect and safely handle existing CLAUDE.md configuration during initialization, providing multiple options to prevent data loss.

> **Change**: No behavioral change. This requirement is unaffected by the router migration. Listed here only to confirm the dashboard page component itself is unchanged — only how it is mounted (via route configuration instead of `renderPage` switch) changes.

#### Scenario: Detect existing configuration
- **WHEN** user runs `claude-evolution init` and `~/.claude/CLAUDE.md` exists
- **THEN** the system displays a warning message showing the file size and modification date

#### Scenario: Create permanent backup
- **WHEN** user chooses to proceed with initialization and existing CLAUDE.md is detected
- **THEN** the system creates a permanent backup at `~/.claude/CLAUDE.md.backup-YYYY-MM-DD-HH-mm-ss` before any modifications

#### Scenario: Offer migration options
- **WHEN** existing CLAUDE.md is detected
- **THEN** the system presents three options:
  - Option A: Import existing configuration (recommended)
  - Option B: Keep original configuration (independent mode)
  - Option C: Cancel installation

#### Scenario: Import existing configuration (Option A)
- **WHEN** user selects "Import existing configuration"
- **THEN** the system SHALL:
  - Parse the existing CLAUDE.md content
  - Attempt to intelligently split it into source/CORE.md, source/STYLE.md, source/CODING.md
  - Save any unclassifiable content to source/UNMAPPED.md
  - Display a summary of what was imported and what needs manual review
  - Ask whether to switch immediately or later

#### Scenario: Independent mode (Option B)
- **WHEN** user selects "Keep original configuration"
- **THEN** the system SHALL:
  - Leave `~/.claude/CLAUDE.md` untouched
  - Create `~/.claude-evolution/` directory structure
  - Generate configuration in `~/.claude-evolution/output/CLAUDE.md`
  - Display instructions for manual switching later

#### Scenario: Cancel installation (Option C)
- **WHEN** user selects "Cancel installation"
- **THEN** the system SHALL:
  - Clean up any created files
  - Exit without making any modifications
  - Display message confirming no changes were made

#### Scenario: Dry-run mode
- **WHEN** user runs `claude-evolution init --dry-run`
- **THEN** the system displays all actions it would take without actually executing them

### Requirement: Page components receive navigation context from router

Each page component SHALL access route information (current path, params, navigation functions) through React Router hooks instead of receiving props from a parent switch statement.

#### Scenario: Page component uses route hooks
- **WHEN** a page component (e.g., Dashboard) needs to know the current route
- **THEN** it SHALL use `useLocation()` or `useParams()` from `react-router` instead of relying on `window.location`

#### Scenario: Navigation component uses route context
- **WHEN** the Navigation component determines the active page
- **THEN** it SHALL derive the active state from React Router's `<NavLink>` `isActive` callback instead of receiving a `currentPage` prop
