import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount
} from '@solana/spl-token';
import { SolanaRpcClient } from '../../../../infrastructure/rpc/SolanaRpcClient';
import { ITokenTransferStrategy, TokenTransferContext } from '../interfaces/ITokenTransferStrategy';
import { ValidationError } from '../../../../domain/errors';
import { createLogger } from '../../../../infrastructure/logging/Logger';

export class SplTokenTransferStrategy implements ITokenTransferStrategy {
  private rpcClient: SolanaRpcClient;
  private logger = createLogger('SplTokenTransferStrategy');

  constructor(rpcClient: SolanaRpcClient) {
    this.rpcClient = rpcClient;
  }

  async createTransferInstructions(context: TokenTransferContext): Promise<TransactionInstruction[]> {
    const instructions: TransactionInstruction[] = [];
    const { senderPublicKey, tokenMintAddress, recipients, decimals } = context;

    // 送信者のトークンアカウント取得
    const senderTokenAccount = await getAssociatedTokenAddress(
      tokenMintAddress,
      senderPublicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    for (const recipient of recipients) {
      const recipientPublicKey = new PublicKey(recipient.walletAddress);

      // 受信者のトークンアカウント取得
      const recipientTokenAccount = await getAssociatedTokenAddress(
        tokenMintAddress,
        recipientPublicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // 受信者のトークンアカウントが存在するかチェック
      const accountExists = await this.checkAccountExists(recipientTokenAccount);

      if (!accountExists) {
        // アカウント作成命令を追加
        instructions.push(
          createAssociatedTokenAccountInstruction(
            senderPublicKey,
            recipientTokenAccount,
            recipientPublicKey,
            tokenMintAddress,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }

      // 転送命令を追加
      const transferAmount = Math.floor(recipient.amount * Math.pow(10, decimals));
      instructions.push(
        createTransferCheckedInstruction(
          senderTokenAccount,
          tokenMintAddress,
          recipientTokenAccount,
          senderPublicKey,
          transferAmount,
          decimals,
          [],
          TOKEN_PROGRAM_ID
        )
      );
    }

    return instructions;
  }

  async validateTransfer(context: TokenTransferContext): Promise<void> {
    const { senderPublicKey, tokenMintAddress, recipients } = context;

    if (!senderPublicKey || !tokenMintAddress) {
      throw new ValidationError('Sender public key and token mint address are required');
    }

    if (!recipients || recipients.length === 0) {
      throw new ValidationError('Recipients list cannot be empty');
    }

    for (const recipient of recipients) {
      if (!recipient.walletAddress || recipient.amount <= 0) {
        throw new ValidationError(`Invalid recipient: ${JSON.stringify(recipient)}`);
      }
    }
  }

  getStrategyName(): string {
    return 'SPL Token Transfer';
  }

  private async checkAccountExists(tokenAccount: PublicKey): Promise<boolean> {
    try {
      await getAccount(this.rpcClient.getConnection(), tokenAccount, 'confirmed', TOKEN_PROGRAM_ID);
      return true;
    } catch {
      this.logger.debug(`Token account does not exist: ${tokenAccount.toString()}`);
      return false;
    }
  }
}