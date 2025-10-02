# 基本設計書
# Tributary - Solana報酬配布システム

**更新日**: 2025-09-18
**更新者**: akameGusya

## 概要
TributaryシステムのTypeScript/Node.js実装における基本設計思想と設計判断の根拠を定義する。アーキテクチャの設計意図、コンポーネント間の関係性、システム全体の設計原則を記述し、実装フェーズにおける設計指針を提供する。

## 設計方針
本設計書では、システムアーキテクチャの設計意図、技術選択の根拠、および考慮すべき要件を体系的に整理する。設計判断の背景となる制約条件、品質要件、将来展望を明示し、実装および保守における一貫性のある判断基準を確立する。

## 1. アーキテクチャ設計

### 1.1 設計哲学と基本原則

#### 1.1.1 レイヤードアーキテクチャの採用
4層のレイヤードアーキテクチャ（Presentation、Application、Service、Infrastructure）を基本構造として採用する。

**採用根拠**:
- **責務の明確化**: 各層の責任範囲を明確に定義し、変更影響の局所化を実現
- **テスト戦略**: 層間の独立性により単体テストおよび結合テストの効率化を図る
- **技術進化への対応**: 外部技術（ブロックチェーン、UI技術等）の変更に対する耐性を確保
- **開発生産性**: 層別の並行開発により開発リードタイムを短縮

#### 1.1.2 依存性注入パターンの採用
コンストラクタインジェクションによる依存性注入を全コンポーネントに適用する。

**採用根拠**:
- **疎結合の実現**: インターフェースベースの依存関係により実装変更時の影響を最小化
- **テスト品質の向上**: モックオブジェクトの注入により包括的な単体テストを実現
- **設定管理の統一**: 依存関係の解決をアプリケーション起動時に一元化し保守性を向上

### 1.2 技術選択の設計判断

#### 1.2.1 TypeScript/Node.js技術スタックの選択
TypeScript/Node.jsを主要開発言語として採用する。

**選択根拠**:
- **型安全性の確保**: 静的型チェックによる実行時エラーの事前検出
- **開発効率の最大化**: 豊富なライブラリエコシステムと成熟した開発ツールチェーンの活用
- **Solana統合の最適化**: 公式SDK（@solana/web3.js）との自然な統合による開発リスクの軽減
- **技術スタック統一**: 将来的なフロントエンド開発との技術基盤共通化

#### 1.2.2 CLI主導アプローチの採用
コマンドラインインターフェースを第一次開発対象として位置付ける。

**採用根拠**:
- **運用自動化への適応**: CI/CDパイプラインおよび運用スクリプトとの統合容易性
- **開発速度の最適化**: GUI開発と比較した機能提供までのリードタイム短縮
- **操作の再現性**: スクリプト化による処理の標準化と再実行可能性の確保
- **問題解決効率**: コマンドライン操作による障害調査および復旧作業の迅速化

#### 1.2.3 依存ライブラリのバージョン選定方針

**バージョン選定基準**:
システムの安定性と保守性を確保するため、以下の基準に基づいて依存ライブラリのバージョンを選定する。

**メジャーバージョン選定**:
- **安定性重視**: リリースから6ヶ月以上経過し、重大な既知問題が解決されたバージョンを選択
- **LTS優先**: Long Term Support版が提供される場合は、LTS版を優先的に採用
- **セキュリティ対応**: 最新のセキュリティ更新が適用されているバージョンを選択

**Solana関連ライブラリ**:
- **@solana/web3.js**: Solana公式ライブラリの最新安定版を採用
- **@solana/spl-token**: SPLトークン操作の標準ライブラリ安定版を採用
- **互換性検証**: 各ライブラリ間のバージョン互換性を事前に検証し、動作確認済みの組み合わせを採用

**開発ツールチェーン**:
- **TypeScript**: 安定版最新を採用し、新機能の段階的導入を図る
- **Node.js**: 現行LTS版を基準とし、実行環境の統一を図る
- **テストフレームワーク**: Jest安定版を採用し、広範囲なコミュニティサポートを活用

## 2. コンポーネント設計思想

### 2.1 Wallet Collector の設計戦略

#### 2.1.1 コンポーネント設計目的
Solanaブロックチェーン上のトークン保有者情報を効率的に収集し、配布処理のための対象者リストを生成する。

