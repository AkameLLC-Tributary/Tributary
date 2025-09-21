# パラメータ設定ガイド
# Tributary - Solana報酬配布システム

## 概要

Tributary CLIは柔軟なパラメータ設定に対応し、様々なユーザ環境や要件に合わせて設定可能です。従来のハードコーディングされた値はすべて複数の方法で設定変更できるようになりました。

## 設定優先順位

パラメータは以下の優先順位で読み込まれます（上位が優先）：

1. **CLI引数** (最高優先度)
2. **環境変数**
3. **設定ファイル** (`tributary-parameters.json`)
4. **デフォルト値** (最低優先度)

## 設定方法

### 1. 環境変数

`TRIBUTARY_` プレフィックスを付けて環境変数を設定：

```bash
# ネットワーク設定
export TRIBUTARY_DEFAULT_NETWORK=mainnet-beta
export TRIBUTARY_NETWORK_TIMEOUT=45000
export TRIBUTARY_MAX_RETRIES=5

# RPC エンドポイント
export TRIBUTARY_DEVNET_RPC=https://your-custom-devnet-rpc.com
export TRIBUTARY_MAINNET_RPC=https://your-custom-mainnet-rpc.com

# 配布設定
export TRIBUTARY_BATCH_SIZE=20

# ログ設定
export TRIBUTARY_LOG_LEVEL=debug
export TRIBUTARY_LOG_DIR=/var/log/tributary
```

### 2. 設定ファイル

プロジェクトディレクトリに `tributary-parameters.json` ファイルを作成：

```bash
# Tributary CLIのインストールディレクトリからサンプルファイルをコピー
cp tributary-parameters.example.json tributary-parameters.json

# 設定を編集
vim tributary-parameters.json
```

カスタム設定ファイルパスの指定も可能：

```bash
export TRIBUTARY_PARAMETERS_FILE=/path/to/your/config.json
```

### 3. CLI オプション

多くのパラメータはCLIオプションでオーバーライド可能：

```bash
tributary init --name MyProject --network mainnet-beta
tributary distribute --batch-size 25
```

## 設定カテゴリ

### ネットワーク設定

- **defaultNetwork**: 新規プロジェクトのデフォルトネットワーク (`devnet`/`testnet`/`mainnet-beta`)
- **timeout**: ネットワークリクエストタイムアウト（ミリ秒）
- **maxRetries**: 失敗リクエストの最大リトライ回数
- **retryDelay**: リトライ間隔（ミリ秒）
- **confirmationTimeout**: トランザクション確認タイムアウト
- **commitment**: トランザクション確認レベル

### RPC エンドポイント

- **endpoints**: 各ネットワークのプライマリRPCエンドポイント
- **fallbackEndpoints**: プライマリが失敗した場合のバックアップエンドポイント

### 配布設定

- **defaultBatchSize**: デフォルトの受信者バッチサイズ
- **maxBatchSize**: 許可される最大バッチサイズ
- **batchDelayMs**: バッチ間の遅延時間
- **estimatedGasPerTransaction**: トランザクションあたりの推定SOLコスト
- **riskThresholds**: 警告の閾値（大量金額、多数受信者など）

### トークン設定

- **defaultDecimals**: トークンのデフォルト小数点以下桁数
- **fallbackDecimals**: 検出に失敗した場合のフォールバック
- **minimumBalance**: 配布に必要な最小残高

### キャッシュ設定

- **defaultTtlSeconds**: デフォルトキャッシュ有効期間
- **walletCacheTtlSeconds**: ウォレットデータキャッシュ期間
- **configCacheTtlSeconds**: 設定キャッシュ期間

### ログ設定

- **defaultLevel**: デフォルトログレベル (`error`/`warn`/`info`/`debug`)
- **defaultDir**: ログディレクトリパス
- **enableConsole**: コンソールログ有効化
- **enableFile**: ファイルログ有効化
- **maxFiles**: 保持する最大ログファイル数
- **maxFileSize**: ログファイルあたりの最大サイズ

