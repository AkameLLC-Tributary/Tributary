# パラメータ管理システム詳細設計書
# Tributary - Solana報酬配布システム

## 概要

本文書は、Tributary CLIにおけるパラメータ管理システムの詳細設計を定義する。従来のハードコーディングされた値を排除し、柔軟で階層化された設定システムを実装することで、多様な環境とユーザニーズに対応する。

## 1. 設計目標

### 1.1 主要目標
- **環境適応性**: 開発、ステージング、本番環境での柔軟な運用
- **ユーザ制御**: ユーザの明示的な意図を最優先する安全な設計
- **運用効率**: 設定変更の容易さと管理の簡素化
- **後方互換性**: 既存の動作を破壊しない段階的移行

### 1.2 課題解決
- **従来問題**: Zodスキーマでハードコーディングされたデフォルト値の固定性
- **優先順位不明**: ユーザ入力、環境変数、設定ファイルの優先順位の曖昧さ
- **設定困難**: 環境固有の設定変更の複雑さ

## 2. パラメータ優先順位アーキテクチャ

### 2.1 優先順位定義

```
1. CLI引数 (最高優先度) ←─ ユーザの明示的意図
2. 環境変数           ←─ 環境固有設定
3. 設定ファイル       ←─ プロジェクト固有設定
4. デフォルト値 (最低優先度) ←─ システム標準値
```

### 2.2 優先順位設計根拠

#### CLI引数が最優先である理由
1. **明示的ユーザ意図**: ユーザが実行時に明示的に指定した値
2. **即座の制御**: 緊急時や一時的な設定変更での安全性確保
3. **テスト容易性**: 自動テストでの確実な値制御
4. **デバッグ支援**: 問題調査時の一時的設定変更

```bash
# 例: ユーザが明示的にバッチサイズを1に設定
tributary distribute --batch-size 1
# → この1は絶対に他の値で上書きされない
```

#### 環境変数が第2優先である理由
1. **環境分離**: 開発/ステージング/本番での自動的な設定切り替え
2. **セキュリティ**: 機密情報（RPC URL等）の安全な管理
3. **運用効率**: CI/CDパイプラインでの動的設定変更
4. **コンテナ対応**: Dockerやクラウド環境での標準的な設定方法

```bash
# 例: 本番環境での環境変数設定
export TRIBUTARY_DEFAULT_NETWORK=mainnet-beta
export TRIBUTARY_MAINNET_RPC=https://premium-rpc.example.com
```

#### 設定ファイルが第3優先である理由
1. **プロジェクト固有性**: プロジェクトごとの標準設定の定義
2. **バージョン管理**: Gitでの設定履歴管理
3. **チーム共有**: 開発チーム間での設定共有
4. **複雑設定**: 複数パラメータの構造化された管理

```json
{
  "distribution": {"defaultBatchSize": 20},
  "network": {"timeout": 45000},
  "rpc": {"endpoints": {"mainnet-beta": "https://team-rpc.example.com"}}
}
```

#### デフォルト値が最低優先である理由
1. **フォールバック**: 他の設定が存在しない場合の安全な動作保証
2. **初期体験**: 新規ユーザの学習コストを最小化
3. **安定性**: システムの基本動作の一貫性確保

## 3. システム構成

