## ADDED Requirements

### Requirement: UI displays generic OpenAI-compatible provider name
The UI SHALL display "OpenAI-Compatible API" or similar generic naming instead of "OpenAI" to accurately convey that this option supports all OpenAI-format API services.

#### Scenario: Provider card displays correct label
- **WHEN** user views the LLM Provider configuration page
- **THEN** the OpenAI-compatible provider card displays title "OpenAI-Compatible API"
- **AND** the subtitle indicates "API" or "Compatible API"

#### Scenario: Info box describes compatibility
- **WHEN** user selects the OpenAI-compatible provider
- **THEN** the info box text explains that this mode supports OpenAI, Azure OpenAI, and other compatible services
- **AND** does not imply the option is limited to OpenAI official API

### Requirement: BaseURL configuration field
The UI SHALL provide a baseURL input field for OpenAI-compatible provider, allowing users to specify custom API endpoints.

#### Scenario: BaseURL field displays with default value
- **WHEN** user selects the OpenAI-compatible provider
- **THEN** a baseURL input field is displayed
- **AND** the field has placeholder or default value `https://api.openai.com`
- **AND** the field is optional (user can leave empty to use default)

#### Scenario: User enters custom baseURL
- **WHEN** user enters a custom baseURL like `http://localhost:11434` or `https://api.azure.com`
- **THEN** the configuration saves the custom baseURL
- **AND** the OpenAI provider uses this baseURL for API calls

#### Scenario: BaseURL field shows help text
- **WHEN** user views the baseURL input field
- **THEN** helper text indicates this is for custom API endpoints
- **AND** examples mention Azure OpenAI, local services, or proxy services

### Requirement: API Key configuration field
The UI SHALL provide an API Key input field for OpenAI-compatible provider, allowing users to configure the API key directly in the UI.

#### Scenario: API Key field is displayed
- **WHEN** user selects the OpenAI-compatible provider
- **THEN** an API Key input field is displayed
- **AND** the field is marked as optional

#### Scenario: API Key field shows environment variable fallback hint
- **WHEN** user views the API Key input field
- **THEN** helper text indicates that if left empty, the system will use `OPENAI_API_KEY` environment variable
- **AND** the field type is password (masked input)

#### Scenario: User enters API Key in UI
- **WHEN** user enters an API Key in the input field
- **THEN** the configuration saves the API key
- **AND** this key is used instead of the environment variable

### Requirement: Config schema supports OpenAI API Key
The config schema SHALL include an `openai.apiKey` field under `llm` configuration.

#### Scenario: Schema validates API Key field
- **WHEN** config includes `llm.openai.apiKey` field
- **THEN** schema validation passes
- **AND** the field accepts string values or null

#### Scenario: API Key is optional in schema
- **WHEN** config omits `llm.openai.apiKey` field
- **THEN** schema validation passes (field is optional)

### Requirement: OpenAI Provider reads API Key from config
The OpenAI Provider SHALL prioritize reading API Key from config over environment variable.

#### Scenario: API Key from config takes precedence
- **WHEN** both `config.llm.openai.apiKey` and `OPENAI_API_KEY` environment variable are set
- **THEN** the provider uses `config.llm.openai.apiKey`

#### Scenario: Fallback to environment variable
- **WHEN** `config.llm.openai.apiKey` is null or undefined
- **AND** `OPENAI_API_KEY` environment variable is set
- **THEN** the provider uses the environment variable

#### Scenario: Error when no API Key available
- **WHEN** both `config.llm.openai.apiKey` and `OPENAI_API_KEY` are missing
- **THEN** the provider throws an error with a helpful message
- **AND** the message indicates the user should set API key in UI or environment variable

### Requirement: OpenAI Provider respects baseURL from config
The OpenAI Provider SHALL use `config.llm.baseURL` if provided, falling back to default OpenAI endpoint.

#### Scenario: Custom baseURL is used
- **WHEN** `config.llm.baseURL` is set to a custom value
- **THEN** the provider sends API requests to that custom endpoint
- **AND** the baseURL is passed to the OpenAI client constructor

#### Scenario: Default baseURL when not specified
- **WHEN** `config.llm.baseURL` is null or undefined
- **THEN** the provider uses the default OpenAI endpoint `https://api.openai.com`
