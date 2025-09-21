# Contributing to Tributary

## コミットメッセージ規約

このプロジェクトでは [Conventional Commits](https://www.conventionalcommits.org/) を使用しています。

### フォーマット
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### タイプ
- `feat`: 新機能追加
- `fix`: バグ修正
- `docs`: ドキュメント更新
- `style`: フォーマット変更（コード動作に影響なし）
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルドプロセスや補助ツールの変更

### 例
```bash
feat: add auto-distribute command
fix: resolve wallet collection timeout issue
docs: update README with new installation steps
test: add unit tests for TokenHolder model
```

## リリースフロー

### 自動リリース（推奨）
```bash
# バグ修正リリース (0.1.0 → 0.1.1)
npm run release

# 新機能リリース (0.1.0 → 0.2.0)
npm run release:minor

# 破壊的変更リリース (0.1.0 → 1.0.0)
npm run release:major
```

### 手動バージョン管理
```bash
# バージョン更新のみ
npm run version:patch   # 0.1.0 → 0.1.1
npm run version:minor   # 0.1.0 → 0.2.0
npm run version:major   # 0.1.0 → 1.0.0

# その後、手動でpublish
npm publish
```

## 開発ワークフロー

1. **ブランチ作成**
```bash
git checkout -b feature/your-feature-name
```

2. **開発・テスト**
```bash
npm run dev        # 開発モード
npm run test       # テスト実行
npm run lint       # Linting
```

3. **コミット（Conventional Commits形式）**
```bash
git commit -m "feat: add new distribution algorithm"
```

4. **プルリクエスト作成**
- main ブランチに向けてPR作成
- CI チェックが通ることを確認

5. **リリース**
- main ブランチにマージ後
- リリースコマンド実行でタグ作成・npm公開が自動実行

## 品質基準

- すべてのテストがパス
- Linting エラーなし
- 型チェック エラーなし
- テストカバレッジ 80% 以上維持