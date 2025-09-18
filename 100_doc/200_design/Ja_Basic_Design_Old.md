# 基本設計書
# Tributary - Solana報酬配布システム

**更新日**: 2025-09-18
**更新者**: akameGusya

## 概要
TributaryシステムのTypeScript/Node.js実装における基本設計思想と設計判断の根拠を定義します。アーキテクチャの設計意図、コンポーネント間の関係性、システム全体の設計原則を記述し、実装時の指針となる設計哲学を提供します。

## 設計文書の方針
本文書は具体的なコード実装ではなく、設計の意図、根拠、考慮事項に焦点を当てています。実装詳細は別途コードベースで管理し、本文書では「なぜその設計にしたのか」「どのような考慮事項があるのか」を中心に記述します。

## 1. アーキテクチャ設計

### 1.1 システム全体構成

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   CLI Commands  │  │   Web Dashboard │  │   REST API      │ │
│  │                 │  │   (Future)      │  │   (Future)      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Wallet Collector│  │ Distribution    │  │ Report          │ │
│  │                 │  │ Engine          │  │ Generator       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Token Service   │  │ Config Manager  │  │ Logger Service  │ │
│  │                 │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Solana RPC      │  │ File System     │  │ External APIs   │ │
│  │ - @solana/web3  │  │ - Config Files  │  │ - CoinGecko     │ │
│  │ - @solana/spl   │  │ - Log Files     │  │ - Jupiter       │ │
│  │ - Metaplex      │  │ - Cache Files   │  │ - Webhooks      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 レイヤー構成

#### **Presentation Layer (表示層)**
- **CLI Commands**: ユーザーからのコマンド入力を受け付け
- **Web Dashboard**: 将来的なWeb UI（Phase 3で実装予定）
- **REST API**: 外部システム連携用API（Phase 3で実装予定）

#### **Application Layer (アプリケーション層)**
- **Wallet Collector**: トークン保有者のウォレットアドレス収集
- **Distribution Engine**: 配布ロジックの実行と管理
- **Report Generator**: 実行結果のレポート生成

#### **Service Layer (サービス層)**
- **Token Service**: Solanaトークン操作の抽象化
- **Config Manager**: 設定ファイルの管理と検証
- **Logger Service**: ログ出力とローテーション管理

#### **Infrastructure Layer (インフラ層)**
- **Solana RPC**: ブロックチェーンとの通信
- **File System**: ローカルファイルアクセス
- **External APIs**: 外部サービス連携

### 1.3 依存関係

#### **依存関係の原則**
1. **上位層 → 下位層**: 上位層は下位層に依存可能
2. **同層内**: 同層内での依存は最小限に抑制
3. **逆向き依存禁止**: 下位層は上位層に依存しない
4. **インターフェース分離**: 具象クラスではなくインターフェースに依存

#### **依存関係の設計戦略**

**Application Layer の依存関係**:
- **WalletCollector**: トークン操作サービスに依存し、ブロックチェーンからのデータ取得ロジックを抽象化
- **DistributionEngine**: トークン操作と設定管理の両方に依存し、配布処理の複合的な機能を実現
- **ReportGenerator**: ログサービスに依存し、実行結果の記録と出力を一元管理

**Service Layer の依存関係**:
- **TokenService**: Solana RPC への依存を集約し、ブロックチェーン固有の処理を隠蔽
- **ConfigManager**: ファイルシステムへの依存を管理し、設定の永続化と検証を担当
- **LoggerService**: ファイルシステムへの依存を制御し、監査要件に対応するログ管理を実現

**設計根拠**: 各コンポーネントが必要最小限の依存関係のみを持つことで、単体テストの容易性と保守性を確保。特に外部システムへの依存は下位層に集約し、変更の影響範囲を限定。

#### **依存性注入パターンの採用理由**

**コンストラクタインジェクション方式**:
- 必要な依存関係をコンストラクタで明示的に受け取る設計
- 実行時ではなくオブジェクト作成時に依存関係を確定
- テスト時のモック注入が容易で、単体テストの独立性を確保

**サービスコンテナの設計**:
- 全サービスインスタンスの生成と管理を一元化
- アプリケーション起動時に依存関係を解決
- 循環依存の検出と防止機能を提供

**設計効果**: この設計により、新しいサービスの追加や既存サービスの入れ替えが既存コードに影響を与えることなく実現可能。また、各層の責務が明確に分離され、開発チーム内での作業分担が効率化される。

### 1.4 デプロイメントアーキテクチャ

#### **CLI実行環境**
```
┌─────────────────────────────────────────────────────────────┐
│                      Local Environment                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  Tributary CLI                          │ │
│  │  ┌─────────────────┐  ┌─────────────────┐               │ │
│  │  │   Node.js       │  │   Binary        │               │ │
│  │  │   Runtime       │  │   (pkg)         │               │ │
│  │  └─────────────────┘  └─────────────────┘               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  Local Files:                                               │
│  - ~/.tributary/config.toml                                 │
│  - ~/.tributary/logs/                                       │
│  - ~/.tributary/cache/                                      │
└─────────────────────────────────────────────────────────────┘
                               │
                           Network
                               │
┌─────────────────────────────────────────────────────────────┐
│                    External Services                        │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐   │
│  │ Solana RPC    │  │ CoinGecko API │  │ Jupiter API     │   │
│  │ - Mainnet     │  │ - Price Data  │  │ - Price Oracle  │   │
│  │ - Testnet     │  │               │  │                 │   │
│  │ - Devnet      │  │               │  │                 │   │
│  └───────────────┘  └───────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### **サーバー配置パターン**
```
┌─────────────────────────────────────────────────────────────┐
│                       Server Environment                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   Docker Container                      │ │
│  │  ┌─────────────────┐  ┌─────────────────┐               │ │
│  │  │ Tributary API   │  │ Scheduled Tasks │               │ │
│  │  │ - REST API      │  │ - Cron Jobs     │               │ │
│  │  │ - Health Check  │  │ - Auto Dist.    │               │ │
│  │  └─────────────────┘  └─────────────────┘               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  Persistent Volumes:                                        │
│  - /app/config/                                             │
│  - /app/logs/                                               │
│  - /app/data/                                               │
└─────────────────────────────────────────────────────────────┘
```

#### **配布戦略と設計考慮事項**

**1. npm パッケージ配布**
- **対象ユーザー**: Node.js開発環境を持つ開発者
- **設計意図**: 既存のNode.jsエコシステムとの親和性を活用
- **利点**: 依存関係の自動解決、バージョン管理の簡素化

**2. バイナリ配布**
- **対象ユーザー**: Node.js環境を持たない一般ユーザー
- **設計意図**: プラットフォーム固有の最適化と実行環境の独立性
- **利点**: ランタイム依存なし、インストール手順の簡素化

**3. Docker実行**
- **対象ユーザー**: DevOps環境およびCI/CD パイプライン
- **設計意図**: 環境の標準化と再現性の確保
- **利点**: 環境差異の排除、スケーラブルな実行基盤

**4. ソースコード実行**
- **対象ユーザー**: 開発者およびカスタマイズが必要なユーザー
- **設計意図**: 透明性の確保と機能拡張の容易性
- **利点**: 完全なカスタマイズ性、セキュリティ監査の実施可能性

## 2. コンポーネント設計

### 2.1 Wallet Collector

#### 2.1.1 設計目的と責務
**コンポーネントの目的**:
特定のトークンを保有するウォレットアドレスを効率的に収集し、配布対象者のリストを作成する。大量のオンチェーンデータから必要な情報のみを抽出し、後続の配布処理で利用可能な形式で提供する。

**主要な責務**:
- **ウォレット発見**: Solanaブロックチェーン上で指定トークンの保有者を包括的に検索
- **データフィルタリング**: 保有量の閾値や除外条件に基づく対象者の絞り込み
- **情報正規化**: 収集した生データを統一的なフォーマットで構造化
- **パフォーマンス最適化**: キャッシュ機能による重複リクエストの削減

#### 2.1.2 インターフェース設計思想
**API設計の基本方針**:
- **単一責任**: 各メソッドは特定の機能のみを担当し、複合的な処理は上位層で組み合わせ
- **非同期処理**: ブロックチェーンアクセスの特性を考慮した Promise ベースの設計
- **拡張性**: 将来的な機能追加（複数トークン同時収集等）に対応可能な柔軟な引数設計

**核心となる操作**:
- **collectHolders**: メイン機能として、包括的なパラメータセットを受け取り完全なホルダー情報を返却
- **キャッシュ管理**: 高頻度での同一トークン検索に対応するため、独立したキャッシュ操作を提供
- **ウォレット検証**: 収集したアドレスの有効性確認により、配布エラーを事前に防止

**データ構造の設計意図**:
- **CollectHoldersParams**: 検索条件の組み合わせを柔軟に指定可能とし、デフォルト値により簡単な使用も可能
- **WalletHolder**: 配布計算に必要な全情報を含み、かつ監査要件を満たす追跡可能性を確保

#### 2.1.3 実装アルゴリズムとロジック

**メイン処理フロー**:
1. **キャッシュ優先戦略**: 初回にキャッシュの存在確認を行い、有効なデータがあれば即座に返却。これによりブロックチェーンへの重複アクセスを削減し、応答時間を大幅に短縮。

2. **段階的データ取得**: オンチェーンデータの取得は複数段階に分割して実行
   - トークンアカウント一覧の取得
   - 各アカウントの残高情報取得
   - アカウント所有者情報の取得

3. **リアルタイム計算**: 全データ取得後に保有割合を計算し、配布比率決定のための正規化データを生成

4. **フィルタリング戦略**: 取得したデータに対して条件ベースのフィルタリングを適用し、配布対象として適切でないウォレットを除外

**パフォーマンス最適化の設計思想**:
- **バッチ処理**: 大量のアカウント情報取得をバッチ単位で実行し、RPCエンドポイントへの負荷を分散
- **並行処理**: 独立した残高確認処理を並行実行することで、総実行時間を短縮
- **段階的フィルタリング**: 早期にフィルタリング条件を適用し、不要なデータ処理を削減

**エラーハンドリングの方針**:
- **部分失敗対応**: 一部のウォレット情報取得に失敗しても、処理を継続し、取得可能なデータで配布を実行
- **リトライ機構**: ネットワークエラーや一時的なRPC障害に対する自動リトライ
- **詳細ログ**: 各処理段階での詳細なログ出力により、問題の特定と分析を支援

### 2.2 Distribution Engine

#### 2.2.1 設計目的と責務
**コンポーネントの目的**:
収集されたウォレット情報を基に、公平で正確なトークン配布を実行する。複雑な配布ロジック、トランザクション管理、エラー処理を統合し、大規模配布においても確実性とトレーサビリティを確保する。

**主要な責務**:
- **配布計算エンジン**: 保有量比率に基づく正確な配布量計算と検証
- **トランザクション管理**: バッチ処理によるスケーラブルなトランザクション実行
- **状態管理**: 配布プロセス全体の進捗と結果の追跡
- **障害回復**: 部分失敗時の状態復旧と継続実行メカニズム

#### 2.2.2 インターフェース設計思想
**API設計の核心戦略**:
- **操作の透明性**: 全ての配布操作で詳細な実行結果と統計情報を提供
- **段階的実行**: シミュレーション機能により事前検証を可能とし、実行前のリスク評価を支援
- **監査対応**: 全ての配布履歴を記録し、後続の監査要件に対応

**核心となる操作設計**:
- **executeDistribution**: 実際の配布実行で、包括的な結果レポートを提供
- **simulateDistribution**: リスクフリーなシミュレーション実行により、実行前の検証を実現
- **getDistributionStatus**: リアルタイムな進捗監視機能で、長時間実行における可視性を確保
- **getDistributionHistory**: 過去の実行履歴管理により、パターン分析と改善点特定を支援

**データ構造の設計根拠**:
- **DistributionParams**: 柔軟なパラメータ設定により、様々な配布シナリオに対応
- **DistributionResult**: 実行結果の包括的な記録により、監査要件と分析ニーズの両方を満たす
- **TransactionResult**: 個別トランザクションレベルでの詳細情報により、問題特定と対応を効率化

#### 2.2.3 実装アルゴリズムとロジック

**メイン配布処理フロー**:
1. **事前計算フェーズ**: 受信者の保有量データから公正な配布量を精密計算。丸め誤差を最小化し、総額の整合性を保証。

2. **検証フェーズ**: ドライラン機能により、実際の資金移動前に全計算ロジックを検証。ガス費用見積もりと潜在的な失敗ケースの特定を実行。

3. **実行フェーズ**: 計算済み配布情報を基にバッチ単位でトランザクションを実行。並行処理により全体の実行時間を最適化。

4. **結果記録フェーズ**: 実行結果の詳細な記録と永続化により、監査証跡と将来の分析基盤を提供。

**配布量計算アルゴリズム**:
- **比例配分原理**: 各受信者の基準トークン保有量に正比例した配布量を算出
- **精度保証**: 浮動小数点演算の精度問題を回避するため、整数演算を基本とした計算ロジック
- **総額保証**: 個別配布量の合計が指定総額を超過しないことを数学的に保証
- **公平性確保**: 最小配布単位の設定により、マイクロ配布による不公平を防止

**バッチ処理戦略**:
- **動的バッチサイズ**: ネットワーク状況とトランザクション複雑度に応じたバッチサイズの自動調整
- **並行実行**: バッチ内トランザクションの並行処理による実行時間の最小化
- **障害分離**: 個別トランザクション失敗が他のトランザクションに影響しない分離実行
- **進捗監視**: バッチ単位での進捗報告とリアルタイム状況把握

**エラー処理と復旧メカニズム**:
- **段階的リトライ**: 一時的な失敗に対する指数バックオフを用いた自動リトライ
- **部分実行継続**: 一部失敗時でも成功した配布を保持し、失敗分のみ再実行
- **状態復旧**: 中断された配布処理の状態を正確に把握し、安全な再開を実現
- **詳細診断**: 失敗原因の分類と対応策の自動提案機能

### 2.3 Token Service

#### 2.3.1 設計目的と責務
**コンポーネントの目的**:
Solanaブロックチェーンの複雑なトークン操作を抽象化し、アプリケーション層が技術的詳細を意識することなくトークン関連機能を利用できる統一的なインターフェースを提供する。

**主要な責務**:
- **ブロックチェーン抽象化**: Solana特有の技術的複雑性を隠蔽し、シンプルなAPI提供
- **トークン操作統合**: 情報取得、残高確認、転送処理を一元的に管理
- **ネットワーク管理**: 開発・テスト・本番環境の切り替えと設定管理
- **エラー正規化**: ブロックチェーン固有のエラーを アプリケーション層で理解しやすい形式に変換

#### 2.3.2 インターフェース設計思想
**抽象化戦略**:
- **技術的詳細の隠蔽**: Solana RPC の複雑な API を簡潔な操作に抽象化
- **型安全性**: TypeScript の型システムを活用し、コンパイル時のエラー検出を強化
- **非同期処理の統一**: すべてのブロックチェーン操作を Promise ベースで統一し、呼び出し側の負担を軽減

**核心となる操作グループ**:
- **情報取得系**: トークンメタデータ、残高、アカウント情報の読み取り専用操作
- **トランザクション系**: 実際の資産移動を伴う書き込み操作の実行
- **検証系**: アドレスやトークンの有効性確認による事前チェック機能
- **ネットワーク管理系**: 環境切り替えと接続先管理の制御機能

**データ構造の設計意図**:
- **TokenInfo**: トークンの包括的な情報を構造化し、上位層での判断材料を提供
- **TokenAccount**: 所有権と状態情報を含む完全なアカウント表現
- **TokenTransfer**: バッチ転送に最適化されたパラメータ構造

#### 2.3.3 実装詳細
```typescript
import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, transfer, getAccount } from '@solana/spl-token';

