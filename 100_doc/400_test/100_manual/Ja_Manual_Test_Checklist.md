# 手動テストチェックリスト
# Tributary - Solana報酬配布システム

**更新日**: 2025-09-18
**更新者**: akameGusya

## 概要
本文書は、Tributaryシステムの手動テスト実行時に使用するチェックリストです。各テスト項目の実行手順と確認ポイントを詳細に記載しています。

## テスト実行前の準備

### 環境準備チェックリスト
- [ ] Node.js 18.0+ インストール確認
- [ ] tributary CLI 最新版インストール確認
- [ ] テスト用SOL準備（devnet: 5 SOL, testnet: 10 SOL）
- [ ] テスト用秘密鍵ファイル準備
- [ ] ネットワーク接続確認

### ツール確認
```bash
# バージョン確認
node --version        # v18.0.0以上
npm --version         # 8.0.0以上
tributary --version   # 最新版

# ネットワーク接続確認
curl -s https://api.devnet.solana.com -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' -H "Content-Type: application/json"
```

## Phase 1: devnet基本機能テスト

### T001: 基本的な初期化コマンド ✅❌
**実行コマンド**:
```bash
cd /tmp/tributary-test
tributary init \
  --name "BasicInitTest" \
  --token "So11111111111111111111111111111111111111112" \
  --admin "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" \
  --network devnet
```

**確認ポイント**:
- [ ] コマンドが正常終了（exit code 0）
- [ ] `tributary.toml` ファイルが作成される
- [ ] 設定ファイル内容が正しい
- [ ] プロジェクト名が正確に設定される
- [ ] ネットワークが devnet に設定される

**期待される出力**:
```
✅ Project initialized successfully
📁 Configuration saved to: ./tributary.toml
🌐 Network: devnet
💰 Base token: So11111111111111111111111111111111111111112
```

---

### T002: インタラクティブモード初期化 ✅❌
**実行コマンド**:
```bash
cd /tmp/tributary-test-interactive
tributary init --interactive
```

**入力値**:
- Project name: `InteractiveTest`
- Base token: `So11111111111111111111111111111111111111112`
- Admin wallet: `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`
- Network: `devnet`

**確認ポイント**:
- [ ] インタラクティブプロンプトが表示される
- [ ] 各入力項目が正しく受け付けられる
- [ ] 入力値検証が動作する
- [ ] 最終確認画面が表示される
- [ ] 設定ファイルが正しく作成される

---

### T040: 設定表示（show） ✅❌
**実行コマンド**:
```bash
cd /tmp/tributary-test
tributary config show
```

**確認ポイント**:
- [ ] 設定内容がテーブル形式で表示される
- [ ] 全セクション（project, token, distribution, security）が表示される
- [ ] 機密情報（秘密鍵等）がマスキングされる
- [ ] 設定値が正確に表示される

**実行コマンド（JSON形式）**:
```bash
tributary config show --format json
```

**確認ポイント**:
- [ ] JSON形式での出力が正しい
- [ ] パース可能なJSON構造
- [ ] 全設定項目が含まれる

---

### T041: 設定検証（validate） ✅❌
**実行コマンド**:
```bash
cd /tmp/tributary-test
tributary config validate
```

**確認ポイント**:
- [ ] 設定検証が実行される
- [ ] 有効な設定で成功メッセージが表示される
- [ ] 検証結果が明確に表示される

**無効な設定でのテスト**:
```bash
# 無効なトークンアドレスを設定ファイルに記載してテスト
tributary config validate
```

**確認ポイント**:
- [ ] 無効な設定が検出される
- [ ] 具体的なエラーメッセージが表示される
- [ ] 修正提案が表示される

## Phase 2: testnet統合テスト

### T010: SOLトークン保有者収集 ✅❌
**実行コマンド**:
```bash
cd /tmp/tributary-test
tributary collect \
  --token "So11111111111111111111111111111111111111112" \
  --threshold 0.1 \
  --network testnet \
  --output-file "test_holders.json"
```

**確認ポイント**:
- [ ] 保有者データが取得される
- [ ] 閾値フィルタリングが動作する
- [ ] 出力ファイルが作成される
- [ ] JSON形式が正しい
- [ ] 進捗表示が動作する

**期待される出力例**:
```
🔍 Collecting token holders...
📊 Found 150 holders above threshold 0.1 SOL
💾 Results saved to: test_holders.json
⏱️  Completed in 12.3 seconds
```

---