**設計原則**:
- **単一責任の徹底**: ウォレット情報収集機能に特化し、配布ロジックとの責務分離を実現
- **性能要件の充足**: 大規模データセット処理に対応するスケーラブルなアルゴリズム設計
- **リソース最適化**: 重複処理の排除およびキャッシュ機構によるシステムリソース効率化

#### 2.1.2 処理方式の設計
**バッチ処理方式の採用**:
大量ウォレット処理（1000+件）において実用的な処理時間を達成するため、バッチ単位での並行処理を採用する。これにより外部RPCエンドポイントへの負荷分散と全体処理時間の最適化を実現する。

**段階的フィルタリング方式**:
データ処理の初期段階で条件に適合しない要素を除外することにより、後続処理におけるメモリ使用量削減と処理速度向上を図る。

### 2.2 Distribution Engine の設計戦略

#### 2.2.1 コンポーネント設計目的
公平かつ正確なトークン配布処理の実行および大規模配布における処理信頼性の確保を目的とする。

**設計要件**:
- **処理完全性**: 部分失敗に対する状態管理および復旧機能の実装
- **監査対応**: 全配布処理の完全な記録および追跡可能性の確保
- **処理規模**: 1000+受信者への効率的配布処理の実現

#### 2.2.2 配布アルゴリズム設計

**多様な配布戦略の統合設計**:
プロジェクトの成長段階と経済目標に応じた柔軟な配布戦略を実現するため、階層化された選択肢を提供する。

##### **配布タイプ別設計思想**

**固定量配布（均等配布）**:
- **設計目的**: 新規参入促進とコミュニティ拡大
- **技術的考慮**: シビル攻撃耐性とガス効率のトレードオフ
- **適用場面**: エアドロップ、初期コミュニティ形成期

**クラス分け配布**:
- **設計目的**: 段階的インセンティブによる健全な経済圏形成
- **境界値設計**: 動的調整可能な閾値設定による柔軟性確保
- **ゲーミング対策**: 境界線操作防止のための統計的監視機能

**比例配布**:
- **設計目的**: 数学的公平性と投資額に応じた報酬実現
- **精度保証**: 浮動小数点演算回避による厳密な配布総額制御
- **スケーラビリティ**: 大規模保有者群への効率的処理

##### **計算方式別設計判断**

**線形比例方式**:
- **計算効率**: O(n)の線形計算複雑度による高速処理
- **透明性**: 直感的理解が可能な計算ロジック
- **適用**: 従来の配当・ステーキング報酬システム

**対数配布方式**:
- **経済理論基盤**: 限界効用逓減法則の数学的実装
- **格差緩和**: 中間保有層への優遇による健全なエコシステム形成
- **計算最適化**: ルックアップテーブルによる対数計算効率化

**平方根配布方式**:
- **バランス設計**: 格差緩和と計算効率の最適化
- **数値安定性**: 整数演算による精度保証
- **スケーラビリティ**: 大規模配布における処理効率

##### **制限機能の設計**

**配布上限（Cap）設定**:
- **大口集中防止**: 市場への売り圧力分散
- **公平性確保**: 過度な富の集中抑制
- **動的調整**: 市場状況に応じた上限値自動調整機能

**配布下限（Floor）設定**:
- **参加インセンティブ**: 小口投資家の継続参加促進
- **処理効率**: 極小額配布の処理コスト最適化
- **ダスト攻撃対策**: 意図的な小額分散による攻撃防止

**バッチ実行アーキテクチャ**:
Solanaブロックチェーンの高スループット特性を活用し、複雑な配布計算処理を効率的に実行する。個別トランザクション失敗の全体への影響を防止し、処理進捗のリアルタイム監視機能を提供する。

#### 2.2.3 配布戦略選択の設計思想

**ユーザー自由選択原則**:
プロジェクトの固有要件と運営者の判断に基づく柔軟な配布戦略選択を支援するため、包括的な選択肢とカスタマイズ機能を提供する。

##### **プリセット機能の設計思想**

**設定複雑性の軽減**:
- **ワンクリック設定**: 複雑な数学的パラメータの自動設定
- **ベストプラクティス反映**: 経済理論と実証データに基づく推奨値
- **段階的移行**: 成長段階に応じた自動戦略提案機能

**カスタマイズ性との両立**:
- **プリセット拡張**: 基本プリセットをベースとしたカスタマイズ
- **パラメータ微調整**: 個別プロジェクトの特性に応じた調整機能
- **A/Bテスト支援**: 複数戦略の並行テストとパフォーマンス比較

