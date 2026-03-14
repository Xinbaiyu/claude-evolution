import notifier from 'node-notifier';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 通知类型到页面路由的映射
const NOTIFICATION_ROUTES = {
  analysis_complete: '/review',
  analysis_failed: '/dashboard',
  new_suggestions: '/review',
  config_changed: '/settings',
  system_error: '/dashboard',
} as const;

type NotificationType = keyof typeof NOTIFICATION_ROUTES;

interface NotificationOptions {
  title: string;
  message: string;
  type: NotificationType;
  sound?: boolean;
  wait?: boolean;
}

export class NotificationManager {
  private baseUrl: string;
  private enabled: boolean = true;

  constructor(port: number = 10010) {
    this.baseUrl = `http://localhost:${port}`;
    this.checkNotificationSupport();
  }

  /**
   * 检测系统通知可用性
   */
  private async checkNotificationSupport() {
    try {
      // 在 Linux 上检查 notify-send 是否可用
      if (process.platform === 'linux') {
        try {
          await execAsync('which notify-send');
        } catch {
          console.warn('[Notification] notify-send not found on Linux. Desktop notifications may not work.');
          console.warn('[Notification] Install with: sudo apt-get install libnotify-bin');
        }
      }

      console.log(`[Notification] System notifications enabled for platform: ${process.platform}`);
    } catch (error) {
      console.error('[Notification] Failed to check notification support:', error);
    }
  }

  /**
   * 发送系统通知
   */
  public notify(options: NotificationOptions): void {
    if (!this.enabled) {
      console.log('[Notification] Notifications disabled');
      return;
    }

    const targetRoute = NOTIFICATION_ROUTES[options.type];
    const targetUrl = `${this.baseUrl}${targetRoute}`;

    console.log(`[Notification] Preparing notification: ${options.title}`);
    console.log(`[Notification] Target URL: ${targetUrl}`);

    // macOS 使用原生 osascript (更可靠，不需要额外依赖)
    if (process.platform === 'darwin') {
      this.sendMacOSNotification(options, targetUrl);
    } else {
      // Windows/Linux 使用 node-notifier
      this.sendNodeNotification(options, targetUrl);
    }
  }

