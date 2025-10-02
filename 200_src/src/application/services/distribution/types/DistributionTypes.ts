import { TokenHolder, DistributionRequest } from '../../../../domain/types';

// リファクタリング用の型定義
export interface DistributionRecipient {
  walletAddress: string;
  amount: number;
}

export interface DistributionRequestV2 {
  senderWallet: string;
  tokenMint?: string;
  recipients: DistributionRecipient[];
  decimals?: number;
  mode?: 'equal' | 'proportional';
  batchSize?: number;
}

export interface DistributionResultV2 {
  successful: DistributionRecipient[];
  failed: Array<{ recipient: DistributionRecipient; error: string }>;
  totalGasCost: number;
  executionTime: number;
  transactionHashes: string[];
}

// 型変換ユーティリティ
export class TypeConverter {
  static toDistributionRecipients(holders: TokenHolder[]): DistributionRecipient[] {
    return holders.map(holder => ({
      walletAddress: holder.address.toString(),
      amount: holder.balance
    }));
  }

  static toDistributionRequestV2(
    request: DistributionRequest,
    senderWallet: string
  ): DistributionRequestV2 {
    return {
      senderWallet,
      tokenMint: request.tokenAddress?.toString(),
      recipients: this.toDistributionRecipients(request.holders),
      mode: request.mode,
      batchSize: request.batchSize
    };
  }
}