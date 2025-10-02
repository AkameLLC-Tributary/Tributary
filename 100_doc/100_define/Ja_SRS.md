# ソフトウェア要件定義書 (SRS)
# Tributary - Solana報酬配布システム

**更新日**: 2025-09-18
**更新者**: akameGusya

## 概要
Tributaryは、事前に任意に配布したトークンの所有量を基に任意のトークンを配布するシステムである

## 1. はじめに

### 1.1 目的
本書は、Tributaryプロジェクトにおけるプロジェクト協力者へのトークン発行と利益の自動配布を行うSolanaベースのシステムの要件を定義します。

### 1.2 適用範囲
Solanaブロックチェーンを活用したCLI特化のOSSツールとして開発し、高速かつ低コストなトランザクション処理を実現します。

### 1.3 用語定義
- **SPL**: Solana Program Library - Solanaのトークン規格
- **CLI**: Command Line Interface - コマンドライン操作
- **OSS**: Open Source Software - オープンソースソフトウェア
- **MVP**: Minimum Viable Product - 最小実用版
- **TPS**: Transactions Per Second - 1秒あたりの取引数

## 2. プロダクト概要

### 2.1 主要機能
1. 配布先ウォレットの自動収集
2. トークン保有量に基づくトークン配布
3. 設定に基づく任意トークンの自動配分
4. 全操作対応のCLIインターフェース

### 2.2 利用者分類
- **プロジェクト管理者**: 配布設定の構成・管理
- **トークン受領者**: トークンと報酬の受領

## 3. システム要件

### 3.1 機能要件

#### 3.1.1 ウォレット収集機能
- **FR-1.1**: 指定したトークンの保有者ウォレットアドレスを自動収集できること
- **FR-1.2**: 保有量の閾値を設定して対象ウォレットをフィルタリングできること
- **FR-1.3**: 収集したウォレット情報を保存・管理できること
- **FR-1.4**: スナップショット取得時間を選択できること（即時・時間指定）
- **FR-1.5**: 時間指定の場合、分単位で過去ブロックを指定できること（1分以上、RPCプロバイダーの履歴保持期間内）

#### 3.1.2 配布管理機能
- **FR-2.1**: トークン保有量に基づいて配布比率を計算できること
- **FR-2.2**: 任意のトークンを指定して配布できること
- **FR-2.3**: 設定に基づいて自動配布を実行できること
- **FR-2.4**: 定期配布スケジュールの設定ができること（スケジュール実行はユーザ実装、ログ出力のみ基盤提供）
- **FR-2.5**: 配布実行ログを出力できること（履歴保存はせず、ログ出力のみ。履歴管理はユーザ実装）
- **FR-2.6**: バッチサイズを設定してトランザクション実行を最適化できること
- **FR-2.7**: 失敗時のリトライ戦略をパラメータで設定できること

#### 3.1.7 マルチトークン重み付け機能
- **FR-7.1**: 複数トークンを基準とした重み付け配布を実行できること
- **FR-7.2**: 重み付け手法を選択できること（均等・クラス分け・比例・カスタム）
- **FR-7.3**: 比率計算基準を選択できること（配布元保有率・配布先保有総量）
- **FR-7.4**: カスタム計算式による重み付けを設定できること
- **FR-7.5**: 重み付け結果をシミュレーションできること
- **FR-7.6**: 複数トークンの保有量を統合的に管理できること

#### 3.1.8 マルチウォレット重み付け機能
- **FR-8.1**: 複数ウォレットを統合した重み付け配布を実行できること
- **FR-8.2**: ウォレット重み付け手法を選択できること（重みなし・カスタム・比率）
- **FR-8.3**: ユーザーのウォレットグループを管理できること
- **FR-8.4**: 出資トークン量と配布対象トークン量の比率調整ができること
- **FR-8.5**: ウォレット分散による不公平を防止できること
- **FR-8.6**: マルチウォレット統合結果をシミュレーションできること

#### 3.1.9 マルチウォレットPDA管理機能
- **FR-9.1**: PDA構成パターンをユーザーが選択できること（統合PDA / 分離PDA）
- **FR-9.2**: 統合PDAパターンで最大30ウォレットグループを管理できること（超過時は自動または手動で分離PDA構成へ移行、ユーザ認証パラメータ付与）
- **FR-9.3**: 分離PDAパターンで処理PDAとデータPDAを分離管理できること
- **FR-9.4**: ウォレット毎の配布元・配布対象トークン情報を管理できること
- **FR-9.5**: 配布承認状態をPDAで制御できること
- **FR-9.6**: 配布実行の現在状態をPDAで管理できること（履歴記録はログ出力のみ、保存はユーザ実装）
- **FR-9.7**: 選択したPDA構成に応じた最適な実装を提供できること
- **FR-9.8**: 統合PDA容量超過時の分離PDA構成移行ができること（自動/手動選択可能）
- **FR-9.9**: PDA構成移行時のユーザ認証確認ができること

#### 3.1.10 アクセス制御機能
- **FR-10.1**: 権限管理モードをユーザーが選択できること（Simple/Standard/Advanced）
- **FR-10.2**: 操作種別に応じた権限制御を設定できること
- **FR-10.3**: 権限の委譲機能を設定できること（永続・期限付き・操作限定）
- **FR-10.4**: 緊急時特別権限を設定できること
- **FR-10.5**: カスタム権限マッピングを定義できること