##### **経済理論的根拠**

**行動経済学の応用**:
- **損失回避バイアス**: 下限設定による心理的安心感の提供
- **公平性知覚**: 対数・平方根配布による主観的公平性の向上
- **長期志向促進**: 段階的配布による短期売却圧力の軽減

**ゲーム理論的考慮**:
- **ナッシュ均衡**: 各配布戦略における参加者の最適戦略分析
- **協調ゲーム促進**: 配布方式による協調行動のインセンティブ設計
- **メカニズムデザイン**: 全体最適化を促す配布ルール設計

### 2.3 Token Service の抽象化戦略

#### 2.3.1 抽象化の設計意図
**設計目的**: Solanaブロックチェーンの技術的複雑性をアプリケーション層から隠蔽し、シンプルで一貫性のあるAPIを提供。

**抽象化レベルの設計判断**:
- **適切な抽象度**: 過度に抽象化せず、Solana固有の特徴を活かした設計
- **型安全性**: TypeScriptの型システムを活用したコンパイル時エラー防止
- **エラー処理統一**: ブロックチェーン固有のエラーの正規化

#### 2.3.2 ネットワーク管理の設計
**マルチネットワーク対応**:
- **開発フロー支援**: devnet → testnet → mainnet への段階的移行
- **設定の一元化**: ネットワーク切り替えの簡素化
- **環境分離**: 各環境での独立した動作保証

## 3. データ設計思想

### 3.1 データモデルの設計原則
**設計原則**:
- **完全性**: 監査要件を満たす包括的な情報記録
- **正規化**: データの一貫性と冗長性の排除
- **拡張性**: 将来的な機能追加に対応可能な構造

#### 3.1.1 配布設定データ構造

**配布ロジック設定モデル**:
```typescript
interface DistributionConfig {
  // 基本配布タイプ
  type: 'fixed' | 'tiered' | 'proportional';

  // 計算方式 (比例配布の場合)
  method?: 'linear' | 'logarithmic' | 'square_root';

  // 制限設定
  limits?: {
    cap?: number;     // 配布上限
    floor?: number;   // 配布下限
  };

  // クラス分け設定 (tiered配布の場合)
  tiers?: {
    boundaries: number[];
    methods: ('linear' | 'logarithmic' | 'square_root')[];
  };

  // プリセット識別
  preset?: 'startup' | 'growth' | 'mature' | string;

  // カスタムパラメータ
  customParams?: Record<string, any>;
}
```

**プロジェクト設定統合モデル**:
```typescript
interface ProjectConfig {
  project: {
    name: string;
    token_address: string;
    admin_wallet: string;
    network: 'devnet' | 'testnet' | 'mainnet-beta';
  };

  distribution: {
    schedule: 'daily' | 'weekly' | 'monthly' | 'custom';
    reward_token: string;
    snapshot_interval: string;
    auto_distribute: boolean;

    // 配布ロジック設定
    logic: DistributionConfig;
  };

  // スナップショット設定
  snapshot: {
    default_timing: 'immediate' | number; // 'immediate' または分数（1分以上）
    backup_timing: number; // フォールバック時の分数
    max_retry_minutes: number; // 最大リトライ時間範囲
  };

  // トランザクション実行設定
  transaction: {
    batch_size: number; // 1バッチあたりのトランザクション数 (1-100)
    max_concurrent_batches: number; // 同時実行バッチ数 (1-10)
  };

  // リトライ戦略設定
  retry: {
    max_attempts: number; // 最大リトライ回数 (1-10)
    initial_delay: number; // 初回リトライ遅延（秒）
    backoff_strategy: 'linear' | 'exponential' | 'fixed';
    max_delay: number; // 最大遅延時間（秒）
    timeout_seconds: number; // トランザクションタイムアウト
  };

  // マルチトークン重み付け設定
  multiTokenWeighting: {
    method: 'equal' | 'tiered' | 'proportional' | 'custom';
    calculation_base: 'source_holdings' | 'recipient_holdings';
    normalization_method: 'sum_to_one' | 'max_to_one' | 'none';
    tokens: Array<{
      mint: string;
      symbol: string;
      enabled: boolean;
    }>;
    config: MultiTokenWeightingConfig;
  };

  // マルチウォレット重み付け設定
  multiWalletWeighting: {
    method: 'unweighted' | 'custom' | 'proportional';
    max_wallets_per_user: number;
    min_holding_threshold: number;
    max_weight_per_user: number;
    user_identification: {
      method: 'manual_grouping' | 'signature_verification' | 'pda_authority';
      auto_detection: boolean;
      manual_groups: Array<{
        user_id: string;
        wallet_addresses: string[];
        custom_weight?: number;
      }>;
    };
    config: MultiWalletWeightingConfig;
  };

  // PDA構成設定
  pdaConfiguration: {
    mode: 'unified' | 'separated';
    maxRecordsPerPDA: number;
    autoExpansionEnabled: boolean;
    constructionTiming: 'library_deploy' | 'user_first_use' | 'hybrid';
  };

  security: {
    encrypt_keys: boolean;
    backup_enabled: boolean;
    audit_log: boolean;
  };
}
```

