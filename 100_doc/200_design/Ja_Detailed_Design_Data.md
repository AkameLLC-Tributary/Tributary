# データ構造詳細設計書
# Tributary - Solana報酬配布システム

**更新日**: 2025-09-18
**更新者**: akameGusya

## 概要
本文書は、Tributaryシステムで使用される全データ構造の詳細仕様を定義する。ドメインモデル、永続化形式、データ変換ルール、および検証仕様を記述する。

## 1. ドメインモデル詳細

### 1.1 ウォレット関連データ

#### 1.1.1 WalletData
**目的**: トークン保有者の基本情報管理

**属性詳細**:
- **address**: string (必須)
  - 形式: Solana Base58 形式ウォレットアドレス
  - 長さ: 32-44文字
  - 検証: Base58 デコード可能性
  - 例: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"

- **balance**: number (必須)
  - 形式: 整数値（最小単位）
  - 範囲: 0 ≤ balance ≤ Number.MAX_SAFE_INTEGER
  - 精度: トークンのdecimalsに依存
  - 注意: 浮動小数点演算の回避

- **percentage**: number (必須)
  - 形式: 百分率（0-100）
  - 精度: 小数点以下6桁まで
  - 計算: (balance / totalSupply) * 100
  - 用途: 配布比率計算の基準値

- **lastUpdated**: Date (必須)
  - 形式: ISO 8601 形式
  - タイムゾーン: UTC固定
  - 用途: キャッシュ有効性判定
  - 更新: データ取得時に自動設定

- **isValid**: boolean (必須)
  - 初期値: true
  - 用途: アドレス有効性フラグ
  - 検証: Solana RPC による実在確認
  - 無効化: 検証失敗時または削除済みアカウント

**制約条件**:
- address は一意である必要がある
- balance が 0 の場合、percentage も 0 である
- 全 WalletData の percentage 合計は 100 となる
- lastUpdated は現在時刻以前である

#### 1.1.2 WalletFilter
**目的**: ウォレット収集時のフィルタリング条件

**属性詳細**:
- **minBalance**: number (任意)
  - デフォルト: 0
  - 用途: 最小保有量による足切り
  - 効果: 少額保有者の除外

- **maxBalance**: number (任意)
  - デフォルト: undefined（制限なし）
  - 用途: 最大保有量による上限設定
  - 効果: 大口保有者の除外

- **excludeAddresses**: string[] (任意)
  - デフォルト: []
  - 用途: 特定アドレスの除外
  - 例: コントラクトアドレス、バーンアドレス等

- **includeZeroBalance**: boolean (任意)
  - デフォルト: false
  - 用途: 残高0のアカウント含有制御
  - 効果: 完全な保有者リスト作成

### 1.2 配布関連データ

#### 1.2.1 DistributionConfig
**目的**: 配布処理の設定情報管理

**属性詳細**:
- **id**: string (必須)
  - 形式: "config_" + timestamp + "_" + random
  - 一意性: システム内で一意
  - 用途: 設定識別・履歴管理

- **projectName**: string (必須)
  - 長さ: 1-100文字
  - 文字種: 英数字、ハイフン、アンダースコア
  - 用途: ユーザー識別・表示名

- **baseTokenAddress**: string (必須)
  - 形式: Solana トークンアドレス
  - 用途: 保有量計算の基準トークン
  - 検証: 実在するSPLトークン

- **rewardTokenAddress**: string (必須)
  - 形式: Solana トークンアドレス
  - 用途: 実際に配布するトークン
  - 検証: 実在するSPLトークン

- **distributionRatio**: number (必須)
  - 範囲: 0 < ratio ≤ 1.0
  - 意味: 保有量に対する配布比率
  - 例: 0.1 = 保有量の10%を配布

- **minimumBalance**: number (必須)
  - 用途: 配布対象の最小保有量
  - 効果: 少額保有者の配布コスト削減

- **excludeAddresses**: string[] (必須)
  - 用途: 配布除外アドレスリスト
  - 例: 開発者アドレス、コントラクト等

- **autoDistribute**: boolean (必須)
  - 用途: 自動配布機能の有効性
  - 実装: 将来的なスケジューラー連携

- **schedule**: string (任意)
  - 形式: "daily", "weekly", "monthly", "custom"
  - 用途: 自動配布の頻度設定
  - 条件: autoDistribute が true の場合必須

- **createdAt**: Date (必須)
  - 設定: オブジェクト作成時自動設定
  - 不変: 作成後変更不可

