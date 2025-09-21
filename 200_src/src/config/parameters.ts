/**
 * Centralized Parameter Configuration
 * This file contains all configurable parameters that were previously hardcoded.
 * Users can customize these values based on their environment and requirements.
 */

import { NetworkType } from '../domain/models';
import * as fs from 'fs';

export interface TributaryParameters {
  // Network Configuration
  network: {
    defaultNetwork: 'devnet' | 'testnet' | 'mainnet-beta';
    timeout: number;
    maxRetries: number;
    retryDelay: number;
    confirmationTimeout: number;
    commitment: 'processed' | 'confirmed' | 'finalized';
  };

  // RPC Endpoints
  rpc: {
    endpoints: {
      devnet: string;
      testnet: string;
      'mainnet-beta': string;
    };
    fallbackEndpoints: {
      devnet: string[];
      testnet: string[];
      'mainnet-beta': string[];
    };
  };

  // Distribution Settings
  distribution: {
    defaultBatchSize: number;
    maxBatchSize: number;
    batchDelayMs: number;
    estimatedGasPerTransaction: number;
    estimatedTimePerBatchSeconds: number;
    riskThresholds: {
      largeAmountThreshold: number;
      largeRecipientCountThreshold: number;
      smallAmountThreshold: number;
    };
  };

  // Token Settings
  token: {
    defaultDecimals: number;
    fallbackDecimals: number;
    minimumBalance: number;
  };

  // Cache Settings
  cache: {
    defaultTtlSeconds: number;
    walletCacheTtlSeconds: number;
    configCacheTtlSeconds: number;
  };

  // Logging Configuration
  logging: {
    defaultLevel: 'error' | 'warn' | 'info' | 'debug';
    defaultDir: string;
    enableConsole: boolean;
    enableFile: boolean;
    maxFiles: number;
    maxFileSize: string;
  };

  // Security Settings
  security: {
    defaultKeyEncryption: boolean;
    defaultBackupEnabled: boolean;
    defaultAuditLog: boolean;
  };

  // File Export Settings
  export: {
    defaultFormat: 'json' | 'csv';
    fileNamePattern: string;
  };

  // Validation Thresholds
  validation: {
    maxRecipientsPerDistribution: number;
    minBalanceForDistribution: number;
    walletValidationTimeout: number;
  };
}

/**
 * Default parameter configuration
 * Users can override these values by creating a custom parameters file
 */
export const DEFAULT_PARAMETERS: TributaryParameters = {
  network: {
    defaultNetwork: 'devnet',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    confirmationTimeout: 60000,
    commitment: 'confirmed'
  },

  rpc: {
    endpoints: {
      devnet: 'https://api.devnet.solana.com',
      testnet: 'https://api.testnet.solana.com',
      'mainnet-beta': 'https://api.mainnet-beta.solana.com'
    },
    fallbackEndpoints: {
      devnet: [
        'https://rpc.ankr.com/solana_devnet',
        'https://devnet.helius-rpc.com'
      ],
      testnet: [
        'https://rpc.ankr.com/solana_testnet'
      ],
      'mainnet-beta': [
        'https://rpc.ankr.com/solana',
        'https://mainnet.helius-rpc.com'
      ]
    }
  },

  distribution: {
    defaultBatchSize: 10,
    maxBatchSize: 50,
    batchDelayMs: 100,
    estimatedGasPerTransaction: 0.000005,
    estimatedTimePerBatchSeconds: 2,
    riskThresholds: {
      largeAmountThreshold: 100000,
      largeRecipientCountThreshold: 1000,
      smallAmountThreshold: 0.001
    }
  },

  token: {
    defaultDecimals: 9,
    fallbackDecimals: 6,
    minimumBalance: 0
  },

  cache: {
    defaultTtlSeconds: 3600,
    walletCacheTtlSeconds: 1800,
    configCacheTtlSeconds: 300
  },

  logging: {
    defaultLevel: 'info',
    defaultDir: './logs',
    enableConsole: true,
    enableFile: true,
    maxFiles: 14,
    maxFileSize: '20m'
  },

  security: {
    defaultKeyEncryption: true,
    defaultBackupEnabled: true,
    defaultAuditLog: true
  },

  export: {
    defaultFormat: 'json',
    fileNamePattern: '{type}_{timestamp}.{format}'
  },

  validation: {
    maxRecipientsPerDistribution: 10000,
    minBalanceForDistribution: 0.001,
    walletValidationTimeout: 5000
  }
};

