## ADDED Requirements

### Requirement: Install auto-start on macOS
The system SHALL provide an `install` command that configures macOS LaunchAgent.

#### Scenario: Install LaunchAgent
- **WHEN** user runs `claude-evolution install` on macOS
- **THEN** system creates plist file at `~/Library/LaunchAgents/com.claude-evolution.plist`
- **AND** registers with launchctl
- **AND** displays success message with instructions

#### Scenario: Enable immediate start
- **WHEN** user runs `claude-evolution install --enable`
- **THEN** system installs LaunchAgent
- **AND** starts daemon immediately via launchctl

#### Scenario: Prevent duplicate installation
- **WHEN** LaunchAgent is already installed
- **AND** user runs `claude-evolution install`
- **THEN** system displays warning "已安装自启动配置"
- **AND** suggests running `uninstall` first

### Requirement: Uninstall auto-start
The system SHALL provide an `uninstall` command that removes auto-start configuration.

#### Scenario: Uninstall LaunchAgent
- **WHEN** user runs `claude-evolution uninstall`
- **AND** LaunchAgent is installed
- **THEN** system stops running daemon
- **AND** unloads LaunchAgent via launchctl
- **AND** deletes plist file
- **AND** displays "自启动已移除"

### Requirement: Auto-start on boot
The system SHALL automatically start daemon when user logs in (if installed).

#### Scenario: Start on user login
- **WHEN** user logs into macOS
- **AND** LaunchAgent is installed
- **THEN** launchd automatically starts daemon
- **AND** daemon runs in background

#### Scenario: Auto-restart on crash
- **WHEN** daemon process crashes unexpectedly
- **AND** LaunchAgent KeepAlive is enabled
- **THEN** launchd automatically restarts daemon
- **AND** logs crash information
