# 桌面通知功能说明

## 功能概述

claude-evolution 现在支持系统级桌面通知，当重要事件发生时会自动弹出通知。**点击通知会自动打开浏览器并跳转到相应页面**。

## 支持的平台

- ✅ **macOS** - 使用原生通知中心
- ✅ **Windows** - 使用 Windows 通知系统
- ✅ **Linux** - 使用 notify-send（需要安装 libnotify）

### Linux 安装依赖

```bash
# Ubuntu/Debian
sudo apt-get install libnotify-bin

# Fedora/RHEL
sudo dnf install libnotify

# Arch Linux
sudo pacman -S libnotify
```

## 通知类型和路由映射

| 通知类型 | 触发场景 | 点击跳转页面 |
|---------|---------|------------|
| 分析完成 | 后台分析任务完成 | `/review` - 查看新建议 |
| 分析失败 | 分析过程出错 | `/dashboard` - 系统概览 |
| 新建议 | 系统生成新建议 | `/review` - 查看建议 |
| 配置变更 | 系统配置被修改 | `/settings` - 配置页面 |
| 系统错误 | 系统运行错误 | `/dashboard` - 系统状态 |

## 通知示例

### 分析完成通知

```
标题: ✅ 分析完成
内容: 发现 5 条新建议 (耗时 2s)
点击: 打开 http://localhost:10010/review
```

### 新建议通知

```
标题: 💡 新建议
内容: 系统生成了 3 条新建议，请查看
点击: 打开 http://localhost:10010/review
```

## 使用方式

### 1. 启动 Web 服务器

```bash
# 启动服务器（会自动启用通知）
node web/server/dist/index.js

# 或使用开发模式
npm run dev:server
```

### 2. 触发通知

通知会在以下情况自动触发：

- ✅ 后台分析任务完成
- ✅ API 调用 `/api/analyze`
- ✅ 建议被批准或拒绝
- ⚠️ 系统发生错误

### 3. 测试通知

使用测试脚本：

```bash
./test-notifications.sh
```

或手动触发：

```bash
curl -X POST http://localhost:10010/api/analyze
```

## 配置选项

### 启用/禁用通知

通知默认启用。可以通过 Settings 页面或 API 控制：

```bash
# 将来支持（10.10 任务）
# 在 Web UI Settings 页面切换通知开关
```

### 自定义通知图标

编辑 `web/server/notifications.ts`:

```typescript
private getIconPath(): string | undefined {
  return path.join(__dirname, '../assets/icon.png');
}
```

## API 参考

### NotificationManager 类

```typescript
class NotificationManager {
  // 通用通知方法
  notify(options: NotificationOptions): void

  // 预定义通知方法
  notifyAnalysisComplete(stats: { newSuggestions: number; duration: number }): void
  notifyAnalysisFailed(error: string): void
  notifyNewSuggestions(count: number): void
  notifyConfigChanged(changedKeys: string[]): void
  notifySystemError(error: string): void

  // 控制方法
  enable(): void
  disable(): void
  isEnabled(): boolean
}
```

### 使用示例

```typescript
import { notificationManager } from './web/server/index.js';

// 发送分析完成通知
notificationManager.notifyAnalysisComplete({
  newSuggestions: 5,
  duration: 2
});

// 发送自定义通知
notificationManager.notify({
  title: '测试通知',
  message: '这是一条测试消息',
  type: 'analysis_complete'
});
```

## 跨平台兼容性

### macOS

- ✅ 原生通知中心
- ✅ 点击通知自动打开 Safari/Chrome
- ✅ 通知横幅和通知中心

### Windows

- ✅ Windows 10/11 通知系统
- ✅ 点击通知自动打开默认浏览器
- ✅ Action Center 集成

### Linux

- ✅ notify-send 通知
- ✅ 点击通知使用 xdg-open 打开浏览器
- ⚠️ 需要安装 libnotify-bin
- ⚠️ 桌面环境支持（GNOME/KDE/XFCE）

## 故障排查

### Linux 通知不显示

```bash
# 检查 notify-send 是否安装
which notify-send

# 测试通知
notify-send "测试" "通知测试"

# 安装依赖
sudo apt-get install libnotify-bin
```

### 通知显示但点击无效

检查浏览器是否设置为默认应用：

```bash
# macOS
defaults write com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers -array-add '{LSHandlerContentType=public.html;LSHandlerRoleAll=com.google.chrome;}'

# Linux
xdg-settings set default-web-browser firefox.desktop
```

### 通知被系统阻止

- macOS: 系统偏好设置 → 通知 → 允许"终端"或"Node"
- Windows: 设置 → 系统 → 通知 → 允许应用通知
- Linux: 检查桌面环境通知设置

## 下一步

- [ ] 在 Settings 页面添加通知开关 (任务 10.10)
- [ ] 添加通知声音配置
- [ ] 支持自定义通知模板
- [ ] 添加通知历史记录