export class TokenService implements ITokenService {
  private connection: Connection;
  private network: SolanaNetwork;

  constructor(
    private configManager: IConfigManager,
    private logger: ILogger,
    network: SolanaNetwork = 'devnet'
  ) {
    this.network = network;
    this.connection = new Connection(this.getRpcUrl(network));
  }

  async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
    try {
      const mintPubkey = new PublicKey(tokenAddress);
      const mintInfo = await this.connection.getParsedAccountInfo(mintPubkey);

      if (!mintInfo.value?.data || !('parsed' in mintInfo.value.data)) {
        throw new Error('Invalid token address');
      }

      const parsed = mintInfo.value.data.parsed.info;

      return {
        address: tokenAddress,
        name: parsed.name || 'Unknown',
        symbol: parsed.symbol || 'UNK',
        decimals: parsed.decimals,
        totalSupply: parsed.supply,
        mintAuthority: parsed.mintAuthority,
        freezeAuthority: parsed.freezeAuthority
      };
    } catch (error) {
      this.logger.error(`Failed to get token info for ${tokenAddress}:`, error);
      throw error;
    }
  }

  async getTokenBalance(walletAddress: string, tokenAddress?: string): Promise<number> {
    try {
      const walletPubkey = new PublicKey(walletAddress);

      if (!tokenAddress) {
        // SOL残高取得
        const balance = await this.connection.getBalance(walletPubkey);
        return balance / 1e9; // lamports to SOL
      }

      // SPLトークン残高取得
      const tokenPubkey = new PublicKey(tokenAddress);
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(
        walletPubkey,
        { mint: tokenPubkey }
      );

      if (tokenAccounts.value.length === 0) return 0;

      const accountInfo = await getAccount(this.connection, tokenAccounts.value[0].pubkey);
      return Number(accountInfo.amount);
    } catch (error) {
      this.logger.error(`Failed to get token balance:`, error);
      return 0;
    }
  }

  async transferToken(tokenAddress: string, recipient: string, amount: number): Promise<string> {
    try {
      const senderKeypair = await this.configManager.getWallet();
      const mintPubkey = new PublicKey(tokenAddress);
      const recipientPubkey = new PublicKey(recipient);

      // 送信者のトークンアカウント取得
      const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        senderKeypair,
        mintPubkey,
        senderKeypair.publicKey
      );

      // 受信者のトークンアカウント取得または作成
      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        senderKeypair,
        mintPubkey,
        recipientPubkey
      );

      // 転送実行
      const signature = await transfer(
        this.connection,
        senderKeypair,
        senderTokenAccount.address,
        recipientTokenAccount.address,
        senderKeypair,
        amount
      );

      this.logger.info(`Token transfer successful: ${signature}`);
      return signature;
    } catch (error) {
      this.logger.error(`Token transfer failed:`, error);
      throw error;
    }
  }

  setNetwork(network: SolanaNetwork): void {
    this.network = network;
    this.connection = new Connection(this.getRpcUrl(network));
    this.logger.info(`Switched to network: ${network}`);
  }

  getCurrentNetwork(): SolanaNetwork {
    return this.network;
  }

  validateAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  async validateTokenAddress(tokenAddress: string): Promise<boolean> {
    try {
      await this.getTokenInfo(tokenAddress);
      return true;
    } catch {
      return false;
    }
  }

  private getRpcUrl(network: SolanaNetwork): string {
    const urls = {
      'mainnet-beta': 'https://api.mainnet-beta.solana.com',
      'testnet': 'https://api.testnet.solana.com',
      'devnet': 'https://api.devnet.solana.com'
    };
    return urls[network];
  }
}
```

### 2.4 CLI Interface

#### 2.4.1 責務
- コマンドライン引数の解析
- ユーザー入力の検証
- 各コンポーネントの呼び出し
- 結果の表示とフォーマット

#### 2.4.2 インターフェース
```typescript
export interface ICLIInterface {
  // コマンド実行
  executeCommand(args: string[]): Promise<void>;

  // ヘルプ表示
  showHelp(command?: string): void;

  // 対話的入力
  promptUser(question: string): Promise<string>;
  confirmAction(message: string): Promise<boolean>;
}

export interface CommandDefinition {
  name: string;
  description: string;
  options: CommandOption[];
  handler: CommandHandler;
}

export interface CommandOption {
  name: string;
  alias?: string;
  description: string;
  required?: boolean;
  type: 'string' | 'number' | 'boolean';
  default?: any;
}

export type CommandHandler = (options: any) => Promise<void>;
```

#### 2.4.3 実装詳細
```typescript
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';

export class CLIInterface implements ICLIInterface {
  private program: Command;

  constructor(
    private walletCollector: IWalletCollector,
    private distributionEngine: IDistributionEngine,
    private configManager: IConfigManager,
    private logger: ILogger
  ) {
    this.program = new Command();
    this.setupCommands();
  }

  async executeCommand(args: string[]): Promise<void> {
    try {
      await this.program.parseAsync(args);
    } catch (error) {
      this.logger.error('Command execution failed:', error);
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  }

  private setupCommands(): void {
    this.program
      .name('tributary')
      .description('Solana token distribution system')
      .version('1.0.0');

    // init コマンド
    this.program
      .command('init')
      .description('Initialize project configuration')
      .option('-n, --name <name>', 'Project name')
      .option('--network <network>', 'Solana network', 'devnet')
      .action(this.handleInit.bind(this));

    // collect コマンド
    this.program
      .command('collect')
      .description('Collect token holder wallets')
      .requiredOption('-t, --token <address>', 'Token address')
      .option('--threshold <amount>', 'Minimum balance threshold', '0')
      .option('--cache', 'Use cached data if available')
      .action(this.handleCollect.bind(this));

    // distribute コマンド
    this.program
      .command('distribute')
      .description('Execute token distribution')
      .requiredOption('-t, --token <address>', 'Distribution token address')
      .requiredOption('-a, --amount <amount>', 'Total amount to distribute')
      .option('-s, --source <address>', 'Source token for ratio calculation')
      .option('--dry-run', 'Simulate distribution without execution')
      .option('--batch-size <size>', 'Batch size for transactions', '10')
      .action(this.handleDistribute.bind(this));

    // config コマンド
    this.program
      .command('config')
      .description('Show current configuration')
      .action(this.handleConfig.bind(this));
  }

  private async handleInit(options: any): Promise<void> {
    console.log(chalk.blue('🚀 Initializing Tributary project...'));

    const config = {
      projectName: options.name || await this.promptUser('Project name:'),
      network: options.network,
      walletPath: await this.promptUser('Wallet file path (or press enter to create new):')
    };

    await this.configManager.initialize(config);
    console.log(chalk.green('✅ Project initialized successfully!'));
  }

  private async handleCollect(options: any): Promise<void> {
    console.log(chalk.blue(`🔍 Collecting holders for token: ${options.token}`));

    const params: CollectHoldersParams = {
      tokenAddress: options.token,
      minBalance: parseFloat(options.threshold),
      useCache: options.cache
    };

    const holders = await this.walletCollector.collectHolders(params);

    console.log(chalk.green(`✅ Found ${holders.length} token holders`));
    console.table(holders.slice(0, 10).map(h => ({
      Address: h.address.slice(0, 8) + '...',
      Balance: h.balance.toLocaleString(),
      Percentage: h.percentage.toFixed(2) + '%'
    })));

    if (holders.length > 10) {
      console.log(chalk.gray(`... and ${holders.length - 10} more holders`));
    }
  }

  private async handleDistribute(options: any): Promise<void> {
    console.log(chalk.blue('💰 Preparing token distribution...'));

    // 保有者情報取得
    const sourceToken = options.source || options.token;
    const holders = await this.walletCollector.collectHolders({
      tokenAddress: sourceToken,
      useCache: true
    });

    if (holders.length === 0) {
      throw new Error('No token holders found. Run collect command first.');
    }

    const params: DistributionParams = {
      sourceToken,
      targetToken: options.token,
      totalAmount: parseFloat(options.amount),
      recipients: holders,
      dryRun: options.dryRun,
      batchSize: parseInt(options.batchSize)
    };

    // 確認
    if (!options.dryRun) {
      const confirmed = await this.confirmAction(
        `Distribute ${params.totalAmount} tokens to ${holders.length} recipients?`
      );
      if (!confirmed) {
        console.log(chalk.yellow('Distribution cancelled'));
        return;
      }
    }

    // 実行
    const result = await this.distributionEngine.executeDistribution(params);

    // 結果表示
    this.displayDistributionResult(result);
  }

  private async handleConfig(): Promise<void> {
    const config = await this.configManager.getConfig();
    console.log(chalk.blue('📋 Current Configuration:'));
    console.log(JSON.stringify(config, null, 2));
  }

  async promptUser(question: string): Promise<string> {
    const { answer } = await inquirer.prompt([
      {
        type: 'input',
        name: 'answer',
        message: question
      }
    ]);
    return answer;
  }

  async confirmAction(message: string): Promise<boolean> {
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: message
      }
    ]);
    return confirmed;
  }

  private displayDistributionResult(result: DistributionResult): void {
    console.log(chalk.blue('\n📊 Distribution Results:'));
    console.log(`Status: ${this.getStatusColor(result.status)(result.status.toUpperCase())}`);
    console.log(`Total Transactions: ${result.totalTransactions}`);
    console.log(`Successful: ${chalk.green(result.successCount)}`);
    console.log(`Failed: ${chalk.red(result.failedCount)}`);
    console.log(`Execution Time: ${result.executionTime}ms`);
    console.log(`Gas Used: ${result.gasUsed}`);

    if (result.failedCount > 0) {
      console.log(chalk.red('\n❌ Failed Transactions:'));
      result.transactions
        .filter(t => t.status === 'failed')
        .forEach(t => {
          console.log(`  ${t.recipient}: ${t.error}`);
        });
    }
  }

  private getStatusColor(status: string) {
    switch (status) {
      case 'success': return chalk.green;
      case 'partial': return chalk.yellow;
      case 'failed': return chalk.red;
      default: return chalk.gray;
    }
  }

  showHelp(command?: string): void {
    if (command) {
      this.program.commands.find(cmd => cmd.name() === command)?.help();
    } else {
      this.program.help();
    }
  }
}
```

### 2.5 Config Manager

#### 2.5.1 責務
- 設定ファイルの読み書き
- 設定値の検証
- ウォレット情報の暗号化保存
- 環境変数の管理

#### 2.5.2 インターフェース
```typescript
export interface IConfigManager {
  // 初期化
  initialize(config: InitialConfig): Promise<void>;

