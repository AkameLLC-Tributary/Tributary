# Ja_コマンドリファレンス

## ドキュメント情報
- **ファイル名**: Ja_Command_Reference.md
- **作成日**: 2025-09-18
- **バージョン**: 1.0
- **目的**: Tributaryコマンドラインツールの全コマンド仕様

## 1. 共通オプション

全コマンドで使用可能な共通オプション:

| オプション | 型 | デフォルト | 説明 |
|-----------|----|---------|----|
| `--config` | string | `./tributary.toml` | 設定ファイルパス |
| `--output` | string | `table` | 出力形式（table/json/yaml） |
| `--log-level` | string | `info` | ログレベル（debug/info/warn/error） |
| `--network` | string | 設定ファイル値 | ネットワーク指定（devnet/testnet/mainnet-beta） |
| `--help, -h` | boolean | - | ヘルプ表示 |
| `--version, -v` | boolean | - | バージョン表示 |

## 2. コマンド一覧

### 2.1 init - プロジェクト初期化

**用途**: 新規プロジェクトの初期化とセットアップ

**書式**:
```bash
tributary init [options]
```

**必須オプション**:
| オプション | 型 | 説明 |
|-----------|----|----|
| `--name <name>` | string | プロジェクト名（1-100文字、英数字・ハイフン・アンダースコア） |
| `--token <address>` | string | 基準トークンアドレス（Solana Base58形式） |
| `--admin <address>` | string | 管理者ウォレットアドレス |

**オプション**:
| オプション | 型 | デフォルト | 説明 |
|-----------|----|---------|----|
| `--network <network>` | string | `devnet` | 対象ネットワーク |
| `--force, -f` | boolean | false | 既存設定の上書き |
| `--interactive, -i` | boolean | false | インタラクティブモード |

**実行例**:
```bash
# 基本的な初期化
tributary init --name "MyProject" --token "So11111111111111111111111111111111111111112" --admin "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"

# インタラクティブモード
tributary init --interactive

# 既存設定の上書き
tributary init --name "UpdatedProject" --force
```

### 2.2 collect - トークン保有者収集

**用途**: 指定トークンの保有者情報収集

**書式**:
```bash
tributary collect [options]
```

**オプション**:
| オプション | 型 | デフォルト | 説明 |
|-----------|----|---------|----|
| `--token <address>` | string | 設定ファイル値 | 収集対象トークンアドレス |
| `--threshold <amount>` | number | 0 | 最小保有量閾値 |
| `--max-holders <number>` | number | 無制限 | 最大収集数制限 |
| `--output-file <path>` | string | - | 結果出力ファイルパス |
| `--cache, -c` | boolean | true | キャッシュ使用 |
| `--cache-ttl <seconds>` | number | 3600 | キャッシュ有効期間（秒） |
| `--exclude <addresses>` | string | - | 除外アドレスリスト（カンマ区切り） |

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

### 2.3 distribute - トークン配布

**用途**: トークンの配布実行・管理

**書式**:
```bash
tributary distribute <subcommand> [options]
```

**サブコマンド一覧**:
| サブコマンド | 説明 |
|------------|-----|
| `execute` | 手動配布実行 |
| `simulate` | 配布シミュレーション |
| `auto` | 自動配布設定 |
| `status` | 配布状況確認 |
| `history` | 配布履歴表示 |

#### 2.3.1 distribute execute

**用途**: トークン配布の実行

**書式**:
```bash
tributary distribute execute [options]
```

**必須オプション**:
| オプション | 型 | 説明 |
|-----------|----|----|
| `--amount <amount>` | number | 配布総額 |

**オプション**:
| オプション | 型 | デフォルト | 説明 |
|-----------|----|---------|----|
| `--token <address>` | string | 設定ファイル値 | 配布トークンアドレス |
| `--dry-run` | boolean | false | ドライラン実行 |
| `--batch-size <number>` | number | 10 | バッチサイズ |
| `--confirm, -y` | boolean | false | 確認プロンプトスキップ |
| `--wallet-file <path>` | string | - | 秘密鍵ファイルパス |

**実行例**:
```bash
# 基本的な配布実行
tributary distribute execute --amount 10000 --token "USDC-Address"

# ドライラン実行
tributary distribute execute --amount 10000 --dry-run

# バッチサイズ指定
tributary distribute execute --amount 10000 --batch-size 20
```

#### 2.3.2 distribute simulate

**用途**: 配布のシミュレーション実行

**書式**:
```bash
tributary distribute simulate [options]
```

**オプション**:
| オプション | 型 | デフォルト | 説明 |
|-----------|----|---------|----|
| `--amount <amount>` | number | 設定ファイル値 | シミュレーション配布額 |
| `--token <address>` | string | 設定ファイル値 | 対象トークンアドレス |
| `--detail` | boolean | false | 詳細結果表示 |

#### 2.3.3 distribute auto

**用途**: 自動配布の設定・管理

**書式**:
```bash
tributary distribute auto <action> [options]
```

**アクション**:
| アクション | 説明 |
|-----------|-----|
| `enable` | 自動配布を有効化 |
| `disable` | 自動配布を無効化 |
| `status` | 自動配布状況確認 |

