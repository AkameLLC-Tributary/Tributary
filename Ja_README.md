# Tributary
## 概要
Solanaトークンの保有残高に基づいて比例配布を可能にする、強力で使いやすいトークン配布システムです。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.0+-green.svg)](https://nodejs.org/)

## 機能概要

Tributaryでできること:
- トークン保有者の収集: 特定のSPLトークン（基準トークン）に基づいて
- 配布比率の計算: 保有量に比例した配布比率の算出
- 任意のSPLトークンの配布: 計算された比率に基づいて保有者への配布
- 配布実行: 包括的な検証とエラーハンドリング付きの配布実行

## 基本概念

1. **基準トークン**: 配布対象者を決定する（例：SOL保有者）
2. **配布トークン**: 配布するトークン（例：USDT、カスタムトークン）
3. **比例ロジック**: 配布量 = 総量 × (保有者の基準トークン残高 / 基準トークン総供給量)

## システム機能

### コア機能
- トークン保有者収集: 特定のSPLトークンの全保有者を自動検出
- 比例配布: 現在の保有比率に基づいた比例トークン配布
- マルチネットワーク対応: Devnet、Testnet、Mainnet-betaに対応
- バッチ処理: 大規模配布のための効率的なバッチ処理
- 進捗追跡: カラー出力によるリアルタイム進捗インジケーター

### 高度な機能
- キャッシュシステム: RPC呼び出しを削減しパフォーマンスを向上するインテリジェントキャッシュ
- 配布シミュレーション: 配布結果をプレビューするドライラン機能
- インタラクティブCLI: プログレスバー付きのユーザーフレンドリーなコマンドラインインターフェース
- 包括的ログ: 設定可能なレベルとファイルローテーション付きの詳細ログ
- エラー回復: 自動リトライ機能付きの堅牢なエラーハンドリング

### セキュリティ & 信頼性
- 入力検証: Zodスキーマ検証による包括的な検証
- 安全な鍵管理: 秘密鍵と機密データの安全な取り扱い
- 監査ログ: 全操作の完全な監査証跡
- 型安全性: 厳格な型チェック付きの完全TypeScript実装
- 設定検証: スキーマ検証付きのTOML設定

## インストール

### NPMから（推奨）
```bash
npm install -g @akamellc/tributary
```

### ソースから
```bash
git clone https://github.com/akameGusya/tributary.git
cd tributary/200_src
npm install
npm run build
npm link
```

## クイックスタート

### 1. 新規プロジェクトの初期化
```bash
# 基本的な初期化
tributary init --name "MyProject" \
  --token "So11111111111111111111111111111111111111112" \
  --admin "YourAdminWalletAddress" \
  --network devnet

# インタラクティブモードでガイド付きセットアップ
tributary init --interactive
```

### 2. トークン保有者の収集
```bash
# 最低1.0 SOLを持つ全SOL保有者を収集
tributary collect --token "So11111111111111111111111111111111111111112" --threshold 1.0

# 大口保有者を除外してファイルに保存
tributary collect --threshold 0.1 \
  --exclude "LargeHolder1,LargeHolder2" \
  --output-file holders.json

# キャッシュを無効化してリアルタイムデータを取得
tributary collect --cache false --threshold 0.1
```

### 3. 配布シミュレーション（推奨）
```bash
# 1000 USDTの配布をプレビュー
tributary distribute simulate --amount 1000 \
  --token "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
```

### 4. 配布実行
```bash
# 実際の配布を実行
tributary distribute execute --amount 1000 \
  --token "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" \
  --wallet-file ./admin-keypair.json

# 最初にドライラン（安全なテスト）
tributary distribute execute --amount 1000 \
  --token "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" \
  --wallet-file ./admin-keypair.json \
  --dry-run
```

## コマンドリファレンス

### グローバルオプション
全てのコマンドで使用可能なグローバルオプション:
```bash
--config <path>      設定ファイルパス（デフォルト: ./tributary.toml）
--output <format>    出力形式: table, json, yaml（デフォルト: table）
--log-level <level>  ログレベル: debug, info, warn, error（デフォルト: info）
--network <network>  ネットワーク上書き: devnet, testnet, mainnet-beta
--help, -h          コマンドのヘルプを表示
```

### プロジェクト管理

#### `init` - プロジェクト初期化
```bash
tributary init [options]
```

**必須:**
- `--name <name>` - プロジェクト名（1-100文字、英数字+ハイフン/アンダースコア）
- `--token <address>` - 基準トークンアドレス（Solana Base58形式）
- `--admin <address>` - 管理者ウォレットアドレス

**オプション:**
- `--network <network>` - ターゲットネットワーク（デフォルト: devnet）
- `--force, -f` - 既存設定を上書き
- `--interactive, -i` - ガイド付きプロンプトのインタラクティブセットアップモード

**例:**
```bash
# 基本的なプロジェクトセットアップ
tributary init --name "SOLRewards" \
  --token "So11111111111111111111111111111111111111112" \
  --admin "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"

# メインネットプロジェクト（慎重に使用）
tributary init --name "MainnetProject" \
  --token "TokenAddress" \
  --admin "AdminAddress" \
  --network mainnet-beta

# インタラクティブモード
tributary init --interactive
```

### トークン保有者管理

#### `collect` - トークン保有者収集
```bash
tributary collect [options]
```

**オプション:**
- `--token <address>` - 収集対象のトークンアドレス（省略時は設定のbase_tokenを使用）
- `--threshold <amount>` - 最小残高しきい値（デフォルト: 0）
- `--max-holders <number>` - 収集する最大保有者数
- `--output-file <path>` - 結果をファイルに保存（JSONまたはCSV形式）
- `--cache, -c` - キャッシュを使用（デフォルト: true）
- `--cache-ttl <seconds>` - キャッシュTTL（秒）（デフォルト: 3600）
- `--exclude <addresses>` - 除外する特定のアドレス（カンマ区切り）

**例:**
```bash
# 最低10トークンを持つ全保有者を収集
tributary collect --threshold 10

# 収集結果をファイルに保存
tributary collect --threshold 1 --output-file holders.csv

# 大口保有者を収集から除外
tributary collect --exclude "Whale1Address,Whale2Address" --threshold 0.1

# 新しいデータのためキャッシュを無効化
tributary collect --cache false --threshold 1
```

### トークン配布

#### `distribute execute` - 配布実行
```bash
tributary distribute execute [options]
```

**必須:**
- `--amount <amount>` - 総配布量
- `--wallet-file <path>` - 秘密鍵ファイルパス（JSON形式）

**オプション:**
- `--token <address>` - 配布トークンアドレス（基準トークンと異なっても可）
- `--dry-run` - シミュレーションモード（実際のトランザクションなし）
- `--batch-size <number>` - 処理用バッチサイズ（デフォルト: 10）
- `--confirm, -y` - 確認プロンプトをスキップ

**例:**
```bash
# SOL保有者に1000 USDTを配布
tributary distribute execute --amount 1000 \
  --token "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" \
  --wallet-file admin-keypair.json

# 最初にドライラン（推奨）
tributary distribute execute --amount 1000 \
  --token "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" \
  --wallet-file admin-keypair.json \
  --dry-run

# より大きなバッチサイズでの大規模配布
tributary distribute execute --amount 50000 \
  --token "CustomTokenAddress" \
  --wallet-file admin-keypair.json \
  --batch-size 20 \
  --confirm
```

#### `distribute simulate` - 配布シミュレーション
```bash
tributary distribute simulate [options]
```

**オプション:**
- `--amount <amount>` - シミュレーション用配布量
- `--token <address>` - トークンアドレス
- `--detail` - 詳細な内訳を表示

**例:**
```bash
# クイックシミュレーション
tributary distribute simulate --amount 1000

# カスタムトークンでの詳細シミュレーション
tributary distribute simulate --amount 5000 \
  --token "CustomTokenAddress" \
  --detail
```

#### `distribute history` - 配布履歴表示
```bash
tributary distribute history [options]
```

**オプション:**
- `--limit <number>` - 結果を制限（デフォルト: 50）
- `--from <date>` - 開始日（YYYY-MM-DD）
- `--to <date>` - 終了日（YYYY-MM-DD）
- `--format <format>` - 出力形式: table, json, csv（デフォルト: table）

### 設定管理

#### `config show` - 設定表示
```bash
tributary config show [options]
```

**オプション:**
- `--section <section>` - 特定セクションを表示（project, token, distribution等）
- `--format <format>` - 出力形式: table, json, yaml（デフォルト: table）
- `--show-secrets` - 機密情報を表示（管理者ウォレット等）

#### `config validate` - 設定検証
```bash
tributary config validate [options]
```

**オプション:**
- `--strict` - 厳格検証モード
- `--check-network` - ネットワーク接続をチェック

#### `config export` - 設定エクスポート
```bash
tributary config export [options]
```

**オプション:**
- `--output <path>` - 出力ファイルパス
- `--format <format>` - エクスポート形式: toml, json, yaml（デフォルト: toml）
- `--exclude-secrets` - 機密情報を除外

## キャッシュシステム

Tributaryはパフォーマンス向上とRPC呼び出し削減のためのインテリジェントなキャッシュシステムを含んでいます。

### キャッシュ機能

**デフォルト動作:**
- 全ての操作で**キャッシュはデフォルトで有効**
- キャッシュされたデータにより応答速度が大幅に向上
- TTL設定に基づいてキャッシュは自動的に期限切れ

**キャッシュ制御:**
```bash
# キャッシュを有効化（デフォルト動作）
tributary collect --cache true

# リアルタイムデータのためキャッシュを無効化
tributary collect --cache false

# カスタムキャッシュTTL（生存時間）
tributary collect --cache-ttl 7200  # 2時間
```

**キャッシュを無効化すべき場合:**
- リアルタイムで最新の保有者情報が必要な場合
- 頻繁に変更されるデータでのテスト
- 配布計算のデバッグ
- 初回セットアップの検証

**パフォーマンスへの影響:**
- キャッシュ有効: 繰り返し操作で高速応答
- キャッシュ無効: 低速だが常に最新のデータ

### キャッシュ保存場所
キャッシュファイルはローカルに保存され、システムが自動的に管理します。

## 出力ファイル形式

Tributaryはトークン保有者データ収集で複数の出力形式をサポートしています。

### サポート形式

**JSON形式 (.json)**:
- 完全なメタデータを含む構造化データ
- 機械可読形式
- データ型と精度を保持
- プログラムでの処理に最適

```json
[
  {
    "address": "D8zGvbM3w6bcAsnfWcZnWEz2GLeK7LPVftqwsMDCkcHk",
    "balance": "10999999990.000002",
    "percentage": 100.0000
  },
  {
    "address": "22XkWSj5b7MTgaJr5eSs6Wd1dPzHEaZrQNjW3BeQnGv4",
    "balance": "100.0000",
    "percentage": 0.0009
  }
]
```

**CSV形式 (.csv)**:
- スプレッドシート互換形式
- ヘッダー行を自動的に含む
- Excel/Google Sheetsへの簡単インポート
- 人間が読みやすい表形式データ

```csv
Address,Balance,Percentage
D8zGvbM3w6bcAsnfWcZnWEz2GLeK7LPVftqwsMDCkcHk,10999999990.000002,100.0000
22XkWSj5b7MTgaJr5eSs6Wd1dPzHEaZrQNjW3BeQnGv4,100.0000,0.0009
```

**YAML形式 (.yaml/.yml)**:
- 人間が読みやすい構造化形式
- 設定ファイルに適している
- データ階層を保持

### 形式検出
ファイル形式はファイル拡張子から自動的に検出されます：

```bash
# 自動形式検出
tributary collect --output-file holders.json   # → JSON形式
tributary collect --output-file holders.csv    # → CSV形式
tributary collect --output-file holders.yaml   # → YAML形式
tributary collect --output-file data.txt       # → JSON形式（デフォルト）
```

### 用途

- **JSON**: API統合、データ処理、バックアップストレージ
- **CSV**: スプレッドシート分析、レポート作成、データ可視化
- **YAML**: 設定ファイル、人間が読みやすいドキュメント

## 設定

Tributaryは包括的な検証付きのTOML設定ファイルを使用します。

### 設定構造

```toml
[project]
name = "MyProject"                           # プロジェクト名
created = "2025-09-18T10:30:15Z"            # 作成タイムスタンプ
network = "devnet"                          # ネットワーク: devnet/testnet/mainnet-beta

[token]
base_token = "So11111111111111111111111111111111111111112"     # 保有者選択用の基準トークン
admin_wallet = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"  # 管理者ウォレットアドレス

[distribution]
auto_distribute = false                      # 自動配布（将来の機能）
minimum_balance = 1.0                       # 最小残高しきい値
batch_size = 10                             # バッチ処理サイズ
reward_token = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"  # デフォルト配布トークン（USDT）

[security]
key_encryption = true                        # 鍵暗号化を有効化
backup_enabled = true                        # バックアップを有効化
audit_log = true                            # 監査ログを有効化

[network]
timeout = 30000                             # RPCタイムアウト（ミリ秒）
max_retries = 3                             # 最大リトライ回数
retry_delay = 1000                          # リトライ遅延（ミリ秒）

[logging]
level = "info"                              # ログレベル: debug/info/warn/error
log_dir = "./logs"                          # ログディレクトリ
enable_console = true                       # コンソールログ
enable_file = true                          # ファイルログ
max_files = 14                              # 最大ログファイル数
max_size = "20m"                            # 最大ファイルサイズ
```

### 設定検証

全ての設定パラメータはZodスキーマで検証されます:
- **Solanaアドレス** Base58形式の検証
- **ネットワーク値** 有効なオプションに制限
- **数値** 受入可能な範囲での検証
- **必須フィールド** auto_distribute有効時に強制

## トークン配布フロー

### プロセスの理解

1. **基準トークン選択**: 対象とするトークン保有者を選択（例：SOL保有者）
2. **保有者収集**: しきい値を超える基準トークンを保有する全アドレスを収集
3. **比率計算**: 各保有者の総供給量に対する割合を計算
4. **配布トークン**: 配布するトークンを選択（基準トークンと異なっても可）
5. **比例配布**: 基準トークンの比率に基づいて配布

### シナリオ例

**目標**: SOL保有者に10,000 USDTを比例配布

```bash
# 1. SOL保有者用プロジェクト初期化
tributary init --name "SOLRewards" \
  --token "So11111111111111111111111111111111111111112" \
  --admin "YourAdminWallet"

# 2. SOL保有者を収集（最小1 SOL）
tributary collect --threshold 1.0

# 3. USDT配布をシミュレーション
tributary distribute simulate --amount 10000 \
  --token "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"

# 4. 実際の配布を実行
tributary distribute execute --amount 10000 \
  --token "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" \
  --wallet-file admin-keypair.json
```

**結果**: 各SOL保有者はSOL保有量に比例してUSDTを受け取ります
- 100 SOL保有者（供給量の10%） → 1,000 USDT
- 50 SOL保有者（供給量の5%） → 500 USDT
- その他同様

## API使用方法（プログラム利用）

TributaryはTypeScript/JavaScriptライブラリとして使用可能です:

```typescript
import {
  WalletCollectorService,
  DistributionService,
  ConfigManager
} from 'tributary';
import { PublicKey, Keypair } from '@solana/web3.js';

// 設定初期化
const configManager = new ConfigManager('./tributary.toml');
await configManager.loadConfig();

// サービス初期化
const collectorService = new WalletCollectorService('devnet');
const distributionService = new DistributionService('devnet', adminKeypair);

// トークン保有者収集
const holders = await collectorService.collectWallets({
  tokenAddress: new PublicKey('So11111111111111111111111111111111111111112'),
  threshold: 1.0,
  useCache: true,
  excludeAddresses: [new PublicKey('ExcludeThisAddress')]
});

console.log(`${holders.length}名の適格保有者を発見`);

// 配布シミュレーション
const simulationResult = await distributionService.simulateDistribution({
  amount: 1000,
  tokenAddress: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
  holders: holders
});

console.log(`予想ガス費用: ${simulationResult.estimatedGasCost} SOL`);

// 進捗追跡付きで配布実行
const distribution = await distributionService.executeDistribution({
  amount: 1000,
  tokenAddress: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
  holders: holders
}, (progress) => {
  console.log(`進捗: ${progress.completed}/${progress.total} (${progress.rate.toFixed(1)} tx/sec)`);
});

console.log(`配布完了: ${distribution.getSuccessfulCount()}件の送金成功`);
```

## エラーハンドリング

Tributaryは特定の終了コード付きの包括的なエラーハンドリングを提供します:

| コード | タイプ | 説明 |
|------|------|-------------|
| **0** | 成功 | 操作が正常に完了 |
| **1** | 一般エラー | 予期しないエラーが発生 |
| **2** | 検証エラー | 無効なコマンドライン引数 |
| **3** | 設定エラー | 無効または存在しない設定 |
| **4** | ネットワークエラー | RPC接続またはブロックチェーン問題 |
| **5** | 認証エラー | 無効なウォレットまたは権限問題 |
| **6** | データ整合性エラー | 破損データまたは検証失敗 |
| **7** | リソースエラー | 資金またはリソース不足 |
| **8** | タイムアウトエラー | 操作がタイムアウト |

### エラー例

```bash
# 設定エラー
❌ ConfigurationError: 設定ファイルが見つかりません: ./tributary.toml
💡 解決策: 'tributary init'を実行して新規プロジェクトを作成してください

# 検証エラー
❌ ValidationError: 無効なトークンアドレス形式
💡 期待値: Base58エンコードされたSolanaトークンアドレス（32-44文字）

# リソースエラー
❌ ResourceError: トークン残高不足。必要: 10,000.00 USDT、利用可能: 8,756.43 USDT
💡 解決策: 管理者ウォレットにより多くのUSDTを追加するか、配布量を減らしてください
```

## セキュリティの考慮事項

### 秘密鍵管理
- **絶対にコミットしない** 秘密鍵をバージョン管理に
- **安全なストレージを使用** 鍵ペアファイルの保管
- **適切なファイル権限を設定** 鍵ペアファイルに（600）
- **ハードウェアウォレットを検討** 本番環境での使用

### ネットワーク安全性
- **必ずdevnetでテスト** メインネット展開前に
- **ドライランモードを使用** 実際の配布前に
- **トークンアドレスを再確認** 実行前に
- **受取人リストを検証** シミュレーションモードで

### メインネット注意事項
```bash
# メインネットでは必ず最初にシミュレーション
tributary distribute simulate --amount 1000 --token "TokenAddress"

# 最終検証にドライランを使用
tributary distribute execute --amount 1000 --token "TokenAddress" \
  --wallet-file keypair.json --dry-run

# 確認付きで実行
tributary distribute execute --amount 1000 --token "TokenAddress" \
  --wallet-file keypair.json
```

## 開発

### 前提条件
- Node.js 18.0.0以上
- npm 8.0.0以上
- TypeScript 5.6以上

### ソースからのビルド
```bash
git clone https://github.com/akameGusya/tributary.git
cd tributary/200_src
npm install
npm run build
```

### 開発スクリプト
```bash
npm run dev          # 開発モードで実行
npm run build        # 本番用ビルド
npm run typecheck    # 型チェックのみ
npm test             # テストスイート実行
npm run test:watch   # ウォッチモードテスト
npm run test:coverage # カバレッジレポート生成
npm run lint         # ESLint実行
npm run lint:fix     # ESLint問題修正
npm run format       # Prettierでフォーマット
npm run format:check # Prettierフォーマットチェック
```

### テスト
```bash
# 全テスト実行
npm test

# カバレッジ付きテスト実行
npm run test:coverage

# 開発用ウォッチモード
npm run test:watch
```

### コード品質
プロジェクトは高いコード品質標準を維持しています:
- TypeScriptルール付きの**ESLint**
- 一貫したフォーマットのための**Prettier**
- 包括的テスト用**Jest**（カバレッジ目標80%）
- **厳格TypeScript**設定
- ランタイム検証のための**Zod**

## 現在のステータス & ロードマップ

### ✅ 現在の機能（v0.1.0）
- ✅ プロジェクト初期化と設定
- ✅ キャッシュ付きトークン保有者収集
- ✅ 手動配布実行
- ✅ 配布シミュレーションと検証
- ✅ 進捗追跡付き包括的CLI
- ✅ 検証付きTOML設定
- ✅ 構造化ログとエラーハンドリング
- ✅ バッチ処理とリトライメカニズム
- ✅ プログラム利用のためのTypeScript API

### 🚧 将来の機能
- [ ] **自動配布**: スケジュール/トリガーベースの配布
- [ ] **ウェブダッシュボード**: ブラウザベースのインターフェース
- [ ] **高度なフィルタリング**: 複雑な保有者選択ルール
- [ ] **マルチトークンサポート**: 複数トークンの同時配布
- [ ] **Webhook統合**: 外部イベントトリガー
- [ ] **モバイルアプリ**: 監視用モバイルインターフェース
- [ ] **分析ダッシュボード**: 配布分析とレポート

### 🔄 既知の制限事項
- **手動実行のみ**: 自動配布はまだ実装されていません
- **単一トークン配布**: 1回の配布実行につき1トークン
- **基本フィルタリング**: 限定的な保有者除外オプション
- **CLIのみ**: ウェブインターフェースは利用不可

## コントリビューション

コントリビューションを歓迎します！プロジェクトガイドラインに従ってください:

### 始め方
1. リポジトリをフォーク
2. 機能ブランチを作成（`git checkout -b feature/amazing-feature`）
3. テスト付きで変更を加える
4. 全品質チェックがパスすることを確認（`npm run prepublishOnly`）
5. [Conventional Commits](https://www.conventionalcommits.org/)に従って変更をコミット
6. ブランチにプッシュ（`git push origin feature/amazing-feature`）
7. プルリクエストを開く

### 開発ガイドライン
- **プロジェクト規則に従う**: 包括的なガイドラインは[`PROJECT_RULES.md`](PROJECT_RULES.md)を参照
- **品質基準**: 全コードはTypeScript、ESLint、テストチェックをパスする必要があります
- **セマンティックバージョニング**: [Semantic Versioning 2.0.0](https://semver.org/)に従う
- **ドキュメント**: 新機能に関連するドキュメントを更新
- **テスト**: 包括的なテストカバレッジを維持

## ライセンス

このプロジェクトはMITライセンスの下でライセンスされています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## サポート & コミュニティ

- **GitHub Issues**: [バグ報告や機能リクエスト](https://github.com/akameGusya/tributary/issues)
- **ドキュメント**: [`/100_doc`の追加ドキュメント](100_doc/)および[`PROJECT_RULES.md`](PROJECT_RULES.md)
- **NPMパッケージ**: [`@akamellc/tributary`](https://www.npmjs.com/package/@akamellc/tributary)

---

**⚠️ 重要な免責事項**: このソフトウェアは教育および開発目的のために「現状のまま」提供されます。メインネットで使用する前に必ずdevnetで十分にテストしてください。著者は資金の損失について責任を負いません。自己責任で使用し、実行前にトークン配布の意味を理解していることを確認してください。