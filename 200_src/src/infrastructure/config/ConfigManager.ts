import { promises as fs } from 'fs';
import path from 'path';
import * as toml from 'toml';
import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';
import { ProjectConfig, NetworkType, LogLevel } from '../../domain/models';
import { ConfigurationError, ValidationError } from '../../domain/errors';
import { Logger, createLogger } from '../logging/Logger';
import { getParameters } from '../../config/parameters';
import { FileStorage } from '../storage/FileStorage';

// Create schema without defaults - we'll apply defaults after validation
const ProjectConfigSchema = z.object({
  project: z.object({
    name: z.string().min(1).max(100),
    created: z.string().datetime().optional(),
    network: z.enum(['devnet', 'testnet', 'mainnet-beta'])
  }),
  token: z.object({
    base_token: z.string().refine(addr => {
      try {
        new PublicKey(addr);
        return true;
      } catch {
        return false;
      }
    }, 'Invalid Solana address format'),
    admin_wallet: z.string().refine(addr => {
      try {
        new PublicKey(addr);
        return true;
      } catch {
        return false;
      }
    }, 'Invalid Solana address format')
  }),
  distribution: z.object({
    schedule: z.enum(['manual', 'weekly', 'monthly']).optional(),
    reward_token: z.string().optional(),
    auto_distribute: z.boolean().optional(),
    minimum_balance: z.number().min(0).optional(),
    batch_size: z.number().int().min(1).max(100).optional()
  }),
  security: z.object({
    key_encryption: z.boolean().optional(),
    backup_enabled: z.boolean().optional(),
    audit_log: z.boolean().optional()
  }),
  network: z.object({
    rpc_urls: z.object({
      devnet: z.string().url().optional(),
      testnet: z.string().url().optional(),
      'mainnet-beta': z.string().url().optional()
    }).optional(),
    timeout: z.number().int().min(1000).max(300000).optional(),
    max_retries: z.number().int().min(1).max(10).optional(),
    retry_delay: z.number().int().min(100).max(10000).optional()
  }).optional(),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
    log_dir: z.string().optional(),
    enable_console: z.boolean().optional(),
    enable_file: z.boolean().optional(),
    max_files: z.number().int().min(1).max(100).optional(),
    max_size: z.string().optional()
  }).optional()
});

export type ConfigData = z.infer<typeof ProjectConfigSchema>;

/**
 * Apply parameter defaults to configuration data
 * This ensures proper priority: User Input > Environment > Config File > Defaults
 */
function applyParameterDefaults(rawConfig: any): ConfigData {
  const params = getParameters();

  // Create a complete config with defaults
  const configWithDefaults = {
    project: {
      name: rawConfig.project?.name,
      created: rawConfig.project?.created,
      network: rawConfig.project?.network // This is always required from user
    },
    token: {
      base_token: rawConfig.token?.base_token,
      admin_wallet: rawConfig.token?.admin_wallet
    },
    distribution: {
      schedule: rawConfig.distribution?.schedule,
      reward_token: rawConfig.distribution?.reward_token,
      auto_distribute: rawConfig.distribution?.auto_distribute ?? false,
      minimum_balance: rawConfig.distribution?.minimum_balance ?? params.token.minimumBalance,
      batch_size: rawConfig.distribution?.batch_size ?? params.distribution.defaultBatchSize
    },
    security: {
      key_encryption: rawConfig.security?.key_encryption ?? params.security.defaultKeyEncryption,
      backup_enabled: rawConfig.security?.backup_enabled ?? params.security.defaultBackupEnabled,
      audit_log: rawConfig.security?.audit_log ?? params.security.defaultAuditLog
    },
    network: {
      rpc_urls: rawConfig.network?.rpc_urls,
      timeout: rawConfig.network?.timeout ?? params.network.timeout,
      max_retries: rawConfig.network?.max_retries ?? params.network.maxRetries,
      retry_delay: rawConfig.network?.retry_delay ?? params.network.retryDelay
    },
    logging: {
      level: rawConfig.logging?.level ?? params.logging.defaultLevel,
      log_dir: rawConfig.logging?.log_dir ?? params.logging.defaultDir,
      enable_console: rawConfig.logging?.enable_console !== undefined ? rawConfig.logging.enable_console : params.logging.enableConsole,
      enable_file: rawConfig.logging?.enable_file !== undefined ? rawConfig.logging.enable_file : params.logging.enableFile,
      max_files: rawConfig.logging?.max_files !== undefined ? rawConfig.logging.max_files : params.logging.maxFiles,
      max_size: rawConfig.logging?.max_size ?? params.logging.maxFileSize
    }
  };

  return configWithDefaults as ConfigData;
}