#### 2.3.4 distribute status

**用途**: 配布状況の確認

**書式**:
```bash
tributary distribute status [options]
```

**オプション**:
| オプション | 型 | デフォルト | 説明 |
|-----------|----|---------|----|
| `--tx-id <id>` | string | - | 特定トランザクションの詳細表示 |
| `--last <number>` | number | 10 | 最新N件の配布表示 |

#### 2.3.5 distribute history

**用途**: 配布履歴の表示

**書式**:
```bash
tributary distribute history [options]
```

**オプション**:
| オプション | 型 | デフォルト | 説明 |
|-----------|----|---------|----|
| `--limit <number>` | number | 50 | 表示件数制限 |
| `--from <date>` | string | - | 開始日（YYYY-MM-DD） |
| `--to <date>` | string | - | 終了日（YYYY-MM-DD） |
| `--format <format>` | string | table | 出力形式（table/json/csv） |

### 2.4 config - 設定管理

**用途**: アプリケーション設定の管理

**書式**:
```bash
tributary config <subcommand> [options]
```

**サブコマンド一覧**:
| サブコマンド | 説明 |
|------------|-----|
| `show` | 設定表示 |
| `edit` | 設定編集 |
| `export` | 設定エクスポート |
| `import` | 設定インポート |
| `validate` | 設定検証 |

#### 2.4.1 config show

**用途**: 現在の設定表示

**書式**:
```bash
tributary config show [options]
```

**オプション**:
| オプション | 型 | デフォルト | 説明 |
|-----------|----|---------|----|
| `--section <section>` | string | - | 特定セクションのみ表示 |
| `--format <format>` | string | table | 出力形式（table/json/yaml） |
| `--show-secrets` | boolean | false | 機密情報も表示 |

#### 2.4.2 config edit

**用途**: 設定の編集

**書式**:
```bash
tributary config edit [key] [value] [options]
```

**オプション**:
| オプション | 型 | デフォルト | 説明 |
|-----------|----|---------|----|
| `--interactive, -i` | boolean | false | インタラクティブ編集モード |
| `--editor <editor>` | string | $EDITOR | 使用エディタ指定 |

#### 2.4.3 config export

**用途**: 設定のエクスポート

**書式**:
```bash
tributary config export [options]
```

**オプション**:
| オプション | 型 | デフォルト | 説明 |
|-----------|----|---------|----|
| `--output <path>` | string | stdout | 出力先ファイル |
| `--format <format>` | string | toml | 出力形式（toml/json/yaml） |
| `--exclude-secrets` | boolean | false | 機密情報を除外 |

#### 2.4.4 config import

**用途**: 設定のインポート

**書式**:
```bash
tributary config import <file> [options]
```

**オプション**:
| オプション | 型 | デフォルト | 説明 |
|-----------|----|---------|----|
| `--merge` | boolean | false | 既存設定とマージ |
| `--validate` | boolean | true | インポート前検証 |

#### 2.4.5 config validate

**用途**: 設定の検証

**書式**:
```bash
tributary config validate [options]
```

**オプション**:
| オプション | 型 | デフォルト | 説明 |
|-----------|----|---------|----|
| `--strict` | boolean | false | 厳密モード |
| `--check-network` | boolean | false | ネットワーク接続確認 |

## 3. 終了コード

| コード | 説明 |
|-------|-----|
| 0 | 正常終了 |
| 1 | 一般的なエラー |
| 2 | コマンドライン引数エラー |
| 3 | 設定エラー |
| 4 | ネットワークエラー |
| 5 | 認証・権限エラー |
| 6 | データ整合性エラー |
| 7 | リソース不足エラー |
| 8 | タイムアウトエラー |

## 4. 出力形式

### 4.1 テーブル形式（デフォルト）
```
┌─────────────────┬──────────────┬─────────────┐
│ Address         │ Balance      │ Percentage  │
├─────────────────┼──────────────┼─────────────┤
│ 7xKXtg2CW...    │ 1,234.56 SOL │ 12.35%      │
│ 9yHFdkL5...     │ 987.65 SOL   │ 9.88%       │
└─────────────────┴──────────────┴─────────────┘
```

### 4.2 JSON形式
```json
{
  "holders": [
    {
      "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "balance": 1234.56,
      "percentage": 12.35
    }
  ],
  "total_holders": 1234,
  "total_supply": 10000.0
}
```

### 4.3 YAML形式
```yaml
holders:
  - address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
    balance: 1234.56
    percentage: 12.35
total_holders: 1234
total_supply: 10000.0
```

## 5. 設定ファイル形式

### 5.1 基本設定（tributary.toml）
```toml
[project]
name = "MyProject"
created = "2025-09-18T10:30:15Z"
network = "mainnet-beta"

[token]
base_token = "So11111111111111111111111111111111111111112"
admin_wallet = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"

[distribution]
schedule = "weekly"
reward_token = "USDC"
auto_distribute = false
minimum_balance = 1.0

[security]
key_encryption = true
backup_enabled = true
audit_log = true
```