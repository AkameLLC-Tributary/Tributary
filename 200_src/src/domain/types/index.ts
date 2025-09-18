import { PublicKey } from '@solana/web3.js';

export interface TokenHolder {
  address: PublicKey;
  balance: number;
  percentage: number;
}

export interface DistributionRequest {
  amount: number;
  tokenAddress: PublicKey;
  holders: TokenHolder[];
  excludeAddresses?: PublicKey[];
  batchSize?: number;
}

export interface DistributionResult {
  transactionId: string;
  status: 'pending' | 'confirmed' | 'failed';
  recipient: PublicKey;
  amount: number;
  timestamp: Date;
  error?: string;
}

export interface WalletCollectionOptions {
  tokenAddress: PublicKey;
  threshold?: number;
  maxHolders?: number;
  excludeAddresses?: PublicKey[];
  useCache?: boolean;
  cacheTtl?: number;
}

export interface ProjectConfig {
  name: string;
  network: 'devnet' | 'testnet' | 'mainnet-beta';
  baseToken: PublicKey;
  adminWallet: PublicKey;
  distributionSettings: DistributionSettings;
  securitySettings: SecuritySettings;
}

export interface DistributionSettings {
  schedule?: 'manual' | 'weekly' | 'monthly';
  rewardToken?: PublicKey;
  autoDistribute: boolean;
  minimumBalance: number;
  batchSize: number;
}

export interface SecuritySettings {
  keyEncryption: boolean;
  backupEnabled: boolean;
  auditLog: boolean;
}

export type NetworkType = 'devnet' | 'testnet' | 'mainnet-beta';

export type OutputFormat = 'table' | 'json' | 'yaml' | 'csv';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface CommandOptions {
  config?: string;
  output?: OutputFormat;
  logLevel?: LogLevel;
  network?: NetworkType;
}

export interface CliError extends Error {
  code: number;
  details?: Record<string, unknown>;
}