  /**
   * macOS 原生通知 - 使用对话框确保用户一定能看到
   */
  private sendMacOSNotification(options: NotificationOptions, targetUrl: string): void {
    const escapedTitle = options.title.replace(/"/g, '\\"').replace(/'/g, "\\'");
    const escapedMessage = options.message.replace(/"/g, '\\"').replace(/'/g, "\\'");
    const escapedUrl = targetUrl.replace(/"/g, '\\"');

    // 方案1: 先尝试系统通知
    const notificationScript = `display notification "${escapedMessage}" with title "${escapedTitle}" sound name "Glass"`;

    console.log(`[Notification] 发送 macOS 系统通知...`);

    exec(`osascript -e '${notificationScript}'`, (error) => {
      if (error) {
        console.error('[Notification] ❌ 系统通知失败:', error.message);
        // 降级方案：使用对话框（一定会显示）
        this.sendMacOSDialog(escapedTitle, escapedMessage, escapedUrl);
      } else {
        console.log(`[Notification] ✅ 系统通知已发送`);
        console.log(`[Notification] 📋 用户可访问: ${targetUrl}`);
      }
    });
  }

  /**
   * macOS 对话框 - 降级方案，确保用户一定能看到
   */
  private sendMacOSDialog(title: string, message: string, url: string): void {
    // 使用非阻塞对话框
    const dialogScript = `display dialog "${message}\\n\\n访问: ${url}" with title "${title}" buttons {"知道了"} default button 1 with icon note giving up after 30`;

    console.log(`[Notification] 使用对话框显示通知（降级方案）`);

    exec(`osascript -e '${dialogScript}'`, (error) => {
      if (error) {
        console.error('[Notification] ❌ 对话框也失败了:', error.message);
      } else {
        console.log(`[Notification] ✅ 对话框已显示`);
      }
    });
  }

  /**
   * 使用 node-notifier 发送通知（跨平台，支持点击事件）
   */
  private sendNodeNotification(options: NotificationOptions, targetUrl: string): void {
    const notificationOptions: any = {
      title: options.title,
      message: options.message,
      sound: true,
      wait: true, // 等待用户交互
      timeout: 30,
      // 不设置 open 参数，避免自动打开
      // 只在用户点击时才打开
    };

    console.log(`[Notification] === 开始发送通知 ===`);
    console.log(`[Notification] Title: ${options.title}`);
    console.log(`[Notification] Message: ${options.message}`);
    console.log(`[Notification] Platform: ${process.platform}`);
    console.log(`[Notification] Target URL: ${targetUrl}`);
    console.log(`[Notification] Enabled: ${this.enabled}`);

    notifier.notify(notificationOptions, (err: Error | null, response: string, metadata: any) => {
      if (err) {
        console.error('[Notification] ❌ 通知发送失败:', err);
        console.error('[Notification] Error details:', JSON.stringify(err, null, 2));
        return;
      }

      console.log(`[Notification] ✅ 通知已发送: ${options.title}`);
      console.log(`[Notification] Response: ${response}`);
      console.log(`[Notification] Metadata:`, metadata);
    });

    // 监听点击事件
    notifier.once('click', () => {
      console.log(`[Notification] 🖱️ 用户点击了通知，正在打开浏览器: ${targetUrl}`);
      this.openBrowser(targetUrl);
    });

    // 监听超时事件
    notifier.once('timeout', () => {
      console.log(`[Notification] ⏰ 通知超时 (用户未交互)`);
    });
  }

  /**
   * 打开浏览器访问指定 URL
   */
  private openBrowser(url: string): void {
    const command = this.getOpenCommand(url);

    exec(command, (error) => {
      if (error) {
        console.error('[Notification] Failed to open browser:', error);
      } else {
        console.log(`[Notification] Browser opened: ${url}`);
      }
    });
  }

  /**
   * 获取打开浏览器的命令（跨平台）
   */
  private getOpenCommand(url: string): string {
    switch (process.platform) {
      case 'darwin':
        return `open "${url}"`;
      case 'win32':
        return `start "" "${url}"`;
      case 'linux':
        return `xdg-open "${url}"`;
      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }

  /**
   * 获取通知图标路径
   */
  private getIconPath(): string | undefined {
    // 可以自定义图标路径
    // return path.join(__dirname, '../assets/icon.png');
    return undefined; // 使用系统默认图标
  }

  /**
   * 启用通知
   */
  public enable(): void {
    this.enabled = true;
    console.log('[Notification] Notifications enabled');
  }

  /**
   * 禁用通知
   */
  public disable(): void {
    this.enabled = false;
    console.log('[Notification] Notifications disabled');
  }

  /**
   * 检查通知是否启用
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  // ========== 预定义通知方法 ==========

  /**
   * 分析完成通知（跳转到 /review）
   */
  public notifyAnalysisComplete(stats: { newSuggestions: number; duration: number }): void {
    this.notify({
      title: '✅ 分析完成',
      message: `发现 ${stats.newSuggestions} 条新建议 (耗时 ${stats.duration}s)`,
      type: 'analysis_complete',
    });
  }

  /**
   * 分析失败通知（跳转到 /dashboard）
   */
  public notifyAnalysisFailed(error: string): void {
    this.notify({
      title: '❌ 分析失败',
      message: error,
      type: 'analysis_failed',
    });
  }

  /**
   * 新建议生成通知（跳转到 /review）
   */
  public notifyNewSuggestions(count: number): void {
    this.notify({
      title: '💡 新建议',
      message: `系统生成了 ${count} 条新建议，请查看`,
      type: 'new_suggestions',
    });
  }

  /**
   * 配置变更通知（跳转到 /settings）
   */
  public notifyConfigChanged(changedKeys: string[]): void {
    this.notify({
      title: '⚙️ 配置已更新',
      message: `已更新: ${changedKeys.join(', ')}`,
      type: 'config_changed',
    });
  }

  /**
   * 系统错误通知（跳转到 /dashboard）
   */
  public notifySystemError(error: string): void {
    this.notify({
      title: '⚠️ 系统错误',
      message: error,
      type: 'system_error',
    });
  }
}
