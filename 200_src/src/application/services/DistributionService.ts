import {
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  TransactionInstruction
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { SolanaRpcClient } from '../../infrastructure/rpc/SolanaRpcClient';
import { FileStorage } from '../../infrastructure/storage';
import { Logger, createLogger } from '../../infrastructure/logging/Logger';
import {
  TokenHolder,
  DistributionRequest,
  DistributionResult,
  Distribution,
  NetworkType
} from '../../domain/models';
import {
  ValidationError,
  NetworkError,
  ResourceError
} from '../../domain/errors';

export interface DistributionServiceOptions {
  rpcClient?: SolanaRpcClient;
  storage?: FileStorage;
  logger?: Logger;
  batchSize?: number;
  maxRetries?: number;
}

export interface SimulationResult {
  estimatedGasCost: number;
  estimatedDuration: number;
  distributionBreakdown: {
    totalAmount: number;
    recipientCount: number;
    averageAmount: number;
    minAmount: number;
    maxAmount: number;
  };
  riskFactors: string[];
}

export class DistributionService {
  private readonly rpcClient: SolanaRpcClient;
  private readonly storage: FileStorage;
  private readonly logger: Logger;
  private readonly batchSize: number;
  private readonly maxRetries: number;

  constructor(
    network: NetworkType,
    private readonly adminKeypair: Keypair,
    options: DistributionServiceOptions = {}
  ) {
    this.rpcClient = options.rpcClient || new SolanaRpcClient({ network });
    this.storage = options.storage || new FileStorage();
    this.logger = options.logger || createLogger('DistributionService');
    this.batchSize = options.batchSize || 10;
    this.maxRetries = options.maxRetries || 3;
  }

  public async executeDistribution(
    request: DistributionRequest,
    onProgress?: (progress: {
      completed: number;
      total: number;
      successful: number;
      failed: number;
      rate: number;
    }) => void
  ): Promise<Distribution> {
    return this.logger.logOperation('executeDistribution', async () => {
      this.validateDistributionRequest(request);

      const distributionId = this.generateDistributionId();
      const distribution = new Distribution(distributionId, request);

      await this.validateTokenBalance(request);

      const batches = this.createBatches(request.holders, request.batchSize || this.batchSize);
      const startTime = Date.now();
      let completed = 0;
      let successful = 0;
      let failed = 0;

      this.logger.info('Starting token distribution', {
        distributionId,
        totalRecipients: request.holders.length,
        totalAmount: request.amount,
        batchCount: batches.length
      });

      for (const [batchIndex, batch] of batches.entries()) {
        this.logger.debug(`Processing batch ${batchIndex + 1}/${batches.length}`, {
          batchSize: batch.length
        });

        const batchResults = await this.processBatch(
          batch,
          request.tokenAddress,
          request.amount,
          distributionId
        );

        for (const result of batchResults) {
          distribution.addResult(result);
          completed++;

          if (result.status === 'confirmed') {
            successful++;
          } else if (result.status === 'failed') {
            failed++;
          }

          if (onProgress) {
            const elapsed = Date.now() - startTime;
            const rate = completed / (elapsed / 1000);
            onProgress({
              completed,
              total: request.holders.length,
              successful,
              failed,
              rate
            });
          }
        }

        await this.delay(100);
      }

      await this.saveDistribution(distribution);

      const duration = Date.now() - startTime;
      this.logger.info('Distribution completed', {
        distributionId,
        duration,
        successful,
        failed,
        totalAmount: distribution.getTotalAmount()
      });

      return distribution;
    }, {
      amount: request.amount,
      recipients: request.holders.length
    });
  }

  public async simulateDistribution(request: DistributionRequest): Promise<SimulationResult> {
    return this.logger.logOperation('simulateDistribution', async () => {
      this.validateDistributionRequest(request);

      const distributionAmounts = this.calculateDistributionAmounts(
        request.holders,
        request.amount
      );

      const estimatedGasCost = this.estimateGasCost(request.holders.length);
      const estimatedDuration = this.estimateDuration(request.holders.length, request.batchSize || this.batchSize);

      const amounts = Array.from(distributionAmounts.values());
      const distributionBreakdown = {
        totalAmount: request.amount,
        recipientCount: amounts.length,
        averageAmount: amounts.reduce((a, b) => a + b, 0) / amounts.length,
        minAmount: Math.min(...amounts),
        maxAmount: Math.max(...amounts)
      };

      const riskFactors = await this.assessRiskFactors(request);

      return {
        estimatedGasCost,
        estimatedDuration,
        distributionBreakdown,
        riskFactors
      };
    }, {
      amount: request.amount,
      recipients: request.holders.length
    });
  }

  public async validateDistribution(request: DistributionRequest): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      this.validateDistributionRequest(request);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error.message);
      }
    }

    try {
      await this.validateTokenBalance(request);
    } catch (error) {
      if (error instanceof ResourceError) {
        errors.push(error.message);
      }
    }

    const duplicateAddresses = this.findDuplicateAddresses(request.holders);
    if (duplicateAddresses.length > 0) {
      warnings.push(`Found ${duplicateAddresses.length} duplicate recipient addresses`);
    }

    const zeroBalanceHolders = request.holders.filter(h => h.balance === 0);
    if (zeroBalanceHolders.length > 0) {
      warnings.push(`Found ${zeroBalanceHolders.length} recipients with zero balance`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateDistributionRequest(request: DistributionRequest): void {
    if (!request.amount || request.amount <= 0) {
      throw new ValidationError('Distribution amount must be positive');
    }

    if (!request.tokenAddress) {
      throw new ValidationError('Token address is required');
    }

    if (!request.holders || request.holders.length === 0) {
      throw new ValidationError('At least one recipient is required');
    }

    if (request.batchSize && request.batchSize <= 0) {
      throw new ValidationError('Batch size must be positive');
    }
  }

  private async validateTokenBalance(request: DistributionRequest): Promise<void> {
    try {
      const connection = this.rpcClient.getConnection();
      const adminTokenAccount = await getAssociatedTokenAddress(
        request.tokenAddress,
        this.adminKeypair.publicKey
      );

      const balance = await connection.getTokenAccountBalance(adminTokenAccount);
      const availableAmount = Number(balance.value.amount) / Math.pow(10, balance.value.decimals);

      if (availableAmount < request.amount) {
        throw new ResourceError(
          `Insufficient token balance. Required: ${request.amount}, Available: ${availableAmount}`,
          { required: request.amount, available: availableAmount }
        );
      }
    } catch (error) {
      if (error instanceof ResourceError) {
        throw error;
      }
      throw new NetworkError(
        `Failed to validate token balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { tokenAddress: request.tokenAddress.toString() }
      );
    }
  }

  private async processBatch(
    batch: TokenHolder[],
    tokenAddress: PublicKey,
    totalAmount: number,
    distributionId: string
  ): Promise<DistributionResult[]> {
    const results: DistributionResult[] = [];
    const distributionAmounts = this.calculateDistributionAmounts(batch, totalAmount);

    for (const holder of batch) {
      const amount = distributionAmounts.get(holder.address.toString()) || 0;

      if (amount === 0) {
        continue;
      }

      const result: DistributionResult = {
        transactionId: '',
        status: 'pending',
        recipient: holder.address,
        amount,
        timestamp: new Date()
      };

      try {
        result.transactionId = await this.sendTokens(
          holder.address,
          amount,
          tokenAddress,
          distributionId
        );
        result.status = 'confirmed';

        this.logger.debug('Token transfer successful', {
          recipient: holder.address.toString(),
          amount,
          txId: result.transactionId
        });

      } catch (error) {
        result.status = 'failed';
        result.error = error instanceof Error ? error.message : String(error);

        this.logger.warn('Token transfer failed', {
          recipient: holder.address.toString(),
          amount,
          error: result.error
        });
      }

      results.push(result);
    }

    return results;
  }

  private async sendTokens(
    recipient: PublicKey,
    amount: number,
    tokenAddress: PublicKey,
    _distributionId: string
  ): Promise<string> {
    const connection = this.rpcClient.getConnection();

    const adminTokenAccount = await getAssociatedTokenAddress(
      tokenAddress,
      this.adminKeypair.publicKey
    );

    const recipientTokenAccount = await getAssociatedTokenAddress(
      tokenAddress,
      recipient
    );

    const transaction = new Transaction();
    const instructions: TransactionInstruction[] = [];

    const recipientAccountInfo = await connection.getAccountInfo(recipientTokenAccount);
    if (!recipientAccountInfo) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          this.adminKeypair.publicKey,
          recipientTokenAccount,
          recipient,
          tokenAddress,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    const decimals = await this.rpcClient.getTokenDecimals(tokenAddress);
    const adjustedAmount = Math.floor(amount * Math.pow(10, decimals));

    instructions.push(
      createTransferInstruction(
        adminTokenAccount,
        recipientTokenAccount,
        this.adminKeypair.publicKey,
        adjustedAmount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    transaction.add(...instructions);

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.adminKeypair.publicKey;

    return await this.rpcClient.withRetry(async () => {
      return await sendAndConfirmTransaction(
        connection,
        transaction,
        [this.adminKeypair],
        {
          commitment: 'confirmed',
          maxRetries: this.maxRetries
        }
      );
    });
  }

  private calculateDistributionAmounts(
    holders: TokenHolder[],
    totalAmount: number
  ): Map<string, number> {
    const totalBalance = holders.reduce((sum, holder) => sum + holder.balance, 0);
    const distributionMap = new Map<string, number>();

    if (totalBalance === 0) {
      return distributionMap;
    }

    let remainingAmount = totalAmount;

    for (const holder of holders) {
      const ratio = holder.balance / totalBalance;
      const distributionAmount = Math.floor(totalAmount * ratio);

      if (distributionAmount > 0 && remainingAmount >= distributionAmount) {
        distributionMap.set(holder.address.toString(), distributionAmount);
        remainingAmount -= distributionAmount;
      }
    }

    return distributionMap;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private estimateGasCost(recipientCount: number): number {
    const averageGasPerTransaction = 0.000005; // SOL
    return recipientCount * averageGasPerTransaction;
  }

  private estimateDuration(recipientCount: number, batchSize: number): number {
    const averageTimePerBatch = 2; // seconds
    const batchCount = Math.ceil(recipientCount / batchSize);
    return batchCount * averageTimePerBatch * 1000; // milliseconds
  }

  private async assessRiskFactors(request: DistributionRequest): Promise<string[]> {
    const risks: string[] = [];

    if (request.amount > 100000) {
      risks.push('Large distribution amount may require additional confirmation');
    }

    if (request.holders.length > 1000) {
      risks.push('Large number of recipients may result in longer execution time');
    }

    const smallAmounts = request.holders.filter(h => (request.amount * h.percentage / 100) < 0.001);
    if (smallAmounts.length > 0) {
      risks.push(`${smallAmounts.length} recipients will receive very small amounts`);
    }

    return risks;
  }

  private findDuplicateAddresses(holders: TokenHolder[]): string[] {
    const addressCounts = new Map<string, number>();
    const duplicates: string[] = [];

    for (const holder of holders) {
      const address = holder.address.toString();
      const count = addressCounts.get(address) || 0;
      addressCounts.set(address, count + 1);

      if (count === 1) {
        duplicates.push(address);
      }
    }

    return duplicates;
  }

  private generateDistributionId(): string {
    return `dist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveDistribution(distribution: Distribution): Promise<void> {
    try {
      const filename = `distribution_${distribution.id}.json`;
      await this.storage.writeJson(filename, {
        id: distribution.id,
        request: distribution.request,
        results: distribution.getResults(),
        createdAt: distribution.createdAt,
        completed: distribution.isCompleted(),
        successfulCount: distribution.getSuccessfulCount(),
        failedCount: distribution.getFailedCount(),
        totalAmount: distribution.getTotalAmount()
      });

      this.logger.debug('Distribution saved to storage', {
        distributionId: distribution.id,
        filename
      });
    } catch (error) {
      this.logger.error('Failed to save distribution', {
        distributionId: distribution.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async getDistributionHistory(): Promise<Distribution[]> {
    return this.logger.logOperation('getDistributionHistory', async () => {
      const files = await this.storage.list();
      const distributionFiles = files.filter(file => file.startsWith('distribution_'));

      const distributions: Distribution[] = [];

      for (const file of distributionFiles) {
        try {
          const data = await this.storage.readJson<{
            id: string;
            request: DistributionRequest;
            results: DistributionResult[];
            createdAt: string;
          }>(file);
          const distribution = new Distribution(data.id, data.request, new Date(data.createdAt));

          for (const result of data.results) {
            distribution.addResult(result);
          }

          distributions.push(distribution);
        } catch (error) {
          this.logger.warn('Failed to load distribution file', {
            file,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      return distributions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    });
  }
}