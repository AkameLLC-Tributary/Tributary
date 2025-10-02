# 複数ウォレット重み付けアルゴリズム設計書

## 概要
複数ウォレットを持つユーザーの統合管理において、各ウォレットの重み付けを適切に計算し、公平性を担保するアルゴリズムを設計する。

## 1. 問題設定と設計方針

### 1.1 課題の明確化
**主要懸念**:
- 配布対象トークンが特定ウォレットに偏在
- 出資トークン量の比率と配布対象トークンの比率が乖離
- ウォレット数による不公平（多ウォレット持ちが有利になる問題）

**設計原則**:
- ユーザーの選択により重み付け方式を決定
- 出資実態を適切に反映
- ウォレット分散による不当な優遇を防止

### 1.2 想定シナリオ
```typescript
// シナリオ例
interface UserWallets {
  userId: string;
  wallets: Array<{
    address: string;
    baseToken: number;    // 配布対象選定トークン(SOL等)
    investmentToken: number; // 出資トークン(USDC等)
  }>;
}

const exampleUser = {
  userId: "user001",
  wallets: [
    { address: "wallet1", baseToken: 1000, investmentToken: 5000 },
    { address: "wallet2", baseToken: 10,   investmentToken: 500 },
    { address: "wallet3", baseToken: 100,  investmentToken: 200 }
  ]
};
```

## 2. 重み付けオプション設計

### 2.1 重みなし（Unweighted）
**概要**: 全ウォレットを平等に扱い、保有量比率を無視

```typescript
interface UnweightedConfig {
  type: 'unweighted';
  aggregationMethod: 'simple_sum' | 'average' | 'count_based';
}

function calculateUnweightedHoldings(
  userWallets: UserWallets,
  config: UnweightedConfig
): number {
  switch (config.aggregationMethod) {
    case 'simple_sum':
      // 単純合算（従来方式）
      return userWallets.wallets.reduce((sum, wallet) => sum + wallet.baseToken, 0);

    case 'average':
      // 平均値ベース
      const total = userWallets.wallets.reduce((sum, wallet) => sum + wallet.baseToken, 0);
      return total / userWallets.wallets.length;

    case 'count_based':
      // ウォレット数ベース（各ウォレットを1として計算）
      return userWallets.wallets.length;
  }
}
```

**用途**:
- ウォレット分散による影響を排除したい場合
- シンプルな平等主義的配布
- ウォレット数自体を評価基準にしたい場合

### 2.2 カスタム重み付け（Custom Weighting）
**概要**: ユーザー定義の計算式による柔軟な重み付け

```typescript
interface CustomWeightingConfig {
  type: 'custom';
  formula: string;
  variables: {
    baseToken: string;      // 配布対象トークンの変数名
    investmentToken: string; // 出資トークンの変数名
    walletCount: string;     // ウォレット数の変数名
  };
  constants: Record<string, number>;
  aggregationMethod: 'sum' | 'weighted_average' | 'max' | 'min';
}

function calculateCustomWeightedHoldings(
  userWallets: UserWallets,
  config: CustomWeightingConfig
): number {
  const evaluator = new FormulaEvaluator(config.formula);
  const walletWeights: number[] = [];

  userWallets.wallets.forEach(wallet => {
    const variables = {
      [config.variables.baseToken]: wallet.baseToken,
      [config.variables.investmentToken]: wallet.investmentToken,
      [config.variables.walletCount]: userWallets.wallets.length
    };

    const weight = evaluator.evaluate(variables, config.constants);
    walletWeights.push(weight);
  });

  switch (config.aggregationMethod) {
    case 'sum':
      return walletWeights.reduce((sum, weight) => sum + weight, 0);
    case 'weighted_average':
      return walletWeights.reduce((sum, weight, index) =>
        sum + (weight * userWallets.wallets[index].baseToken), 0) / walletWeights.length;
    case 'max':
      return Math.max(...walletWeights);
    case 'min':
      return Math.min(...walletWeights);
  }
}
```

