# llm-config-schema Specification

## Purpose
TBD - created by archiving change unified-llm-client-factory. Update Purpose after archive.
## Requirements
### Requirement: Schema supports provider field

The system SHALL extend `LLMConfig` schema to include optional `provider` field.

#### Scenario: Provider field accepts valid values
- **WHEN** config contains `llm.provider = "anthropic"` or `"openai"`
- **THEN** schema validation passes

#### Scenario: Provider field rejects invalid values
- **WHEN** config contains `llm.provider = "invalid"`
- **THEN** schema validation fails with error listing valid providers

#### Scenario: Provider field is optional
- **WHEN** config omits `llm.provider` field
- **THEN** schema validation passes (backward compatible)

### Requirement: Schema retains existing fields

The system SHALL preserve all existing `LLMConfig` fields without breaking changes.

#### Scenario: Legacy baseURL field works
- **WHEN** config contains `llm.baseURL = "http://127.0.0.1:3456"`
- **THEN** schema validation passes

#### Scenario: Required fields remain required
- **WHEN** config omits `llm.model`
- **THEN** schema validation fails

#### Scenario: Optional fields remain optional
- **WHEN** config omits `llm.defaultHeaders`
- **THEN** schema validation passes

### Requirement: Schema validates provider-specific constraints

The system SHALL enforce provider-specific validation rules.

#### Scenario: OpenAI requires model from GPT family
- **WHEN** config has `llm.provider = "openai"` and `llm.model = "claude-3-5-sonnet"`
- **THEN** schema validation warns (non-fatal) about model mismatch

#### Scenario: Anthropic supports prompt caching
- **WHEN** config has `llm.provider = "anthropic"` and `llm.enablePromptCaching = true`
- **THEN** schema validation passes

#### Scenario: OpenAI ignores prompt caching
- **WHEN** config has `llm.provider = "openai"` and `llm.enablePromptCaching = true`
- **THEN** schema validation logs warning about unsupported feature

### Requirement: Schema supports provider-specific options

The system SHALL allow providers to define custom configuration fields.

#### Scenario: Anthropic-specific options
- **WHEN** config contains `llm.anthropic = { apiVersion: "2024-01" }`
- **THEN** schema validation passes and options are passed to AnthropicProvider

#### Scenario: OpenAI-specific options
- **WHEN** config contains `llm.openai = { organization: "org-xxx" }`
- **THEN** schema validation passes and options are passed to OpenAIProvider

#### Scenario: Unknown provider options ignored
- **WHEN** config contains `llm.azure = { endpoint: "..." }` but no Azure provider exists
- **THEN** schema validation logs warning and ignores the field

### Requirement: Schema provides migration helpers

The system SHALL include validation helpers to guide users in config migration.

#### Scenario: Detect ambiguous configuration
- **WHEN** config contains both `llm.baseURL` and `llm.provider = "openai"`
- **THEN** schema validation warns about conflicting settings and explains precedence

#### Scenario: Suggest explicit provider
- **WHEN** config relies on environment variable detection (no `llm.provider` or `llm.baseURL`)
- **THEN** schema validation suggests adding explicit `llm.provider` for clarity

### Requirement: Schema generates TypeScript types

The system SHALL export TypeScript types for all configuration fields.

#### Scenario: Provider enum type
- **WHEN** TypeScript code imports `LLMProvider` type
- **THEN** type is defined as `"anthropic" | "openai"`

#### Scenario: Config type includes all fields
- **WHEN** TypeScript code imports `LLMConfig` type
- **THEN** type includes `provider`, `model`, `baseURL`, etc. with correct optionality

#### Scenario: Provider-specific config types
- **WHEN** TypeScript code imports `AnthropicProviderConfig` type
- **THEN** type includes Anthropic-specific fields like `enablePromptCaching`

