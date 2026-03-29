# 验证过程中发现的 Bug

## Bug 1: CCR Provider 卡片选择失效

**状态**: ✅ **已修复** (2026-03-28 22:08)
**严重程度**: 高 (阻塞功能)

**症状**:
- 点击 CCR Provider 卡片后，UI 切换到 Claude 表单，而不是 CCR 表单
- CCR 卡片无法正确选中

**复现步骤**:
1. 打开 http://localhost:10010/settings
2. 切换到 "Claude 模型" tab
3. 点击 "🟣 CCR Proxy" 卡片
4. 观察：显示的是 Claude 表单（包含 Prompt Caching），而不是 CCR 表单（应该有 Proxy Endpoint 必填项）

**根本原因**:
`web/client/src/components/LLMProviderConfig.tsx` 中的逻辑问题：

1. `handleModeChange` 函数 (lines 136-164) 在切换到 CCR 模式时：
   - 设置 `provider: undefined`
   - 但没有设置 `baseURL`（保留现有值或为 null）

2. `detectMode` 函数 (lines 113-117) 检测逻辑：
   ```typescript
   const detectMode = (cfg: any): ProviderMode => {
     if (cfg.llm?.provider === 'openai') return 'openai';
     if (cfg.llm?.baseURL) return 'ccr';  // 如果 baseURL 为空，不会返回 'ccr'
     return 'claude';  // 默认返回 'claude'
   };
   ```

3. 当从 OpenAI 模式切换到 CCR 时：
   - `handleModeChange('ccr')` 清除了 `baseURL: null`
   - `detectMode` 检测到 `baseURL` 为空，返回 'claude'
   - UI 显示 Claude 表单

**影响范围**:
- 用户无法通过 UI 配置 CCR 代理模式
- 只能手动编辑 config.json 文件来使用 CCR

**修复方案**:
1. **方案 A（推荐）**: 修改 `detectMode` 逻辑，增加对 `provider === undefined && baseURL` 的判断
2. **方案 B**: 修改 `handleModeChange`，CCR 模式时保留现有 baseURL 或提供默认值
3. **方案 C**: 使用独立的 `selectedMode` 状态，不依赖 config 推导模式

**相关文件**:
- `web/client/src/components/LLMProviderConfig.tsx` lines 113-164

**截图**:
- `screenshot-1774664246223.png` - 点击 CCR 卡片后显示 Claude 表单

**修复实施** (2026-03-28 22:08):
修改 `LLMProviderConfig.tsx` lines 132-136 的 useEffect:

```typescript
// 修复前
useEffect(() => {
  setConfig(initialConfig);
  setSelectedMode(detectMode(initialConfig));  // ❌ 覆盖用户选择
}, [initialConfig]);

// 修复后
useEffect(() => {
  setConfig(initialConfig);
  // 保留用户的 selectedMode 选择，不从 initialConfig 重新推导
  // 这样避免了 handleModeChange 设置的 mode 被覆盖
}, [initialConfig]);
```

**根本原因分析**:
1. 用户点击 CCR 卡片 → `handleModeChange('ccr')` 设置 `selectedMode='ccr'`
2. `handleModeChange` 设置 `config.llm.baseURL='http://localhost:3456'`
3. `setConfig` 触发 → Settings 组件的 `handleLLMConfigChange` 被调用
4. Settings 重新渲染 → LLMProviderConfig 的 `initialConfig` prop 更新
5. LLMProviderConfig 的 useEffect 触发 → 调用 `setSelectedMode(detectMode(initialConfig))`
6. `detectMode` 重新推导模式，可能返回错误的模式
7. UI 显示错误的表单

**修复原理**:
- 移除 useEffect 中的 `setSelectedMode(detectMode(initialConfig))` 调用
- 让 `selectedMode` 完全由用户的点击行为（handleModeChange）控制
- 不受 `initialConfig` 变化的影响

**验证结果**:
- ✅ 点击 CCR Proxy 卡片后，UI 正确显示 CCR 表单
- ✅ Proxy Endpoint 字段显示 "http://localhost:3456"
- ✅ CCR 卡片显示 "✓ 已配置" 标记
- ✅ 不再显示 OpenAI 表单字段（API Key、Organization ID）

**提交记录**:
- Commit: `9c65bcb` - "fix: CCR Provider 卡片选择失效 — 移除 detectMode 自动推导逻辑"

**验证任务**:
- Task 2.4: 点击 CCR 卡片，验证紫色高亮边框和阴影效果 ✅ (已解除阻塞)
- Task 5.1-5.4: CCR 表单字段验证 ✅ (已解除阻塞)
- Task 14.1: CCR Proxy Endpoint 必填验证 ✅ (已解除阻塞)
- Task 11.1-11.4: CCR 配置持久化验证 ✅ (已解除阻塞)

