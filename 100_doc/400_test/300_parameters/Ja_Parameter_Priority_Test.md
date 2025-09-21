# パラメータ優先順位テストガイド
# Tributary - Solana報酬配布システム

## 概要

Tributary CLIのパラメータ優先順位が正しく動作することを確認するための包括的なテストガイドです。ユーザの明示的な入力が常に尊重されることを保証します。

## 優先順位（上位が優先）

1. **CLI引数** (ユーザの明示的入力)
2. **環境変数**
3. **設定ファイル** (tributary-parameters.json)
4. **デフォルト値**

## テストシナリオ

### テスト1: CLI引数がすべてを上書き

```bash
# 環境変数を設定
export TRIBUTARY_BATCH_SIZE=20

# 設定ファイルでbatch_size: 30を設定
echo '{"distribution": {"defaultBatchSize": 30}}' > tributary-parameters.json

# CLI引数が勝つことを確認（batch_size = 15）
tributary init --name Test --token So11111111111111111111111111111111111111112 --admin 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU --batch-size 15 --force

# 期待結果: batch_size = 15 (CLI引数)
```

### テスト2: 環境変数が設定ファイルとデフォルトを上書き

```bash
# CLIオーバーライドを削除
unset TRIBUTARY_BATCH_SIZE

# 環境変数を設定
export TRIBUTARY_BATCH_SIZE=25

# 設定ファイルは依然としてbatch_size: 30
# デフォルトは10

tributary init --name Test2 --token So11111111111111111111111111111111111111112 --admin 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU --force

# 期待結果: batch_size = 25 (環境変数)
```

### テスト3: 設定ファイルがデフォルトのみを上書き

```bash
# 環境変数を削除
unset TRIBUTARY_BATCH_SIZE

# 設定ファイルはbatch_size: 30
# デフォルトは10

tributary init --name Test3 --token So11111111111111111111111111111111111111112 --admin 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU --force

# 期待結果: batch_size = 30 (設定ファイル)
```

### テスト4: 他に何も設定されていない場合のデフォルト値

```bash
# 設定ファイルを削除
rm tributary-parameters.json

# 環境変数が設定されていない
# デフォルトは10

tributary init --name Test4 --token So11111111111111111111111111111111111111112 --admin 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU --force

# 期待結果: batch_size = 10 (デフォルト値)
```

## 検証コマンド

```bash
# 実際の設定を確認
cat tributary.toml

# 使用されているパラメータを確認
tributary config show

# 特定のパラメータを確認
grep "batch_size" tributary.toml
```

## 複雑な優先順位テスト

```bash
# すべての層を設定
export TRIBUTARY_BATCH_SIZE=100         # 環境変数: 100
export TRIBUTARY_NETWORK_TIMEOUT=60000  # 環境変数: 60000

echo '{
  "distribution": {"defaultBatchSize": 200},
  "network": {"timeout": 45000}
}' > tributary-parameters.json            # 設定: batch=200, timeout=45000

# CLIはbatch_sizeのみオーバーライド
tributary init \
  --name ComplexTest \
  --token So11111111111111111111111111111111111111112 \
  --admin 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU \
  --batch-size 50 \
  --force

# 期待結果:
# - batch_size = 50 (CLI引数が勝利)
# - timeout = 60000 (環境変数が勝利)
# - その他の値は設定ファイルまたはデフォルト
```

## 重要なユーザ安全性テスト

### テスト5: ユーザが予期しない値を取得しない

```bash
# ユーザが明示的にバッチサイズを1に設定（非常に小さい）
tributary init \
  --name SafetyTest \
  --token So11111111111111111111111111111111111111112 \
  --admin 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU \
  --batch-size 1 \
  --force

# 重要: 必ずbatch_size = 1でなければならない
# ユーザの明示的選択は絶対にオーバーライドされてはならない
grep "batch_size.*1" tributary.toml || echo "❌ 失敗: ユーザ入力が尊重されていない"
```

### テスト6: ネットワーク選択の優先順位

```bash
# 環境変数はtestnetを提案
export TRIBUTARY_DEFAULT_NETWORK=testnet

# しかしユーザが明示的にmainnetを選択
tributary init \
  --name NetworkTest \
  --token So11111111111111111111111111111111111111112 \
  --admin 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU \
  --network mainnet-beta \
  --force

# 重要: 必ずnetwork = "mainnet-beta"でなければならない
grep 'network.*mainnet-beta' tributary.toml || echo "❌ 失敗: ユーザのネットワーク選択が尊重されていない"
```