**配布履歴データモデル**:
```typescript
interface DistributionRecord {
  id: string;
  timestamp: number;
  project_id: string;

  // 配布設定のスナップショット
  config_snapshot: DistributionConfig;

  // 配布結果
  results: {
    total_recipients: number;
    total_amount: number;
    success_count: number;
    failure_count: number;
    transaction_ids: string[];
  };

  // 計算結果詳細
  calculations: Array<{
    wallet: string;
    holding_amount: number;
    calculated_reward: number;
    final_reward: number; // 制限適用後
    transaction_status: 'success' | 'failed' | 'pending';
  }>;
}

### 3.2 永続化戦略
**ファイルベース永続化の選択理由**:
- **シンプリシティ**: 外部データベース依存の回避
- **ポータビリティ**: 環境に依存しない実行可能性
- **セキュリティ**: ローカル制御によるデータ保護

## 4. セキュリティ設計原則

### 4.1 秘密鍵管理の戦略
**設計原則**:
- **最小権限**: 必要最小限の権限での実行
- **暗号化保存**: 業界標準の暗号化による秘密鍵保護
- **メモリ管理**: 使用後の即座なメモリクリア

### 4.2 監査証跡の設計
**監査要件対応**:
- **完全なログ記録**: 全ての重要操作の記録
- **改ざん検証**: ログの整合性確認機能
- **長期保存**: 法的要件を満たす保存期間の設定

## 5. パフォーマンス設計戦略

### 5.1 スケーラビリティの考慮事項
**大規模配布への対応**:
- **並行処理**: 独立処理の並行実行による時間短縮
- **メモリ効率**: ストリーミング処理による大量データ対応
- **キャッシュ戦略**: 頻繁アクセスデータの効率的な管理

### 5.2 Solanaネットワークの特性活用
**高スループットの活用**:
- **バッチ最適化**: Solanaの65,000 TPS能力の効果的利用
- **低レイテンシ**: 400ms以下の処理時間達成
- **コスト効率**: トランザクション費用の最小化

## 6. エラー処理とレジリエンス

### 6.1 障害対応の設計思想
**レジリエンス戦略**:
- **部分失敗対応**: 全体停止を避ける段階的処理
- **自動復旧**: 一時的障害からの自動回復機能
- **詳細診断**: 問題特定と対策提案の自動化

### 6.2 ユーザビリティとエラー通知
**エラー体験の設計**:
- **明確なメッセージ**: 技術者でない利用者にも理解可能な説明
- **対処法提示**: エラー発生時の具体的な解決策提示
- **段階的詳細**: 基本情報から詳細まで段階的な情報提供

## 7. 拡張性と将来展望

### 7.1 将来機能への対応設計
**拡張ポイント**:
- **マルチチェーン対応**: アーキテクチャレベルでの他チェーン対応準備
- **API化**: REST APIエンドポイントの追加対応
- **WebUI統合**: Webダッシュボードとの連携設計

### 7.2 コミュニティ開発への配慮
**オープンソース戦略**:
- **コントリビューション容易性**: 明確な責務分離による参加障壁の低減
- **ドキュメント充実**: 設計意図の明文化による理解促進
- **テスト容易性**: 新機能追加時の回帰テスト効率化

## 8. 運用設計の考慮事項

### 8.1 監視とアラート
**運用監視戦略**:
- **健全性監視**: システム稼働状況の継続的監視
- **パフォーマンス監視**: 処理性能の劣化検知
- **セキュリティ監視**: 異常アクセスパターンの検出

### 8.2 メンテナンス性の設計
**保守効率の向上**:
- **設定の外部化**: 実行時設定変更による柔軟性
- **ログの構造化**: 機械処理可能なログフォーマット
- **デバッグ支援**: 問題特定を支援する詳細情報の提供

## 9. マルチウォレットPDA設計

### 9.1 PDA構成選択の設計原則

#### 9.1.1 構成パターンの提供
マルチウォレット機能において、2つのPDA構成パターンを提供する。

**統合PDA構成**:
- 単一PDAでプロジェクト制御とデータ管理を統合
- 最大50ウォレットグループの管理
- シンプルな実装と管理

**分離PDA構成**:
- 処理PDĀ（制御専用）とデータPDA（データ専用）の分離
- データPDAの段階的拡張による容量制限回避
- 大規模データ管理への対応

#### 9.1.2 選択機能の実装
```typescript
interface PDAConfigurationManager {
  initializeProject(config: {
    mode: 'unified' | 'separated';
    maxRecordsPerPDA: number;
    constructionTiming: PDAConstructionTiming;
  }): Promise<PDAProjectResult>;

