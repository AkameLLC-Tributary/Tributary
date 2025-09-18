# インターフェース詳細設計書
# Tributary - Solana報酬配布システム

**更新日**: 2025-09-18
**更新者**: akameGusya

## 概要
本文書は、Tributaryシステムの全インターフェース仕様を定義する。CLIコマンド体系、内部API、外部システム連携、および設定ファイル形式の詳細を記述する。

## 1. CLI インターフェース仕様

### 1.1 コマンド体系設計

#### 1.1.1 基本構造
```
tributary <command> [subcommand] [options] [arguments]
```

**設計原則**:
- **一貫性**: 全コマンドで統一されたオプション形式
- **直感性**: 機能を直接表現するコマンド名
- **拡張性**: 新機能追加に対応可能な構造
- **POSIX準拠**: 標準的なUnix規約に従った設計

#### 1.1.2 グローバルオプション
**全コマンド共通のオプション**:

```
--config, -c <path>     設定ファイルパス指定
--verbose, -v           詳細出力モード
--quiet, -q             静寂モード（エラーのみ出力）
--help, -h              ヘルプ表示
--version, -V           バージョン情報表示
--network <network>     ネットワーク指定（devnet/testnet/mainnet-beta）
--output <format>       出力形式指定（table/json/csv）
--log-level <level>     ログレベル指定（error/warn/info/debug/trace）
```

**オプション詳細**:
- **config**: デフォルト値 `./tributary.toml`
- **output**: デフォルト値 `table`（テーブル形式）
- **log-level**: デフォルト値 `info`
- **network**: 設定ファイルの値を優先、未指定時は `devnet`

### 1.2 主要コマンド仕様

#### 1.2.1 init コマンド
**目的**: プロジェクト初期化とセットアップ

```bash
tributary init [options]
```

**オプション**:
```
--name <name>           プロジェクト名（必須）
--token <address>       基準トークンアドレス（必須）
--admin <address>       管理者ウォレットアドレス（必須）
--network <network>     対象ネットワーク（デフォルト: devnet）
--force, -f             既存設定の上書き
--interactive, -i       インタラクティブモード
```

**実行例**:
```bash
# 基本的な初期化
tributary init --name "MyProject" --token "So11111111111111111111111111111111111111112" --admin "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"

# インタラクティブモード
tributary init --interactive

# 既存設定の上書き
tributary init --name "UpdatedProject" --force
```

**検証処理**:
- プロジェクト名の妥当性（1-100文字、英数字・ハイフン・アンダースコア）
- トークンアドレスのSolana Base58形式検証
- 管理者ウォレットアドレスの形式検証
- ネットワーク指定値の妥当性確認

**出力形式**:
```
✅ Project initialized successfully
📁 Project name: MyProject
🌐 Network: devnet
🪙 Base token: So11111111111111111111111111111111111111112
👤 Admin wallet: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
📄 Config saved to: ./tributary.toml
```

#### 1.2.2 collect コマンド
**目的**: トークン保有者情報の収集

```bash
tributary collect [options]
```

**オプション**:
```
--token <address>       収集対象トークンアドレス
--threshold <amount>    最小保有量閾値（デフォルト: 0）
--max-holders <number>  最大収集数制限
--output-file <path>    結果出力ファイルパス
--cache, -c             キャッシュ使用（デフォルト: true）
--cache-ttl <seconds>   キャッシュ有効期間
--exclude <addresses>   除外アドレスリスト（カンマ区切り）
```

**実行例**:
```bash
# 基本的な収集
tributary collect --token "TokenAddress..." --threshold 100

# 大口保有者の除外
tributary collect --token "TokenAddress..." --exclude "LargeHolder1,LargeHolder2"

# キャッシュ無効化
tributary collect --token "TokenAddress..." --cache false

# 結果をファイル出力
tributary collect --token "TokenAddress..." --output-file holders.json
```

**進捗表示**:
```
🔍 Collecting token holders...
Token: TokenAddress... (SOL)
Network: devnet
Threshold: 100.0 SOL

[████████████████████████████████████████] 100% (1,234/1,234)
⏱️  Elapsed: 2m 34s | ETA: 0s
📊 Processing rate: 8.1 holders/sec

✅ Collection completed
👥 Total holders found: 1,234
✅ Valid holders: 1,198
❌ Invalid/excluded: 36
💾 Saved to: data/wallets.json
```

