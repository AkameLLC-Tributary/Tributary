import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { DistributionRecipient } from '../types/DistributionTypes';

export interface TokenTransferContext {
  senderPublicKey: PublicKey;
  tokenMintAddress: PublicKey;
  recipients: DistributionRecipient[];
  amount?: number;
  decimals: number;
}

export interface ITokenTransferStrategy {
  createTransferInstructions(context: TokenTransferContext): Promise<TransactionInstruction[]>;
  validateTransfer(context: TokenTransferContext): Promise<void>;
  getStrategyName(): string;
}