**カスタム式の例**:
```typescript
// 例1: 出資比率重視
formula: "baseToken * (investmentToken / 1000)"

// 例2: バランス重視
formula: "sqrt(baseToken) * log(investmentToken + 1)"

// 例3: ウォレット分散ペナルティ
formula: "baseToken * (1 - (walletCount - 1) * 0.1)"
```

### 2.3 比率重み付け（Proportional Weighting）
**概要**: 配布ロジックの手法を流用した比率ベース重み付け

```typescript
interface ProportionalWeightingConfig {
  type: 'proportional';
  distributionType: 'fixed' | 'tiered' | 'proportional';
  calculationMethod: 'linear' | 'logarithmic' | 'square_root';
  referenceMetric: 'base_token' | 'investment_token' | 'combined_ratio';
  combinationRatio?: {
    baseTokenWeight: number;
    investmentTokenWeight: number;
  };
}

function calculateProportionalWeightedHoldings(
  userWallets: UserWallets,
  config: ProportionalWeightingConfig
): number {
  // 1. 参照メトリクスの計算
  const walletMetrics = userWallets.wallets.map(wallet => {
    switch (config.referenceMetric) {
      case 'base_token':
        return wallet.baseToken;
      case 'investment_token':
        return wallet.investmentToken;
      case 'combined_ratio':
        const ratio = config.combinationRatio || { baseTokenWeight: 0.5, investmentTokenWeight: 0.5 };
        return (wallet.baseToken * ratio.baseTokenWeight) +
               (wallet.investmentToken * ratio.investmentTokenWeight);
    }
  });

  // 2. 配布ロジックの適用
  switch (config.distributionType) {
    case 'fixed':
      return calculateFixedWeighting(walletMetrics);
    case 'tiered':
      return calculateTieredWeighting(walletMetrics, config);
    case 'proportional':
      return calculateProportionalWeighting(walletMetrics, config.calculationMethod);
  }
}

function calculateProportionalWeighting(
  metrics: number[],
  method: 'linear' | 'logarithmic' | 'square_root'
): number {
  const weights = metrics.map(metric => {
    switch (method) {
      case 'linear':
        return metric;
      case 'logarithmic':
        return Math.log(metric + 1);
      case 'square_root':
        return Math.sqrt(metric);
    }
  });

  return weights.reduce((sum, weight) => sum + weight, 0);
}
```

## 3. 統合設計

### 3.1 設定データ構造

```typescript
interface MultiWalletWeightingConfig {
  // 基本設定
  weightingMethod: 'unweighted' | 'custom' | 'proportional';

  // ユーザー識別方法
  userIdentification: {
    method: 'manual_grouping' | 'signature_verification' | 'pda_authority';
    groupingConfig?: UserGroupingConfig;
  };

  // 手法別設定
  unweightedConfig?: UnweightedConfig;
  customConfig?: CustomWeightingConfig;
  proportionalConfig?: ProportionalWeightingConfig;

  // 集約設定
  aggregationLimits: {
    maxWalletsPerUser: number;
    minHoldingThreshold: number;
    maxWeightPerUser: number;
  };
}

interface UserGroupingConfig {
  // ユーザーのウォレットグループ化設定
  autoDetection: boolean;
  manualGroups: Array<{
    userId: string;
    walletAddresses: string[];
    customWeight?: number;
  }>;
}
```

### 3.2 CLIコマンド設計

```bash
# 複数ウォレット重み付け設定
tributary multi-wallet configure --method unweighted \
  --aggregation simple_sum

tributary multi-wallet configure --method proportional \
  --distribution-type proportional \
  --calculation-method logarithmic \
  --reference-metric combined_ratio \
  --base-weight 0.6 --investment-weight 0.4

tributary multi-wallet configure --method custom \
  --formula "baseToken * sqrt(investmentToken)" \
  --aggregation weighted_average

# ウォレットグループ管理
tributary multi-wallet group add --user-id "user001" \
  --wallets "wallet1,wallet2,wallet3"

tributary multi-wallet group remove --user-id "user001" \
  --wallet "wallet2"

tributary multi-wallet group list

# シミュレーション
tributary multi-wallet simulate --config multi-wallet.toml \
  --sample-groups sample-groups.csv
```

### 3.3 設定ファイル例

