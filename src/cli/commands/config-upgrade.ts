import chalk from 'chalk';
import { loadConfig, saveConfig } from '../../config/index.js';

/**
 * Config upgrade command - 升级配置到最新版本
 */
export async function configUpgradeCommand(): Promise<void> {
  console.log(chalk.bold.cyan('🔄 升级配置文件'));
  console.log('');

  try {
    // 1. 加载配置（会自动迁移）
    console.log(chalk.gray('正在加载配置...'));
    const config = await loadConfig();

    // 2. 保存配置（持久化迁移后的配置）
    console.log(chalk.gray('正在保存升级后的配置...'));
    await saveConfig(config);

    console.log(chalk.green('✓ 配置已升级到最新版本'));
    console.log('');

    // 3. 显示新增的配置项
    console.log(chalk.bold('新增配置:'));

    if (config.daemon) {
      console.log('');
      console.log(chalk.cyan('  守护进程配置 (daemon):'));
      console.log(chalk.gray(`    enabled: ${config.daemon.enabled}`));
      console.log(chalk.gray(`    pidFile: ${config.daemon.pidFile}`));
      console.log(chalk.gray(`    logFile: ${config.daemon.logFile}`));
      console.log(chalk.gray(`    logLevel: ${config.daemon.logLevel}`));
      console.log(chalk.gray(`    logRotation.maxSize: ${config.daemon.logRotation.maxSize}`));
      console.log(chalk.gray(`    logRotation.maxFiles: ${config.daemon.logRotation.maxFiles}`));
    }

    if (config.webUI) {
      console.log('');
      console.log(chalk.cyan('  Web UI 配置 (webUI):'));
      console.log(chalk.gray(`    enabled: ${config.webUI.enabled}`));
      console.log(chalk.gray(`    port: ${config.webUI.port}`));
      console.log(chalk.gray(`    host: ${config.webUI.host}`));
      console.log(chalk.gray(`    autoOpenBrowser: ${config.webUI.autoOpenBrowser}`));
      console.log(chalk.gray(`    corsOrigins: ${config.webUI.corsOrigins.join(', ')}`));
    }

    console.log('');
    console.log(chalk.bold('📋 下一步:'));
    console.log(chalk.gray('  • 查看配置: claude-evolution config list'));
    console.log(chalk.gray('  • 修改配置: claude-evolution config set <field> <value>'));

  } catch (error) {
    console.error(chalk.red('❌ 升级失败'));
    console.log(chalk.gray(`   ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }
}
