# experience-extractor Specification

## Purpose
TBD - created by archiving change claude-code-evolution-system. Update Purpose after archive.
## Requirements
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

## 修改需求

### 需求：经验提取批次并行化

`extractExperience()` 函数必须使用有限并发并行处理各观察批次，替代当前的串行 `for` 循环。最大并发数为 3，使用共享的 `pMapLimited` 工具函数。

#### 场景：多批次并行提取
- **当** `extractExperience()` 接收 40 条观察（分为 4 批，每批 10 条）
- **则** 系统必须以最大并发数 3 并行处理这 4 批，而非串行逐批处理

#### 场景：单批次无并发开销
- **当** `extractExperience()` 接收 8 条观察（仅 1 批）
- **则** 系统必须直接处理该批次，无并发调度开销

#### 场景：空观察列表
- **当** `extractExperience()` 接收 0 条观察
- **则** 系统必须立即返回空结果，不进行任何 LLM 调用

### 需求：保留按批错误隔离

并行化后，单个批次的 LLM 调用失败不得影响其他批次的处理。失败的批次必须被跳过，成功的批次结果正常合并。

#### 场景：部分批次失败
- **当** 4 个批次中的第 2 批 LLM 调用失败
- **则** 第 1、3、4 批的结果必须正常合并返回，第 2 批被跳过并记录错误日志

#### 场景：所有批次失败
- **当** 所有批次的 LLM 调用都失败
- **则** 系统必须返回空的提取结果（preferences: [], patterns: [], workflows: []）

### 需求：外部函数签名保持不变

`extractExperience()` 函数必须保持其当前的参数签名和返回类型。并行化是内部实现细节。

#### 场景：调用方不受影响
- **当** `pipeline.ts` 调用 `extractExperience(observations, config, promptsContext)`
- **则** 调用必须以相同的参数成功执行，并返回相同的 `ExtractionResult` 类型