#### 1.2.3 distribute コマンド
**目的**: トークン配布の実行

```bash
tributary distribute <subcommand> [options]
```

**サブコマンド**:
- **execute**: 手動配布実行
- **simulate**: 配布シミュレーション
- **auto**: 自動配布設定
- **status**: 配布状況確認
- **history**: 配布履歴表示

##### 1.2.3.1 distribute execute
```bash
tributary distribute execute [options]
```

**オプション**:
```
--amount <amount>       配布総額（必須）
--token <address>       配布トークンアドレス
--dry-run              ドライラン実行
--batch-size <number>   バッチサイズ（デフォルト: 10）
--confirm, -y          確認プロンプトスキップ
--wallet-file <path>    秘密鍵ファイルパス
```

**実行例**:
```bash
# 基本的な配布実行
tributary distribute execute --amount 10000 --token "USDC-Address"

# ドライラン実行
tributary distribute execute --amount 10000 --dry-run

# バッチサイズ指定
tributary distribute execute --amount 10000 --batch-size 20
```

**確認プロンプト**:
```
⚠️  Distribution Confirmation ⚠️
📊 Distribution Summary:
   • Total amount: 10,000.00 USDC
   • Recipients: 1,198 holders
   • Network: mainnet-beta
   • Estimated gas cost: ~$2.40

💰 Top 5 recipients:
   1. 7xKXtg... → 245.67 USDC (2.46%)
   2. 9yHFdk... → 189.34 USDC (1.89%)
   3. 5tGHwe... → 156.78 USDC (1.57%)
   ...

❓ Do you want to proceed? (y/N):
```

**実行進捗**:
```
🚀 Starting token distribution...
💰 Distributing 10,000.00 USDC to 1,198 recipients

[██████████████████████░░░░░░░░] 75% (900/1,198)
⏱️  Elapsed: 3m 45s | ETA: 1m 12s
✅ Successful: 895 | ❌ Failed: 5 | 📊 Rate: 4.0 tx/sec

Current batch: 91-100 (10 transactions)
Latest tx: 3xKzF9d8... (confirmed)
```

##### 1.2.3.2 distribute simulate
```bash
tributary distribute simulate [options]
```

**シミュレーション出力**:
```
📊 Distribution Simulation Results
Total amount: 10,000.00 USDC
Recipients: 1,198 holders

💰 Distribution breakdown:
   • Top 10 holders: 3,456.78 USDC (34.57%)
   • Top 50 holders: 6,234.56 USDC (62.35%)
   • Remaining holders: 3,765.44 USDC (37.65%)

🏷️  Amount distribution:
   • >100 USDC: 45 recipients (567.89 USDC each)
   • 10-100 USDC: 234 recipients (25.67 USDC each)
   • 1-10 USDC: 567 recipients (3.45 USDC each)
   • <1 USDC: 352 recipients (0.78 USDC each)

💸 Estimated costs:
   • Transaction fees: ~$2.40 (1,198 tx × $0.002)
   • Total cost: $2.40

⚡ Estimated execution time: 4-6 minutes
```

#### 1.2.4 config コマンド
**目的**: 設定管理

```bash
tributary config <subcommand> [options]
```

**サブコマンド**:
- **show**: 設定表示
- **edit**: 設定編集
- **export**: 設定エクスポート
- **import**: 設定インポート
- **validate**: 設定検証

##### 1.2.4.1 config show
```bash
tributary config show [options]
```

**オプション**:
```
--section <section>     特定セクションのみ表示
--format <format>       出力形式（table/json/yaml）
--show-secrets         機密情報も表示
```

**出力例**:
```
📋 Project Configuration

📁 Project Information:
   Name: MyProject
   Created: 2025-09-18 10:30:15 UTC
   Network: mainnet-beta

🪙 Token Configuration:
   Base token: So11111111111111111111111111111111111111112 (SOL)
   Admin wallet: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

⚙️ Distribution Settings:
   Schedule: weekly
   Reward token: USDC
   Auto distribute: disabled
   Minimum balance: 1.0 SOL

🔒 Security Settings:
   Key encryption: enabled
   Backup: enabled
   Audit log: enabled
```

### 1.3 エラーハンドリング

#### 1.3.1 エラーメッセージ設計

**エラー分類と表示形式**:

