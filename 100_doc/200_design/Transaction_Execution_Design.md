# トランザクション実行戦略設計書

## 概要
大規模配布における効率性と信頼性を両立するため、バッチサイズとリトライ戦略をユーザーが設定可能な設計とする。

## 1. バッチサイズ最適化設計

### 1.1 設定可能パラメータ

#### CLIオプション
```bash
# バッチサイズ指定
tributary distribute --token USDC --amount 10000 --batch-size 25

# 同時実行バッチ数指定
tributary distribute --token USDC --amount 10000 --batch-size 20 --concurrent-batches 5

# 統合設定例
tributary distribute --token USDC --amount 10000 \
  --batch-size 30 \
  --concurrent-batches 3 \
  --snapshot 5
```

#### 設定ファイル
```toml
[transaction]
batch_size = 20  # 1バッチあたりのトランザクション数 (1-100)
max_concurrent_batches = 3  # 同時実行バッチ数 (1-10)
```

### 1.2 バッチサイズ決定要因

#### **技術的制約**
- **Solana Transaction Size**: 最大1232バイト
- **Instructions per Transaction**: 実用的には10-20命令
- **RPC Rate Limits**: プロバイダー依存（通常100-1000 req/sec）

#### **最適化ポイント**
```typescript
interface BatchOptimization {
  // 小バッチ (1-10)
  small_batch: {
    pros: ['失敗影響局所化', 'デバッグ容易'];
    cons: ['オーバーヘッド大', '処理時間長'];
    use_case: ['テスト環境', '高額配布'];
  };

  // 中バッチ (11-50)
  medium_batch: {
    pros: ['バランス良い', '一般的用途'];
    cons: ['中途半端な効率'];
    use_case: ['標準配布', '中規模プロジェクト'];
  };

  // 大バッチ (51-100)
  large_batch: {
    pros: ['高効率', '高速処理'];
    cons: ['失敗時影響大', 'ガス制限リスク'];
    use_case: ['大規模配布', '低額配布'];
  };
}
```

### 1.3 動的バッチサイズ調整

#### **ネットワーク状況ベース**
```typescript
class AdaptiveBatchManager {
  adjustBatchSize(
    currentBatchSize: number,
    successRate: number,
    networkLatency: number
  ): number {
    if (successRate < 0.8) {
      return Math.max(1, currentBatchSize * 0.7); // 縮小
    }
    if (successRate > 0.95 && networkLatency < 500) {
      return Math.min(100, currentBatchSize * 1.2); // 拡大
    }
    return currentBatchSize; // 維持
  }
}
```

#### **配布量ベース推奨値**
```typescript
function getRecommendedBatchSize(recipientCount: number, totalAmount: number): number {
  if (recipientCount < 50) return 10;    // 小規模: 細かく制御
  if (recipientCount < 500) return 25;   // 中規模: バランス重視
  if (recipientCount < 2000) return 50;  // 大規模: 効率重視
  return 75; // 超大規模: 最大効率
}
```

## 2. リトライ戦略設計

### 2.1 設定可能パラメータ

#### CLIオプション
```bash
# リトライ設定
tributary distribute --token USDC --amount 10000 \
  --retry-max 5 \
  --retry-delay 2 \
  --retry-backoff exponential \
  --retry-timeout 60
```

#### 設定ファイル
```toml
[retry]
max_attempts = 3  # 最大リトライ回数 (1-10)
initial_delay = 1  # 初回リトライ遅延（秒）
backoff_strategy = "exponential"  # linear, exponential, fixed
max_delay = 30  # 最大遅延時間（秒）
timeout_seconds = 60  # トランザクションタイムアウト
```

### 2.2 バックオフ戦略の実装

#### **Linear Backoff（線形増加）**
```typescript
function calculateLinearDelay(attempt: number, initialDelay: number, increment: number): number {
  return initialDelay + (attempt * increment);
}

// 例: 1秒, 3秒, 5秒, 7秒...
```

#### **Exponential Backoff（指数的増加）**
```typescript
function calculateExponentialDelay(attempt: number, initialDelay: number, multiplier: number = 2): number {
  return Math.min(
    initialDelay * Math.pow(multiplier, attempt),
    maxDelay
  );
}

// 例: 1秒, 2秒, 4秒, 8秒, 16秒...
```

#### **Fixed Backoff（固定間隔）**
```typescript
function calculateFixedDelay(initialDelay: number): number {
  return initialDelay;
}

// 例: 3秒, 3秒, 3秒, 3秒...
```

### 2.3 エラー分類別リトライ戦略

#### **一時的エラー（リトライ推奨）**
```typescript
const RETRYABLE_ERRORS = [
  'NETWORK_ERROR',
  'RPC_TIMEOUT',
  'INSUFFICIENT_PRIORITY_FEE',
  'SLOT_SKIPPED',
  'NODE_UNHEALTHY'
];

function shouldRetry(error: SolanaError, attempt: number, maxAttempts: number): boolean {
  if (attempt >= maxAttempts) return false;
  return RETRYABLE_ERRORS.includes(error.code);
}
```

