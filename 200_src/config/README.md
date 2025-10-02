# Configuration Management

## 設定ファイル構成

```
config/
├── default.toml          # デフォルト設定（必須）
├── development.toml      # 開発環境設定
├── production.toml       # 本番環境設定
├── parameters.toml       # パラメータ設定（オプション）
└── README.md            # このファイル
```

## 設定の優先順位

1. **環境変数** (最高優先度)
2. **parameters.toml** (ユーザカスタム設定)
3. **{環境}.toml** (環境固有設定)
4. **default.toml** (ベース設定)

## 環境変数命名規則

```bash
TRIBUTARY_{SECTION}_{KEY}=value

例:
TRIBUTARY_NETWORK_TIMEOUT=45000
TRIBUTARY_LOGGING_LEVEL=debug
TRIBUTARY_SECURITY_KEY_ENCRYPTION=false
```

## 設定ファイル形式

すべてTOML形式で統一:
- 可読性が高い
- コメント対応
- 階層構造をサポート
- TypeScriptとの親和性良好

## 最小限の分割方針

### default.toml
- 全ての基本設定
- 開発・本番共通設定

### development.toml
- 開発環境特有の設定のみ
- テスト用エンドポイント等

### production.toml
- 本番環境特有の設定のみ
- 本番用エンドポイント等

### parameters.toml
- ユーザーカスタマイズ用
- プロジェクト固有の設定