**システムエラー**:
```
❌ System Error: Network connection failed
🔗 Details: Unable to connect to Solana RPC endpoint
💡 Solution: Check network connection and RPC endpoint configuration
📖 Help: tributary config show --section network
```

**ユーザーエラー**:
```
⚠️  Input Error: Invalid token address format
📍 Location: --token option
💡 Expected: Base58-encoded Solana token address (32-44 characters)
📝 Example: tributary collect --token "So11111111111111111111111111111111111111112"
```

**ビジネスエラー**:
```
💼 Business Error: Insufficient token balance
💰 Required: 10,000.00 USDC
💰 Available: 8,756.43 USDC
💡 Solution: Add more USDC to admin wallet or reduce distribution amount
```

#### 1.3.2 終了コード

**標準終了コード**:
- **0**: 正常終了
- **1**: 一般的なエラー
- **2**: コマンドライン引数エラー
- **3**: 設定エラー
- **4**: ネットワークエラー
- **5**: 認証・権限エラー
- **6**: データ整合性エラー
- **7**: リソース不足エラー
- **8**: タイムアウトエラー

## 2. 内部API インターフェース

### 2.1 Application Service インターフェース

#### 2.1.1 IWalletCollectorService

```typescript
interface IWalletCollectorService {
  // 基本収集機能
  collectHolders(params: CollectHoldersParams): Promise<WalletHolder[]>;

  // キャッシュ機能
  getCachedHolders(tokenAddress: string): Promise<WalletHolder[] | null>;
  setCachedHolders(tokenAddress: string, holders: WalletHolder[]): Promise<void>;
  clearCache(tokenAddress?: string): Promise<void>;

  // 検証機能
  validateHolders(holders: WalletHolder[]): Promise<ValidationResult>;

  // 統計機能
  getHolderStatistics(holders: WalletHolder[]): HolderStatistics;
}

interface CollectHoldersParams {
  tokenAddress: string;
  filter?: WalletFilter;
  useCache?: boolean;
  cacheOptions?: CacheOptions;
  progressCallback?: (progress: ProgressInfo) => void;
}

interface WalletFilter {
  minBalance?: number;
  maxBalance?: number;
  excludeAddresses?: string[];
  includeZeroBalance?: boolean;
}

interface ValidationResult {
  valid: WalletHolder[];
  invalid: InvalidHolder[];
  statistics: ValidationStatistics;
}
```

#### 2.1.2 IDistributionService

```typescript
interface IDistributionService {
  // 配布実行
  executeDistribution(params: DistributionParams): Promise<DistributionResult>;

  // シミュレーション
  simulateDistribution(params: DistributionParams): Promise<DistributionSimulation>;

  // 進捗監視
  getDistributionStatus(distributionId: string): Promise<DistributionStatus>;
  subscribeToProgress(distributionId: string, callback: ProgressCallback): UnsubscribeFunction;

  // 履歴管理
  getDistributionHistory(filter?: HistoryFilter): Promise<DistributionRecord[]>;
  getDistributionDetails(distributionId: string): Promise<DistributionDetail>;

  // 設定管理
  createDistributionConfig(config: CreateDistributionConfigParams): Promise<DistributionConfig>;
  updateDistributionConfig(id: string, updates: Partial<DistributionConfig>): Promise<DistributionConfig>;
  deleteDistributionConfig(id: string): Promise<void>;
}

interface DistributionParams {
  configId?: string;
  holders: WalletHolder[];
  totalAmount: number;
  tokenAddress: string;
  options?: DistributionOptions;
}

interface DistributionOptions {
  dryRun?: boolean;
  batchSize?: number;
  maxRetries?: number;
  retryDelay?: number;
  progressCallback?: ProgressCallback;
}
```

### 2.2 Service Layer インターフェース

#### 2.2.1 ITokenService