- **updatedAt**: Date (必須)
  - 更新: 設定変更時自動更新
  - 用途: 変更履歴追跡

#### 1.2.2 DistributionResult
**目的**: 配布実行結果の詳細記録

**属性詳細**:
- **id**: string (必須)
  - 形式: "dist_" + timestamp + "_" + random
  - 用途: 実行結果の一意識別

- **configId**: string (必須)
  - 参照: DistributionConfig.id
  - 関係: 外部キー相当
  - 用途: 設定との関連付け

- **executedAt**: Date (必須)
  - 設定: 実行開始時刻
  - 精度: ミリ秒
  - 用途: 実行履歴管理

- **totalAmount**: number (必須)
  - 意味: 配布予定総額
  - 単位: トークンの最小単位
  - 検証: 実際の配布合計との整合性

- **recipientCount**: number (必須)
  - 意味: 配布対象者数
  - 検証: transactions配列長との一致

- **transactions**: TransactionRecord[] (必須)
  - 内容: 個別トランザクション結果
  - 順序: 実行順序を保持
  - 完全性: 全配布対象を含む

- **status**: DistributionStatus (必須)
  - 値: "pending", "completed", "failed", "partial"
  - 計算: transaction結果から自動算出
  - 更新: 実行完了時

- **errorMessage**: string (任意)
  - 条件: status が "failed" の場合
  - 内容: 失敗原因の詳細
  - 用途: 問題診断・対応策検討

#### 1.2.3 TransactionRecord
**目的**: 個別トランザクションの実行記録

**属性詳細**:
- **recipient**: string (必須)
  - 形式: Solana ウォレットアドレス
  - 検証: Base58 形式
  - 用途: 送金先識別

- **amount**: number (必須)
  - 意味: 送金額（最小単位）
  - 検証: 正の整数
  - 計算: 保有比率から算出

- **signature**: string (任意)
  - 形式: Solana トランザクション署名
  - 条件: 成功時のみ設定
  - 用途: ブロックチェーン上での検証

- **status**: TransactionStatus (必須)
  - 値: "pending", "confirmed", "failed"
  - 初期値: "pending"
  - 更新: 実行結果により変更

- **error**: string (任意)
  - 条件: status が "failed" の場合
  - 内容: 失敗理由の詳細
  - 例: "Insufficient funds", "Invalid recipient"

- **timestamp**: Date (必須)
  - 設定: トランザクション実行時刻
  - 用途: 時系列分析・デバッグ

### 1.3 設定関連データ

#### 1.3.1 ProjectConfig
**目的**: プロジェクト固有の設定管理

**属性詳細**:
- **name**: string (必須)
  - 制約: プロジェクト識別名
  - 用途: ディスプレイ・ファイル名生成

- **tokenAddress**: string (必須)
  - 制約: 基準となるトークンアドレス
  - 検証: 実在するSPLトークン

- **adminWallet**: string (必須)
  - 制約: 管理者ウォレットアドレス
  - 権限: 配布実行権限を持つアドレス

- **network**: string (必須)
  - 値: "devnet", "testnet", "mainnet-beta"
  - 用途: Solana ネットワーク指定

- **distributionConfig**: DistributionSettings (必須)
  - 内容: 配布に関する設定
  - ネスト: 下位設定オブジェクト

- **security**: SecuritySettings (必須)
  - 内容: セキュリティ関連設定
  - 重要度: 高（暗号化等の制御）

- **notification**: NotificationSettings (任意)
  - 内容: 通知設定
  - 用途: 実行結果の外部通知

#### 1.3.2 DistributionSettings
**目的**: 配布処理固有の設定

**属性詳細**:
- **schedule**: string (必須)
  - 値: "weekly", "daily", "monthly", "custom"
  - 用途: 定期実行頻度

- **rewardToken**: string (必須)
  - 意味: 配布するトークンの種類
  - 例: "USDC", "USDT", カスタムトークン

- **snapshotInterval**: string (必須)
  - 値: "daily", "weekly", "monthly"
  - 意味: 保有量スナップショット頻度

- **autoDistribute**: boolean (必須)
  - 意味: 自動配布機能の有効/無効
  - 実装: 将来的なスケジューラー対応

## 2. データ永続化仕様

### 2.1 ファイル形式

#### 2.1.1 JSON ファイル構造
**ファイル命名規則**:
- **設定ファイル**: `project.json`, `config_{id}.json`
- **データファイル**: `wallets.json`, `result_{id}.json`
- **キャッシュファイル**: `cache_{token_address}.json`

