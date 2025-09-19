import { Command } from 'commander';
import { PublicKey, Keypair } from '@solana/web3.js';
import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import * as ProgressBar from 'cli-progress';
import inquirer from 'inquirer';

import { ConfigManager } from '../../config';
import { ConfigManager as ConfigManagerClass } from '../../infrastructure/config/ConfigManager';
import { WalletCollectorService } from '../../application/services/WalletCollectorService';
import { DistributionService } from '../../application/services/DistributionService';
import { FileStorage } from '../../infrastructure/storage';
import { createLogger } from '../../infrastructure/logging/Logger';
import {
  NetworkType,
  OutputFormat,
  TokenHolder,
  DistributionRequest
} from '../../domain/models';
import {
  TributaryError,
  ValidationError,
  ConfigurationError,
  ErrorCodes
} from '../../domain/errors';

export class TributaryCLI {
  private program: Command;
  private configManager: ConfigManager;
  private storage: FileStorage;
  private logger = createLogger('TributaryCLI');

  constructor() {
    this.program = new Command();
    this.configManager = new ConfigManager();
    this.storage = new FileStorage();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('tributary')
      .description('Solana token distribution system')
      .version('0.1.0')
      .option('--config <path>', 'Configuration file path', './tributary.toml')
      .option('--output <format>', 'Output format (table/json/yaml)', 'table')
      .option('--log-level <level>', 'Log level (debug/info/warn/error)', 'info')
      .option('--network <network>', 'Network override (devnet/testnet/mainnet-beta)')
      .hook('preAction', (thisCommand) => {
        const opts = thisCommand.opts();
        this.configManager.setConfigPath(opts.config);
      });

    this.setupInitCommand();
    this.setupCollectCommand();
    this.setupDistributeCommand();
    this.setupConfigCommand();
  }

  private setupInitCommand(): void {
    this.program
      .command('init')
      .description('Initialize project configuration')
      .requiredOption('--name <name>', 'Project name (1-100 characters)')
      .requiredOption('--token <address>', 'Base token address (Solana Base58 format)')
      .requiredOption('--admin <address>', 'Admin wallet address')
      .option('--network <network>', 'Target network', 'devnet')
      .option('--force, -f', 'Overwrite existing configuration')
      .option('--interactive, -i', 'Interactive mode')
      .action(async (options) => {
        try {
          await this.handleInit(options);
        } catch (error) {
          this.handleError(error, ErrorCodes.CONFIGURATION_ERROR);
        }
      });
  }

  private setupCollectCommand(): void {
    this.program
      .command('collect')
      .description('Collect token holders')
      .option('--token <address>', 'Token address to collect holders for')
      .option('--threshold <amount>', 'Minimum balance threshold', '0')
      .option('--max-holders <number>', 'Maximum number of holders to collect')
      .option('--output-file <path>', 'Output file path')
      .option('--cache, -c', 'Use cache', true)
      .option('--cache-ttl <seconds>', 'Cache TTL in seconds', '3600')
      .option('--exclude <addresses>', 'Exclude addresses (comma-separated)')
      .action(async (options) => {
        try {
          await this.handleCollect(options);
        } catch (error) {
          this.handleError(error, ErrorCodes.GENERAL_ERROR);
        }
      });
  }

  private setupDistributeCommand(): void {
    const distributeCmd = this.program
      .command('distribute')
      .description('Token distribution operations');

    distributeCmd
      .command('execute')
      .description('Execute token distribution')
      .requiredOption('--amount <amount>', 'Total distribution amount')
      .option('--token <address>', 'Distribution token address')
      .option('--dry-run', 'Dry run execution')
      .option('--batch-size <number>', 'Batch size', '10')
      .option('--confirm, -y', 'Skip confirmation prompt')
      .option('--wallet-file <path>', 'Private key file path')
      .action(async (options) => {
        try {
          await this.handleDistributeExecute(options);
        } catch (error) {
          this.handleError(error, ErrorCodes.GENERAL_ERROR);
        }
      });

    distributeCmd
      .command('simulate')
      .description('Simulate token distribution')
      .option('--amount <amount>', 'Distribution amount')
      .option('--token <address>', 'Token address')
      .option('--batch-size <number>', 'Batch size for simulation', '10')
      .option('--detail', 'Show detailed results')
      .action(async (options) => {
        try {
          await this.handleDistributeSimulate(options);
        } catch (error) {
          this.handleError(error, ErrorCodes.GENERAL_ERROR);
        }
      });

    distributeCmd
      .command('history')
      .description('Show distribution history')
      .option('--limit <number>', 'Limit results', '50')
      .option('--from <date>', 'Start date (YYYY-MM-DD)')
      .option('--to <date>', 'End date (YYYY-MM-DD)')
      .option('--format <format>', 'Output format (table/json/csv)', 'table')
      .action(async (options) => {
        try {
          await this.handleDistributeHistory(options);
        } catch (error) {
          this.handleError(error, ErrorCodes.GENERAL_ERROR);
        }
      });
  }