#### 3.1.11 マルチシグネチャ機能
- **FR-11.1**: 複数署名要件をユーザーが設定できること（None/Basic/Standard/Advanced）
- **FR-11.2**: 操作別署名要件を設定できること
- **FR-11.3**: 条件付き署名要件を設定できること（金額・時間ベース）
- **FR-11.4**: 階層的承認プロセスを設定できること
- **FR-11.5**: 緊急時バイパス機能を設定できること
- **FR-11.6**: 署名者グループの動的管理ができること

#### 3.1.12 監査・ログ機能
- **FR-12.1**: 監査レベルをユーザーが選択できること（Minimal/Standard/Comprehensive/Custom）
- **FR-12.2**: ログレベルを設定できること（Error/Warn/Info/Debug/Trace）
- **FR-12.3**: 操作別ログ設定ができること
- **FR-12.4**: ログ出力先を設定できること（Console/File/PDA/External）
- **FR-12.5**: プライバシー保護設定ができること
- **FR-12.6**: 監査レポート生成ができること

#### 3.1.13 承認・確認プロセス機能
- **FR-13.1**: 配布承認ワークフローを設定できること（単一承認/複数承認）
- **FR-13.2**: 承認者を動的に指定できること（ユーザー設定）
- **FR-13.3**: 承認期限を設定できること
- **FR-13.4**: 承認拒否時の対応を設定できること
- **FR-13.5**: 全ウォレット所有者の承認を必須とできること
- **FR-13.6**: 承認プロセスの状態管理ができること
- **FR-13.7**: 承認セッションのタイムアウト処理ができること

#### 3.1.14 配布実行制御機能
- **FR-14.1**: 配布実行の一時停止ができること
- **FR-14.2**: 配布実行の再開ができること
- **FR-14.3**: バッチ単位での実行制御ができること
- **FR-14.4**: エラー時の自動停止ができること
- **FR-14.5**: 実行権限の管理ができること
- **FR-14.6**: エラー閾値の設定ができること

#### 3.1.15 配布イベント管理機能
- **FR-15.1**: 配布イベントのキャンセルができること
- **FR-15.2**: キャンセル権限を設定できること
- **FR-15.3**: キャンセル時の状態復旧ができること
- **FR-15.4**: 配布状態の管理ができること（Draft/Pending/Approved/InProgress/Paused/Completed/Failed/Cancelled/PartiallyCompleted）

#### 3.1.16 同時実行制御機能
- **FR-16.1**: 複数操作の同時実行時に排他制御ができること
- **FR-16.2**: プロジェクト単位でのロック制御ができること
- **FR-16.3**: 配布実行中の設定変更を防止できること
- **FR-16.4**: ロック競合時の適切なエラー処理ができること

#### 3.1.17 緊急制御機能
- **FR-17.1**: 配布実行中の緊急停止ができること（権限者：ユーザ設定・PDA作成者）
- **FR-17.2**: 緊急停止の範囲選択ができること（全体/部分停止をユーザ設定）
- **FR-17.3**: 強制キャンセル機能が利用できること（条件・権限レベルをユーザ設定）
- **FR-17.4**: 実行中配布への影響制御ができること（ユーザパラメータによる設定）
- **FR-17.5**: 停止後の復旧手順をユーザが実装できること（カスタムロジック対応）
- **FR-17.6**: 補償・復旧の仕組みをユーザが実装できること（カスタムロジック対応）
- **FR-17.7**: 緊急操作の権限管理ができること（ユーザ設定による権限制御）
- **FR-17.8**: 緊急操作の監査証跡を記録できること（停止理由記録は不要）

#### 3.1.18 通知機能
- **FR-18.1**: 状態変更時のオンチェーンログ出力ができること（基盤提供）
- **FR-18.2**: ログレベル（INFO/WARNING/ERROR）の設定ができること（基盤提供）
- **FR-18.3**: イベントフック機能が利用できること（基盤提供、ハンドラーはユーザ実装）
- **FR-18.4**: 外部通知ロジックを実装できること（メール・webhook等は完全にユーザ実装）
- **FR-18.5**: 通知対象者設定機能が利用できること（ユーザ実装、設定保存のみ基盤提供）
- **FR-18.6**: 通知内容詳細度をユーザが制御できること（ログフォーマット設定のみ基盤提供）
- **FR-18.7**: 通知履歴保存機能が利用できること（ログ出力のみ基盤、保存先はユーザ制御）

#### 3.1.22 承認・確認要請通知機能
- **FR-22.1**: 承認要請イベントログ出力ができること（基盤提供、外部送信はユーザ実装）
- **FR-22.2**: リマインダーイベントログ出力ができること（基盤提供、リマインダー実行はユーザ実装）
- **FR-22.3**: 期限切れイベントログ出力ができること（基盤提供、期限切れ処理はユーザ実装）
- **FR-22.4**: 承認状況変更ログ出力ができること（基盤提供、可視化はユーザ実装）
- **FR-22.5**: 承認関連イベントフックが利用できること（基盤提供、ハンドラーはユーザ実装）

