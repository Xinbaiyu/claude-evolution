## 1. 扩展 LLMProvider 接口

- [ ] 1.1 在 src/llm/types.ts 中添加 extractExperience() 方法签名
- [ ] 1.2 在 src/llm/types.ts 中添加 supportsPromptCaching() 方法签名
- [ ] 1.3 在 AnthropicProvider 中实现 extractExperience() 方法（保持现有逻辑）
- [ ] 1.4 在 AnthropicProvider 中实现 supportsPromptCaching() 方法（返回 true）
- [ ] 1.5 在 OpenAIProvider 中实现 extractExperience() 方法（适配 Chat Completions 格式）
- [ ] 1.6 在 OpenAIProvider 中实现 supportsPromptCaching() 方法（返回 false）

## 2. 修复 CCR Provider 路由

- [ ] 2.1 在 src/llm/client-factory.ts 中修改 CCR provider 创建逻辑
- [ ] 2.2 当 activeProvider === 'ccr' 时创建 AnthropicProvider 实例
- [ ] 2.3 使用 config.llm.ccr.baseURL 作为 AnthropicProvider 的 baseURL
- [ ] 2.4 添加代码注释说明 CCR 是 Anthropic API 的代理

## 3. 移除硬编码 Anthropic 检查

- [ ] 3.1 在 src/analyzers/experience-extractor.ts 中移除 instanceof AnthropicProvider 检查
- [ ] 3.2 改为调用 llmProvider.extractExperience() 统一接口
- [ ] 3.3 添加 prompt caching 警告逻辑（针对不支持的 provider）
- [ ] 3.4 在日志中记录当前使用的 provider 类型

## 4. 更新 Prompt 和日志

- [ ] 4.1 确保 experience extraction prompt 在所有 provider 上工作
- [ ] 4.2 在日志中添加 provider 类型信息
- [ ] 4.3 为不支持 prompt caching 的 provider 添加成本警告日志
- [ ] 4.4 在 usage 统计中区分 cache_read_input_tokens（仅 Anthropic）

## 5. 测试和验证

- [ ] 5.1 为 AnthropicProvider.extractExperience() 添加单元测试
- [ ] 5.2 为 OpenAIProvider.extractExperience() 添加单元测试
- [ ] 5.3 添加集成测试：使用 Anthropic provider 执行 experience extraction
- [ ] 5.4 添加集成测试：使用 OpenAI provider 执行 experience extraction
- [ ] 5.5 添加集成测试：使用 CCR provider 执行 experience extraction
- [ ] 5.6 验证三个 provider 返回的 JSON 格式一致性

## 6. 文档和注释

- [ ] 6.1 在 design.md 中添加 CCR 本质说明（Anthropic API proxy）
- [ ] 6.2 在用户文档中说明不同 provider 的成本差异
- [ ] 6.3 在 src/llm/client-factory.ts 中添加详细注释
- [ ] 6.4 更新 README 说明多 provider 支持