  // 設定管理
  getConfig(): Promise<TributaryConfig>;
  updateConfig(updates: Partial<TributaryConfig>): Promise<void>;

  // ウォレット管理
  getWallet(): Promise<Keypair>;
  setWallet(keypair: Keypair): Promise<void>;

  // 検証
  validateConfig(): Promise<boolean>;
  configExists(): boolean;
}

export interface TributaryConfig {
  projectName: string;
  network: SolanaNetwork;
  walletPath: string;
  rpcUrl?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  cacheEnabled: boolean;
  cacheExpiry: number;
  batchSize: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface InitialConfig {
  projectName: string;
  network: SolanaNetwork;
  walletPath?: string;
}
```

#### 2.5.3 実装詳細
```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Keypair } from '@solana/web3.js';
import * as crypto from 'crypto';

export class ConfigManager implements IConfigManager {
  private configDir: string;
  private configFile: string;
  private walletFile: string;

  constructor(private logger: ILogger) {
    this.configDir = path.join(os.homedir(), '.tributary');
    this.configFile = path.join(this.configDir, 'config.json');
    this.walletFile = path.join(this.configDir, 'wallet.enc');
  }

  async initialize(config: InitialConfig): Promise<void> {
    try {
      // 設定ディレクトリ作成
      await fs.mkdir(this.configDir, { recursive: true });

      // デフォルト設定作成
      const defaultConfig: TributaryConfig = {
        projectName: config.projectName,
        network: config.network,
        walletPath: config.walletPath || this.walletFile,
        logLevel: 'info',
        cacheEnabled: true,
        cacheExpiry: 3600, // 1時間
        batchSize: 10,
        retryAttempts: 3,
        retryDelay: 1000
      };

      await this.saveConfig(defaultConfig);

      // ウォレット処理
      if (config.walletPath) {
        // 既存ウォレット読み込み
        const walletData = await fs.readFile(config.walletPath);
        const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(walletData.toString())));
        await this.setWallet(keypair);
      } else {
        // 新規ウォレット作成
        const keypair = Keypair.generate();
        await this.setWallet(keypair);

        console.log(`New wallet created: ${keypair.publicKey.toBase58()}`);
        console.log('Please fund this wallet before using distribution features.');
      }

