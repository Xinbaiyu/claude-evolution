# 项目根目录清理建议

生成时间: 2026-03-13
当前文件总数: 50 个

## 🗑️ 建议删除的文件（12个）

### 1. 空文件（2个）
- `AGENTS.md` - 空文件，无内容
- `CLAUDE.md` - 空文件，无内容

### 2. 临时测试脚本（9个）
这些脚本用于开发阶段的临时测试，现已有完整测试套件替代：

- `configure-router.js` - 路由配置测试脚本
- `fix-model-config.js` - 模型配置修复脚本（一次性使用）
- `test-api-key.js` - API Key 验证脚本
- `test-data-collection.js` - 数据采集测试
- `test-http-api.js` - HTTP API 测试
- `test-init.js` - Init 命令测试
- `test-init-manual.sh` - 手动 Init 测试
- `test-notification-mac.sh` - Mac 通知测试
- `test-notifications.sh` - 通知功能测试
- `test-web-server.sh` - Web 服务器测试
- `diagnose-notifications.sh` - 通知诊断脚本

理由：
- tests/integration/ 目录已包含完整的集成测试
- tests/ 目录已包含完整的单元测试
- 这些临时脚本功能已被正式测试套件覆盖

### 3. 过时的状态文档（1个）
- `STATUS.md` - 旧版本状态文档（2026-03-11），已被更新的文档替代

理由：
- README.md 已完整更新（2026-03-13）
- PROGRESS_REPORT.md 包含最新进度
- TESTING_SUMMARY.md 包含最新测试统计
- 该文档内容严重过时（测试 0% vs 实际 100%）

## 📝 建议合并的文档（7个）

### 实施摘要文档（可选择性保留）
这些文档记录了特定功能的实施过程，可考虑归档到 docs/implementation/：

1. `API-MODE-IMPLEMENTATION.md` (266行) - API 模式实施
2. `CLI_ENHANCED_COMMANDS.md` (309行) - CLI 增强命令实施
3. `DESKTOP-NOTIFICATIONS.md` (211行) - 桌面通知实施
4. `MAC-NOTIFICATION-GUIDE.md` (144行) - Mac 通知指南
5. `VERBOSE-REVIEW-IMPLEMENTATION.md` (153行) - Verbose Review 实施
6. `ROUTER-SETUP.md` (242行) - Router 设置文档
7. `DOCS_COMPLETION_SUMMARY.md` (450行) - 文档完成总结
8. `README_UPDATE_SUMMARY.md` (314行) - README 更新总结

建议操作：
```bash
mkdir -p docs/implementation-notes
mv API-MODE-IMPLEMENTATION.md docs/implementation-notes/
mv CLI_ENHANCED_COMMANDS.md docs/implementation-notes/
mv DESKTOP-NOTIFICATIONS.md docs/implementation-notes/
mv MAC-NOTIFICATION-GUIDE.md docs/implementation-notes/
mv VERBOSE-REVIEW-IMPLEMENTATION.md docs/implementation-notes/
mv ROUTER-SETUP.md docs/implementation-notes/
mv DOCS_COMPLETION_SUMMARY.md docs/implementation-notes/
mv README_UPDATE_SUMMARY.md docs/implementation-notes/
```

## 📁 建议保留的核心文档（7个）

这些文档是项目的核心文档，应保留在根目录：

1. ✅ `README.md` (841行) - 主文档，最新更新
2. ✅ `FEATURES.md` (558行) - 功能列表
3. ✅ `QUICKSTART.md` (449行) - 快速开始指南
4. ✅ `MIGRATION.md` (290行) - 迁移指南
5. ✅ `PROGRESS_REPORT.md` (363行) - 进度报告
6. ✅ `NEXT_STEPS.md` (534行) - 下一步计划
7. ✅ `TESTING_SUMMARY.md` (158行) - 测试总结

## 🎯 清理后的预期结果

### 删除前：
- 总文件: 50 个
- .md 文档: 20 个
- 测试脚本: 11 个

### 删除后：
- 总文件: 30 个 (-40%)
- .md 文档: 7 个核心 + 8 个归档 = 15 个 (-25%)
- 测试脚本: 0 个（由正式测试套件替代）

## 📋 执行清单

### 第一步：删除空文件和临时脚本
```bash
# 删除空文件
rm AGENTS.md CLAUDE.md

# 删除临时测试脚本
rm configure-router.js
rm fix-model-config.js
rm test-*.js
rm test-*.sh
rm diagnose-notifications.sh

# 删除过时文档
rm STATUS.md
```

### 第二步：归档实施笔记（可选）
```bash
mkdir -p docs/implementation-notes
mv API-MODE-IMPLEMENTATION.md docs/implementation-notes/
mv CLI_ENHANCED_COMMANDS.md docs/implementation-notes/
mv DESKTOP-NOTIFICATIONS.md docs/implementation-notes/
mv MAC-NOTIFICATION-GUIDE.md docs/implementation-notes/
mv VERBOSE-REVIEW-IMPLEMENTATION.md docs/implementation-notes/
mv ROUTER-SETUP.md docs/implementation-notes/
mv DOCS_COMPLETION_SUMMARY.md docs/implementation-notes/
mv README_UPDATE_SUMMARY.md docs/implementation-notes/
```

### 第三步：验证清理结果
```bash
# 检查根目录文件数量
ls -la | wc -l

# 检查项目结构
tree -L 2 -I 'node_modules|dist|coverage'
```

## ⚠️ 注意事项

1. **start-ui.sh** - 保留，用于启动 Web UI
2. **demo-api-mode.sh** - 可选保留，用于演示 API 模式
3. **PROJECT_SUMMARY.md** 和 **VERIFICATION.md** - 建议检查内容后决定是否删除
4. 删除前建议先 git commit 当前状态，以防需要恢复

## 📊 清理效益

- **可读性提升**: 根目录更简洁，核心文档更突出
- **维护性提升**: 减少过时信息，降低混淆风险
- **专业性提升**: 清晰的文档结构，符合开源项目规范
- **测试替代**: 临时脚本由完整测试套件替代，更可靠

## 🔍 后续建议

清理完成后，建议：
1. 更新 .gitignore 忽略未来的临时测试脚本
2. 在 CONTRIBUTING.md 中说明临时脚本的管理规范
3. 考虑使用 docs/ 子目录管理所有文档
