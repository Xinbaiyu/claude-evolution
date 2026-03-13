## 1. 测试基础设施

- [x] 1.1 验证 vitest 配置文件存在且正确
- [x] 1.2 在 package.json 添加测试脚本（test, test:coverage, test:watch）
- [x] 1.3 创建测试辅助工具目录 tests/helpers/
- [x] 1.4 实现临时目录管理工具（创建、清理）
- [x] 1.5 实现测试数据生成器（模拟建议、偏好、会话）
- [x] 1.6 验证测试运行环境（运行示例测试确保配置正确）

## 2. suggestion-manager 单元测试

- [x] 2.1 创建 src/learners/suggestion-manager.test.ts
- [x] 2.2 测试 approveSuggestion() - 成功批准场景
- [x] 2.3 测试 approveSuggestion() - 建议不存在场景
- [x] 2.4 测试 rejectSuggestion() - 成功拒绝场景
- [x] 2.5 测试 mergeSuggestions() - 非冲突合并
- [x] 2.6 测试 mergeSuggestions() - 冲突检测
- [x] 2.7 测试事务回滚机制 - 部分失败时回滚
- [x] 2.8 测试数据持久化 - 验证 JSON 文件正确写入
- [x] 2.9 达到 80%+ 覆盖率 (实际: 86.2%)

## 3. preference-learner 单元测试

- [x] 3.1 创建 src/learners/preference-learner.test.ts
- [x] 3.2 测试 learnPreferences() - 新偏好学习
- [x] 3.3 测试冲突检测逻辑 - 识别矛盾偏好
- [x] 3.4 测试频率追踪 - 统计偏好出现次数
- [x] 3.5 测试置信度计算 - 基于频率和证据
- [x] 3.6 测试建议生成 - 低置信度生成建议
- [x] 3.7 测试偏好合并 - 相似偏好去重
- [x] 3.8 达到 80%+ 覆盖率 (实际: 96.73%)

## 4. experience-extractor 单元测试

- [x] 4.1 创建 src/analyzers/experience-extractor.test.ts
- [x] 4.2 Mock Anthropic SDK - 模拟 LLM API 响应
- [x] 4.3 测试偏好提取 - 解析 LLM 返回的偏好数据
- [x] 4.4 测试模式提取 - 解析问题-解决方案模式
- [x] 4.5 测试工作流提取 - 解析重复操作序列
- [x] 4.6 测试 JSON schema 验证 - 拒绝格式错误的响应
- [x] 4.7 测试批处理逻辑 - 多个会话的分批处理
- [x] 4.8 测试错误重试逻辑 - API 失败时重试
- [x] 4.9 达到 80%+ 覆盖率 (实际: 97.42%)

## 5. CLI 工作流集成测试

- [x] 5.1 创建 tests/integration/cli-workflow.test.ts
- [x] 5.2 测试 init 命令 - 在空目录初始化配置结构
- [x] 5.3 测试 analyze 命令 - 成功分析会话 (跳过 - 需要真实数据)
- [x] 5.4 测试 review 命令 - 显示待审批建议
- [x] 5.5 测试 approve 命令 - 批准单个建议
- [x] 5.6 测试完整流程 - init → analyze → review → approve
- [x] 5.7 测试错误场景 - 未初始化时执行命令
- [x] 5.8 测试配置更新 - 验证 CLAUDE.md 正确生成
- [x] 5.9 所有集成测试在临时目录运行，测试后清理

## 6. Web API 集成测试

- [x] 6.1 创建 tests/integration/web-api.test.ts
- [x] 6.2 测试 GET /api/suggestions - 获取建议列表
- [x] 6.3 测试 POST /api/suggestions/:id/approve - 批准建议
- [x] 6.4 测试 POST /api/suggestions/:id/reject - 拒绝建议
- [x] 6.5 测试 POST /api/suggestions/batch-approve - 批量批准
- [x] 6.6 测试 POST /api/suggestions/batch-reject - 批量拒绝
- [x] 6.7 测试 GET /api/system/status - 获取系统状态
- [x] 6.8 测试错误响应 - 无效请求返回 400/404

## 7. 覆盖率验证

- [x] 7.1 运行 `npm run test:coverage` 生成覆盖率报告
- [x] 7.2 验证核心模块覆盖率 >= 80% (learners: 90.05%, experience-extractor: 97.42%, preference-learner: 96.73%, suggestion-manager: 86.2%)
- [x] 7.3 识别未覆盖的关键路径并补充测试（已补充批量操作测试）
- [x] 7.4 配置覆盖率阈值（vitest.config.ts - 核心模块 85%+，全局 60%+）
- [x] 7.5 生成 HTML 覆盖率报告供本地查看 (coverage/index.html)

## 8. CLI status 命令实现

- [x] 8.1 创建 src/cli/commands/status.ts
- [x] 8.2 实现读取配置模式（enabled/disabled）
- [x] 8.3 实现读取上次分析时间（从状态文件）
- [x] 8.4 实现统计待审批建议数量
- [x] 8.5 实现系统健康检查（配置文件完整性）
- [x] 8.6 实现彩色输出（chalk）- 绿色=正常，红色=异常
- [x] 8.7 在 src/cli/index.ts 注册 status 命令
- [x] 8.8 编写 status 命令的集成测试

## 9. CLI history 命令实现

- [x] 9.1 创建 src/cli/commands/history.ts
- [x] 9.2 实现读取 approved.json 和 rejected.json
- [x] 9.3 实现按时间倒序排列历史记录
- [x] 9.4 实现 --limit 参数（默认 10 条）
- [x] 9.5 实现 --type 参数（过滤 approved/rejected）
- [x] 9.6 实现显示建议摘要（类型 + 描述）
- [x] 9.7 实现表格格式输出（使用 cli-table3）
- [x] 9.8 在 src/cli/index.ts 注册 history 命令
- [x] 9.9 编写 history 命令的集成测试

