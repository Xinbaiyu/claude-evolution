import chalk from 'chalk';
import { platform } from 'os';
import * as macOS from '../../daemon/platform/macos.js';
import { ProcessManager } from '../../daemon/process-manager.js';

interface InstallOptions {
  enable?: boolean;
  port?: number;
}

/**
 * Install command - 配置开机自启动
 */
export async function installCommand(options: InstallOptions = {}): Promise<void> {
  console.log(chalk.bold.cyan('📦 安装 Claude Evolution 自启动服务'));
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

    if (status.installed) {
      console.log(chalk.yellow('⚠️  自启动服务已安装'));
      console.log(chalk.gray(`   位置: ${status.plistPath}`));
      console.log('');

      if (status.loaded) {
        console.log(chalk.green('   ✓ 已启用'));
      } else {
        console.log(chalk.gray('   ⏹  已禁用'));
      }

      console.log('');
      console.log(chalk.cyan('💡 卸载服务: claude-evolution uninstall'));
      process.exit(0);
    }

    // 3. 执行安装
    console.log(chalk.gray('正在配置 LaunchAgent...'));

    await macOS.install({
      port: options.port || 10010,
      autoLoad: options.enable !== false,
    });

    console.log(chalk.green('✓ LaunchAgent 已安装'));
    console.log(chalk.gray(`  位置: ${status.plistPath}`));

    // 4. 如果启用了自动加载，显示状态
    if (options.enable !== false) {
      console.log(chalk.green('✓ 已启用开机自启动'));
      console.log('');

      // 检查守护进程是否已运行
      const processManager = new ProcessManager();
      const isRunning = await processManager.isDaemonRunning();

      if (isRunning) {
        console.log(chalk.green('✓ 守护进程已运行'));
        console.log(chalk.cyan('  查看状态: claude-evolution status'));
      } else {
        console.log(chalk.yellow('⏳ 守护进程将在下次重启后自动启动'));
        console.log('');
        console.log(chalk.cyan('💡 立即启动: claude-evolution start --daemon'));
      }
    } else {
      console.log(chalk.gray('⏹  未启用 (使用 --enable 立即启用)'));
    }

    // 5. 显示使用提示
    console.log('');
    console.log(chalk.bold('📋 下一步:'));
    console.log(chalk.gray('  • 重启电脑后，守护进程将自动启动'));
    console.log(chalk.gray('  • 查看日志: claude-evolution logs -f'));
    console.log(chalk.gray('  • 查看状态: claude-evolution status'));
    console.log(chalk.gray('  • 卸载服务: claude-evolution uninstall'));

  } catch (error) {
    console.error(chalk.red('❌ 安装失败'));
    console.log(chalk.gray(`   ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }
}