```typescript
interface ITokenService {
  // トークン情報
  getTokenInfo(tokenAddress: string): Promise<TokenInfo>;
  getTokenMetadata(tokenAddress: string): Promise<TokenMetadata>;

  // 残高操作
  getTokenBalance(walletAddress: string, tokenAddress: string): Promise<TokenBalance>;
  getTokenAccounts(tokenAddress: string): Promise<TokenAccount[]>;

  // トランザクション
  transferToken(params: TransferTokenParams): Promise<TransactionSignature>;
  transferTokenBatch(transfers: TransferTokenParams[]): Promise<BatchTransferResult>;

  // ネットワーク
  switchNetwork(network: SolanaNetwork): Promise<void>;
  getCurrentNetwork(): SolanaNetwork;
  getNetworkInfo(): Promise<NetworkInfo>;

  // 検証
  validateTokenAddress(tokenAddress: string): Promise<boolean>;
  validateWalletAddress(walletAddress: string): boolean;

  // ユーティリティ
  parseTokenAmount(amount: string, decimals: number): number;
  formatTokenAmount(amount: number, decimals: number): string;
}

interface TransferTokenParams {
  fromWallet: string;
  toWallet: string;
  tokenAddress: string;
  amount: number;
  options?: TransferOptions;
}

interface TransferOptions {
  createAssociatedTokenAccount?: boolean;
  computeUnitPrice?: number;
  maxRetries?: number;
  confirmationStrategy?: ConfirmationStrategy;
}
```

#### 2.2.2 ICacheService

```typescript
interface ICacheService {
  // 基本操作
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(pattern?: string): Promise<number>;

  // 一括操作
  getMultiple<T>(keys: string[]): Promise<Map<string, T>>;
  setMultiple<T>(entries: Map<string, T>, options?: CacheOptions): Promise<void>;
  deleteMultiple(keys: string[]): Promise<number>;

  // TTL操作
  expire(key: string, ttl: number): Promise<boolean>;
  getTTL(key: string): Promise<number>;

  // 統計・管理
  getStats(): Promise<CacheStats>;
  getKeys(pattern?: string): Promise<string[]>;
  getSize(): Promise<number>;

  // イベント
  onExpired(callback: (key: string) => void): UnsubscribeFunction;
  onEvicted(callback: (key: string, reason: EvictionReason) => void): UnsubscribeFunction;
}

interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compress?: boolean;
  priority?: CachePriority;
}

interface CacheStats {
  hitRate: number;
  missRate: number;
  size: number;
  memoryUsage: number;
  evictions: number;
}
```

### 2.3 Infrastructure Layer インターフェース

#### 2.3.1 IStorageRepository

```typescript
interface IStorageRepository {
  // プロジェクト設定
  saveProjectConfig(config: ProjectConfig): Promise<void>;
  loadProjectConfig(): Promise<ProjectConfig | null>;

  // ウォレットデータ
  saveWalletData(data: WalletData[]): Promise<void>;
  loadWalletData(): Promise<WalletData[]>;
  appendWalletData(data: WalletData[]): Promise<void>;

  // 配布設定
  saveDistributionConfig(config: DistributionConfig): Promise<void>;
  loadDistributionConfig(id: string): Promise<DistributionConfig | null>;
  loadAllDistributionConfigs(): Promise<DistributionConfig[]>;
  deleteDistributionConfig(id: string): Promise<boolean>;

  // 配布結果
  saveDistributionResult(result: DistributionResult): Promise<void>;
  loadDistributionResult(id: string): Promise<DistributionResult | null>;
  loadDistributionResults(filter?: ResultFilter): Promise<DistributionResult[]>;

  // キャッシュ
  saveCacheData<T>(key: string, data: T, options?: CacheStorageOptions): Promise<void>;
  loadCacheData<T>(key: string): Promise<CacheEntry<T> | null>;
  deleteCacheData(key: string): Promise<boolean>;
  cleanupExpiredCache(): Promise<number>;

  // バックアップ・復旧
  createBackup(name?: string): Promise<BackupInfo>;
  restoreFromBackup(backupId: string): Promise<void>;
  listBackups(): Promise<BackupInfo[]>;
  deleteBackup(backupId: string): Promise<boolean>;
}

interface ResultFilter {
  fromDate?: Date;
  toDate?: Date;
  status?: DistributionStatus[];
  configId?: string;
  limit?: number;
  offset?: number;
}

interface BackupInfo {
  id: string;
  name: string;
  createdAt: Date;
  size: number;
  checksum: string;
  metadata: BackupMetadata;
}
```

## 3. 外部システム連携インターフェース

### 3.1 Solana RPC インターフェース

#### 3.1.1 RPC メソッド抽象化

