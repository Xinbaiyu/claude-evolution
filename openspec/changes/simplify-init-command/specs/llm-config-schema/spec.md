## ADDED Requirements

### Requirement: Schema defines init-time vs runtime configuration fields
The LLM config schema SHALL distinguish between init-time fields (P0/P1) and runtime tuning fields (P2).

#### Scenario: Init-time P0 fields identification
- **WHEN** init wizard collects LLM configuration
- **THEN** only activeProvider field SHALL be required for initialization

#### Scenario: Init-time P1 fields for OpenAI provider
- **WHEN** user selects OpenAI-Compatible provider during init
- **THEN** baseURL and model fields SHALL be prompted as P1 configuration

#### Scenario: Init-time P1 fields for CCR provider
- **WHEN** user selects CCR Proxy provider during init
- **THEN** only baseURL field SHALL be prompted as P1 configuration

#### Scenario: Init-time skips Claude-specific fields
- **WHEN** user selects Claude provider during init
- **THEN** no additional fields SHALL be prompted (all have defaults)

#### Scenario: Runtime P2 fields delegated to WebUI
- **WHEN** init completes
- **THEN** temperature, maxTokens, enablePromptCaching, apiKey, organization, and apiVersion fields SHALL NOT be prompted and SHALL use DEFAULT_CONFIG values

### Requirement: Schema provides sensible defaults for all P2 fields
All provider-specific configuration fields not collected during init SHALL have DEFAULT_CONFIG values that allow immediate system operation.

#### Scenario: Claude provider default values
- **WHEN** user selects Claude provider with no additional configuration
- **THEN** system SHALL use defaults: model='claude-sonnet-4-6', temperature=0.3, maxTokens=4096, enablePromptCaching=true

#### Scenario: OpenAI provider default values
- **WHEN** user selects OpenAI provider with only baseURL and model
- **THEN** system SHALL use defaults: temperature=0.3, maxTokens=4096, apiKey=undefined, organization=undefined

#### Scenario: CCR provider default values
- **WHEN** user selects CCR provider with only baseURL
- **THEN** system SHALL use defaults: model='claude-sonnet-4-6', temperature=0.3, maxTokens=4096

### Requirement: Schema validation enforces init-time minimalism
Schema validation SHALL accept configurations with only P0/P1 fields provided and SHALL NOT require P2 fields during init.

#### Scenario: Minimal valid OpenAI config
- **WHEN** config contains `llm = { activeProvider: 'openai', openai: { baseURL: 'https://api.openai.com', model: 'gpt-4' } }`
- **THEN** schema validation SHALL pass with P2 fields auto-filled from defaults

#### Scenario: Minimal valid CCR config
- **WHEN** config contains `llm = { activeProvider: 'ccr', ccr: { baseURL: 'http://localhost:3456' } }`
- **THEN** schema validation SHALL pass with model and tuning fields auto-filled from defaults

#### Scenario: Minimal valid Claude config
- **WHEN** config contains `llm = { activeProvider: 'claude' }`
- **THEN** schema validation SHALL pass with all Claude fields auto-filled from defaults
