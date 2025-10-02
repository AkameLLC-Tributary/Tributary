import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../infrastructure/logging/Logger';
import { TributaryConfig } from './types/TributaryConfig';
import { IConfigurationLoader } from './interfaces/IConfigurationLoader';
import { IConfigurationMerger } from './interfaces/IConfigurationMerger';
import { ITomlSerializer } from './interfaces/ITomlSerializer';
import { TomlConfigurationLoader } from './loaders/TomlConfigurationLoader';
import { ConfigurationMerger } from './mergers/ConfigurationMerger';
import { TomlSerializer } from './serializers/TomlSerializer';

export class ConfigurationManager {
  private logger = createLogger('ConfigurationManager');
  private config: TributaryConfig | null = null;
  private configDir: string;
  private environment: string;
  private loader: IConfigurationLoader;
  private merger: IConfigurationMerger;
  private serializer: ITomlSerializer;

  constructor(
    configDir?: string,
    environment?: string,
    loader?: IConfigurationLoader,
    merger?: IConfigurationMerger,
    serializer?: ITomlSerializer
  ) {
    this.configDir = configDir || path.join(__dirname, '../../../config');
    this.environment = environment || process.env.NODE_ENV || 'development';
    this.loader = loader || new TomlConfigurationLoader(this.configDir);
    this.merger = merger || new ConfigurationMerger();
    this.serializer = serializer || new TomlSerializer();
  }

  /**
   * 設定を読み込み、優先順位に従ってマージする
   */
  public async loadConfig(): Promise<TributaryConfig> {
    if (this.config) {
      return this.config;
    }

    this.logger.info(`Loading configuration for environment: ${this.environment}`);

    // 1. デフォルト設定を読み込み
    const defaultConfig = await this.loader.loadConfigFile('default.toml');

    // 2. 環境固有設定を読み込み（存在する場合）
    const envConfig = await this.loader.loadConfigFile(`${this.environment}.toml`, true);

    // 3. ユーザーパラメータを読み込み（存在する場合）
    const userConfig = await this.loader.loadConfigFile('parameters.toml', true);

    // 4. 設定をマージ（優先順位: ユーザー > 環境 > デフォルト）
    this.config = this.merger.mergeConfigs(defaultConfig, envConfig, userConfig);

    // 5. 環境変数による上書き
    this.merger.applyEnvironmentVariables(this.config);

    this.logger.info('Configuration loaded successfully');
    return this.config;
  }


  /**
   * 現在の設定を取得
   */
  public getConfig(): TributaryConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * 特定のセクションの設定を取得
   */
  public getSection<K extends keyof TributaryConfig>(section: K): TributaryConfig[K] {
    return this.getConfig()[section];
  }

  /**
   * 設定をリロード
   */
  public async reloadConfig(): Promise<TributaryConfig> {
    this.config = null;
    return this.loadConfig();
  }

  /**
   * 環境を変更
   */
  public setEnvironment(environment: string): void {
    this.environment = environment;
    this.config = null; // 設定をクリアして再読み込み強制
  }

  /**
   * プロジェクト初期化用の設定を作成
   */
  public async initializeProject(options: {
    name: string;
    baseToken: string;
    adminWallet: string;
    network: string;
    configPath?: string;
    customRpcUrls?: Record<string, string>;
    overrides?: any;
    force?: boolean;
  }): Promise<TributaryConfig> {
    // パラメータファイルを作成
    const userParams = {
      project: {
        name: options.name,
        network: options.network
      },
      token: {
        base_token: options.baseToken,
        admin_wallet: options.adminWallet
      },
      network: options.customRpcUrls ? {
        rpc_urls: options.customRpcUrls
      } : {},
      ...options.overrides
    };

    // parameters.tomlファイルに保存
    const configDir = options.configPath ? path.dirname(options.configPath) : this.configDir;
    const paramsPath = path.join(configDir, 'parameters.toml');

    // ディレクトリが存在しない場合は作成
    try {
      await fs.promises.mkdir(configDir, { recursive: true });
    } catch {
      // ディレクトリが既に存在する場合は無視
    }

    // TOMLファイルとして保存
    const tomlContent = this.generateTomlContent(userParams);
    await fs.promises.writeFile(paramsPath, tomlContent, 'utf-8');

    this.logger.info('Project initialized', {
      configPath: paramsPath,
      projectName: options.name,
      network: options.network
    });

    // 設定を再読み込み
    return await this.reloadConfig();
  }

  /**
   * オブジェクトをTOML形式の文字列に変換
   */
  public generateTomlContent(obj: any): string {
    return this.serializer.generateTomlContent(obj);
  }

  /**
   * 設定ファイルのパスを取得
   */
  public getConfigPath(): string {
    return path.join(this.configDir, 'parameters.toml');
  }

  /**
   * プロジェクト設定を取得（ConfigManager互換）
   * ユーザー設定から実際のプロジェクト情報を取得
   */
  public getProjectConfig(): any {
    const config = this.getConfig();

    // parameters.tomlからプロジェクト固有の設定を読み込む
    return {
      project: {
        name: (config as any).project?.name || 'Tributary Project',
        network: config.network.default_network
      },
      token: {
        base_token: (config as any).token?.base_token || undefined,
        admin_wallet: (config as any).token?.admin_wallet || undefined
      }
    };
  }
}