#### **永続的エラー（リトライ不要）**
```typescript
const NON_RETRYABLE_ERRORS = [
  'INSUFFICIENT_FUNDS',
  'INVALID_ACCOUNT',
  'SIGNATURE_VERIFICATION_FAILURE',
  'ACCOUNT_NOT_FOUND',
  'PROGRAM_ERROR'
];
```

### 2.4 リトライ実行フロー

```typescript
class TransactionRetryManager {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < config.max_attempts; attempt++) {
      try {
        return await Promise.race([
          operation(),
          this.createTimeoutPromise(config.timeout_seconds)
        ]);
      } catch (error) {
        lastError = error;

        if (!this.shouldRetry(error, attempt, config.max_attempts)) {
          throw error;
        }

        const delay = this.calculateDelay(attempt, config);
        await this.sleep(delay);

        this.logRetryAttempt(attempt + 1, config.max_attempts, delay, error);
      }
    }

    throw lastError;
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    switch (config.backoff_strategy) {
      case 'linear':
        return Math.min(
          config.initial_delay + (attempt * 2),
          config.max_delay
        );
      case 'exponential':
        return Math.min(
          config.initial_delay * Math.pow(2, attempt),
          config.max_delay
        );
      case 'fixed':
        return config.initial_delay;
      default:
        throw new Error(`Unknown backoff strategy: ${config.backoff_strategy}`);
    }
  }
}
```

## 3. 統合実行フロー設計

### 3.1 バッチ処理とリトライの統合

```typescript
class DistributionExecutor {
  async executeBatchedDistribution(
    distributions: Distribution[],
    config: ExecutionConfig
  ): Promise<ExecutionResult> {
    const batches = this.createBatches(distributions, config.transaction.batch_size);
    const results: BatchResult[] = [];

    // 同時実行バッチ数制御
    const semaphore = new Semaphore(config.transaction.max_concurrent_batches);

    const batchPromises = batches.map(async (batch, index) => {
      return semaphore.acquire(async () => {
        try {
          const batchResult = await this.retryManager.executeWithRetry(
            () => this.executeBatch(batch),
            config.retry
          );

          this.logger.logBatchSuccess(index, batch.length, batchResult);
          return batchResult;

        } catch (error) {
          this.logger.logBatchFailure(index, batch.length, error);

          // 個別リトライ
          return await this.executeIndividualRetries(batch, config);
        }
      });
    });

    const batchResults = await Promise.all(batchPromises);
    return this.aggregateResults(batchResults);
  }

  private async executeIndividualRetries(
    batch: Distribution[],
    config: ExecutionConfig
  ): Promise<BatchResult> {
    const individualResults = await Promise.all(
      batch.map(distribution =>
        this.retryManager.executeWithRetry(
          () => this.executeSingleDistribution(distribution),
          config.retry
        ).catch(error => ({ distribution, error }))
      )
    );

    return this.consolidateIndividualResults(individualResults);
  }
}
```

### 3.2 進捗監視とユーザーフィードバック

```typescript
interface ProgressReporter {
  onBatchStart(batchIndex: number, totalBatches: number): void;
  onBatchComplete(batchIndex: number, successCount: number, failureCount: number): void;
  onRetryAttempt(attempt: number, maxAttempts: number, error: string): void;
  onExecutionComplete(summary: ExecutionSummary): void;
}

// CLI表示例
class CLIProgressReporter implements ProgressReporter {
  onBatchStart(batchIndex: number, totalBatches: number): void {
    console.log(`[${batchIndex + 1}/${totalBatches}] Processing batch...`);
  }

  onRetryAttempt(attempt: number, maxAttempts: number, error: string): void {
    console.log(`⚠️  Retry ${attempt}/${maxAttempts}: ${error}`);
  }
}
```

## 4. パフォーマンス最適化

### 4.1 推奨設定マトリックス

| 配布規模 | 受信者数 | 推奨バッチサイズ | 同時バッチ数 | リトライ回数 |
|----------|----------|------------------|--------------|--------------|
| 小規模   | 1-50     | 5-10             | 1-2          | 5            |
| 中規模   | 51-500   | 15-25            | 2-3          | 3            |
| 大規模   | 501-2000 | 30-50            | 3-5          | 3            |
| 超大規模 | 2000+    | 50-75            | 5-8          | 2            |

### 4.2 自動設定機能

```typescript
function getOptimalConfig(recipientCount: number, networkConditions: NetworkStatus): ExecutionConfig {
  const baseConfig = getRecommendedConfigByScale(recipientCount);

  // ネットワーク状況による調整
  if (networkConditions.latency > 1000) {
    baseConfig.transaction.batch_size *= 0.7;
    baseConfig.retry.max_attempts += 1;
  }

  if (networkConditions.throughput < 100) {
    baseConfig.transaction.max_concurrent_batches = Math.max(1, baseConfig.transaction.max_concurrent_batches - 1);
  }

  return baseConfig;
}
```