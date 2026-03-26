## 1. 基础设施搭建

- [x] 1.1 创建 `src/llm/` 目录结构
- [x] 1.2 定义 `src/llm/types.ts` 中的接口（`LLMProvider`, `LLMCompletionParams`, `LLMCompletionResponse`）
- [x] 1.3 实现 `src/llm/client-factory.ts` 工厂函数骨架（仅返回 null）
- [x] 1.4 创建 `src/llm/providers/` 目录

## 2. Anthropic 提供商实现

- [x] 2.1 实现 `src/llm/providers/anthropic.ts` 中的 `AnthropicProvider` 类
- [x] 2.2 实现 `createCompletion()` 方法，适配 Anthropic SDK
- [x] 2.3 支持 CCR 模式（baseURL + dummy API key）
- [x] 2.4 支持 API Key 模式（官方 Anthropic API）
- [x] 2.5 转换 Anthropic 响应格式到统一接口
- [x] 2.6 添加 usage 统计信息转换（`input_tokens` → `inputTokens`）

## 3. 工厂函数实现

- [x] 3.1 实现自动检测逻辑（baseURL → Anthropic, env → provider）
- [x] 3.2 支持显式 `config.llm.provider` 字段
- [x] 3.3 实现单例缓存逻辑（相同配置返回同一实例）
- [x] 3.4 添加配置验证（无效 provider、缺少依赖等）
- [x] 3.5 添加错误提示（缺少配置、包未安装等）

## 4. 配置 Schema 扩展

- [x] 4.1 在 `src/config/schema.ts` 中添加 `llm.provider` 字段（可选）
- [x] 4.2 添加 `llm.provider` 的枚举验证（"anthropic" | "openai"）
- [x] 4.3 保持所有现有字段向后兼容
- [x] 4.4 添加 provider-specific 配置字段（`llm.anthropic`, `llm.openai`）
- [x] 4.5 导出 TypeScript 类型定义

## 5. 单元测试

- [x] 5.1 为 `AnthropicProvider` 编写单元测试
- [x] 5.2 为 `createLLMClient()` 工厂函数编写测试
- [x] 5.3 测试自动检测逻辑（baseURL、env、explicit provider）
- [x] 5.4 测试错误场景（无效配置、缺少依赖）
- [x] 5.5 测试单例缓存行为
- [x] 5.6 验证测试覆盖率 ≥ 80%

## 6. 迁移现有代码 - chat.ts

- [x] 6.1 在 `src/bot/commands/chat.ts` 中导入 `createLLMClient`
- [x] 6.2 替换 `new Anthropic()` 为 `await createLLMClient(config)`
- [x] 6.3 替换 `client.messages.create()` 为 `client.createCompletion()`
- [x] 6.4 调整参数格式到统一接口
- [x] 6.5 测试钉钉机器人对话功能（CCR 和 API Key 两种模式）

## 7. 迁移现有代码 - experience-extractor.ts

- [x] 7.1 在 `src/analyzers/experience-extractor.ts` 中导入 `createLLMClient`
- [x] 7.2 替换客户端创建逻辑
- [x] 7.3 替换 API 调用为 `createCompletion()`
- [x] 7.4 保持现有错误处理逻辑
- [x] 7.5 运行经验提取测试验证功能正常

## 8. 迁移现有代码 - llm-merge.ts

- [x] 8.1 在 `src/learners/llm-merge.ts` 中导入 `createLLMClient`
- [x] 8.2 修改 `mergeLLM()` 函数接受 `Config` 而非独立参数
- [x] 8.3 替换客户端创建逻辑
- [x] 8.4 替换所有 `anthropic.messages.create()` 调用
- [x] 8.5 运行 LLM merge 测试验证合并逻辑正常

## 9. 迁移现有代码 - context-merge.ts

- [x] 9.1 在 `src/memory/context-merge.ts` 中导入 `createLLMClient`
- [x] 9.2 修改 `mergeContextPool()` 函数接受 `Config`
- [x] 9.3 替换客户端创建逻辑
- [x] 9.4 替换 API 调用
- [x] 9.5 运行上下文合并测试验证功能正常

## 10. 更新调用方

- [x] 10.1 更新 `src/memory/learning-orchestrator.ts` 中的 `mergeLLM()` 调用传递完整 config
- [x] 10.2 更新 `mergeContextPool()` 调用传递完整 config
- [x] 10.3 移除手动传递 `apiKey`/`baseURL` 的代码
- [x] 10.4 运行完整测试套件验证无回归

## 11. 集成测试

- [x] 11.1 在测试环境测试 CCR 模式（baseURL 配置）
- [x] 11.2 在测试环境测试 API Key 模式（ANTHROPIC_API_KEY）
- [x] 11.3 测试 4 个迁移模块的端到端流程
- [x] 11.4 验证错误提示清晰可理解
- [x] 11.5 运行完整测试套件（`npm test`）

## 12. OpenAI 提供商实现（可选）

- [x] 12.1 添加 `openai` 到 `package.json` 的 optionalDependencies
- [x] 12.2 实现 `src/llm/providers/openai.ts` 中的 `OpenAIProvider` 类
- [x] 12.3 实现 `createCompletion()` 方法，适配 OpenAI SDK
- [x] 12.4 处理 systemPrompt 注入（作为 messages[0]）
- [x] 12.5 转换 OpenAI 响应格式到统一接口
- [x] 12.6 实现动态 import 逻辑（包不存在时报错）
- [x] 12.7 在工厂函数中添加 OpenAI provider 分支
- [x] 12.8 为 `OpenAIProvider` 编写单元测试
- [x] 12.9 添加配置示例到文档

## 13. 文档和清理

- [x] 13.1 更新 `docs/ARCHITECTURE.md` 说明新的 LLM 客户端架构
- [x] 13.2 添加配置文档说明 `llm.provider` 字段
- [x] 13.3 添加迁移指南（如何从旧配置迁移）
- [x] 13.4 添加扩展指南（如何添加新 provider）
- [x] 13.5 删除迁移代码中的旧代码注释
- [x] 13.6 运行 TypeScript 编译检查（`npm run build`）
- [x] 13.7 更新 CHANGELOG.md 记录此次变更