#### 3.1.23 操作履歴・監査機能
- **FR-23.1**: 配布制御操作の完全な記録ができること（ユーザ実装）
- **FR-23.2**: 記録対象操作の範囲をユーザが設定できること
- **FR-23.3**: 操作理由の記録機能が利用できること（ユーザ実装）
- **FR-23.4**: 記録の改ざん防止機能が利用できること（ユーザ実装）
- **FR-23.5**: アクセス権限管理ができること（ユーザ実装）

#### 3.1.24 配布決定プロセス記録機能
- **FR-24.1**: 意思決定過程の記録ができること（ユーザ実装）
- **FR-24.2**: 承認プロセスの記録詳細度をユーザが制御できること
- **FR-24.3**: 否認理由の記録ができること（ユーザ実装）
- **FR-24.4**: 変更履歴の追跡ができること（ユーザ実装）
- **FR-24.5**: 監査レポート生成機能が利用できること（ユーザ実装）

#### 3.1.19 ユーザビリティ機能
- **FR-19.1**: 設定状況の可視化ができること
- **FR-19.2**: 推奨値の提示機能が利用できること
- **FR-19.3**: 詳細なエラーメッセージが表示されること
- **FR-19.4**: 解決手順の提示機能が利用できること
- **FR-19.5**: 自動修復の提案機能が利用できること

#### 3.1.20 配布承認ワークフロー機能
- **FR-20.1**: 配布承認プロセスの設定ができること（単一承認/複数承認）
- **FR-20.2**: 承認者の指定ができること（アカウントID、トークン数量条件）
- **FR-20.3**: 承認期限の設定ができること
- **FR-20.4**: 承認拒否時の処理ができること
- **FR-20.5**: 承認状況の確認ができること

#### 3.1.21 配布内容確認機能
- **FR-21.1**: 実行前の配布明細表示ができること（ユーザ設定による表示要否制御）
- **FR-21.2**: 配布内容の変更検知ができること（変更内容をログ出力）
- **FR-21.3**: 確認者の記録ができること（ユーザ設定による記録要否制御）
- **FR-21.4**: 確認期限の設定ができること（ユーザ設定によるタイムアウト制御）
- **FR-21.5**: 配布明細の詳細度をユーザが制御できること
- **FR-21.6**: 変更検知時の通知レベルを設定できること

#### 3.1.6 配布ロジック機能
- **FR-6.1**: 固定量配布（均等配布）を実行できること
- **FR-6.2**: クラス分け配布を実行できること
- **FR-6.3**: 比例配布を実行できること
- **FR-6.4**: 計算方式として線形比例・対数・平方根を選択できること
- **FR-6.5**: 配布上限・下限を設定できること
- **FR-6.6**: 配布ロジックの組み合わせをプリセットとして保存できること

#### 3.1.3 CLIインターフェース機能
- **FR-3.1**: `tributary init` - プロジェクト初期設定コマンド
- **FR-3.2**: `tributary collect` - ウォレット収集コマンド
- **FR-3.3**: `tributary distribute` - 手動配布実行コマンド
- **FR-3.4**: `tributary distribute auto` - 自動配布設定コマンド
- **FR-3.5**: `tributary config show` - 設定確認コマンド
- **FR-3.6**: `tributary help` - ヘルプ表示コマンド
- **FR-3.7**: `tributary config set-distribution` - 配布ロジック設定コマンド
- **FR-3.8**: `tributary simulate distribution` - 配布ロジックシミュレーションコマンド
- **FR-3.9**: `tributary config set-pda-mode` - PDA構成モード設定コマンド
- **FR-3.10**: `tributary multi-wallet init --pda-mode <unified|separated>` - マルチウォレット初期化コマンド
- **FR-3.37**: `tributary pda migrate` - PDA構成移行コマンド（統合→分離）
- **FR-3.38**: `tributary pda capacity` - PDA容量確認コマンド
- **FR-3.11**: `tributary security configure` - セキュリティ設定コマンド
- **FR-3.12**: `tributary security permissions` - 権限管理コマンド
- **FR-3.13**: `tributary security multisig` - マルチシグ設定コマンド
- **FR-3.14**: `tributary security audit` - セキュリティ監査コマンド
- **FR-3.15**: `tributary security logs` - 監査ログ確認コマンド
- **FR-3.16**: `tributary control emergency-stop` - 緊急停止コマンド（全体/部分停止選択可能）
- **FR-3.17**: `tributary control force-cancel` - 強制キャンセルコマンド（ユーザ定義条件対応）
- **FR-3.18**: `tributary control pause` - 配布一時停止コマンド
- **FR-3.19**: `tributary control resume` - 配布再開コマンド
- **FR-3.20**: `tributary status show` - 詳細ステータス表示コマンド
- **FR-3.21**: `tributary help troubleshoot` - トラブルシューティングガイドコマンド
- **FR-3.22**: `tributary approval configure` - 承認プロセス設定コマンド
- **FR-3.23**: `tributary approval request` - 承認要請コマンド
- **FR-3.24**: `tributary approval approve` - 承認実行コマンド
- **FR-3.25**: `tributary approval reject` - 承認拒否コマンド
- **FR-3.26**: `tributary approval status` - 承認状況確認コマンド
- **FR-3.27**: `tributary distribution preview` - 配布内容プレビューコマンド
- **FR-3.28**: `tributary distribution confirm` - 配布内容確認コマンド
- **FR-3.29**: `tributary distribution changes` - 配布内容変更履歴コマンド
- **FR-3.30**: `tributary notification configure` - 通知設定コマンド
- **FR-3.31**: `tributary notification test` - 通知テストコマンド
- **FR-3.32**: `tributary notification history` - 通知履歴確認コマンド
- **FR-3.33**: `tributary audit configure` - 監査設定コマンド
- **FR-3.34**: `tributary audit operations` - 操作履歴確認コマンド
- **FR-3.35**: `tributary audit process` - 決定プロセス履歴コマンド
- **FR-3.36**: `tributary audit report` - 監査レポート生成コマンド