```toml
[multi_wallet_weighting]
method = "proportional"
max_wallets_per_user = 10
min_holding_threshold = 1.0
max_weight_per_user = 1000000

[multi_wallet_weighting.user_identification]
method = "manual_grouping"
auto_detection = false

[[multi_wallet_weighting.user_identification.manual_groups]]
user_id = "user001"
wallet_addresses = [
  "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "8yKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsV",
  "9zKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsW"
]
custom_weight = 1.2

[multi_wallet_weighting.proportional_config]
distribution_type = "proportional"
calculation_method = "logarithmic"
reference_metric = "combined_ratio"

[multi_wallet_weighting.proportional_config.combination_ratio]
base_token_weight = 0.6
investment_token_weight = 0.4
```

## 4. 実装考慮事項

### 4.1 ユーザー識別の課題

**課題**: どのウォレットが同一ユーザーのものかを特定する方法

**解決策**:
1. **手動グループ化**: 管理者が明示的にグループを設定
2. **署名認証**: 共通の秘密鍵による署名で同一性を証明
3. **PDA権限**: PDAのauthorityが同一であることで判定

### 4.2 セキュリティ考慮事項

**リスク**: 偽装ウォレットによる重み付け操作

**対策**:
```typescript
interface SecurityConfig {
  minimumHoldingPeriod: number; // 最小保有期間
  transactionHistoryCheck: boolean; // 取引履歴確認
  stakingRequirement: boolean; // ステーキング要件
  crossReferenceValidation: boolean; // 相互参照検証
}
```

### 4.3 パフォーマンス最適化

**課題**: 多数ウォレットの処理負荷

**最適化**:
```typescript
interface PerformanceConfig {
  cacheEnabled: boolean;
  batchProcessing: boolean;
  maxConcurrentQueries: number;
  cacheTtlSeconds: number;
}
```

## 5. 使用例とシナリオ

### 5.1 DeFiプロトコルの場合

```bash
# 流動性提供者への報酬配布
tributary multi-wallet configure --method proportional \
  --distribution-type proportional \
  --calculation-method logarithmic \
  --reference-metric investment_token

# ユーザーグループ化（LP提供者）
tributary multi-wallet group add --user-id "lp_provider_001" \
  --wallets "main_wallet,farming_wallet,yield_wallet"
```

### 5.2 ゲーミングプロジェクトの場合

```bash
# ゲーム内アセット保有者への配布
tributary multi-wallet configure --method unweighted \
  --aggregation count_based  # ウォレット数ベース

# ゲーマーアカウント統合
tributary multi-wallet group add --user-id "gamer_001" \
  --wallets "main_account,alt_account_1,alt_account_2"
```

### 5.3 企業トレジャリーの場合

```bash
# 企業の複数ウォレット統合管理
tributary multi-wallet configure --method custom \
  --formula "baseToken * (investmentToken / totalInvestment) * diversificationBonus" \
  --aggregation sum
```

## 6. 検証とテスト

### 6.1 公平性テスト

```typescript
interface FairnessTest {
  scenario: string;
  expectedOutcome: string;
  actualResult: number;
  fairnessScore: number; // 0-1 scale
}

// テストケース例
const fairnessTests: FairnessTest[] = [
  {
    scenario: "equal_investment_different_wallets",
    expectedOutcome: "equal_weights",
    actualResult: 0.95,
    fairnessScore: 0.95
  }
];
```

### 6.2 攻撃耐性テスト

```typescript
interface AttackResistanceTest {
  attackType: 'wallet_splitting' | 'fake_holdings' | 'timing_manipulation';
  mitigation: string;
  effectiveness: number;
}
```

## 結論

提案された3オプション（重みなし・カスタム・比率）は、複数ウォレット重み付けの主要ニーズを網羅しており、実装価値が高いと評価できます。

**推奨実装順序**:
1. **重みなし** (simple_sum) - 既存機能からの移行が容易
2. **比率重み付け** - 配布ロジック流用により実装効率が高い
3. **カスタム重み付け** - 高度なニーズに対応

この設計により、複数ウォレット統合における公平性の課題を解決し、v1.0.0の目標である「高度な多軸配布プラットフォーム」の実現に貢献できます。