import { SolanaRpcClient } from '../../../../infrastructure/rpc/SolanaRpcClient';
import { ITokenTransferStrategy } from '../interfaces/ITokenTransferStrategy';
import { SplTokenTransferStrategy } from '../strategies/SplTokenTransferStrategy';
import { NativeTransferStrategy } from '../strategies/NativeTransferStrategy';

export enum TransferType {
  NATIVE_SOL = 'native_sol',
  SPL_TOKEN = 'spl_token',
  TOKEN_2022 = 'token_2022'
}

export class TransferStrategyFactory {
  private rpcClient: SolanaRpcClient;

  constructor(rpcClient: SolanaRpcClient) {
    this.rpcClient = rpcClient;
  }

  createStrategy(transferType: TransferType): ITokenTransferStrategy {
    switch (transferType) {
      case TransferType.NATIVE_SOL:
        return new NativeTransferStrategy();

      case TransferType.SPL_TOKEN:
        return new SplTokenTransferStrategy(this.rpcClient);

      case TransferType.TOKEN_2022:
        // TODO: Token-2022 strategy implementation
        throw new Error('Token-2022 strategy not yet implemented');

      default:
        throw new Error(`Unknown transfer type: ${transferType}`);
    }
  }

  createStrategyFromTokenMint(tokenMint?: string): ITokenTransferStrategy {
    if (!tokenMint) {
      return this.createStrategy(TransferType.NATIVE_SOL);
    }

    // TODO: Determine token type by inspecting mint account
    // For now, assume SPL token
    return this.createStrategy(TransferType.SPL_TOKEN);
  }
}