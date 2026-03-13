## ADDED Requirements

### Requirement: Daemon configuration
The system SHALL support daemon-specific configuration in config.json.

#### Scenario: Default daemon config
- **WHEN** user initializes new config
- **THEN** config includes daemon section with enabled: true
- **AND** includes pidFile path
- **AND** includes logFile path
- **AND** includes logLevel: "info"
- **AND** includes logRotation settings

### Requirement: Web UI configuration
The system SHALL support Web UI-specific configuration.

#### Scenario: Default webUI config
- **WHEN** user initializes new config
- **THEN** config includes webUI section with enabled: true
- **AND** includes port: 10010
- **AND** includes host: "127.0.0.1"
- **AND** includes autoOpenBrowser: false

### Requirement: Backward compatibility
The system SHALL support existing configurations without daemon/webUI sections.

#### Scenario: Migrate old config
- **WHEN** daemon reads config without daemon section
- **THEN** system adds default daemon configuration
- **AND** adds default webUI configuration
- **AND** preserves all existing settings
- **AND** writes updated config to disk
