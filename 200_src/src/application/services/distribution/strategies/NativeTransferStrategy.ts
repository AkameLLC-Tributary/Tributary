import { PublicKey, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { ITokenTransferStrategy, TokenTransferContext } from '../interfaces/ITokenTransferStrategy';
import { ValidationError } from '../../../../domain/errors';
import { createLogger } from '../../../../infrastructure/logging/Logger';

export class NativeTransferStrategy implements ITokenTransferStrategy {
  private logger = createLogger('NativeTransferStrategy');

  async createTransferInstructions(context: TokenTransferContext): Promise<TransactionInstruction[]> {
    const instructions: TransactionInstruction[] = [];
    const { senderPublicKey, recipients } = context;

    for (const recipient of recipients) {
      const recipientPublicKey = new PublicKey(recipient.walletAddress);
      const lamports = Math.floor(recipient.amount * 1e9); // SOL to lamports

      instructions.push(
        SystemProgram.transfer({
          fromPubkey: senderPublicKey,
          toPubkey: recipientPublicKey,
          lamports,
        })
      );
    }

    return instructions;
  }

  async validateTransfer(context: TokenTransferContext): Promise<void> {
    const { senderPublicKey, recipients } = context;

    if (!senderPublicKey) {
      throw new ValidationError('Sender public key is required');
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
    return 'Native SOL Transfer';
  }
}