### セキュリティ設定

- **defaultKeyEncryption**: デフォルトでキー暗号化を有効化
- **defaultBackupEnabled**: デフォルトでバックアップを有効化
- **defaultAuditLog**: デフォルトで監査ログを有効化

## 使用例

### 本番環境

```json
{
  "network": {
    "defaultNetwork": "mainnet-beta",
    "timeout": 45000,
    "maxRetries": 5
  },
  "distribution": {
    "defaultBatchSize": 5,
    "batchDelayMs": 500
  },
  "logging": {
    "defaultLevel": "warn",
    "enableConsole": false,
    "enableFile": true
  },
  "security": {
    "defaultKeyEncryption": true,
    "defaultBackupEnabled": true,
    "defaultAuditLog": true
  }
}
```

### 開発環境

```json
{
  "network": {
    "defaultNetwork": "devnet",
    "timeout": 30000,
    "maxRetries": 2
  },
  "distribution": {
    "defaultBatchSize": 20,
    "batchDelayMs": 50
  },
  "logging": {
    "defaultLevel": "debug",
    "enableConsole": true,
    "enableFile": true
  }
}
```

### 大量配布環境

```json
{
  "distribution": {
    "defaultBatchSize": 50,
    "maxBatchSize": 100,
    "batchDelayMs": 25,
    "riskThresholds": {
      "largeRecipientCountThreshold": 5000
    }
  },
  "cache": {
    "walletCacheTtlSeconds": 3600
  }
}
```

## 初期化時の詳細設定

初期化コマンドで追加パラメータを指定可能：

```bash
tributary init \
  --name MyProject \
  --token So11111111111111111111111111111111111111112 \
  --admin 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU \
  --network mainnet-beta \
  --batch-size 25 \           # バッチサイズ指定
  --network-timeout 45000 \   # ネットワークタイムアウト指定
  --max-retries 5 \           # 最大リトライ数指定
  --log-level debug \         # ログレベル指定
  --disable-encryption \      # 暗号化無効化
  --disable-backup \          # バックアップ無効化
  --disable-audit \           # 監査ログ無効化
  --devnet-rpc https://custom-devnet.com \    # カスタムdevnet RPC
  --testnet-rpc https://custom-testnet.com \  # カスタムtestnet RPC
  --mainnet-rpc https://custom-mainnet.com    # カスタムmainnet RPC
```

## ハードコーディングからの移行

従来のハードコーディングされた値と新しい設定項目の対応：

| 従来のハードコード値 | 新しい設定項目 |
|-------------------|----------------|
| `'devnet'` | `network.defaultNetwork` |
| `30000` (timeout) | `network.timeout` |
| `3` (max retries) | `network.maxRetries` |
| `10` (batch size) | `distribution.defaultBatchSize` |
| `'info'` (log level) | `logging.defaultLevel` |
| `'./logs'` | `logging.defaultDir` |
| RPC URLs | `rpc.endpoints.*` |

## 検証

設定を検証し、以下について警告を表示：

- 無効なネットワーク名
- 範囲外の数値
- 不足している必須設定
- パフォーマンス上の問題

`tributary config validate` で設定を確認可能。

## ベストプラクティス

1. **機密データには環境変数を使用**（カスタムRPC URLなど）
2. **環境固有設定には設定ファイルを使用**
3. **デフォルトから開始**し、必要な部分のみオーバーライド
4. **本番使用前に開発環境でテスト**
5. **設定ファイルをバージョン管理**（機密データを除く）
6. **パフォーマンスを監視**し、バッチサイズとタイムアウトを調整

## トラブルシューティング

- 設定が読み込まれない: ファイルパスとJSON構文を確認
- 環境変数が無視される: 正しい `TRIBUTARY_` プレフィックスを確認
- パフォーマンス問題: バッチサイズと遅延を調整
- RPC失敗: フォールバックエンドポイントを設定

詳細は `tributary --help` またはドキュメントを参照してください。