## ADDED Requirements

### Requirement: Factory creates provider based on configuration

The system SHALL provide a factory function `createLLMClient(config: Config)` that automatically detects and instantiates the appropriate LLM provider based on configuration.

#### Scenario: Create Anthropic provider with CCR baseURL
- **WHEN** config contains `llm.baseURL` value
- **THEN** factory returns AnthropicProvider instance configured with the baseURL

#### Scenario: Create Anthropic provider with API key
- **WHEN** config has no `llm.baseURL` but `ANTHROPIC_API_KEY` environment variable exists
- **THEN** factory returns AnthropicProvider instance using the API key

#### Scenario: Create OpenAI provider with explicit configuration
- **WHEN** config contains `llm.provider = "openai"`
- **THEN** factory returns OpenAIProvider instance

#### Scenario: Explicit provider takes precedence
- **WHEN** config contains both `llm.provider = "openai"` and `llm.baseURL`
- **THEN** factory returns OpenAIProvider (explicit provider overrides baseURL inference)

#### Scenario: Fail when no provider can be determined
- **WHEN** config has no `llm.provider`, no `llm.baseURL`, and no relevant environment variables
- **THEN** factory throws error with message explaining configuration requirements

### Requirement: Factory supports backward compatibility

The system SHALL ensure existing configurations continue to work without modification.

#### Scenario: Legacy CCR configuration
- **WHEN** config only contains `{ llm: { baseURL: "http://127.0.0.1:3456" } }`
- **THEN** factory creates AnthropicProvider with CCR endpoint

#### Scenario: Legacy API key configuration
- **WHEN** config has no `llm.baseURL` or `llm.provider` but `ANTHROPIC_API_KEY` is set
- **THEN** factory creates AnthropicProvider with official Anthropic API

### Requirement: Factory provides singleton instances

The system SHALL cache provider instances to avoid recreating clients for the same configuration.

#### Scenario: Multiple calls with same config
- **WHEN** factory is called twice with identical configuration
- **THEN** factory returns the same provider instance (referential equality)

#### Scenario: Different configs create different instances
- **WHEN** factory is called with different `llm.provider` values
- **THEN** factory returns distinct provider instances

### Requirement: Factory validates configuration

The system SHALL validate configuration before attempting to create provider.

#### Scenario: Invalid provider name
- **WHEN** config contains `llm.provider = "invalid-provider"`
- **THEN** factory throws error listing supported providers ("anthropic", "openai")

#### Scenario: Missing required OpenAI package
- **WHEN** config specifies `llm.provider = "openai"` but `openai` npm package is not installed
- **THEN** factory throws error with installation instructions ("npm install openai")

### Requirement: Factory supports provider-specific options

The system SHALL pass provider-specific options to the appropriate provider implementation.

#### Scenario: Anthropic with custom headers
- **WHEN** config contains `llm.defaultHeaders`
- **THEN** factory passes headers to AnthropicProvider constructor

#### Scenario: Anthropic with prompt caching
- **WHEN** config contains `llm.enablePromptCaching = true`
- **THEN** factory enables prompt caching in AnthropicProvider
