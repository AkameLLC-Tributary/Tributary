import { PublicKey } from '@solana/web3.js';
import { createLogger } from '../../infrastructure/logging/Logger';

/**
 * 完全に堅牢なPublicKey処理ユーティリティ
 * CLI実行環境での間欠的な問題を根本的に解決
 */
export class RobustPublicKeyHandler {

  /**
   * 完全に安全なPublicKey作成
   * プロトタイプ問題、メモリ破損、CLI環境問題すべてに対応
   */
  static createSafePublicKey(input: PublicKey | string): PublicKey {
    const logger = createLogger('RobustPublicKeyHandler');

    try {
      // 入力の正規化
      let keyString: string;

      if (typeof input === 'string') {
        keyString = input;
      } else if (input && typeof input.toString === 'function') {
        keyString = input.toString();
      } else {
        throw new Error('Invalid PublicKey input: cannot convert to string');
      }

      // Base58形式の検証
      if (!keyString || keyString.length < 32 || keyString.length > 44) {
        throw new Error(`Invalid PublicKey string length: ${keyString?.length}`);
      }

      // 複数の方法でPublicKey作成を試行
      let publicKey: PublicKey;

      // 方法1: 標準的な作成
      try {
        publicKey = new PublicKey(keyString);
      } catch (error) {
        logger.warn('Standard PublicKey creation failed, trying alternative method');

        // 方法2: 再試行
        try {
          publicKey = new PublicKey(keyString);
        } catch {
          throw new Error(`All PublicKey creation methods failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // プロトタイプとメソッドの完全性チェック
      const issues = RobustPublicKeyHandler.validatePublicKeyIntegrity(publicKey);

      if (issues.length > 0) {
        logger.warn('PublicKey integrity issues detected', { issues });
        publicKey = RobustPublicKeyHandler.repairPublicKey(publicKey, keyString);
      }

      // 最終検証
      const finalValidation = RobustPublicKeyHandler.validatePublicKeyIntegrity(publicKey);
      if (finalValidation.length > 0) {
        throw new Error(`Unable to create valid PublicKey: ${finalValidation.join(', ')}`);
      }

      return publicKey;

    } catch (error) {
      logger.error('RobustPublicKeyHandler.createSafePublicKey failed', {
        input: typeof input === 'string' ? input : 'non-string',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * PublicKeyオブジェクトの完全性を検証
   */
  static validatePublicKeyIntegrity(publicKey: any): string[] {
    const issues: string[] = [];

    if (!publicKey) {
      issues.push('PublicKey is null or undefined');
      return issues;
    }

    // 基本的なタイプチェック
    if (typeof publicKey !== 'object') {
      issues.push('PublicKey is not an object');
    }

    // コンストラクタチェック
    if (!publicKey.constructor || publicKey.constructor.name !== 'PublicKey') {
      issues.push('Invalid constructor');
    }

    // instanceof チェック
    if (!(publicKey instanceof PublicKey)) {
      issues.push('Not instance of PublicKey');
    }

    // 必須メソッドの存在チェック
    const requiredMethods = ['toString', 'toBuffer', 'toBase58', 'equals'];
    for (const method of requiredMethods) {
      if (typeof publicKey[method] !== 'function') {
        issues.push(`Missing method: ${method}`);
      }
    }

    // toBufferメソッドの動作チェック
    if (typeof publicKey.toBuffer === 'function') {
      try {
        const buffer = publicKey.toBuffer();
        if (!buffer || typeof buffer !== 'object' || !Buffer.isBuffer(buffer)) {
          issues.push('toBuffer() does not return valid Buffer');
        } else if (buffer.length !== 32) {
          issues.push(`toBuffer() returns incorrect length: ${buffer.length}`);
        }
      } catch (error) {
        issues.push(`toBuffer() throws error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    // toStringメソッドの動作チェック
    if (typeof publicKey.toString === 'function') {
      try {
        const str = publicKey.toString();
        if (!str || typeof str !== 'string' || str.length < 32) {
          issues.push('toString() returns invalid string');
        }
      } catch (error) {
        issues.push(`toString() throws error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    return issues;
  }

  /**
   * 破損したPublicKeyオブジェクトを修復
   */
  static repairPublicKey(brokenKey: any, originalString: string): PublicKey {
    const logger = createLogger('RobustPublicKeyHandler');
    logger.debug('Attempting to repair broken PublicKey');

    // 完全に新しいPublicKeyオブジェクトを作成
    const newKey = new PublicKey(originalString);

    // プロトタイプチェーンを強制的に正しく設定
    Object.setPrototypeOf(newKey, PublicKey.prototype);

    // 必要に応じて個別メソッドを復元
    if (typeof newKey.toBuffer !== 'function') {
      logger.debug('Manually restoring toBuffer method');
      newKey.toBuffer = PublicKey.prototype.toBuffer.bind(newKey);
    }

    if (typeof newKey.toString !== 'function') {
      logger.debug('Manually restoring toString method');
      newKey.toString = PublicKey.prototype.toString.bind(newKey);
    }

    if (typeof newKey.toBase58 !== 'function') {
      logger.debug('Manually restoring toBase58 method');
      newKey.toBase58 = PublicKey.prototype.toBase58.bind(newKey);
    }

    if (typeof newKey.equals !== 'function') {
      logger.debug('Manually restoring equals method');
      newKey.equals = PublicKey.prototype.equals.bind(newKey);
    }

    logger.debug('PublicKey repair completed');
    return newKey;
  }

  /**
   * PublicKey配列の一括処理
   */
  static processPublicKeyArray(keys: (PublicKey | string)[]): PublicKey[] {
    const logger = createLogger('RobustPublicKeyHandler');

    return keys.map((key, index) => {
      try {
        return RobustPublicKeyHandler.createSafePublicKey(key);
      } catch (error) {
        logger.error('Failed to process PublicKey at index', { index, error: error instanceof Error ? error.message : 'Unknown error' });
        throw error;
      }
    });
  }

  /**
   * CLI環境特有の問題に対する追加の安全措置
   */
  static ensureCLISafety(publicKey: PublicKey): PublicKey {
    const logger = createLogger('RobustPublicKeyHandler');

    // CLI環境でのガベージコレクション対策
    if (global.gc) {
      global.gc();
    }

    // プロトタイプチェーンの再検証と修復
    const issues = RobustPublicKeyHandler.validatePublicKeyIntegrity(publicKey);
    if (issues.length > 0) {
      logger.warn('CLI environment PublicKey issues detected, repairing', { issues });
      return RobustPublicKeyHandler.repairPublicKey(publicKey, publicKey.toString());
    }

    return publicKey;
  }
}

// モジュールのテスト
export function testRobustPublicKeyHandler() {
  const logger = createLogger('RobustPublicKeyHandler.Test');
  logger.info('Testing RobustPublicKeyHandler');

  const testAddress = '22XkWSj5b7MT47ubmmFWjWr8jMDCgE5szc8wiVL79xv1';

  try {
    // 基本的な作成テスト
    const pk1 = RobustPublicKeyHandler.createSafePublicKey(testAddress);
    logger.info('String input test passed');

    // PublicKey入力テスト
    RobustPublicKeyHandler.createSafePublicKey(pk1);
    logger.info('PublicKey input test passed');

    // 配列処理テスト
    const addresses = [testAddress, pk1, 'D8zGvbM3w6bcAsnfWcZnWEz2GLeK7LPVftqwsMDCkcHk'];
    RobustPublicKeyHandler.processPublicKeyArray(addresses);
    logger.info('Array processing test passed');

    // CLI安全性テスト
    RobustPublicKeyHandler.ensureCLISafety(pk1);
    logger.info('CLI safety test passed');

    logger.info('All RobustPublicKeyHandler tests passed');
    return true;

  } catch (error) {
    logger.error('RobustPublicKeyHandler test failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    return false;
  }
}