### 3.1 アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────┐
│                    CLI Interface Layer                      │
├─────────────────────────────────────────────────────────────┤
│                Parameter Resolution Layer                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────│
│  │ CLI Args    │ │ Env Vars    │ │ Config File │ │ Defaults││
│  │ (Priority 1)│ │ (Priority 2)│ │ (Priority 3)│ │(Priority││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────│
├─────────────────────────────────────────────────────────────┤
│              Parameter Validation Layer                     │
├─────────────────────────────────────────────────────────────┤
│               Application Components                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ConfigManager│ │SolanaRpcCli │ │Distribution │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 コンポーネント設計

#### TributaryParameters インターフェース
```typescript
interface TributaryParameters {
  network: NetworkConfig;      // ネットワーク設定
  rpc: RpcConfig;             // RPC エンドポイント
  distribution: DistributionConfig; // 配布設定
  token: TokenConfig;         // トークン設定
  cache: CacheConfig;         // キャッシュ設定
  logging: LoggingConfig;     // ログ設定
  security: SecurityConfig;   // セキュリティ設定
  export: ExportConfig;       // エクスポート設定
  validation: ValidationConfig; // 検証設定
}
```

#### パラメータ解決フロー
```typescript
function loadParameters(): TributaryParameters {
  // 1. デフォルト値から開始
  let params = { ...DEFAULT_PARAMETERS };

  // 2. 設定ファイルでオーバーライド
  params = deepMerge(params, loadConfigFile());

  // 3. 環境変数でオーバーライド
  params = applyEnvironmentVariables(params);

  // 4. CLI引数は個別に処理される（最高優先度）
  return params;
}
```

## 4. 実装詳細

### 4.1 ConfigManager の変更

#### 従来の問題
```typescript
// 問題のあった実装 - Zodのdefaultが常に適用
batch_size: z.number().default(10)
```

#### 修正後の実装
```typescript
// 修正後 - ユーザ入力を尊重
batch_size: z.number().optional()

function applyParameterDefaults(rawConfig: any): ConfigData {
  const params = getParameters();
  return {
    distribution: {
      // ユーザ入力がある場合はそれを使用、ない場合のみデフォルト
      batch_size: rawConfig.distribution?.batch_size ?? params.distribution.defaultBatchSize
    }
  };
}
```

### 4.2 CLI引数処理の強化

```typescript
// ユーザの明示的入力を最優先
const overrides: any = {};

// バッチサイズのオーバーライド
if (options.batchSize !== undefined) {
  overrides.distribution = { batch_size: options.batchSize };
}

const config = await this.configManager.initializeProject({
  name: options.name,           // USER INPUT - 最高優先度
  baseToken: options.token,     // USER INPUT - 最高優先度
  adminWallet: options.admin,   // USER INPUT - 最高優先度
  network: network,             // USER INPUT - 最高優先度
  overrides: overrides          // USER INPUT - 最高優先度
});
```

### 4.3 新しいCLI引数

```bash
tributary init \
  --name MyProject \
  --token So11111111111111111111111111111111111111112 \
  --admin 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU \
  --batch-size 25 \           # ユーザの明示的指定
  --network-timeout 45000 \   # ネットワーク設定のオーバーライド
  --max-retries 5 \           # リトライ設定のオーバーライド
  --log-level debug \         # ログレベルのオーバーライド
  --disable-encryption \      # セキュリティ設定のオーバーライド
  --mainnet-rpc https://my-rpc.com  # カスタムRPC
```

## 5. セキュリティ考慮事項

### 5.1 ユーザ安全性の確保

#### 基本原則
- **ユーザの明示的入力は絶対に無視されない**
- **予期しない値の実行を防止**
- **設定変更の透明性確保**

#### 実装例
```typescript
// 危険: ユーザ指定を無視する可能性
const batchSize = config.batch_size || defaultBatchSize;

// 安全: ユーザ指定を最優先
const batchSize = userSpecified ?? config.batch_size ?? defaultBatchSize;
```

### 5.2 機密情報の管理

#### 環境変数での管理
```bash
# 機密情報は環境変数で管理
export TRIBUTARY_MAINNET_RPC="https://premium-rpc-with-auth-token.com"
export TRIBUTARY_ADMIN_PRIVATE_KEY_PATH="/secure/path/admin.key"
```

#### 設定ファイルの除外
```gitignore
# Git管理から除外
tributary-parameters.local.json
*.key
*.env.local
```

## 6. テスト戦略

### 6.1 優先順位テストシナリオ

#### テスト1: CLI引数の最優先性
```bash
# 環境変数とファイルで異なる値を設定
export TRIBUTARY_BATCH_SIZE=20
echo '{"distribution": {"defaultBatchSize": 30}}' > config.json

# CLI引数が勝つことを確認
tributary init --batch-size 15 # → 結果: 15
```

#### テスト2: 環境変数がファイルに優先
```bash
unset CLI_args
export TRIBUTARY_BATCH_SIZE=25  # → 結果: 25
# config.json still has 30
```

#### テスト3: ファイルがデフォルトに優先
```bash
unset TRIBUTARY_BATCH_SIZE
# config.json has 30, default is 10  # → 結果: 30
```

#### テスト4: デフォルト値の使用
```bash
rm config.json
# no env vars, no file, default is 10  # → 結果: 10
```

### 6.2 安全性テスト

#### ユーザ意図の尊重テスト
```bash
# ユーザが明示的に小さな値を指定
tributary init --batch-size 1 --name SafetyTest

# 必ず1が使用されることを確認
grep "batch_size.*1" tributary.toml || echo "❌ FAILED"
```

## 7. 運用ガイドライン

### 7.1 環境別設定例

#### 開発環境
```json
{
  "network": {"defaultNetwork": "devnet", "timeout": 15000},
  "distribution": {"defaultBatchSize": 50},
  "logging": {"defaultLevel": "debug", "enableConsole": true}
}
```

#### 本番環境
```bash
export TRIBUTARY_DEFAULT_NETWORK=mainnet-beta
export TRIBUTARY_MAINNET_RPC=https://premium-rpc.com
export TRIBUTARY_LOG_LEVEL=warn
export TRIBUTARY_BATCH_SIZE=5
```

### 7.2 移行戦略

#### フェーズ1: 段階的移行
1. 新しいパラメータシステムの導入
2. 既存のハードコード値をデフォルト値として保持
3. 段階的に設定ファイルでの管理に移行

#### フェーズ2: 完全移行
1. 全ハードコード値の除去
2. 包括的なテストの実施
3. ドキュメントの更新

## 8. パフォーマンス考慮事項

### 8.1 設定読み込みの最適化

```typescript
// パラメータキャッシュ機能
let currentParameters: TributaryParameters | null = null;

export function getParameters(): TributaryParameters {
  if (!currentParameters) {
    currentParameters = loadParameters();
  }
  return currentParameters;
}
```

### 8.2 検証コストの最小化

```typescript
// 設定検証の最適化
function validateParameters(params: TributaryParameters): ValidationResult {
  // 必要最小限の検証のみ実行
  // 重い検証は実際の使用時に延期
}
```

## 9. 今後の拡張

### 9.1 動的設定変更
- 実行時の設定変更API
- ホットリロード機能
- 設定変更の監査ログ

### 9.2 高度な設定管理
- 設定の暗号化
- 設定の署名検証
- 設定の時限有効化

## 10. 結論

本パラメータ管理システムにより、Tributary CLIは以下を実現する：

1. **ユーザ中心設計**: ユーザの明示的意図を最優先する安全な動作
2. **環境適応性**: 開発から本番まで一貫した設定管理
3. **運用効率**: 簡素で直感的な設定方法
4. **拡張性**: 将来の機能追加に対応する柔軟な基盤

この設計により、ユーザが意図しない値で実行される危険性を完全に排除し、多様な環境での安全で効率的な運用を実現する。

---

**関連文書**:
- `Ja_Detailed_Design_Components.md` - コンポーネント詳細設計
- `Ja_Detailed_Design_Security.md` - セキュリティ設計
- `Ja_Command_Reference.md` - コマンドリファレンス