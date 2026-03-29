## Why

Experience extraction（经验提取）功能当前硬编码为只支持 Anthropic Provider，导致使用 OpenAI-Compatible API 或 CCR Proxy 的用户无法使用自动分析功能。用户报告称"原来 CCR 是好使的"，说明这可能是最近引入的回归问题。需要调查根本原因，并修复以支持所有 LLM provider。

## What Changes

1. **调查历史变更** - 查找 git 历史中何时引入了 Anthropic provider 的硬编码检查，分析为什么做了这个限制
2. **移除硬编码限制** - 去除 `experience-extractor.ts` 中只允许 AnthropicProvider 的检查
3. **适配 OpenAI Provider** - 调整 prompt 和 API 调用以兼容 OpenAI Chat Completions API 格式
4. **适配 CCR Provider** - 确保 CCR Proxy（实际是 Anthropic API 的代理）能正常工作
5. **优化策略调整** - 评估 prompt caching 缺失的影响，为非 Anthropic provider 提供替代优化方案
6. **添加回归测试** - 确保三个 provider 都能正常执行 experience extraction

## Capabilities

### New Capabilities
- `multi-provider-experience-extraction`: Experience extraction 功能支持所有 LLM provider（Claude、OpenAI、CCR），而非仅限 Anthropic

### Modified Capabilities
- `experience-extraction`: 移除 Anthropic provider 限制，扩展为 provider-agnostic 实现

## Impact

**受影响的代码**:
- `src/analyzers/experience-extractor.ts` - 核心提取逻辑，需要移除 provider 检查和适配不同 API 格式
- `src/analyzers/prompts.ts` - 可能需要调整 prompt 格式以兼容不同 provider
- `src/llm/providers/*.ts` - 可能需要统一不同 provider 的 API 接口
- 测试文件 - 需要添加对三个 provider 的测试覆盖

**影响的功能**:
- 自动定时分析任务（当前使用非 Anthropic provider 时会失败）
- 手动触发分析（Web UI 和 CLI 的 analyze 命令）

**API 兼容性**:
- Anthropic API: 保持完全兼容，继续使用 prompt caching 优化
- OpenAI-Compatible API: 需要适配 Chat Completions format，但会失去 prompt caching
- CCR Proxy: 本质是 Anthropic API 的代理，应该能继承 prompt caching 支持

**成本影响**:
- OpenAI provider: 失去 prompt caching 可能导致每次分析的 token 成本增加（需要在设计阶段评估）
- CCR provider: 如果能正确路由到 Anthropic API，应该能保持 prompt caching 优化

**历史调查重点**:
- 查找引入 `instanceof AnthropicProvider` 检查的 commit
- 分析该限制的原始动机（技术限制 vs 未完成的适配）
- 确认用户报告的"原来 CCR 是好使的"是否属实，以及何时失效
