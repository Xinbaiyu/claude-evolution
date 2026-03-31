## ADDED Requirements

### Requirement: Configuration Priority Levels
The system SHALL classify all configuration options into three priority levels: P0 (critical), P1 (important), and P2 (advanced).

#### Scenario: P0 configuration identification
- **WHEN** system evaluates configuration necessity
- **THEN** P0 configurations SHALL include only LLM Provider selection (activeProvider)

#### Scenario: P1 configuration identification
- **WHEN** system evaluates configuration importance
- **THEN** P1 configurations SHALL include Scheduler settings (interval, scheduleTimes) and WebUI port

#### Scenario: P2 configuration identification
- **WHEN** system evaluates configuration complexity
- **THEN** P2 configurations SHALL include LLM detailed parameters, Learning capacity tuning, Reminders, Bot integrations, and Daemon settings

### Requirement: Init wizard prompts only P0 and P1 configurations
The init command SHALL prompt users only for P0 and P1 level configurations, limiting the total number of questions to 3-5.

#### Scenario: Claude provider selection
- **WHEN** user runs init command
- **THEN** system SHALL prompt for LLM Provider choice with options: [1] Claude Official, [2] OpenAI-Compatible, [3] CCR Proxy

#### Scenario: OpenAI-Compatible provider configuration
- **WHEN** user selects OpenAI-Compatible provider
- **THEN** system SHALL prompt only for Base URL and Model name, with default values provided

#### Scenario: CCR provider configuration
- **WHEN** user selects CCR Proxy provider
- **THEN** system SHALL prompt only for Base URL with default "http://localhost:3456"

#### Scenario: Scheduler configuration
- **WHEN** user configures scheduler
- **THEN** system SHALL prompt for interval choice with options: [1] 24h, [2] 12h, [3] 6h (default), [4] Custom timepoints

#### Scenario: Timepoints configuration
- **WHEN** user selects custom timepoints mode
- **THEN** system SHALL prompt for comma-separated time values in HH:MM format, validating format and limiting to 12 timepoints

#### Scenario: WebUI port configuration
- **WHEN** user configures WebUI
- **THEN** system SHALL prompt for port number with default 10010, accepting values 1-65535

### Requirement: All prompts provide default values
Every configuration prompt SHALL provide a sensible default value that allows users to complete init by pressing Enter without manual input.

#### Scenario: Default value usage
- **WHEN** user presses Enter without input on any prompt
- **THEN** system SHALL use the default value (Claude provider, 6h scheduler, port 10010)

#### Scenario: Quick initialization
- **WHEN** user presses Enter on all 3 prompts
- **THEN** system SHALL complete initialization in under 10 seconds with fully functional defaults

### Requirement: P2 configurations delegated to WebUI
The init command SHALL NOT prompt for P2 level configurations and SHALL guide users to configure them via WebUI after initialization.

#### Scenario: Completion message with WebUI guidance
- **WHEN** init command completes successfully
- **THEN** system SHALL display a message listing available WebUI configurations at http://localhost:{port}/settings

#### Scenario: WebUI configuration categories listed
- **WHEN** completion message is displayed
- **THEN** system SHALL list: Model/Temperature tuning, Learning capacity parameters, Reminder system, Bot integrations, and Log level settings

### Requirement: Configuration merges with defaults
The init wizard SHALL merge user-provided P0/P1 configurations with DEFAULT_CONFIG for all P2 settings.

#### Scenario: Config file generation
- **WHEN** init completes
- **THEN** generated config.json SHALL contain user's P0/P1 choices merged with all DEFAULT_CONFIG P2 values

#### Scenario: Missing P1 values use defaults
- **WHEN** user skips optional P1 prompts
- **THEN** system SHALL use DEFAULT_CONFIG values (6h scheduler, 10010 port)

### Requirement: Provider-specific API key guidance
The init wizard SHALL provide provider-specific instructions for setting API keys via environment variables.

#### Scenario: Claude provider API key instruction
- **WHEN** user selects Claude provider
- **THEN** completion message SHALL instruct: "export ANTHROPIC_API_KEY=sk-ant-xxx..."

#### Scenario: OpenAI provider API key instruction
- **WHEN** user selects OpenAI-Compatible provider
- **THEN** completion message SHALL instruct: "export OPENAI_API_KEY=sk-xxx..."

#### Scenario: CCR provider setup instruction
- **WHEN** user selects CCR Proxy provider
- **THEN** completion message SHALL instruct: "Ensure claude-code-router is running" and "export ANTHROPIC_API_KEY=test-key"

### Requirement: Backward compatibility with existing configs
The init command SHALL preserve and respect existing config.json files when re-run.

#### Scenario: Re-initialization warning
- **WHEN** user runs init with existing config.json
- **THEN** system SHALL prompt "Re-initialize? (y/N)" before overwriting

#### Scenario: Cancellation preserves config
- **WHEN** user answers "N" to re-initialization prompt
- **THEN** system SHALL exit without modifying existing config.json
