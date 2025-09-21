# カスタムトークンセットアップガイド
# Tributaryテスト用の独自SPLトークン使用方法

**更新日**: 2025-09-18
**更新者**: akameGusya

## 概要

Solana testnetフォーセットの深刻な制限（8時間あたり最大5 SOL、頻繁に利用不可）により、カスタムSPLトークンの使用が包括的なTributaryテストのための**推奨アプローチ**となっています。このガイドでは、独自トークンの設定と使用方法を説明します。

## 🎯 カスタムトークンが優れている理由

### ✅ カスタムトークンの利点
- **無制限供給**: テストに必要な分だけトークンを作成可能
- **常時利用可能**: 信頼性の低いフォーセットに依存しない
- **完全制御**: トークン配布の完全制御
- **現実的テスト**: 実際のSPLトークン機能をテスト
- **一貫した結果**: 再現可能なテスト条件
- **外部依存なし**: フォーセットの可用性を待つ必要なし

### ❌ testnet SOLの問題点
- **フォーセット制限**: 8時間あたり最大5 SOL
- **頻繁な利用不可**: フォーセットが空または制限されることが多い
- **テストに不十分**: 包括的テストには20+ SOL必要
- **時間がかかる**: 必要量の蓄積に数日かかる可能性
- **信頼性なし**: 必要時の利用可能性を保証できない

## 🔧 カスタムトークン設定

### ステップ1: トークン情報の準備

カスタムSPLトークンについて以下の情報を収集：

```json
{
  "tokenName": "YourTestToken",
  "tokenSymbol": "YTT",
  "tokenAddress": "YourTokenMintAddressHere",
  "decimals": 9,
  "totalSupply": 1000000000,
  "network": "testnet"
}
```

### ステップ2: テスト設定の更新

#### オプションA: 環境変数
```bash
# カスタムトークンをテストトークンとして設定
export CUSTOM_TEST_TOKEN="YourTokenMintAddressHere"
export TEST_TOKEN_SYMBOL="YTT"
export TEST_TOKEN_DECIMALS="9"
export TEST_TOKEN_NAME="YourTestToken"
```

#### オプションB: 設定ファイル
`custom-token-config.json`を作成：
```json
{
  "testToken": {
    "address": "YourTokenMintAddressHere",
    "symbol": "YTT",
    "name": "YourTestToken",
    "decimals": 9,
    "network": "testnet"
  },
  "testAmounts": {
    "micro": 0.1,
    "small": 1.0,
    "medium": 10.0,
    "large": 100.0
  },
  "safetyLimits": {
    "maxAmountPerTest": 1000,
    "maxRecipientsPerTest": 50
  }
}
```

### ステップ3: テストランナーの更新

`comprehensive-test-runner.js`のテスト設定を修正：

```javascript
// comprehensive-test-runner.js内
constructor() {
  super();
  this.customTokenConfig = {
    useCustomToken: true,
    tokenAddress: process.env.CUSTOM_TEST_TOKEN || "YourTokenMintAddressHere",
    tokenSymbol: process.env.TEST_TOKEN_SYMBOL || "YTT",
    tokenDecimals: parseInt(process.env.TEST_TOKEN_DECIMALS) || 9,
    tokenName: process.env.TEST_TOKEN_NAME || "YourTestToken"
  };

  // カスタムトークン用の安全制限を更新
  this.config.safetyLimits = {
    maxTotalAmount: 10000,        // カスタムトークン用に増加
    maxSingleAmount: 1000,        // カスタムトークン用に増加
    maxRecipients: 100,           // カスタムトークン用に増加
    minBalance: 50                // 要件を削減
  };
}
```

## 🧪 修正されたテストシナリオ

### 更新された配布テスト

```javascript
// カスタムトークン用の修正された実配布テスト
const distributionTests = [
  { id: 'RD001', name: 'マイクロ配布 (1 YTT)', amount: 1, recipients: 2 },
  { id: 'RD002', name: '小規模配布 (10 YTT)', amount: 10, recipients: 5 },
  { id: 'RD003', name: '中規模配布 (100 YTT)', amount: 100, recipients: 10 },
  { id: 'RD004', name: '大規模配布 (1000 YTT)', amount: 1000, recipients: 20 },
  { id: 'RD005', name: 'バッチ配布 (500 YTT)', amount: 500, recipients: 25, batchSize: 5 }
];
```

### 更新されたテストコマンド

```bash
# テストコマンドでカスタムトークンを使用
tributary distribute execute \
  --amount 100 \
  --token "YourTokenMintAddressHere" \
  --network testnet \
  --wallet-file "./admin-keypair.json" \
  --batch-size 5 \
  --confirm
```

## 📊 トークン要件

### テスト用最小トークン供給量

| テストフェーズ | 必要トークン量 | 目的 |
|--------------|-------------|------|
| Phase 1 | 0トークン | 基本機能テスト（実配布なし） |
| Phase 2 | 0トークン | 統合テスト（シミュレーションのみ） |
| Phase 3 | 0トークン | パフォーマンステスト（シミュレーションのみ） |
| Phase 4 | 0トークン | 本番準備（検証のみ） |
| Phase 5 | 0トークン | 高度機能（主にシミュレーション） |
| Phase 6 | 2,000+トークン | 実配布テスト |
| **合計** | **2,000+トークン** | **完全なテストカバレッジ用** |

