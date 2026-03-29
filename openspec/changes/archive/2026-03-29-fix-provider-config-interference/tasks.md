## 1. 后端 Schema 更新

- [x] 1.1 在 `src/config/schema.ts` 中定义新的嵌套 LLM Schema
- [x] 1.2 添加 `ActiveProvider` 类型定义 (`'claude' | 'openai' | 'ccr'`)
- [x] 1.3 定义 `ClaudeConfigSchema` 包含 model, temperature, maxTokens, enablePromptCaching
- [x] 1.4 定义 `OpenAIConfigSchema` 包含 model, temperature, maxTokens, baseURL, apiKey, organization
- [x] 1.5 定义 `CCRConfigSchema` 包含 model, temperature, maxTokens, baseURL
- [x] 1.6 更新 `LLMSchema` 使用嵌套结构：activeProvider, claude, openai, ccr
- [x] 1.7 移除旧的顶层字段：provider, model, temperature, maxTokens, baseURL, anthropic
- [x] 1.8 导出新的 TypeScript 类型
- [x] 1.9 验证 TypeScript 编译通过

## 2. 配置迁移逻辑

- [x] 2.1 在 `src/config/loader.ts` 中实现 `isOldConfigFormat()` 检测函数
- [x] 2.2 实现 `inferActiveProvider()` 推断当前激活提供商
- [x] 2.3 实现 `migrateConfig()` 迁移函数
- [x] 2.4 实现配置备份逻辑 `backupConfig()`，保存到 `config.json.backup-TIMESTAMP`
- [x] 2.5 实现激活提供商配置迁移（从顶层字段迁移到嵌套对象）
- [x] 2.6 实现非激活提供商默认值填充
- [x] 2.7 在 `loadConfig()` 中集成迁移逻辑
- [x] 2.8 实现迁移失败回滚逻辑
- [x] 2.9 添加迁移日志输出
- [ ] 2.10 编写配置迁移单元测试

## 3. LLM 客户端工厂适配

- [x] 3.1 更新 `src/llm/client-factory.ts` 的 `createLLMClient()` 函数
- [x] 3.2 从 `config.llm.activeProvider` 读取当前提供商
- [x] 3.3 更新 `createClaudeProvider()` 从 `config.llm.claude` 读取配置
- [x] 3.4 更新 `createOpenAIProvider()` 从 `config.llm.openai` 读取配置
- [x] 3.5 实现 `createCCRProvider()` 从 `config.llm.ccr` 读取配置
- [x] 3.6 更新提供商选择逻辑（基于 activeProvider 而非 provider + baseURL 组合）
- [x] 3.7 添加配置有效性检查（activeProvider 对应的配置对象必须存在）
- [ ] 3.8 编写客户端工厂单元测试

## 4. 受影响组件更新

- [x] 4.1 更新 `src/analyzers/experience-extractor.ts` 读取新配置结构
- [x] 4.2 Grep 搜索所有 `config.llm.model` 引用并更新
- [x] 4.3 Grep 搜索所有 `config.llm.temperature` 引用并更新
- [x] 4.4 Grep 搜索所有 `config.llm.maxTokens` 引用并更新
- [x] 4.5 Grep 搜索所有 `config.llm.baseURL` 引用并更新
- [x] 4.6 Grep 搜索所有 `config.llm.provider` 引用并更新为 `activeProvider`
- [x] 4.7 验证所有 LLM 配置读取点已更新

## 5. 前端类型定义更新

- [x] 5.1 更新 `web/client/src/api/client.ts` 的 `Config` 类型定义
- [x] 5.2 定义 `ActiveProvider` 类型
- [x] 5.3 定义 `ClaudeConfig` 接口
- [x] 5.4 定义 `OpenAIConfig` 接口
- [x] 5.5 定义 `CCRConfig` 接口
- [x] 5.6 更新 `LLMConfig` 接口使用嵌套结构
- [x] 5.7 验证前端 TypeScript 编译通过

## 6. 前端组件重构

