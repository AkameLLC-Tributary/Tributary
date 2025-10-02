import { Logger, createLogger, LoggerOptions } from '../../../infrastructure/logging/Logger';
import { ConfigurationManager } from '../../../config/ConfigurationManager';

// モック設定
jest.mock('winston', () => ({
  createLogger: jest.fn(),
  format: {
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    combine: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn(),
    printf: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

jest.mock('../../../config/ConfigurationManager');

const winston = require('winston');
const MockConfigurationManager = ConfigurationManager as jest.MockedClass<typeof ConfigurationManager>;

describe('Logger', () => {
  let mockWinstonLogger: any;
  let mockTransport: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // winston.Logger のモック
    mockWinstonLogger = {
      log: jest.fn(),
      close: jest.fn(),
      level: 'info',
      transports: [],
    };

    // winston.transports のモック
    mockTransport = {
      level: 'info',
    };

    // winston関数のモック設定
    winston.createLogger.mockReturnValue(mockWinstonLogger);
    winston.format.timestamp.mockReturnValue('timestamp');
    winston.format.errors.mockReturnValue('errors');
    winston.format.json.mockReturnValue('json');
    winston.format.combine.mockReturnValue('combined');
    winston.format.colorize.mockReturnValue('colorize');
    winston.format.simple.mockReturnValue('simple');
    winston.format.printf.mockReturnValue('printf');
    winston.transports.Console.mockImplementation(() => mockTransport);
    winston.transports.File.mockImplementation(() => mockTransport);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create logger with default options', () => {
      const logger = new Logger('TestComponent');

      expect(logger).toBeInstanceOf(Logger);
      expect(winston.createLogger).toHaveBeenCalled();
    });

    it('should create logger with custom options', () => {
      const options: LoggerOptions = {
        level: 'debug',
        enableConsole: true,
        enableFile: false,
      };

      const logger = new Logger('TestComponent', options);

      expect(logger).toBeInstanceOf(Logger);
      expect(winston.createLogger).toHaveBeenCalled();
    });

    it('should create logger with ConfigurationManager', () => {
      const mockConfigManager = new MockConfigurationManager();
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        logging: {
          default_level: 'warn',
          default_dir: './test-logs',
          enable_console: false,
          enable_file: true,
          max_files: 7,
          max_file_size: '10m',
        },
      });

      const options: LoggerOptions = {
        configManager: mockConfigManager,
      };

      const logger = new Logger('TestComponent', options);

      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('logging methods', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger('TestComponent');
    });

    it('should log debug messages', () => {
      const message = 'Debug message';
      const meta = { key: 'value' };

      logger.debug(message, meta);

      expect(mockWinstonLogger.log).toHaveBeenCalledWith(
        'debug',
        message,
        expect.objectContaining({
          level: 'debug',
          message,
          component: 'TestComponent',
          metadata: meta,
        })
      );
    });

    it('should log info messages', () => {
      const message = 'Info message';
      const meta = { key: 'value' };

      logger.info(message, meta);

      expect(mockWinstonLogger.log).toHaveBeenCalledWith(
        'info',
        message,
        expect.objectContaining({
          level: 'info',
          message,
          component: 'TestComponent',
          metadata: meta,
        })
      );
    });

    it('should log warn messages', () => {
      const message = 'Warning message';
      const meta = { key: 'value' };

      logger.warn(message, meta);

      expect(mockWinstonLogger.log).toHaveBeenCalledWith(
        'warn',
        message,
        expect.objectContaining({
          level: 'warn',
          message,
          component: 'TestComponent',
          metadata: meta,
        })
      );
    });

    it('should log error messages with Error object', () => {
      const message = 'Error message';
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      logger.error(message, error);

      expect(mockWinstonLogger.log).toHaveBeenCalledWith(
        'error',
        message,
        expect.objectContaining({
          level: 'error',
          message,
          component: 'TestComponent',
          metadata: {
            error: error.message,
            stack: error.stack,
          },
        })
      );
    });

    it('should log error messages with metadata object', () => {
      const message = 'Error message';
      const meta = { errorCode: 500, details: 'Internal error' };

      logger.error(message, meta);

      expect(mockWinstonLogger.log).toHaveBeenCalledWith(
        'error',
        message,
        expect.objectContaining({
          level: 'error',
          message,
          component: 'TestComponent',
          metadata: meta,
        })
      );
    });
  });

  describe('logOperation', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger('TestComponent');
    });

    it('should log successful operation', async () => {
      const operation = 'testOperation';
      const result = 'success';
      const mockFn = jest.fn().mockResolvedValue(result);

      const actualResult = await logger.logOperation(operation, mockFn);

      expect(actualResult).toBe(result);
      expect(mockFn).toHaveBeenCalled();

      // 開始ログが記録されることを確認
      expect(mockWinstonLogger.log).toHaveBeenCalledWith(
        'debug',
        `Starting operation: ${operation}`,
        expect.objectContaining({
          level: 'debug',
          component: 'TestComponent',
          metadata: expect.objectContaining({
            operation,
          }),
        })
      );

      // 完了ログが記録されることを確認
      expect(mockWinstonLogger.log).toHaveBeenCalledWith(
        'info',
        `Operation completed: ${operation}`,
        expect.objectContaining({
          level: 'info',
          component: 'TestComponent',
          metadata: expect.objectContaining({
            operation,
            success: true,
            duration: expect.any(Number),
          }),
        })
      );
    });

    it('should log failed operation', async () => {
      const operation = 'testOperation';
      const error = new Error('Operation failed');
      const mockFn = jest.fn().mockRejectedValue(error);

      await expect(logger.logOperation(operation, mockFn)).rejects.toThrow(error);

      expect(mockFn).toHaveBeenCalled();

      // エラーログが記録されることを確認
      expect(mockWinstonLogger.log).toHaveBeenCalledWith(
        'error',
        `Operation failed: ${operation}`,
        expect.objectContaining({
          level: 'error',
          component: 'TestComponent',
          metadata: expect.objectContaining({
            operation,
            success: false,
            duration: expect.any(Number),
            error: error.message,
          }),
        })
      );
    });

    it('should include additional metadata', async () => {
      const operation = 'testOperation';
      const meta = { userId: '123', action: 'create' };
      const mockFn = jest.fn().mockResolvedValue('success');

      await logger.logOperation(operation, mockFn, meta);

      expect(mockWinstonLogger.log).toHaveBeenCalledWith(
        'debug',
        `Starting operation: ${operation}`,
        expect.objectContaining({
          metadata: expect.objectContaining({
            operation,
            ...meta,
          }),
        })
      );
    });
  });

  describe('child logger', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger('ParentComponent');
      mockWinstonLogger.transports = [mockTransport];
    });

    it('should create child logger with combined component name', () => {
      const childLogger = logger.createChildLogger('ChildComponent');

      expect(childLogger).toBeInstanceOf(Logger);
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultMeta: { component: 'ParentComponent:ChildComponent' },
        })
      );
    });

    it('should inherit transport configuration', () => {
      mockWinstonLogger.transports = [
        { constructor: { name: 'Console' } },
        { constructor: { name: 'File' } },
      ];

      const childLogger = logger.createChildLogger('ChildComponent');

      expect(winston.createLogger).toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger('TestComponent');
    });

    it('should set log level', () => {
      logger.setLevel('debug');

      expect(mockWinstonLogger.level).toBe('debug');
    });

    it('should get log level', () => {
      mockWinstonLogger.level = 'warn';

      const level = logger.getLevel();

      expect(level).toBe('warn');
    });

    it('should close logger', () => {
      logger.close();

      expect(mockWinstonLogger.close).toHaveBeenCalled();
    });
  });

  describe('size parsing', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger('TestComponent');
    });

    it('should parse size strings correctly', () => {
      // parseSize はプライベートメソッドなので、直接テストできない
      // 代わりに、コンストラクタで適切にサイズが解析されることをテスト
      const options: LoggerOptions = {
        enableFile: true,
        maxSize: '50m',
      };

      new Logger('TestComponent', options);

      expect(winston.transports.File).toHaveBeenCalledWith(
        expect.objectContaining({
          maxsize: 50 * 1024 * 1024, // 50MB in bytes
        })
      );
    });
  });

  describe('error handling', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger('TestComponent');
    });

    it('should handle ConfigurationManager errors gracefully', () => {
      const mockConfigManager = new MockConfigurationManager();
      mockConfigManager.getConfig = jest.fn().mockImplementation(() => {
        throw new Error('Config error');
      });

      const options: LoggerOptions = {
        configManager: mockConfigManager,
      };

      // エラーが投げられずにロガーが作成されることを確認
      expect(() => new Logger('TestComponent', options)).not.toThrow();
    });
  });
});