### 推奨トークン配布

```javascript
{
  "adminWallet": 10000,      // メインテストウォレット
  "testRecipients": 5000,    // テスト受信者の事前資金調達
  "emergencyReserve": 2000,  // 予期しないテスト用
  "totalRecommended": 17000
}
```

## 🔄 統合ステップ

### ステップ1: テストセットアップスクリプトの更新

`setup.js`をカスタムトークンに対応するよう修正：

```javascript
async setupCustomTokenEnvironment() {
  console.log('🪙 カスタムトークン環境をセットアップ中...');

  const tokenConfig = {
    address: process.env.CUSTOM_TEST_TOKEN,
    symbol: process.env.TEST_TOKEN_SYMBOL,
    decimals: parseInt(process.env.TEST_TOKEN_DECIMALS),
    name: process.env.TEST_TOKEN_NAME
  };

  if (!tokenConfig.address) {
    console.log('⚠️ カスタムトークンが設定されていません。デフォルトSOL設定を使用します。');
    return;
  }

  console.log(`✅ カスタムトークン設定済み: ${tokenConfig.name} (${tokenConfig.symbol})`);
  console.log(`📍 トークンアドレス: ${tokenConfig.address}`);

  // testnetでトークンが存在することを検証
  await this.validateCustomToken(tokenConfig);
}
```

### ステップ2: 配布機能の更新

実配布テストをカスタムトークン使用に修正：

```javascript
async executeCustomTokenDistribution(test, recipients) {
  const tokenAddress = this.customTokenConfig.tokenAddress;
  const command = [
    'tributary distribute execute',
    `--amount ${test.amount}`,
    `--token "${tokenAddress}"`,
    `--network testnet`,
    `--wallet-file "${this.adminWalletPath}"`,
    `--recipients-file "${this.recipientFile}"`,
    test.batchSize ? `--batch-size ${test.batchSize}` : '',
    '--confirm',
    '--real-distribution'
  ].filter(Boolean).join(' ');

  console.log(`🚀 カスタムトークン配布実行中: ${command}`);
  return await this.executeDistribution(command);
}
```

### ステップ3: 安全性検証の更新

```javascript
async validateCustomTokenBalance() {
  console.log('💰 カスタムトークン残高確認中...');

  const tokenAddress = this.customTokenConfig.tokenAddress;
  const adminWallet = this.adminWalletAddress;

  // トークンアカウント残高を確認
  const balance = await this.getTokenAccountBalance(adminWallet, tokenAddress);

  if (balance < this.config.safetyLimits.minBalance) {
    throw new Error(`カスタムトークン残高不足: ${balance} ${this.customTokenConfig.symbol} (必要: ${this.config.safetyLimits.minBalance})`);
  }

  console.log(`✅ カスタムトークン残高: ${balance} ${this.customTokenConfig.symbol} (十分)`);
  return balance;
}
```

## 🚀 実行手順

### カスタムトークンでのクイックスタート

1. **環境変数設定**:
```bash
export CUSTOM_TEST_TOKEN="YourTokenMintAddressHere"
export TEST_TOKEN_SYMBOL="YTT"
export TEST_TOKEN_DECIMALS="9"
export TEST_TOKEN_NAME="YourTestToken"
```

2. **セットアップ実行**:
```bash
cd 400_test/200_automation
npm install
node setup.js
```

3. **テスト実行**:
```bash
# カスタムトークンでの包括的テスト
npm run test:comprehensive

# カスタムトークンでの実配布
npm run test:real-distribution

# 実配布を含む全テスト
npm run test:all
```

### 検証コマンド

```bash
# カスタムトークン設定の確認
echo "Token: $CUSTOM_TEST_TOKEN"
echo "Symbol: $TEST_TOKEN_SYMBOL"
echo "Decimals: $TEST_TOKEN_DECIMALS"

# トークン残高チェックのテスト
tributary collect --token "$CUSTOM_TEST_TOKEN" --threshold 0.1 --network testnet --dry-run
```

## 📋 利点の要約

| 側面 | testnet SOL | カスタムトークン |
|------|-------------|-----------------|
| **可用性** | ❌ 限定/信頼性なし | ✅ 常時利用可能 |
| **供給量** | ❌ 8時間あたり5 SOL | ✅ 無制限 |
| **制御** | ❌ 外部依存 | ✅ 完全制御 |
| **テスト範囲** | ❌ 非常に限定的 | ✅ 包括的 |
| **信頼性** | ❌ 予測不可能 | ✅ 一貫性 |
| **セットアップ時間** | ❌ 数日/数週間 | ✅ 数分 |
| **コスト** | ❌ 時間コスト高 | ✅ ゼロコスト |

## 🎯 結論

カスタムSPLトークンの使用は単なる回避策ではなく、以下を提供する**優れたテストアプローチ**です：

- **無制限のテスト機能**
- **信頼性があり一貫した結果**
- **テスト条件の完全制御**
- **外部フォーセットへの依存ゼロ**
- **現実的なSPLトークン機能テスト**

このアプローチにより、限定的で信頼性の低いtestnet SOLフォーセットでは不可能な包括的テストが可能になります。

英語版については、[Custom_Token_Setup.md](./CUSTOM_TOKEN_SETUP.md)を参照してください。