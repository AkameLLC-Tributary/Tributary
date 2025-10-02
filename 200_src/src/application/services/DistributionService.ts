import {
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  TransactionInstruction
} from '@solana/web3.js';
import {
  createTransferInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID
} from '@solana/spl-token';
import { SolanaRpcClient } from '../../infrastructure/rpc/SolanaRpcClient';
import { FileStorage } from '../../infrastructure/storage';
import { Logger, createLogger } from '../../infrastructure/logging/Logger';
import {
  TokenHolder,
  DistributionRequest,
  DistributionResult,
  Distribution,
  NetworkType,
  DistributionMode
} from '../../domain/models';
import {
  ValidationError,
  NetworkError,
  ResourceError
} from '../../domain/errors';
import { ConfigurationManager } from '../../config/ConfigurationManager';
import { RobustPublicKeyHandler } from '../../shared/utils/enhanced-publickey-solution';

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
  private readonly configManager: ConfigurationManager;

  constructor(
    network: NetworkType,
    private readonly adminKeypair: Keypair,
    options: DistributionServiceOptions = {}
  ) {
    this.configManager = new ConfigurationManager();
    const config = this.configManager.getConfig();

    this.rpcClient = options.rpcClient || new SolanaRpcClient({ network });
    this.storage = options.storage || new FileStorage();
    this.logger = options.logger || createLogger('DistributionService');
    this.batchSize = options.batchSize || config.distribution.default_batch_size;
    this.maxRetries = options.maxRetries || config.network.max_retries;

    // Debug log keypair information
    this.logger.debug('DistributionService constructor', {
      adminWallet: this.adminKeypair.publicKey.toString(),
      keypairType: typeof this.adminKeypair,
      publicKeyType: typeof this.adminKeypair.publicKey,
      hasToBuffer: typeof this.adminKeypair.publicKey.toBuffer
    });
  }

  /**
   * 完全に堅牢なPublicKey作成ユーティリティ関数
   * CLI実行環境での間欠的な問題を根本的に解決
   */
  private createRobustPublicKey(input: PublicKey | string): PublicKey {
    this.logger.debug('Using RobustPublicKeyHandler for PublicKey creation');
    const result = RobustPublicKeyHandler.createSafePublicKey(input);
    return RobustPublicKeyHandler.ensureCLISafety(result);
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
      this.logger.debug('executeDistribution called', {
        holdersCount: request.holders.length,
        firstHolder: request.holders[0] ? {
          address: request.holders[0].address.toString(),
          addressType: typeof request.holders[0].address,
          balance: request.holders[0].balance
        } : null,
        amount: request.amount,
        tokenAddress: request.tokenAddress.toString()
      });

      this.validateDistributionRequest(request);

      const distributionId = this.generateDistributionId();
      const distribution = new Distribution(distributionId, request);

      await this.validateTokenBalance(request);

      this.logger.debug('Creating batches', {
        holdersLength: request.holders.length,
        batchSize: request.batchSize || this.batchSize
      });

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
        console.log('=== BEFORE processBatch CALL ===');
        console.log('batchIndex:', batchIndex);
        console.log('batch:', batch);
        console.log('request.tokenAddress:', request.tokenAddress);
        console.log('request.amount:', request.amount);
        console.log('distributionId:', distributionId);

        this.logger.debug(`Processing batch ${batchIndex + 1}/${batches.length}`, {
          batchSize: batch.length
        });

        console.log('=== CALLING processBatch ===');
        const batchResults = await this.processBatch(
          batch,
          request.tokenAddress,
          request.amount,
          distributionId
        );
        console.log('=== processBatch RETURNED ===');

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

        const config = this.configManager.getConfig();
        await this.delay(config.distribution.batch_delay_ms);
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
        request.amount,
        request.mode || 'proportional',
        request.minimumAmount || 0
      );

      const estimatedGasCost = this.estimateGasCost(request.holders.length);
      const estimatedDuration = this.estimateDuration(request.holders.length, request.batchSize || this.batchSize);

      const amounts = Array.from(distributionAmounts.values());
      const distributionBreakdown = {
        totalAmount: request.amount,
        recipientCount: request.holders.length, // Use actual holder count, not filtered amounts
        averageAmount: amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0,
        minAmount: amounts.length > 0 ? Math.min(...amounts) : 0,
        maxAmount: amounts.length > 0 ? Math.max(...amounts) : 0
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

  private async detectTokenProgram(tokenAddress: PublicKey): Promise<PublicKey> {
    try {
      const connection = this.rpcClient.getConnection();
      const mintInfo = await connection.getAccountInfo(tokenAddress);

      if (!mintInfo) {
        throw new Error(`Token mint ${tokenAddress.toString()} not found`);
      }

      // Check if it's Token 2022 program
      // mintInfo.owner is a PublicKey instance, but ensure it's properly handled
      const ownerPubkey = new PublicKey(mintInfo.owner);
      if (ownerPubkey.equals(TOKEN_2022_PROGRAM_ID)) {
        this.logger.info('Detected Token 2022', { tokenAddress: tokenAddress.toString() });
        return TOKEN_2022_PROGRAM_ID;
      }

      // Default to standard token program
      this.logger.info('Detected Standard Token', { tokenAddress: tokenAddress.toString() });
      return TOKEN_PROGRAM_ID;
    } catch (error) {
      this.logger.warn('Failed to detect token program, defaulting to standard token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tokenAddress: tokenAddress.toString()
      });
      return TOKEN_PROGRAM_ID;
    }
  }

  private async validateTokenBalance(request: DistributionRequest): Promise<void> {
    try {
      const connection = this.rpcClient.getConnection();
      const tokenProgram = await this.detectTokenProgram(request.tokenAddress);

      const adminTokenAccount = await getAssociatedTokenAddress(
        request.tokenAddress,
        this.adminKeypair.publicKey,
        false,
        tokenProgram
      );

      // Check if the token account exists
      const accountInfo = await connection.getAccountInfo(adminTokenAccount);

      if (!accountInfo) {
        // Token account doesn't exist, create it
        this.logger.info('Creating associated token account for admin wallet', {
          tokenAddress: request.tokenAddress.toString(),
          adminWallet: this.adminKeypair.publicKey.toString(),
          tokenAccount: adminTokenAccount.toString()
        });

        const safeAdminPublicKey = this.createRobustPublicKey(this.adminKeypair.publicKey);
        const safeAdminTokenAccount = this.createRobustPublicKey(adminTokenAccount);
        const safeTokenAddress = this.createRobustPublicKey(request.tokenAddress);

        const transaction = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            safeAdminPublicKey, // payer
            safeAdminTokenAccount, // ata
            safeAdminPublicKey, // owner
            safeTokenAddress, // mint
            tokenProgram
          )
        );

        await sendAndConfirmTransaction(connection, transaction, [this.adminKeypair]);

        this.logger.info('Associated token account created successfully', {
          tokenAccount: adminTokenAccount.toString()
        });
      }

      const balance = await connection.getTokenAccountBalance(adminTokenAccount);
      const availableAmount = Number(balance.value.amount) / Math.pow(10, balance.value.decimals);

      if (availableAmount < request.amount) {
        throw new ResourceError(
          `Insufficient token balance. Required: ${request.amount}, Available: ${availableAmount}`,
          { required: request.amount, available: availableAmount }
        );
      }

      this.logger.info('Token balance validation successful', {
        required: request.amount,
        available: availableAmount,
        tokenAccount: adminTokenAccount.toString()
      });
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
    console.log('=== processBatch CALLED ===');
    console.log('batch:', batch);
    console.log('batch.length:', batch.length);
    console.log('first holder:', batch[0]);
    if (batch[0]) {
      console.log('first holder address:', batch[0].address);
      console.log('first holder address type:', typeof batch[0].address);
      console.log('first holder address instanceof PublicKey:', batch[0].address instanceof PublicKey);
    }
    const results: DistributionResult[] = [];
    const distributionAmounts = this.calculateDistributionAmounts(
      batch,
      totalAmount,
      'proportional', // Default for actual distribution
      0
    );

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
        console.log('=== DEBUG: Processing token holder ===');
        console.log('holder:', holder);
        console.log('holder.address:', holder.address);
        console.log('holder.address type:', typeof holder.address);
        console.log('holder.address instanceof PublicKey:', holder.address instanceof PublicKey);
        console.log('tokenAddress:', tokenAddress);
        console.log('tokenAddress type:', typeof tokenAddress);

        this.logger.debug('Processing token holder', {
          holderAddress: holder.address.toString(),
          holderAddressType: typeof holder.address,
          amount,
          tokenAddress: tokenAddress.toString()
        });

        console.log('=== Before sendTokens call ===');
        result.transactionId = await this.sendTokens(
          holder.address,
          amount,
          tokenAddress,
          distributionId
        );
        console.log('=== After sendTokens call ===');
        result.status = 'confirmed';

        this.logger.debug('Token transfer successful', {
          recipient: holder.address.toString(),
          amount,
          txId: result.transactionId
        });

      } catch (error) {
        result.status = 'failed';
        result.error = error instanceof Error ? error.message : String(error);

        // 詳細なエラー情報を取得
        const errorDetails = {
          recipient: holder.address.toString(),
          amount,
          error: result.error,
          errorType: typeof error,
          errorConstructor: error?.constructor?.name,
          stack: error instanceof Error ? error.stack : null,
          errorKeys: error instanceof Error ? Object.keys(error) : null
        };

        this.logger.error('Token transfer failed - detailed analysis', errorDetails);

        // エラーの原因をさらに詳しく調べる
        if (error instanceof Error && error.message.includes('owner.toBuffer')) {
          this.logger.error('owner.toBuffer error detected - investigating', {
            adminKeypairType: typeof this.adminKeypair,
            adminPublicKeyType: typeof this.adminKeypair.publicKey,
            adminPublicKeyConstructor: this.adminKeypair.publicKey?.constructor?.name,
            hasToBuffer: typeof this.adminKeypair.publicKey?.toBuffer,
            publicKeyMethods: this.adminKeypair.publicKey ? Object.getOwnPropertyNames(this.adminKeypair.publicKey) : null,
            holderAddressType: typeof holder.address,
            holderAddressConstructor: holder.address?.constructor?.name
          });
        }

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
    console.log('🔍 sendTokens called - ROUTING DECISION');
    console.log('recipient:', recipient.toString());
    console.log('tokenAddress:', tokenAddress.toString());

    // Token 2022の場合は専用関数を使用
    const tokenProgram = await this.detectTokenProgram(tokenAddress);
    console.log('🔍 tokenProgram detected:', tokenProgram.toString());
    console.log('🔍 TOKEN_2022_PROGRAM_ID:', TOKEN_2022_PROGRAM_ID.toString());
    console.log('🔍 equals check result:', tokenProgram.equals(TOKEN_2022_PROGRAM_ID));

    if (tokenProgram.equals(TOKEN_2022_PROGRAM_ID)) {
      console.log('🔍 ROUTING TO: sendToken2022');
      return this.sendToken2022(recipient, amount, tokenAddress, _distributionId);
    }
    console.log('🔍 ROUTING TO: sendStandardToken');
    return this.sendStandardToken(recipient, amount, tokenAddress, _distributionId);
  }

  private async sendToken2022(
    recipient: PublicKey,
    amount: number,
    tokenAddress: PublicKey,
    _distributionId: string
  ): Promise<string> {

    console.log('🔍 sendToken2022 called - INITIAL STATE');
    this.logger.debug('sendToken2022 called - INITIAL STATE', {
      recipient: recipient.toString(),
      amount,
      tokenAddress: tokenAddress.toString(),
      recipientType: typeof recipient,
      recipientConstructor: recipient.constructor.name,
      recipientHasToBuffer: typeof recipient.toBuffer === 'function',
      tokenAddressType: typeof tokenAddress,
      tokenAddressHasToBuffer: typeof tokenAddress.toBuffer === 'function'
    });

    const connection = this.rpcClient.getConnection();

    // 各パラメータが正確にPublicKeyであることを保証
    let cleanRecipient: PublicKey;
    let cleanTokenAddress: PublicKey;
    let cleanOwner: PublicKey;

    try {
      // 型チェックとPublicKey変換を安全に実行
      cleanRecipient = recipient instanceof PublicKey ? recipient : new PublicKey(String(recipient));
      cleanTokenAddress = tokenAddress instanceof PublicKey ? tokenAddress : new PublicKey(String(tokenAddress));

      // CLI環境での破損したPublicKeyを完全復元
      console.log('🔧 adminKeypair.publicKey分析:');
      console.log('this.adminKeypair.publicKey:', this.adminKeypair.publicKey);
      console.log('type:', typeof this.adminKeypair.publicKey);
      console.log('constructor:', this.adminKeypair.publicKey?.constructor?.name);
      console.log('has toBuffer:', !!this.adminKeypair.publicKey?.toBuffer);

      const ownerString = this.adminKeypair.publicKey.toString();
      console.log('ownerString:', ownerString);

      // Always create a fresh PublicKey object from string to avoid any conversion issues
      cleanOwner = new PublicKey(ownerString);

      console.log('🔧 新規作成したcleanOwner:');
      console.log('cleanOwner type:', typeof cleanOwner);
      console.log('cleanOwner constructor:', cleanOwner.constructor.name);
      console.log('cleanOwner has toBuffer:', !!cleanOwner.toBuffer);

      // toBufferテスト
      if (cleanOwner.toBuffer) {
        try {
          const testBuffer = cleanOwner.toBuffer();
          console.log('✅ cleanOwner.toBuffer() 成功, length:', testBuffer.length);
        } catch (e) {
          console.log('❌ cleanOwner.toBuffer() 失敗:', e instanceof Error ? e.message : String(e));
        }
      } else {
        console.log('❌ cleanOwner.toBuffer メソッド存在しない');
      }

      this.logger.debug('PublicKey objects validated', {
        cleanRecipient: cleanRecipient.toString(),
        cleanTokenAddress: cleanTokenAddress.toString(),
        cleanOwner: cleanOwner.toString()
      });

      // Token 2022用のアカウントアドレスを取得
      const adminTokenAccount = await getAssociatedTokenAddress(
        cleanTokenAddress,
        cleanOwner,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const recipientTokenAccount = await getAssociatedTokenAddress(
        cleanTokenAddress,
        cleanRecipient,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      this.logger.debug('Token accounts calculated', {
        adminTokenAccount: adminTokenAccount.toString(),
        recipientTokenAccount: recipientTokenAccount.toString()
      });

      const transaction = new Transaction();
      const instructions: TransactionInstruction[] = [];

      // BEFORE createRobustPublicKey - 元オブジェクトの状態確認
      console.log('🔍 BEFORE createRobustPublicKey calls');
      console.log('adminTokenAccount.toBuffer:', typeof adminTokenAccount.toBuffer);
      console.log('cleanOwner.toBuffer:', typeof cleanOwner.toBuffer);
      this.logger.debug('BEFORE createRobustPublicKey calls', {
        adminTokenAccount: adminTokenAccount.toString(),
        adminTokenAccountHasToBuffer: typeof adminTokenAccount.toBuffer === 'function',
        cleanTokenAddress: cleanTokenAddress.toString(),
        cleanTokenAddressHasToBuffer: typeof cleanTokenAddress.toBuffer === 'function',
        cleanOwner: cleanOwner.toString(),
        cleanOwnerHasToBuffer: typeof cleanOwner.toBuffer === 'function',
        cleanRecipient: cleanRecipient.toString(),
        cleanRecipientHasToBuffer: typeof cleanRecipient.toBuffer === 'function'
      });

      // 全てのPublicKeyオブジェクトを安全に再作成
      const safeAdminTokenAccount = this.createRobustPublicKey(adminTokenAccount);
      const safeCleanTokenAddress = this.createRobustPublicKey(cleanTokenAddress);
      const safeRecipientTokenAccount = this.createRobustPublicKey(recipientTokenAccount);
      const safeCleanOwner = this.createRobustPublicKey(cleanOwner);
      const safeCleanRecipient = this.createRobustPublicKey(cleanRecipient);

      // AFTER createRobustPublicKey - 作成後の状態確認
      this.logger.debug('AFTER createRobustPublicKey calls', {
        safeAdminTokenAccountHasToBuffer: typeof safeAdminTokenAccount.toBuffer === 'function',
        safeCleanTokenAddressHasToBuffer: typeof safeCleanTokenAddress.toBuffer === 'function',
        safeRecipientTokenAccountHasToBuffer: typeof safeRecipientTokenAccount.toBuffer === 'function',
        safeCleanOwnerHasToBuffer: typeof safeCleanOwner.toBuffer === 'function',
        safeCleanRecipientHasToBuffer: typeof safeCleanRecipient.toBuffer === 'function'
      });

      this.logger.debug('Safe PublicKey objects created', {
        adminTokenAccount: safeAdminTokenAccount.toString(),
        cleanTokenAddress: safeCleanTokenAddress.toString(),
        recipientTokenAccount: safeRecipientTokenAccount.toString(),
        cleanOwner: safeCleanOwner.toString(),
        cleanRecipient: safeCleanRecipient.toString()
      });

      // 受信者のトークンアカウントが存在しない場合は作成
      const recipientAccountInfo = await connection.getAccountInfo(safeRecipientTokenAccount);
      if (!recipientAccountInfo) {
        this.logger.debug('Creating recipient token account');
        instructions.push(
          createAssociatedTokenAccountInstruction(
            safeCleanOwner,
            safeRecipientTokenAccount,
            safeCleanRecipient,
            safeCleanTokenAddress,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      // トークンの小数点を取得
      const decimals = await this.rpcClient.getTokenDecimals(safeCleanTokenAddress);
      const adjustedAmount = Math.floor(amount * Math.pow(10, decimals));

      this.logger.debug('Creating transfer instruction', {
        adminTokenAccount: safeAdminTokenAccount.toString(),
        cleanTokenAddress: safeCleanTokenAddress.toString(),
        recipientTokenAccount: safeRecipientTokenAccount.toString(),
        cleanOwner: safeCleanOwner.toString(),
        adjustedAmount,
        decimals
      });

      // 最終的なPublicKey安全性チェックと修復（CLI環境対応）
      this.logger.debug('Final PublicKey safety check before transfer instruction', {
        adminTokenAccount: safeAdminTokenAccount.toString(),
        tokenAddress: safeCleanTokenAddress.toString(),
        recipientTokenAccount: safeRecipientTokenAccount.toString(),
        owner: safeCleanOwner.toString(),
        hasOwnerToBuffer: typeof safeCleanOwner.toBuffer === 'function'
      });

      // CLI環境での最終安全措置 - 直前でPublicKeyを再構築
      const finalSafeOwner = RobustPublicKeyHandler.ensureCLISafety(safeCleanOwner);
      const finalSafeSource = RobustPublicKeyHandler.ensureCLISafety(safeAdminTokenAccount);
      const finalSafeMint = RobustPublicKeyHandler.ensureCLISafety(safeCleanTokenAddress);
      const finalSafeDestination = RobustPublicKeyHandler.ensureCLISafety(safeRecipientTokenAccount);

      this.logger.debug('Final safety check completed', {
        finalOwnerHasToBuffer: typeof finalSafeOwner.toBuffer === 'function',
        finalSourceHasToBuffer: typeof finalSafeSource.toBuffer === 'function',
        finalMintHasToBuffer: typeof finalSafeMint.toBuffer === 'function',
        finalDestinationHasToBuffer: typeof finalSafeDestination.toBuffer === 'function'
      });

      // createTransferCheckedInstruction直前の最終構造体復元 - COMMENTED OUT FOR DEBUGGING
      console.log('🚨 CRITICAL: createTransferCheckedInstruction直前 - 復元ロジック無効化中');
      console.log('🔧 元オブジェクトをそのまま使用:');
      console.log('finalSafeSource.toBuffer:', !!finalSafeSource.toBuffer);
      console.log('finalSafeMint.toBuffer:', !!finalSafeMint.toBuffer);
      console.log('finalSafeDestination.toBuffer:', !!finalSafeDestination.toBuffer);
      console.log('finalSafeOwner.toBuffer:', !!finalSafeOwner.toBuffer);

      // toBufferテスト - 復元前
      try {
        finalSafeOwner.toBuffer();
        console.log('✅ finalSafeOwner.toBuffer() 成功');
      } catch (e) {
        console.log('❌ finalSafeOwner.toBuffer() 失敗:', e instanceof Error ? e.message : String(e));
      }

      // 構造体復元ロジックをコメントアウト
      // const ultimateSource = new PublicKey(finalSafeSource.toString());
      // const ultimateMint = new PublicKey(finalSafeMint.toString());
      // const ultimateDestination = new PublicKey(finalSafeDestination.toString());
      // const ultimateOwner = new PublicKey(finalSafeOwner.toString());

      // Token 2022転送インストラクションを作成 - 元オブジェクトを使用
      console.log('🚨 ABOUT TO CALL createTransferCheckedInstruction with original objects');
      const transferInstruction = createTransferCheckedInstruction(
        finalSafeSource,            // source - 元オブジェクト
        finalSafeMint,              // mint - 元オブジェクト
        finalSafeDestination,       // destination - 元オブジェクト
        finalSafeOwner,             // owner - 元オブジェクト
        adjustedAmount,             // amount
        decimals,                   // decimals
        [],                         // multiSigners
        TOKEN_2022_PROGRAM_ID       // programId
      );
      console.log('🚨 createTransferCheckedInstruction COMPLETED successfully');

      instructions.push(transferInstruction);
      transaction.add(...instructions);

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = finalSafeOwner;

      this.logger.debug('Sending Token 2022 transaction');

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

    } catch (error) {
      this.logger.error('Token 2022 transfer failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        recipientType: typeof recipient,
        tokenAddressType: typeof tokenAddress,
        ownerType: typeof this.adminKeypair.publicKey
      });
      throw error;
    }
  }

  private async sendStandardToken(
    recipient: PublicKey,
    amount: number,
    tokenAddress: PublicKey,
    _distributionId: string
  ): Promise<string> {
    console.log('🔍 sendStandardToken called - STANDARD TOKEN PATH');
    console.log('recipient:', recipient.toString());
    console.log('tokenAddress:', tokenAddress.toString());

    this.logger.debug('sendStandardToken called', {
      recipient: recipient.toString(),
      amount,
      tokenAddress: tokenAddress.toString()
    });

    const connection = this.rpcClient.getConnection();

    // 完全にクリーンなPublicKeyオブジェクトを作成
    const cleanRecipient = this.createRobustPublicKey(recipient);
    const cleanTokenAddress = this.createRobustPublicKey(tokenAddress);
    const cleanOwner = this.createRobustPublicKey(this.adminKeypair.publicKey);

    const adminTokenAccount = this.createRobustPublicKey(await getAssociatedTokenAddress(
      cleanTokenAddress,
      cleanOwner,
      false,
      TOKEN_PROGRAM_ID
    ));

    const recipientTokenAccount = this.createRobustPublicKey(await getAssociatedTokenAddress(
      cleanTokenAddress,
      cleanRecipient,
      false,
      TOKEN_PROGRAM_ID
    ));

    this.logger.debug('Safe PublicKey objects created for standard token', {
      adminTokenAccount: adminTokenAccount.toString(),
      cleanTokenAddress: cleanTokenAddress.toString(),
      recipientTokenAccount: recipientTokenAccount.toString(),
      cleanOwner: cleanOwner.toString(),
      cleanRecipient: cleanRecipient.toString()
    });

    const transaction = new Transaction();
    const instructions: TransactionInstruction[] = [];

    // 受信者のトークンアカウントが存在しない場合は作成
    const recipientAccountInfo = await connection.getAccountInfo(recipientTokenAccount);
    if (!recipientAccountInfo) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          cleanOwner,
          recipientTokenAccount,
          cleanRecipient,
          cleanTokenAddress,
          TOKEN_PROGRAM_ID
        )
      );
    }

    const decimals = await this.rpcClient.getTokenDecimals(cleanTokenAddress);
    const adjustedAmount = Math.floor(amount * Math.pow(10, decimals));

    // CLI環境での最終安全措置 - 直前でPublicKeyを再構築
    const finalSafeOwner = RobustPublicKeyHandler.ensureCLISafety(cleanOwner);
    const finalSafeSource = RobustPublicKeyHandler.ensureCLISafety(adminTokenAccount);
    const finalSafeDestination = RobustPublicKeyHandler.ensureCLISafety(recipientTokenAccount);

    this.logger.debug('Standard token final safety check', {
      finalOwnerHasToBuffer: typeof finalSafeOwner.toBuffer === 'function',
      finalSourceHasToBuffer: typeof finalSafeSource.toBuffer === 'function',
      finalDestinationHasToBuffer: typeof finalSafeDestination.toBuffer === 'function'
    });

    // 標準トークン転送インストラクションを作成
    const transferInstruction = createTransferInstruction(
      finalSafeSource,
      finalSafeDestination,
      finalSafeOwner,
      adjustedAmount,
      [],
      TOKEN_PROGRAM_ID
    );

    instructions.push(transferInstruction);
    transaction.add(...instructions);

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = finalSafeOwner;

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
    totalAmount: number,
    mode: DistributionMode = 'proportional',
    minimumAmount: number = 0
  ): Map<string, number> {
    const distributionMap = new Map<string, number>();

    if (holders.length === 0 || totalAmount <= 0) {
      return distributionMap;
    }

    if (mode === 'equal') {
      return this.calculateEqualDistribution(holders, totalAmount, minimumAmount);
    } else {
      return this.calculateProportionalDistribution(holders, totalAmount, minimumAmount);
    }
  }

  private calculateEqualDistribution(
    holders: TokenHolder[],
    totalAmount: number,
    minimumAmount: number
  ): Map<string, number> {
    const distributionMap = new Map<string, number>();

    // Filter holders who meet minimum requirement
    const eligibleHolders = holders.filter(h => h.balance >= minimumAmount);

    if (eligibleHolders.length === 0) {
      return distributionMap;
    }

    // Equal distribution with precision handling
    const baseAmount = totalAmount / eligibleHolders.length;
    let distributedAmount = 0;

    // Distribute base amounts
    for (let i = 0; i < eligibleHolders.length; i++) {
      const holder = eligibleHolders[i];
      let amount: number;

      if (i === eligibleHolders.length - 1) {
        // Last recipient gets the remainder to ensure exact total
        amount = totalAmount - distributedAmount;
      } else {
        // Use high precision calculation
        amount = Math.floor(baseAmount * 1000000) / 1000000;
      }

      if (amount > 0) {
        distributionMap.set(holder.address.toString(), amount);
        distributedAmount += amount;
      }
    }

    return distributionMap;
  }

  private calculateProportionalDistribution(
    holders: TokenHolder[],
    totalAmount: number,
    minimumAmount: number
  ): Map<string, number> {
    const distributionMap = new Map<string, number>();

    // Filter holders who meet minimum requirement
    const eligibleHolders = holders.filter(h => h.balance >= minimumAmount);
    const totalBalance = eligibleHolders.reduce((sum, holder) => sum + holder.balance, 0);

    if (totalBalance === 0 || eligibleHolders.length === 0) {
      return distributionMap;
    }

    // Use high precision arithmetic to minimize rounding errors
    const PRECISION_MULTIPLIER = 1000000000; // 9 decimal places
    const remainingAmount = Math.round(totalAmount * PRECISION_MULTIPLIER);
    const totalBalancePrecise = Math.round(totalBalance * PRECISION_MULTIPLIER);

    // Calculate precise amounts
    const preciseAmounts: { address: string; amount: number; remainder: number }[] = [];

    for (const holder of eligibleHolders) {
      const balancePrecise = Math.round(holder.balance * PRECISION_MULTIPLIER);
      const exactAmount = (remainingAmount * balancePrecise) / totalBalancePrecise;
      const flooredAmount = Math.floor(exactAmount);
      const remainder = exactAmount - flooredAmount;

      preciseAmounts.push({
        address: holder.address.toString(),
        amount: flooredAmount / PRECISION_MULTIPLIER,
        remainder
      });
    }

    // Distribute remainder based on largest remainders
    preciseAmounts.sort((a, b) => b.remainder - a.remainder);
    const totalDistributed = preciseAmounts.reduce((sum, item) =>
      sum + Math.round(item.amount * PRECISION_MULTIPLIER), 0);

    const undistributedAmount = remainingAmount - totalDistributed;
    const remainderUnits = Math.round(undistributedAmount);

    // Distribute remainder units to holders with largest remainders
    for (let i = 0; i < Math.min(remainderUnits, preciseAmounts.length); i++) {
      preciseAmounts[i].amount += 1 / PRECISION_MULTIPLIER;
    }

    // Set final amounts in map
    for (const item of preciseAmounts) {
      if (item.amount > 0) {
        distributionMap.set(item.address, item.amount);
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
    const config = this.configManager.getConfig();
    return recipientCount * config.distribution.estimated_gas_per_tx;
  }

  private estimateDuration(recipientCount: number, batchSize: number): number {
    const config = this.configManager.getConfig();
    const batchCount = Math.ceil(recipientCount / batchSize);
    return batchCount * config.distribution.estimated_time_per_batch * 1000; // milliseconds
  }

  private async assessRiskFactors(request: DistributionRequest): Promise<string[]> {
    const config = this.configManager.getConfig();
    const risks: string[] = [];

    if (request.amount > config.distribution.risk_thresholds.large_amount_threshold) {
      risks.push('Large distribution amount may require additional confirmation');
    }

    if (request.holders.length > config.distribution.risk_thresholds.large_recipient_count_threshold) {
      risks.push('Large number of recipients may result in longer execution time');
    }

    const smallAmounts = request.holders.filter(h =>
      (request.amount * h.percentage / 100) < config.distribution.risk_thresholds.small_amount_threshold
    );
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