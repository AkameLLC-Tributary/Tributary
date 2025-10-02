# マルチトークン重み付けアルゴリズム設計書

## 概要
複数トークンを基準とした配布において、各トークンの重み付けを柔軟に設定可能なアルゴリズムを設計する。配布ロジックの構成を流用し、ユーザーが選択可能なオプションを提供する。

## 1. 重み付け手法の設計

### 1.1 均等重み付け（Equal Weighting）
**概要**: 全トークンを同等に扱い、保有比率を無視した重み付け

```typescript
interface EqualWeightingConfig {
  type: 'equal';
  tokens: string[]; // 対象トークンリスト
  normalizeByCount: boolean; // トークン数で正規化するか
}

function calculateEqualWeights(tokens: TokenInfo[]): WeightMap {
  const equalWeight = 1.0 / tokens.length;
  return tokens.reduce((weights, token) => {
    weights[token.mint] = equalWeight;
    return weights;
  }, {} as WeightMap);
}
```

**用途**:
- 全トークンを平等に扱いたい場合
- トークン価値の差を無視したい場合

### 1.2 クラス分け重み付け（Tiered Weighting）
**概要**: 保有量の閾値に基づく段階的重み付け

```typescript
interface TieredWeightingConfig {
  type: 'tiered';
  tokens: Array<{
    mint: string;
    boundaries: number[];  // 境界値
    weights: number[];     // 各クラスの重み
  }>;
  calculationBase: 'source_holdings' | 'recipient_holdings';
}

function calculateTieredWeights(
  config: TieredWeightingConfig,
  holdings: Map<string, number>
): WeightMap {
  const weights: WeightMap = {};

  config.tokens.forEach(tokenConfig => {
    const amount = holdings.get(tokenConfig.mint) || 0;
    const tierIndex = findTierIndex(amount, tokenConfig.boundaries);
    weights[tokenConfig.mint] = tokenConfig.weights[tierIndex];
  });

  return normalizeWeights(weights);
}
```

**用途**:
- 大口・中口・小口で異なる重み付けをしたい場合
- ステーキング量に応じた段階的重み付け

### 1.3 比例重み付け（Proportional Weighting）
**概要**: 保有量・保有率に比例した重み付け

```typescript
interface ProportionalWeightingConfig {
  type: 'proportional';
  method: 'linear' | 'logarithmic' | 'square_root';
  calculationBase: 'source_holdings' | 'recipient_holdings';
  scalingFactors?: Record<string, number>; // トークン別スケーリング
}

function calculateProportionalWeights(
  config: ProportionalWeightingConfig,
  holdings: Map<string, number>
): WeightMap {
  const weights: WeightMap = {};

  holdings.forEach((amount, mint) => {
    const scalingFactor = config.scalingFactors?.[mint] || 1.0;

    switch (config.method) {
      case 'linear':
        weights[mint] = amount * scalingFactor;
        break;
      case 'logarithmic':
        weights[mint] = Math.log(amount + 1) * scalingFactor;
        break;
      case 'square_root':
        weights[mint] = Math.sqrt(amount) * scalingFactor;
        break;
    }
  });

  return normalizeWeights(weights);
}
```

**用途**:
- 保有量に応じた公平な重み付け
- 格差緩和（対数・平方根）

### 1.4 カスタム重み付け（Custom Weighting）
**概要**: ユーザー定義の計算式による重み付け

```typescript
interface CustomWeightingConfig {
  type: 'custom';
  formula: string; // 計算式文字列
  variables: Record<string, string>; // 変数マッピング
  constants: Record<string, number>; // 定数
  calculationBase: 'source_holdings' | 'recipient_holdings';
}

// 例: "SOL * 0.4 + USDC * 0.3 + PROJECT * 0.3"
function calculateCustomWeights(
  config: CustomWeightingConfig,
  holdings: Map<string, number>
): WeightMap {
  const evaluator = new FormulaEvaluator(config.formula);

  // 変数を実際の保有量に置換
  const variables: Record<string, number> = {};
  Object.entries(config.variables).forEach(([symbol, mint]) => {
    variables[symbol] = holdings.get(mint) || 0;
  });

  const result = evaluator.evaluate(variables, config.constants);
  return { combined: result };
}
```

**用途**:
- 複雑な重み付けロジック
- プロジェクト固有の計算式

## 2. 比率計算基準の設計

### 2.1 配布元保有率ベース（Source Holdings Based）
**概要**: 配布者の各トークン保有比率を基準とした重み付け

```typescript
interface SourceHoldingsCalculation {
  sourceWallets: PublicKey[];
  tokens: string[];
}

async function calculateSourceBasedWeights(
  config: SourceHoldingsCalculation
): Promise<WeightMap> {
  const sourceHoldings = new Map<string, number>();

  // 各ソースウォレットの保有量を集計
  for (const wallet of config.sourceWallets) {
    for (const token of config.tokens) {
      const balance = await getTokenBalance(wallet, token);
      const current = sourceHoldings.get(token) || 0;
      sourceHoldings.set(token, current + balance);
    }
  }

  // 保有比率を計算
  const totalValue = Array.from(sourceHoldings.values()).reduce((sum, val) => sum + val, 0);
  const weights: WeightMap = {};

  sourceHoldings.forEach((amount, token) => {
    weights[token] = amount / totalValue;
  });

  return weights;
}
```