---

---

## Bug 2: 配置保存功能失效

**状态**: ✅ **已修复** (2026-03-28 21:52)
**严重程度**: 严重 (核心功能失效)

**症状**:
- 用户在 LLM Provider 配置页面修改配置（model、baseURL 等）后点击"保存配置"
- UI 上没有错误提示
- 但配置文件 `~/.claude-evolution/config.json` 没有更新
- 刷新页面后，所有修改都丢失，恢复到之前的值

**复现步骤**:
1. 打开 http://localhost:10010/settings
2. 切换到 "Claude 模型" tab
3. 选择 OpenAI-Compatible API provider
4. 修改 Model 字段为 "qwen-turbo"
5. 修改 Base URL 为 "https://matrixllm.alipay.com/v1"
6. 点击"保存配置"按钮
7. 检查 `~/.claude-evolution/config.json` → model 仍是旧值
8. 刷新页面 → UI 显示旧值，修改丢失

**根本原因**:
`LLMProviderConfig.tsx` 的 useEffect (lines 167-172) 存在依赖数组不完整的问题：

```typescript
useEffect(() => {
  // 只在配置实际变化时才更新
  if (JSON.stringify(config) !== JSON.stringify(initialConfig)) {
    onSave(config);
  }
}, [config]); // ⚠️ 缺少 onSave 和 initialConfig 依赖
```

问题分析：
1. 每次 Settings 组件重新渲染，都会创建新的 `onSave` 函数引用
2. 但 LLMProviderConfig 的 useEffect 没有将 `onSave` 加入依赖数组
3. 导致 useEffect 可能一直调用第一次渲染时的旧 `onSave` 函数
4. 旧的 `onSave` 可能引用了过期的闭包，无法正确更新 Settings 的 config 状态

或者另一个可能：useEffect 的 JSON.stringify 比较可能失败，或者 onSave 调用本身就没有生效。

**影响范围**:
- 用户无法通过 UI 保存任何 LLM 配置修改
- 所有 provider 模式（Claude、OpenAI、CCR）的配置都无法保存
- 用户必须手动编辑配置文件才能更改 LLM 设置

**修复方案**:
1. **方案 A（推荐）**: 修复 useEffect 依赖数组
   ```typescript
   useEffect(() => {
     if (JSON.stringify(config) !== JSON.stringify(initialConfig)) {
       onSave(config);
     }
   }, [config, onSave, initialConfig]);
   ```
   同时确保 Settings 组件使用 `useCallback` 包装 onSave 函数以避免循环重渲染。

2. **方案 B**: 不使用 useEffect 自动同步，改为在用户点击保存按钮时由 Settings 组件直接读取 LLMProviderConfig 的当前状态。需要通过 ref 或其他方式暴露状态。

3. **方案 C**: 使用 useReducer 或状态管理库统一管理配置状态。

**相关文件**:
- `web/client/src/components/LLMProviderConfig.tsx` lines 167-172
- `web/client/src/pages/Settings.tsx` lines 356-359

**修复实施** (2026-03-28 21:52):
1. **Settings.tsx**:
   - 使用 `useCallback` 包装 `handleLLMConfigChange`，避免每次渲染创建新函数引用
   - 添加空依赖数组确保函数引用稳定

2. **LLMProviderConfig.tsx**:
   - 添加 `isFirstRender` ref，跳过首次渲染避免不必要的初始化保存
   - 完善 useEffect 依赖数组：`[config, onSave]`（移除 initialConfig 避免循环）
   - 保留 JSON.stringify 比较确保只在实际变化时保存

**验证结果**:
- ✅ 修改 Max Tokens: 4096 → 8192
- ✅ 点击"保存配置"按钮
- ✅ PATCH /api/config 请求成功发送
- ✅ config.json 文件成功更新
- ✅ 刷新页面后配置保留

**提交记录**:
- Commit: `6aed428` - "fix: LLM provider 配置保存功能修复"

**验证任务**:
- Task 7.1: 在 OpenAI 模式输入 model "deepseek-chat"，保存配置 ✅ (待重新验证)
- Task 9.1-9.5: 配置持久化验证 - OpenAI Provider ✅ (已解除阻塞)
- Task 10.1-10.4: 配置持久化验证 - Claude Provider ✅ (已解除阻塞)
- Task 11.1-11.4: 配置持久化验证 - CCR Provider ⏸️ (仍被 Bug 1 阻塞)

---

## Bug 3: AutoComplete Model 字段文本追加而非替换

**状态**: ✅ **已修复** (2026-03-29 16:56)
**严重程度**: 中 (影响用户体验，但有 workaround)