**アカウント情報取得**:
```typescript
interface ISolanaRpcClient {
  // アカウント操作
  getAccountInfo(address: string, options?: GetAccountOptions): Promise<AccountInfo>;
  getMultipleAccounts(addresses: string[], options?: GetAccountOptions): Promise<AccountInfo[]>;
  getProgramAccounts(programId: string, filters?: ProgramAccountFilter[]): Promise<ProgramAccount[]>;

  // トークン操作
  getTokenAccountsByOwner(owner: string, filter: TokenAccountFilter): Promise<TokenAccount[]>;
  getTokenSupply(tokenAddress: string): Promise<TokenSupply>;
  getTokenAccountBalance(accountAddress: string): Promise<TokenAccountBalance>;

  // トランザクション
  sendTransaction(transaction: Transaction, options?: SendOptions): Promise<TransactionSignature>;
  confirmTransaction(signature: string, options?: ConfirmOptions): Promise<TransactionStatus>;
  getTransaction(signature: string, options?: GetTransactionOptions): Promise<TransactionDetail>;

  // ブロック情報
  getSlot(): Promise<number>;
  getBlockHeight(): Promise<number>;
  getRecentBlockhash(): Promise<BlockhashInfo>;

  // ネットワーク情報
  getVersion(): Promise<VersionInfo>;
  getHealth(): Promise<HealthStatus>;
  getPerformanceSamples(limit?: number): Promise<PerformanceSample[]>;
}

interface GetAccountOptions {
  commitment?: Commitment;
  encoding?: AccountEncoding;
  dataSlice?: DataSlice;
}

interface SendOptions {
  skipPreflight?: boolean;
  preflightCommitment?: Commitment;
  maxRetries?: number;
}
```

#### 3.1.2 エラーハンドリング

**RPC エラー分類**:
```typescript
enum RpcErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INVALID_PARAMS = 'INVALID_PARAMS',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  BLOCKHASH_EXPIRED = 'BLOCKHASH_EXPIRED'
}

interface RpcError extends Error {
  type: RpcErrorType;
  code?: number;
  data?: any;
  retryable: boolean;
}

interface RetryPolicy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: RpcErrorType[];
}
```

### 3.2 外部 API 連携（将来拡張）

#### 3.2.1 価格取得API

```typescript
interface IPriceOracle {
  // 価格情報
  getTokenPrice(tokenAddress: string, currency?: string): Promise<TokenPrice>;
  getMultipleTokenPrices(tokenAddresses: string[], currency?: string): Promise<Map<string, TokenPrice>>;

  // 履歴データ
  getPriceHistory(tokenAddress: string, period: TimePeriod): Promise<PriceHistory>;

  // 統計情報
  getMarketData(tokenAddress: string): Promise<MarketData>;
}

interface TokenPrice {
  tokenAddress: string;
  price: number;
  currency: string;
  timestamp: Date;
  source: string;
  confidence: number;
}

interface MarketData {
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
}
```

#### 3.2.2 通知システム

```typescript
interface INotificationService {
  // 通知送信
  sendNotification(notification: Notification): Promise<NotificationResult>;
  sendBulkNotifications(notifications: Notification[]): Promise<BulkNotificationResult>;

  // テンプレート
  createTemplate(template: NotificationTemplate): Promise<string>;
  updateTemplate(id: string, template: Partial<NotificationTemplate>): Promise<void>;
  deleteTemplate(id: string): Promise<boolean>;

  // 設定管理
  updateNotificationSettings(settings: NotificationSettings): Promise<void>;
  getNotificationSettings(): Promise<NotificationSettings>;
}

interface Notification {
  type: NotificationType;
  recipient: string;
  subject?: string;
  message: string;
  templateId?: string;
  variables?: Record<string, any>;
  priority?: NotificationPriority;
  scheduleAt?: Date;
}

enum NotificationType {
  EMAIL = 'EMAIL',
  WEBHOOK = 'WEBHOOK',
  SLACK = 'SLACK',
  DISCORD = 'DISCORD'
}
```

## 4. 設定ファイル仕様

### 4.1 メイン設定ファイル（tributary.toml）

#### 4.1.1 ファイル構造