## 10. CLI diff 命令实现

- [x] 10.1 创建 src/cli/commands/diff.ts
- [x] 10.2 实现读取原始 CLAUDE.md
- [x] 10.3 实现读取进化后的配置文件
- [x] 10.4 集成 diff 库（使用 diff npm 包）
- [x] 10.5 实现彩色差异输出（绿色=新增，红色=删除）
- [x] 10.6 实现 --no-color 选项（纯文本输出）
- [x] 10.7 实现差异统计摘要（新增/删除/修改行数）
- [x] 10.8 处理配置未启用的场景（显示提示信息）
- [x] 10.9 在 src/cli/index.ts 注册 diff 命令
- [x] 10.10 编写 diff 命令的集成测试
- [ ] 10.6 实现 --no-color 选项（纯文本输出）
- [ ] 10.7 实现差异统计摘要（新增/删除/修改行数）
- [ ] 10.8 处理配置未启用的场景（显示提示信息）
- [ ] 10.9 在 src/cli/index.ts 注册 diff 命令
- [ ] 10.10 编写 diff 命令的集成测试

## 11. README.md 更新

- [x] 11.1 重写项目概述章节
- [x] 11.2 添加功能特性列表（核心功能、CLI 工具、Web UI）
- [x] 11.3 编写安装指南（npm install -g、从源码构建）
- [x] 11.4 编写快速开始（5 分钟上手流程）
- [x] 11.5 添加命令参考（所有 CLI 命令的详细说明）
- [x] 11.6 添加常见问题（FAQ）
- [x] 11.7 添加贡献指南链接
- [x] 11.8 添加许可证信息

## 12. 架构文档

- [x] 12.1 创建 docs/ARCHITECTURE.md
- [x] 12.2 编写系统概述（整体架构、核心理念）
- [x] 12.3 绘制架构图（ASCII 或 Mermaid）
- [x] 12.4 说明模块划分（scheduler, analyzer, learner, generator）
- [x] 12.5 说明数据流（Session → Analysis → Learning → Config）
- [x] 12.6 记录技术选型（TypeScript、Vitest、Express、React）
- [x] 12.7 记录关键技术决策（HTTP vs MCP、文件存储格式）
- [x] 12.8 添加扩展指南（如何添加新功能）

## 13. API 文档

- [x] 13.1 创建 docs/API.md
- [x] 13.2 列出所有 REST 端点（GET/POST）
- [x] 13.3 文档化 /api/suggestions 端点（请求/响应格式）
- [x] 13.4 文档化 /api/suggestions/:id/approve 端点
- [x] 13.5 文档化 /api/suggestions/:id/reject 端点
- [x] 13.6 文档化批量操作端点
- [x] 13.7 文档化 /api/system/status 端点
- [x] 13.8 添加请求示例（curl 命令）
- [x] 13.9 添加响应示例（JSON）
- [x] 13.10 说明错误码和错误格式

## 14. 部署文档

- [x] 14.1 创建 docs/DEPLOYMENT.md
- [x] 14.2 编写本地开发环境搭建指南
- [x] 14.3 编写 Web UI 部署流程（npm run build）
- [x] 14.4 编写 CLI 工具安装流程（npm link 或 npm install -g）
- [x] 14.5 说明配置文件位置和格式
- [x] 14.6 添加故障排查章节（常见问题和解决方案）
- [x] 14.7 添加日志文件位置说明
- [x] 14.8 添加备份和恢复流程

## 15. CLI 参考文档

- [x] 15.1 创建 docs/CLI_REFERENCE.md
- [x] 15.2 文档化 init 命令（语法、选项、示例）
- [x] 15.3 文档化 analyze 命令（包括 --now 选项）
- [x] 15.4 文档化 review 命令（包括 -v/--verbose 选项）
- [x] 15.5 文档化 approve 命令（单个和 all）
- [x] 15.6 文档化 reject 命令
- [x] 15.7 文档化 config 命令（list/set）
- [x] 15.8 文档化新增的 status 命令
- [x] 15.9 文档化新增的 history 命令
- [x] 15.10 文档化新增的 diff 命令
- [x] 15.11 添加每个命令的实际使用示例

## 16. CI/CD 配置

- [ ] 16.1 创建 .github/workflows/test.yml
- [ ] 16.2 配置 Node.js 环境（v18 或 v20）
- [ ] 16.3 配置依赖缓存（npm cache）
- [ ] 16.4 添加 lint 检查步骤（如有 eslint 配置）
- [ ] 16.5 添加类型检查步骤（tsc --noEmit）
- [ ] 16.6 添加单元测试步骤（npm test）
- [ ] 16.7 添加集成测试步骤
- [ ] 16.8 添加覆盖率报告生成
- [ ] 16.9 配置覆盖率上传（可选 - Codecov）
- [ ] 16.10 验证 CI 流程在 PR 和 push 时触发

## 17. 最终验证

- [ ] 17.1 运行完整测试套件，确保所有测试通过
- [ ] 17.2 验证测试覆盖率达标（核心模块 >= 80%）
- [ ] 17.3 验证所有 CLI 命令可用（status, history, diff）
- [ ] 17.4 验证文档完整性（README, Architecture, API, Deployment, CLI Reference）
- [ ] 17.5 运行 CI 流程，确保 GitHub Actions 通过
- [ ] 17.6 本地构建项目（npm run build）确保无错误
- [ ] 17.7 手动测试完整工作流（init → analyze → review → approve）
- [ ] 17.8 检查 PROGRESS_REPORT.md，更新完成度统计