#### 3.1.4 設定管理機能
- **FR-4.1**: ウォレット設定を安全に保存できること
- **FR-4.2**: 複数プロジェクトの設定を管理できること
- **FR-4.3**: 設定パラメータの検証ができること
- **FR-4.4**: 設定のインポート・エクスポートができること
- **FR-4.5**: PDAデータとローカル設定の整合性を保証できること
- **FR-4.6**: マルチウォレットプロジェクト設定のバックアップ・復元ができること

#### 3.1.5 レポート・監視機能
- **FR-5.1**: 配布状況のレポートを生成できること
- **FR-5.2**: トランザクション履歴を確認できること
- **FR-5.3**: エラーログを記録・参照できること

### 3.2 非機能要件

#### 3.2.1 性能要件
- **NFR-1.1**: トランザクション処理時間は400ms以下であること
- **NFR-1.2**: 最大65,000 TPS（Solana性能）をサポートすること
- **NFR-1.3**: 1回の配布コストは$0.0002以下であること
- **NFR-1.4**: 1,000人への同時配布が5分以内に完了すること

#### 3.2.2 拡張性要件
- **NFR-2.1**: 1配布あたり1,000名以上の受信者を処理できること
- **NFR-2.2**: 複数プロジェクトの同時運用をサポートすること
- **NFR-2.3**: 将来的な他チェーン対応が可能な設計であること
- **NFR-2.4**: 統合PDA構成で最大30ウォレットグループを効率管理できること（容量制約対応）
- **NFR-2.5**: 分離PDA構成で容量制限を超える大規模管理ができること
- **NFR-2.6**: PDA構成の選択により利用者ニーズに柔軟対応できること
- **NFR-2.7**: 構成変更時のデータ移行が可能な設計であること

#### 3.2.3 信頼性要件
- **NFR-3.1**: システム稼働率99.9%以上を維持すること
- **NFR-3.2**: 全トランザクションがSolanaブロックチェーンで検証可能であること
- **NFR-3.3**: 包括的なエラーハンドリング機能を提供すること
- **NFR-3.4**: 自動リトライ機能を実装すること

#### 3.2.4 セキュリティ要件
- **NFR-4.1**: 秘密鍵を業界標準の暗号化で保護すること
- **NFR-4.2**: 全トランザクションを暗号学的に署名すること
- **NFR-4.3**: 全ユーザー入力の検証を実施すること
- **NFR-4.4**: 監査ログを記録・保持すること
- **NFR-4.5**: アクセス制御機能により権限分離を実現すること
- **NFR-4.6**: マルチシグネチャによる承認プロセスを提供すること
- **NFR-4.7**: 全操作のアクセスログを完全記録すること
- **NFR-4.8**: 権限の委譲・取消機能を安全に実装すること
- **NFR-4.9**: セキュリティ設定の階層化により柔軟性と安全性を両立すること
- **NFR-4.10**: 複数操作の同時実行時にデータ整合性を保証すること
- **NFR-4.11**: 配布実行中の緊急停止・強制キャンセル機能を提供すること
- **NFR-4.12**: 状態変更時のオンチェーンログ出力機能を提供すること（外部通知は一切行わず、ログ出力のみ）

#### 3.2.5 使いやすさ要件
- **NFR-5.1**: CLIコマンドは標準UNIX規約に従うこと
- **NFR-5.2**: 明確なエラーメッセージとヘルプを提供すること
- **NFR-5.3**: 初期設定は5分以内で完了できること
- **NFR-5.4**: 日本語・英語の多言語対応を行うこと
- **NFR-5.5**: 設定状況の可視化と推奨値提示機能を提供すること
- **NFR-5.6**: エラー時の解決手順提示と自動修復提案機能を提供すること

## 4. システム構成

### 4.1 技術スタック
- **ブロックチェーン**: Solana
- **プログラミング言語**: TypeScript/Node.js
- **CLIフレームワーク**: Commander.js
- **Solana SDK**: @solana/web3.js, @solana/spl-token
- **設定管理**: config, dotenv
- **ログ管理**: winston
- **ビルドツール**: TypeScript, esbuild
- **パッケージング**: pkg (Binary化)

