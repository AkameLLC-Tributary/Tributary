import { Command } from 'commander';
import { PublicKey, Keypair } from '@solana/web3.js';
import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import * as ProgressBar from 'cli-progress';
import inquirer from 'inquirer';
import * as yaml from 'js-yaml';

// Import package.json for version
import * as packageJson from '../../../package.json';

import { ConfigManager } from '../../config';
import { ConfigManager as ConfigManagerClass } from '../../infrastructure/config/ConfigManager';
import { WalletCollectorService } from '../../application/services/WalletCollectorService';
import { DistributionService } from '../../application/services/DistributionService';
import { FileStorage } from '../../infrastructure/storage';
import { createLogger } from '../../infrastructure/logging/Logger';
import { getParameters } from '../../config/parameters';
import {
  NetworkType,
  OutputFormat,
  TokenHolder,
  DistributionRequest,
  DistributionMode
} from '../../domain/models';
import {
  TributaryError,
  ValidationError,
  ConfigurationError,
  ErrorCodes
} from '../../domain/errors';

export class TributaryCLI {
  private program: Command;
  private configManager: ConfigManagerClass;
  private storage: FileStorage;
  private logger = createLogger('TributaryCLI');
  private cliOptions: any = {};

  constructor() {
    this.program = new Command();
    this.configManager = new ConfigManagerClass();
    this.storage = new FileStorage();


    this.setupCommands();
  }

  private setupCommands(): void {
    const params = getParameters();


    this.program
      .name('tributary')
      .description('Solana token distribution system')
      .version(packageJson.version)
      .option('--config <path>', 'Configuration file path', './tributary.toml')
      .option('--output <format>', 'Output format (table/json/yaml)', 'table')
      .option('--log-level <level>', 'Log level (debug/info/warn/error)', params.logging.defaultLevel)
      .option('--network <network>', 'Network override (devnet/testnet/mainnet-beta)')
      .option('--rpc-url <url>', 'RPC endpoint URL override')
      .hook('preAction', (thisCommand) => {
        // Get global options from the parent program
        const globalOpts = thisCommand.parent?.opts() || this.program.opts();
        const rootOpts = this.program.opts();


        this.configManager.setConfigPath(globalOpts.config);

        // Store CLI options for use in services
        this.cliOptions = {
          network: globalOpts.network,
          rpcUrl: globalOpts.rpcUrl,
          logLevel: globalOpts.logLevel,
          outputFormat: globalOpts.output
        };
      });

    this.setupInitCommand();
    this.setupCollectCommand();
    this.setupDistributeCommand();
    this.setupConfigCommand();
    this.setupParametersCommand();
  }