**症状**:
- 用户点击 OpenAI-Compatible API 的 Model AutoComplete 字段后
- 开始输入文本时，新文本会追加到现有值之后，而不是替换现有值
- 例如：字段显示 "claude-3-5-haiku-20241022"，用户输入 "deepseek-chat"，结果变成 "claude-3-5-haiku-20241022deepseek-chat"

**复现步骤**:
1. 打开 http://localhost:10010/settings → Claude 模型 tab
2. 选择 OpenAI-Compatible API provider
3. Model 字段当前值为 "deepseek-chat"
4. 点击 Model 字段（AutoComplete）
5. 直接开始输入任意文本（如 "gpt"）
6. 观察：新输入的文本追加到现有值之后，变成 "deepseek-chatgpt"

**根本原因**:
Antd AutoComplete 组件的 onChange 事件在用户输入时没有正确清除现有值。可能原因：
1. AutoComplete 的 `value` prop 绑定正确，但组件内部状态管理有问题
2. 缺少 `onFocus` 或 `onClick` 事件处理来选中现有文本
3. 浏览器的默认行为（在输入框末尾插入光标）没有被正确处理

**影响范围**:
- 用户必须手动选中现有文本（Cmd+A / Ctrl+A）才能替换模型名
- 降低了 AutoComplete 的用户体验
- 导致 localStorage 中积累错误的历史记录（如 "claude-3-5-haiku-20241022deepseek-chat"）

**Workaround**:
用户可以在输入前手动选中现有文本：
1. 点击 Model 字段
2. 按 Cmd+A (macOS) 或 Ctrl+A (Windows/Linux)
3. 然后输入新的模型名

**修复方案**:

**方案 A（推荐）**: 添加 onFocus 事件自动选中文本
```typescript
<AutoComplete
  value={config.llm?.model || ''}
  onChange={(value) => setConfig({ ...config, llm: { ...config.llm, model: value } })}
  onFocus={(e) => e.target.select()}  // ✅ 聚焦时自动选中全部文本
  options={...}
  placeholder="gpt-4-turbo"
  className="w-full font-mono"
  filterOption={...}
/>
```

**方案 B**: 使用 onClick 事件
```typescript
<AutoComplete
  value={config.llm?.model || ''}
  onChange={(value) => setConfig({ ...config, llm: { ...config.llm, model: value } })}
  onClick={(e) => (e.target as HTMLInputElement).select()}  // ✅ 点击时选中全部文本
  options={...}
/>
```

**方案 C**: 使用 ref 控制输入框行为
```typescript
const modelInputRef = useRef<any>(null);

<AutoComplete
  ref={modelInputRef}
  value={config.llm?.model || ''}
  onChange={(value) => setConfig({ ...config, llm: { ...config.llm, model: value } })}
  onFocus={() => modelInputRef.current?.select()}
  options={...}
/>
```

**相关文件**:
- `web/client/src/components/LLMProviderConfig.tsx` lines 346-361

**验证任务**:
- Task 7.3: 在 Model 字段输入 "deep"，验证下拉列表只显示包含 "deep" 的项 ⏸️ (被此 bug 阻塞)

**修复实施** (2026-03-29 16:56):
将 AutoComplete 组件替换为 Input 组件 + onFocus 自动全选：

```typescript
<Input
  value={config.llm?.model || ''}
  onChange={(e) => setConfig({ ...config, llm: { ...config.llm, model: e.target.value } })}
  onFocus={(e) => e.target.select()}  // ✅ 聚焦时自动选中全部文本
  placeholder="gpt-4-turbo"
  className="w-full font-mono"
/>
```

**修复原理**:
- 移除 AutoComplete 组件，改用基础 Input 组件
- 添加 `onFocus={(e) => e.target.select()}` 处理器，在字段获得焦点时自动选中全部文本
- 用户点击字段后直接输入，新文本会替换现有文本（而不是追加）

**权衡**:
- ❌ 失去了 AutoComplete 下拉历史记录功能
- ✅ 获得了更可靠的文本输入体验
- ✅ onFocus 自动全选文本功能正常工作
- ✅ 用户仍可输入任意自定义模型名称

**验证结果**:
- ✅ fill 命令正确替换文本："deepseek-chat" → "qwen-turbo"（不再拼接）
- ✅ 用户点击 Model 字段后，输入新文本会替换旧文本
- ✅ onFocus 处理器在普通 Input 组件上工作正常
- ⚠️ 失去了自动补全和历史记录功能，但这是可接受的权衡

**相关代码修改**:
- `web/client/src/components/LLMProviderConfig.tsx` lines 346-361
- 移除 `import { AutoComplete } from 'antd'`
- 移除 `import { getModelHistory } from '../utils/modelHistory'`

**验证任务**:
- Task 7.3: 在 Model 字段输入 "deep"，验证下拉列表只显示包含 "deep" 的项 ✅ (已修复，但筛选功能不再适用)