### 4.2 コアコンポーネント
1. **Wallet Collector**: ウォレットアドレス収集
2. **Distribution Engine**: 報酬計算・配布ロジック
3. **Token Service**: Solanaトークン操作
4. **CLI Interface**: コマンド処理・ユーザー対話
5. **Config Manager**: 設定・認証情報管理
6. **Report Generator**: レポート生成・履歴管理

### 4.3 外部連携
- **Solana RPC**: メインネット・テストネット・デベロップネット
- **Token Metadata**: @metaplex-foundation/js
- **Price Oracle**: CoinGecko/Jupiter API
- **フロントエンド**: REST API/GraphQL連携

## 5. 実装フェーズ

### 5.1 Phase 1: MVP (4週間)
**Week 1-2: コア機能**
- [ ] 基本CLIコマンド実装
- [ ] ウォレット収集機能
- [ ] トークン配布機能

**Week 3-4: 改善とドキュメント**
- [ ] エラーハンドリング
- [ ] ドキュメント作成
- [ ] テスト実装

### 5.2 Phase 2: OSS公開・改善
- [ ] GitHubでの公開
- [ ] コミュニティ構築開始
- [ ] バグ修正と品質改善
- [ ] ユーザーフィードバック対応

### 5.3 Phase 3: 機能拡張
- [ ] 自動配布機能
- [ ] Web UI開発
- [ ] API提供
- [ ] 他チェーン対応検討

### 5.4 Phase 4: エコシステム構築
- [ ] プラグインシステム
- [ ] 外部ツール連携
- [ ] コミュニティ主導開発
- [ ] 長期メンテナンス体制

## 6. 受入基準

### 6.1 MVP完成基準
- [ ] 全CLIコマンドがSolanaテストネットで正常動作
- [ ] トークン作成から配布まで完全なエンドツーエンドテスト完了
- [ ] 包括的ドキュメント整備完了
- [ ] 単体テストカバレッジ80%以上
- [ ] 性能要件を満たすベンチマーク完了

### 6.2 成功指標
- [ ] トランザクションコスト $0.0002以下
- [ ] 処理時間 400ms以下
- [ ] CLI設定時間 5分以下
- [ ] 重大なセキュリティ脆弱性ゼロ
- [ ] ユーザー満足度 4.0/5.0以上

### 6.3 品質基準
- [ ] コードレビュー100%実施
- [ ] 自動テスト全パス
- [ ] セキュリティ監査完了
- [ ] パフォーマンステスト完了
- [ ] ドキュメント品質確認完了

## 7. リスクと対策

### 7.1 技術リスク
| リスク | 可能性 | 影響度 | 対策 |
|--------|--------|--------|------|
| Solanaネットワーク障害 | 低 | 中 | 複数RPC対応、障害時対応 |
| 秘密鍵管理の脆弱性 | 中 | 高 | 業界標準暗号化、監査実施 |
| スケーラビリティ不足 | 低 | 中 | 分散処理設計、負荷テスト |

### 7.2 規制・市場リスク
| リスク | 可能性 | 影響度 | 対策 |
|--------|--------|--------|------|
| 規制変更 | 低 | 高 | 複数地域対応、法務アドバイザー |
| 市場変化 | 中 | 中 | 技術の汎用性確保 |
| 採用の遅れ | 中 | 中 | OSS戦略で障壁除去 |

## 8. 付録

### 8.1 コマンドリファレンス

#### 基本コマンド
```bash
# プロジェクト初期化
tributary init --name "MyProject" --network devnet

# ウォレット収集
tributary collect --token TokenAddress --threshold 100

# 設定確認
tributary config show
tributary config export --output config.toml
```

#### 配布実行コマンド

**基本配布**
```bash
# シンプル配布
tributary distribute --token USDC --amount 10000

# 完全指定配布
tributary distribute --token USDC --amount 10000 \
  --snapshot 5 \
  --batch-size 25 \
  --concurrent-batches 3 \
  --retry-max 3 \
  --retry-delay 2 \
  --retry-backoff exponential \
  --retry-timeout 60
```

**スナップショット設定**
```bash
# 即時取得（デフォルト）
tributary distribute --token USDC --amount 10000 --snapshot immediate

# 時間指定取得（分単位、1分以上）
tributary distribute --token USDC --amount 10000 --snapshot 5   # 5分前
tributary distribute --token USDC --amount 10000 --snapshot 30  # 30分前
tributary distribute --token USDC --amount 10000 --snapshot 120 # 2時間前
```

**バッチ処理設定**
```bash
# バッチサイズ指定（1-100）
tributary distribute --token USDC --amount 10000 --batch-size 25

# 同時実行バッチ数指定（1-10）
tributary distribute --token USDC --amount 10000 --concurrent-batches 5

# 組み合わせ指定
tributary distribute --token USDC --amount 10000 --batch-size 20 --concurrent-batches 3
```

**リトライ戦略設定**
```bash
# リトライ回数指定（1-10）
tributary distribute --token USDC --amount 10000 --retry-max 5

# リトライ遅延設定
tributary distribute --token USDC --amount 10000 --retry-delay 3

# バックオフ戦略指定
tributary distribute --token USDC --amount 10000 --retry-backoff linear      # 線形増加
tributary distribute --token USDC --amount 10000 --retry-backoff exponential # 指数的増加
tributary distribute --token USDC --amount 10000 --retry-backoff fixed      # 固定間隔

# タイムアウト設定
tributary distribute --token USDC --amount 10000 --retry-timeout 90
```

