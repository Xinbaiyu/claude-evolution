## Context (背景)

### 当前状态
LLM 配置使用扁平结构，所有提供商共享同一组字段：
```typescript
llm: {
  provider: 'openai' | 'anthropic',  // 当前激活的提供商
  model: string,                      // 共享字段
  temperature: number,                // 共享字段
  maxTokens: number,                  // 共享字段
  baseURL: string,                    // 共享字段
  openai: { apiKey, organization },   // OpenAI 专有
  anthropic: { apiVersion }           // Anthropic 专有
}
```

### 问题根源
1. **共享字段污染**：切换提供商时，`handleModeChange` 修改 `model`、`temperature` 等共享字段，导致其他提供商的配置被覆盖
2. **无状态隔离**：前端组件没有为每个提供商维护独立状态，所有修改都直接作用于同一个 `config.llm` 对象
3. **模糊的提供商识别**：通过 `provider` + `baseURL` 组合判断提供商类型（Claude/OpenAI/CCR），逻辑复杂且容易出错

### 约束条件
- 必须保持向后兼容，自动迁移现有配置
- 不能破坏现有的 LLM 调用流程
- 前端 UI 体验不能倒退（切换提供商仍需快速流畅）
- 迁移失败时能安全回滚

## Goals / Non-Goals (目标与非目标)

**Goals:**
- 彻底隔离三个提供商的配置，互不干扰
- 用户可以为每个提供商预设不同的模型、温度等参数
- 切换提供商时，自动加载该提供商的已保存配置
- 自动迁移现有配置，无需用户手动操作
- 提供清晰的迁移日志和回滚机制

**Non-Goals:**
- 不支持同时使用多个提供商（仍然是单一激活提供商模式）
- 不改变 LLM 调用的实际逻辑（只改配置结构）
- 不添加提供商配置导入/导出功能（可作为未来增强）
- 不优化前端组件的其他 UX 问题（仅修复配置干扰）

## Decisions (关键技术决策)

### Decision 1: 嵌套配置结构 vs 三个独立顶层字段

**选择**：嵌套配置结构

**方案 A（选择）**：嵌套在 `llm` 下
```typescript
llm: {
  activeProvider: 'claude' | 'openai' | 'ccr',
  claude: { model, temperature, maxTokens, enablePromptCaching },
  openai: { model, temperature, maxTokens, baseURL, apiKey, organization },
  ccr: { model, temperature, maxTokens, baseURL }
}
```

**方案 B（放弃）**：三个独立顶层字段
```typescript
llmClaude: { model, temperature, ... },
llmOpenAI: { model, temperature, ... },
llmCCR: { model, temperature, ... },
activeProvider: 'claude' | 'openai' | 'ccr'
```

**理由**：
- ✅ 方案 A 保持 `llm` 作为单一配置入口点，符合现有架构
- ✅ 方案 A 迁移路径更清晰（只需转换 `config.llm`）
- ✅ 方案 A 在代码中引用更简洁（`config.llm.claude` vs `config.llmClaude`）
- ❌ 方案 B 会污染顶层配置空间，不易扩展

### Decision 2: 自动迁移 vs 手动迁移

**选择**：自动迁移 + 备份

**方案 A（选择）**：Daemon 启动时自动检测并迁移
- 检测到旧格式（存在 `config.llm.model` 等扁平字段）
- 备份到 `config.json.backup-TIMESTAMP`
- 自动转换并保存新格式
- 记录迁移日志

**方案 B（放弃）**：提供迁移命令，用户手动执行
- `claude-evolution config migrate`
- 用户需要阅读文档并手动执行

**理由**：
- ✅ 方案 A 用户无感知，降低使用门槛
- ✅ 方案 A 避免用户忘记迁移导致功能异常
- ✅ 备份机制保证安全性，出错可回滚
- ❌ 方案 B 增加用户负担，违背"自动化"原则

### Decision 3: 前端状态管理策略

**选择**：单一 state + 提供商嵌套对象

**方案 A（选择）**：
```typescript
const [config, setConfig] = useState({
  llm: {
    activeProvider: 'claude',
    claude: { model: 'claude-sonnet-4-6', ... },
    openai: { model: 'gpt-4-turbo', ... },
    ccr: { model: 'claude-sonnet-4-6', ... }
  }
});

// 切换提供商时
const handleProviderChange = (provider) => {
  setConfig({
    ...config,
    llm: { ...config.llm, activeProvider: provider }
  });
};

// 修改配置时
const handleModelChange = (model) => {
  setConfig({
    ...config,
    llm: {
      ...config.llm,
      [config.llm.activeProvider]: {
        ...config.llm[config.llm.activeProvider],
        model
      }
    }
  });
};
```

