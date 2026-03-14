import chalk from 'chalk';
import { platform } from 'os';
import * as macOS from '../../daemon/platform/macos.js';
import { ProcessManager } from '../../daemon/process-manager.js';
import { stopCommand } from './stop.js';

/**
 * Uninstall command - 卸载开机自启动
 */
export async function uninstallCommand(): Promise<void> {
  console.log(chalk.bold.cyan('🗑️  卸载 Claude Evolution 自启动服务'));
  console.log('');

  // 1. 检测操作系统
  const currentPlatform = platform();

  if (currentPlatform !== 'darwin') {
    console.error(chalk.red('❌ 当前仅支持 macOS'));
    console.log(chalk.gray('   Linux 和 Windows 支持即将推出'));
    process.exit(1);
  }

  try {
    // 2. 检查是否已安装
    const status = await macOS.getStatus();

    if (!status.installed) {
      console.log(chalk.yellow('⚠️  自启动服务未安装'));
      console.log('');
      console.log(chalk.cyan('💡 安装服务: claude-evolution install'));
      process.exit(0);
    }

    console.log(chalk.gray('正在卸载自启动服务...'));

    // 3. 停止运行中的守护进程
    const processManager = new ProcessManager();
    const isRunning = await processManager.isDaemonRunning();

    if (isRunning) {
      console.log(chalk.gray('  正在停止守护进程...'));
      try {
        await stopCommand({ force: false, timeout: 30000 });
        console.log(chalk.green('  ✓ 守护进程已停止'));
      } catch (error) {
        console.log(chalk.yellow('  ⚠️  停止守护进程失败，继续卸载...'));
      }
    }

    // 4. 卸载 LaunchAgent
    if (status.loaded) {
      console.log(chalk.gray('  正在卸载 LaunchAgent...'));
    }

    await macOS.uninstall();

    console.log(chalk.green('✓ LaunchAgent 已卸载'));
    console.log(chalk.gray(`  已删除: ${status.plistPath}`));

    // 5. 显示完成信息
    console.log('');
    console.log(chalk.bold.green('✅ 卸载完成'));
    console.log('');
    console.log(chalk.gray('守护进程将不再自动启动'));
    console.log('');
    console.log(chalk.bold('📋 后续操作:'));
    console.log(chalk.gray('  • 手动启动: claude-evolution start --daemon'));
    console.log(chalk.gray('  • 重新安装: claude-evolution install'));

  } catch (error) {
    console.error(chalk.red('❌ 卸载失败'));
    console.log(chalk.gray(`   ${error instanceof Error ? error.message : 'Unknown error'}`));

    // 提供手动卸载指导
    console.log('');
    console.log(chalk.bold('手动卸载步骤:'));
    console.log(chalk.gray('  1. launchctl unload ~/Library/LaunchAgents/com.claude-evolution.plist'));
    console.log(chalk.gray('  2. rm ~/Library/LaunchAgents/com.claude-evolution.plist'));

    process.exit(1);
  }
}
