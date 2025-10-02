import { PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { SolanaRpcClient } from '../../../infrastructure/rpc/SolanaRpcClient';
import { createLogger } from '../../../infrastructure/logging/Logger';
import { DistributionRequestV2, DistributionResultV2, DistributionRecipient } from './types/DistributionTypes';
import { NetworkError, ValidationError } from '../../../domain/errors';
import { ITokenTransferStrategy } from './interfaces/ITokenTransferStrategy';
import { DistributionValidator, ValidationResult } from './validators/DistributionValidator';
import { DistributionCalculator, DistributionCalculation } from './calculators/DistributionCalculator';

export interface DistributionOrchestratorOptions {
  rpcClient: SolanaRpcClient;
  transferStrategy: ITokenTransferStrategy;
  validator?: DistributionValidator;
  calculator?: DistributionCalculator;
  batchSize?: number;
  maxRetries?: number;
}

export class DistributionOrchestrator {
  private rpcClient: SolanaRpcClient;
  private transferStrategy: ITokenTransferStrategy;
  private validator: DistributionValidator;
  private calculator: DistributionCalculator;
  private logger = createLogger('DistributionOrchestrator');
  private batchSize: number;
  private maxRetries: number;

  constructor(options: DistributionOrchestratorOptions) {
    this.rpcClient = options.rpcClient;
    this.transferStrategy = options.transferStrategy;
    this.validator = options.validator || new DistributionValidator(options.rpcClient);
    this.calculator = options.calculator || new DistributionCalculator();
    this.batchSize = options.batchSize || 10;
    this.maxRetries = options.maxRetries || 3;
  }

  async executeDistribution(
    request: DistributionRequestV2,
    senderKeypair: Keypair
  ): Promise<DistributionResultV2> {
    this.logger.info('Starting distribution execution', {
      strategy: this.transferStrategy.getStrategyName(),
      recipientCount: request.recipients.length
    });

    // 1. 検証
    const validationResult = await this.validateDistribution(request);
    if (!validationResult.isValid) {
      throw new ValidationError(`Distribution validation failed: ${validationResult.errors.join(', ')}`);
    }

    // 2. 計算
    const calculation = this.calculateDistribution(request.recipients);

    // 3. 実行
    const result = await this.performDistribution(request, senderKeypair, calculation);

    this.logger.info('Distribution completed', {
      successful: result.successful.length,
      failed: result.failed.length,
      totalGasCost: result.totalGasCost
    });

    return result;
  }

  async validateDistribution(request: DistributionRequestV2): Promise<ValidationResult> {
    this.logger.debug('Validating distribution request');
    return await this.validator.validateDistributionRequest(request);
  }

  calculateDistribution(recipients: DistributionRecipient[]): DistributionCalculation {
    this.logger.debug('Calculating distribution parameters');
    return this.calculator.calculateDistribution(recipients);
  }

  async simulateDistribution(request: DistributionRequestV2): Promise<DistributionCalculation> {
    // 検証なしで計算のみ実行
    return this.calculateDistribution(request.recipients);
  }

  private async performDistribution(
    request: DistributionRequestV2,
    senderKeypair: Keypair,
    _calculation: DistributionCalculation
  ): Promise<DistributionResultV2> {
    const result: DistributionResultV2 = {
      successful: [],
      failed: [],
      totalGasCost: 0,
      executionTime: 0,
      transactionHashes: []
    };

    const startTime = Date.now();

    try {
      // バッチに分割して実行
      const batches = this.createBatches(request.recipients);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.logger.info(`Processing batch ${i + 1}/${batches.length}`, {
          batchSize: batch.length
        });

        try {
          const batchResult = await this.executeBatch(request, senderKeypair, batch);

          result.successful.push(...batchResult.successful);
          result.failed.push(...batchResult.failed);
          result.totalGasCost += batchResult.gasCost;
          result.transactionHashes.push(...batchResult.transactionHashes);

        } catch (error) {
          this.logger.error(`Batch ${i + 1} failed`, error as Error);

          // バッチ全体が失敗した場合、個別に記録
          batch.forEach(recipient => {
            result.failed.push({
              recipient,
              error: `Batch execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
          });
        }

        // バッチ間の遅延
        if (i < batches.length - 1) {
          await this.delay(1000); // 1秒待機
        }
      }

    } catch (error) {
      this.logger.error('Distribution execution failed', error as Error);
      throw new NetworkError(`Distribution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }

  private async executeBatch(
    request: DistributionRequestV2,
    senderKeypair: Keypair,
    batch: DistributionRecipient[]
  ): Promise<{
    successful: DistributionRecipient[];
    failed: Array<{ recipient: DistributionRecipient; error: string }>;
    gasCost: number;
    transactionHashes: string[];
  }> {
    const context = {
      senderPublicKey: senderKeypair.publicKey,
      tokenMintAddress: request.tokenMint ? new PublicKey(request.tokenMint) : senderKeypair.publicKey,
      recipients: batch,
      decimals: request.decimals || 9
    };

    // 転送命令を生成
    const instructions = await this.transferStrategy.createTransferInstructions(context);

    // トランザクション作成
    const transaction = new Transaction().add(...instructions);
    transaction.feePayer = senderKeypair.publicKey;

    // Recent blockhash設定
    const { blockhash } = await this.rpcClient.getConnection().getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    // トランザクション送信
    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        const signature = await sendAndConfirmTransaction(
          this.rpcClient.getConnection(),
          transaction,
          [senderKeypair],
          { commitment: 'confirmed' }
        );

        // ガス代計算（概算）
        const gasCost = batch.length * 0.000005;

        return {
          successful: batch,
          failed: [],
          gasCost,
          transactionHashes: [signature]
        };

      } catch (error) {
        retries++;
        this.logger.warn(`Batch execution attempt ${retries} failed`, { error: error instanceof Error ? error.message : String(error) });

        if (retries >= this.maxRetries) {
          throw error;
        }

        await this.delay(1000 * retries); // 指数バックオフ
      }
    }

    throw new NetworkError('Max retries exceeded');
  }

  private createBatches(recipients: DistributionRecipient[]): DistributionRecipient[][] {
    const batches: DistributionRecipient[][] = [];

    for (let i = 0; i < recipients.length; i += this.batchSize) {
      batches.push(recipients.slice(i, i + this.batchSize));
    }

    return batches;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Strategy 変更メソッド
  setTransferStrategy(strategy: ITokenTransferStrategy): void {
    this.transferStrategy = strategy;
    this.logger.info(`Transfer strategy changed to: ${strategy.getStrategyName()}`);
  }

  setBatchSize(batchSize: number): void {
    this.batchSize = Math.max(1, Math.min(batchSize, 50));
    this.calculator.setBatchSize(this.batchSize);
  }
}