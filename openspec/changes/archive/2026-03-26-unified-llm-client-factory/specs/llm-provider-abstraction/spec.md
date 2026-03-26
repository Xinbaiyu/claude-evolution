## ADDED Requirements

### Requirement: Provider implements unified interface

The system SHALL define a `LLMProvider` interface that all provider implementations MUST implement.

#### Scenario: Provider has createCompletion method
- **WHEN** any provider is instantiated
- **THEN** provider exposes `createCompletion(params: LLMCompletionParams): Promise<LLMCompletionResponse>` method

#### Scenario: Provider exposes name
- **WHEN** provider is instantiated
- **THEN** provider exposes readonly `providerName: string` property

### Requirement: Anthropic provider wraps Anthropic SDK

The system SHALL provide `AnthropicProvider` that adapts Anthropic SDK to the unified interface.

#### Scenario: Create completion with Anthropic
- **WHEN** `createCompletion()` is called with messages array
- **THEN** provider calls `client.messages.create()` with correct parameters

#### Scenario: Support CCR mode with dummy API key
- **WHEN** AnthropicProvider is initialized with `baseURL` but empty `apiKey`
- **THEN** provider uses "dummy-key-for-local-proxy" and sets baseURL

#### Scenario: Transform response format
- **WHEN** Anthropic API returns response with `content` array
- **THEN** provider extracts first text block and returns as `content: string`

#### Scenario: Include usage statistics
- **WHEN** Anthropic API returns usage information
- **THEN** provider transforms `input_tokens`/`output_tokens` to `inputTokens`/`outputTokens`

### Requirement: OpenAI provider wraps OpenAI SDK

The system SHALL provide `OpenAIProvider` that adapts OpenAI SDK to the unified interface.

#### Scenario: Create completion with OpenAI
- **WHEN** `createCompletion()` is called with messages array
- **THEN** provider calls `client.chat.completions.create()` with correct parameters

#### Scenario: Inject system prompt as first message
- **WHEN** `createCompletion()` is called with `systemPrompt` parameter
- **THEN** provider prepends `{ role: "system", content: systemPrompt }` to messages array

#### Scenario: Transform response format
- **WHEN** OpenAI API returns response with `choices[0].message.content`
- **THEN** provider extracts content and returns as `content: string`

#### Scenario: Handle missing usage data
- **WHEN** OpenAI API response lacks `usage` field
- **THEN** provider returns `{ inputTokens: 0, outputTokens: 0 }`

### Requirement: Provider handles errors gracefully

The system SHALL ensure providers throw meaningful errors with context.

#### Scenario: Anthropic API authentication failure
- **WHEN** Anthropic API returns 401 authentication error
- **THEN** provider throws error mentioning CCR connection or API key validity

#### Scenario: OpenAI API rate limit
- **WHEN** OpenAI API returns 429 rate limit error
- **THEN** provider throws error preserving original rate limit message

#### Scenario: Network timeout
- **WHEN** API request times out
- **THEN** provider throws error indicating timeout and provider name

### Requirement: Provider supports streaming responses

The system SHALL allow providers to optionally support streaming mode.

#### Scenario: Anthropic streaming
- **WHEN** `createCompletion()` is called with `stream: true` on AnthropicProvider
- **THEN** provider returns async generator yielding text chunks

#### Scenario: OpenAI streaming
- **WHEN** `createCompletion()` is called with `stream: true` on OpenAIProvider
- **THEN** provider returns async generator yielding delta content

#### Scenario: Non-streaming fallback
- **WHEN** `createCompletion()` is called without `stream` parameter
- **THEN** provider returns complete response in single promise

### Requirement: Provider supports model-specific features

The system SHALL allow providers to expose provider-specific capabilities.

#### Scenario: Anthropic prompt caching
- **WHEN** AnthropicProvider is created with `enablePromptCaching: true`
- **THEN** provider includes `cache_control` metadata in API calls

#### Scenario: OpenAI function calling
- **WHEN** OpenAIProvider receives `tools` parameter
- **THEN** provider passes `tools` array to OpenAI API

#### Scenario: Feature not supported error
- **WHEN** provider receives unsupported feature flag
- **THEN** provider logs warning and ignores the flag