**方案 B（放弃）**：为每个提供商维护独立 state
```typescript
const [claudeConfig, setClaudeConfig] = useState({ model: '...' });
const [openaiConfig, setOpenAIConfig] = useState({ model: '...' });
const [ccrConfig, setCCRConfig] = useState({ model: '...' });
const [activeProvider, setActiveProvider] = useState('claude');
```

**理由**：
- ✅ 方案 A 结构与后端一致，降低序列化/反序列化复杂度
- ✅ 方案 A 通过单一 state 更新触发 `useEffect`，保存逻辑简单
- ✅ 方案 A 状态集中管理，便于调试
- ❌ 方案 B 需要同步多个 state 到后端，容易出错

### Decision 4: 迁移时的默认值策略

**选择**：智能推断 + 合理默认值

**迁移逻辑**：
```typescript
// 1. 推断 activeProvider
const inferActiveProvider = (oldConfig) => {
  if (oldConfig.llm.provider === 'openai') return 'openai';
  if (oldConfig.llm.provider === 'anthropic' && !oldConfig.llm.baseURL) return 'claude';
  if (oldConfig.llm.baseURL) return 'ccr';
  return 'claude'; // 默认
};

// 2. 填充激活提供商的配置（从旧配置迁移）
const activeProvider = inferActiveProvider(oldConfig);
newConfig.llm[activeProvider] = {
  model: oldConfig.llm.model,
  temperature: oldConfig.llm.temperature,
  maxTokens: oldConfig.llm.maxTokens,
  // 提供商特定字段
  ...(activeProvider === 'openai' && {
    baseURL: oldConfig.llm.baseURL,
    apiKey: oldConfig.llm.openai?.apiKey,
    organization: oldConfig.llm.openai?.organization
  })
};

// 3. 为其他提供商设置默认值
// Claude 默认
if (activeProvider !== 'claude') {
  newConfig.llm.claude = {
    model: 'claude-sonnet-4-6',
    temperature: 0.3,
    maxTokens: 4096,
    enablePromptCaching: true
  };
}
// OpenAI 默认
if (activeProvider !== 'openai') {
  newConfig.llm.openai = {
    model: 'gpt-4-turbo',
    temperature: 0.3,
    maxTokens: 4096,
    baseURL: null,
    apiKey: null,
    organization: null
  };
}
// CCR 默认
if (activeProvider !== 'ccr') {
  newConfig.llm.ccr = {
    model: 'claude-sonnet-4-6',
    temperature: 0.3,
    maxTokens: 4096,
    baseURL: 'http://localhost:3456'
  };
}
```

**理由**：
- ✅ 保留用户当前使用的提供商配置
- ✅ 为其他提供商提供合理默认值，用户可直接切换使用
- ✅ 避免 null/undefined 导致的运行时错误

### Decision 5: 前端兼容性处理

**选择**：前端优先使用新格式，后端保证兼容

**方案 A（选择）**：
- 前端读取配置时，检查 `config.llm.activeProvider` 是否存在
- 如果不存在（旧格式），调用后端 API 触发迁移
- 后端迁移完成后，返回新格式配置
- 前端刷新配置

**方案 B（放弃）**：
- 前端自行兼容新旧两种格式
- 在组件内部转换旧格式到新格式

**理由**：
- ✅ 方案 A 迁移逻辑集中在后端，前端不需要兼容两套格式
- ✅ 方案 A 保证配置持久化到文件，下次启动直接使用新格式
- ❌ 方案 B 前端代码复杂度高，且无法持久化迁移结果

## Risks / Trade-offs (风险与权衡)

### Risk 1: 迁移失败导致配置损坏
**风险**：迁移逻辑有 bug，导致配置文件不可用
**缓解**：
- 迁移前自动备份到 `config.json.backup-TIMESTAMP`
- 迁移失败时自动恢复备份
- 详细的错误日志，便于定位问题
- 提供手动回滚命令：`claude-evolution config rollback`

### Risk 2: 用户期望保留所有提供商的历史配置
**风险**：用户之前在不同时间使用过不同提供商，希望保留所有历史配置
**现实**：旧格式只能保留当前激活提供商的配置
**缓解**：
- 在迁移日志中明确说明：只保留当前激活提供商的配置
- 为其他提供商提供合理默认值
- 建议用户在更新前备份配置文件

