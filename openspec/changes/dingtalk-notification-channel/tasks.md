## 1. 类型与配置

- [x] 1.1 在 `src/notifications/webhook-types.ts` 定义 WebhookConfig、WebhookPreset 等类型
- [x] 1.2 在 `src/config/schema.ts` 扩展 RemindersConfigSchema，新增 `webhook` 配置段（Zod 校验）
- [x] 1.3 新增预设模板常量 `src/notifications/webhook-presets.ts`（dingtalk、feishu、wecom、slack-incoming）

## 2. 核心实现

- [x] 2.1 实现模板变量替换函数 `renderTemplate(template, vars)` 带 JSON 转义
- [x] 2.2 实现钉钉 HMAC-SHA256 签名函数 `signDingTalkUrl(url, secret)`
- [x] 2.3 实现 `WebhookChannel` 类（实现 `NotificationChannel` 接口），支持多 webhook 并行发送
- [x] 2.4 WebhookChannel 内部：根据 preset/template 解析请求体，发送 HTTP POST，处理错误

## 3. 集成

- [x] 3.1 在 `src/daemon/lifecycle.ts` 的提醒服务启动流程中注册 WebhookChannel
- [x] 3.2 确保 webhook URL 和 secret 不通过任何 REST API 暴露

## 4. 测试

- [x] 4.1 单元测试：模板变量替换（含特殊字符 JSON 转义）
- [x] 4.2 单元测试：钉钉签名函数正确性
- [x] 4.3 单元测试：WebhookChannel — 单个/多个 webhook 发送、失败降级、禁用跳过
- [x] 4.4 集成测试：配置 schema 校验（合法/缺字段/禁用场景）
- [x] 4.5 集成测试：lifecycle 启动时 WebhookChannel 注册验证

## 5. 文档与配置示例

- [x] 5.1 更新 remind skill 文档，说明 webhook 通道配置方法
- [x] 5.2 在默认配置模板中增加 webhook 配置示例（注释状态）
