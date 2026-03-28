## Why

确保 LLM Provider 配置功能完整可用，验证三种提供商模式（Claude Official API、OpenAI-Compatible API、CCR Proxy）的配置、切换、保存和运行时行为都符合预期。避免配置错误导致的运行时故障。

## What Changes

- 创建完整的 LLM Provider 配置验证测试用例
- 验证三种 provider 模式的 UI 交互和配置保存
- 验证 Model 字段的自由输入和历史记录功能
- 验证 provider 切换时的 model 值保留逻辑
- 验证各 provider 的运行时 LLM 调用功能
- 验证配置的持久化和加载

## Capabilities

### New Capabilities
- `llm-provider-verification`: 全面验证 LLM Provider 配置的 UI 交互、数据持久化、provider 切换逻辑和运行时调用功能

### Modified Capabilities
<!-- No existing capabilities are being modified -->

## Impact

- 不影响现有功能代码
- 添加验证测试用例和步骤文档
- 可能发现并修复潜在的配置或交互问题