- [x] 6.1 在 `LLMProviderConfig.tsx` 中移除 `detectMode()` 函数
- [x] 6.2 从 `config.llm.activeProvider` 读取当前激活提供商
- [x] 6.3 重写 `handleModeChange()` 为 `handleProviderChange()`
- [x] 6.4 实现提供商切换逻辑：只修改 `activeProvider` 字段
- [x] 6.5 创建辅助函数 `updateProviderConfig(provider, updates)` 用于更新嵌套配置
- [x] 6.6 更新 Claude 模式的所有字段变更处理器（使用 `config.llm.claude`）
- [x] 6.7 更新 OpenAI 模式的所有字段变更处理器（使用 `config.llm.openai`）
- [x] 6.8 更新 CCR 模式的所有字段变更处理器（使用 `config.llm.ccr`）
- [x] 6.9 更新 `isConfigured` 逻辑检查嵌套配置对象
- [x] 6.10 移除 `useEffect` 中的 `detectMode` 调用，避免覆盖用户选择
- [x] 6.11 验证前端构建成功
- [x] 6.12 为 OpenAI 提供商添加 API Key 和 Organization ID 输入框

## 7. 单元测试

- [ ] 7.1 编写配置迁移测试：旧格式 Claude provider 迁移
- [ ] 7.2 编写配置迁移测试：旧格式 OpenAI provider 迁移
- [ ] 7.3 编写配置迁移测试：旧格式 CCR (baseURL) 迁移
- [ ] 7.4 编写配置迁移测试：默认值填充
- [ ] 7.5 编写配置迁移测试：备份和回滚
- [ ] 7.6 编写 LLM 客户端工厂测试：activeProvider 路由
- [ ] 7.7 编写 LLM 客户端工厂测试：提供商配置读取
- [ ] 7.8 编写前端组件测试：提供商切换不互相影响
- [ ] 7.9 编写前端组件测试：配置修改只影响当前提供商
- [ ] 7.10 确保所有单元测试通过

## 8. 集成测试

- [x] 8.1 启动 daemon，验证旧配置自动迁移
- [x] 8.2 验证备份文件 `config.json.backup-*` 创建成功
- [x] 8.3 验证新配置文件包含 activeProvider, claude, openai, ccr 字段
- [x] 8.4 在前端切换到 Claude，修改 model，保存配置
- [x] 8.5 在前端切换到 OpenAI，验证 OpenAI 的 model 未变化
- [x] 8.6 在前端切换到 CCR，修改 temperature，保存配置
- [x] 8.7 在前端切换回 Claude，验证 Claude 的 temperature 未变化
- [x] 8.8 重启 daemon，验证所有提供商配置正确加载
- [ ] 8.9 测试 Claude 提供商 LLM 调用使用 claude 配置
- [ ] 8.10 测试 OpenAI 提供商 LLM 调用使用 openai 配置
- [ ] 8.11 测试 CCR 提供商 LLM 调用使用 ccr 配置

## 9. 端到端测试

- [ ] 9.1 使用 Claude 提供商执行完整的 experience extraction
- [ ] 9.2 切换到 OpenAI 提供商，验证配置隔离
- [ ] 9.3 使用 OpenAI 提供商执行 LLM 调用（如果支持）
- [ ] 9.4 切换到 CCR 提供商，验证配置隔离
- [ ] 9.5 使用 CCR 提供商执行完整的 experience extraction
- [x] 9.6 多次在三个提供商间切换，验证配置始终保持隔离
- [x] 9.7 修改所有提供商的所有配置字段，验证互不影响
- [ ] 9.8 保存配置并重启，验证所有配置持久化

## 10. 回归测试

- [ ] 10.1 验证 Claude API 现有功能不受影响
- [ ] 10.2 验证 OpenAI API 现有功能不受影响
- [ ] 10.3 验证配置保存功能正常
- [ ] 10.4 验证配置加载功能正常
- [ ] 10.5 验证前端 UI 其他功能无回归
- [ ] 10.6 验证 daemon 启动和关闭正常
- [ ] 10.7 验证调度器功能正常
- [ ] 10.8 验证提醒功能正常
- [ ] 10.9 验证 Web UI 路由正常
- [ ] 10.10 验证所有现有集成测试通过

## 11. 文档和清理

- [ ] 11.1 更新 README 或用户文档说明新的配置结构
- [ ] 11.2 添加配置迁移说明文档
- [ ] 11.3 添加回滚命令文档（如实现）
- [ ] 11.4 清理代码中的 console.log 和调试输出
- [ ] 11.5 确保代码格式化（Prettier/ESLint）
- [ ] 11.6 更新 CHANGELOG（如存在）
- [ ] 11.7 准备 PR 描述和测试报告