  switchConfiguration(
    currentMode: PDAMode,
    targetMode: PDAMode
  ): Promise<MigrationResult>;
}
```

### 9.2 データ構造設計

#### 9.2.1 統合PDA構造
```typescript
interface UnifiedPDA {
  projectMetadata: ProjectMetadata;
  walletGroups: WalletGroup[];  // 最大50グループ
  distributionHistory: DistributionRecord[];
  executionState: ExecutionState;
}
```

#### 9.2.2 分離PDA構造
**処理PDA**:
```typescript
interface ProcessingPDA {
  projectMetadata: ProjectMetadata;
  dataPDAReferences: DataPDAReference[];
  executionState: ExecutionState;
  accessControl: AccessControlConfig;
}
```

**データPDA**:
```typescript
interface DataPDA {
  pdaType: 'wallet_groups' | 'distribution_history';
  parentPDA: PublicKey;
  dataRecords: WalletGroup[] | DistributionRecord[];
  recordCount: number;
}
```

## 10. セキュリティアーキテクチャ設計

### 10.1 アクセス制御設計原則

#### 10.1.1 階層化されたアクセス制御
3段階のセキュリティレベルを提供し、利用者のニーズに応じた柔軟な権限管理を実現する。

**Simple Mode**:
- 基本的なread/write権限のみ
- 単一管理者による簡易運用

**Standard Mode**:
- 操作別権限設定
- 時限付き権限委譲
- 基本的な監査ログ

**Advanced Mode**:
- 詳細な権限マッピング
- 条件付き権限制御
- 緊急時アクセス機能

#### 10.1.2 権限管理データ構造
```typescript
interface AccessControlManager {
  // 権限レベル設定
  configureMode(mode: 'simple' | 'standard' | 'advanced'): Promise<void>;

  // 権限付与・削除
  grantPermission(config: {
    user: PublicKey;
    operations: OperationType[];
    level: 'read' | 'write' | 'admin';
    expiresAt?: Date;
  }): Promise<void>;

  revokePermission(user: PublicKey, operation: OperationType): Promise<void>;

  // 権限確認
  checkPermission(user: PublicKey, operation: OperationType): Promise<boolean>;

  // 緊急時アクセス
  enableEmergencyAccess(user: PublicKey, duration: number): Promise<void>;
}

interface PermissionConfig {
  user: PublicKey;
  operations: Map<OperationType, PermissionLevel>;
  expiresAt?: Date;
  delegatedBy?: PublicKey;
  emergencyAccess: boolean;
}
```

### 10.2 マルチシグネチャ設計

#### 10.2.1 操作別署名要件
操作の重要度に応じて異なる署名要件を設定し、セキュリティと利便性のバランスを実現する。

**署名要件設定**:
```typescript
interface MultisigManager {
  // マルチシグ設定
  configureOperation(config: {
    operation: OperationType;
    threshold: number;
    signers: PublicKey[];
    conditions?: MultisigConditions;
    timeout?: number;
  }): Promise<void>;

  // 署名プロセス管理
  initiateSignature(operationId: string, initiator: PublicKey): Promise<SignatureSession>;
  addSignature(sessionId: string, signer: PublicKey, signature: Uint8Array): Promise<void>;
  executeOperation(sessionId: string): Promise<ExecutionResult>;

  // 緊急時バイパス
  configureEmergencyBypass(conditions: EmergencyConditions): Promise<void>;
}

