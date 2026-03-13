## ADDED Requirements

### Requirement: Daemon commands in CLI
The system SHALL register all daemon-related commands in the CLI.

#### Scenario: Commands available
- **WHEN** user runs `claude-evolution --help`
- **THEN** help text includes start command
- **AND** includes stop command
- **AND** includes restart command
- **AND** includes logs command
- **AND** includes install command
- **AND** includes uninstall command

### Requirement: Command options
The system SHALL support options for daemon commands.

#### Scenario: Start command options
- **WHEN** user views `claude-evolution start --help`
- **THEN** shows `-d, --daemon` option
- **AND** shows `-p, --port <port>` option
- **AND** shows `--no-scheduler` option
- **AND** shows `--no-web` option

#### Scenario: Logs command options
- **WHEN** user views `claude-evolution logs --help`
- **THEN** shows `-f, --follow` option
- **AND** shows `-n, --lines <num>` option
- **AND** shows `--level <level>` option
