# 项目清理建议

**分析时间**: 2026-03-13 23:55

---

## 📊 当前问题

### 根目录过于混乱

- **Markdown 文件**: 18 个
- **脚本文件**: 13 个
- **总文件数**: 52 个

**问题**: 文件太多,难以找到重要文件

---

## 🎯 清理目标

### 清理后的根目录应该只有:

```
claude-evolution/
├── README.md           # 项目主文档
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── src/                # 源代码
├── tests/              # 测试
├── web/                # Web UI
├── docs/               # 📚 所有文档
├── scripts/            # 🔨 所有脚本
└── ...                 # 其他必需目录
```

---

## 📁 建议的文档整理

### 当前文档 (18 个 Markdown)

#### 1. 总结文档 (6 个) → `docs/summaries/`

- `CLI_ENHANCED_COMMANDS.md`
- `TESTING_SUMMARY.md`
- `README_UPDATE_SUMMARY.md`
- `DOCS_COMPLETION_SUMMARY.md`
- `DEPLOYMENT_CLI_SUMMARY.md`
- `CLEANUP_RECOMMENDATIONS.md`

#### 2. 开发文档 (8 个) → `docs/development/`

- `FEATURES.md`
- `PROGRESS_REPORT.md`
- `NEXT_STEPS.md`
- `STATUS.md`
- `PROJECT_SUMMARY.md`
- `MIGRATION.md`
- `VERIFICATION.md`
- `QUICKSTART.md`

#### 3. 归档文档 (4 个) → `docs/archive/`

- `API-MODE-IMPLEMENTATION.md` (已完成功能)
- `VERBOSE-REVIEW-IMPLEMENTATION.md`
- `DESKTOP-NOTIFICATIONS.md`
- `MAC-NOTIFICATION-GUIDE.md`
- `ROUTER-SETUP.md`

#### 4. 空文件 (2 个) → 删除

- `AGENTS.md` (0 字节)
- `CLAUDE.md` (0 字节)

---

## 🔨 脚本整理

### 当前脚本 (13 个)

#### 1. 测试脚本 (9 个) → `scripts/testing/`

- `test-api-key.js`
- `test-data-collection.js`
- `test-http-api.js`
- `test-init.js`
- `test-init-manual.sh`
- `test-notification-mac.sh`
- `test-notifications.sh`
- `test-web-server.sh`
- `diagnose-notifications.sh`

#### 2. 工具脚本 (3 个) → `scripts/utils/`

- `configure-router.js`
- `fix-model-config.js`
- `demo-api-mode.sh`

#### 3. 常用脚本 (1 个) → 可选保留根目录

- `start-ui.sh`

---

## 🚀 执行步骤

需要我帮你执行清理吗？我会:

1. 创建新目录 (`docs/summaries/`, `docs/development/`, `docs/archive/`, `scripts/`)
2. 移动文档到对应目录
3. 移动脚本到对应目录
4. 删除空文件
5. 生成清理报告

**预计时间**: 2 分钟
**风险**: 低 (只是文件移动,可以撤销)

