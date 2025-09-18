export class TributaryError extends Error {
  constructor(
    message: string,
    public readonly code: number = 1,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TributaryError';
  }
}

export class NetworkError extends TributaryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 4, details);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends TributaryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 2, details);
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends TributaryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 3, details);
    this.name = 'ConfigurationError';
  }
}

export class AuthenticationError extends TributaryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 5, details);
    this.name = 'AuthenticationError';
  }
}

export class DataIntegrityError extends TributaryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 6, details);
    this.name = 'DataIntegrityError';
  }
}

export class ResourceError extends TributaryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 7, details);
    this.name = 'ResourceError';
  }
}

export class TimeoutError extends TributaryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 8, details);
    this.name = 'TimeoutError';
  }
}

export const ErrorCodes = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  VALIDATION_ERROR: 2,
  CONFIGURATION_ERROR: 3,
  NETWORK_ERROR: 4,
  AUTHENTICATION_ERROR: 5,
  DATA_INTEGRITY_ERROR: 6,
  RESOURCE_ERROR: 7,
  TIMEOUT_ERROR: 8
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];