### テスト7: セキュリティ設定のオーバーライド

```bash
# 設定ファイルで暗号化を有効にしているが、ユーザが無効化
echo '{
  "security": {"defaultKeyEncryption": true}
}' > tributary-parameters.json

tributary init \
  --name SecurityTest \
  --token So11111111111111111111111111111111111111112 \
  --admin 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU \
  --disable-encryption \
  --force

# 重要: 暗号化が無効になっていることを確認
grep 'key_encryption.*false' tributary.toml || echo "❌ 失敗: セキュリティ設定のオーバーライドが機能していない"
```

### テスト8: 複数のCLI引数の同時指定

```bash
tributary init \
  --name MultiParamTest \
  --token So11111111111111111111111111111111111111112 \
  --admin 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU \
  --batch-size 15 \
  --network-timeout 35000 \
  --max-retries 7 \
  --log-level warn \
  --disable-backup \
  --force

# すべてのユーザ指定値が正しく設定されることを確認
grep "batch_size.*15" tributary.toml && \
grep "timeout.*35000" tributary.toml && \
grep "max_retries.*7" tributary.toml && \
grep "level.*warn" tributary.toml && \
grep "backup_enabled.*false" tributary.toml || \
echo "❌ 失敗: 複数パラメータの設定に問題"
```

## 期待される動作

✅ **正しい**: ユーザの明示的CLI引数が常に勝利
✅ **正しい**: 環境変数が設定ファイルをオーバーライド
✅ **正しい**: 設定ファイルがデフォルトのみをオーバーライド
✅ **正しい**: 競合が発生した場合の明確なエラーメッセージ
❌ **間違い**: ユーザの明示的入力が無視されるシナリオ
❌ **間違い**: ユーザの知らないうちの無断オーバーライド

## 自動テストスクリプト

```bash
#!/bin/bash
# parameter_priority_test.sh

echo "🧪 Tributary CLI パラメータ優先順位テスト開始"

# テスト環境の初期化
cleanup() {
    rm -f tributary.toml tributary-parameters.json
    unset TRIBUTARY_BATCH_SIZE TRIBUTARY_DEFAULT_NETWORK
}

# テスト1: CLI引数の最優先性
test_cli_priority() {
    echo "テスト1: CLI引数の最優先性"
    cleanup

    export TRIBUTARY_BATCH_SIZE=20
    echo '{"distribution": {"defaultBatchSize": 30}}' > tributary-parameters.json

    tributary init --name Test --token So11111111111111111111111111111111111111112 --admin 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU --batch-size 15 --force

    if grep -q "batch_size.*15" tributary.toml; then
        echo "✅ パス: CLI引数が優先された"
    else
        echo "❌ 失敗: CLI引数が無視された"
        exit 1
    fi
}

# テスト実行
test_cli_priority

echo "🎉 すべてのテストがパスしました"
cleanup
```

## トラブルシューティング

### 一般的な問題

1. **設定が反映されない**
   - ファイルパスと構文を確認
   - 環境変数のプレフィックスを確認
   - CLI引数の綴りを確認

2. **予期しない値が使用される**
   - 優先順位を確認
   - `tributary config show` で実際の設定を確認
   - デバッグモードでログを確認

3. **テストが失敗する**
   - 前回のテストの残骸を清理
   - 権限問題を確認
   - Tributary CLIのバージョンを確認

### デバッグコマンド

```bash
# 現在の設定をすべて表示
tributary config show --verbose

# 設定ファイルの場所を確認
tributary config path

# 環境変数をチェック
env | grep TRIBUTARY_

# 詳細なログでテスト実行
TRIBUTARY_LOG_LEVEL=debug tributary init --help
```

## 継続的な検証

本テストガイドは以下の場合に実行してください：

- 新しいパラメータの追加時
- 優先順位ロジックの変更時
- 新しいCLI引数の追加時
- リリース前の品質保証時
- ユーザから優先順位に関する問題報告があった時

これにより、ユーザの意図が常に尊重される安全で予測可能なシステムを維持できます。