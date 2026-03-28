# 验证过程中发现的 Bug

## Bug 1: CCR Provider 卡片选择失效

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

**验证任务**:
- Task 2.4: 点击 CCR 卡片，验证紫色高亮边框和阴影效果 ❌
- Task 5.1-5.4: CCR 表单字段验证 ⏸️ (被阻塞)

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

## Bug 记录说明

- 每个 bug 包含：症状、复现步骤、根本原因、影响范围、修复方案
- 优先级：严重/高/中/低
- 状态：待修复/修复中/已修复/已验证