describe('createLogger function', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    winston.createLogger.mockReturnValue({
      log: jest.fn(),
      close: jest.fn(),
      level: 'info',
      transports: [],
    });

    winston.format.timestamp.mockReturnValue('timestamp');
    winston.format.errors.mockReturnValue('errors');
    winston.format.json.mockReturnValue('json');
    winston.format.combine.mockReturnValue('combined');
    winston.format.colorize.mockReturnValue('colorize');
    winston.format.simple.mockReturnValue('simple');
    winston.format.printf.mockReturnValue('printf');
    winston.transports.Console.mockImplementation(() => ({}));
    winston.transports.File.mockImplementation(() => ({}));
  });

  it('should create logger instance', () => {
    const logger = createLogger('TestComponent');

    expect(logger).toBeInstanceOf(Logger);
  });

  it('should create logger with options', () => {
    const options: LoggerOptions = {
      level: 'debug',
      enableConsole: false,
    };

    const logger = createLogger('TestComponent', options);

    expect(logger).toBeInstanceOf(Logger);
  });

  it('should avoid circular dependency with ConfigurationManager', () => {
    // createLogger 関数が ConfigurationManager を直接インポートしないことを確認
    const logger = createLogger('TestComponent');

    expect(logger).toBeInstanceOf(Logger);
    // ConfigurationManager が自動的にインスタンス化されないことを確認
    expect(MockConfigurationManager).not.toHaveBeenCalled();
  });
});