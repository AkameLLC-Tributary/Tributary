import { PublicKey } from '@solana/web3.js';
import {
  TokenHolder,
  DistributionRequest,
  DistributionResult,
  ProjectConfig,
  NetworkType
} from '../types';

export class Wallet {
  constructor(
    public readonly address: PublicKey,
    public readonly balance: number
  ) {}

  public getPercentage(totalSupply: number): number {
    return (this.balance / totalSupply) * 100;
  }

  public toTokenHolder(totalSupply: number): TokenHolder {
    return {
      address: this.address,
      balance: this.balance,
      percentage: this.getPercentage(totalSupply)
    };
  }
}

export class Distribution {
  private results: DistributionResult[] = [];

  constructor(
    public readonly id: string,
    public readonly request: DistributionRequest,
    public readonly createdAt: Date = new Date()
  ) {}

  public addResult(result: DistributionResult): void {
    this.results.push(result);
  }

  public getResults(): readonly DistributionResult[] {
    return this.results;
  }

  public getSuccessfulCount(): number {
    return this.results.filter(r => r.status === 'confirmed').length;
  }

  public getFailedCount(): number {
    return this.results.filter(r => r.status === 'failed').length;
  }

  public getTotalAmount(): number {
    return this.results
      .filter(r => r.status === 'confirmed')
      .reduce((sum, r) => sum + r.amount, 0);
  }

  public isCompleted(): boolean {
    return this.results.length === this.request.holders.length;
  }
}

export class Project {
  constructor(
    public readonly config: ProjectConfig,
    public readonly createdAt: Date = new Date()
  ) {}

  public isMainnet(): boolean {
    return this.config.network === 'mainnet-beta';
  }

  public getNetworkUrl(): string {
    switch (this.config.network) {
      case 'devnet':
        return 'https://api.devnet.solana.com';
      case 'testnet':
        return 'https://api.testnet.solana.com';
      case 'mainnet-beta':
        return 'https://api.mainnet-beta.solana.com';
      default:
        throw new Error(`Unknown network: ${this.config.network}`);
    }
  }

  public validateNetwork(network: NetworkType): boolean {
    return ['devnet', 'testnet', 'mainnet-beta'].includes(network);
  }
}

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, unknown>;
  component: string;
  operation?: string;
  userId?: string;
  transactionId?: string;
}

export interface CacheData<T> {
  key: string;
  value: T;
  expiresAt: Date;
  createdAt: Date;
}

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export * from '../types';