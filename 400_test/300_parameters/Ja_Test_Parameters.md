# テストパラメータ仕様書
# Tributary - Solana報酬配布システム

**更新日**: 2025-09-18
**更新者**: akameGusya

## 概要
本文書は、Tributaryシステムのテスト実行に必要な具体的なパラメータ値と設定を定義します。再現可能で体系的なテスト実行を可能にする標準パラメータセットを提供します。

## テスト環境別パラメータ

### 1. devnet環境パラメータ

#### 1.1 基本設定
```toml
[project]
name = "TributaryDevTest"
network = "devnet"

[token]
base_token = "So11111111111111111111111111111111111111112"  # Wrapped SOL
admin_wallet = "テスト用管理者ウォレット"

[distribution]
auto_distribute = false
minimum_balance = 0.1
batch_size = 5

[security]
key_encryption = false  # テスト用簡略化
backup_enabled = true
audit_log = true
```

#### 1.2 テスト用トークンアドレス
| トークン名 | アドレス | 用途 |
|-----------|---------|------|
| Wrapped SOL | `So11111111111111111111111111111111111111112` | 基準トークン |
| USDC (devnet) | `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` | 配布テスト |
| Test Token | 要作成 | カスタムトークンテスト |

### 2. testnet環境パラメータ

#### 2.1 基本設定
```toml
[project]
name = "TributaryTestnetTest"
network = "testnet"

[token]
base_token = "So11111111111111111111111111111111111111112"
admin_wallet = "テスト用管理者ウォレット"

[distribution]
auto_distribute = false
minimum_balance = 0.5
batch_size = 10

[security]
key_encryption = true
backup_enabled = true
audit_log = true
```

### 3. mainnet環境パラメータ（設定検証用）

#### 3.1 基本設定（設定検証のみ、実行なし）
```toml
[project]
name = "TributaryMainnetConfig"
network = "mainnet-beta"

[token]
base_token = "So11111111111111111111111111111111111111112"
admin_wallet = "本番用管理者ウォレット"

[distribution]
auto_distribute = false
minimum_balance = 1.0
batch_size = 10

[security]
key_encryption = true
backup_enabled = true
audit_log = true
```

**注意**: この設定はdevnet環境での検証にのみ使用し、mainnetでの実行は行いません。

## テストケース別パラメータ

### T001: 基本的な初期化コマンド
```bash
tributary init \
  --name "BasicInitTest" \
  --token "So11111111111111111111111111111111111111112" \
  --admin "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" \
  --network devnet
```

### T002: インタラクティブモード初期化
```bash
tributary init --interactive
# 入力値:
# - Project name: InteractiveTest
# - Base token: So11111111111111111111111111111111111111112
# - Admin wallet: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
# - Network: devnet
```

### T010: SOLトークン保有者収集
```bash
tributary collect \
  --token "So11111111111111111111111111111111111111112" \
  --threshold 0.1 \
  --network testnet \
  --output-file "test_holders.json"
```

### T011: 閾値指定フィルタリング
```bash
# 閾値別テストパラメータ
# 低閾値: --threshold 0.01  (多数の保有者)
# 中閾値: --threshold 1.0   (中程度の保有者)
# 高閾値: --threshold 10.0  (少数の保有者)
```

### T020: 基本配布シミュレーション
```bash
tributary distribute simulate \
  --amount 100 \
  --token "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" \
  --network testnet
```

### T030: ドライラン実行
```bash
tributary distribute execute \
  --amount 10 \
  --token "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" \
  --network testnet \
  --dry-run \
  --batch-size 3
```

### T031: 少額実配布
```bash
tributary distribute execute \
  --amount 1.0 \
  --token "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" \
  --network testnet \
  --wallet-file "./test-keypair.json" \
  --batch-size 5 \
  --confirm
```

## エラーテスト用パラメータ

### T004: 無効なパラメータエラー
```bash
# 無効なプロジェクト名
tributary init --name "" --token "invalid" --admin "invalid"

# 無効なトークンアドレス
tributary init --name "Test" --token "invalidaddress" --admin "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"

# 無効なウォレットアドレス
tributary init --name "Test" --token "So11111111111111111111111111111111111111112" --admin "invalidwallet"
```

