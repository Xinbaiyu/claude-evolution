## ADDED Requirements

### Requirement: Mixed tokenization for CJK and Latin text
The `calculateSimilarity` function SHALL use a hybrid tokenization strategy that supports both CJK characters (Chinese, Japanese, Korean) and Latin-based text. For CJK text, it SHALL extract character bigrams (2-character sliding window). For Latin text, it SHALL extract words using whitespace/punctuation splitting (words longer than 2 characters). For mixed text, it SHALL combine both token sets.

#### Scenario: Pure Chinese text similarity
- **WHEN** comparing two Chinese observations "优先使用中文进行技术沟通" and "使用中文进行沟通和交互"
- **THEN** the similarity score SHALL be greater than 0.3 (previously returned ~0 due to broken tokenization)

#### Scenario: Pure English text similarity preserved
- **WHEN** comparing two English observations "prefer async await over callbacks" and "always use async await instead of callbacks"
- **THEN** the similarity score SHALL be comparable to the previous implementation (no regression)

#### Scenario: Mixed CJK-Latin text
- **WHEN** comparing observations containing both Chinese and English text like "使用 TypeScript strict 模式" and "TypeScript strict 模式编码"
- **THEN** the tokenizer SHALL produce tokens from both CJK bigrams and English words, and the Jaccard similarity SHALL reflect overlap in both languages

#### Scenario: Empty or whitespace-only text
- **WHEN** either observation produces zero tokens after tokenization
- **THEN** the similarity SHALL return 0 (not throw an error)

### Requirement: Key field matching bonus
The similarity calculation SHALL include a bonus weight when observations share the same key field values. For preferences, the key field is `item.type`. For patterns, the key fields are `item.problem` substring match. For workflows, the key field is `item.name`. If key fields match, a bonus of 0.15 SHALL be added to the base Jaccard score (capped at 1.0).

#### Scenario: Same-type preference bonus
- **WHEN** two preference observations both have `item.type = "communication"` and share partial text overlap
- **THEN** the similarity score SHALL include the 0.15 bonus, making it more likely they are grouped together

#### Scenario: Different-type preference no bonus
- **WHEN** two preference observations have different `item.type` values (e.g., "tool" vs "communication")
- **THEN** no key field bonus SHALL be added; only the base Jaccard score is used

### Requirement: Type gate preserved
The similarity function SHALL continue to return 0 immediately if the two observations have different top-level types (preference vs pattern vs workflow). This gate SHALL NOT be removed or weakened.

#### Scenario: Cross-type comparison
- **WHEN** comparing a preference observation with a pattern observation
- **THEN** the similarity SHALL be exactly 0 regardless of text content
