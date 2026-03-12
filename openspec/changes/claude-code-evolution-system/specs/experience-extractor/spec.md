## ADDED Requirements

### Requirement: Extract user preferences from sessions

The system SHALL use LLM analysis to identify explicit and implicit user preferences from session data.

#### Scenario: Explicit preference extraction
- **WHEN** user says "I prefer concise responses" in a session
- **THEN** the system extracts { type: "style", preference: "concise responses", confidence: 0.9 }

#### Scenario: Implicit preference detection
- **WHEN** user consistently chooses pnpm over npm in multiple sessions
- **THEN** the system infers { type: "tool", preference: "pnpm", confidence: 0.7 }

#### Scenario: Preference frequency tracking
- **WHEN** a preference is observed in 3+ sessions
- **THEN** the system increases confidence score by 0.1 per occurrence (max 0.95)

### Requirement: Identify repeated problem-solution patterns

The system SHALL detect problems that appear multiple times and their corresponding solutions.

#### Scenario: Repeated error pattern
- **WHEN** "TypeScript type error with date parsing" appears in 3+ sessions
- **THEN** the system groups these as a single pattern with the most effective solution

#### Scenario: Solution effectiveness scoring
- **WHEN** analyzing multiple solutions for the same problem
- **THEN** the system ranks solutions by:
  - Success rate (did it resolve the issue?)
  - Reuse frequency (how often was it applied?)
  - User satisfaction (explicit positive feedback)

#### Scenario: Pattern evolution tracking
- **WHEN** a better solution is found for an existing problem
- **THEN** the system updates the pattern with the new solution and marks the old one as deprecated

### Requirement: Discover workflow patterns

The system SHALL identify recurring multi-step workflows that could be automated.

#### Scenario: Command sequence detection
- **WHEN** user executes "git add . && git commit -m 'msg' && git push" pattern 5+ times
- **THEN** the system identifies this as a candidate workflow skill

#### Scenario: Conditional workflow detection
- **WHEN** user follows pattern "run tests → if pass, commit → if fail, debug"
- **THEN** the system maps this as a conditional workflow with branching logic

#### Scenario: Workflow context awareness
- **WHEN** analyzing workflows
- **THEN** the system captures context (project type, file types, tools used)

### Requirement: Generate structured output with confidence scores

The system SHALL output extraction results in a structured JSON format with confidence scores.

#### Scenario: JSON schema validation
- **WHEN** extraction completes
- **THEN** output MUST conform to the defined schema:
  ```json
  {
    "preferences": [
      { "type": string, "value": string, "confidence": number, "frequency": number }
    ],
    "patterns": [
      { "problem": string, "solution": string, "confidence": number, "occurrences": number }
    ],
    "workflows": [
      { "name": string, "steps": string[], "context": object, "confidence": number }
    ]
  }
  ```

#### Scenario: Confidence threshold filtering
- **WHEN** generating output
- **THEN** only include items with confidence >= 0.5 (configurable)

#### Scenario: Metadata inclusion
- **WHEN** outputting extraction results
- **THEN** include metadata: timestamp, session count analyzed, LLM model used, token consumption

### Requirement: Use token-efficient prompting strategies

The system SHALL minimize LLM token usage through efficient prompting techniques.

#### Scenario: Batch processing
- **WHEN** analyzing multiple sessions
- **THEN** the system batches up to 10 sessions per LLM call

#### Scenario: Incremental analysis
- **WHEN** a session has been previously analyzed
- **THEN** the system only analyzes new content since last analysis

#### Scenario: Model selection
- **WHEN** performing extraction
- **THEN** the system uses Claude Haiku by default for cost efficiency

#### Scenario: Prompt caching
- **WHEN** system prompt is reused across multiple extractions
- **THEN** utilize Claude's prompt caching to reduce costs by ~90%

### Requirement: Handle extraction errors and edge cases

The system SHALL gracefully handle errors during LLM extraction.

#### Scenario: Invalid JSON response
- **WHEN** LLM returns malformed JSON
- **THEN** the system logs the error, retries once with explicit JSON format instruction, and returns empty result if still fails

#### Scenario: API timeout
- **WHEN** LLM API call times out after 30 seconds
- **THEN** the system logs timeout, marks extraction as incomplete, and schedules retry

#### Scenario: Low confidence results
- **WHEN** all extracted items have confidence < 0.5
- **THEN** the system logs "No high-confidence patterns found" and does not persist results