### T060: 無効なトークンアドレス
```bash
tributary collect --token "ThisIsNotAValidTokenAddress123456789"
```

### T061: 残高不足エラー
```bash
# 利用可能残高を超える配布額でテスト
tributary distribute execute \
  --amount 999999 \
  --token "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" \
  --network testnet
```

## パフォーマンステスト用パラメータ

### T070: 1000件ウォレット収集時間
```bash
tributary collect \
  --token "So11111111111111111111111111111111111111112" \
  --threshold 0.001 \
  --max-holders 1000 \
  --network testnet \
  --cache false
```

### T071: 100件配布処理時間
```bash
# 事前に100名のテスト受信者ウォレットを準備
tributary distribute execute \
  --amount 100 \
  --token "TestTokenAddress" \
  --network testnet \
  --batch-size 20
```

## セキュリティテスト用パラメータ

### T080: 秘密鍵ファイル読み込み
```bash
# 正常な秘密鍵ファイル
tributary distribute execute \
  --amount 1 \
  --wallet-file "./valid-keypair.json" \
  --network devnet
```

### T081: 無効な秘密鍵エラー
```bash
# 破損した秘密鍵ファイル
tributary distribute execute \
  --amount 1 \
  --wallet-file "./invalid-keypair.json" \
  --network devnet
```

## テストデータセット

### 1. テスト用ウォレットリスト
```json
{
  "test_wallets": [
    {
      "name": "admin",
      "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "role": "administrator",
      "network": "devnet"
    },
    {
      "name": "recipient_1",
      "address": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "role": "recipient",
      "network": "devnet"
    },
    {
      "name": "recipient_2",
      "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
      "role": "recipient",
      "network": "devnet"
    }
  ]
}
```

### 2. 期待値データ
```json
{
  "expected_results": {
    "T001": {
      "exit_code": 0,
      "config_file_created": true,
      "project_name": "BasicInitTest"
    },
    "T010": {
      "exit_code": 0,
      "min_holders": 1,
      "output_format": "json"
    },
    "T020": {
      "exit_code": 0,
      "simulation_fields": ["estimatedGasCost", "estimatedDuration", "distributionBreakdown"]
    }
  }
}
```

## 環境変数設定

### 開発環境
```bash
export TRIBUTARY_CONFIG="./test-config.toml"
export TRIBUTARY_LOG_LEVEL="debug"
export TRIBUTARY_NETWORK="devnet"
export SOLANA_RPC_URL="https://api.devnet.solana.com"
```

### テスト環境
```bash
export TRIBUTARY_CONFIG="./testnet-config.toml"
export TRIBUTARY_LOG_LEVEL="info"
export TRIBUTARY_NETWORK="testnet"
export SOLANA_RPC_URL="https://api.testnet.solana.com"
```

### 本番テスト環境
```bash
export TRIBUTARY_CONFIG="./mainnet-config.toml"
export TRIBUTARY_LOG_LEVEL="warn"
export TRIBUTARY_NETWORK="mainnet-beta"
export SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
```

## テスト実行時間の目安

| テストフェーズ | 予想実行時間 | 備考 |
|-------------|------------|-----|
| Phase 1 (devnet基本機能) | 30分 | 設定・基本コマンド |
| Phase 2 (testnet統合) | 2時間 | ネットワーク処理含む |
| Phase 3 (パフォーマンス) | 1時間 | 大量データ処理 |
| Phase 4 (mainnet移行) | 30分 | 少額実証 |
| **合計** | **4時間** | 手動実行時 |

## リソース要件

### 最小要件
- **SOL残高**: devnet 5 SOL, testnet 10 SOL
- **メモリ**: 512MB
- **ディスク**: 100MB（ログ・キャッシュ含む）

### 推奨要件
- **SOL残高**: devnet 10 SOL, testnet 20 SOL
- **メモリ**: 1GB
- **ディスク**: 500MB（詳細ログ・バックアップ含む）