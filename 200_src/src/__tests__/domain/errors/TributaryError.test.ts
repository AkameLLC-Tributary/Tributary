import {
  TributaryError,
  ValidationError,
  ConfigurationError,
  NetworkError,
  AuthenticationError,
  DataIntegrityError,
  ResourceError,
  TimeoutError,
  ErrorCodes
} from '../../../domain/errors';

describe('TributaryError', () => {
  describe('base TributaryError class', () => {
    it('should create error with message and default code', () => {
      const message = 'Test error message';
      const error = new TributaryError(message);

      expect(error).toBeInstanceOf(TributaryError);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(message);
      expect(error.code).toBe(1); // GENERAL_ERROR
      expect(error.name).toBe('TributaryError');
    });

    it('should create error with custom code', () => {
      const message = 'Test error message';
      const code = ErrorCodes.VALIDATION_ERROR;
      const error = new TributaryError(message, code);

      expect(error.message).toBe(message);
      expect(error.code).toBe(code);
    });

    it('should create error with details', () => {
      const message = 'Test error message';
      const details = { context: 'test', action: 'create' };
      const error = new TributaryError(message, 1, details);

      expect(error.message).toBe(message);
      expect(error.details).toEqual(details);
    });

    it('should have proper stack trace', () => {
      const error = new TributaryError('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('TributaryError');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with default code', () => {
      const message = 'Validation failed';
      const error = new ValidationError(message);

      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(TributaryError);
      expect(error.message).toBe(message);
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error.name).toBe('ValidationError');
    });

    it('should create validation error with details', () => {
      const message = 'Custom validation error';
      const details = { field: 'token', value: 'invalid' };
      const error = new ValidationError(message, details);

      expect(error.message).toBe(message);
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error.name).toBe('ValidationError');
      expect(error.details).toEqual(details);
    });

    it('should handle empty message', () => {
      const error = new ValidationError('');

      expect(error.message).toBe('');
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });
  });

  describe('ConfigurationError', () => {
    it('should create configuration error with default code', () => {
      const message = 'Configuration error';
      const error = new ConfigurationError(message);

      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error).toBeInstanceOf(TributaryError);
      expect(error.message).toBe(message);
      expect(error.code).toBe(ErrorCodes.CONFIGURATION_ERROR);
      expect(error.name).toBe('ConfigurationError');
    });

    it('should create configuration error with details', () => {
      const message = 'Config file not found';
      const details = { file: 'config.toml', path: '/etc/config' };
      const error = new ConfigurationError(message, details);

      expect(error.message).toBe(message);
      expect(error.code).toBe(ErrorCodes.CONFIGURATION_ERROR);
      expect(error.details).toEqual(details);
    });
  });

  describe('NetworkError', () => {
    it('should create network error with default code', () => {
      const message = 'Network connection failed';
      const error = new NetworkError(message);

      expect(error).toBeInstanceOf(NetworkError);
      expect(error).toBeInstanceOf(TributaryError);
      expect(error.message).toBe(message);
      expect(error.code).toBe(ErrorCodes.NETWORK_ERROR);
      expect(error.name).toBe('NetworkError');
    });

    it('should create network error with details', () => {
      const message = 'RPC timeout';
      const details = { endpoint: 'https://api.devnet.solana.com', timeout: 5000 };
      const error = new NetworkError(message, details);

      expect(error.message).toBe(message);
      expect(error.code).toBe(ErrorCodes.NETWORK_ERROR);
      expect(error.details).toEqual(details);
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error with default code', () => {
      const message = 'Authentication failed';
      const error = new AuthenticationError(message);

      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error).toBeInstanceOf(TributaryError);
      expect(error.message).toBe(message);
      expect(error.code).toBe(ErrorCodes.AUTHENTICATION_ERROR);
      expect(error.name).toBe('AuthenticationError');
    });

    it('should create authentication error with details', () => {
      const message = 'Invalid credentials';
      const details = { user: 'test', method: 'token' };
      const error = new AuthenticationError(message, details);

      expect(error.message).toBe(message);
      expect(error.code).toBe(ErrorCodes.AUTHENTICATION_ERROR);
      expect(error.details).toEqual(details);
    });
  });

  describe('DataIntegrityError', () => {
    it('should create data integrity error with default code', () => {
      const message = 'Data integrity check failed';
      const error = new DataIntegrityError(message);

      expect(error).toBeInstanceOf(DataIntegrityError);
      expect(error).toBeInstanceOf(TributaryError);
      expect(error.message).toBe(message);
      expect(error.code).toBe(ErrorCodes.DATA_INTEGRITY_ERROR);
      expect(error.name).toBe('DataIntegrityError');
    });
  });

  describe('ResourceError', () => {
    it('should create resource error with default code', () => {
      const message = 'Resource unavailable';
      const error = new ResourceError(message);

      expect(error).toBeInstanceOf(ResourceError);
      expect(error).toBeInstanceOf(TributaryError);
      expect(error.message).toBe(message);
      expect(error.code).toBe(ErrorCodes.RESOURCE_ERROR);
      expect(error.name).toBe('ResourceError');
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error with default code', () => {
      const message = 'Operation timed out';
      const error = new TimeoutError(message);

      expect(error).toBeInstanceOf(TimeoutError);
      expect(error).toBeInstanceOf(TributaryError);
      expect(error.message).toBe(message);
      expect(error.code).toBe(ErrorCodes.TIMEOUT_ERROR);
      expect(error.name).toBe('TimeoutError');
    });
  });

  describe('ErrorCodes', () => {
    it('should have all expected error codes', () => {
      expect(ErrorCodes.SUCCESS).toBe(0);
      expect(ErrorCodes.GENERAL_ERROR).toBe(1);
      expect(ErrorCodes.VALIDATION_ERROR).toBe(2);
      expect(ErrorCodes.CONFIGURATION_ERROR).toBe(3);
      expect(ErrorCodes.NETWORK_ERROR).toBe(4);
      expect(ErrorCodes.AUTHENTICATION_ERROR).toBe(5);
      expect(ErrorCodes.DATA_INTEGRITY_ERROR).toBe(6);
      expect(ErrorCodes.RESOURCE_ERROR).toBe(7);
      expect(ErrorCodes.TIMEOUT_ERROR).toBe(8);
    });

    it('should have unique error codes', () => {
      const codes = Object.values(ErrorCodes);
      const uniqueCodes = new Set(codes);

      expect(codes.length).toBe(uniqueCodes.size);
    });
  });

  describe('error inheritance', () => {
    it('should maintain proper prototype chain', () => {
      const error = new ValidationError('Test');

      expect(error instanceof ValidationError).toBe(true);
      expect(error instanceof TributaryError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it('should be catchable as base TributaryError', () => {
      const validationError = new ValidationError('Validation failed');
      const configError = new ConfigurationError('Config failed');
      const networkError = new NetworkError('Network failed');

      const errors = [validationError, configError, networkError];

      errors.forEach(error => {
        expect(error instanceof TributaryError).toBe(true);
      });
    });

    it('should be catchable as base Error', () => {
      const error = new ValidationError('Test');

      try {
        throw error;
      } catch (e) {
        expect(e instanceof Error).toBe(true);
        expect(e instanceof TributaryError).toBe(true);
        expect(e instanceof ValidationError).toBe(true);
      }
    });
  });

  describe('error serialization', () => {
    it('should serialize to JSON properly', () => {
      const error = new ValidationError('Test error message', { field: 'test' });
      const serialized = JSON.stringify({
        message: error.message,
        name: error.name,
        code: error.code,
        details: error.details
      });
      const parsed = JSON.parse(serialized);

      expect(parsed.message).toBe(error.message);
      expect(parsed.name).toBe(error.name);
      expect(parsed.code).toBe(error.code);
      expect(parsed.details).toEqual(error.details);
    });

    it('should include custom properties in serialization', () => {
      const error = new ValidationError('Test error message');
      const serialized = JSON.stringify({
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });

      const parsed = JSON.parse(serialized);

      expect(parsed.name).toBe('ValidationError');
      expect(parsed.message).toBe('Test error message');
      expect(parsed.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(typeof parsed.stack).toBe('string');
    });
  });

  describe('error messages', () => {
    it('should handle special characters in messages', () => {
      const message = 'Error with special chars: 日本語, émoji 🚀, "quotes"';
      const error = new ValidationError(message);

      expect(error.message).toBe(message);
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      const error = new ValidationError(longMessage);

      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(1000);
    });

    it('should handle null and undefined gracefully', () => {
      // TypeScriptでは型エラーになるが、実行時の動作をテスト
      const errorNull = new ValidationError(null as any);
      const errorUndefined = new ValidationError(undefined as any);

      expect(errorNull.message).toBe('null');
      expect(errorUndefined.message).toBe('');
    });
  });

  describe('error details', () => {
    it('should store and retrieve details correctly', () => {
      const details = {
        timestamp: new Date().toISOString(),
        userId: '12345',
        action: 'create_token',
        context: { source: 'cli' }
      };

      const error = new ValidationError('Test with details', details);

      expect(error.details).toEqual(details);
      expect(error.details?.timestamp).toBeDefined();
      expect(error.details?.userId).toBe('12345');
    });

    it('should handle undefined details', () => {
      const error = new ValidationError('Test without details');

      expect(error.details).toBeUndefined();
    });

    it('should handle complex details objects', () => {
      const complexDetails = {
        metadata: {
          operation: 'token_distribution',
          params: {
            amount: 1000,
            recipients: ['wallet1', 'wallet2']
          }
        },
        stackTrace: 'Error at line 123'
      };

      const error = new NetworkError('Complex error', complexDetails);

      expect(error.details).toEqual(complexDetails);
      expect((error.details as any)?.metadata?.operation).toBe('token_distribution');
    });
  });
});