export class ConfigManager {
  private config: ConfigData | null = null;
  private configPath: string;
  private readonly logger: Logger;
  private readonly fileStorage: FileStorage;

  constructor(configPath = './tributary.toml') {
    this.configPath = path.resolve(configPath);
    this.logger = createLogger('ConfigManager');
    this.fileStorage = new FileStorage({ baseDir: path.dirname(configPath) });
  }

  public async loadConfig(): Promise<ConfigData> {
    return this.logger.logOperation('loadConfig', async () => {
      try {
        const configContent = await fs.readFile(this.configPath, 'utf-8');
        const rawConfig = toml.parse(configContent);

        // First validate the raw config structure
        const validatedRawConfig = ProjectConfigSchema.parse(rawConfig);

        // Then apply parameter defaults with proper priority
        this.config = applyParameterDefaults(validatedRawConfig);

        this.logger.info('Configuration loaded successfully', {
          configPath: this.configPath,
          projectName: this.config.project.name,
          network: this.config.project.network
        });

        return this.config;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new ConfigurationError(
            `Configuration file not found: ${this.configPath}`,
            { configPath: this.configPath }
          );
        }

        if (error instanceof z.ZodError) {
          const errorMessages = error.errors.map(err =>
            `${err.path.join('.')}: ${err.message}`
          ).join(', ');

          throw new ValidationError(
            `Invalid configuration: ${errorMessages}`,
            { errors: error.errors }
          );
        }

        throw new ConfigurationError(
          `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { configPath: this.configPath, error: String(error) }
        );
      }
    });
  }

  public async saveConfig(config: ConfigData): Promise<void> {
    return this.logger.logOperation('saveConfig', async () => {
      try {
        // Validate config structure before saving
        ProjectConfigSchema.parse(config);

        const configDir = path.dirname(this.configPath);
        await fs.mkdir(configDir, { recursive: true });

        const tomlContent = this.stringifyToml(config);
        await fs.writeFile(this.configPath, tomlContent, 'utf-8');

        this.config = config;

        this.logger.info('Configuration saved successfully', {
          configPath: this.configPath,
          projectName: config.project.name
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessages = error.errors.map(err =>
            `${err.path.join('.')}: ${err.message}`
          ).join(', ');

          throw new ValidationError(
            `Invalid configuration: ${errorMessages}`,
            { errors: error.errors }
          );
        }

        throw new ConfigurationError(
          `Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { configPath: this.configPath, error: String(error) }
        );
      }
    });
  }

  public async initializeProject(options: {
    name: string;
    baseToken: string;
    adminWallet: string;
    network: NetworkType;
    force?: boolean;
    customRpcUrls?: {
      devnet?: string;
      testnet?: string;
      'mainnet-beta'?: string;
    };
    // Allow users to override any parameter during initialization
    overrides?: {
      distribution?: Partial<ConfigData['distribution']>;
      security?: Partial<ConfigData['security']>;
      network?: Partial<ConfigData['network']>;
      logging?: Partial<ConfigData['logging']>;
    };
  }): Promise<ConfigData> {
    return this.logger.logOperation('initializeProject', async () => {
      if (!options.force && await this.configExists()) {
        throw new ConfigurationError(
          'Configuration file already exists. Use --force to overwrite.',
          { configPath: this.configPath }
        );
      }

      const params = getParameters();

      // Create base config with user's explicit input taking highest priority
      const baseConfig = {
        project: {
          name: options.name,          // USER INPUT - highest priority
          created: new Date().toISOString(),
          network: options.network     // USER INPUT - highest priority
        },
        token: {
          base_token: options.baseToken,    // USER INPUT - highest priority
          admin_wallet: options.adminWallet // USER INPUT - highest priority
        },
        distribution: {
          auto_distribute: false,
          minimum_balance: params.token.minimumBalance,
          batch_size: params.distribution.defaultBatchSize,
          // Apply user overrides if provided
          ...options.overrides?.distribution
        },
        security: {
          key_encryption: params.security.defaultKeyEncryption,
          backup_enabled: params.security.defaultBackupEnabled,
          audit_log: params.security.defaultAuditLog,
          // Apply user overrides if provided
          ...options.overrides?.security
        },
        network: {
          timeout: params.network.timeout,
          max_retries: params.network.maxRetries,
          retry_delay: params.network.retryDelay,
          rpc_urls: this.getDefaultRpcUrls(options.customRpcUrls),
          // Apply user overrides if provided
          ...options.overrides?.network
        },
        logging: {
          level: params.logging.defaultLevel,
          log_dir: params.logging.defaultDir,
          enable_console: params.logging.enableConsole,
          enable_file: params.logging.enableFile,
          max_files: params.logging.maxFiles,
          max_size: params.logging.maxFileSize,
          // Apply user overrides if provided
          ...options.overrides?.logging
        }
      };

      const config: ConfigData = baseConfig as ConfigData;

      await this.saveConfig(config);

      this.logger.info('Project initialized successfully', {
        projectName: options.name,
        network: options.network,
        configPath: this.configPath
      });

      return config;
    }, options);
  }

  public getConfig(): ConfigData {
    if (!this.config) {
      throw new ConfigurationError(
        'Configuration not loaded. Call loadConfig() first.',
        { configPath: this.configPath }
      );
    }
    return this.config;
  }

  public getProjectConfig(): ProjectConfig {
    const config = this.getConfig();

    console.log('🔍 ConfigManager.getProjectConfig() - Creating PublicKeys');
    console.log('config.token.base_token raw:', config.token.base_token);
    console.log('config.token.base_token type:', typeof config.token.base_token);

    const baseTokenPK = new PublicKey(config.token.base_token);
    console.log('🔍 baseToken PublicKey created');
    console.log('baseTokenPK type:', typeof baseTokenPK);
    console.log('baseTokenPK constructor:', baseTokenPK.constructor.name);
    console.log('baseTokenPK has toBuffer:', !!baseTokenPK.toBuffer);
    console.log('baseTokenPK toString():', baseTokenPK.toString());

    if (baseTokenPK.toBuffer) {
      try {
        const buffer = baseTokenPK.toBuffer();
        console.log('🔍 baseTokenPK.toBuffer() SUCCESS, length:', buffer.length);
      } catch (e) {
        console.log('🔍 baseTokenPK.toBuffer() ERROR:', e instanceof Error ? e.message : String(e));
      }
    }

    const adminWalletPK = new PublicKey(config.token.admin_wallet);
    console.log('🔍 adminWallet PublicKey created');

    return {
      name: config.project.name,
      network: config.project.network,
      baseToken: baseTokenPK,
      adminWallet: adminWalletPK,
      distributionSettings: {
        schedule: config.distribution.schedule,
        rewardToken: config.distribution.reward_token
          ? new PublicKey(config.distribution.reward_token)
          : undefined,
        autoDistribute: config.distribution.auto_distribute ?? false,
        minimumBalance: config.distribution.minimum_balance ?? 0,
        batchSize: config.distribution.batch_size ?? 10
      },
      securitySettings: {
        keyEncryption: config.security.key_encryption ?? false,
        backupEnabled: config.security.backup_enabled ?? false,
        auditLog: config.security.audit_log ?? false
      }
    };
  }

  public getNetworkConfig() {
    const config = this.getConfig();
    const params = getParameters();
    const currentNetwork = config.project.network;

    // Get network-specific RPC URL or fall back to default
    const networkRpcUrl = config.network?.rpc_urls?.[currentNetwork];

    return {
      network: currentNetwork,
      rpcUrl: networkRpcUrl,
      timeout: config.network?.timeout || params.network.timeout,
      maxRetries: config.network?.max_retries || params.network.maxRetries,
      retryDelay: config.network?.retry_delay || params.network.retryDelay
    };
  }

  public getLoggingConfig() {
    const config = this.getConfig();
    const params = getParameters();

    return {
      level: config.logging?.level || params.logging.defaultLevel as LogLevel,
      logDir: config.logging?.log_dir || params.logging.defaultDir,
      enableConsole: config.logging?.enable_console ?? params.logging.enableConsole,
      enableFile: config.logging?.enable_file ?? params.logging.enableFile,
      maxFiles: config.logging?.max_files || params.logging.maxFiles,
      maxSize: config.logging?.max_size || params.logging.maxFileSize
    };
  }

  public async updateConfig(updates: Partial<ConfigData>): Promise<void> {
    return this.logger.logOperation('updateConfig', async () => {
      const currentConfig = this.getConfig();
      const mergedConfig = this.deepMerge(currentConfig, updates) as ConfigData;
      await this.saveConfig(mergedConfig);
    }, { updates });
  }

  public async validateConfig(configPath?: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const pathToValidate = configPath || this.configPath;
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const configContent = await fs.readFile(pathToValidate, 'utf-8');
      const rawConfig = toml.parse(configContent);

      ProjectConfigSchema.parse(rawConfig);

      if (rawConfig.project?.network === 'mainnet-beta') {
        warnings.push('Using mainnet-beta network - ensure you have sufficient funds');
      }

      if (!rawConfig.security?.key_encryption) {
        warnings.push('Key encryption is disabled - consider enabling for better security');
      }

      if (!rawConfig.security?.backup_enabled) {
        warnings.push('Backup is disabled - consider enabling to prevent data loss');
      }

    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        errors.push(`Configuration file not found: ${pathToValidate}`);
      } else if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(err =>
          `${err.path.join('.')}: ${err.message}`
        ));
      } else {
        errors.push(`Failed to parse configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  public async configExists(): Promise<boolean> {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  public getConfigPath(): string {
    return this.configPath;
  }

  public setConfigPath(configPath: string): void {
    this.configPath = path.resolve(configPath);
    this.config = null; // Reset loaded config
  }

  private stringifyToml(obj: unknown): string {
    const lines: string[] = [];

    const stringify = (value: unknown, prefix = ''): void => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (prefix) {
          lines.push(`[${prefix}]`);
        }

        for (const [key, val] of Object.entries(value)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;

          if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            stringify(val, fullKey);
          } else {
            const tomlValue = this.formatTomlValue(val);
            lines.push(`${key} = ${tomlValue}`);
          }
        }

        if (prefix) {
          lines.push('');
        }
      }
    };

    stringify(obj);

    return lines.join('\n');
  }

  private formatTomlValue(value: unknown): string {
    if (typeof value === 'string') {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    if (typeof value === 'boolean') {
      return value.toString();
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (Array.isArray(value)) {
      return `[${value.map(v => this.formatTomlValue(v)).join(', ')}]`;
    }
    return `"${String(value)}"`;
  }

  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge((result[key] as Record<string, unknown>) || {}, source[key] as Record<string, unknown>);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  private getDefaultRpcUrls(customUrls?: {
    devnet?: string;
    testnet?: string;
    'mainnet-beta'?: string;
  }): { [key: string]: string } {
    const params = getParameters();

    // Priority: CLI options > environment variables > parameters > default public RPCs
    const defaultUrls = {
      devnet: customUrls?.devnet || process.env.TRIBUTARY_DEVNET_RPC || params.rpc.endpoints.devnet,
      testnet: customUrls?.testnet || process.env.TRIBUTARY_TESTNET_RPC || params.rpc.endpoints.testnet,
      "mainnet-beta": customUrls?.['mainnet-beta'] || process.env.TRIBUTARY_MAINNET_RPC || params.rpc.endpoints['mainnet-beta']
    };

    this.logger.info('Using default RPC URLs', {
      devnet: defaultUrls.devnet,
      testnet: defaultUrls.testnet,
      'mainnet-beta': defaultUrls['mainnet-beta']
    });

    return defaultUrls;
  }

  public async cleanupTempFiles(patterns?: string[]): Promise<number> {
    return this.logger.logOperation('cleanupTempFiles', async () => {
      try {
        const defaultPatterns = ['*.tmp', '*.temp', '*.log'];
        const cleanupPatterns = patterns || defaultPatterns;

        const cleanedCount = await this.fileStorage.cleanupTempFiles(cleanupPatterns);

        this.logger.info(`Temporary file cleanup completed`, {
          patterns: cleanupPatterns,
          cleanedCount
        });

        return cleanedCount;
      } catch (error) {
        throw new ConfigurationError(
          `Failed to cleanup temporary files: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { patterns, error: String(error) }
        );
      }
    });
  }

  public async autoCleanupOnCommand(): Promise<void> {
    try {
      const cleanedCount = await this.cleanupTempFiles();
      if (cleanedCount > 0) {
        this.logger.info(`Auto-cleanup removed ${cleanedCount} temporary files`);
      }
    } catch (error) {
      // Don't fail the main operation if cleanup fails
      this.logger.warn('Auto-cleanup failed', { error: String(error) });
    }
  }
}