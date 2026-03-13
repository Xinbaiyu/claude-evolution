## MODIFIED Requirements

### Requirement: Display system status
The system SHALL display comprehensive system status including daemon information.

#### Scenario: Status includes daemon info
- **WHEN** user runs `claude-evolution status`
- **THEN** output includes daemon process status section
- **AND** shows PID and uptime if running
- **AND** shows "未运行" if not running
- **AND** includes Web UI section with URL
- **AND** includes scheduler section with last/next execution times
- **AND** retains existing suggestions statistics section

#### Scenario: Status when daemon running
- **WHEN** daemon is running
- **AND** user runs `claude-evolution status`
- **THEN** displays "✓ 运行中 (PID: 12345, 运行时长: 2h 15m)"
- **AND** displays "✓ http://localhost:10010" under Web UI section
- **AND** displays scheduler next execution time

#### Scenario: Status when daemon not running
- **WHEN** daemon is not running
- **AND** user runs `claude-evolution status`
- **THEN** displays "❌ 守护进程未运行"
- **AND** suggests running `claude-evolution start`
- **AND** retains suggestions statistics display
