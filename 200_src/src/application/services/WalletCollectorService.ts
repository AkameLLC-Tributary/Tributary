import { PublicKey } from '@solana/web3.js';
import { SolanaRpcClient } from '../../infrastructure/rpc/SolanaRpcClient';
import { FileStorage } from '../../infrastructure/storage';
import { Logger, createLogger } from '../../infrastructure/logging/Logger';
import {
  TokenHolder,
  WalletCollectionOptions,
  NetworkType
} from '../../domain/models';
import {
  ValidationError,
  NetworkError
} from '../../domain/errors';

export interface WalletCollectorServiceOptions {
  rpcClient?: SolanaRpcClient;
  storage?: FileStorage;
  logger?: Logger;
}

export class WalletCollectorService {
  private readonly rpcClient: SolanaRpcClient;
  private readonly storage: FileStorage;
  private readonly logger: Logger;

  constructor(
    network: NetworkType,
    options: WalletCollectorServiceOptions = {}
  ) {
    this.rpcClient = options.rpcClient || new SolanaRpcClient({ network });
    this.storage = options.storage || new FileStorage();
    this.logger = options.logger || createLogger('WalletCollectorService');
  }

  public async collectWallets(
    options: WalletCollectionOptions,
    onProgress?: (progress: { current: number; total: number; rate: number }) => void
  ): Promise<TokenHolder[]> {
    return this.logger.logOperation('collectWallets', async () => {
      this.validateOptions(options);

      const cacheKey = this.generateCacheKey(options);

      if (options.useCache !== false) {
        const cached = await this.getCachedResult(cacheKey);
        if (cached) {
          this.logger.info('Returning cached wallet data', {
            tokenAddress: options.tokenAddress.toString(),
            count: cached.length
          });
          return cached;
        }
      }

      const holders = await this.fetchTokenHolders(options, onProgress);
      const filteredHolders = this.applyFilters(holders, options);

      if (options.useCache !== false) {
        await this.cacheResult(cacheKey, filteredHolders, options.cacheTtl || 3600);
      }

      this.logger.info('Wallet collection completed', {
        tokenAddress: options.tokenAddress.toString(),
        totalHolders: holders.length,
        filteredHolders: filteredHolders.length,
        threshold: options.threshold
      });

      return filteredHolders;
    }, {
      tokenAddress: options.tokenAddress.toString(),
      threshold: options.threshold
    });
  }

  private validateOptions(options: WalletCollectionOptions): void {
    if (!options.tokenAddress) {
      throw new ValidationError('Token address is required');
    }

    if (options.threshold !== undefined && options.threshold < 0) {
      throw new ValidationError('Threshold must be non-negative');
    }

    if (options.maxHolders !== undefined && options.maxHolders <= 0) {
      throw new ValidationError('Max holders must be positive');
    }

    if (options.cacheTtl !== undefined && options.cacheTtl <= 0) {
      throw new ValidationError('Cache TTL must be positive');
    }
  }

  private async fetchTokenHolders(
    options: WalletCollectionOptions,
    onProgress?: (progress: { current: number; total: number; rate: number }) => void
  ): Promise<TokenHolder[]> {
    try {
      this.logger.info('Starting token holder fetch', {
        tokenAddress: options.tokenAddress.toString()
      });

      const startTime = Date.now();
      const holders = await this.rpcClient.getTokenHolders(
        options.tokenAddress,
        options.threshold || 0
      );

      const duration = Date.now() - startTime;
      const rate = holders.length / (duration / 1000);

      if (onProgress) {
        onProgress({
          current: holders.length,
          total: holders.length,
          rate
        });
      }

      return holders;
    } catch (error) {
      if (error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError(
        `Failed to fetch token holders: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { tokenAddress: options.tokenAddress.toString() }
      );
    }
  }

  private applyFilters(
    holders: TokenHolder[],
    options: WalletCollectionOptions
  ): TokenHolder[] {
    let filtered = [...holders];

    if (options.threshold && options.threshold > 0) {
      filtered = filtered.filter(holder => holder.balance >= options.threshold!);
    }

    if (options.excludeAddresses && options.excludeAddresses.length > 0) {
      const excludeSet = new Set(
        options.excludeAddresses.map(addr => addr.toString())
      );
      filtered = filtered.filter(
        holder => !excludeSet.has(holder.address.toString())
      );
    }

    if (options.maxHolders && options.maxHolders > 0) {
      filtered = filtered.slice(0, options.maxHolders);
    }

    filtered.sort((a, b) => b.balance - a.balance);

    return filtered;
  }

  public async validateTokenAddress(tokenAddress: PublicKey): Promise<boolean> {
    return this.logger.logOperation('validateTokenAddress', async () => {
      try {
        return await this.rpcClient.validateTokenAddress(tokenAddress);
      } catch (error) {
        this.logger.warn('Token address validation failed', {
          tokenAddress: tokenAddress.toString(),
          error: error instanceof Error ? error.message : String(error)
        });
        return false;
      }
    }, { tokenAddress: tokenAddress.toString() });
  }

  public async getTokenSupply(tokenAddress: PublicKey): Promise<number> {
    return this.logger.logOperation('getTokenSupply', async () => {
      return await this.rpcClient.getTokenSupply(tokenAddress);
    }, { tokenAddress: tokenAddress.toString() });
  }

  public async exportWallets(
    holders: TokenHolder[],
    format: 'json' | 'csv' = 'json',
    filePath?: string
  ): Promise<string> {
    return this.logger.logOperation('exportWallets', async () => {
      const exportPath = filePath || `wallets_${Date.now()}.${format}`;

      if (format === 'json') {
        await this.storage.writeJson(exportPath, holders);
      } else if (format === 'csv') {
        const csvContent = this.convertToCsv(holders);
        await this.storage.writeJson(`${exportPath}.json`, { csvContent });
      }

      this.logger.info('Wallet data exported', {
        format,
        path: exportPath,
        count: holders.length
      });

      return this.storage.getFullPath(exportPath);
    }, { format, count: holders.length });
  }

  private convertToCsv(holders: TokenHolder[]): string {
    const headers = ['Address', 'Balance', 'Percentage'];
    const rows = holders.map(holder => [
      holder.address.toString(),
      holder.balance.toString(),
      holder.percentage.toFixed(4)
    ]);

    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
  }

  private generateCacheKey(options: WalletCollectionOptions): string {
    const parts = [
      'wallets',
      options.tokenAddress.toString(),
      options.threshold || 0,
      options.maxHolders || 'unlimited',
      options.excludeAddresses?.map(addr => addr.toString()).join('|') || 'none'
    ];
    return parts.join('_');
  }

  private async getCachedResult(cacheKey: string): Promise<TokenHolder[] | null> {
    try {
      return await this.storage.readCache<TokenHolder[]>(cacheKey);
    } catch (error) {
      this.logger.warn('Failed to read cache', {
        cacheKey,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  private async cacheResult(
    cacheKey: string,
    holders: TokenHolder[],
    ttlSeconds: number
  ): Promise<void> {
    try {
      await this.storage.writeCache(cacheKey, holders, ttlSeconds);
      this.logger.debug('Cached wallet data', {
        cacheKey,
        count: holders.length,
        ttl: ttlSeconds
      });
    } catch (error) {
      this.logger.warn('Failed to cache result', {
        cacheKey,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  public async clearCache(): Promise<void> {
    return this.logger.logOperation('clearCache', async () => {
      await this.storage.clearCache();
    });
  }
}