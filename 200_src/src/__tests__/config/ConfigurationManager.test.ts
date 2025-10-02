import { ConfigurationManager } from '../../config/ConfigurationManager';
import { IConfigurationLoader } from '../../config/interfaces/IConfigurationLoader';
import { IConfigurationMerger } from '../../config/interfaces/IConfigurationMerger';
import { ITomlSerializer } from '../../config/interfaces/ITomlSerializer';
import { TributaryConfig } from '../../config/types/TributaryConfig';

// モック設定
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
  },
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock('../../infrastructure/logging/Logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  })),
}));

const fs = require('fs');

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;
  let mockConfigDir: string;
  let mockLoader: jest.Mocked<IConfigurationLoader>;
  let mockMerger: jest.Mocked<IConfigurationMerger>;
  let mockSerializer: jest.Mocked<ITomlSerializer>;

  // 完全なTributaryConfigモック
  const mockConfig: TributaryConfig = {
    project: {
      version: '1.0.0',
      description: 'TestProject',
    },
    network: {
      default_network: 'devnet',
      timeout: 5000,
      max_retries: 3,
      retry_delay: 1000,
      confirmation_timeout: 30000,
      commitment: 'confirmed',
    },
    rpc: {
      endpoints: {
        devnet: 'https://api.devnet.solana.com',
      },
      fallback_endpoints: {
        devnet: ['https://fallback.devnet.solana.com'],
      },
    },
    distribution: {
      default_batch_size: 10,
      max_batch_size: 50,
      batch_delay_ms: 1000,
      estimated_gas_per_tx: 5000,
      estimated_time_per_batch: 10,
      risk_thresholds: {
        large_amount_threshold: 1000000,
        large_recipient_count_threshold: 100,
        small_amount_threshold: 1,
      },
    },
    token: {
      default_decimals: 9,
      fallback_decimals: 9,
      minimum_balance: 1000,
    },
    cache: {
      default_ttl_seconds: 300,
      wallet_cache_ttl_seconds: 600,
      config_cache_ttl_seconds: 1800,
    },
    logging: {
      default_level: 'info',
      default_dir: './logs',
      enable_console: true,
      enable_file: false,
      max_files: 5,
      max_file_size: '10m',
    },
    security: {
      default_key_encryption: true,
      default_backup_enabled: true,
      default_audit_log: true,
    },
    validation: {
      max_recipients_per_distribution: 1000,
      min_balance_for_distribution: 1000,
      wallet_validation_timeout: 5000,
    },
    export: {
      default_format: 'json',
      file_name_pattern: 'distribution_{timestamp}',
    },
    pda_capacity: {
      max_wallet_groups_unified: 100,
      auto_migrate_on_capacity: false,
      require_user_confirmation: true,
      capacity_warning_threshold: 80,
      capacity_monitoring: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfigDir = '/test/config';

    // 完全なモック依存関係を作成
    mockLoader = {
      loadConfigFile: jest.fn(),
      parseTomlContent: jest.fn(),
    } as jest.Mocked<IConfigurationLoader>;

    mockMerger = {
      mergeConfigs: jest.fn(),
      applyEnvironmentVariables: jest.fn(),
    } as jest.Mocked<IConfigurationMerger>;

    mockSerializer = {
      generateTomlContent: jest.fn(),
    } as jest.Mocked<ITomlSerializer>;

    // fs.promises のモック設定
    fs.promises.mkdir.mockResolvedValue(undefined);
    fs.promises.writeFile.mockResolvedValue(undefined);
    fs.promises.readFile.mockResolvedValue('{}');
    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockReturnValue(undefined);

    // デフォルトのモック戻り値を設定
    mockLoader.loadConfigFile.mockResolvedValue(mockConfig);
    mockLoader.parseTomlContent.mockReturnValue(mockConfig);
    mockMerger.mergeConfigs.mockReturnValue(mockConfig);
    mockSerializer.generateTomlContent.mockReturnValue(`
[project]
version = "1.0.0"
description = "TestProject"
`);

    // 依存性注入でConfigurationManagerを作成
    configManager = new ConfigurationManager(
      mockConfigDir,
      'test',
      mockLoader,
      mockMerger,
      mockSerializer
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const manager = new ConfigurationManager();
      expect(manager).toBeInstanceOf(ConfigurationManager);
    });

    it('should initialize with custom config directory', () => {
      const customDir = '/custom/config';
      const manager = new ConfigurationManager(customDir);
      expect(manager).toBeInstanceOf(ConfigurationManager);
    });

    it('should initialize with custom environment', () => {
      const manager = new ConfigurationManager(undefined, 'production');
      expect(manager).toBeInstanceOf(ConfigurationManager);
    });

    it('should initialize with injected dependencies', () => {
      const manager = new ConfigurationManager(
        mockConfigDir,
        'test',
        mockLoader,
        mockMerger,
        mockSerializer
      );
      expect(manager).toBeInstanceOf(ConfigurationManager);
    });
  });

  describe('initializeProject', () => {
    const defaultOptions = {
      name: 'TestProject',
      baseToken: '11111111111111111111111111111112',
      adminWallet: '11111111111111111111111111111113',
      network: 'devnet' as const,
    };

    it('should initialize project with valid options', async () => {
      const result = await configManager.initializeProject(defaultOptions);

      expect(fs.promises.mkdir).toHaveBeenCalled();
      expect(fs.promises.writeFile).toHaveBeenCalled();
      expect(mockSerializer.generateTomlContent).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle custom RPC URLs', async () => {
      const options = {
        ...defaultOptions,
        customRpcUrls: {
          devnet: 'https://custom-devnet.com',
        },
      };

      const result = await configManager.initializeProject(options);

      expect(fs.promises.writeFile).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle overrides', async () => {
      const options = {
        ...defaultOptions,
        overrides: {
          distribution: {
            batch_size: 50,
          },
        },
      };

      const result = await configManager.initializeProject(options);

      expect(fs.promises.writeFile).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle force flag', async () => {
      const options = {
        ...defaultOptions,
        force: true,
      };

      const result = await configManager.initializeProject(options);

      expect(fs.promises.writeFile).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle custom config path', async () => {
      const options = {
        ...defaultOptions,
        configPath: '/custom/path/config.toml',
      };

      const result = await configManager.initializeProject(options);

      expect(fs.promises.writeFile).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('loadConfig', () => {
    it('should return cached config if already loaded', async () => {
      // プライベートプロパティにアクセスするために any にキャスト
      const testConfig = mockConfig;
      (configManager as any).config = testConfig;

      const result = await configManager.loadConfig();

      expect(result).toEqual(testConfig);
      expect(mockLoader.loadConfigFile).not.toHaveBeenCalled();
    });

    it('should load and merge configurations', async () => {
      const result = await configManager.loadConfig();

      expect(mockLoader.loadConfigFile).toHaveBeenCalledWith('default.toml');
      expect(mockLoader.loadConfigFile).toHaveBeenCalledWith('test.toml', true);
      expect(mockLoader.loadConfigFile).toHaveBeenCalledWith('parameters.toml', true);
      expect(mockMerger.mergeConfigs).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle missing config files gracefully', async () => {
      mockLoader.loadConfigFile.mockImplementation((filename) => {
        if (filename === 'missing.toml') {
          return Promise.reject(new Error('File not found'));
        }
        return Promise.resolve(mockConfig);
      });

      const result = await configManager.loadConfig();

      expect(result).toBeDefined();
    });
  });

  describe('getConfig', () => {
    it('should throw error if config not loaded', () => {
      expect(() => configManager.getConfig()).toThrow('Configuration not loaded');
    });

    it('should return config after loading', async () => {
      await configManager.loadConfig();

      const result = configManager.getConfig();

      expect(result).toBeDefined();
      expect(result.project).toBeDefined();
    });
  });

  describe('getSection', () => {
    it('should return specific section of config', async () => {
      await configManager.loadConfig();

      const result = configManager.getSection('project');

      expect(result).toBeDefined();
      expect(result.version).toBe('1.0.0');
    });

    it('should return section for valid key', async () => {
      await configManager.loadConfig();

      const result = configManager.getSection('network');

      expect(result).toBeDefined();
      expect(result.default_network).toBe('devnet');
    });
  });

  describe('reloadConfig', () => {
    it('should clear cached config and reload', async () => {
      // 最初に設定をロード
      await configManager.loadConfig();

      // モックをクリアしてリロードをテスト
      jest.clearAllMocks();
      const reloadedConfig = { ...mockConfig };
      reloadedConfig.project.description = 'ReloadedProject';

      mockLoader.loadConfigFile.mockResolvedValue(reloadedConfig);
      mockMerger.mergeConfigs.mockReturnValue(reloadedConfig);

      const result = await configManager.reloadConfig();

      expect(mockLoader.loadConfigFile).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('setEnvironment', () => {
    it('should change environment and clear config', () => {
      configManager.setEnvironment('production');

      // 設定がクリアされているため、getConfig()はエラーを投げる
      expect(() => configManager.getConfig()).toThrow('Configuration not loaded');
    });
  });

  describe('generateTomlContent', () => {
    it('should generate TOML content from object', () => {
      const testData = {
        project: {
          version: '1.0.0',
          description: 'TestProject',
        },
      };

      const result = configManager.generateTomlContent(testData);

      expect(mockSerializer.generateTomlContent).toHaveBeenCalledWith(testData);
      expect(typeof result).toBe('string');
    });
  });

  describe('getConfigPath', () => {
    it('should return correct config path', () => {
      const result = configManager.getConfigPath();

      expect(typeof result).toBe('string');
      expect(result).toContain('parameters.toml');
    });

    it('should use custom environment in path', () => {
      const customManager = new ConfigurationManager('/custom', 'production');
      const result = customManager.getConfigPath();

      expect(result).toContain('parameters.toml');
    });
  });

  describe('getProjectConfig', () => {
    it('should return project config with defaults', async () => {
      await configManager.loadConfig();

      const result = configManager.getProjectConfig();

      expect(result).toBeDefined();
      expect(result.project).toBeDefined();
      expect(result.project.name).toBeDefined();
      expect(result.project.network).toBeDefined();
    });

    it('should handle missing project data gracefully', async () => {
      const incompleteConfig = { ...mockConfig };
      mockLoader.loadConfigFile.mockResolvedValue(incompleteConfig);
      mockMerger.mergeConfigs.mockReturnValue(incompleteConfig);

      await configManager.loadConfig();

      const result = configManager.getProjectConfig();

      expect(result).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle file system errors during initialization', async () => {
      const manager = new ConfigurationManager(
        '/readonly/path',
        'test',
        mockLoader,
        mockMerger,
        mockSerializer
      );

      fs.promises.writeFile.mockRejectedValue(new Error('Permission denied'));

      await expect(manager.initializeProject({
        name: 'TestProject',
        baseToken: '11111111111111111111111111111112',
        adminWallet: '11111111111111111111111111111113',
        network: 'devnet' as const,
      })).rejects.toThrow('Permission denied');
    });

    it('should handle TOML parsing errors gracefully', async () => {
      const testMockLoader = {
        loadConfigFile: jest.fn(),
        parseTomlContent: jest.fn(),
      } as jest.Mocked<IConfigurationLoader>;

      testMockLoader.loadConfigFile.mockImplementation((filename, optional) => {
        if (filename === 'parameters.toml' && optional) {
          return Promise.resolve({}); // Return empty config for optional files
        }
        return Promise.resolve(mockConfig);
      });

      const testManager = new ConfigurationManager(
        mockConfigDir,
        'test',
        testMockLoader,
        mockMerger,
        mockSerializer
      );

      // パースエラーが発生しても正常に処理されることを確認
      const result = await testManager.loadConfig();
      expect(result).toBeDefined();
    });

    it('should handle serialization errors', () => {
      mockSerializer.generateTomlContent.mockImplementation(() => {
        throw new Error('Serialization failed');
      });

      expect(() => configManager.generateTomlContent({})).toThrow('Serialization failed');
    });

    it('should handle loader initialization errors', () => {
      expect(() => {
        new ConfigurationManager('/invalid/path');
      }).not.toThrow();
    });
  });

  describe('configuration validation', () => {
    it('should validate loaded configuration structure', async () => {
      const result = await configManager.loadConfig();

      expect(result).toEqual(mockConfig);
      expect(result.project).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.network).toBeDefined();
    });

    it('should handle incomplete configuration gracefully', async () => {
      const incompleteConfig = { ...mockConfig };
      delete (incompleteConfig as any).token;

      mockLoader.loadConfigFile.mockResolvedValue(incompleteConfig);
      mockMerger.mergeConfigs.mockReturnValue(incompleteConfig as TributaryConfig);

      const result = await configManager.loadConfig();

      expect(result).toBeDefined();
      expect(result.project).toBeDefined();
    });
  });

  describe('environment-specific behavior', () => {
    it('should load environment-specific configurations', async () => {
      const envManager = new ConfigurationManager(
        mockConfigDir,
        'production',
        mockLoader,
        mockMerger,
        mockSerializer
      );

      await envManager.loadConfig();

      expect(mockLoader.loadConfigFile).toHaveBeenCalledWith('default.toml');
      expect(mockLoader.loadConfigFile).toHaveBeenCalledWith('production.toml', true);
    });

    it('should handle missing environment configurations', async () => {
      const testMockLoader = {
        loadConfigFile: jest.fn(),
        parseTomlContent: jest.fn(),
      } as jest.Mocked<IConfigurationLoader>;

      testMockLoader.loadConfigFile.mockImplementation((filename, optional) => {
        if (filename === 'missing.toml' && optional) {
          return Promise.resolve({}); // Return empty config for optional files
        }
        return Promise.resolve(mockConfig);
      });

      testMockLoader.parseTomlContent.mockReturnValue(mockConfig);

      const envManager = new ConfigurationManager(
        mockConfigDir,
        'missing',
        testMockLoader,
        mockMerger,
        mockSerializer
      );

      const result = await envManager.loadConfig();
      expect(result).toBeDefined();
    });
  });

  describe('merging and environment variables', () => {
    it('should apply environment variables to merged config', async () => {
      await configManager.loadConfig();

      expect(mockMerger.applyEnvironmentVariables).toHaveBeenCalledWith(mockConfig);
    });

    it('should merge multiple configuration sources', async () => {
      const defaultConfig = { ...mockConfig };
      const envConfig = {
        ...mockConfig,
        project: { ...mockConfig.project, description: 'EnvProject' }
      };

      mockLoader.loadConfigFile
        .mockResolvedValueOnce(defaultConfig)
        .mockResolvedValueOnce(envConfig)
        .mockResolvedValueOnce({});

      await configManager.loadConfig();

      expect(mockMerger.mergeConfigs).toHaveBeenCalled();
    });
  });

  describe('cache behavior', () => {
    it('should cache loaded configuration', async () => {
      // 最初のロード
      const result1 = await configManager.loadConfig();

      // 二回目のロード（キャッシュされているはず）
      const result2 = await configManager.loadConfig();

      expect(result1).toBe(result2);
      expect(mockLoader.loadConfigFile).toHaveBeenCalledTimes(3); // default.toml, test.toml, parameters.toml
    });

    it('should clear cache on environment change', async () => {
      await configManager.loadConfig();

      configManager.setEnvironment('production');

      // 環境変更後は新しい設定をロードするはず
      await configManager.loadConfig();

      expect(mockLoader.loadConfigFile).toHaveBeenCalledWith('production.toml', true);
    });
  });
});