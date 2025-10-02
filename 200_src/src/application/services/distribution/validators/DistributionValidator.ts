import { PublicKey } from '@solana/web3.js';
import { DistributionRecipient, DistributionRequestV2 } from '../types/DistributionTypes';
import { SolanaRpcClient } from '../../../../infrastructure/rpc/SolanaRpcClient';
import { createLogger } from '../../../../infrastructure/logging/Logger';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class DistributionValidator {
  private rpcClient: SolanaRpcClient;
  private logger = createLogger('DistributionValidator');

  constructor(rpcClient: SolanaRpcClient) {
    this.rpcClient = rpcClient;
  }

  async validateDistributionRequest(request: DistributionRequestV2): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // 基本的な検証
      this.validateBasicStructure(request, result);

      // ウォレットアドレスの検証
      await this.validateWalletAddresses(request.recipients, result);

      // 残高の検証
      await this.validateSenderBalance(request, result);

      // 重複チェック
      this.validateDuplicateRecipients(request.recipients, result);

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  private validateBasicStructure(request: DistributionRequestV2, result: ValidationResult): void {
    if (!request.senderWallet) {
      result.errors.push('Sender wallet is required');
    }

    if (!request.recipients || request.recipients.length === 0) {
      result.errors.push('Recipients list cannot be empty');
    }

    if (request.recipients && request.recipients.length > 10000) {
      result.errors.push('Too many recipients (max 10,000)');
    }

    // 個別受信者の検証
    request.recipients?.forEach((recipient, index) => {
      if (!recipient.walletAddress) {
        result.errors.push(`Recipient ${index + 1}: Wallet address is required`);
      }

      if (!recipient.amount || recipient.amount <= 0) {
        result.errors.push(`Recipient ${index + 1}: Amount must be greater than 0`);
      }

      if (recipient.amount && recipient.amount < 0.000000001) {
        result.warnings.push(`Recipient ${index + 1}: Very small amount (${recipient.amount})`);
      }
    });
  }

  private async validateWalletAddresses(recipients: DistributionRecipient[], result: ValidationResult): Promise<void> {
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      try {
        new PublicKey(recipient.walletAddress);
      } catch {
        result.errors.push(`Recipient ${i + 1}: Invalid wallet address format`);
      }
    }
  }

  private async validateSenderBalance(request: DistributionRequestV2, result: ValidationResult): Promise<void> {
    try {
      const senderPublicKey = new PublicKey(request.senderWallet);
      const totalAmount = request.recipients.reduce((sum, recipient) => sum + recipient.amount, 0);

      if (request.tokenMint) {
        // SPL Token の場合
        await this.validateSplTokenBalance(senderPublicKey, request.tokenMint, totalAmount, result);
      } else {
        // Native SOL の場合
        const balance = await this.rpcClient.getConnection().getBalance(senderPublicKey);
        const balanceInSol = balance / 1e9;

        if (balanceInSol < totalAmount) {
          result.errors.push(`Insufficient SOL balance. Required: ${totalAmount}, Available: ${balanceInSol}`);
        }

        if (balanceInSol < totalAmount + 0.01) { // ガス代考慮
          result.warnings.push('Balance is very close to required amount. Consider gas fees.');
        }
      }
    } catch (error) {
      result.errors.push(`Balance validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateDuplicateRecipients(recipients: DistributionRecipient[], result: ValidationResult): void {
    const addresses = new Set<string>();
    const duplicates: string[] = [];

    recipients.forEach((recipient, index) => {
      if (addresses.has(recipient.walletAddress)) {
        duplicates.push(`Recipient ${index + 1}: ${recipient.walletAddress}`);
      } else {
        addresses.add(recipient.walletAddress);
      }
    });

    if (duplicates.length > 0) {
      result.warnings.push(`Duplicate wallet addresses found: ${duplicates.join(', ')}`);
    }
  }

  private async validateSplTokenBalance(
    senderPublicKey: PublicKey,
    tokenMint: string,
    totalAmount: number,
    result: ValidationResult
  ): Promise<void> {
    try {
      const { getAssociatedTokenAddress, getAccount, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token');

      const tokenMintPublicKey = new PublicKey(tokenMint);

      // 送信者のトークンアカウント取得
      const senderTokenAccount = await getAssociatedTokenAddress(
        tokenMintPublicKey,
        senderPublicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // アカウント情報を取得
      const accountInfo = await getAccount(
        this.rpcClient.getConnection(),
        senderTokenAccount,
        'confirmed',
        TOKEN_PROGRAM_ID
      );

      // トークンの小数点を取得（簡易実装）
      const decimals = 9; // デフォルト値、本来はmint情報から取得すべき
      const balance = Number(accountInfo.amount) / Math.pow(10, decimals);

      if (balance < totalAmount) {
        result.errors.push(`Insufficient token balance. Required: ${totalAmount}, Available: ${balance}`);
      }

      if (balance < totalAmount * 1.1) { // 10%のマージンをチェック
        result.warnings.push('Token balance is very close to required amount. Consider keeping some tokens for future transactions.');
      }

    } catch (error) {
      result.errors.push(`Token balance validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}