interface MultisigConditions {
  minAmount?: number;
  maxAmount?: number;
  timeWindow?: { start: Date; end: Date };
  userTypes?: UserType[];
}

interface SignatureSession {
  sessionId: string;
  operation: OperationType;
  threshold: number;
  currentSignatures: Map<PublicKey, Uint8Array>;
  status: 'pending' | 'approved' | 'executed' | 'expired';
  expiresAt: Date;
}
```

#### 10.2.2 階層的承認プロセス
重要な操作において段階的な承認プロセスを実装する。

**承認階層設計**:
```typescript
interface ApprovalHierarchy {
  levels: ApprovalLevel[];
  escalationRules: EscalationRule[];
}

interface ApprovalLevel {
  level: number;
  requiredSignatures: number;
  authorizedSigners: PublicKey[];
  autoAdvanceAfter?: number; // 秒
}

interface EscalationRule {
  condition: EscalationCondition;
  targetLevel: number;
  notificationRequired: boolean;
}
```

### 10.3 監査・ログ設計

#### 10.3.1 包括的監査ログ
全操作の完全な追跡可能性を確保し、セキュリティ監査要件に対応する。

**監査ログマネージャー**:
```typescript
interface AuditManager {
  // ログ記録
  recordOperation(event: AuditEvent): Promise<void>;

  // ログ検索・エクスポート
  searchLogs(criteria: SearchCriteria): Promise<AuditEvent[]>;
  exportLogs(format: 'json' | 'csv' | 'xml', options: ExportOptions): Promise<string>;

  // プライバシー保護
  maskSensitiveData(event: AuditEvent): AuditEvent;

  // レポート生成
  generateAuditReport(period: DateRange, template: ReportTemplate): Promise<AuditReport>;
}

interface AuditEvent {
  timestamp: Date;
  operation: OperationType;
  user: PublicKey;
  target?: PublicKey;
  parameters: Record<string, any>;
  result: 'success' | 'failure' | 'pending';
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}
```

#### 10.3.2 監査レポート機能
定期的な監査レポート生成により、セキュリティ状況の可視化を実現する。

**レポート生成機能**:
```typescript
interface AuditReporter {
  // 定期レポート
  generateComplianceReport(period: DateRange): Promise<ComplianceReport>;
  generateSecuritySummary(period: DateRange): Promise<SecuritySummary>;
  generateUserActivityReport(users: PublicKey[], period: DateRange): Promise<UserActivityReport>;

  // アラート機能
  configureSecurityAlerts(rules: SecurityAlertRule[]): Promise<void>;
  checkSecurityThresholds(): Promise<SecurityAlert[]>;
}

interface ComplianceReport {
  period: DateRange;
  totalOperations: number;
  operationsByType: Map<OperationType, number>;
  securityEvents: SecurityEvent[];
  permissionChanges: PermissionChange[];
  multisigUsage: MultisigUsage[];
  recommendations: string[];
}
```

### 10.4 セキュリティ統合設計

#### 10.4.1 セキュリティ設定統合
アクセス制御、マルチシグ、監査機能を統合的に管理する設計を採用する。

**統合セキュリティ設定**:
```typescript
interface SecurityConfigManager {
  // 統合設定
  initializeSecurity(config: SecurityConfiguration): Promise<void>;
  updateSecurityPolicy(policy: SecurityPolicy): Promise<void>;

  // セキュリティ状態確認
  getSecurityStatus(): Promise<SecurityStatus>;
  validateSecurityCompliance(): Promise<ComplianceResult>;

  // セキュリティ設定のバックアップ・復元
  backupSecurityConfig(): Promise<SecurityBackup>;
  restoreSecurityConfig(backup: SecurityBackup): Promise<void>;
}

interface SecurityConfiguration {
  accessControl: AccessControlConfig;
  multisig: MultisigConfig;
  audit: AuditConfig;
  encryption: EncryptionConfig;
  backup: BackupConfig;
}