#### 配布ロジック設定
```bash
# 配布タイプ設定
tributary config set-distribution --type fixed        # 固定量配布
tributary config set-distribution --type tiered       # クラス分け配布
tributary config set-distribution --type proportional # 比例配布

# 比例配布の計算方式
tributary config set-distribution --type proportional --method linear       # 線形比例
tributary config set-distribution --type proportional --method logarithmic  # 対数配布
tributary config set-distribution --type proportional --method square_root  # 平方根配布

# 配布制限設定
tributary config set-distribution --type proportional --cap 1000 --floor 10

# プリセット使用
tributary config set-distribution --preset startup  # スタートアップ推奨
tributary config set-distribution --preset growth   # 成長期推奨
tributary config set-distribution --preset mature   # 成熟期推奨
```

#### シミュレーション・テスト
```bash
# 配布シミュレーション
tributary simulate distribution --amount 10000 --preview

# ドライラン実行（実際のトランザクションなし）
tributary distribute --token USDC --amount 10000 --dry-run

# テストネット実行
tributary distribute --token USDC --amount 10000 --network testnet
```

#### 自動配布設定
```bash
# 自動配布有効化
tributary distribute auto --schedule weekly --token USDC

# 自動配布停止
tributary distribute auto --disable

# 自動配布ステータス確認
tributary distribute auto --status
```

#### マルチトークン重み付け
```bash
# 重み付け設定
tributary weight configure --method equal --tokens "SOL,USDC,PROJECT"
tributary weight configure --method proportional --calculation-method logarithmic --base recipient_holdings
tributary weight configure --method custom --formula "SOL * 0.4 + USDC * 0.3 + PROJECT * 0.3"

# マルチトークン配布実行
tributary distribute multi-token --amount 10000 --tokens "SOL,USDC,PROJECT" --weight-config weights.toml

# 重み付けシミュレーション
tributary weight simulate --config weight-config.toml --sample-wallets sample.csv
```

#### マルチウォレット管理
```bash
# ウォレットグループ設定
tributary multi-wallet group add --user-id "user001" --wallets "wallet1,wallet2,wallet3"
tributary multi-wallet group remove --user-id "user001" --wallet "wallet2"
tributary multi-wallet group list

# マルチウォレット重み付け設定
tributary multi-wallet configure --method unweighted --aggregation simple_sum
tributary multi-wallet configure --method proportional --distribution-type proportional --calculation-method logarithmic
tributary multi-wallet configure --method custom --formula "baseToken * sqrt(investmentToken)"

# マルチウォレット配布実行
tributary distribute multi-wallet --amount 10000 --user-groups groups.toml
tributary multi-wallet simulate --config multi-wallet.toml --sample-groups sample-groups.csv
```

#### レポート・監査
```bash
# 配布履歴確認
tributary report history --days 30

# 配布結果詳細
tributary report distribution --id <distribution_id>

# エラーログ確認
tributary report errors --since yesterday
```

#### セキュリティ管理
```bash
# セキュリティ設定
tributary security configure --level standard --encryption aes256 --backup enabled

# 権限管理
tributary security permissions grant --user wallet-address --operation distribute --level admin
tributary security permissions revoke --user wallet-address --operation distribute
tributary security permissions list --user wallet-address

# マルチシグ設定
tributary security multisig create --threshold 2 --signers "addr1,addr2,addr3"
tributary security multisig configure --operation distribute --threshold 3 --timeout 3600
tributary security multisig status --operation distribute

# セキュリティ監査
tributary security audit --comprehensive --output audit-report.json
tributary security audit --check-permissions --date-range "2025-09-01:2025-09-30"

# 監査ログ確認
tributary security logs --operation all --level info --output console
tributary security logs --operation distribute --date-range "2025-09-01:2025-09-30" --format json
tributary security logs --export --output audit-logs.csv --privacy-mask
```