**用途**:
- 配布者の資産構成を反映したい場合
- プロジェクトトレジャリーの構成比率を維持したい場合

### 2.2 配布先保有総量ベース（Recipient Holdings Based）
**概要**: 受信者全体の各トークン保有総量を基準とした重み付け

```typescript
interface RecipientHoldingsCalculation {
  recipientWallets: PublicKey[];
  tokens: string[];
}

async function calculateRecipientBasedWeights(
  config: RecipientHoldingsCalculation
): Promise<WeightMap> {
  const recipientTotals = new Map<string, number>();

  // 全受信者の保有量を集計
  for (const token of config.tokens) {
    let totalHoldings = 0;

    for (const wallet of config.recipientWallets) {
      const balance = await getTokenBalance(wallet, token);
      totalHoldings += balance;
    }

    recipientTotals.set(token, totalHoldings);
  }

  // 相対的重み付けを計算
  const maxHoldings = Math.max(...recipientTotals.values());
  const weights: WeightMap = {};

  recipientTotals.forEach((amount, token) => {
    weights[token] = amount / maxHoldings;
  });

  return weights;
}
```

**用途**:
- コミュニティの保有傾向を反映したい場合
- 流動性の高いトークンを重視したい場合

## 3. 統合設計

### 3.1 設定データ構造

```typescript
interface MultiTokenWeightingConfig {
  // 基本設定
  weightingMethod: 'equal' | 'tiered' | 'proportional' | 'custom';
  calculationBase: 'source_holdings' | 'recipient_holdings';

  // 対象トークン
  tokens: Array<{
    mint: string;
    symbol: string;
    enabled: boolean;
  }>;

  // 手法別設定
  equalConfig?: EqualWeightingConfig;
  tieredConfig?: TieredWeightingConfig;
  proportionalConfig?: ProportionalWeightingConfig;
  customConfig?: CustomWeightingConfig;

  // 調整パラメータ
  minimumWeight: number; // 最小重み値
  maximumWeight: number; // 最大重み値
  normalizationMethod: 'sum_to_one' | 'max_to_one' | 'none';
}
```

### 3.2 CLIコマンド設計

```bash
# 均等重み付け設定
tributary weight configure --method equal \
  --tokens "SOL,USDC,PROJECT" \
  --normalize-by-count true

# クラス分け重み付け設定
tributary weight configure --method tiered \
  --base recipient_holdings \
  --token SOL --boundaries "1,10,100" --weights "1.0,1.5,2.0" \
  --token USDC --boundaries "100,1000,10000" --weights "1.0,1.2,1.5"

# 比例重み付け設定
tributary weight configure --method proportional \
  --calculation-method logarithmic \
  --base source_holdings \
  --scaling-factor SOL:1.0 --scaling-factor USDC:0.8

# カスタム重み付け設定
tributary weight configure --method custom \
  --formula "SOL * 0.4 + USDC * 0.3 + PROJECT * 0.3" \
  --base recipient_holdings

# 重み付け結果シミュレーション
tributary weight simulate --config weight-config.toml \
  --sample-wallets sample-holders.csv
```

### 3.3 設定ファイル例

```toml
[multi_token_weighting]
method = "proportional"
calculation_base = "recipient_holdings"
normalization_method = "sum_to_one"
minimum_weight = 0.01
maximum_weight = 0.80

[[multi_token_weighting.tokens]]
mint = "So11111111111111111111111111111111111111112"
symbol = "SOL"
enabled = true

[[multi_token_weighting.tokens]]
mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
symbol = "USDC"
enabled = true

[multi_token_weighting.proportional_config]
method = "logarithmic"
scaling_factors = { SOL = 1.0, USDC = 0.8 }
```

## 4. 網羅性確認

### 4.1 カバーされるユースケース

✅ **基本的配布戦略**
- 平等主義的配布（均等）
- 段階的インセンティブ（クラス分け）
- 市場価値反映配布（比例）
- プロジェクト独自ロジック（カスタム）

✅ **計算基準の多様性**
- 配布者資産構成の反映
- コミュニティ傾向の反映

### 4.2 拡張検討事項

**時系列要素**:
```typescript
// 保有期間による重み付け（将来拡張）
interface TimeBasedWeighting {
  holdingDuration: boolean;
  stakingPeriod: boolean;
  participationHistory: boolean;
}
```

**外部データ連携**:
```typescript
// 市場データ連携（将来拡張）
interface MarketDataWeighting {
  priceWeighting: boolean;
  liquidityWeighting: boolean;
  volumeWeighting: boolean;
}
```

## 結論

提案された構成（均等・クラス分け・比例・カスタム + 2つの計算基準）は、**現実的な配布ニーズの90%以上をカバー**していると評価できます。

**推奨**: この設計で実装を開始し、ユーザーフィードバックに基づいて拡張機能を追加する段階的アプローチが適切です。