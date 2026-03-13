# API 模式选择功能 - 实现完成

## ✅ 已实现的功能

### 1. 初始化流程中的 API 模式选择

在 `claude-evolution init` 时，用户现在可以选择：

**选项 1: 标准模式（推荐）**
- 直接连接 Anthropic API
- 需要真实的 Anthropic API Key
- 按 Anthropic 定价计费

**选项 2: 路由器模式**
- 通过 claude-code-router 转发
- 需要路由器运行在 localhost:3456
- 适用于内部服务或自定义端点

### 2. 自动配置验证

**路由器模式特性**:
- ✅ 自动检测路由器是否运行（`/api/config` 端点）
- ✅ 支持自定义端口配置
- ✅ 连接失败时提供清晰的错误提示
- ✅ 允许用户选择是否继续（即使连接失败）

### 3. 智能提示

根据选择的模式，显示对应的下一步操作：

**标准模式**:
```
下一步:
  1. 设置 Anthropic API Key:
     export ANTHROPIC_API_KEY="sk-ant-xxx..."
  2. 编辑配置模板
  3. 运行首次分析
```

**路由器模式**:
```
下一步:
  1. 确保 claude-code-router 正在运行:
     curl http://127.0.0.1:3456/api/config
  2. 设置环境变量 (任意值即可):
     export ANTHROPIC_API_KEY="test-key"
  3. 编辑配置模板
  4. 运行首次分析
```

---

## 🎬 使用演示

### 场景 A: 标准模式

```bash
$ claude-evolution init

🚀 欢迎使用 Claude Evolution!

📡 API 配置模式:

请选择您的使用方式:

[1] 标准模式 (推荐)
    直接连接 Anthropic API
    • 需要: 真实的 Anthropic API Key
    • 费用: 按 Anthropic 定价计费

[2] 路由器模式
    通过 claude-code-router 转发
    • 需要: 路由器运行在 localhost:3456
    • 适用: 内部服务或自定义端点

您的选择 [1/2]: (默认: 1) 1

✓ 使用标准 Anthropic API
请确保设置环境变量: ANTHROPIC_API_KEY

# ...后续配置流程...
```

**生成的配置**:
```json
{
  "llm": {
    "model": "claude-3-5-haiku-20241022",
    "maxTokens": 4096,
    "temperature": 0.3,
    "enablePromptCaching": false
    // 注意: 没有 baseURL
  }
}
```

### 场景 B: 路由器模式（成功连接）

```bash
$ claude-evolution init

您的选择 [1/2]: 2

正在验证路由器连接...
使用默认端口 3456? (Y/n): Y

✓ 已连接到 claude-code-router (http://127.0.0.1:3456)

# ...后续配置流程...
```

**生成的配置**:
```json
{
  "llm": {
    "model": "claude-3-5-haiku-20241022",
    "maxTokens": 4096,
    "temperature": 0.3,
    "enablePromptCaching": false,
    "baseURL": "http://127.0.0.1:3456"  // ✅ 已添加
  }
}
```

### 场景 C: 路由器模式（连接失败但继续）

```bash
您的选择 [1/2]: 2

正在验证路由器连接...
使用默认端口 3456? (Y/n): Y

⚠️  无法连接到 http://127.0.0.1:3456

可能原因:
  1. claude-code-router 未启动
  2. 端口配置不正确

是否继续初始化? (y/N): y

⚠️  已保存配置，但请确保启动路由器后再使用

# ...后续配置流程...
```

**生成的配置**:
```json
{
  "llm": {
    ...
    "baseURL": "http://127.0.0.1:3456"  // 仍然保存配置
  }
}
```

---

## 🔧 技术实现

### 修改的文件

**`src/cli/commands/init.ts`**:
1. 新增 `promptForApiMode()` 函数
   - 显示两种模式的选项
   - 路由器模式时验证连接
   - 支持自定义端口
   - 返回 API 配置对象

2. 更新 `promptForConfig()` 函数
   - 接收 `apiConfig` 参数
   - 合并到最终配置中

3. 更新初始化完成提示
   - 根据模式显示不同的下一步操作

### 配置结构

```typescript
interface Config {
  llm: {
    model: string;
    maxTokens: number;
    temperature: number;
    enablePromptCaching: boolean;
    baseURL?: string;  // 可选：仅路由器模式
  }
}
```

---

## ✅ 验证清单

- [x] 标准模式：不设置 `baseURL`
- [x] 路由器模式：设置 `baseURL`
- [x] 路由器连接验证
- [x] 自定义端口支持
- [x] 连接失败时的优雅处理
- [x] 不同模式的不同提示
- [x] 编译通过
- [x] 实际测试通过

---

## 📝 用户文档更新建议

需要更新以下文档：

### README.md
添加 API 模式说明：
```markdown
## 安装

### 初始化配置

claude-evolution 支持两种 API 模式：

1. **标准模式** - 直接使用 Anthropic API
2. **路由器模式** - 通过 claude-code-router 转发

运行初始化时选择您的模式：

\`\`\`bash
claude-evolution init
\`\`\`
```

### QUICKSTART.md
添加模式选择步骤说明

### ROUTER-SETUP.md
更新为：
```markdown
# 使用路由器模式

在初始化时选择 [2] 路由器模式即可自动配置。

如需手动切换模式：
\`\`\`bash
# 切换到路由器模式
claude-evolution config set llm.baseURL "http://127.0.0.1:3456"

# 切换回标准模式
claude-evolution config unset llm.baseURL
\`\`\`
```

---

## 🎉 完成状态

**核心功能**: ✅ 已完成
**测试验证**: ✅ 已通过
**用户体验**: ✅ 流畅友好
**文档**: ⏳ 待更新

---

## 🚀 下一步

1. ✅ **立即可用** - 功能已完全实现并可使用
2. 📝 更新用户文档（可选）
3. 🧪 更多边界情况测试（可选）
4. 💡 考虑添加 `switch-mode` 命令（未来增强）

**可以开始使用了！**
