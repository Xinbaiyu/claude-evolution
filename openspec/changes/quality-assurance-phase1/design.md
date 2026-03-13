## Context

**当前状态**:
- claude-evolution 项目已实现核心功能，代码库约 15,000+ 行
- 包含核心引擎（scheduler, analyzer, learner, generator）、CLI 工具和 Web UI
- 使用 TypeScript + Node.js，测试框架 vitest 已配置但未使用
- 0% 测试覆盖率，文档仅包含基础 README

**约束条件**:
- 不能破坏现有功能
- 测试必须快速运行（单元测试 <1s，集成测试 <10s）
- 文档必须对非技术用户友好
- CI 流程必须在 5 分钟内完成

**利益相关方**:
- 开发者：需要可维护的代码和清晰的架构文档
- 用户：需要易于理解的安装和使用指南
- 贡献者：需要测试框架保障代码质量

## Goals / Non-Goals

**Goals:**
- 为核心模块建立 80%+ 的测试覆盖率
- 提供完整的用户和开发者文档
- 实现 status、history、diff 三个高价值 CLI 命令
- 建立 CI 流程确保代码质量
- 测试套件运行时间 < 30 秒

**Non-Goals:**
- E2E 测试（留待后续 Phase）
- 100% 测试覆盖率（追求 80% 的高价值覆盖）
- 多语言文档（仅中文）
- 性能测试/压力测试
- Web UI 的前端测试（React Testing Library）

## Decisions

### Decision 1: 测试策略 - 聚焦核心业务逻辑

**选择**: 优先测试 suggestion-manager、preference-learner、experience-extractor

**理由**:
- 这三个模块是系统的核心价值所在
- 包含复杂的业务逻辑（合并、冲突检测、置信度计算）
- 最容易因重构而引入 bug

**备选方案**:
- ❌ 测试所有模块：时间成本过高，收益递减
- ❌ 仅集成测试：无法精确定位 bug 位置

**Trade-off**: 工具函数（logger、file-utils）暂不测试，通过集成测试覆盖

---

### Decision 2: 测试工具 - 使用 Vitest

**选择**: 继续使用已配置的 Vitest

**理由**:
- 已在 package.json 中配置
- 原生支持 TypeScript 和 ESM
- 速度快，UI 友好
- 与 Vite 生态集成良好（Web 项目已使用 Vite）

**备选方案**:
- ❌ Jest: 配置复杂，对 ESM 支持不佳
- ❌ Mocha + Chai: 需要更多配置

---

### Decision 3: 集成测试策略 - 真实文件系统

**选择**: 集成测试使用临时目录而非 mock 文件系统

**理由**:
- claude-evolution 核心功能依赖文件 I/O（读写配置、建议、日志）
- Mock 文件系统无法捕获真实场景的 bug（权限、路径、并发）
- 临时目录隔离，测试后自动清理

**实现**:
```typescript
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

beforeEach(() => {
  testDir = mkdtempSync(join(tmpdir(), 'claude-evolution-test-'));
});

afterEach(() => {
  rmSync(testDir, { recursive: true });
});
```

**Trade-off**: 测试速度稍慢（+50ms/测试），但可靠性大幅提升

---

### Decision 4: CLI 命令设计 - 轻量级实现

**选择**: status、history、diff 命令使用现有数据结构，无需新增存储

**理由**:
- status: 读取 `~/.claude-evolution/config.json` 和文件系统状态
- history: 读取 `~/.claude-evolution/suggestions/approved.json` 的时间戳
- diff: 比较 `~/.claude/CLAUDE.md` 和 `~/.claude-evolution/generated.md`

**备选方案**:
- ❌ 创建专门的 history 数据库：过度设计，增加复杂度
- ❌ 实时计算 diff：对大文件性能差

**实现细节**:
- status: 显示配置模式（enabled/disabled）、上次分析时间、待审批数量
- history: 显示最近 N 次批准/拒绝操作的时间和 ID
- diff: 使用 `diff` 算法库（如 `diff` npm 包）高亮差异

---

### Decision 5: 文档结构 - 分层架构

**选择**: 文档分为用户文档（docs/）和代码文档（JSDoc）

**结构**:
```
docs/
├── README.md              (项目概述 - 移动根目录的 README 到这里? 不，保留根目录)
├── QUICK_START.md         (5 分钟上手指南)
├── INSTALLATION.md        (详细安装步骤)
├── CLI_REFERENCE.md       (所有命令的详细说明)
├── ARCHITECTURE.md        (系统架构、模块划分)
├── API.md                 (Web Server REST API)
└── DEPLOYMENT.md          (部署流程、故障排查)
```

**理由**:
- 用户关心"如何使用"（Quick Start、CLI Reference）
- 开发者关心"如何工作"（Architecture、API）
- 分离关注点，避免单一文档过长