```toml
# Tributary Configuration File
# Generated on 2025-09-18 10:30:15 UTC

[project]
name = "MyProject"
version = "1.0.0"
created_at = "2025-09-18T10:30:15.123Z"
updated_at = "2025-09-18T10:30:15.123Z"

[blockchain]
network = "mainnet-beta"  # devnet, testnet, mainnet-beta
rpc_url = "https://api.mainnet-beta.solana.com"
commitment = "confirmed"  # processed, confirmed, finalized
timeout = 30000  # milliseconds

[tokens]
base_token = "So11111111111111111111111111111111111111112"  # SOL
admin_wallet = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"

[distribution]
default_reward_token = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"  # USDC
schedule = "weekly"  # daily, weekly, monthly, custom
minimum_balance = 1.0
auto_distribute = false
batch_size = 10

[cache]
enabled = true
ttl = 300  # seconds
max_size = 1000  # entries
compression = true

[logging]
level = "info"  # error, warn, info, debug, trace
file_enabled = true
console_enabled = true
max_file_size = "10MB"
max_files = 7

[security]
encrypt_keys = true
backup_enabled = true
audit_log = true
key_derivation_iterations = 100000

[performance]
concurrent_requests = 10
request_timeout = 30000
retry_attempts = 3
retry_delay = 1000

[notifications]
enabled = false

[notifications.email]
enabled = false
smtp_host = ""
smtp_port = 587
username = ""
password = ""
from_address = ""
to_addresses = []

[notifications.webhook]
enabled = false
url = ""
secret = ""
timeout = 10000

[notifications.slack]
enabled = false
webhook_url = ""
channel = "#rewards"
username = "Tributary Bot"
```

#### 4.1.2 設定検証ルール

**必須項目検証**:
- `project.name`: 1-100文字、英数字・ハイフン・アンダースコア
- `tokens.base_token`: 有効なSolana Base58アドレス
- `tokens.admin_wallet`: 有効なSolana Base58アドレス
- `blockchain.network`: "devnet", "testnet", "mainnet-beta" のいずれか

**値範囲検証**:
- `distribution.minimum_balance`: 0以上の数値
- `distribution.batch_size`: 1-100の整数
- `cache.ttl`: 0以上の整数（0は無制限）
- `performance.concurrent_requests`: 1-100の整数
- `logging.level`: 有効なログレベル

**依存関係検証**:
- `notifications.enabled = true` の場合、少なくとも1つの通知方法が有効
- `security.encrypt_keys = true` の場合、`security.key_derivation_iterations`が設定済み
- `cache.enabled = true` の場合、`cache.ttl`と`cache.max_size`が設定済み

### 4.2 ウォレット設定ファイル（wallets.json）

#### 4.2.1 ファイル形式

```json
{
  "metadata": {
    "version": "1.0.0",
    "created_at": "2025-09-18T10:30:15.123Z",
    "updated_at": "2025-09-18T10:45:23.456Z",
    "token_address": "So11111111111111111111111111111111111111112",
    "total_holders": 1234,
    "total_supply": "1000000000000000000",
    "collection_method": "rpc_scan",
    "collection_duration": 154000,
    "filters_applied": {
      "minimum_balance": 1.0,
      "excluded_addresses": []
    }
  },
  "wallets": [
    {
      "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "balance": "123456789000000000",
      "balance_formatted": "123.456789",
      "percentage": 12.3456789,
      "rank": 1,
      "last_updated": "2025-09-18T10:45:23.456Z",
      "is_valid": true,
      "tags": ["whale", "early_adopter"]
    }
  ],
  "statistics": {
    "distribution": {
      "top_1_percent": {
        "count": 12,
        "total_balance": "500000000000000000",
        "percentage": 50.0
      },
      "top_10_percent": {
        "count": 123,
        "total_balance": "800000000000000000",
        "percentage": 80.0
      }
    },
    "balance_ranges": {
      "whale": {"min": "100000000000000000", "count": 45},
      "large": {"min": "10000000000000000", "count": 234},
      "medium": {"min": "1000000000000000", "count": 567},
      "small": {"min": "0", "count": 388}
    }
  }
}
```

### 4.3 配布結果ファイル（result_*.json）

#### 4.3.1 ファイル形式