      this.logger.info(`Configuration initialized: ${this.configFile}`);
    } catch (error) {
      this.logger.error('Failed to initialize configuration:', error);
      throw error;
    }
  }

  async getConfig(): Promise<TributaryConfig> {
    try {
      const data = await fs.readFile(this.configFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error('Configuration file not found. Run "tributary init" first.');
    }
  }

  async updateConfig(updates: Partial<TributaryConfig>): Promise<void> {
    const currentConfig = await this.getConfig();
    const newConfig = { ...currentConfig, ...updates };
    await this.saveConfig(newConfig);
  }

  async getWallet(): Promise<Keypair> {
    try {
      const encryptedData = await fs.readFile(this.walletFile);
      const decrypted = this.decrypt(encryptedData);
      const secretKey = new Uint8Array(JSON.parse(decrypted));
      return Keypair.fromSecretKey(secretKey);
    } catch (error) {
      throw new Error('Wallet file not found or corrupted. Run "tributary init" first.');
    }
  }

  async setWallet(keypair: Keypair): Promise<void> {
    const secretKeyArray = Array.from(keypair.secretKey);
    const secretKeyJson = JSON.stringify(secretKeyArray);
    const encrypted = this.encrypt(secretKeyJson);

    await fs.writeFile(this.walletFile, encrypted);
    await fs.chmod(this.walletFile, 0o600); // 読み書き権限を所有者のみに制限

    this.logger.info('Wallet saved securely');
  }

  async validateConfig(): Promise<boolean> {
    try {
      const config = await this.getConfig();

      // 必須フィールドチェック
      if (!config.projectName || !config.network || !config.walletPath) {
        return false;
      }

      // ネットワーク値チェック
      if (!['mainnet-beta', 'testnet', 'devnet'].includes(config.network)) {
        return false;
      }

      // ウォレットファイル存在チェック
      try {
        await this.getWallet();
      } catch {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  configExists(): boolean {
    try {
      return require('fs').existsSync(this.configFile);
    } catch {
      return false;
    }
  }

  private async saveConfig(config: TributaryConfig): Promise<void> {
    const data = JSON.stringify(config, null, 2);
    await fs.writeFile(this.configFile, data, 'utf8');
  }

  private encrypt(text: string): Buffer {
    const algorithm = 'aes-256-gcm';
    const password = this.getEncryptionKey();
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(salt);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]);
  }

  private decrypt(encryptedData: Buffer): string {
    const algorithm = 'aes-256-gcm';
    const password = this.getEncryptionKey();

    const salt = encryptedData.slice(0, 16);
    const iv = encryptedData.slice(16, 32);
    const tag = encryptedData.slice(32, 48);
    const encrypted = encryptedData.slice(48);

    const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');

    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(salt);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private getEncryptionKey(): string {
    // 環境変数またはシステム情報から暗号化キーを生成
    return process.env.TRIBUTARY_KEY || `${os.hostname()}-${os.userInfo().username}`;
  }
}
```

### 2.6 Report Generator

#### 2.6.1 責務
- 配布結果のレポート生成
- 履歴管理
- 各種フォーマットでの出力
- 統計情報の計算

#### 2.6.2 インターフェース
```typescript
export interface IReportGenerator {
  // レポート生成
  generateDistributionReport(result: DistributionResult): Promise<Report>;
  generateSummaryReport(filter?: ReportFilter): Promise<SummaryReport>;

  // 出力
  exportReport(report: Report, format: ReportFormat, outputPath?: string): Promise<string>;

  // 履歴管理
  saveDistributionRecord(result: DistributionResult): Promise<void>;
  getDistributionHistory(filter?: ReportFilter): Promise<DistributionRecord[]>;
}

export interface Report {
  id: string;
  title: string;
  generatedAt: Date;
  data: any;
  metadata: ReportMetadata;
}

export interface ReportMetadata {
  version: string;
  generator: string;
  network: string;
  totalRecords: number;
}

export interface ReportFilter {
  startDate?: Date;
  endDate?: Date;
  status?: string[];
  tokenAddress?: string;
  limit?: number;
  offset?: number;
}

export type ReportFormat = 'json' | 'csv' | 'html' | 'pdf';
```

#### 2.6.3 実装詳細
```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

export class ReportGenerator implements IReportGenerator {
  private reportsDir: string;

  constructor(
    private configManager: IConfigManager,
    private logger: ILogger
  ) {
    this.reportsDir = path.join(process.cwd(), 'reports');
  }

  async generateDistributionReport(result: DistributionResult): Promise<Report> {
    const report: Report = {
      id: result.distributionId,
      title: `Distribution Report - ${result.distributionId}`,
      generatedAt: new Date(),
      data: {
        summary: {
          distributionId: result.distributionId,
          status: result.status,
          totalTransactions: result.totalTransactions,
          successCount: result.successCount,
          failedCount: result.failedCount,
          successRate: ((result.successCount / result.totalTransactions) * 100).toFixed(2),
          totalAmount: result.totalAmount,
          gasUsed: result.gasUsed,
          executionTime: result.executionTime,
          executedAt: new Date()
        },
        transactions: result.transactions.map(tx => ({
          recipient: tx.recipient,
          amount: tx.amount,
          status: tx.status,
          signature: tx.signature,
          gasUsed: tx.gasUsed,
          error: tx.error
        })),
        statistics: this.calculateStatistics(result)
      },
      metadata: {
        version: '1.0.0',
        generator: 'Tributary Report Generator',
        network: (await this.configManager.getConfig()).network,
        totalRecords: result.transactions.length
      }
    };

    return report;
  }

  async generateSummaryReport(filter?: ReportFilter): Promise<SummaryReport> {
    const history = await this.getDistributionHistory(filter);

    const summary: SummaryReport = {
      reportId: `summary-${Date.now()}`,
      generatedAt: new Date(),
      period: {
        startDate: filter?.startDate || new Date(0),
        endDate: filter?.endDate || new Date()
      },
      totals: {
        distributions: history.length,
        successfulDistributions: history.filter(h => h.status === 'success').length,
        totalTransactions: history.reduce((sum, h) => sum + h.totalTransactions, 0),
        totalAmount: history.reduce((sum, h) => sum + h.totalAmount, 0),
        totalGasUsed: history.reduce((sum, h) => sum + h.gasUsed, 0)
      },
      averages: {
        transactionsPerDistribution: history.length > 0 ?
          history.reduce((sum, h) => sum + h.totalTransactions, 0) / history.length : 0,
        executionTime: history.length > 0 ?
          history.reduce((sum, h) => sum + h.executionTime, 0) / history.length : 0,
        gasPerTransaction: 0 // 計算
      },
      distributions: history
    };

    // 平均ガス使用量計算
    const totalTx = summary.totals.totalTransactions;
    summary.averages.gasPerTransaction = totalTx > 0 ?
      summary.totals.totalGasUsed / totalTx : 0;

    return summary;
  }

  async exportReport(report: Report, format: ReportFormat, outputPath?: string): Promise<string> {
    await fs.mkdir(this.reportsDir, { recursive: true });

    const filename = outputPath || this.generateFilename(report.id, format);
    const fullPath = path.resolve(filename);

    switch (format) {
      case 'json':
        await this.exportJson(report, fullPath);
        break;
      case 'csv':
        await this.exportCsv(report, fullPath);
        break;
      case 'html':
        await this.exportHtml(report, fullPath);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    this.logger.info(`Report exported: ${fullPath}`);
    return fullPath;
  }

  private async exportJson(report: Report, filePath: string): Promise<void> {
    const json = JSON.stringify(report, null, 2);
    await fs.writeFile(filePath, json, 'utf8');
  }

  private async exportCsv(report: Report, filePath: string): Promise<void> {
    const transactions = report.data.transactions;

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'recipient', title: 'Recipient' },
        { id: 'amount', title: 'Amount' },
        { id: 'status', title: 'Status' },
        { id: 'signature', title: 'Signature' },
        { id: 'gasUsed', title: 'Gas Used' },
        { id: 'error', title: 'Error' }
      ]
    });

    await csvWriter.writeRecords(transactions);
  }

  private async exportHtml(report: Report, filePath: string): Promise<void> {
    const html = this.generateHtmlReport(report);
    await fs.writeFile(filePath, html, 'utf8');
  }

  private generateHtmlReport(report: Report): string {
    const { summary, transactions, statistics } = report.data;

    return `
<!DOCTYPE html>
<html>
<head>
    <title>${report.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .statistics { background: #e8f4fd; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .success { color: green; }
        .failed { color: red; }
    </style>
</head>
<body>
    <h1>${report.title}</h1>
    <p>Generated: ${report.generatedAt.toISOString()}</p>

    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Distribution ID:</strong> ${summary.distributionId}</p>
        <p><strong>Status:</strong> <span class="${summary.status}">${summary.status.toUpperCase()}</span></p>
        <p><strong>Success Rate:</strong> ${summary.successRate}%</p>
        <p><strong>Total Amount:</strong> ${summary.totalAmount.toLocaleString()}</p>
        <p><strong>Execution Time:</strong> ${summary.executionTime}ms</p>
        <p><strong>Gas Used:</strong> ${summary.gasUsed.toLocaleString()}</p>
    </div>

    <div class="statistics">
        <h2>Statistics</h2>
        <p><strong>Average Amount:</strong> ${statistics.averageAmount.toFixed(2)}</p>
        <p><strong>Median Amount:</strong> ${statistics.medianAmount.toFixed(2)}</p>
        <p><strong>Min Amount:</strong> ${statistics.minAmount}</p>
        <p><strong>Max Amount:</strong> ${statistics.maxAmount}</p>
    </div>

    <h2>Transactions</h2>
    <table>
        <thead>
            <tr>
                <th>Recipient</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Signature</th>
                <th>Gas Used</th>
                <th>Error</th>
            </tr>
        </thead>
        <tbody>
            ${transactions.map(tx => `
                <tr>
                    <td>${tx.recipient}</td>
                    <td>${tx.amount.toLocaleString()}</td>
                    <td class="${tx.status}">${tx.status.toUpperCase()}</td>
                    <td>${tx.signature || '-'}</td>
                    <td>${tx.gasUsed || '-'}</td>
                    <td>${tx.error || '-'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>
    `;
  }

  private calculateStatistics(result: DistributionResult): any {
    const amounts = result.transactions.map(tx => tx.amount);
    amounts.sort((a, b) => a - b);

    return {
      averageAmount: amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length,
      medianAmount: amounts[Math.floor(amounts.length / 2)],
      minAmount: Math.min(...amounts),
      maxAmount: Math.max(...amounts),
      standardDeviation: this.calculateStandardDeviation(amounts)
    };
  }

  private calculateStandardDeviation(values: number[]): number {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squareDiffs = values.map(val => Math.pow(val - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, sq) => sum + sq, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }

  private generateFilename(id: string, format: ReportFormat): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    return path.join(this.reportsDir, `${id}-${timestamp}.${format}`);
  }

  async saveDistributionRecord(result: DistributionResult): Promise<void> {
    // 実装: データベースまたはファイルシステムに保存
    const record = {
      id: result.distributionId,
      status: result.status,
      totalTransactions: result.totalTransactions,
      successCount: result.successCount,
      failedCount: result.failedCount,
      totalAmount: result.totalAmount,
      gasUsed: result.gasUsed,
      executionTime: result.executionTime,
      createdAt: new Date(),
      data: result
    };

    const recordsFile = path.join(this.reportsDir, 'distribution-history.jsonl');
    await fs.appendFile(recordsFile, JSON.stringify(record) + '\n', 'utf8');
  }

  async getDistributionHistory(filter?: ReportFilter): Promise<DistributionRecord[]> {
    // 実装: 保存された履歴データの読み込みとフィルタリング
    const recordsFile = path.join(this.reportsDir, 'distribution-history.jsonl');

    try {
      const data = await fs.readFile(recordsFile, 'utf8');
      const lines = data.trim().split('\n').filter(line => line);
      let records = lines.map(line => JSON.parse(line));

      // フィルタリング
      if (filter) {
        if (filter.startDate) {
          records = records.filter(r => new Date(r.createdAt) >= filter.startDate!);
        }
        if (filter.endDate) {
          records = records.filter(r => new Date(r.createdAt) <= filter.endDate!);
        }
        if (filter.status?.length) {
          records = records.filter(r => filter.status!.includes(r.status));
        }
        if (filter.limit) {
          records = records.slice(filter.offset || 0, (filter.offset || 0) + filter.limit);
        }
      }

      return records;
    } catch (error) {
      this.logger.warn('No distribution history found');
      return [];
    }
  }
}

interface SummaryReport {
  reportId: string;
  generatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  totals: {
    distributions: number;
    successfulDistributions: number;
    totalTransactions: number;
    totalAmount: number;
    totalGasUsed: number;
  };
  averages: {
    transactionsPerDistribution: number;
    executionTime: number;
    gasPerTransaction: number;
  };
  distributions: DistributionRecord[];
}

interface DistributionRecord {
  id: string;
  status: string;
  totalTransactions: number;
  successCount: number;
  failedCount: number;
  totalAmount: number;
  gasUsed: number;
  executionTime: number;
  createdAt: Date;
}
```

## 3. データ設計

### 3.1 データモデル

#### 3.1.1 ウォレット保有者データ
```typescript
interface WalletHolder {
  address: string;           // ウォレットアドレス (主键)
  balance: number;           // トークン保有量
  percentage: number;        // 全体に対する保有割合
  lastUpdated: Date;         // 最終更新日時
  tokenAddress: string;      // 対象トークンアドレス
  isValid: boolean;          // ウォレットの有効性
}
```

#### 3.1.2 配布結果データ
```typescript
interface DistributionResult {
  distributionId: string;           // 配布ID (主键)
  sourceToken: string;              // 配布元トークン
  targetToken: string;              // 配布先トークン
  totalAmount: number;              // 総配布量
  status: DistributionStatus;       // 配布ステータス
  totalTransactions: number;        // 総トランザクション数
  successCount: number;             // 成功数
  failedCount: number;              // 失敗数
  gasUsed: number;                  // 使用ガス量
  executionTime: number;            // 実行時間(ms)
  createdAt: Date;                  // 作成日時
  completedAt?: Date;               // 完了日時
  transactions: TransactionResult[]; // トランザクション詳細
}

type DistributionStatus = 'pending' | 'running' | 'success' | 'partial' | 'failed' | 'cancelled';
```

#### 3.1.3 トランザクション結果データ
```typescript
interface TransactionResult {
  id: string;                // トランザクションID
  distributionId: string;    // 配布ID (外来键)
  recipient: string;         // 受信者アドレス
  amount: number;            // 配布量
  signature?: string;        // トランザクション署名
  status: TransactionStatus; // ステータス
  gasUsed?: number;          // 使用ガス量
  error?: string;            // エラーメッセージ
  createdAt: Date;           // 作成日時
  completedAt?: Date;        // 完了日時
  retryCount: number;        // リトライ回数
}

type TransactionStatus = 'pending' | 'confirmed' | 'failed';
```

#### 3.1.4 設定データ
```typescript
interface TributaryConfig {
  version: string;                  // 設定バージョン
  projectName: string;              // プロジェクト名
  network: SolanaNetwork;           // Solanaネットワーク
  walletPath: string;               // ウォレットファイルパス
  rpcUrl?: string;                  // カスタムRPC URL
  logLevel: LogLevel;               // ログレベル
  cacheEnabled: boolean;            // キャッシュ有効/無効
  cacheExpiry: number;              // キャッシュ有効期限(秒)
  batchSize: number;                // バッチサイズ
  retryAttempts: number;            // リトライ回数
  retryDelay: number;               // リトライ間隔(ms)
  notificationWebhook?: string;     // 通知Webhook URL
  createdAt: Date;                  // 作成日時
  updatedAt: Date;                  // 更新日時
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type SolanaNetwork = 'mainnet-beta' | 'testnet' | 'devnet';
```

### 3.2 設定ファイル構造

#### 3.2.1 メイン設定ファイル
**場所**: `~/.tributary/config.json`
```json
{
  "version": "1.0.0",
  "projectName": "MyProject",
  "network": "devnet",
  "walletPath": "/home/user/.tributary/wallet.enc",
  "rpcUrl": null,
  "logLevel": "info",
  "cacheEnabled": true,
  "cacheExpiry": 3600,
  "batchSize": 10,
  "retryAttempts": 3,
  "retryDelay": 1000,
  "notificationWebhook": null,
  "createdAt": "2025-09-18T09:00:00.000Z",
  "updatedAt": "2025-09-18T09:00:00.000Z"
}
```

#### 3.2.2 環境変数設定
**場所**: `~/.tributary/.env`
```bash
# Solana RPC Settings
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WS_URL=wss://api.devnet.solana.com

# Security
TRIBUTARY_ENCRYPTION_KEY=custom-encryption-key
WALLET_PASSWORD=optional-wallet-password

# External APIs
COINGECKO_API_KEY=optional-api-key
JUPITER_API_KEY=optional-api-key

# Notifications
SLACK_WEBHOOK_URL=optional-slack-webhook
DISCORD_WEBHOOK_URL=optional-discord-webhook

# Performance
MAX_CONCURRENT_REQUESTS=50
REQUEST_TIMEOUT=30000
CACHE_SIZE_LIMIT=100
```

#### 3.2.3 プロジェクト別設定
**場所**: `./tributary.config.json` (プロジェクトディレクトリ)
```json
{
  "project": {
    "name": "ProjectSpecificName",
    "description": "Project specific configuration"
  },
  "tokens": {
    "primary": "TokenAddressHere",
    "reward": ["USDCAddress", "USDTAddress"]
  },
  "distribution": {
    "schedule": "weekly",
    "defaultAmount": 1000,
    "minHolders": 10,
    "excludeAddresses": ["address1", "address2"]
  },
  "notifications": {
    "onSuccess": true,
    "onFailure": true,
    "onPartial": true,
    "channels": ["email", "slack"]
  }
}
```

### 3.3 ログファイル構造

#### 3.3.1 ログディレクトリ構成
```
~/.tributary/logs/
├── application.log          # アプリケーションログ
├── error.log               # エラーログ
├── distribution.log        # 配布実行ログ
├── transaction.log         # トランザクションログ
├── audit.log              # 監査ログ
└── archive/               # アーカイブログ
    ├── 2025-09-18/
    └── 2025-09-17/
```

#### 3.3.2 ログフォーマット
```json
{
  "timestamp": "2025-09-18T09:00:00.000Z",
  "level": "INFO",
  "component": "DistributionEngine",
  "message": "Starting distribution: dist-123456",
  "metadata": {
    "distributionId": "dist-123456",
    "tokenAddress": "TokenAddressHere",
    "recipientCount": 150,
    "totalAmount": 10000
  },
  "correlationId": "req-123456",
  "userId": "user-id",
  "sessionId": "session-123"
}
```

#### 3.3.3 ログローテーション設定
```typescript
interface LogRotationConfig {
  maxFileSize: string;        // '10MB'
  maxFiles: number;          // 30
  datePattern: string;       // 'YYYY-MM-DD'
  auditFile: string;         // 'audit.json'
  compress: boolean;         // true
  archiveDirectory: string;  // './archive'
}
```

### 3.4 キャッシュ設計

#### 3.4.1 キャッシュ構造
```
~/.tributary/cache/
├── holders/               # トークン保有者キャッシュ
│   ├── {tokenAddress}.json
│   └── metadata.json
├── tokens/               # トークン情報キャッシュ
│   ├── {tokenAddress}.json
│   └── metadata.json
├── prices/               # 価格情報キャッシュ
│   ├── latest.json
│   └── metadata.json
└── transactions/         # トランザクション状況キャッシュ
    ├── pending.json
    └── metadata.json
```

#### 3.4.2 キャッシュエントリ形式
```typescript
interface CacheEntry<T> {
  key: string;              // キャッシュキー
  data: T;                  // キャッシュデータ
  createdAt: Date;          // 作成日時
  expiresAt: Date;          // 有効期限
  accessCount: number;      // アクセス回数
  lastAccessedAt: Date;     // 最終アクセス日時
  tags: string[];           // タグ (グループ削除用)
}

interface CacheMetadata {
  totalEntries: number;     // 総エントリ数
  totalSize: number;        // 総サイズ (bytes)
  lastCleanup: Date;        // 最終クリーンアップ日時
  hitRate: number;          // ヒット率
}
```

## 4. インターフェース設計

### 4.1 CLI コマンドインターフェース

#### 4.1.1 コマンド体系
```bash
tributary [global-options] <command> [command-options]

Global Options:
  --config <path>           # 設定ファイルパス
  --network <network>       # ネットワーク指定
  --verbose, -v            # 詳細出力
  --quiet, -q              # 最小出力
  --help, -h               # ヘルプ表示
  --version, -V            # バージョン表示

Commands:
  init                     # プロジェクト初期化
  collect                  # ウォレット収集
  distribute              # 配布実行
  config                  # 設定管理
  report                  # レポート生成
  history                 # 履歴表示
  validate                # 検証
```

#### 4.1.2 詳細コマンド仕様
```bash
# プロジェクト初期化
tributary init [options]
  -n, --name <name>        # プロジェクト名
  --network <network>      # Solanaネットワーク
  --wallet <path>          # ウォレットファイルパス
  --force                  # 既存設定の上書き

# ウォレット収集
tributary collect [options]
  -t, --token <address>    # トークンアドレス (必須)
  --min-balance <amount>   # 最小保有量
  --max-balance <amount>   # 最大保有量
  --output <path>          # 出力ファイルパス
  --format <format>        # 出力形式 (json|csv)
  --cache                  # キャッシュ使用
  --refresh               # キャッシュ更新

# 配布実行
tributary distribute [options]
  -t, --token <address>    # 配布トークンアドレス (必須)
  -a, --amount <amount>    # 配布総量 (必須)
  -s, --source <address>   # 基準トークンアドレス
  --recipients <path>      # 受信者リストファイル
  --batch-size <size>      # バッチサイズ
  --dry-run               # シミュレーション実行
  --auto-confirm          # 自動確認
  --report <path>         # レポート出力パス

# 設定管理
tributary config <subcommand> [options]
  show                     # 設定表示
  set <key> <value>        # 設定変更
  get <key>               # 設定取得
  reset                   # 設定リセット
  export <path>           # 設定エクスポート
  import <path>           # 設定インポート

# レポート生成
tributary report [options]
  --distribution <id>      # 配布ID指定
  --format <format>        # 出力形式 (json|csv|html)
  --output <path>          # 出力パス
  --summary               # サマリーレポート
  --period <days>         # 期間指定

# 履歴表示
tributary history [options]
  --limit <count>          # 表示件数
  --status <status>        # ステータスフィルタ
  --token <address>        # トークンフィルタ
  --format <format>        # 出力形式

# 検証
tributary validate [options]
  --config                # 設定検証
  --wallet                # ウォレット検証
  --token <address>       # トークン検証
  --network               # ネットワーク接続検証
```

### 4.2 Solana RPC インターフェース

#### 4.2.1 RPC接続管理
```typescript
interface SolanaRPCManager {
  // 接続管理
  connect(network: SolanaNetwork, customUrl?: string): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getConnection(): Connection;

  // ヘルスチェック
  checkHealth(): Promise<RPCHealthStatus>;
  getLatestBlockhash(): Promise<string>;
  getSlot(): Promise<number>;

  // 自動フェイルオーバー
  addFallbackUrl(url: string): void;
  switchToFallback(): Promise<void>;
}

interface RPCHealthStatus {
  endpoint: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  blockHeight: number;
  lastCheck: Date;
}
```

#### 4.2.2 トランザクション管理
```typescript
interface TransactionManager {
  // トランザクション作成
  createTransferTransaction(
    from: PublicKey,
    to: PublicKey,
    amount: number,
    tokenMint: PublicKey
  ): Promise<Transaction>;

  // バッチトランザクション
  createBatchTransactions(
    transfers: TokenTransfer[],
    batchSize: number
  ): Promise<Transaction[]>;

  // 署名・送信
  signTransaction(transaction: Transaction, keypair: Keypair): Promise<Transaction>;
  sendTransaction(transaction: Transaction): Promise<string>;
  confirmTransaction(signature: string): Promise<TransactionConfirmation>;

  // 手数料管理
  estimateTransactionFee(transaction: Transaction): Promise<number>;
  optimizeTransaction(transaction: Transaction): Promise<Transaction>;
}
```

### 4.3 外部API インターフェース

#### 4.3.1 価格情報API
```typescript
interface PriceOracle {
  // 価格取得
  getTokenPrice(tokenAddress: string): Promise<TokenPrice>;
  getMultipleTokenPrices(tokenAddresses: string[]): Promise<TokenPrice[]>;

  // 履歴価格
  getHistoricalPrice(tokenAddress: string, date: Date): Promise<TokenPrice>;
  getPriceChart(tokenAddress: string, period: string): Promise<PricePoint[]>;
}

interface TokenPrice {
  tokenAddress: string;
  priceUSD: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  lastUpdated: Date;
}
```

#### 4.3.2 通知API
```typescript
interface NotificationService {
  // Webhook通知
  sendWebhook(url: string, payload: any): Promise<void>;

  // 各種通知
  sendSlackNotification(webhook: string, message: SlackMessage): Promise<void>;
  sendDiscordNotification(webhook: string, message: DiscordMessage): Promise<void>;
  sendEmailNotification(config: EmailConfig, message: EmailMessage): Promise<void>;
}

interface SlackMessage {
  text: string;
  channel?: string;
  username?: string;
  icon_emoji?: string;
  attachments?: SlackAttachment[];
}
```

### 4.4 内部モジュール間インターフェース

#### 4.4.1 イベントシステム
```typescript
interface EventEmitter {
  // イベント登録
  on(event: string, listener: Function): void;
  once(event: string, listener: Function): void;
  off(event: string, listener: Function): void;

  // イベント発火
  emit(event: string, ...args: any[]): boolean;
  emitAsync(event: string, ...args: any[]): Promise<any[]>;
}

// システムイベント
type SystemEvent =
  | 'distribution.started'
  | 'distribution.completed'
  | 'distribution.failed'
  | 'transaction.confirmed'
  | 'transaction.failed'
  | 'wallet.collected'
  | 'config.updated'
  | 'error.occurred';
```

#### 4.4.2 依存性注入コンテナ
```typescript
interface ServiceContainer {
  // サービス登録
  register<T>(name: string, factory: () => T): void;
  registerSingleton<T>(name: string, factory: () => T): void;
  registerInstance<T>(name: string, instance: T): void;

  // サービス取得
  resolve<T>(name: string): T;
  resolveAll<T>(pattern: string): T[];

  // ライフサイクル管理
  dispose(): Promise<void>;
}
```

## 5. セキュリティ設計

### 5.1 秘密鍵管理

#### 5.1.1 暗号化仕様
```typescript
interface KeyEncryption {
  algorithm: 'AES-256-GCM';
  keyDerivation: {
    algorithm: 'PBKDF2';
    iterations: 100000;
    saltLength: 16;
    hashAlgorithm: 'SHA-256';
  };
  encryptionKey: {
    source: 'environment' | 'system' | 'user';
    length: 32; // bytes
  };
}
```

#### 5.1.2 ウォレットファイル構造
```typescript
interface EncryptedWalletFile {
  version: string;              // 暗号化バージョン
  algorithm: string;            // 暗号化アルゴリズム
  salt: string;                 // ソルト (Base64)
  iv: string;                   // 初期化ベクター (Base64)
  authTag: string;              // 認証タグ (Base64)
  encryptedData: string;        // 暗号化された秘密鍵 (Base64)
  createdAt: string;            // 作成日時 (ISO8601)
  metadata: {
    publicKey: string;          // 公開鍵 (Base58)
    keyLength: number;          // 鍵長
    checksum: string;           // チェックサム
  };
}
```

#### 5.1.3 アクセス制御
```typescript
interface AccessControl {
  // ファイル権限
  filePermissions: {
    owner: 'read' | 'write';
    group: 'none';
    others: 'none';
  };

  // メモリ保護
  memoryProtection: {
    clearOnExit: boolean;
    noSwap: boolean;
    lockMemory: boolean;
  };

  // セッション管理
  sessionTimeout: number;       // セッション有効期限 (秒)
  maxIdleTime: number;          // 最大アイドル時間 (秒)
  requireReauth: boolean;       // 再認証要求
}
```

### 5.2 入力検証

#### 5.2.1 バリデーション規則
```typescript
interface ValidationRules {
  // Solanaアドレス
  solanaAddress: {
    pattern: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    length: { min: 32, max: 44 };
    encoding: 'base58';
  };

  // トークン量
  tokenAmount: {
    type: 'number';
    min: 0;
    max: Number.MAX_SAFE_INTEGER;
    decimals: { max: 9 };
  };

  // ファイルパス
  filePath: {
    maxLength: 4096;
    allowedExtensions: ['.json', '.csv', '.txt'];
    preventTraversal: true;
  };

  // プロジェクト名
  projectName: {
    pattern: /^[a-zA-Z0-9_-]+$/;
    length: { min: 1, max: 50 };
  };
}
```

#### 5.2.2 サニタイゼーション
```typescript
interface InputSanitizer {
  // 文字列サニタイズ
  sanitizeString(input: string): string;
  escapeHtml(input: string): string;
  removeControlChars(input: string): string;

  // パスサニタイズ
  sanitizePath(path: string): string;
  resolveSecurePath(basePath: string, userPath: string): string;

  // 数値サニタイズ
  sanitizeNumber(input: any): number | null;
  clampNumber(value: number, min: number, max: number): number;
}
```

### 5.3 エラーハンドリング

#### 5.3.1 エラー分類
```typescript
enum ErrorCategory {
  VALIDATION = 'validation',
  NETWORK = 'network',
  BLOCKCHAIN = 'blockchain',
  FILESYSTEM = 'filesystem',
  CONFIGURATION = 'configuration',
  AUTHENTICATION = 'authentication',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system'
}

interface TributaryError extends Error {
  category: ErrorCategory;
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userMessage: string;
  technicalMessage: string;
  context: Record<string, any>;
  timestamp: Date;
  correlationId: string;
}
```

#### 5.3.2 エラー情報の保護
```typescript
interface ErrorSanitizer {
  // 本番環境用エラー
  sanitizeForProduction(error: TributaryError): PublicError;

  // ログ用エラー
  sanitizeForLogs(error: TributaryError): LogError;

  // ユーザー表示用エラー
  formatForUser(error: TributaryError): string;
}

interface PublicError {
  message: string;              // ユーザー向けメッセージ
  code: string;                 // エラーコード
  correlationId: string;        // 相関ID (サポート用)
  // 機密情報は含まない
}
```

### 5.4 ログ・監査

#### 5.4.1 監査ログ要件
```typescript
interface AuditLog {
  timestamp: Date;              // タイムスタンプ
  userId?: string;              // ユーザーID
  sessionId?: string;           // セッションID
  action: AuditAction;          // 実行アクション
  resource: string;             // 対象リソース
  result: 'success' | 'failure' | 'partial';
  details: AuditDetails;        // 詳細情報
  ipAddress?: string;           // IPアドレス
  userAgent?: string;           // ユーザーエージェント
  correlationId: string;        // 相関ID
}

type AuditAction =
  | 'wallet.collect'
  | 'distribution.execute'
  | 'config.update'
  | 'wallet.access'
  | 'report.generate'
  | 'auth.login'
  | 'auth.logout';

interface AuditDetails {
  parameters: Record<string, any>; // 実行パラメータ (機密情報除く)
  affected: {
    count: number;                 // 影響レコード数
    resources: string[];           // 影響リソース
  };
  timing: {
    startTime: Date;               // 開始時間
    endTime: Date;                 // 終了時間
    duration: number;              // 実行時間 (ms)
  };
}
```

#### 5.4.2 ログ保護
```typescript
interface LogProtection {
  // 機密情報のマスキング
  sensitiveFields: string[];    // マスク対象フィールド
  maskingPattern: string;       // マスクパターン (例: '***')

  // ログの改ざん防止
  integrity: {
    enabled: boolean;
    algorithm: 'SHA-256';
    signWithKey: boolean;
  };

  // ログの暗号化
  encryption: {
    enabled: boolean;
    algorithm: 'AES-256-CBC';
    rotateKeys: boolean;
  };
}
```

## 6. パフォーマンス設計

### 6.1 処理性能要件

#### 6.1.1 パフォーマンス目標
```typescript
interface PerformanceTargets {
  // CLI応答時間
  commandResponse: {
    simple: 100;        // ms (config show等)
    moderate: 2000;     // ms (collect等)
    complex: 30000;     // ms (distribute等)
  };

  // スループット
  throughput: {
    walletCollection: 1000;      // addresses/minute
    tokenTransfers: 100;         // transactions/minute
    reportGeneration: 10;        // reports/minute
  };

  // リソース使用量
  memory: {
    base: 50;           // MB (基本使用量)
    peak: 200;          // MB (最大使用量)
    cache: 50;          // MB (キャッシュ使用量)
  };

  // ネットワーク
  network: {
    rpcLatency: 500;    // ms (平均RPC応答時間)
    bandwidth: 10;      // MB/min (平均帯域使用量)
    concurrency: 10;    // 同時接続数
  };
}
```

#### 6.1.2 パフォーマンス監視
```typescript
interface PerformanceMonitor {
  // メトリクス収集
  startTiming(operation: string): TimingHandle;
  recordDuration(operation: string, duration: number): void;
  incrementCounter(metric: string, value?: number): void;
  recordGauge(metric: string, value: number): void;

  // システムリソース監視
  getMemoryUsage(): MemoryUsage;
  getCPUUsage(): CPUUsage;
  getNetworkStats(): NetworkStats;

  // レポート生成
  generatePerformanceReport(): PerformanceReport;
}

interface PerformanceReport {
  period: { start: Date; end: Date };
  metrics: {
    operations: OperationMetrics[];
    resources: ResourceMetrics;
    errors: ErrorMetrics;
  };
  recommendations: string[];
}
```

### 6.2 並行処理設計

#### 6.2.1 並行処理戦略
```typescript
interface ConcurrencyStrategy {
  // ワーカープール
  workerPool: {
    minWorkers: number;          // 最小ワーカー数
    maxWorkers: number;          // 最大ワーカー数
    idleTimeout: number;         // アイドルタイムアウト (ms)
    queueSize: number;           // キューサイズ
  };

  // バッチ処理
  batchProcessing: {
    defaultBatchSize: number;    // デフォルトバッチサイズ
    maxBatchSize: number;        // 最大バッチサイズ
    adaptiveSizing: boolean;     // 適応的サイズ調整
  };

  // レート制限
  rateLimiting: {
    rpcRequests: number;         // RPC要求数/秒
    tokenTransfers: number;      // トークン転送数/分
    apiCalls: number;            // API呼び出し数/分
  };
}
```

#### 6.2.2 非同期処理パターン
```typescript
interface AsyncPatterns {
  // Promise管理
  promisePool: {
    maxConcurrent: number;       // 最大同時実行数
    retryPolicy: RetryPolicy;    // リトライポリシー
    timeoutMs: number;           // タイムアウト
  };

  // ストリーミング処理
  streaming: {
    chunkSize: number;           // チャンクサイズ
    bufferSize: number;          // バッファサイズ
    backpressure: boolean;       // バックプレッシャー制御
  };
}

interface RetryPolicy {
  maxAttempts: number;           // 最大試行回数
  baseDelay: number;             // 基本遅延 (ms)
  maxDelay: number;              // 最大遅延 (ms)
  exponentialBackoff: boolean;   // 指数バックオフ
  jitter: boolean;               // ジッター追加
}
```

### 6.3 メモリ管理

#### 6.3.1 メモリ使用量最適化
```typescript
interface MemoryOptimization {
  // オブジェクトプール
  objectPooling: {
    enabled: boolean;
    poolSize: number;            // プールサイズ
    maxAge: number;              // 最大保持時間 (ms)
  };

  // ガベージコレクション
  gcOptimization: {
    forceGC: boolean;            // 強制GC実行
    gcThreshold: number;         // GC実行閾値 (MB)
    lowMemoryMode: boolean;      // 低メモリモード
  };

  // ストリーミング
  streaming: {
    largeDataSets: boolean;      // 大規模データセット対応
    chunkProcessing: boolean;    // チャンク処理
    memoryThreshold: number;     // メモリ閾値 (MB)
  };
}
```

#### 6.3.2 メモリリーク対策
```typescript
interface MemoryLeakPrevention {
  // 自動クリーンアップ
  autoCleanup: {
    intervalMs: number;          // クリーンアップ間隔
    maxAge: number;              // 最大保持時間
    weakReferences: boolean;     // 弱参照使用
  };

  // リソース管理
  resourceTracking: {
    trackAllocations: boolean;   // メモリ割り当て追跡
    trackFileHandles: boolean;   // ファイルハンドル追跡
    trackConnections: boolean;   // 接続追跡
  };
}
```

### 6.4 ネットワーク最適化

#### 6.4.1 RPC最適化
```typescript
interface RPCOptimization {
  // 接続プール
  connectionPool: {
    maxConnections: number;      // 最大接続数
    keepAlive: boolean;          // Keep-Alive使用
    timeout: number;             // 接続タイムアウト (ms)
  };

  // リクエスト最適化
  requestOptimization: {
    batchRequests: boolean;      // バッチリクエスト
    compression: boolean;        // 圧縮使用
    retryLogic: RetryPolicy;     // リトライロジック
  };

  // キャッシュ戦略
  caching: {
    blockInfoCache: number;      // ブロック情報キャッシュ (秒)
    tokenInfoCache: number;      // トークン情報キャッシュ (秒)
    accountInfoCache: number;    // アカウント情報キャッシュ (秒)
  };
}
```

#### 6.4.2 帯域幅最適化
```typescript
interface BandwidthOptimization {
  // データ圧縮
  compression: {
    algorithm: 'gzip' | 'brotli';
    level: number;               // 圧縮レベル
    threshold: number;           // 圧縮閾値 (bytes)
  };

  // 差分更新
  deltaUpdates: {
    enabled: boolean;
    maxDeltaSize: number;        // 最大差分サイズ
    fallbackToFull: boolean;     // フル更新フォールバック
  };

  // 優先度制御
  prioritization: {
    criticalOperations: string[]; // 重要操作リスト
    throttleNonCritical: boolean; // 非重要操作の制限
  };
}
```

## 7. エラー処理設計

### 7.1 エラー分類

#### 7.1.1 エラーカテゴリ
```typescript
enum ErrorCategory {
  // ユーザー入力エラー
  USER_INPUT = 'user_input',

  // システムエラー
  SYSTEM = 'system',
  NETWORK = 'network',
  BLOCKCHAIN = 'blockchain',

  // ビジネスロジックエラー
  BUSINESS = 'business',
  VALIDATION = 'validation',

  // 外部依存エラー
  EXTERNAL_API = 'external_api',
  FILE_SYSTEM = 'file_system',

  // セキュリティエラー
  SECURITY = 'security',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization'
}
```

#### 7.1.2 エラーコード体系
```typescript
interface ErrorCode {
  category: ErrorCategory;
  code: string;
  httpStatus?: number;
  userMessage: string;
  technicalMessage: string;
  resolution: string;
  documentation?: string;
}

// エラーコード例
const ERROR_CODES: Record<string, ErrorCode> = {
  'USR_001': {
    category: ErrorCategory.USER_INPUT,
    code: 'INVALID_TOKEN_ADDRESS',
    userMessage: '無効なトークンアドレスが指定されました',
    technicalMessage: 'Token address validation failed: invalid format',
    resolution: '正しいSolanaトークンアドレスを指定してください'
  },

  'NET_001': {
    category: ErrorCategory.NETWORK,
    code: 'RPC_CONNECTION_FAILED',
    userMessage: 'Solanaネットワークに接続できません',
    technicalMessage: 'Failed to establish connection to Solana RPC endpoint',
    resolution: 'ネットワーク接続を確認し、RPC URLが正しいことを確認してください'
  },

  'BCH_001': {
    category: ErrorCategory.BLOCKCHAIN,
    code: 'INSUFFICIENT_BALANCE',
    userMessage: '残高が不足しています',
    technicalMessage: 'Wallet balance insufficient for transaction',
    resolution: 'ウォレットに十分な残高があることを確認してください'
  }
};
```

### 7.2 エラーハンドリング戦略

#### 7.2.1 エラー処理フロー
```typescript
interface ErrorHandler {
  // エラー捕獲
  catch(error: Error, context: ErrorContext): Promise<HandledError>;

  // エラー分類
  classify(error: Error): ErrorCategory;

  // エラー変換
  transform(error: Error): TributaryError;

  // エラー報告
  report(error: TributaryError): Promise<void>;

  // 復旧処理
  recover(error: TributaryError): Promise<RecoveryResult>;
}

interface ErrorContext {
  operation: string;            // 実行中の操作
  component: string;            // エラー発生コンポーネント
  user?: string;               // ユーザーID
  correlationId: string;       // 相関ID
  metadata: Record<string, any>; // 追加メタデータ
}

interface RecoveryResult {
  recovered: boolean;           // 復旧成功/失敗
  action: RecoveryAction;       // 実行された復旧アクション
  message: string;              // 復旧メッセージ
}

enum RecoveryAction {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  IGNORE = 'ignore',
  FAIL_FAST = 'fail_fast',
  USER_ACTION_REQUIRED = 'user_action_required'
}
```

#### 7.2.2 エラー復旧戦略
```typescript
interface RecoveryStrategy {
  // 自動復旧
  autoRecovery: {
    maxAttempts: number;         // 最大試行回数
    backoffStrategy: 'linear' | 'exponential';
    retryableErrors: string[];   // リトライ可能エラーコード
  };

  // フォールバック
  fallback: {
    alternativeEndpoints: string[];   // 代替エンドポイント
    degradedMode: boolean;            // 機能縮退モード
    cacheAsBackup: boolean;           // キャッシュをバックアップとして使用
  };

  // ユーザー通知
  notification: {
    immediateErrors: string[];        // 即座に通知するエラー
    batchErrors: string[];            // バッチで通知するエラー
    silentErrors: string[];           // サイレントエラー
  };
}
```

### 7.3 リトライ機構

#### 7.3.1 リトライポリシー
```typescript
interface RetryPolicy {
  // 基本設定
  maxAttempts: number;          // 最大試行回数
  baseDelay: number;            // 基本遅延時間 (ms)
  maxDelay: number;             // 最大遅延時間 (ms)

  // バックオフ戦略
  backoffStrategy: BackoffStrategy;
  jitter: boolean;              // ランダムジッター追加

  // 条件設定
  retryableErrors: string[];    // リトライ対象エラー
  nonRetryableErrors: string[]; // リトライ除外エラー

  // 回路ブレーカー
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;    // 失敗閾値
    timeoutMs: number;           // タイムアウト時間
    resetTimeoutMs: number;      // リセット時間
  };
}

enum BackoffStrategy {
  LINEAR = 'linear',
  EXPONENTIAL = 'exponential',
  FIBONACCI = 'fibonacci',
  CUSTOM = 'custom'
}
```

#### 7.3.2 操作別リトライ設定
```typescript
const RETRY_POLICIES: Record<string, RetryPolicy> = {
  // RPC呼び出し
  rpc_call: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffStrategy: BackoffStrategy.EXPONENTIAL,
    jitter: true,
    retryableErrors: ['NET_001', 'NET_002'],
    nonRetryableErrors: ['USR_001', 'SEC_001']
  },

  // トークン転送
  token_transfer: {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffStrategy: BackoffStrategy.LINEAR,
    jitter: false,
    retryableErrors: ['BCH_002', 'NET_001'],
    nonRetryableErrors: ['BCH_001', 'USR_001']
  },

  // ファイル操作
  file_operation: {
    maxAttempts: 3,
    baseDelay: 500,
    maxDelay: 5000,
    backoffStrategy: BackoffStrategy.EXPONENTIAL,
    jitter: true,
    retryableErrors: ['SYS_001', 'SYS_002'],
    nonRetryableErrors: ['USR_002', 'SEC_002']
  }
};
```

### 7.4 ユーザーフィードバック

#### 7.4.1 エラーメッセージ設計
```typescript
interface UserErrorMessage {
  // 基本情報
  title: string;                // エラータイトル
  message: string;              // エラーメッセージ
  severity: ErrorSeverity;      // 重要度

  // 詳細情報
  details?: string;             // 詳細説明
  cause?: string;               // 原因
  resolution: string;           // 解決方法

  // アクション
  actions: ErrorAction[];       // 実行可能アクション
  helpUrl?: string;             // ヘルプURL

  // 技術情報
  correlationId: string;        // 相関ID（サポート用）
  timestamp: Date;              // 発生時刻
}

enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

interface ErrorAction {
  label: string;                // アクションラベル
  action: string;               // アクション種別
  command?: string;             // 実行コマンド
  url?: string;                 // 参照URL
}
```

#### 7.4.2 プログレッシブディスクロージャー
```typescript
interface ErrorDisplay {
  // 段階的情報開示
  levels: {
    basic: string;              // 基本メッセージ
    detailed: string;           // 詳細メッセージ
    technical: string;          // 技術詳細
    debug: string;              // デバッグ情報
  };

  // 表示制御
  defaultLevel: 'basic' | 'detailed';
  allowExpansion: boolean;      // 詳細展開許可
  showTechnical: boolean;       // 技術情報表示

  // コンテキスト情報
  showContext: boolean;         // コンテキスト表示
  showSuggestions: boolean;     // 提案表示
  showRelatedErrors: boolean;   // 関連エラー表示
}
```

## 8. テスト設計

### 8.1 テスト戦略

#### 8.1.1 テストピラミッド
```typescript
interface TestStrategy {
  // テストレベル
  unitTests: {
    coverage: 90;               // カバレッジ目標 (%)
    framework: 'jest';          // テストフレームワーク
    mockStrategy: 'dependency_injection';
  };

  integrationTests: {
    coverage: 70;               // カバレッジ目標 (%)
    environment: 'devnet';      // テスト環境
    dataIsolation: true;        // データ分離
  };

  e2eTests: {
    coverage: 50;               // カバレッジ目標 (%)
    automation: true;           // 自動化
    environment: 'testnet';     // テスト環境
  };

  performanceTests: {
    loadTesting: true;          // 負荷テスト
    stressTesting: true;        // ストレステスト
    benchmark: true;            // ベンチマーク
  };
}
```

#### 8.1.2 テスト環境構成
```typescript
interface TestEnvironment {
  // 環境分離
  isolation: {
    database: 'memory';         // テスト用DB
    filesystem: 'temporary';    // 一時ファイルシステム
    network: 'mock';            // ネットワークモック
  };

  // テストデータ
  testData: {
    fixtures: string[];         // フィクスチャファイル
    factories: string[];        // ファクトリクラス
    seeds: string[];            // シードデータ
  };

  // モック設定
  mocks: {
    solanaRPC: MockConfig;      // Solana RPCモック
    externalAPIs: MockConfig;   // 外部APIモック
    filesystem: MockConfig;     // ファイルシステムモック
  };
}
```

### 8.2 単体テスト設計

#### 8.2.1 テスト構成
```typescript
// テストファイル構造
interface UnitTestStructure {
  // テストスイート
  suites: {
    'WalletCollector.test.ts': TestSuite;
    'DistributionEngine.test.ts': TestSuite;
    'TokenService.test.ts': TestSuite;
    'CLIInterface.test.ts': TestSuite;
    'ConfigManager.test.ts': TestSuite;
    'ReportGenerator.test.ts': TestSuite;
  };

  // 共通ユーティリティ
  utilities: {
    'testUtils.ts': TestUtilities;
    'mockFactory.ts': MockFactory;
    'fixtures.ts': TestFixtures;
  };
}

interface TestSuite {
  describe: string;             // テストスイート名
  beforeEach: SetupFunction;    // セットアップ
  afterEach: TeardownFunction;  // クリーンアップ
  testCases: TestCase[];        // テストケース
}
```

#### 8.2.2 テストケース例
```typescript
// WalletCollector テスト例
describe('WalletCollector', () => {
  let walletCollector: WalletCollector;
  let mockTokenService: jest.Mocked<ITokenService>;
  let mockConfigManager: jest.Mocked<IConfigManager>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockTokenService = createMockTokenService();
    mockConfigManager = createMockConfigManager();
    mockLogger = createMockLogger();

    walletCollector = new WalletCollector(
      mockTokenService,
      mockConfigManager,
      mockLogger
    );
  });

  describe('collectHolders', () => {
    it('should collect token holders successfully', async () => {
      // Arrange
      const params: CollectHoldersParams = {
        tokenAddress: 'TokenAddress123',
        minBalance: 100,
        useCache: false
      };

      const mockAccounts = createMockTokenAccounts(5);
      mockTokenService.getTokenAccounts.mockResolvedValue(mockAccounts);

      // Act
      const result = await walletCollector.collectHolders(params);

      // Assert
      expect(result).toHaveLength(5);
      expect(result[0].balance).toBeGreaterThanOrEqual(100);
      expect(mockTokenService.getTokenAccounts).toHaveBeenCalledWith(params.tokenAddress);
    });

    it('should filter holders by minimum balance', async () => {
      // テストケース実装
    });

    it('should use cached data when available', async () => {
      // テストケース実装
    });

    it('should handle empty holder list', async () => {
      // テストケース実装
    });

    it('should handle network errors gracefully', async () => {
      // テストケース実装
    });
  });
});
```

### 8.3 統合テスト設計

#### 8.3.1 統合テストシナリオ
```typescript
interface IntegrationTestScenario {
  // エンドツーエンドフロー
  endToEndFlow: {
    'complete_distribution_flow': {
      steps: [
        'initialize_project',
        'collect_token_holders',
        'execute_distribution',
        'generate_report'
      ];
      assertions: string[];
      cleanup: string[];
    };
  };

  // コンポーネント間連携
  componentIntegration: {
    'wallet_collector_token_service': {
      scenario: string;
      components: ['WalletCollector', 'TokenService'];
      mockDependencies: string[];
    };
  };

  // 外部依存テスト
  externalDependencies: {
    'solana_rpc_integration': {
      network: 'devnet';
      realConnections: boolean;
      fallbackMocks: boolean;
    };
  };
}
```

#### 8.3.2 データベース統合テスト
```typescript
// 統合テスト用データベースセットアップ
interface IntegrationTestDB {
  setup: {
    createTempDatabase: () => Promise<void>;
    seedTestData: () => Promise<void>;
    createIndexes: () => Promise<void>;
  };

  cleanup: {
    clearTestData: () => Promise<void>;
    dropTempDatabase: () => Promise<void>;
  };

  assertions: {
    verifyDataIntegrity: () => Promise<boolean>;
    checkConstraints: () => Promise<boolean>;
  };
}
```

### 8.4 E2Eテスト設計

#### 8.4.1 E2Eテストシナリオ
```typescript
interface E2ETestScenario {
  // ユーザージャーニー
  userJourneys: {
    'first_time_user_setup': {
      description: '初回ユーザーのセットアップフロー';
      steps: [
        'run_tributary_init',
        'configure_wallet',
        'verify_network_connection',
        'collect_sample_holders',
        'execute_test_distribution'
      ];
      expectedOutcomes: string[];
    };

    'experienced_user_workflow': {
      description: '経験者の通常ワークフロー';
      steps: [
        'load_existing_config',
        'collect_large_holder_set',
        'execute_batch_distribution',
        'generate_comprehensive_report'
      ];
      expectedOutcomes: string[];
    };
  };

  // エラーシナリオ
  errorScenarios: {
    'network_failure_recovery': {
      description: 'ネットワーク障害からの復旧';
      failurePoint: string;
      recoveryMechanism: string;
      expectedBehavior: string;
    };
  };
}
```

#### 8.4.2 E2Eテスト自動化
```typescript
interface E2EAutomation {
  // テスト実行環境
  environment: {
    containerized: boolean;      // コンテナ化
    parallelExecution: boolean;  // 並列実行
    cloudExecution: boolean;     // クラウド実行
  };

  // テストデータ管理
  testDataManagement: {
    dataGeneration: 'factory' | 'fixtures' | 'dynamic';
    dataCleanup: 'automatic' | 'manual';
    dataIsolation: boolean;
  };

  // レポート生成
  reporting: {
    format: 'html' | 'json' | 'junit';
    screenshots: boolean;        // スクリーンショット
    videoRecording: boolean;     // ビデオ録画
    performanceMetrics: boolean; // パフォーマンス指標
  };
}
```

## 9. 運用設計

### 9.1 ログ設計

#### 9.1.1 ログレベル定義
```typescript
enum LogLevel {
  DEBUG = 0,    // 詳細なデバッグ情報
  INFO = 1,     // 一般的な情報
  WARN = 2,     // 警告（処理は継続）
  ERROR = 3,    // エラー（処理は継続）
  FATAL = 4     // 致命的エラー（処理停止）
}

interface LogConfig {
  // 基本設定
  level: LogLevel;              // 出力レベル
  format: 'json' | 'text';      // 出力形式
  timestamp: boolean;           // タイムスタンプ

  // 出力先設定
  outputs: LogOutput[];         // 出力先リスト

  // ローテーション設定
  rotation: {
    enabled: boolean;
    maxSize: string;            // '10MB'
    maxFiles: number;           // 30
    compress: boolean;          // true
  };

  // フィルタリング
  filters: {
    excludePatterns: string[];  // 除外パターン
    includeOnlyPatterns: string[]; // 包含パターン
    sensitiveFields: string[];  // 機密フィールド
  };
}
```

#### 9.1.2 構造化ログ形式
```typescript
interface StructuredLog {
  // 基本フィールド
  timestamp: string;            // ISO8601形式
  level: string;                // ログレベル
  message: string;              // メッセージ

  // コンテキスト情報
  component: string;            // コンポーネント名
  operation: string;            // 操作名
  correlationId: string;        // 相関ID

  // メタデータ
  metadata: {
    userId?: string;            // ユーザーID
    sessionId?: string;         // セッションID
    requestId?: string;         // リクエストID
    version: string;            // アプリケーションバージョン
    environment: string;        // 実行環境
  };

  // パフォーマンス情報
  performance?: {
    duration: number;           // 実行時間 (ms)
    memoryUsage: number;        // メモリ使用量 (bytes)
    cpuUsage: number;           // CPU使用率 (%)
  };

  // エラー情報
  error?: {
    name: string;               // エラー名
    message: string;            // エラーメッセージ
    stack: string;              // スタックトレース
    code: string;               // エラーコード
  };
}
```

### 9.2 監視設計

#### 9.2.1 監視メトリクス
```typescript
interface MonitoringMetrics {
  // システムメトリクス
  system: {
    cpuUsage: GaugeMetric;      // CPU使用率
    memoryUsage: GaugeMetric;   // メモリ使用量
    diskUsage: GaugeMetric;     // ディスク使用量
    networkIO: CounterMetric;   // ネットワークI/O
  };

  // アプリケーションメトリクス
  application: {
    commandExecutions: CounterMetric;     // コマンド実行数
    distributionCount: CounterMetric;     // 配布実行数
    tokenTransfers: CounterMetric;        // トークン転送数
    errorCount: CounterMetric;            // エラー発生数
    responseTime: HistogramMetric;        // 応答時間
  };

  // ビジネスメトリクス
  business: {
    totalAmountDistributed: CounterMetric; // 総配布量
    uniqueRecipients: GaugeMetric;        // ユニーク受信者数
    successRate: GaugeMetric;             // 成功率
    averageTransactionCost: GaugeMetric;  // 平均手数料
  };
}

interface MetricDefinition {
  name: string;                 // メトリクス名
  type: 'counter' | 'gauge' | 'histogram';
  description: string;          // 説明
  labels: string[];             // ラベル
  unit?: string;                // 単位
}
```

#### 9.2.2 ヘルスチェック
```typescript
interface HealthCheck {
  // 基本ヘルスチェック
  basic: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: Date;
    version: string;
    uptime: number;             // 稼働時間 (秒)
  };

  // 詳細ヘルスチェック
  detailed: {
    dependencies: DependencyHealth[];
    resources: ResourceHealth[];
    services: ServiceHealth[];
  };

  // パフォーマンス指標
  performance: {
    responseTime: number;       // 応答時間 (ms)
    throughput: number;         // スループット
    errorRate: number;          // エラー率 (%)
    resourceUtilization: number; // リソース使用率 (%)
  };
}

interface DependencyHealth {
  name: string;                 // 依存関係名
  status: HealthStatus;         // ステータス
  latency: number;              // レイテンシ (ms)
  lastCheck: Date;              // 最終チェック時刻
  errorMessage?: string;        // エラーメッセージ
}
```

### 9.3 メンテナンス設計

#### 9.3.1 定期メンテナンス
```typescript
interface MaintenanceSchedule {
  // 日次メンテナンス
  daily: {
    logRotation: {
      time: '02:00';            // 実行時刻
      retention: 30;            // 保持日数
    };

    cacheCleanup: {
      time: '03:00';
      maxAge: 24;               // 最大保持時間 (時間)
    };

    backupVerification: {
      time: '04:00';
      testRestore: boolean;     // 復元テスト実行
    };
  };

  // 週次メンテナンス
  weekly: {
    performanceReport: {
      day: 'sunday';
      time: '01:00';
      recipients: string[];     // 送信先リスト
    };

    securityScan: {
      day: 'saturday';
      time: '02:00';
      scanTypes: string[];      // スキャン種別
    };
  };

  // 月次メンテナンス
  monthly: {
    systemUpdate: {
      day: 1;                   // 月の日
      time: '01:00';
      autoApprove: boolean;     // 自動承認
    };

    archiving: {
      day: 28;
      oldDataThreshold: 90;     // 日数閾値
    };
  };
}
```

#### 9.3.2 バックアップ戦略
```typescript
interface BackupStrategy {
  // 設定ファイルバックアップ
  configuration: {
    frequency: 'daily';
    retention: 30;              // 保持日数
    location: 'local' | 'cloud';
    encryption: boolean;
  };

  // ログファイルバックアップ
  logs: {
    frequency: 'weekly';
    retention: 90;              // 保持日数
    compression: boolean;
    archiveLocation: string;
  };

  // データバックアップ
  data: {
    frequency: 'daily';
    retention: 365;             // 保持日数
    incrementalBackup: boolean;
    verifyIntegrity: boolean;
  };

  // 復元手順
  restoration: {
    automatedRestore: boolean;
    testSchedule: 'monthly';
    documentationUrl: string;
  };
}
```

### 9.4 デプロイメント設計

#### 9.4.1 デプロイメント戦略
```typescript
interface DeploymentStrategy {
  // 環境管理
  environments: {
    development: EnvironmentConfig;
    testing: EnvironmentConfig;
    staging: EnvironmentConfig;
    production: EnvironmentConfig;
  };

  // デプロイメントパイプライン
  pipeline: {
    stages: DeploymentStage[];
    approvals: ApprovalConfig[];
    rollback: RollbackConfig;
  };

  // 配布方法
  distribution: {
    npm: NPMDistribution;
    binary: BinaryDistribution;
    docker: DockerDistribution;
    source: SourceDistribution;
  };
}

interface EnvironmentConfig {
  name: string;
  solanaNetwork: SolanaNetwork;
  rpcEndpoints: string[];
  logLevel: LogLevel;
  monitoring: boolean;
  autoScaling: boolean;
}

interface DeploymentStage {
  name: string;
  environment: string;
  prerequisites: string[];
  actions: DeploymentAction[];
  healthChecks: HealthCheck[];
  rollbackTriggers: string[];
}
```

#### 9.4.2 継続的インテグレーション
```typescript
interface CIConfig {
  // ビルドパイプライン
  build: {
    triggers: ['push', 'pull_request'];
    stages: [
      'lint',
      'test',
      'security_scan',
      'build',
      'package'
    ];
    artifacts: string[];
    cache: CacheConfig;
  };

  // テスト設定
  testing: {
    unitTests: {
      coverage: 90;
      parallelization: true;
    };

    integrationTests: {
      environment: 'docker';
      testData: 'generated';
    };

    e2eTests: {
      environment: 'staging';
      browsers: string[];
    };
  };

  // セキュリティ
  security: {
    dependencyScanning: boolean;
    secretsScanning: boolean;
    licenseCompliance: boolean;
    vulnerabilityAssessment: boolean;
  };
}
```

## 10. 実装ガイドライン

### 10.1 コーディング規約

#### 10.1.1 TypeScript規約
```typescript
// ファイル構成規約
interface FileStructure {
  // ファイル命名
  naming: {
    components: 'PascalCase';     // TokenService.ts
    utilities: 'camelCase';       // tokenUtils.ts
    constants: 'UPPER_SNAKE';     // CONFIG_CONSTANTS.ts
    types: 'PascalCase';          // UserTypes.ts
  };

  // インポート順序
  importOrder: [
    'node_modules',               // 外部ライブラリ
    'src/types',                  // 型定義
    'src/utils',                  // ユーティリティ
    'src/services',               // サービス
    'relative'                    // 相対インポート
  ];

  // エクスポート規約
  exports: {
    default: 'class' | 'function'; // デフォルトエクスポート
    named: 'interface' | 'type' | 'constant'; // 名前付きエクスポート
  };
}

// コード品質規約
interface CodeQuality {
  // 関数設計
  functions: {
    maxLength: 50;                // 最大行数
    maxParameters: 5;             // 最大パラメータ数
    pureFunction: boolean;        // 純粋関数推奨
    singleResponsibility: boolean; // 単一責任原則
  };

  // クラス設計
  classes: {
    maxLength: 200;               // 最大行数
    maxMethods: 20;               // 最大メソッド数
    composition: boolean;         // 継承より委譲
    immutable: boolean;           // 不変性重視
  };

  // コメント規約
  comments: {
    jsdoc: boolean;               // JSDoc必須
    complexity: boolean;          // 複雑な処理にはコメント
    publicAPI: boolean;           // パブリックAPIは詳細コメント
  };
}
```

#### 10.1.2 エラーハンドリング規約
```typescript
// エラーハンドリングパターン
interface ErrorHandlingConventions {
  // 例外設計
  exceptions: {
    customErrors: boolean;        // カスタムエラークラス使用
    errorChaining: boolean;       // エラーチェーン
    contextualInfo: boolean;      // コンテキスト情報付与
  };

  // 非同期エラー
  asyncErrors: {
    promiseRejection: 'explicit'; // 明示的なPromise rejection
    trycatchUsage: 'required';   // try-catch必須
    errorPropagation: 'controlled'; // 制御されたエラー伝播
  };

  // ログ出力
  errorLogging: {
    structured: boolean;          // 構造化ログ
    correlation: boolean;         // 相関ID
    sensitiveData: 'masked';      // 機密データマスク
  };
}
```

### 10.2 ディレクトリ構造

#### 10.2.1 プロジェクト構造
```
tributary/
├── src/                        # ソースコード
│   ├── types/                  # 型定義
│   │   ├── index.ts
│   │   ├── api.ts
│   │   ├── config.ts
│   │   └── errors.ts
│   ├── utils/                  # ユーティリティ
│   │   ├── crypto.ts
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── index.ts
│   ├── services/               # サービス層
│   │   ├── TokenService.ts
│   │   ├── ConfigManager.ts
│   │   ├── LoggerService.ts
│   │   └── index.ts
│   ├── components/             # アプリケーション層
│   │   ├── WalletCollector.ts
│   │   ├── DistributionEngine.ts
│   │   ├── ReportGenerator.ts
│   │   └── index.ts
│   ├── interfaces/             # インターフェース
│   │   ├── cli/
│   │   ├── api/
│   │   └── index.ts
│   ├── cli/                    # CLI実装
│   │   ├── commands/
│   │   ├── CLIInterface.ts
│   │   └── index.ts
│   ├── config/                 # 設定
│   │   ├── default.ts
│   │   ├── development.ts
│   │   ├── production.ts
│   │   └── index.ts
│   └── index.ts                # エントリーポイント
├── tests/                      # テストコード
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── fixtures/
│   └── utils/
├── docs/                       # ドキュメント
│   ├── api/
│   ├── guides/
│   └── examples/
├── scripts/                    # ビルド・デプロイスクリプト
├── configs/                    # 設定ファイル
│   ├── jest.config.js
│   ├── tsconfig.json
│   ├── eslint.config.js
│   └── prettier.config.js
├── dist/                       # ビルド成果物
├── coverage/                   # テストカバレッジ
├── node_modules/               # 依存関係
├── package.json
├── package-lock.json
├── README.md
├── CHANGELOG.md
├── LICENSE
└── .gitignore
```

#### 10.2.2 モジュール分割規則
```typescript
interface ModularDesign {
  // レイヤー分割
  layers: {
    presentation: 'cli/';        // UI層
    application: 'components/';  // アプリケーション層
    domain: 'services/';         // ドメイン層
    infrastructure: 'utils/';    // インフラ層
  };

  // 依存関係ルール
  dependencies: {
    direction: 'downward';       // 下向き依存のみ
    interfaces: 'abstraction';   // 抽象に依存
    circular: 'prohibited';      // 循環依存禁止
  };

  // モジュール設計
  modules: {
    cohesion: 'high';           // 高凝集
    coupling: 'low';            // 疎結合
    singlePurpose: boolean;     // 単一目的
  };
}
```

### 10.3 パッケージ依存関係

#### 10.3.1 依存関係管理
```json
{
  "dependencies": {
    "@solana/web3.js": "^1.87.6",
    "@solana/spl-token": "^0.3.8",
    "@metaplex-foundation/js": "^0.19.4",
    "commander": "^11.0.0",
    "inquirer": "^9.2.8",
    "chalk": "^5.3.0",
    "winston": "^3.10.0",
    "config": "^3.3.9",
    "dotenv": "^16.3.1",
    "axios": "^1.5.0",
    "csv-writer": "^1.6.0",
    "node-cache": "^5.1.2"
  },
  "devDependencies": {
    "@types/node": "^20.5.0",
    "@types/jest": "^29.5.4",
    "@types/inquirer": "^9.0.3",
    "typescript": "^5.1.6",
    "jest": "^29.6.2",
    "ts-jest": "^29.1.1",
    "eslint": "^8.47.0",
    "@typescript-eslint/parser": "^6.4.0",
    "@typescript-eslint/eslint-plugin": "^6.4.0",
    "prettier": "^3.0.2",
    "husky": "^8.0.3",
    "lint-staged": "^14.0.1",
    "ts-node": "^10.9.1",
    "nodemon": "^3.0.1"
  },
  "peerDependencies": {
    "node": ">=18.0.0"
  }
}
```

#### 10.3.2 依存関係セキュリティ
```typescript
interface DependencySecurity {
  // セキュリティ監査
  audit: {
    automated: boolean;         // 自動監査
    schedule: 'daily';          // 監査頻度
    severity: 'high';           // 対応重要度
  };

  // 更新戦略
  updates: {
    patch: 'automatic';         // パッチ更新
    minor: 'reviewed';          // マイナー更新
    major: 'manual';            // メジャー更新
  };

  // ライセンス管理
  licensing: {
    allowedLicenses: [
      'MIT',
      'Apache-2.0',
      'BSD-3-Clause'
    ];
    prohibitedLicenses: [
      'GPL-3.0',
      'AGPL-3.0'
    ];
  };
}
```

### 10.4 ビルド・パッケージング

#### 10.4.1 ビルド設定
```typescript
// TypeScript設定 (tsconfig.json)
interface BuildConfig {
  typescript: {
    target: 'ES2022';
    module: 'CommonJS';
    strict: true;
    esModuleInterop: true;
    skipLibCheck: true;
    forceConsistentCasingInFileNames: true;

    paths: {
      '@/*': ['src/*'];
      '@types/*': ['src/types/*'];
      '@utils/*': ['src/utils/*'];
    };
  };

  // ビルド最適化
  optimization: {
    minification: boolean;      // 最小化
    treeShaking: boolean;       // Tree shaking
    bundling: 'webpack' | 'esbuild';
    sourceMaps: boolean;        // ソースマップ
  };

  // 出力設定
  output: {
    directory: 'dist/';
    formats: ['cjs', 'esm'];
    declaration: boolean;       // 型定義ファイル生成
  };
}
```

#### 10.4.2 パッケージング戦略
```typescript
interface PackagingStrategy {
  // NPM パッケージ
  npm: {
    scope: '@tributary';
    registry: 'npmjs.org';
    access: 'public';
    files: [
      'dist/',
      'README.md',
      'LICENSE',
      'CHANGELOG.md'
    ];
  };

  // バイナリ パッケージ
  binary: {
    tool: 'pkg';
    targets: [
      'node18-linux-x64',
      'node18-macos-x64',
      'node18-win-x64'
    ];
    compression: 'gzip';
  };

  // Docker イメージ
  docker: {
    baseImage: 'node:18-alpine';
    multiStage: boolean;
    security: 'distroless';
    registry: 'ghcr.io';
  };

  // リリース管理
  release: {
    versioning: 'semantic';     // セマンティックバージョニング
    automation: 'github-actions';
    changelog: 'conventional-commits';
    assets: ['binary', 'npm', 'docker'];
  };
}
```