  private setupConfigCommand(): void {
    const configCmd = this.program
      .command('config')
      .description('Configuration management');

    configCmd
      .command('show')
      .description('Show current configuration')
      .option('--section <section>', 'Show specific section')
      .option('--format <format>', 'Output format (table/json/yaml)', 'table')
      .option('--show-secrets', 'Show sensitive information')
      .action(async (options) => {
        try {
          await this.handleConfigShow(options);
        } catch (error) {
          this.handleError(error, ErrorCodes.CONFIGURATION_ERROR);
        }
      });

    configCmd
      .command('validate')
      .description('Validate configuration')
      .option('--strict', 'Strict validation mode')
      .option('--check-network', 'Check network connectivity')
      .action(async (options) => {
        try {
          await this.handleConfigValidate(options);
        } catch (error) {
          this.handleError(error, ErrorCodes.VALIDATION_ERROR);
        }
      });

    configCmd
      .command('export')
      .description('Export configuration')
      .option('--output <path>', 'Output file path')
      .option('--format <format>', 'Export format (toml/json/yaml)', 'toml')
      .option('--exclude-secrets', 'Exclude sensitive information')
      .action(async (options) => {
        try {
          await this.handleConfigExport(options);
        } catch (error) {
          this.handleError(error, ErrorCodes.GENERAL_ERROR);
        }
      });
  }