```json
{
  "metadata": {
    "id": "dist_1695901815123_abc123",
    "version": "1.0.0",
    "created_at": "2025-09-18T10:30:15.123Z",
    "completed_at": "2025-09-18T10:35:42.789Z",
    "duration": 327666,
    "network": "mainnet-beta"
  },
  "configuration": {
    "config_id": "config_1695901800000_def456",
    "total_amount": "10000000000",
    "total_amount_formatted": "10000.0",
    "token_address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "token_symbol": "USDC",
    "token_decimals": 6,
    "recipient_count": 1234,
    "batch_size": 10,
    "dry_run": false
  },
  "summary": {
    "status": "completed",
    "total_transactions": 1234,
    "successful_transactions": 1198,
    "failed_transactions": 36,
    "success_rate": 97.08,
    "total_gas_used": "2468000",
    "total_gas_cost": "0.002468",
    "average_tx_time": 3542
  },
  "transactions": [
    {
      "id": "tx_001",
      "recipient": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "amount": "8100000",
      "amount_formatted": "8.1",
      "signature": "3xKzF9d8WqY2N1xzybapC8G4wEGGkZwyTDt1v...",
      "status": "confirmed",
      "block_height": 187654321,
      "slot": 187654321,
      "timestamp": "2025-09-18T10:31:45.234Z",
      "gas_used": "2000",
      "batch_id": "batch_001",
      "retry_count": 0
    }
  ],
  "errors": [
    {
      "transaction_id": "tx_045",
      "recipient": "InvalidAddress123...",
      "amount": "5400000",
      "error_type": "INVALID_RECIPIENT",
      "error_message": "Invalid recipient address format",
      "timestamp": "2025-09-18T10:32:15.123Z",
      "retry_count": 3,
      "final_failure": true
    }
  ],
  "statistics": {
    "distribution_analysis": {
      "median_amount": "6.75",
      "mean_amount": "8.12",
      "min_amount": "0.01",
      "max_amount": "245.67"
    },
    "performance_metrics": {
      "transactions_per_second": 3.77,
      "average_confirmation_time": 3542,
      "network_congestion_level": "low"
    }
  }
}
```

### 4.4 環境変数設定

#### 4.4.1 環境変数一覧

```bash
# ネットワーク設定
TRIBUTARY_NETWORK=mainnet-beta
TRIBUTARY_RPC_URL=https://api.mainnet-beta.solana.com
TRIBUTARY_COMMITMENT=confirmed

# 認証情報
TRIBUTARY_ADMIN_PRIVATE_KEY=base58_encoded_private_key
TRIBUTARY_WALLET_PASSWORD=encryption_password

# パフォーマンス設定
TRIBUTARY_BATCH_SIZE=10
TRIBUTARY_CONCURRENT_REQUESTS=10
TRIBUTARY_REQUEST_TIMEOUT=30000

# ログ設定
TRIBUTARY_LOG_LEVEL=info
TRIBUTARY_LOG_FILE=logs/tributary.log

# キャッシュ設定
TRIBUTARY_CACHE_ENABLED=true
TRIBUTARY_CACHE_TTL=300
TRIBUTARY_CACHE_DIR=./cache

# 通知設定
TRIBUTARY_NOTIFICATION_WEBHOOK_URL=https://hooks.slack.com/...
TRIBUTARY_NOTIFICATION_EMAIL_SMTP_PASSWORD=smtp_password

# セキュリティ設定
TRIBUTARY_ENCRYPT_KEYS=true
TRIBUTARY_BACKUP_ENABLED=true
TRIBUTARY_AUDIT_LOG=true

# デバッグ設定
TRIBUTARY_DEBUG=false
TRIBUTARY_VERBOSE=false
TRIBUTARY_DRY_RUN=false
```

#### 4.4.2 環境別設定管理

**開発環境（.env.development）**:
```bash
TRIBUTARY_NETWORK=devnet
TRIBUTARY_LOG_LEVEL=debug
TRIBUTARY_CACHE_TTL=60
TRIBUTARY_DRY_RUN=true
```

**テスト環境（.env.test）**:
```bash
TRIBUTARY_NETWORK=testnet
TRIBUTARY_LOG_LEVEL=info
TRIBUTARY_CACHE_ENABLED=false
TRIBUTARY_ENCRYPT_KEYS=false
```

**本番環境（.env.production）**:
```bash
TRIBUTARY_NETWORK=mainnet-beta
TRIBUTARY_LOG_LEVEL=warn
TRIBUTARY_ENCRYPT_KEYS=true
TRIBUTARY_BACKUP_ENABLED=true
TRIBUTARY_AUDIT_LOG=true
```