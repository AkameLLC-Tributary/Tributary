import { Keypair } from '@solana/web3.js';
import { SolanaRpcClient } from '../../infrastructure/rpc/SolanaRpcClient';
import { FileStorage } from '../../infrastructure/storage';
import { Logger, createLogger } from '../../infrastructure/logging/Logger';
import {
  DistributionRequestV2,
  DistributionResultV2,
  DistributionRecipient
} from './distribution/types/DistributionTypes';
import { ConfigurationManager } from '../../config/ConfigurationManager';
import { DistributionOrchestrator } from './distribution/DistributionOrchestrator';
import { TransferStrategyFactory, TransferType } from './distribution/factories/TransferStrategyFactory';
import { DistributionValidator } from './distribution/validators/DistributionValidator';
import { DistributionCalculator, DistributionCalculation } from './distribution/calculators/DistributionCalculator';

export interface DistributionServiceOptions {
  rpcClient?: SolanaRpcClient;
  storage?: FileStorage;
  logger?: Logger;
  configManager?: ConfigurationManager;
  batchSize?: number;
  maxRetries?: number;
}

/**
 * リファクタリングされたDistributionService
 * - Strategy Pattern: 転送方式の切り替え
 * - Factory Pattern: Strategy の生成
 * - Single Responsibility: 各クラスが単一責任
 * - Dependency Injection: テスタビリティ向上
 */
export class DistributionService {
  private rpcClient: SolanaRpcClient;
  private storage: FileStorage;
  private logger: Logger;
  private configManager: ConfigurationManager;
  private transferStrategyFactory: TransferStrategyFactory;
  private validator: DistributionValidator;
  private calculator: DistributionCalculator;
  private batchSize: number;
  private maxRetries: number;

  constructor(options: DistributionServiceOptions = {}) {
    this.rpcClient = options.rpcClient || new SolanaRpcClient({ network: 'devnet' });
    this.storage = options.storage || new FileStorage();
    this.logger = options.logger || createLogger('DistributionService');
    this.configManager = options.configManager || new ConfigurationManager();
    this.transferStrategyFactory = new TransferStrategyFactory(this.rpcClient);
    this.validator = new DistributionValidator(this.rpcClient);
    this.calculator = new DistributionCalculator();

    // 設定から値を取得
    const config = this.configManager.getConfig();
    this.batchSize = options.batchSize || config.distribution.default_batch_size;
    this.maxRetries = options.maxRetries || config.network.max_retries;
  }

  async executeDistribution(
    request: DistributionRequestV2,
    senderKeypair: Keypair
  ): Promise<DistributionResultV2> {
    this.logger.info('Starting distribution execution', {
      tokenMint: request.tokenMint || 'Native SOL',
      recipientCount: request.recipients.length
    });

    // 適切なストラテジーを選択
    const strategy = this.transferStrategyFactory.createStrategyFromTokenMint(request.tokenMint);

    // オーケストレーターを作成
    const orchestrator = new DistributionOrchestrator({
      rpcClient: this.rpcClient,
      transferStrategy: strategy,
      validator: this.validator,
      calculator: this.calculator,
      batchSize: this.batchSize,
      maxRetries: this.maxRetries
    });

    // 実行
    return await orchestrator.executeDistribution(request, senderKeypair);
  }

  async simulateDistribution(request: DistributionRequestV2): Promise<DistributionCalculation> {
    this.logger.info('Simulating distribution', {
      tokenMint: request.tokenMint || 'Native SOL',
      recipientCount: request.recipients.length
    });

    const strategy = this.transferStrategyFactory.createStrategyFromTokenMint(request.tokenMint);

    const orchestrator = new DistributionOrchestrator({
      rpcClient: this.rpcClient,
      transferStrategy: strategy,
      validator: this.validator,
      calculator: this.calculator,
      batchSize: this.batchSize,
      maxRetries: this.maxRetries
    });

    return await orchestrator.simulateDistribution(request);
  }

  async validateDistribution(request: DistributionRequestV2) {
    this.logger.info('Validating distribution request');
    return await this.validator.validateDistributionRequest(request);
  }

  // 設定変更メソッド
  setBatchSize(batchSize: number): void {
    const config = this.configManager.getConfig();
    const maxBatchSize = config.distribution.max_batch_size;
    this.batchSize = Math.max(1, Math.min(batchSize, maxBatchSize));
    this.calculator.setBatchSize(this.batchSize);
    this.logger.info(`Batch size changed to: ${this.batchSize}`);
  }

  setMaxRetries(maxRetries: number): void {
    this.maxRetries = Math.max(1, maxRetries);
    this.logger.info(`Max retries changed to: ${this.maxRetries}`);
  }

  // ユーティリティメソッド
  async estimateDistributionCost(recipients: DistributionRecipient[]): Promise<number> {
    const calculation = this.calculator.calculateDistribution(recipients);
    return calculation.estimatedGasCost;
  }

  async getOptimalBatchSize(recipientCount: number): Promise<number> {
    const config = this.configManager.getConfig();
    const defaultBatchSize = config.distribution.default_batch_size;
    const maxBatchSize = config.distribution.max_batch_size;

    // 受信者数に基づいて最適なバッチサイズを算出
    if (recipientCount <= defaultBatchSize) return recipientCount;
    if (recipientCount <= 100) return defaultBatchSize;
    if (recipientCount <= 1000) return Math.min(defaultBatchSize * 2, maxBatchSize);
    return Math.min(defaultBatchSize * 2.5, maxBatchSize); // 大量配布の場合
  }

  // ファクトリーメソッド
  createNativeDistributor(): DistributionOrchestrator {
    const strategy = this.transferStrategyFactory.createStrategy(TransferType.NATIVE_SOL);
    return new DistributionOrchestrator({
      rpcClient: this.rpcClient,
      transferStrategy: strategy,
      validator: this.validator,
      calculator: this.calculator,
      batchSize: this.batchSize,
      maxRetries: this.maxRetries
    });
  }

  createSplTokenDistributor(): DistributionOrchestrator {
    const strategy = this.transferStrategyFactory.createStrategy(TransferType.SPL_TOKEN);
    return new DistributionOrchestrator({
      rpcClient: this.rpcClient,
      transferStrategy: strategy,
      validator: this.validator,
      calculator: this.calculator,
      batchSize: this.batchSize,
      maxRetries: this.maxRetries
    });
  }
}