**JSON スキーマ**:
- **文字エンコーディング**: UTF-8
- **改行コード**: LF
- **インデント**: 2スペース
- **日時形式**: ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)

#### 2.1.2 ファイル配置構造
```
data/
├── project.json              # プロジェクト設定
├── wallets.json             # ウォレットデータ
├── configs/                 # 配布設定
│   ├── config_{id}.json
│   └── ...
├── results/                 # 実行結果
│   ├── result_{id}.json
│   └── ...
├── cache/                   # キャッシュデータ
│   ├── wallets_{token}.json
│   └── ...
└── logs/                    # ログファイル
    ├── error.log
    ├── combined.log
    └── audit.log
```

### 2.2 データ整合性

#### 2.2.1 参照整合性
**外部キー制約**:
- `DistributionResult.configId` → `DistributionConfig.id`
- `TransactionRecord.recipient` → `WalletData.address`

**整合性チェック**:
- 配布結果読み込み時の設定存在確認
- 孤立した設定ファイルの検出・警告
- データ修復機能の提供

#### 2.2.2 データ検証
**読み込み時検証**:
- JSON スキーマ準拠性
- 必須フィールド存在確認
- データ型適合性確認
- 値範囲チェック

**書き込み前検証**:
- 重複キー検出
- 循環参照チェック
- サイズ制限確認

### 2.3 バックアップ・復旧

#### 2.3.1 バックアップ戦略
**自動バックアップ**:
- 設定変更時の自動バックアップ
- 配布実行前のデータスナップショット
- 日次バックアップ（設定により）

**バックアップ形式**:
- 圧縮JSONファイル
- タイムスタンプ付きファイル名
- メタデータファイルとセット

#### 2.3.2 復旧機能
**データ復旧**:
- 破損ファイルの自動検出
- バックアップからの自動復旧
- 手動復旧コマンドの提供

**整合性復旧**:
- 不整合データの検出・報告
- 可能な範囲での自動修復
- 修復不可能な場合の詳細報告

## 3. データ変換・検証

### 3.1 入力データ変換

#### 3.1.1 外部データ取り込み
**Solana RPC データ**:
- アカウント情報の正規化
- 数値データの精度保証
- エンディアン変換（必要時）

**ユーザー入力データ**:
- 文字列トリム・正規化
- 数値フォーマット統一
- 日時形式統一

#### 3.1.2 データ型変換
**型安全な変換**:
- 文字列→数値変換時の検証
- 日時文字列のパース・検証
- ブール値の厳密な判定

**精度保持**:
- 浮動小数点演算の回避
- 整数演算による精度保証
- 丸め誤差の最小化

### 3.2 出力データ整形

#### 3.2.1 表示用データ変換
**数値フォーマット**:
- トークン単位への変換（decimals考慮）
- 小数点表示桁数の統一
- 通貨形式での表示（オプション）

**日時フォーマット**:
- ローカルタイムゾーン変換
- 人間可読形式での表示
- 相対時間表示（○分前等）

#### 3.2.2 国際化対応
**多言語対応準備**:
- メッセージキーによる管理
- 数値・日時の地域別フォーマット
- 文字エンコーディング統一

## 4. キャッシュ戦略

### 4.1 キャッシュ設計

#### 4.1.1 キャッシュ対象
**高頻度アクセスデータ**:
- ウォレット保有量情報
- トークンメタデータ
- 設定情報

**計算コストの高いデータ**:
- 保有者リスト
- 配布比率計算結果
- 統計情報

#### 4.1.2 キャッシュ戦略
**TTL（Time To Live）**:
- ウォレットデータ: 5分
- トークンメタデータ: 1時間
- 設定データ: キャッシュしない（常に最新）

**無効化戦略**:
- 時間ベース無効化
- 明示的無効化コマンド
- データ変更時の自動無効化

### 4.2 キャッシュ管理

#### 4.2.1 容量管理
**メモリキャッシュ**:
- 最大エントリ数制限
- LRU（Least Recently Used）による自動削除
- メモリ使用量監視

**ディスクキャッシュ**:
- 最大ファイルサイズ制限
- 古いキャッシュファイルの自動削除
- ディスク容量監視

#### 4.2.2 パフォーマンス最適化
**プリロード戦略**:
- 起動時の必要データ事前読み込み
- バックグラウンドでの更新処理
- 予測的なデータ取得

**圧縮・最適化**:
- JSON データの圧縮保存
- 差分更新による転送量削減
- インデックス情報の活用