# プロジェクト規則

## 概要
このファイルは、Tributary プロジェクトにおける開発・運営の包括的な規則を定義します。品質の高い一貫性のあるプロジェクト管理を実現するための標準とガイドラインを提供します。

## 1. ドキュメント規則

### 1.1 ドキュメント共通フォーマット

#### ヘッダー規則
すべてのドキュメントは以下のヘッダーで開始すること：

```markdown
# [ドキュメントタイトル]
## 概要
[ファイルの概要説明]
```

#### ファイル命名規則

##### 日本語ドキュメント
- プレフィックス: `Ja_`
- 形式: `Ja_[英語ファイル名].md`
- 例: `Ja_README.md`, `Ja_SRS.md`, `Ja_API_Reference.md`

##### 英語ドキュメント
- 形式: `[Document_Type].md`
- 例: `README.md`, `SRS.md`, `API_Reference.md`

##### 専門ドキュメント
- 設計書: `Design_[項目名].md`
- 仕様書: `Spec_[項目名].md`
- 手順書: `Procedure_[項目名].md`
- 規則書: `[項目名]_RULES.md`

### 1.2 ディレクトリ構造規則

```
Tributary/
├── PROJECT_RULES.md             # 本ファイル（プロジェクト包括規則）
├── README.md                    # 英語版README
├── Ja_README.md                 # 日本語版README
├── 100_doc/                     # ドキュメント
│   ├── 100_define/              # 要件定義
│   │   ├── SRS.md              # 英語版要件定義書
│   │   └── Ja_SRS.md           # 日本語版要件定義書
│   ├── 200_design/             # 設計書
│   ├── 300_spec/               # 仕様書
│   └── 400_procedure/          # 手順書・マニュアル
├── 200_src/                    # ソースコード
└── 300_pkg/                    # パッケージング
```

### 1.3 マークダウン記法規則

#### 見出し
- H1: ドキュメントタイトルのみ
- H2: メジャーセクション
- H3: サブセクション
- H4以下: 詳細項目

#### コードブロック
```bash
# コマンド例
tributary init
```

```typescript
// TypeScriptコード例
interface Config {
  name: string;
  network: NetworkType;
}
```

#### テーブル
| 項目 | 説明 | 備考 |
|------|------|------|
| 例1  | 説明1 | 備考1 |

## 2. バージョン管理規則

### 2.1 セマンティックバージョニング

プロジェクトは [Semantic Versioning 2.0.0](https://semver.org/) に従います。

#### バージョン形式
```
MAJOR.MINOR.PATCH
```

- **MAJOR**: 互換性のない API 変更
- **MINOR**: 後方互換性がある機能追加
- **PATCH**: 後方互換性があるバグ修正

#### バージョン管理コマンド

##### パッチバージョン（推奨）
```bash
npm run version:patch    # 0.1.1 → 0.1.2
npm run release         # パッチバージョンアップ + 公開
```

##### マイナーバージョン
```bash
npm run version:minor    # 0.1.1 → 0.2.0
npm run release:minor   # マイナーバージョンアップ + 公開
```

##### メジャーバージョン
```bash
npm run version:major    # 0.1.1 → 1.0.0
npm run release:major   # メジャーバージョンアップ + 公開
```

### 2.2 リリース管理

#### 公開前チェック（prepublishOnly）
以下のチェックが自動実行されます：
1. **TypeScript型チェック**: `npm run typecheck`
2. **ESLint品質チェック**: `npm run lint`
3. **テスト実行**: `npm test`
4. **ビルド**: `npm run build`

#### リリース手順
1. 機能開発・バグ修正完了
2. テスト実行確認
3. ドキュメント更新
4. バージョンアップコマンド実行
5. 自動品質チェック通過
6. npm公開
7. GitタグとGitHubリリース作成

### 2.3 Git管理規則

#### コミットメッセージ
[Conventional Commits](https://www.conventionalcommits.org/) 形式に従います：

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

##### タイプ
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント変更
- `style`: コード整形
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: その他変更

##### 例
```
feat(cli): add token distribution simulation
fix(config): resolve validation error handling
docs(readme): update installation instructions
```

#### ブランチ戦略
- `main`: 本番安定版
- `develop`: 開発統合ブランチ
- `feature/*`: 機能開発ブランチ
- `hotfix/*`: 緊急修正ブランチ

## 3. 品質管理規則

### 3.1 コード品質基準

#### 必須チェック項目
- [ ] TypeScript型エラーなし
- [ ] ESLintエラーなし（警告は許容）
- [ ] テストカバレッジ維持
- [ ] ビルド成功

#### 推奨事項
- 意味のある変数・関数名
- 適切なコメント（過度でない）
- 単一責任原則の遵守
- 依存性注入の活用

### 3.2 テスト規則

#### テストファイル命名
- 単体テスト: `*.test.ts`
- 統合テスト: `*.spec.ts`
- テストディレクトリ: `__tests__/`

#### テスト実行コマンド
```bash
npm test           # 全テスト実行
npm run test:watch # ウォッチモード
npm run test:coverage # カバレッジ付き実行
```

### 3.3 ドキュメント品質基準

#### 必須チェック項目
- [ ] ヘッダー情報が正しく記載されている
- [ ] 概要が適切に説明されている
- [ ] 目次が論理的に構成されている
- [ ] マークダウン記法が正しく使用されている
- [ ] 誤字脱字がない

#### 推奨事項
- 読み手を意識した分かりやすい説明
- 図表を活用した視覚的な説明
- 実例やサンプルコードの提供
- 関連ドキュメントへの適切なリンク

## 4. パッケージ管理規則

### 4.1 NPMパッケージ規則

#### スコープ管理
- パッケージ名: `@akamellc/tributary`
- スコープ: `akamellc`
- 公開設定: `public`

#### 依存関係管理
- `dependencies`: 実行時必須ライブラリ
- `devDependencies`: 開発時のみ必要なツール
- `peerDependencies`: 使用側で提供すべき依存関係

### 4.2 ビルド成果物

#### 配布ファイル
```
dist/
├── cli.js           # CLI実行ファイル
├── index.js         # ライブラリエントリーポイント
└── **/*.js          # 全TypeScriptコンパイル結果
```

#### 除外ファイル
- ソースコード (`src/`)
- テストファイル (`*.test.ts`, `*.spec.ts`)
- 設定ファイル (`eslint.config.js`, `tsconfig.json`)

## 5. 更新履歴

| バージョン | 日付 | 更新者 | 主要変更内容 |
|------------|------|--------|--------------|
| 1.0.0 | 2025-01-18 | Claude | 初版作成：ドキュメント規則とバージョン管理規則を統合 |

---

**注意**: このファイルはプロジェクトの包括的な規則を定義します。変更時は関係者と合意の上で更新してください。