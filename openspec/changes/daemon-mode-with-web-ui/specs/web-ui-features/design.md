# Web UI Features - Design Document

## 设计理念

**美学方向**: **技术-有机融合** - 结合开发工具的精确性与生命进化的流动性

### 视觉语言
- **配色方案**:
  - 背景: 深蓝灰渐变 (#0f172a → #1e293b)
  - 主色: 青蓝 (#0ea5e9) + 青绿 (#06b6d4) 渐变
  - 点缀: 琥珀色 (#f59e0b) 用于运行状态
  - 文本: 浅灰色系 (#f8fafc, #cbd5e1, #94a3b8)

- **字体系统**:
  - 标题/代码: JetBrains Mono - 等宽字体，技术感
  - 正文: Inter Tight - 现代无衬线字体，易读性强

- **背景效果**:
  - 动态网格图案 (40px × 40px)
  - 毛玻璃效果 (backdrop-filter: blur)
  - 微妙的渐变叠加

### 交互设计
- **动画效果**:
  - 按钮悬浮: translateY(-2px) + 阴影增强
  - 发光扫过: 按钮上的光带扫过效果
  - 脉动效果: 分析运行时的呼吸动画
  - 进度条: 闪烁的渐变流动

- **状态反馈**:
  - Loading: 旋转 Loader 图标
  - Success: 绿色 CheckCircle 图标
  - Error: 红色 AlertCircle 图标

---

## 1. Manual Analysis Trigger（手动触发分析）

### 组件位置
`web/client/src/components/ManualAnalysisTrigger.tsx`

### 功能特性

#### 1.1 主按钮
- **默认状态**: 青蓝渐变背景 + Play 图标
- **运行状态**: 琥珀色渐变 + 旋转 Loader + 脉动效果
- **禁用状态**: 降低透明度，禁用点击

#### 1.2 进度显示
- **进度条**: 闪烁渐变动画（shimmer effect）
- **计时器**: 显示 "分析中...Xm Ys"
- **样式**: 半透明背景 + 毛玻璃效果

#### 1.3 错误提示
- **布局**: 红色边框 + 浅红背景
- **图标**: AlertCircle
- **文字**: 错误信息

### 交互流程

```
用户点击按钮
    ↓
POST /api/analyze
    ↓
┌─────────────────────┬────────────────────┐
│    202 Accepted     │   409 Conflict     │
├─────────────────────┼────────────────────┤
│ 显示进度 + 计时器   │ Toast 提示冲突     │
│ 按钮变运行状态      │ 保持默认状态       │
│                     │                    │
│ 监听 WebSocket      │                    │
│ analysis_complete   │                    │
│      ↓              │                    │
│ Toast 通知          │                    │
│ 恢复默认状态        │                    │
└─────────────────────┴────────────────────┘
```

### 代码亮点

```typescript
// 脉动动画
@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.4);
  }
  50% {
    box-shadow: 0 0 30px rgba(245, 158, 11, 0.6);
  }
}

// 闪烁进度条
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
```

---

## 2. Settings Page（系统设置）

### 组件结构

```
Settings.tsx (主页面)
├─ SettingsTabs.tsx (Tab 内容)
│  ├─ SchedulerTab
│  ├─ LLMTab
│  └─ NotificationsTab
└─ FormControls.tsx (表单组件)
   ├─ ToggleSwitch
   ├─ Select
   └─ Checkbox
```

### 2.1 页面布局

#### 顶部标题
- **字体**: JetBrains Mono, 2.5rem, 粗体
- **副标题**: Inter Tight, 1rem, 灰色

#### Tab 导航
- **未激活**: 灰色文字 + 透明背景
- **悬浮**: 浅灰背景
- **激活**: 青蓝文字 + 底部边框

#### 内容区域
- **背景**: 半透明深色 + 毛玻璃
- **边框**: 微妙的灰色边框
- **内边距**: 2rem

#### 底部按钮
- **重置**: 灰色边框 + 透明背景
- **保存**: 青蓝渐变 + 白色文字 + 悬浮效果

### 2.2 Tab 1: 调度器配置

#### 配置项
1. **启用调度器**: ToggleSwitch
2. **分析间隔**: Select Dropdown
   - 每 6 小时
   - 每 12 小时
   - 每 24 小时
3. **启动时运行**: Checkbox（依赖调度器开关）

#### 表单样式
- **背景**: 深色半透明
- **边框**: 浅灰色，悬浮时加深
- **布局**: Flexbox 两端对齐
- **Label**: 主标题 + 灰色提示文字

### 2.3 Tab 2: LLM 配置

#### 接入方式选择
- **单选按钮组**: Radio Button
- **选项**:
  1. Anthropic API Key（默认）
  2. Claude Code Router

#### 动态表单
根据接入方式显示不同字段：

**Anthropic API Key**:
- API Key: Password Input（带显示/隐藏图标 👁️）
- 校验: 必填 + 以 "sk-ant-" 开头

**Claude Code Router**:
- Router URL: Text Input
- 校验: 必填 + 合法 URL

#### Claude 模型配置
1. **模型选择**: Select Dropdown
   - Claude Sonnet 4.6（默认）
   - Claude Opus 4.6
   - Claude Haiku 4.5

2. **Temperature**: Range Slider (0-1, 步长 0.1)
   - 显示当前值
   - 渐变滑块

3. **Max Tokens**: Number Input (1024-16384)

### 2.4 Tab 3: 通知配置

#### 配置项
1. **启用通知**: ToggleSwitch（总开关）
2. **桌面通知**: Checkbox（依赖总开关）
3. **声音提示**: Checkbox（依赖总开关）

---

## 3. 表单组件设计

### 3.1 ToggleSwitch

**样式**:
- 宽度: 48px
- 高度: 26px
- 滑块: 20px 圆形 + 阴影
- 激活: 青蓝渐变背景

**动画**:
```css
transform: translateX(22px);  /* 滑块滑动 */
transition: all 0.2s;
```

### 3.2 Select

**样式**:
- 背景: 深色半透明
- 边框: 浅灰色
- 字体: Inter Tight, 0.875rem
- 图标: 自定义下拉箭头（SVG）

**状态**:
- 悬浮: 边框加深
- 聚焦: 青蓝边框
- 禁用: 降低透明度

### 3.3 Checkbox

**样式**:
- 尺寸: 20px × 20px
- 边框: 2px 灰色
- 激活: 青蓝渐变背景 + 白色勾选标记

**勾选标记**:
```css
/* CSS 绘制的勾 */
width: 5px;
height: 10px;
border: solid white;
border-width: 0 2px 2px 0;
transform: rotate(45deg);
```

---

## 4. 颜色系统

### 主题色
```css
:root {
  /* 背景 */
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-card: rgba(15, 23, 42, 0.5);

  /* 主色调 */
  --primary: #0ea5e9;
  --primary-light: #06b6d4;

  /* 状态色 */
  --running: #f59e0b;
  --success: #10b981;
  --error: #ef4444;

  /* 文本 */
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  --text-disabled: #64748b;

  /* 边框 */
  --border-subtle: rgba(148, 163, 184, 0.1);
  --border-normal: rgba(148, 163, 184, 0.2);
  --border-strong: rgba(148, 163, 184, 0.3);
}
```

---

## 5. 字体加载

### 方式 1: Google Fonts CDN

```html
<!-- index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
```

### 方式 2: 本地字体（推荐）

```css
/* globals.css */
@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/JetBrainsMono-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/JetBrainsMono-Bold.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}
```

---

## 6. 响应式设计

### 断点
- **Desktop**: >= 1024px（主要目标）
- **Tablet**: 768px - 1023px（暂不实现）
- **Mobile**: < 768px（暂不实现）

### 固定宽度
```css
.settings-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}
```

---

## 7. 可访问性（A11y）

### 键盘导航
- Tab 键切换焦点
- Enter/Space 激活按钮
- 焦点环: 青蓝色 outline

### ARIA 属性
```html
<button role="switch" aria-checked="true">
<input type="checkbox" aria-label="桌面通知">
<select aria-label="分析间隔">
```

### 对比度
- 主文本: #f8fafc on #0f172a = 15.8:1 ✅
- 次要文本: #94a3b8 on #0f172a = 7.2:1 ✅

---

## 8. 性能优化

### CSS-in-JS
使用 `styled-jsx` 实现组件级样式隔离，避免全局污染。

### 懒加载
```typescript
const Settings = lazy(() => import('./pages/Settings'));
```

### 优化动画
- 使用 `transform` 和 `opacity`（GPU 加速）
- 避免触发 layout/paint

### 防抖 (Debounce)
Temperature slider 变化时防抖更新状态：
```typescript
const debouncedUpdate = useMemo(
  () => debounce((value) => updateLLM('temperature', value), 300),
  []
);
```

---

## 9. 浏览器兼容性

### 目标浏览器
- Chrome/Edge >= 90
- Firefox >= 88
- Safari >= 14

### Polyfills
- CSS `backdrop-filter`: 已广泛支持
- CSS Grid: 已广泛支持
- Fetch API: 已内置

---

## 10. 实现清单

### Phase 1: 核心功能
- [x] ManualAnalysisTrigger 组件
- [x] Settings 页面主结构
- [x] SchedulerTab
- [x] LLMTab
- [x] NotificationsTab
- [x] FormControls（Toggle/Select/Checkbox）

### Phase 2: 集成
- [ ] 集成到 Dashboard（替换现有按钮）
- [ ] 集成到路由（Settings 页面）
- [ ] API 调用测试
- [ ] WebSocket 事件测试

### Phase 3: 完善
- [ ] 添加 Toast 通知系统
- [ ] 错误边界处理
- [ ] 加载骨架屏
- [ ] 单元测试

---

## 11. 未来增强

### 高级配置
- 学习阶段阈值配置（低/中/高）
- 守护进程日志级别
- Web UI 端口设置

### 导入/导出
- 配置导出为 JSON
- 配置导入并验证

### 历史记录
- 显示最近 N 次配置变更
- 回滚到历史配置

### 预设模板
- 保守模式（低频分析）
- 平衡模式（默认）
- 激进模式（高频分析）