/**
 * Load parameters from configuration file and environment variables
 */
export function loadParameters(): TributaryParameters {
  // Start with default parameters
  let params = { ...DEFAULT_PARAMETERS };

  // Try to load from configuration file
  try {
    const configPath = process.env.TRIBUTARY_PARAMETERS_FILE || './tributary-parameters.json';

    if (fs.existsSync(configPath)) {
      const configFile = fs.readFileSync(configPath, 'utf-8');
      const fileParams = JSON.parse(configFile);

      // Deep merge file parameters with defaults
      params = deepMerge(params, fileParams) as TributaryParameters;
    }
  } catch {
    // Silently continue with defaults if config file has issues
    console.warn('Warning: Could not load parameter configuration file, using defaults');
  }

  // Override with environment variables if present (highest priority)
  if (process.env.TRIBUTARY_DEFAULT_NETWORK) {
    params.network.defaultNetwork = process.env.TRIBUTARY_DEFAULT_NETWORK as NetworkType;
  }

  if (process.env.TRIBUTARY_NETWORK_TIMEOUT) {
    params.network.timeout = parseInt(process.env.TRIBUTARY_NETWORK_TIMEOUT);
  }

  if (process.env.TRIBUTARY_MAX_RETRIES) {
    params.network.maxRetries = parseInt(process.env.TRIBUTARY_MAX_RETRIES);
  }

  if (process.env.TRIBUTARY_RETRY_DELAY) {
    params.network.retryDelay = parseInt(process.env.TRIBUTARY_RETRY_DELAY);
  }

  if (process.env.TRIBUTARY_BATCH_SIZE) {
    params.distribution.defaultBatchSize = parseInt(process.env.TRIBUTARY_BATCH_SIZE);
  }

  if (process.env.TRIBUTARY_LOG_LEVEL) {
    params.logging.defaultLevel = process.env.TRIBUTARY_LOG_LEVEL as any;
  }

  if (process.env.TRIBUTARY_LOG_DIR) {
    params.logging.defaultDir = process.env.TRIBUTARY_LOG_DIR;
  }

  // Override RPC endpoints from environment
  if (process.env.TRIBUTARY_DEVNET_RPC) {
    params.rpc.endpoints.devnet = process.env.TRIBUTARY_DEVNET_RPC;
  }

  if (process.env.TRIBUTARY_TESTNET_RPC) {
    params.rpc.endpoints.testnet = process.env.TRIBUTARY_TESTNET_RPC;
  }

  if (process.env.TRIBUTARY_MAINNET_RPC) {
    params.rpc.endpoints['mainnet-beta'] = process.env.TRIBUTARY_MAINNET_RPC;
  }

  return params;
}

/**
 * Deep merge utility function
 */
function deepMerge(target: unknown, source: unknown): unknown {
  const result = { ...(target as Record<string, unknown>) };

  for (const key in (source as Record<string, unknown>)) {
    const srcValue = (source as Record<string, unknown>)[key];
    if (srcValue && typeof srcValue === 'object' && !Array.isArray(srcValue)) {
      result[key] = deepMerge(result[key] || {}, srcValue);
    } else {
      result[key] = srcValue;
    }
  }

  return result;
}

/**
 * Get current parameters instance
 */
let currentParameters: TributaryParameters | null = null;

export function getParameters(): TributaryParameters {
  if (!currentParameters) {
    currentParameters = loadParameters();
  }
  return currentParameters;
}

/**
 * Reset parameters (useful for testing)
 */
export function resetParameters(): void {
  currentParameters = null;
}

/**
 * Override parameters for testing or custom configurations
 */
export function setParameters(customParams: Partial<TributaryParameters>): void {
  currentParameters = {
    ...getParameters(),
    ...customParams
  };
}