### T020: 基本配布シミュレーション ✅❌
**実行コマンド**:
```bash
tributary distribute simulate \
  --amount 100 \
  --token "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" \
  --network testnet
```

**確認ポイント**:
- [ ] シミュレーションが実行される
- [ ] ガス費用見積もりが表示される
- [ ] 配布内訳が表示される
- [ ] 推定実行時間が表示される
- [ ] 警告やリスクが適切に表示される

**期待される出力項目**:
- [ ] `estimatedGasCost`
- [ ] `estimatedDuration`
- [ ] `distributionBreakdown`
- [ ] `riskFactors`

---

### T030: ドライラン実行 ✅❌
**実行コマンド**:
```bash
tributary distribute execute \
  --amount 10 \
  --token "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" \
  --network testnet \
  --dry-run \
  --batch-size 3
```

**確認ポイント**:
- [ ] ドライランモードで実行される
- [ ] 実際のトランザクションは送信されない
- [ ] 配布シミュレーション結果が表示される
- [ ] バッチ処理の流れが確認できる
- [ ] 各受信者への配布額が計算される

---

### T031: 少額実配布 ✅❌
**⚠️ 注意: 実際のトークン使用**

**実行コマンド**:
```bash
tributary distribute execute \
  --amount 1.0 \
  --token "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" \
  --network testnet \
  --wallet-file "./test-keypair.json" \
  --batch-size 5 \
  --confirm
```

**事前準備**:
- [ ] テスト用USDC残高確認（2.0以上）
- [ ] 受信者ウォレット5個以上準備
- [ ] 秘密鍵ファイル権限設定（600）

**確認ポイント**:
- [ ] 配布が実際に実行される
- [ ] トランザクションハッシュが表示される
- [ ] 各受信者への送金が成功する
- [ ] 進捗表示が正しく動作する
- [ ] 最終結果サマリーが表示される

**実行後確認**:
- [ ] 各受信者ウォレットの残高増加確認
- [ ] 送信者ウォレットの残高減少確認
- [ ] Solana Explorerでトランザクション確認

## Phase 3: エラーハンドリングテスト

### T060: 無効なトークンアドレス ✅❌
**実行コマンド**:
```bash
tributary collect --token "ThisIsNotAValidTokenAddress123456789"
```

**確認ポイント**:
- [ ] エラーが適切に検出される
- [ ] 明確なエラーメッセージが表示される
- [ ] 修正提案が提示される
- [ ] プログラムが適切に終了する（exit code != 0）

**期待される出力**:
```
❌ ValidationError: Invalid token address format
💡 Expected: Base58-encoded Solana token address (32-44 characters)
```

---

### T061: 残高不足エラー ✅❌
**実行コマンド**:
```bash
tributary distribute execute \
  --amount 999999 \
  --token "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" \
  --network testnet \
  --dry-run
```

**確認ポイント**:
- [ ] 残高不足が検出される
- [ ] 利用可能残高と必要残高が表示される
- [ ] 解決策が提案される

**期待される出力**:
```
❌ ResourceError: Insufficient token balance
Required: 999,999.00 USDC, Available: 10.50 USDC
💡 Solution: Add more USDC to admin wallet or reduce distribution amount
```

## Phase 4: パフォーマンステスト

### T070: 1000件ウォレット収集時間 ✅❌
**実行コマンド**:
```bash
time tributary collect \
  --token "So11111111111111111111111111111111111111112" \
  --threshold 0.001 \
  --max-holders 1000 \
  --network testnet \
  --cache false
```

**確認ポイント**:
- [ ] 実行時間が5分以内
- [ ] メモリ使用量が1GB以内
- [ ] CPU使用率が適正範囲
- [ ] 1000件のデータが正常取得される

**測定項目**:
- [ ] 実行時間: ___分___秒
- [ ] 最大メモリ使用量: ___MB
- [ ] 取得件数: ___件

## テスト結果記録

### 全体サマリー
- **実行日時**: ___________
- **実行者**: ___________
- **環境**: ___________
- **tributary バージョン**: ___________

### 結果統計
- **総テスト項目数**: 15
- **成功**: ___件
- **失敗**: ___件
- **スキップ**: ___件
- **成功率**: ___%

### 重要な発見事項
1. ________________________________
2. ________________________________
3. ________________________________

### 次のアクション
- [ ] ________________________________
- [ ] ________________________________
- [ ] ________________________________

---

**テスト完了サイン**: ___________
**レビューア**: ___________
**承認日**: ___________