### Risk 3: 代码中硬编码 `config.llm.model` 的地方遗漏
**风险**：某些代码仍直接读取 `config.llm.model`，导致运行时错误
**缓解**：
- 使用 TypeScript 类型系统强制检查（移除顶层 `model` 字段后编译报错）
- Grep 搜索所有 `config.llm.model` 引用
- 添加运行时 fallback：如果 `config.llm.model` 不存在，从 `activeProvider` 对应字段读取
- 编写单元测试覆盖所有 LLM 配置读取路径

### Risk 4: 前端状态更新逻辑复杂化
**风险**：嵌套对象更新容易出错（如忘记展开 spread operator）
**缓解**：
- 提供辅助函数封装状态更新逻辑：
  ```typescript
  const updateProviderConfig = (provider, updates) => {
    setConfig({
      ...config,
      llm: {
        ...config.llm,
        [provider]: { ...config.llm[provider], ...updates }
      }
    });
  };
  ```
- 添加 TypeScript 类型检查
- 编写单元测试覆盖状态更新逻辑

### Trade-off 1: 配置文件变大
**权衡**：新格式存储三个提供商的配置，文件大小增加约 3 倍
**影响**：配置文件从约 1KB 增加到约 3KB，可忽略
**接受理由**：功能正确性 > 文件大小

### Trade-off 2: 迁移增加启动时间
**权衡**：首次启动时需要执行迁移逻辑，增加约 50-100ms
**影响**：仅首次启动时增加，后续启动不受影响
**接受理由**：一次性开销，用户无感知

## Migration Plan (迁移计划)

### Phase 1: 后端 Schema 更新（优先）
1. 更新 `src/config/schema.ts`，定义新的 `LLMSchema`
2. 实现旧格式检测函数 `isOldConfigFormat()`
3. 实现迁移函数 `migrateConfig()`
4. 在 `src/config/loader.ts` 的 `loadConfig()` 中集成迁移逻辑

### Phase 2: LLM 客户端工厂适配
1. 更新 `src/llm/client-factory.ts` 的 `createLLMClient()`
2. 从 `config.llm.activeProvider` 读取提供商类型
3. 从 `config.llm[activeProvider]` 读取提供商配置
4. 更新所有提供商创建逻辑（`createClaudeProvider`, `createOpenAIProvider`, `createCCRProvider`）

### Phase 3: 前端组件重构
1. 更新 `web/client/src/api/client.ts` 的 `Config` 类型定义
2. 重构 `LLMProviderConfig.tsx` 组件：
   - 移除 `detectMode()` 函数
   - 从 `config.llm.activeProvider` 读取当前提供商
   - 重写 `handleModeChange()` 为 `handleProviderChange()`
   - 更新所有字段变更处理器，修改嵌套对象而非顶层字段
3. 测试三个提供商的切换和配置修改

### Phase 4: 全量测试
1. 单元测试：
   - 配置迁移逻辑测试（各种旧格式场景）
   - 提供商配置读取测试
   - 前端状态更新逻辑测试
2. 集成测试：
   - 启动 daemon，验证迁移自动执行
   - 切换提供商，验证配置隔离
   - 保存配置，验证持久化
3. 端到端测试：
   - 手动测试所有提供商的 LLM 调用
   - 验证切换提供商后配置不互相影响

### Rollback Strategy (回滚策略)
如果迁移失败或出现严重 bug：
1. **自动回滚**：迁移失败时，daemon 自动从 backup 恢复配置并退出
2. **手动回滚**：
   ```bash
   # 恢复最近的备份
   claude-evolution config rollback

   # 指定备份文件
   claude-evolution config rollback --backup config.json.backup-20260329
   ```
3. **降级回滚**：如果需要回退到旧版本代码，备份文件仍然可用

### Validation Checklist (验证清单)
- [ ] 旧配置文件自动迁移成功
- [ ] 备份文件正确创建
- [ ] 三个提供商的配置完全隔离
- [ ] 切换提供商时加载正确的配置
- [ ] 修改配置只影响当前激活的提供商
- [ ] LLM 调用使用正确的提供商和配置
- [ ] TypeScript 编译无错误
- [ ] 所有单元测试通过
- [ ] 前端 UI 无回归问题

## Open Questions (待解决问题)

1. **配置导出/导入功能**：是否需要提供用户导出/导入提供商配置的功能？
   - 当前：Non-Goal，未来可作为增强功能

2. **提供商配置预设**：是否提供常见场景的配置模板（如 DeepSeek、Qianwen 预设）？
   - 建议：可作为 Phase 2 增强功能，当前聚焦配置隔离

3. **配置验证**：是否在保存时验证配置有效性（如 API 连接测试）？
   - 建议：独立功能，不在本次改动范围

4. **多提供商并发使用**：未来是否支持同时使用多个提供商？
   - 当前：明确为 Non-Goal，单一激活提供商足够
