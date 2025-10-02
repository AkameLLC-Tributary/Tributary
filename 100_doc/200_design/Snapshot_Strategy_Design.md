# スナップショット戦略設計書

## 概要
トークン保有量の取得タイミングをユーザーが選択可能な設計とし、攻撃耐性と利便性のバランスを実現する。

## 設計仕様

### 1. スナップショット取得オプション

#### 1.1 即時取得（immediate）
```bash
tributary distribute --token USDC --amount 10000 --snapshot immediate
```

**特徴**:
- コマンド実行時点の最新ブロックで取得
- 最新の保有状況を反映
- MEV攻撃リスクあり（利便性優先）

**技術実装**:
```typescript
async function getImmediateSnapshot(tokenAddress: string): Promise<HolderSnapshot[]> {
  const currentSlot = await connection.getSlot('finalized');
  return await getTokenBalancesAtSlot(tokenAddress, currentSlot);
}
```

#### 1.2 時間指定取得（分数指定）
```bash
tributary distribute --token USDC --amount 10000 --snapshot 5  # 5分前
tributary distribute --token USDC --amount 10000 --snapshot 30 # 30分前
# 最小値: 1分
tributary distribute --token USDC --amount 10000 --snapshot 1  # 1分前（最小値）
```

**特徴**:
- 指定分数前の確定ブロックで取得
- MEV攻撃耐性向上
- データの信頼性優先

**技術実装**:
```typescript
async function getHistoricalSnapshot(
  tokenAddress: string,
  minutesAgo: number
): Promise<HolderSnapshot[]> {
  const slotsPerMinute = 150; // Solana: ~400ms per slot
  const targetSlot = await connection.getSlot('finalized') - (minutesAgo * slotsPerMinute);
  return await getTokenBalancesAtSlot(tokenAddress, targetSlot);
}
```

### 2. 設定ファイル対応

#### 2.1 デフォルト設定
```toml
[snapshot]
default_timing = "immediate"  # immediate, または分数(1-60)
backup_timing = 3  # 取得失敗時のフォールバック分数
max_retry_minutes = 10  # 最大リトライ時間範囲
```

#### 2.2 設定優先順位
1. CLIオプション `--snapshot`
2. 設定ファイル `default_timing`
3. システムデフォルト（immediate）

### 3. データ構造設計

#### 3.1 スナップショット情報
```typescript
interface SnapshotMetadata {
  timing_type: 'immediate' | 'historical';
  requested_minutes_ago?: number;
  actual_slot: number;
  block_timestamp: number;
  slot_drift_seconds: number; // 実際の取得時間差
}

interface HolderSnapshot {
  wallet_address: string;
  token_balance: number;
  metadata: SnapshotMetadata;
}
```

#### 3.2 配布記録への統合
```typescript
interface DistributionRecord {
  // ... 既存フィールド

  snapshot_info: {
    strategy: 'immediate' | 'historical';
    target_minutes_ago?: number;
    actual_metadata: SnapshotMetadata;
    consistency_check: {
      max_time_drift: number;
      wallet_count: number;
      failed_retrievals: number;
    };
  };
}
```

### 4. エラーハンドリング設計

#### 4.1 過去ブロック取得失敗時
```typescript
async function getSnapshotWithFallback(
  tokenAddress: string,
  minutesAgo: number
): Promise<HolderSnapshot[]> {
  try {
    return await getHistoricalSnapshot(tokenAddress, minutesAgo);
  } catch (error) {
    if (error.code === 'SLOT_TOO_OLD') {
      // フォールバック: より近い時点で再試行
      const fallbackMinutes = Math.min(minutesAgo, config.backup_timing);
      return await getHistoricalSnapshot(tokenAddress, fallbackMinutes);
    }
    throw error;
  }
}
```

#### 4.2 一貫性チェック
```typescript
function validateSnapshotConsistency(snapshots: HolderSnapshot[]): ValidationResult {
  const timeDrifts = snapshots.map(s => s.metadata.slot_drift_seconds);
  const maxDrift = Math.max(...timeDrifts);

  return {
    is_valid: maxDrift < 60, // 1分以内の差を許容
    max_drift_seconds: maxDrift,
    recommendation: maxDrift > 30 ? 'consider_retry' : 'proceed'
  };
}
```

### 5. ユーザー体験設計

#### 5.1 実行前確認表示
```
Snapshot Strategy: Historical (5 minutes ago)
Target Block: 245,123,456 (estimated)
Expected Consistency: ±30 seconds

Proceed with distribution? [y/N]
```

#### 5.2 進捗表示
```
[1/3] Calculating target slot... ✓
[2/3] Retrieving token balances (847 wallets)... ⏳ 45%
[3/3] Validating snapshot consistency... ⏳
```

### 6. パフォーマンス考慮事項

#### 6.1 並行取得制御
```typescript
const BATCH_SIZE = 50;  // 並行取得ウォレット数
const MAX_CONCURRENCY = 5;  // 最大同時RPC接続数

async function getBatchedSnapshot(
  wallets: string[],
  targetSlot: number
): Promise<HolderSnapshot[]> {
  const batches = chunk(wallets, BATCH_SIZE);
  const semaphore = new Semaphore(MAX_CONCURRENCY);

  return await Promise.all(
    batches.map(batch =>
      semaphore.acquire(() =>
        getWalletBalancesAtSlot(batch, targetSlot)
      )
    )
  );
}
```

### 7. 制限事項と注意点

#### 7.1 Solana RPC制限
- **履歴データ保持期間**: 通常2-3時間（RPCプロバイダー依存）
- **60分を超える過去データは取得不可能な場合あり**

#### 7.2 推奨利用方法
- **即時**: 小規模配布、テスト環境
- **5-10分前**: 本番環境での標準運用
- **30分以上**: 高額配布、厳格な監査が必要な場合