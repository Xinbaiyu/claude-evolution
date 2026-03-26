## Why

当前系统在 4 个不同位置重复创建 Anthropic 客户端（bot/chat、analyzers、learners、memory），每处都独立判断 CCR/API Key 模式。这导致维护成本高、行为不一致，且无法轻松扩展到 OpenAI 等其他 LLM 提供商。随着未来计划支持 OpenAI 格式 API，需要建立统一、可扩展的 LLM 客户端创建机制。

## What Changes

- 创建统一的 LLM 客户端工厂模块 `src/llm/client-factory.ts`
- 实现提供商抽象层，支持 Anthropic（Claude）和 OpenAI 兼容接口
- 重构现有 4 处客户端创建代码，统一使用工厂函数
- 支持通过配置切换提供商（CCR、Anthropic API、OpenAI API）
- 保持向后兼容，现有配置无需修改即可工作

## Capabilities

### New Capabilities

- `llm-client-factory`: 统一的 LLM 客户端工厂，根据配置创建合适的客户端实例
- `llm-provider-abstraction`: LLM 提供商抽象层，定义统一接口并支持多种实现（Anthropic、OpenAI）
- `llm-config-schema`: 扩展配置 schema 支持多提供商配置

### Modified Capabilities

<!-- 无现有 capability 的 requirements 变更 -->

## Impact

**代码变更：**
- 新增：`src/llm/client-factory.ts`（工厂）
- 新增：`src/llm/providers/`（提供商实现）
- 新增：`src/llm/types.ts`（类型定义）
- 修改：`src/bot/commands/chat.ts`（使用工厂）
- 修改：`src/analyzers/experience-extractor.ts`（使用工厂）
- 修改：`src/learners/llm-merge.ts`（使用工厂）
- 修改：`src/memory/context-merge.ts`（使用工厂）
- 修改：`src/config/schema.ts`（扩展 llm 配置）

**配置影响：**
- 向后兼容：现有 `config.llm.baseURL` 配置继续有效
- 可选扩展：支持新增 `config.llm.provider` 字段显式指定提供商

**依赖影响：**
- 可能需要添加 `openai` npm 包（按需安装）
- 保持 `@anthropic-ai/sdk` 作为核心依赖

**测试影响：**
- 需要为工厂和提供商抽象层编写单元测试
- 现有集成测试应无需修改（行为保持一致）
