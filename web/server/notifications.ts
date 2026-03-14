import notifier from 'node-notifier';
import path from 'path';
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

    // macOS 使用 AppleScript (更可靠)
    if (process.platform === 'darwin') {
      this.sendMacOSNotification(options, targetUrl);
    } else {
      // Windows/Linux 使用 node-notifier
      this.sendNodeNotification(options, targetUrl);
    }
  }

  /**
   * macOS 使用 AppleScript 发送通知
   */
  private sendMacOSNotification(options: NotificationOptions, targetUrl: string): void {
    const escapedTitle = options.title.replace(/"/g, '\\"');
    const escapedMessage = options.message.replace(/"/g, '\\"');
    const escapedSubtitle = '点击通知打开详情'.replace(/"/g, '\\"');

    // 创建 AppleScript 命令
    const script = `
      display notification "${escapedMessage}" with title "${escapedTitle}" subtitle "${escapedSubtitle}" sound name "default"
    `;

    exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
      if (error) {
        console.error('[Notification] AppleScript error:', error);
        // 降级到 node-notifier
        this.sendNodeNotification(options, targetUrl);
        return;
      }

      console.log(`[Notification] Sent via AppleScript: ${options.title}`);

      // AppleScript 通知不支持点击事件，所以直接打开浏览器
      console.log(`[Notification] Auto-opening browser: ${targetUrl}`);
      setTimeout(() => {
        this.openBrowser(targetUrl);
      }, 1000); // 1 秒后自动打开
    });
  }

  /**
   * Windows/Linux 使用 node-notifier
   */
  private sendNodeNotification(options: NotificationOptions, targetUrl: string): void {
    const notificationOptions: any = {
      title: options.title,
      message: options.message,
      sound: true,
      wait: true,
      timeout: 30,
      open: targetUrl,
    };

    notifier.notify(notificationOptions, (err: Error | null, response: string, metadata: any) => {
      if (err) {
        console.error('[Notification] Failed to send notification:', err);
        return;
      }

      console.log(`[Notification] Sent: ${options.title}`);
      console.log(`[Notification] Response:`, response);

      if (response !== 'timeout' && response !== 'closed') {
        console.log(`[Notification] User interacted (${response}), opening: ${targetUrl}`);
        this.openBrowser(targetUrl);
      }
    });

    notifier.once('click', () => {
      console.log(`[Notification] Click event, opening: ${targetUrl}`);
      this.openBrowser(targetUrl);
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
