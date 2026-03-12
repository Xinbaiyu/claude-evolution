## ADDED Requirements

### Requirement: Safe initialization with existing configuration protection

The system SHALL detect and safely handle existing CLAUDE.md configuration during initialization, providing multiple options to prevent data loss.

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

### Requirement: Configuration switching and rollback

The system SHALL provide safe switching between original and evolved configurations with full rollback support.

#### Scenario: Check current status
- **WHEN** user runs `claude-evolution status`
- **THEN** the system displays:
  - Current mode (original, independent, or switched)
  - Path to active CLAUDE.md
  - Path to backup files
  - Available actions

#### Scenario: Compare configurations
- **WHEN** user runs `claude-evolution diff`
- **THEN** the system displays a diff between `~/.claude/CLAUDE.md` and `~/.claude-evolution/output/CLAUDE.md`

#### Scenario: Enable evolved configuration
- **WHEN** user runs `claude-evolution switch --enable` in independent mode
- **THEN** the system SHALL:
  - Create a backup of current `~/.claude/CLAUDE.md`
  - Remove the existing CLAUDE.md
  - Create a symlink from `~/.claude/CLAUDE.md` to `~/.claude-evolution/output/CLAUDE.md`
  - Log the operation with timestamp
  - Display success message with rollback instructions

#### Scenario: Disable evolved configuration
- **WHEN** user runs `claude-evolution switch --disable` in switched mode
- **THEN** the system SHALL:
  - Remove the symlink at `~/.claude/CLAUDE.md`
  - Restore the original CLAUDE.md from backup
  - Log the operation with timestamp
  - Display success message confirming restoration

#### Scenario: Rollback to original
- **WHEN** user runs `claude-evolution rollback --to-original`
- **THEN** the system SHALL:
  - Restore the initial backup created during installation
  - Remove any symlinks
  - Display confirmation of restoration

#### Scenario: List available backups
- **WHEN** user runs `claude-evolution rollback --list`
- **THEN** the system displays all available backup files with dates and sizes

### Requirement: Operation logging and auditability

The system SHALL maintain a comprehensive log of all configuration modifications for transparency and debugging.

#### Scenario: Log all file operations
- **WHEN** any file operation occurs (backup, switch, restore, delete)
- **THEN** the system SHALL append an entry to `~/.claude-evolution/operations.log` with:
  - Timestamp
  - Operation type
  - Files affected
  - User who initiated
  - Success or failure status

#### Scenario: View operation history
- **WHEN** user runs `claude-evolution operations`
- **THEN** the system displays recent file operations in chronological order

### Requirement: Display evolution history

The system SHALL provide a command to view all learning events and configuration changes.

#### Scenario: List recent changes
- **WHEN** user runs `claude-evolution history`
- **THEN** the system displays a table of recent learning events with timestamps, types, and confidence scores

#### Scenario: View specific change details
- **WHEN** user runs `claude-evolution history --id <id>`
- **THEN** the system shows full details including extracted data, applied changes, and rollback command

#### Scenario: Filter by type
- **WHEN** user runs `claude-evolution history --type preference`
- **THEN** the system shows only preference-learning events

### Requirement: Allow manual review and approval

The system SHALL provide commands for users to review and approve pending suggestions.

#### Scenario: Review pending suggestions
- **WHEN** user runs `claude-evolution review`
- **THEN** the system displays all pending (unapproved) suggestions with confidence scores

#### Scenario: Approve suggestion
- **WHEN** user runs `claude-evolution approve <id>`
- **THEN** the system applies the suggestion and regenerates CLAUDE.md

#### Scenario: Reject suggestion
- **WHEN** user runs `claude-evolution reject <id>`
- **THEN** the system marks suggestion as rejected and excludes from future consideration