  private setupInitCommand(): void {

    this.program
      .command('init')
      .description('Initialize project configuration')
      .requiredOption('--name <name>', 'Project name (1-100 characters)')
      .requiredOption('--token <address>', 'Base token address (Solana Base58 format)')
      .requiredOption('--admin <address>', 'Admin wallet address')
      .option('-f, --force', 'Overwrite existing configuration')
      .option('--interactive, -i', 'Interactive mode')
      .option('--devnet-rpc <url>', 'Custom devnet RPC endpoint URL')
      .option('--testnet-rpc <url>', 'Custom testnet RPC endpoint URL')
      .option('--mainnet-rpc <url>', 'Custom mainnet RPC endpoint URL')
      // Allow users to override parameter defaults during init
      .option('--batch-size <number>', 'Override default batch size', parseInt)
      .option('--network-timeout <ms>', 'Override network timeout (ms)', parseInt)
      .option('--max-retries <number>', 'Override max retries', parseInt)
      .option('--disable-encryption', 'Disable key encryption')
      .option('--disable-backup', 'Disable backup')
      .option('--disable-audit', 'Disable audit logging')
      .action(async (options) => {
        try {

          // Handle interactive mode before validation
          if (options.interactive) {
            await this.handleInteractiveInit(options);
          }
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
      .option('--cache [value]', 'Use cache (default: true)', 'true')
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
      .option('--batch-size <number>', 'Batch size', getParameters().distribution.defaultBatchSize.toString())
      .option('-y, --confirm', 'Skip confirmation prompt')
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
      .option('--mode <mode>', 'Distribution mode (equal|proportional)', 'proportional')
      .option('--minimum-amount <amount>', 'Minimum balance requirement', '0')
      .option('--batch-size <number>', 'Batch size for simulation', getParameters().distribution.defaultBatchSize.toString())
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

  private async handleInteractiveInit(options: any): Promise<void> {
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
      },
      {
        type: 'confirm',
        name: 'configureCustomRpc',
        message: 'Do you want to configure custom RPC endpoints?',
        default: false
      }
    ]);

    // If user wants to configure custom RPC endpoints, ask for them
    if (answers.configureCustomRpc) {
      const rpcAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'devnetRpc',
          message: 'Custom devnet RPC URL (leave empty for default):',
          validate: (input) => !input || this.validateUrl(input)
        },
        {
          type: 'input',
          name: 'testnetRpc',
          message: 'Custom testnet RPC URL (leave empty for default):',
          validate: (input) => !input || this.validateUrl(input)
        },
        {
          type: 'input',
          name: 'mainnetRpc',
          message: 'Custom mainnet RPC URL (leave empty for default):',
          validate: (input) => !input || this.validateUrl(input)
        }
      ]);
      Object.assign(answers, rpcAnswers);
    }

    // Set the global network option if provided in interactive mode
    if (answers.network) {
      this.program.setOptionValue('network', answers.network);
    }

    Object.assign(options, answers);
  }

  private async handleInit(options: any): Promise<void> {
    this.logger.info('Initializing Tributary project');

    // Get network from global options for init command (since it's removed from local options)
    const globalOpts = this.program.opts();

    // Validate required options and their values
    this.validateRequiredOptions(options, ['name', 'token', 'admin']);
    this.validateInitOptions(options, globalOpts);

    // Use network from global options, default from parameters if not specified
    const params = getParameters();
    const network = (globalOpts.network || params.network.defaultNetwork) as NetworkType;

    // Prepare custom RPC URLs if provided (USER INPUT - highest priority)
    const customRpcUrls: any = {};
    if (options.devnetRpc) customRpcUrls.devnet = options.devnetRpc;
    if (options.testnetRpc) customRpcUrls.testnet = options.testnetRpc;
    if (options.mainnetRpc) customRpcUrls['mainnet-beta'] = options.mainnetRpc;

    // Prepare user overrides (USER INPUT - highest priority)
    const overrides: any = {};

    // Distribution overrides
    if (options.batchSize !== undefined) {
      overrides.distribution = { batch_size: options.batchSize };
    }

    // Network overrides
    const networkOverrides: any = {};
    if (options.networkTimeout !== undefined) {
      networkOverrides.timeout = options.networkTimeout;
    }
    if (options.maxRetries !== undefined) {
      networkOverrides.max_retries = options.maxRetries;
    }
    if (Object.keys(networkOverrides).length > 0) {
      overrides.network = networkOverrides;
    }

    // Security overrides
    const securityOverrides: any = {};
    if (options.disableEncryption) {
      securityOverrides.key_encryption = false;
    }
    if (options.disableBackup) {
      securityOverrides.backup_enabled = false;
    }
    if (options.disableAudit) {
      securityOverrides.audit_log = false;
    }
    if (Object.keys(securityOverrides).length > 0) {
      overrides.security = securityOverrides;
    }

    // Logging overrides - use global CLI options

    if (this.cliOptions?.logLevel) {
      overrides.logging = { level: this.cliOptions.logLevel };
    }

    const config = await this.configManager.initializeProject({
      name: options.name,                    // USER INPUT - highest priority
      baseToken: options.token,              // USER INPUT - highest priority
      adminWallet: options.admin,            // USER INPUT - highest priority
      network: network,                      // USER INPUT - highest priority
      force: options.force,
      customRpcUrls: Object.keys(customRpcUrls).length > 0 ? customRpcUrls : undefined,
      overrides: Object.keys(overrides).length > 0 ? overrides : undefined
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
      useCache: options.cache === true || options.cache === 'true',
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

    // Auto-cleanup temporary files after collect operation
    try {
      await this.configManager.autoCleanupOnCommand();
    } catch (error) {
      // Don't fail the main operation if cleanup fails
      console.warn(chalk.yellow('⚠️ Temporary file cleanup warning:'), error instanceof Error ? error.message : String(error));
    }

    this.displayTokenHolders(holders, this.getOutputFormat(options));
  }

  private async handleDistributeExecute(options: any): Promise<void> {
    console.log('🔍 === handleDistributeExecute CALLED ===');
    console.log('options:', JSON.stringify(options, null, 2));
    await this.loadConfig();
    const config = this.configManager.getProjectConfig();

    console.log('🔍 CONFIG ANALYSIS:');
    console.log('config.baseToken raw:', config.baseToken);
    console.log('config.baseToken type:', typeof config.baseToken);
    console.log('config.baseToken constructor:', config.baseToken?.constructor?.name);
    console.log('config.baseToken toString:', config.baseToken?.toString?.());
    console.log('config.baseToken has toBuffer:', !!config.baseToken?.toBuffer);

    if (config.baseToken?.toBuffer) {
      try {
        const buffer = config.baseToken.toBuffer();
        console.log('🔍 CONFIG baseToken toBuffer SUCCESS, length:', buffer.length);
      } catch (e) {
        console.log('🔍 CONFIG baseToken toBuffer ERROR:', e instanceof Error ? e.message : String(e));
      }
    }

    // Use network override if provided
    const globalOpts = this.program.opts();
    const network = (globalOpts.network || config.network) as NetworkType;

    const amount = parseFloat(options.amount);
    if (amount <= 0) {
      throw new ValidationError('Amount must be positive');
    }

    console.log('🔍 STEP 1: Creating tokenAddress PublicKey');
    console.log('options.token:', options.token);
    console.log('config.baseToken:', config.baseToken?.toString());

    const tokenAddress = options.token
      ? new PublicKey(options.token)
      : config.baseToken;

    console.log('🔍 STEP 1 RESULT: tokenAddress created');
    console.log('tokenAddress.toString():', tokenAddress.toString());
    console.log('tokenAddress.toBuffer type:', typeof tokenAddress.toBuffer);
    console.log('tokenAddress.toBuffer is function:', typeof tokenAddress.toBuffer === 'function');

    console.log('🔍 STEP 2: Loading token holders');
    const holders = await this.loadTokenHolders(config.baseToken, network);
    if (holders.length === 0) {
      throw new ValidationError('No token holders found. Run collect command first.');
    }
    console.log('🔍 STEP 2 RESULT: holders loaded, count:', holders.length);
    console.log('First holder address type:', typeof holders[0]?.address);
    if (holders[0]?.address) {
      console.log('First holder toBuffer type:', typeof holders[0].address.toBuffer);
    }

    console.log('🔍 STEP 3: Loading admin keypair');
    const adminKeypair = await this.loadAdminKeypair(options.walletFile);
    console.log('🔍 STEP 3 RESULT: adminKeypair loaded');
    console.log('adminKeypair.publicKey.toBuffer type:', typeof adminKeypair.publicKey.toBuffer);

    console.log('🔍 STEP 4: Creating DistributionRequest');
    console.log('tokenAddress before request:', tokenAddress.toString());
    console.log('tokenAddress.toBuffer before request:', typeof tokenAddress.toBuffer);

    const distributionRequest: DistributionRequest = {
      amount,
      tokenAddress,
      holders,
      batchSize: options.batchSize ? parseInt(options.batchSize) : 10
    };

    console.log('🔍 STEP 4 RESULT: DistributionRequest created');
    console.log('request.tokenAddress.toBuffer type:', typeof distributionRequest.tokenAddress.toBuffer);

    const distributionService = new DistributionService(network, adminKeypair);

    if (options.dryRun) {
      console.log(chalk.yellow('🧪 Running dry run simulation...'));
      const simulation = await distributionService.simulateDistribution(distributionRequest);
      this.displaySimulationResult(simulation, true); // Always show details in dry-run
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

    console.log('🔍 STEP 5: About to call executeDistribution');
    console.log('distributionRequest.tokenAddress.toBuffer before execute:', typeof distributionRequest.tokenAddress.toBuffer);
    console.log('distributionRequest.holders[0].address.toBuffer before execute:', typeof distributionRequest.holders[0]?.address?.toBuffer);

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

    const holders = await this.loadTokenHolders(config.baseToken, network);
    if (holders.length === 0) {
      throw new ValidationError('No token holders found. Run collect command first.');
    }

    // Validate mode option
    const mode = options.mode as DistributionMode;
    if (mode && !['equal', 'proportional'].includes(mode)) {
      throw new ValidationError('Distribution mode must be either "equal" or "proportional"');
    }

    const distributionRequest: DistributionRequest = {
      amount,
      tokenAddress,
      holders,
      mode: mode || 'proportional',
      minimumAmount: options.minimumAmount ? parseFloat(options.minimumAmount) : 0,
      batchSize: options.batchSize ? parseInt(options.batchSize) : 10
    };

    const adminKeypair = Keypair.generate(); // Dummy keypair for simulation
    const distributionService = new DistributionService(network, adminKeypair);

    const simulation = await distributionService.simulateDistribution(distributionRequest);
    this.displaySimulationResult(simulation, options.detail);
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
      // Export as YAML format
      const yamlContent = yaml.dump(exportConfig, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      });
      await fs.writeFile(outputPath, yamlContent);
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

  private async loadTokenHolders(baseToken?: PublicKey, network?: NetworkType): Promise<TokenHolder[]> {
    try {
      interface RawTokenHolder {
        address: string;
        balance: number;
        percentage: number;
      }

      // First try to read from the cache directory with proper filename format
      if (baseToken) {
        try {
          const cacheKey = `wallets_${baseToken.toString()}_1_unlimited_none`;
          console.log('🔍 LOADING HOLDERS: Trying to read cache key:', cacheKey);
          const rawHolders = await this.storage.readCache<RawTokenHolder[]>(cacheKey);
          if (rawHolders) {
            console.log('🔍 LOADING HOLDERS: Successfully loaded', rawHolders.length, 'holders');
            return rawHolders.map(holder => ({
              address: new PublicKey(holder.address),
              balance: holder.balance,
              percentage: holder.percentage
            }));
          }
        } catch (error) {
          console.log('🔍 LOADING HOLDERS: Cache read failed:', error instanceof Error ? error.message : String(error));
          // Fall through to legacy format
        }
      }

      // Fallback to legacy wallets.json format
      const rawHolders = await this.storage.readJson<RawTokenHolder[]>('wallets.json');
      return rawHolders.map(holder => ({
        address: new PublicKey(holder.address),
        balance: holder.balance,
        percentage: holder.percentage
      }));
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

  private validateUrl(url: string): boolean | string {
    try {
      new URL(url);
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'URL must start with http:// or https://';
      }
      return true;
    } catch {
      return 'Invalid URL format';
    }
  }

  private validateRequiredOptions(options: any, required: string[]): void {
    for (const field of required) {
      if (!options[field]) {
        throw new ValidationError(`${field} is required`);
      }
    }
  }

  private validateInitOptions(options: any, globalOpts: any): void {
    // Validate project name
    if (!options.name || typeof options.name !== 'string' || options.name.trim() === '') {
      throw new ValidationError('Project name must be a non-empty string (1-100 characters)');
    }
    if (options.name.length > 100) {
      throw new ValidationError('Project name must be 100 characters or less');
    }

    // Validate token address
    if (!this.validateSolanaAddress(options.token)) {
      throw new ValidationError(`Invalid base token address: ${options.token}. Must be a valid Solana Base58 address.`);
    }

    // Validate admin wallet address
    if (!this.validateSolanaAddress(options.admin)) {
      throw new ValidationError(`Invalid admin wallet address: ${options.admin}. Must be a valid Solana Base58 address.`);
    }

    // Validate network (from global options or parameters)
    const params = getParameters();
    const network = globalOpts.network || params.network.defaultNetwork;
    const validNetworks = ['devnet', 'testnet', 'mainnet-beta'];
    if (!validNetworks.includes(network)) {
      throw new ValidationError(`Invalid network: ${network}. Must be one of: ${validNetworks.join(', ')}`);
    }

    // Validate optional parameters if provided
    if (options.batchSize !== undefined) {
      const batchSize = parseInt(options.batchSize);
      if (isNaN(batchSize) || batchSize < 1 || batchSize > 100) {
        throw new ValidationError('Batch size must be a number between 1 and 100');
      }
    }

    if (options.networkTimeout !== undefined) {
      const timeout = parseInt(options.networkTimeout);
      if (isNaN(timeout) || timeout < 1000 || timeout > 300000) {
        throw new ValidationError('Network timeout must be between 1000ms and 300000ms (5 minutes)');
      }
    }

    if (options.maxRetries !== undefined) {
      const retries = parseInt(options.maxRetries);
      if (isNaN(retries) || retries < 1 || retries > 10) {
        throw new ValidationError('Max retries must be between 1 and 10');
      }
    }

    if (options.logLevel && !['debug', 'info', 'warn', 'error'].includes(options.logLevel)) {
      throw new ValidationError('Log level must be one of: debug, info, warn, error');
    }

    // Validate custom RPC URLs if provided
    if (options.devnetRpc && !this.validateUrl(options.devnetRpc)) {
      throw new ValidationError(`Invalid devnet RPC URL: ${options.devnetRpc}`);
    }
    if (options.testnetRpc && !this.validateUrl(options.testnetRpc)) {
      throw new ValidationError(`Invalid testnet RPC URL: ${options.testnetRpc}`);
    }
    if (options.mainnetRpc && !this.validateUrl(options.mainnetRpc)) {
      throw new ValidationError(`Invalid mainnet RPC URL: ${options.mainnetRpc}`);
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

  private displaySimulationResult(simulation: any, showDetail?: boolean): void {
    console.log(chalk.blue('📊 Distribution Simulation Results'));
    console.log();
    console.log(`Total amount: ${simulation.distributionBreakdown.totalAmount}`);
    console.log(`Recipients: ${simulation.distributionBreakdown.recipientCount}`);
    console.log(`Average amount: ${simulation.distributionBreakdown.averageAmount.toFixed(4)}`);
    console.log(`Estimated gas cost: ${simulation.estimatedGasCost.toFixed(6)} SOL`);
    console.log(`Estimated duration: ${(simulation.estimatedDuration / 1000).toFixed(1)}s`);

    if (showDetail) {
      console.log();
      console.log(chalk.blue('📋 Detailed Breakdown:'));
      console.log(`  • Total recipients: ${simulation.distributionBreakdown.recipientCount}`);
      console.log(`  • Minimum amount per recipient: ${simulation.distributionBreakdown.minAmount?.toFixed(6) || 'N/A'}`);
      console.log(`  • Maximum amount per recipient: ${simulation.distributionBreakdown.maxAmount?.toFixed(6) || 'N/A'}`);
      console.log(`  • Gas cost per transaction: ${(simulation.estimatedGasCost / simulation.distributionBreakdown.recipientCount).toFixed(8)} SOL`);
      console.log(`  • Estimated total transactions: ${simulation.distributionBreakdown.recipientCount}`);
      console.log(`  • Processing batch size: ${simulation.batchSize || 10}`);
      console.log(`  • Estimated batches: ${Math.ceil(simulation.distributionBreakdown.recipientCount / (simulation.batchSize || 10))}`);
      console.log(`  • Network: ${simulation.network || 'testnet'}`);
      console.log(`  • Token decimals: ${simulation.tokenDecimals || 'Unknown'}`);
    }

    if (simulation.riskFactors.length > 0) {
      console.log();
      console.log(chalk.yellow('⚠️  Risk factors:'));
      simulation.riskFactors.forEach((risk: string) => console.log(chalk.yellow(`  • ${risk}`)));
    }

    if (showDetail) {
      console.log();
      console.log(chalk.blue('💡 Recommendations:'));
      console.log('  • Test on devnet before mainnet execution');
      console.log('  • Verify recipient addresses carefully');
      console.log('  • Ensure sufficient balance for gas fees');
      console.log('  • Consider using smaller batch sizes for large distributions');
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
      console.log(`  Name: ${displayConfig.project.name}`);
      console.log(`  Network: ${displayConfig.project.network}`);
      console.log();
      console.log(chalk.blue('🪙 Token Configuration:'));
      console.log(`  Base token: ${displayConfig.token.base_token}`);
      console.log(`  Admin wallet: ${displayConfig.token.admin_wallet}`);
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

  private setupParametersCommand(): void {
    this.program
      .command('parameters')
      .alias('params')
      .description('Manage parameter configuration')
      .addCommand(
        this.program
          .createCommand('init')
          .description('Initialize parameter configuration file')
          .option('-f, --force', 'Overwrite existing configuration file')
          .action(async (options) => {
            try {
              await this.handleParametersInit(options);
            } catch (error) {
              console.error(chalk.red('❌ Failed to initialize parameters:'), error instanceof Error ? error.message : String(error));
              process.exit(1);
            }
          })
      )
      .addCommand(
        this.program
          .createCommand('show')
          .description('Show current parameter configuration')
          .option('--verbose', 'Show detailed configuration')
          .action(async (options) => {
            try {
              await this.handleParametersShow(options);
            } catch (error) {
              console.error(chalk.red('❌ Failed to show parameters:'), error instanceof Error ? error.message : String(error));
              process.exit(1);
            }
          })
      )
      .addCommand(
        this.program
          .createCommand('validate')
          .description('Validate parameter configuration')
          .action(async () => {
            try {
              await this.handleParametersValidate();
            } catch (error) {
              console.error(chalk.red('❌ Failed to validate parameters:'), error instanceof Error ? error.message : String(error));
              process.exit(1);
            }
          })
      );
  }

  private async handleParametersInit(options: any): Promise<void> {
    const path = await import('path');
    const fs = await import('fs');

    const targetPath = './tributary-parameters.json';
    const templatePath = path.default.join(__dirname, '..', '..', 'tributary-parameters.example.json');

    // Check if file already exists
    try {
      await fs.promises.access(targetPath);
      if (!options.force) {
        console.log(chalk.yellow('⚠️ Parameter configuration file already exists.'));
        console.log(chalk.blue('💡 Use --force to overwrite, or edit the existing file:'));
        console.log(`   ${targetPath}`);
        return;
      }
    } catch {
      // File doesn't exist, continue
    }

    try {
      // Copy template file
      const templateContent = await fs.promises.readFile(templatePath, 'utf-8');
      await fs.promises.writeFile(targetPath, templateContent, 'utf-8');

      console.log(chalk.green('✅ Parameter configuration file initialized!'));
      console.log(chalk.blue('📄 File location:'), targetPath);
      console.log(chalk.blue('📝 Edit the file to customize your settings'));
      console.log();
      console.log(chalk.yellow('Next steps:'));
      console.log('  1. Edit tributary-parameters.json');
      console.log('  2. Validate with: tributary parameters validate');
      console.log('  3. View current settings: tributary parameters show');
    } catch (error) {
      throw new Error(`Failed to copy template file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleParametersShow(options: any): Promise<void> {
    const params = getParameters();

    console.log(chalk.blue('📋 Current Parameter Configuration'));
    console.log();

    if (options.verbose) {
      console.log(JSON.stringify(params, null, 2));
    } else {
      console.log(chalk.yellow('🌐 Network:'));
      console.log(`  Default Network: ${params.network.defaultNetwork}`);
      console.log(`  Timeout: ${params.network.timeout}ms`);
      console.log(`  Max Retries: ${params.network.maxRetries}`);
      console.log();

      console.log(chalk.yellow('📦 Distribution:'));
      console.log(`  Default Batch Size: ${params.distribution.defaultBatchSize}`);
      console.log(`  Max Batch Size: ${params.distribution.maxBatchSize}`);
      console.log(`  Batch Delay: ${params.distribution.batchDelayMs}ms`);
      console.log();

      console.log(chalk.yellow('📝 Logging:'));
      console.log(`  Level: ${params.logging.defaultLevel}`);
      console.log(`  Directory: ${params.logging.defaultDir}`);
      console.log(`  Console: ${params.logging.enableConsole ? 'enabled' : 'disabled'}`);
      console.log(`  File: ${params.logging.enableFile ? 'enabled' : 'disabled'}`);
      console.log();

      console.log(chalk.yellow('🔐 Security:'));
      console.log(`  Key Encryption: ${params.security.defaultKeyEncryption ? 'enabled' : 'disabled'}`);
      console.log(`  Backup: ${params.security.defaultBackupEnabled ? 'enabled' : 'disabled'}`);
      console.log(`  Audit Log: ${params.security.defaultAuditLog ? 'enabled' : 'disabled'}`);
    }

    console.log();
    console.log(chalk.blue('💡 Use --verbose for complete configuration'));
  }

  private async handleParametersValidate(): Promise<void> {
    try {
      const params = getParameters();

      console.log(chalk.blue('🔍 Validating Parameter Configuration'));
      console.log();

      let hasErrors = false;
      let hasWarnings = false;

      // Validate network settings
      if (params.network.timeout < 1000) {
        console.log(chalk.red('❌ Network timeout too low (minimum 1000ms)'));
        hasErrors = true;
      }

      if (params.network.maxRetries < 1) {
        console.log(chalk.red('❌ Max retries must be at least 1'));
        hasErrors = true;
      }

      // Validate distribution settings
      if (params.distribution.defaultBatchSize < 1) {
        console.log(chalk.red('❌ Default batch size must be at least 1'));
        hasErrors = true;
      }

      if (params.distribution.defaultBatchSize > params.distribution.maxBatchSize) {
        console.log(chalk.red('❌ Default batch size exceeds maximum batch size'));
        hasErrors = true;
      }

      // Performance warnings
      if (params.distribution.defaultBatchSize > 50) {
        console.log(chalk.yellow('⚠️ Large default batch size may impact performance'));
        hasWarnings = true;
      }

      if (params.network.timeout > 60000) {
        console.log(chalk.yellow('⚠️ Very high network timeout may slow operations'));
        hasWarnings = true;
      }

      // Security warnings
      if (!params.security.defaultKeyEncryption) {
        console.log(chalk.yellow('⚠️ Key encryption is disabled - consider enabling for security'));
        hasWarnings = true;
      }

      if (!params.security.defaultBackupEnabled) {
        console.log(chalk.yellow('⚠️ Backup is disabled - consider enabling to prevent data loss'));
        hasWarnings = true;
      }

      if (hasErrors) {
        console.log();
        console.log(chalk.red('❌ Configuration has errors that must be fixed'));
        process.exit(1);
      } else if (hasWarnings) {
        console.log();
        console.log(chalk.yellow('⚠️ Configuration has warnings but is valid'));
      } else {
        console.log(chalk.green('✅ Parameter configuration is valid'));
      }

    } catch (error) {
      console.log(chalk.red('❌ Failed to load parameter configuration'));
      throw error;
    }
  }
}