  private async handleInit(options: any): Promise<void> {
    this.logger.info('Initializing Tributary project');

    if (options.interactive) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Project name:',
          validate: (input) => input.length >= 1 && input.length <= 100
        },
        {
          type: 'input',
          name: 'token',
          message: 'Base token address:',
          validate: this.validateSolanaAddress
        },
        {
          type: 'input',
          name: 'admin',
          message: 'Admin wallet address:',
          validate: this.validateSolanaAddress
        },
        {
          type: 'list',
          name: 'network',
          message: 'Select network:',
          choices: ['devnet', 'testnet', 'mainnet-beta']
        }
      ]);
      Object.assign(options, answers);
    }

    this.validateRequiredOptions(options, ['name', 'token', 'admin']);

    const config = await this.configManager.initializeProject({
      name: options.name,
      baseToken: options.token,
      adminWallet: options.admin,
      network: options.network as NetworkType,
      force: options.force
    });

    console.log(chalk.green('✅ Project initialized successfully'));
    console.log(chalk.blue('📁 Project name:'), config.project.name);
    console.log(chalk.blue('🌐 Network:'), config.project.network);
    console.log(chalk.blue('🪙 Base token:'), config.token.base_token);
    console.log(chalk.blue('👤 Admin wallet:'), config.token.admin_wallet);
    console.log(chalk.blue('📄 Config saved to:'), this.configManager.getConfigPath());
  }

  private async handleCollect(options: any): Promise<void> {
    await this.loadConfig();
    const config = this.configManager.getProjectConfig();

    // Use network override if provided
    const globalOpts = this.program.opts();
    const network = (globalOpts.network || config.network) as NetworkType;

    const tokenAddress = options.token
      ? new PublicKey(options.token)
      : config.baseToken;

    const collectorService = new WalletCollectorService(network);

    const collectOptions = {
      tokenAddress,
      threshold: options.threshold ? parseFloat(options.threshold) : 0,
      maxHolders: options.maxHolders ? parseInt(options.maxHolders) : undefined,
      useCache: options.cache,
      cacheTtl: options.cacheTtl ? parseInt(options.cacheTtl) : 3600,
      excludeAddresses: options.exclude
        ? options.exclude.split(',').map((addr: string) => new PublicKey(addr.trim()))
        : undefined
    };

    console.log(chalk.blue('🔍 Collecting token holders...'));
    console.log(`Token: ${tokenAddress.toString()}`);
    console.log(`Network: ${network}`);
    console.log(`Threshold: ${collectOptions.threshold} tokens`);

    const progressBar = new ProgressBar.SingleBar({
      format: chalk.cyan('Progress') + ' |{bar}| {percentage}% | {value}/{total} holders | Rate: {rate} holders/sec',
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true
    });

    const holders = await collectorService.collectWallets(
      collectOptions,
      (progress) => {
        if (!progressBar.getTotal()) {
          progressBar.start(progress.total, progress.current, { rate: progress.rate.toFixed(1) });
        }
        progressBar.update(progress.current, { rate: progress.rate.toFixed(1) });
      }
    );

    progressBar.stop();

    console.log(chalk.green('✅ Collection completed'));
    console.log(chalk.blue('👥 Total holders found:'), holders.length);

    if (options.outputFile) {
      let format = 'json';
      if (options.outputFile.endsWith('.csv')) {
        format = 'csv';
      } else if (options.outputFile.endsWith('.yaml') || options.outputFile.endsWith('.yml')) {
        format = 'yaml';
      }

      const outputPath = await collectorService.exportWallets(
        holders,
        format as any,
        options.outputFile
      );
      console.log(chalk.blue('💾 Saved to:'), outputPath);
    }

    this.displayTokenHolders(holders, this.getOutputFormat(options));
  }

  private async handleDistributeExecute(options: any): Promise<void> {
    await this.loadConfig();
    const config = this.configManager.getProjectConfig();

    // Use network override if provided
    const globalOpts = this.program.opts();
    const network = (globalOpts.network || config.network) as NetworkType;

    const amount = parseFloat(options.amount);
    if (amount <= 0) {
      throw new ValidationError('Amount must be positive');
    }

    const tokenAddress = options.token
      ? new PublicKey(options.token)
      : config.baseToken;

    const holders = await this.loadTokenHolders();
    if (holders.length === 0) {
      throw new ValidationError('No token holders found. Run collect command first.');
    }

    const adminKeypair = await this.loadAdminKeypair(options.walletFile);

    const distributionRequest: DistributionRequest = {
      amount,
      tokenAddress,
      holders,
      batchSize: options.batchSize ? parseInt(options.batchSize) : 10
    };

    const distributionService = new DistributionService(network, adminKeypair);

    if (options.dryRun) {
      console.log(chalk.yellow('🧪 Running dry run simulation...'));
      const simulation = await distributionService.simulateDistribution(distributionRequest);
      this.displaySimulationResult(simulation);
      return;
    }

    const validation = await distributionService.validateDistribution(distributionRequest);
    if (!validation.isValid) {
      console.log(chalk.red('❌ Distribution validation failed:'));
      validation.errors.forEach(error => console.log(chalk.red(`  • ${error}`)));
      process.exit(ErrorCodes.VALIDATION_ERROR);
    }

    if (validation.warnings.length > 0) {
      console.log(chalk.yellow('⚠️  Warnings:'));
      validation.warnings.forEach(warning => console.log(chalk.yellow(`  • ${warning}`)));
    }

    if (!options.confirm) {
      const { confirmed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmed',
        message: `Distribute ${amount} tokens to ${holders.length} recipients?`,
        default: false
      }]);

      if (!confirmed) {
        console.log(chalk.yellow('Distribution cancelled'));
        return;
      }
    }

    console.log(chalk.blue('🚀 Starting token distribution...'));

    const progressBar = new ProgressBar.SingleBar({
      format: chalk.cyan('Progress') + ' |{bar}| {percentage}% | {successful}/{total} | Rate: {rate} tx/sec',
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true
    });

    const distribution = await distributionService.executeDistribution(
      distributionRequest,
      (progress) => {
        if (!progressBar.getTotal()) {
          progressBar.start(progress.total, progress.completed, {
            successful: progress.successful,
            rate: progress.rate.toFixed(1)
          });
        }
        progressBar.update(progress.completed, {
          successful: progress.successful,
          rate: progress.rate.toFixed(1)
        });
      }
    );

    progressBar.stop();

    console.log(chalk.green('✅ Distribution completed'));
    console.log(chalk.blue('📊 Results:'));
    console.log(`  • Successful: ${distribution.getSuccessfulCount()}`);
    console.log(`  • Failed: ${distribution.getFailedCount()}`);
    console.log(`  • Total amount distributed: ${distribution.getTotalAmount()}`);
  }

  private async handleDistributeSimulate(options: any): Promise<void> {
    await this.loadConfig();
    const config = this.configManager.getProjectConfig();

    // Use network override if provided
    const globalOpts = this.program.opts();
    const network = (globalOpts.network || config.network) as NetworkType;

    const amount = options.amount ? parseFloat(options.amount) : 1000;
    const tokenAddress = options.token
      ? new PublicKey(options.token)
      : config.baseToken;

    const holders = await this.loadTokenHolders();
    if (holders.length === 0) {
      throw new ValidationError('No token holders found. Run collect command first.');
    }

    const distributionRequest: DistributionRequest = {
      amount,
      tokenAddress,
      holders,
      batchSize: options.batchSize ? parseInt(options.batchSize) : 10
    };

    const adminKeypair = Keypair.generate(); // Dummy keypair for simulation
    const distributionService = new DistributionService(network, adminKeypair);

    const simulation = await distributionService.simulateDistribution(distributionRequest);
    this.displaySimulationResult(simulation);
  }

  private async handleDistributeHistory(options: any): Promise<void> {
    const distributionService = new DistributionService('devnet', Keypair.generate());
    const history = await distributionService.getDistributionHistory();

    const filteredHistory = history.slice(0, parseInt(options.limit));

    this.displayDistributionHistory(filteredHistory, options.format);
  }

  private async handleConfigShow(options: any): Promise<void> {
    await this.loadConfig();
    const config = this.configManager.getConfig();

    console.log(chalk.blue('📋 Project Configuration'));
    console.log();

    if (options.section) {
      const section = (config as any)[options.section];
      if (section) {
        console.log(JSON.stringify(section, null, 2));
      } else {
        throw new ValidationError(`Section '${options.section}' not found`);
      }
    } else {
      this.displayConfig(config, options.format, options.showSecrets);
    }
  }

  private async handleConfigValidate(_options: any): Promise<void> {
    const validation = await this.configManager.validateConfig();

    if (validation.isValid) {
      console.log(chalk.green('✅ Configuration is valid'));
    } else {
      console.log(chalk.red('❌ Configuration validation failed:'));
      validation.errors.forEach(error => console.log(chalk.red(`  • ${error}`)));
    }

    if (validation.warnings.length > 0) {
      console.log(chalk.yellow('⚠️  Warnings:'));
      validation.warnings.forEach(warning => console.log(chalk.yellow(`  • ${warning}`)));
    }

    process.exit(validation.isValid ? ErrorCodes.SUCCESS : ErrorCodes.VALIDATION_ERROR);
  }

  private async handleConfigExport(options: any): Promise<void> {
    await this.loadConfig();
    const config = this.configManager.getConfig();

    const outputPath = options.output || `config.${options.format}`;

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Filter out secrets if requested
    const exportConfig = options.excludeSecrets ? this.maskSecrets(config) : config;

    if (options.format === 'json') {
      await fs.writeFile(outputPath, JSON.stringify(exportConfig, null, 2));
    } else if (options.format === 'yaml') {
      // Add YAML support - for now export as JSON until yaml library is added
      await fs.writeFile(outputPath, JSON.stringify(exportConfig, null, 2));
    } else if (options.format === 'toml') {
      // Use the ConfigManager's TOML serialization
      const configManager = new ConfigManagerClass();
      const tomlContent = (configManager as any).stringifyToml(exportConfig);
      await fs.writeFile(outputPath, tomlContent);
    } else {
      // Default to JSON for unknown formats
      await fs.writeFile(outputPath, JSON.stringify(exportConfig, null, 2));
    }

    console.log(chalk.green('✅ Configuration exported to'), outputPath);
  }

  private async loadConfig(): Promise<void> {
    try {
      await this.configManager.loadConfig();
    } catch (error) {
      if (error instanceof ConfigurationError) {
        console.log(chalk.red('❌ Configuration not found. Run "tributary init" first.'));
        process.exit(ErrorCodes.CONFIGURATION_ERROR);
      }
      throw error;
    }
  }

  private async loadTokenHolders(): Promise<TokenHolder[]> {
    try {
      return await this.storage.readJson<TokenHolder[]>('wallets.json');
    } catch {
      return [];
    }
  }

  private async loadAdminKeypair(walletFile?: string): Promise<Keypair> {
    if (walletFile) {
      const keyData = await fs.readFile(walletFile, 'utf-8');
      const secretKey = JSON.parse(keyData);
      return Keypair.fromSecretKey(new Uint8Array(secretKey));
    }

    throw new ValidationError('Admin wallet keypair is required. Use --wallet-file option.');
  }

  private validateSolanaAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  private validateRequiredOptions(options: any, required: string[]): void {
    for (const field of required) {
      if (!options[field]) {
        throw new ValidationError(`${field} is required`);
      }
    }
  }

  private getOutputFormat(options: any): OutputFormat {
    const globalOpts = this.program.opts();
    return options.format || globalOpts.output || 'table';
  }

  private displayTokenHolders(holders: TokenHolder[], format: OutputFormat): void {
    if (format === 'json') {
      console.log(JSON.stringify(holders, null, 2));
    } else if (format === 'yaml') {
      // Simple YAML-like output for now - proper YAML library implementation recommended
      console.log('holders:');
      holders.slice(0, 10).forEach((h, i) => {
        console.log(`  - address: ${h.address.toString()}`);
        console.log(`    balance: ${h.balance.toFixed(4)}`);
        console.log(`    percentage: ${h.percentage.toFixed(2)}`);
        if (i < 9 && i < holders.length - 1) console.log();
      });
      if (holders.length > 10) {
        console.log(`# ... and ${holders.length - 10} more`);
      }
    } else {
      console.log();
      console.table(holders.slice(0, 10).map(h => ({
        Address: h.address.toString().substring(0, 12) + '...',
        Balance: h.balance.toFixed(4),
        Percentage: h.percentage.toFixed(2) + '%'
      })));
      if (holders.length > 10) {
        console.log(`... and ${holders.length - 10} more`);
      }
    }
  }

  private displaySimulationResult(simulation: any): void {
    console.log(chalk.blue('📊 Distribution Simulation Results'));
    console.log();
    console.log(`Total amount: ${simulation.distributionBreakdown.totalAmount}`);
    console.log(`Recipients: ${simulation.distributionBreakdown.recipientCount}`);
    console.log(`Average amount: ${simulation.distributionBreakdown.averageAmount.toFixed(4)}`);
    console.log(`Estimated gas cost: ${simulation.estimatedGasCost.toFixed(6)} SOL`);
    console.log(`Estimated duration: ${(simulation.estimatedDuration / 1000).toFixed(1)}s`);

    if (simulation.riskFactors.length > 0) {
      console.log();
      console.log(chalk.yellow('⚠️  Risk factors:'));
      simulation.riskFactors.forEach((risk: string) => console.log(chalk.yellow(`  • ${risk}`)));
    }
  }

  private displayDistributionHistory(history: any[], format: string): void {
    if (format === 'json') {
      console.log(JSON.stringify(history, null, 2));
    } else {
      console.table(history.map(h => ({
        ID: h.id.substring(0, 12) + '...',
        Date: new Date(h.createdAt).toLocaleDateString(),
        Recipients: h.request.holders.length,
        Amount: h.request.amount,
        Status: h.isCompleted() ? 'Completed' : 'Partial'
      })));
    }
  }

  private displayConfig(config: any, format: string, showSecrets: boolean): void {
    const displayConfig = showSecrets ? config : this.maskSecrets(config);

    if (format === 'json') {
      console.log(JSON.stringify(displayConfig, null, 2));
    } else {
      console.log(chalk.blue('📁 Project Information:'));
      console.log(`  Name: ${config.project.name}`);
      console.log(`  Network: ${config.project.network}`);
      console.log();
      console.log(chalk.blue('🪙 Token Configuration:'));
      console.log(`  Base token: ${config.token.base_token}`);
      console.log(`  Admin wallet: ${config.token.admin_wallet}`);
    }
  }

  private maskSecrets(config: any): any {
    const masked = JSON.parse(JSON.stringify(config));
    if (masked.token?.admin_wallet) {
      masked.token.admin_wallet = this.maskAddress(masked.token.admin_wallet);
    }
    return masked;
  }

  private maskAddress(address: string): string {
    return address.substring(0, 6) + '...' + address.substring(address.length - 6);
  }

  private handleError(error: unknown, defaultExitCode: number = ErrorCodes.GENERAL_ERROR): void {
    if (error instanceof TributaryError) {
      console.error(chalk.red(`❌ ${error.name}: ${error.message}`));
      process.exit(error.code);
    } else if (error instanceof Error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(defaultExitCode);
    } else {
      console.error(chalk.red(`❌ Unknown error: ${String(error)}`));
      process.exit(defaultExitCode);
    }
  }

  public async run(argv: string[]): Promise<void> {
    try {
      await this.program.parseAsync(argv);
    } catch (error) {
      this.handleError(error);
    }
  }
}