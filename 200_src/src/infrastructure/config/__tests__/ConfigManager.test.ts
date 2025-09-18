import { promises as fs } from 'fs';
import { ConfigManager } from '../ConfigManager';
import { ConfigurationError, ValidationError } from '../../../domain/errors';

// Mock the logger module to avoid Winston file system interactions
jest.mock('../../logging/Logger', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    logOperation: jest.fn().mockImplementation(async (operation, fn) => {
      return await fn();
    })
  })
}));

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn()
  },
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  statSync: jest.fn().mockReturnValue({
    isDirectory: () => true,
    isFile: () => true,
    size: 1024,
    mtime: new Date()
  }),
  stat: jest.fn().mockImplementation((path, callback) => {
    callback(null, {
      isDirectory: () => true,
      isFile: () => true,
      size: 1024,
      mtime: new Date()
    });
  }),
  openSync: jest.fn().mockReturnValue(3),
  writeSync: jest.fn(),
  closeSync: jest.fn(),
  createWriteStream: jest.fn().mockReturnValue({
    write: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    pipe: jest.fn(),
    destroy: jest.fn(),
    writable: true,
    readable: false
  })
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  const testConfigPath = './test-tributary.toml';

  beforeEach(() => {
    configManager = new ConfigManager(testConfigPath);
    jest.clearAllMocks();
  });

  describe('loadConfig', () => {
    const validConfigContent = `
[project]
name = "TestProject"
network = "devnet"

[token]
base_token = "So11111111111111111111111111111111111111112"
admin_wallet = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"

[distribution]
auto_distribute = false
minimum_balance = 0
batch_size = 10

[security]
key_encryption = true
backup_enabled = true
audit_log = true
`;

    it('should load valid configuration successfully', async () => {
      mockFs.readFile.mockResolvedValue(validConfigContent);

      const config = await configManager.loadConfig();

      expect(config.project.name).toBe('TestProject');
      expect(config.project.network).toBe('devnet');
      expect(config.token.base_token).toBe('So11111111111111111111111111111111111111112');
      expect(config.distribution.auto_distribute).toBe(false);
    });

    it('should throw ConfigurationError when file not found', async () => {
      const error = new Error('File not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);

      await expect(configManager.loadConfig()).rejects.toThrow(ConfigurationError);
    });

    it('should throw ValidationError for invalid configuration', async () => {
      const invalidConfig = `
[project]
name = ""
network = "invalid"
`;
      mockFs.readFile.mockResolvedValue(invalidConfig);

      await expect(configManager.loadConfig()).rejects.toThrow(ValidationError);
    });

    it('should throw ConfigurationError for invalid TOML', async () => {
      mockFs.readFile.mockResolvedValue('invalid toml content [[[');

      await expect(configManager.loadConfig()).rejects.toThrow(ConfigurationError);
    });
  });

  describe('saveConfig', () => {
    const validConfig = {
      project: {
        name: 'TestProject',
        network: 'devnet' as const
      },
      token: {
        base_token: 'So11111111111111111111111111111111111111112',
        admin_wallet: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
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

    it('should save valid configuration', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await configManager.saveConfig(validConfig);

      expect(mockFs.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('[project]'),
        'utf-8'
      );
    });

    it('should throw ValidationError for invalid configuration', async () => {
      const invalidConfig = {
        ...validConfig,
        token: {
          ...validConfig.token,
          base_token: 'invalid-address'
        }
      };

      await expect(configManager.saveConfig(invalidConfig as any)).rejects.toThrow(ValidationError);
    });
  });

  describe('initializeProject', () => {
    const initOptions = {
      name: 'TestProject',
      baseToken: 'So11111111111111111111111111111111111111112',
      adminWallet: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      network: 'devnet' as const
    };

    it('should initialize project with valid options', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const config = await configManager.initializeProject(initOptions);

      expect(config.project.name).toBe('TestProject');
      expect(config.project.network).toBe('devnet');
      expect(config.token.base_token).toBe(initOptions.baseToken);
      expect(config.token.admin_wallet).toBe(initOptions.adminWallet);
    });

    it('should throw ConfigurationError when file exists and force is false', async () => {
      mockFs.access.mockResolvedValue(undefined);

      await expect(
        configManager.initializeProject({ ...initOptions, force: false })
      ).rejects.toThrow(ConfigurationError);
    });

    it('should overwrite existing file when force is true', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const config = await configManager.initializeProject({ ...initOptions, force: true });

      expect(config.project.name).toBe('TestProject');
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', async () => {
      const validConfig = `
[project]
name = "TestProject"
network = "devnet"

[token]
base_token = "So11111111111111111111111111111111111111112"
admin_wallet = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"

[distribution]
auto_distribute = false
minimum_balance = 0
batch_size = 10

[security]
key_encryption = true
backup_enabled = true
audit_log = true
`;
      mockFs.readFile.mockResolvedValue(validConfig);

      const result = await configManager.validateConfig();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for invalid configuration', async () => {
      const invalidConfig = `
[project]
name = ""
network = "invalid"

[token]
base_token = "invalid-address"
admin_wallet = "invalid-address"
`;
      mockFs.readFile.mockResolvedValue(invalidConfig);

      const result = await configManager.validateConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return warnings for mainnet configuration', async () => {
      const mainnetConfig = `
[project]
name = "TestProject"
network = "mainnet-beta"

[token]
base_token = "So11111111111111111111111111111111111111112"
admin_wallet = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"

[distribution]
auto_distribute = false
minimum_balance = 0
batch_size = 10

[security]
key_encryption = true
backup_enabled = true
audit_log = true
`;
      mockFs.readFile.mockResolvedValue(mainnetConfig);

      const result = await configManager.validateConfig();

      expect(result.isValid).toBe(true);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('mainnet-beta network')
        ])
      );
    });
  });

  describe('configExists', () => {
    it('should return true when config file exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const exists = await configManager.configExists();

      expect(exists).toBe(true);
    });

    it('should return false when config file does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));

      const exists = await configManager.configExists();

      expect(exists).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('should throw error when config is not loaded', () => {
      expect(() => configManager.getConfig()).toThrow(ConfigurationError);
    });
  });
});