### 8.2 設定ファイル形式
```toml
[project]
name = "MyProject"
token_address = "TokenAddress..."
admin_wallet = "WalletAddress..."
network = "mainnet-beta"  # devnet, testnet, mainnet-beta

[distribution]
schedule = "weekly"  # daily, weekly, monthly, custom
reward_token = "USDC"
snapshot_interval = "daily"
auto_distribute = true  # 設定保存のみ、自動実行はユーザ実装（外部スケジューラー等）

[snapshot]
default_timing = "immediate"  # immediate, または分数（1分以上、RPCプロバイダー依存）
backup_timing = 3  # フォールバック時の分数

[transaction]
batch_size = 20  # 1バッチあたりのトランザクション数 (1-100)
max_concurrent_batches = 3  # 同時実行バッチ数 (1-10)

[retry]
max_attempts = 3  # 最大リトライ回数 (1-10)
initial_delay = 1  # 初回リトライ遅延（秒）
backoff_strategy = "exponential"  # linear, exponential, fixed
max_delay = 30  # 最大遅延時間（秒）
timeout_seconds = 60  # トランザクションタイムアウト

[distribution_logic]
type = "proportional"  # fixed, tiered, proportional
method = "logarithmic"  # linear, logarithmic, square_root
cap = 1000  # 配布上限（オプション）
floor = 1   # 配布下限（オプション）
preset = "startup"  # startup, mature, enterprise（オプション）

[multi_token_weighting]
method = "proportional"  # equal, tiered, proportional, custom
calculation_base = "recipient_holdings"  # source_holdings, recipient_holdings
normalization_method = "sum_to_one"  # sum_to_one, max_to_one, none

[[multi_token_weighting.tokens]]
mint = "So11111111111111111111111111111111111111112"
symbol = "SOL"
enabled = true

[[multi_token_weighting.tokens]]
mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
symbol = "USDC"
enabled = true

[multi_token_weighting.proportional_config]
method = "logarithmic"  # linear, logarithmic, square_root
scaling_factors = { SOL = 1.0, USDC = 0.8 }

[multi_wallet_weighting]
method = "proportional"  # unweighted, custom, proportional
max_wallets_per_user = 10
min_holding_threshold = 1.0
max_weight_per_user = 1000000

[multi_wallet_weighting.user_identification]
method = "manual_grouping"  # manual_grouping, signature_verification, pda_authority
auto_detection = false

[[multi_wallet_weighting.user_identification.manual_groups]]
user_id = "user001"
wallet_addresses = [
  "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "8yKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsV"
]
custom_weight = 1.0

[multi_wallet_weighting.proportional_config]
distribution_type = "proportional"  # fixed, tiered, proportional
calculation_method = "logarithmic"  # linear, logarithmic, square_root
reference_metric = "combined_ratio"  # base_token, investment_token, combined_ratio

[multi_wallet_weighting.proportional_config.combination_ratio]
base_token_weight = 0.6
investment_token_weight = 0.4

[distribution_tiers]  # type = "tiered"の場合のみ
enable = false
boundaries = [100, 1000, 10000]  # クラス境界値
tier_methods = ["linear", "logarithmic", "square_root"]  # 各クラスの計算方式

[security]
encrypt_keys = true
backup_enabled = true
audit_log = true

[access_control]
mode = "standard"  # simple, standard, advanced
default_permissions = "read"  # read, write, admin
delegation_enabled = true
emergency_access = true

[[access_control.permissions]]
user = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
operations = ["distribute", "config", "collect"]
level = "admin"
expires_at = "2025-12-31T23:59:59Z"  # オプション

[multisig]
enabled = true
mode = "standard"  # none, basic, standard, advanced
default_threshold = 2
timeout_seconds = 3600

[[multisig.operations]]
operation = "distribute"
threshold = 3
signers = [
  "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "8yKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsV",
  "9zLXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsW"
]
conditions = { min_amount = 1000, max_amount = 100000 }

[[multisig.operations]]
operation = "config_change"
threshold = 2
signers = [
  "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "8yKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsV"
]

[audit]
level = "standard"  # minimal, standard, comprehensive, custom
log_level = "info"  # error, warn, info, debug, trace
output_destinations = ["console", "file", "pda"]
file_path = "./logs/audit.log"
privacy_masking = true
retention_days = 90

[audit.operations]
collect = "info"
distribute = "info"
config_change = "warn"
security_change = "warn"
emergency_access = "error"

[notification]
# 基本設定（ログ出力のみ基盤提供）
enabled = true
log_output_only = true  # 基盤はログ出力のみ
external_notification_logic = "user_implemented"  # 外部通知は完全にユーザ実装

# ログ出力設定（基盤提供）
on_chain_log = true
log_level = "info"  # error, warn, info, debug, trace

# 外部通知設定（ユーザ実装のための設定値保存のみ）
target_users = [
  "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "8yKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsV"
]

# 通知内容詳細度（ユーザ制御）
detail_level = "standard"  # minimal, standard, comprehensive
include_timestamp = true
include_transaction_details = true
include_error_details = true

# 通知履歴設定（ユーザ制御）
save_notification_history = true
history_retention_days = 30
history_storage = "user_controlled"  # local, pda, external

# 状態変更通知設定
state_change_notifications = true
notify_on_status = ["approved", "in_progress", "completed", "failed", "cancelled"]

# 承認・確認要請通知設定（ログ出力のみ基盤提供）
approval_request_log = true  # 承認要請イベントログ
reminder_log = true  # リマインダーイベントログ
timeout_log = true  # 期限切れイベントログ
status_change_log = true  # 承認状況変更ログ

# 外部通知実行（完全にユーザ実装）
approval_request_logic = "user_implemented"
reminder_logic = "user_implemented"
timeout_handling_logic = "user_implemented"
status_visualization_logic = "user_implemented"

# 外部通知設定例（基盤は保存のみ、実行は完全にユーザ実装）
email = "admin@example.com"  # 設定値保存のみ、メール送信はユーザ実装
webhook_url = "https://api.example.com/webhook"  # 設定値保存のみ、webhook呼び出しはユーザ実装
slack_channel = "#rewards"  # 設定値保存のみ、Slack投稿はユーザ実装

# イベントフック設定（基盤提供）
event_hooks = [
  "on_state_change",
  "on_approval_request",
  "on_distribution_complete",
  "on_error"
]
custom_event_handlers = []  # ユーザ定義ハンドラー

[operation_audit]
# 操作履歴・監査設定（ユーザ実装）
enabled = true
audit_implementation = "user_implemented"  # ユーザがロジック実装

# 記録対象操作設定（ユーザ設定）
record_operations = [
  "distribute",
  "approve",
  "reject",
  "emergency_stop",
  "force_cancel",
  "config_change"
]
operation_scope = "user_configurable"

# 操作理由記録設定（ユーザ実装）
record_reasons = true
reason_recording_logic = "user_implemented"

# 記録改ざん防止設定（ユーザ実装）
tamper_protection = true
tamper_protection_logic = "user_implemented"

# アクセス権限管理（ユーザ実装）
access_control = true
access_control_logic = "user_implemented"

[decision_process_audit]
# 配布決定プロセス記録（ユーザ実装）
enabled = true
process_recording_logic = "user_implemented"

# 承認プロセス記録詳細度（ユーザ制御）
approval_detail_level = "standard"  # minimal, standard, comprehensive
record_approval_timeline = true
record_approver_details = true

# 否認理由記録（ユーザ実装）
record_rejection_reasons = true
rejection_recording_logic = "user_implemented"

# 変更履歴追跡（ユーザ実装）
track_changes = true
change_tracking_logic = "user_implemented"

# 監査レポート生成（ユーザ実装）
generate_audit_reports = true
report_generation_logic = "user_implemented"
report_formats = ["json", "csv", "pdf"]  # ユーザ実装で対応

[concurrent_control]
enabled = true
lock_timeout_seconds = 300
deadlock_detection = true
max_concurrent_operations = 1

[emergency_control]
enabled = true

# 緊急停止設定
emergency_stop_authority = [
  "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",  # ユーザ設定権限者
  "pda_creator"  # PDA作成者も権限保持
]
stop_scope = "configurable"  # full, partial, configurable
default_stop_scope = "full"  # 全体停止がデフォルト
allow_partial_stop = true

# 強制キャンセル設定
force_cancel_enabled = true
force_cancel_conditions = "user_defined"  # ユーザがロジック作成
force_cancel_authority_level = "admin"  # ユーザ設定
force_cancel_threshold = 2  # マルチシグ閾値
impact_on_running_distribution = "user_configurable"  # ユーザパラメータ

# 復旧・補償設定
recovery_logic = "user_implemented"  # ユーザがロジック実装
compensation_logic = "user_implemented"  # ユーザがロジック実装
custom_recovery_hooks = []  # カスタムロジック用フック

# 監査設定
record_emergency_actions = true
record_reasons = false  # 停止理由記録は不要
audit_level = "action_only"  # アクションのみ記録

[logging]
level = "info"  # error, warn, info, debug, trace
on_chain_log = true
event_hooks = true
custom_handlers = []

[usability]
show_recommendations = true
error_guidance = true
auto_repair_suggestions = true
status_visualization = true

[pda_capacity_management]
# PDA容量制約対応設定
max_wallet_groups_unified = 30  # 統合PDA最大グループ数
auto_migrate_on_capacity = false  # 容量超過時自動移行（デフォルト無効）
require_user_confirmation = true  # 移行時ユーザ認証要求
capacity_warning_threshold = 80  # 容量警告閾値（%）
capacity_monitoring = true  # 容量監視有効

# 履歴管理設定（ログ出力のみ）
history_storage = "log_only"  # ログ出力のみ、PDAには保存しない
log_distribution_events = true
log_approval_events = true
log_operation_events = true
history_implementation = "user_managed"  # 履歴管理はユーザ実装

[approval_workflow]
enabled = true
type = "configurable"  # single, multi, configurable
timeout_hours = 24
rejection_handling = "per_approver"  # automatic, per_approver

[[approval_workflow.approvers]]
account_id = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
token_amount_condition = 1000  # 最小トークン数量条件
required = true

[[approval_workflow.approvers]]
account_id = "8yKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsV"
token_amount_condition = 500
required = false

[distribution_confirmation]
enabled = true

# 配布明細表示設定（ユーザ制御）
show_details = true
detail_level = "standard"  # minimal, standard, comprehensive
include_wallet_addresses = true
include_amounts = true
include_calculations = false

# 変更検知設定
change_detection = true
change_log_level = "warn"  # info, warn, error
log_change_details = true

# 確認者記録設定（ユーザ制御）
record_confirmers = true
require_confirmation_signature = false
confirmation_message_required = false

# 確認期限設定（ユーザ制御）
confirmation_timeout_hours = 2
timeout_action = "cancel"  # cancel, proceed, prompt
send_reminder = true
reminder_interval_minutes = 30
```

### 8.3 エラーコード一覧
| コード | 分類 | 説明 |
|--------|------|------|
| E001 | 設定 | 設定ファイルが見つからない |
| E002 | 設定 | 設定値が不正 |
| E101 | ネットワーク | RPC接続エラー |
| E102 | ネットワーク | トランザクション失敗 |
| E201 | トークン | トークン作成失敗 |
| E202 | トークン | ミント権限不足 |
| E301 | 配布 | 受信者リスト不正 |
| E302 | 配布 | 残高不足 |