interface SecurityStatus {
  accessControlActive: boolean;
  multisigConfigured: boolean;
  auditingEnabled: boolean;
  encryptionStatus: EncryptionStatus;
  lastSecurityCheck: Date;
  vulnerabilities: SecurityVulnerability[];
  recommendations: SecurityRecommendation[];
}
```

### 9.3 実装戦略

#### 9.3.1 容量管理
**統合PDA**:
- 1レコード113バイト × 50レコード = 5,650バイト
- 残り容量でメタデータと制御情報を管理

**分離PDA**:
- データPDA当たり約88レコード格納可能
- 必要に応じた動的拡張

#### 9.3.2 アクセスパターン
**読み取り操作**:
- 統合PDA: 単一アクセスで全データ取得
- 分離PDA: 必要なデータPDAのみ選択的アクセス

**書き込み操作**:
- 統合PDA: 単一トランザクションでの原子性保証
- 分離PDA: PDA間の整合性制御が必要

### 9.4 選択指針の技術的根拠

#### 9.4.1 構成決定要因
- ウォレットグループ数
- 配布頻度と履歴保持期間
- システム運用の複雑性許容度
- 将来的な拡張計画

#### 9.4.2 移行メカニズム
PDA構成間の移行を支援する機能を提供：
- 既存データの整合性検証
- 段階的データ移行
- 移行中の操作制限

## 11. 設定管理アーキテクチャ設計

### 11.1 設計方針

#### 11.1.1 統一化原則
全ての設定をTOML形式で統一し、階層化された構造による管理を実現する。

**設計判断根拠**:
- **可読性**: コメント対応と階層構造による設定内容の明確化
- **型安全性**: TypeScript型定義との連携による設定ミスの事前検出
- **拡張性**: 新機能追加時の設定構造が明確で一貫性を保持
- **保守性**: 単一形式による学習コストの削減

#### 11.1.2 環境分離原則
開発・本番環境の設定を明確に分離し、環境固有の設定変更を局所化する。

**設計判断根拠**:
- **リスク分離**: 本番環境設定への影響を防止
- **開発効率**: 環境切り替えの自動化により開発生産性を向上
- **設定検証**: 環境別の設定妥当性チェックを実現

### 11.2 設定管理アーキテクチャ

#### 11.2.1 設定ファイル構成
```
config/
├── default.toml          # ベース設定（必須）
├── development.toml      # 開発環境固有設定
├── production.toml       # 本番環境固有設定
├── parameters.toml       # ユーザーカスタマイズ設定
└── README.md            # 設定管理ドキュメント
```

#### 11.2.2 優先順位制御メカニズム
```typescript
interface ConfigurationManager {
  // 設定の読み込みと優先順位適用
  loadConfig(): Promise<TributaryConfig>;

  // 環境変数による上書き制御
  applyEnvironmentVariables(config: TributaryConfig): void;

  // 設定のマージ処理
  mergeConfigs(...configs: Partial<TributaryConfig>[]): TributaryConfig;

  // 環境切り替え
  setEnvironment(environment: string): void;
}
```

### 11.3 設定値解決メカニズム

#### 11.3.1 優先順位制御
1. **環境変数** (最高優先度) - `TRIBUTARY_{SECTION}_{KEY}`
2. **parameters.toml** (ユーザーカスタマイズ)
3. **{環境}.toml** (環境固有設定)
4. **default.toml** (ベース設定)

#### 11.3.2 型安全性の確保
```typescript
interface TributaryConfig {
  network: NetworkConfig;
  distribution: DistributionConfig;
  logging: LoggingConfig;
  security: SecurityConfig;
  pda_capacity: PDACapacityConfig;
}

// 各設定セクションの型定義により
// 実行時エラーを事前に検出
```

### 11.4 設定検証メカニズム

#### 11.4.1 多層検証アプローチ
- **構文検証**: TOML形式の妥当性チェック
- **型検証**: TypeScript型定義との整合性確認
- **ビジネスルール検証**: 設定値の業務ロジック妥当性チェック
- **環境整合性検証**: 環境間設定の一貫性確認

#### 11.4.2 設定変更影響分析
設定変更時の影響範囲を事前分析し、安全な設定変更を支援：
- 依存関係チェック
- 設定値範囲検証
- 環境間差分分析

### 11.5 実装戦略

#### 11.5.1 段階的移行アプローチ
既存設定システムからの移行を段階的に実施：
1. **共存期間**: 新旧システムの併用により安定性を確保
2. **検証期間**: 新システムの動作確認と課題抽出
3. **完全移行**: 旧システムの廃止と新システムへの統一

#### 11.5.2 後方互換性の考慮
旧設定形式との互換性を一定期間維持し、ユーザーの移行負荷を軽減：
- フォールバック機能による旧設定読み込み
- 警告メッセージによる移行促進
- 自動変換機能の提供