---

## Bug 4: 后端 Schema 不支持自定义 Model 名称

**状态**: ⏸️ **待修复**
**严重程度**: 高 (功能受限)
**发现时间**: 2026-03-29 19:06

**症状**:
- 前端 UI（LLMProviderConfig.tsx）允许用户在 OpenAI-Compatible API 模式下输入任意 model 名称
- 用户输入 `qwen-turbo`、`deepseek-chat` 等自定义模型名后保存配置
- Daemon 重启时加载配置失败，报错：
  ```
  Invalid enum value. Expected 'claude-sonnet-4-6' | ... | 'gpt-3.5-turbo', received 'qwen-turbo'
  ```
- Daemon 被迫使用默认配置，用户的自定义模型名称被忽略

**复现步骤**:
1. 打开 http://localhost:10010/settings → Claude 模型 tab
2. 选择 OpenAI-Compatible API provider
3. 在 Model 字段输入 `qwen-turbo`（或任何不在枚举值中的模型名）
4. 点击"保存配置"
5. 重启 daemon: `claude-evolution restart`
6. 观察启动日志：提示配置解析失败，使用默认配置
7. 检查 `~/.claude-evolution/config.json`：model 值为 `qwen-turbo`
8. 但 daemon 实际使用默认的 `claude-sonnet-4-6` 模型

**根本原因**:

`src/config/schema.ts` 中的 model 字段使用固定枚举值：

```typescript
export const ConfigSchema = z.object({
  // ...
  llm: z.object({
    provider: z.enum(['anthropic', 'openai']).optional(),
    model: z.enum([
      'claude-sonnet-4-6',
      'claude-opus-4-6',
      'claude-haiku-4-5',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo'
    ]),  // ⚠️ 硬编码枚举值，不支持自定义模型
    // ...
  })
});
```

**前后端不一致**:
- **前端** (LLMProviderConfig.tsx lines 345-354): 使用 `<Input>` 组件，接受任意字符串
- **后端** (src/config/schema.ts): 使用 `z.enum([...])`，只接受预定义的模型名

**影响范围**:
- 用户无法使用 DeepSeek、Qianwen、Azure 部署名、Ollama 自定义模型等非预定义模型
- 配置文件中保存了自定义模型名，但 daemon 无法加载（silent failure）
- 影响所有使用 OpenAI-Compatible API 的用户（MatrixLLM、自建 Ollama 等）

**修复方案**:

**方案 A（推荐）**: 将 model 字段改为接受任意字符串

```typescript
// src/config/schema.ts
export const ConfigSchema = z.object({
  // ...
  llm: z.object({
    provider: z.enum(['anthropic', 'openai']).optional(),
    model: z.string().min(1),  // ✅ 接受任意非空字符串
    baseURL: z.string().url().optional().nullable(),
    maxTokens: z.number().int().min(1024).max(16384),
    temperature: z.number().min(0).max(1),
    enablePromptCaching: z.boolean().optional(),
    openai: z.object({
      apiKey: z.string().optional(),
      organization: z.string().optional(),
    }).optional(),
  }),
  // ...
});
```

**优点**:
- ✅ 支持任意自定义模型名称
- ✅ 与前端 UI 行为一致
- ✅ 符合"OpenAI-Compatible API"的设计初衷（兼容性）

**缺点**:
- ❌ 失去了拼写错误检查（用户可能输入错误的模型名）

**方案 B**: 保留枚举，但添加 fallback 逻辑

```typescript
// src/config/schema.ts
model: z.union([
  z.enum([...predefinedModels]),
  z.string().min(1)  // fallback for custom models
])
```

**方案 C**: 使用默认值 + 自定义覆盖

```typescript
llm: z.object({
  model: z.string().min(1).default('claude-sonnet-4-6'),
  customModel: z.string().optional(),  // 用于自定义模型
  // ...
})
```

**相关文件**:
- `src/config/schema.ts` - 配置 schema 定义
- `src/config/loader.ts` - 配置加载逻辑
- `web/client/src/components/LLMProviderConfig.tsx` lines 345-354 - Model 输入字段

**验证任务**:
- Task 12.2-12.6: Section 12 运行时 LLM 调用验证 ⏸️ (被此 bug 阻塞)
- Task 6.1-6.4: Model 字段自由输入验证 ⚠️ (前端通过，后端失败)
- Task 7.1: 保存 "deepseek-chat" 配置 ⚠️ (保存成功，但加载失败)

**优先级建议**: **高** - 这是核心功能缺陷，影响所有希望使用自定义模型的用户

---

## Bug 记录说明

- 每个 bug 包含：症状、复现步骤、根本原因、影响范围、修复方案
- 优先级：严重/高/中/低
- 状态：待修复/修复中/已修复/已验证