**非目标**: API 文档生成（如 TypeDoc）- 手动维护更灵活

---

### Decision 6: CI 配置 - GitHub Actions

**选择**: 使用 GitHub Actions，每次 push 和 PR 触发

**流程**:
```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3  # 可选：上传覆盖率报告
```

**理由**:
- GitHub Actions 免费且与代码托管集成
- 支持缓存依赖，速度快
- 可扩展（后续添加 lint、类型检查）

**Trade-off**: 依赖 GitHub - 如果迁移到其他平台需要重新配置

## Risks / Trade-offs

### Risk 1: 测试覆盖率目标可能延长开发时间

**风险**: 80% 覆盖率可能需要 1-2 周，延迟其他功能开发

**缓解**:
- 聚焦核心模块，工具函数通过集成测试覆盖
- 使用测试驱动开发（TDD）提升效率
- 设置 soft deadline：1 周达到 60%，2 周达到 80%

---

### Risk 2: 集成测试可能在 CI 环境失败

**风险**: 文件系统权限、临时目录路径差异导致 CI 失败

**缓解**:
- 使用跨平台的临时目录 API（`os.tmpdir()`）
- 在 CI 中运行相同的测试脚本
- 添加详细的错误日志

---

### Risk 3: 文档可能快速过时

**风险**: 代码更新后文档未同步

**缓解**:
- 在 PR 模板中添加"文档更新"检查项
- 关键 API 变更时同步更新 docs/API.md
- 每月一次文档审查

---

### Trade-off 1: 手动维护 vs 自动生成文档

**选择**: 手动维护

**原因**:
- 自动生成的文档（如 TypeDoc）通常过于技术化
- 手动文档可以包含示例、最佳实践、故障排查
- 项目规模适中，维护成本可控

**代价**: 需要纪律性地更新文档

---

### Trade-off 2: 测试速度 vs 真实性

**选择**: 使用真实文件系统（而非 mock）

**代价**: 集成测试速度稍慢（~5s vs ~1s）
**收益**: 捕获真实环境 bug，减少生产问题

## Migration Plan

**阶段 1: 测试基础设施（第 1-2 天）**
1. 配置 vitest.config.ts（如果不存在）
2. 添加测试脚本到 package.json
3. 创建测试辅助工具（临时目录、测试数据生成器）
4. 验证测试运行环境

**阶段 2: 单元测试（第 3-7 天）**
1. suggestion-manager.test.ts（批准、拒绝、合并逻辑）
2. preference-learner.test.ts（冲突检测、频率追踪）
3. experience-extractor.test.ts（LLM 调用 mock、数据验证）
4. 达到 60%+ 覆盖率

**阶段 3: 集成测试（第 8-10 天）**
1. CLI 工作流测试（init → analyze → review → approve）
2. Web API 端点测试（/api/suggestions、/api/system）
3. 达到 80%+ 覆盖率

**阶段 4: CLI 命令实现（第 11-12 天）**
1. 实现 status 命令（读取配置和系统状态）
2. 实现 history 命令（读取 approved.json）
3. 实现 diff 命令（比较文件差异）
4. 集成测试覆盖新命令

**阶段 5: 文档编写（第 13-14 天）**
1. 更新 README.md（概述、安装、快速开始）
2. 创建 docs/ARCHITECTURE.md（系统设计）
3. 创建 docs/API.md（REST 端点）
4. 创建 docs/DEPLOYMENT.md（部署指南）
5. 创建 docs/CLI_REFERENCE.md（命令参考）

**阶段 6: CI 集成（第 15 天）**
1. 配置 GitHub Actions workflow
2. 添加覆盖率报告
3. 验证 CI 通过

**回滚策略**:
- 所有变更都是增量的（新增文件、新增命令）
- 如需回滚：删除新增文件，从 package.json 移除脚本
- 无数据库迁移，无破坏性变更

**验收标准**:
- ✅ 80%+ 测试覆盖率（核心模块）
- ✅ 所有测试通过（< 30s 运行时间）
- ✅ CI 配置完成并通过
- ✅ 5 份文档完成（README、Architecture、API、Deployment、CLI Reference）
- ✅ status、history、diff 命令可用

## Open Questions

1. **是否需要集成 Codecov 或类似服务？**
   - 可以可视化覆盖率趋势
   - 需要额外配置和可能的费用
   - **建议**: Phase 1 使用本地覆盖率报告，Phase 2 评估集成

2. **是否为 Web UI 添加前端测试？**
   - React Testing Library 可以测试 UI 组件
   - 但前端逻辑相对简单（大部分在后端）
   - **建议**: Phase 1 跳过，Phase 2 或 Phase 3 评估

3. **是否需要性能基准测试？**
   - 可以监控分析流程的性能退化
   - 但当前无明显性能问题
   - **建议**: Phase 1 跳过，如有性能投诉再添加
