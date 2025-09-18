import { promises as fs } from 'fs';
import path from 'path';
import * as toml from 'toml';
import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';
import { ProjectConfig, NetworkType, LogLevel } from '../../domain/models';
import { ConfigurationError, ValidationError } from '../../domain/errors';
import { Logger, createLogger } from '../logging/Logger';

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
    auto_distribute: z.boolean().default(false),
    minimum_balance: z.number().min(0).default(0),
    batch_size: z.number().int().min(1).max(100).default(10)
  }),
  security: z.object({
    key_encryption: z.boolean().default(true),
    backup_enabled: z.boolean().default(true),
    audit_log: z.boolean().default(true)
  }),
  network: z.object({
    rpc_url: z.string().url().optional(),
    timeout: z.number().int().min(1000).max(300000).default(30000),
    max_retries: z.number().int().min(1).max(10).default(3),
    retry_delay: z.number().int().min(100).max(10000).default(1000)
  }).optional(),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    log_dir: z.string().default('./logs'),
    enable_console: z.boolean().default(true),
    enable_file: z.boolean().default(true),
    max_files: z.number().int().min(1).max(100).default(14),
    max_size: z.string().default('20m')
  }).optional()
});

export type ConfigData = z.infer<typeof ProjectConfigSchema>;

export class ConfigManager {
  private config: ConfigData | null = null;
  private configPath: string;
  private readonly logger: Logger;

  constructor(configPath = './tributary.toml') {
    this.configPath = path.resolve(configPath);
    this.logger = createLogger('ConfigManager');
  }

  public async loadConfig(): Promise<ConfigData> {
    return this.logger.logOperation('loadConfig', async () => {
      try {
        const configContent = await fs.readFile(this.configPath, 'utf-8');
        const rawConfig = toml.parse(configContent);

        this.config = ProjectConfigSchema.parse(rawConfig);

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
  }): Promise<ConfigData> {
    return this.logger.logOperation('initializeProject', async () => {
      if (!options.force && await this.configExists()) {
        throw new ConfigurationError(
          'Configuration file already exists. Use --force to overwrite.',
          { configPath: this.configPath }
        );
      }

      const config: ConfigData = {
        project: {
          name: options.name,
          created: new Date().toISOString(),
          network: options.network
        },
        token: {
          base_token: options.baseToken,
          admin_wallet: options.adminWallet
        },
        distribution: {
          auto_distribute: false,
          minimum_balance: 0,
          batch_size: 10
        },
        security: {
          key_encryption: true,
          backup_enabled: true,
          audit_log: true
        }
      };

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

    return {
      name: config.project.name,
      network: config.project.network,
      baseToken: new PublicKey(config.token.base_token),
      adminWallet: new PublicKey(config.token.admin_wallet),
      distributionSettings: {
        schedule: config.distribution.schedule,
        rewardToken: config.distribution.reward_token
          ? new PublicKey(config.distribution.reward_token)
          : undefined,
        autoDistribute: config.distribution.auto_distribute,
        minimumBalance: config.distribution.minimum_balance,
        batchSize: config.distribution.batch_size
      },
      securitySettings: {
        keyEncryption: config.security.key_encryption,
        backupEnabled: config.security.backup_enabled,
        auditLog: config.security.audit_log
      }
    };
  }

  public getNetworkConfig() {
    const config = this.getConfig();
    return {
      network: config.project.network,
      rpcUrl: config.network?.rpc_url,
      timeout: config.network?.timeout || 30000,
      maxRetries: config.network?.max_retries || 3,
      retryDelay: config.network?.retry_delay || 1000
    };
  }

  public getLoggingConfig() {
    const config = this.getConfig();
    return {
      level: config.logging?.level || 'info' as LogLevel,
      logDir: config.logging?.log_dir || './logs',
      enableConsole: config.logging?.enable_console ?? true,
      enableFile: config.logging?.enable_file ?? true,
      maxFiles: config.logging?.max_files || 14,
      maxSize: config.logging?.max_size || '20m'
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
}