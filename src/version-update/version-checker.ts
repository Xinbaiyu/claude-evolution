import https from 'https';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { VersionUpdateDatabase } from './version-db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface VersionCheckResult {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  needsNotify: boolean;
  notifiedVersion: string | null;
}

export class VersionChecker {
  private db: VersionUpdateDatabase;
  private packageName = 'claude-evolution';
  private retryDelay = 60 * 60 * 1000; // 1 hour in milliseconds

  constructor() {
    this.db = new VersionUpdateDatabase();
  }

  /**
   * 获取当前安装的版本号
   */
  private getCurrentVersion(): string {
    try {
      // 编译后的代码在 dist/src/version-update/，需要向上三级到根目录
      const packageJsonPath = path.join(__dirname, '../../../package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      return packageJson.version;
    } catch (error) {
      console.error('读取 package.json 失败:', error);
      return '0.0.0';
    }
  }

  /**
   * 从 npm registry 获取最新版本
   */
  private async getLatestVersionFromNpm(): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = `https://registry.npmjs.org/${this.packageName}/latest`;

      https
        .get(url, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              resolve(json.version);
            } catch (error) {
              reject(new Error('解析 npm 响应失败'));
            }
          });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * 比较两个版本号
   * @returns 如果 v1 < v2 返回 true
   */
  private isNewerVersion(current: string, latest: string): boolean {
    const v1Parts = current.split('.').map(Number);
    const v2Parts = latest.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1 = v1Parts[i] || 0;
      const v2 = v2Parts[i] || 0;

      if (v1 < v2) return true;
      if (v1 > v2) return false;
    }

    return false;
  }

  /**
   * 检查版本更新
   */
  async checkForUpdates(): Promise<VersionCheckResult> {
    try {
      const currentVersion = this.getCurrentVersion();
      const latestVersion = await this.getLatestVersionFromNpm();

      console.log(`[版本检查] 当前版本: ${currentVersion}, 最新版本: ${latestVersion}`);

      // 保存检查结果到数据库
      this.db.saveVersionCheck(currentVersion, latestVersion);

      // 判断是否有更新
      const hasUpdate = this.isNewerVersion(currentVersion, latestVersion);

      // 获取已通知的版本
      const latestRecord = this.db.getLatest();
      const notifiedVersion = latestRecord?.notified_version ?? null;

      // 判断是否需要通知：
      // 1. 有更新
      // 2. 且（未通知过 或 最新版本比已通知版本更新）
      const needsNotify =
        hasUpdate &&
        (!notifiedVersion || this.isNewerVersion(notifiedVersion, latestVersion));

      return {
        currentVersion,
        latestVersion,
        hasUpdate,
        needsNotify,
        notifiedVersion,
      };
    } catch (error) {
      console.error('[版本检查] 检查失败:', error);
      throw error;
    }
  }

  /**
   * 标记版本已通知
   */
  markAsNotified(version: string): void {
    const latestRecord = this.db.getLatest();
    if (latestRecord) {
      this.db.markNotified(latestRecord.id, version);
    }
  }

  /**
   * 定时检查版本，失败时自动重试
   */
  async scheduleCheck(onUpdate?: (result: VersionCheckResult) => void): Promise<void> {
    try {
      const result = await this.checkForUpdates();

      if (result.needsNotify && onUpdate) {
        onUpdate(result);
      }
    } catch (error) {
      console.error('[版本检查] 检查失败，将在 1 小时后重试');

      // 1 小时后重试
      setTimeout(() => {
        this.scheduleCheck(onUpdate);
      }, this.retryDelay);
    }
  }

  /**
   * 清理旧记录
   */
  cleanup(): void {
    this.db.cleanup();
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.db.close();
  }
}
