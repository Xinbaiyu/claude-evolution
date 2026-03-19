import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger.js';

const execAsync = promisify(exec);

/**
 * 系统通知工具
 * 支持 macOS, Linux, Windows
 */

export interface NotificationOptions {
  title: string;
  message: string;
  sound?: boolean;
  urgency?: 'low' | 'normal' | 'critical';
}

/**
 * 发送系统通知
 */
export async function sendNotification(options: NotificationOptions): Promise<void> {
  const { title, message, sound = true, urgency = 'normal' } = options;

  try {
    const platform = process.platform;

    if (platform === 'darwin') {
      // macOS
      await sendMacOSNotification(title, message, sound);
    } else if (platform === 'linux') {
      // Linux
      await sendLinuxNotification(title, message, urgency);
    } else if (platform === 'win32') {
      // Windows
      await sendWindowsNotification(title, message);
    } else {
      logger.warn('不支持的操作系统平台，跳过系统通知', { platform });
    }
  } catch (error) {
    logger.error('发送系统通知失败', error as Error);
  }
}

/**
 * macOS 通知 (使用 osascript)
 */
async function sendMacOSNotification(
  title: string,
  message: string,
  sound: boolean
): Promise<void> {
  const soundPart = sound ? ' sound name "Ping"' : '';
  const script = `display notification "${escapeQuotes(message)}" with title "${escapeQuotes(title)}"${soundPart}`;

  await execAsync(`osascript -e '${script}'`);
  logger.debug('macOS 系统通知已发送', { title });
}

/**
 * Linux 通知 (使用 notify-send)
 */
async function sendLinuxNotification(
  title: string,
  message: string,
  urgency: string
): Promise<void> {
  // 检查 notify-send 是否可用
  try {
    await execAsync('which notify-send');
  } catch {
    logger.warn('notify-send 未安装，无法发送系统通知');
    return;
  }

  await execAsync(`notify-send -u ${urgency} "${escapeQuotes(title)}" "${escapeQuotes(message)}"`);
  logger.debug('Linux 系统通知已发送', { title });
}

/**
 * Windows 通知 (使用 PowerShell)
 */
async function sendWindowsNotification(title: string, message: string): Promise<void> {
  const script = `
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
    $template = @"
    <toast>
      <visual>
        <binding template="ToastText02">
          <text id="1">${escapeXml(title)}</text>
          <text id="2">${escapeXml(message)}</text>
        </binding>
      </visual>
    </toast>
"@
    $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
    $xml.LoadXml($template)
    $toast = New-Object Windows.UI.Notifications.ToastNotification $xml
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Claude Evolution").Show($toast)
  `;

  await execAsync(`powershell -Command "${script}"`);
  logger.debug('Windows 系统通知已发送', { title });
}

/**
 * 转义引号
 */
function escapeQuotes(str: string): string {
  return str.replace(/"/g, '\\"').replace(/'/g, "\\'");
}

/**
 * 转义 XML 特殊字符
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 便捷方法：发送成功通知
 */
export async function notifySuccess(title: string, message: string): Promise<void> {
  await sendNotification({
    title: `✅ ${title}`,
    message,
    sound: false,
    urgency: 'normal',
  });
}

/**
 * 便捷方法：发送失败通知
 */
export async function notifyError(title: string, message: string): Promise<void> {
  await sendNotification({
    title: `❌ ${title}`,
    message,
    sound: true,
    urgency: 'critical',
  });
}

/**
 * 便捷方法：发送信息通知
 */
export async function notifyInfo(title: string, message: string): Promise<void> {
  await sendNotification({
    title: `ℹ️ ${title}`,
    message,
    sound: false,
    urgency: 'low',
  });
}
