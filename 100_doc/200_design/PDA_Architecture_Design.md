# PDA（Program Derived Address）アーキテクチャ設計書

## 概要
マルチウォレット配布システム用のPDAアーキテクチャを設計し、複数ウォレット統合管理における状態管理、透明性、監査性を実現する。ユーザーの要件に応じて統合PDA構成と分離PDA構成を選択可能とする。

## 1. 設計方針と利用範囲

### 1.1 利用範囲の明確化
**v1.0.0での対象**:
- ✅ **マルチウォレット配布**: PDA管理（構成選択可能）
- ❌ **単一ウォレット配布**: 従来方式（PDAなし）

**設計判断の根拠**:
- **開発効率**: コア機能への集中
- **複雑性管理**: 必要な場面でのみPDA利用
- **段階的導入**: ユーザー負担の最小化
- **柔軟性**: 利用者要件に応じた構成選択

### 1.2 PDA構成パターン

#### 1.2.1 統合PDA構成
- 単一PDAで全データを管理
- 最大50ウォレットグループ対応
- シンプルな実装

#### 1.2.2 分離PDA構成
- 処理PDAとデータPDAの分離
- 容量制限を超える大規模管理
- 複雑だが拡張性高

### 1.3 PDAの役割
1. **マルチウォレット統合状態の管理**
2. **配布履歴の透明な記録**
3. **ユーザーグループの権限管理**
4. **配布設定の不変性保証**
5. **アクセス制御とマルチシグ状態の管理**
6. **監査ログの永続化**

## 2. PDA構成選択メカニズム

### 2.1 構成選択インターフェース
```typescript
interface PDAConfigurationManager {
  // 初期化時の構成選択
  initializeProject(config: PDAInitConfig): Promise<PDAProjectResult>;

  // 構成の動的変更
  switchConfiguration(
    projectPDA: PublicKey,
    targetConfig: PDAMode
  ): Promise<ConfigurationSwitchResult>;

  // 構成状態の確認
  getCurrentConfiguration(projectPDA: PublicKey): Promise<PDAConfigurationStatus>;
}

interface PDAInitConfig {
  mode: 'unified' | 'separated';
  maxRecordsPerPDA: number;
  constructionTiming: 'library_deploy' | 'user_first_use' | 'hybrid';
  autoExpansionEnabled: boolean;
}
```

### 2.2 構成選択の実装フロー
1. **初期化時選択**: CLIコマンドでの構成指定
2. **動的検証**: 現在のデータ量に基づく推奨構成提示
3. **移行支援**: 構成変更時のデータ移行機能
4. **整合性確認**: 移行後のデータ整合性検証

## 3. PDAデータ構造設計

### 3.1 統合PDA構造
単一PDAで全データを管理する構成。最大50ウォレットグループまで対応。

```rust
#[account]
pub struct UnifiedTributaryProjectPDA {
    /// 構成識別情報
    pub configuration_mode: ConfigurationMode,
    pub max_wallet_groups: u32,           // 50固定
    /// プロジェクト基本情報
    pub project_id: String,                    // プロジェクト識別子
    pub project_name: String,                  // プロジェクト名
    pub created_at: i64,                       // 作成タイムスタンプ
    pub authority: Pubkey,                     // プロジェクト管理者

    /// マルチウォレット設定
    pub wallet_groups: Vec<UserWalletGroup>,   // ユーザーウォレットグループ
    pub base_token_mint: Pubkey,               // 配布対象基準トークン
    pub supported_tokens: Vec<Pubkey>,         // サポートトークンリスト

    /// 配布設定
    pub distribution_config: DistributionConfig,
    pub multi_token_weighting: MultiTokenWeightingConfig,
    pub multi_wallet_weighting: MultiWalletWeightingConfig,

    /// 状態管理
    pub status: ProjectStatus,                 // プロジェクト状態
    pub last_distribution: Option<i64>,        // 最終配布時刻
    pub total_distributions: u64,              // 累計配布回数

    /// セキュリティ
    pub access_control: AccessControlConfig,
    pub audit_settings: AuditConfig,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ConfigurationMode {
    Unified,
    Separated,
}
```

### 3.2 分離PDA構造
処理制御とデータ管理を分離する構成。大規模データ管理に対応。

#### 3.2.1 処理PDA
```rust
#[account]
pub struct ProcessingPDA {
    /// 構成識別情報
    pub configuration_mode: ConfigurationMode,
    pub data_pda_count: u32,

    /// プロジェクト基本情報
    pub project_id: String,
    pub project_name: String,
    pub created_at: i64,
    pub authority: Pubkey,

    /// データPDA参照
    pub wallet_groups_pdas: Vec<Pubkey>,       // ウォレットグループPDAリスト
    pub distribution_history_pdas: Vec<Pubkey>, // 配布履歴PDAリスト

    /// 実行状態
    pub status: ProjectStatus,
    pub last_distribution: Option<i64>,
    pub total_distributions: u64,

    /// セキュリティ
    pub access_control: AccessControlConfig,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DataPDAReference {
    pub pda_address: Pubkey,
    pub data_type: DataPDAType,
    pub record_count: u32,
    pub created_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum DataPDAType {
    WalletGroups,
    DistributionHistory,
}
```

#### 3.2.2 データPDA
```rust
#[account]
pub struct WalletGroupsDataPDA {
    pub parent_pda: Pubkey,                    // 処理PDAへの参照
    pub data_index: u32,                       // データPDAインデックス
    pub wallet_groups: Vec<UserWalletGroup>,   // 最大88グループ
    pub group_count: u32,
    pub last_updated: i64,
}

#[account]
pub struct DistributionHistoryDataPDA {
    pub parent_pda: Pubkey,                    // 処理PDAへの参照
    pub data_index: u32,                       // データPDAインデックス
    pub distribution_records: Vec<DistributionRecord>, // 最大50記録
    pub record_count: u32,
    pub last_updated: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UserWalletGroup {
    pub user_id: String,
    pub wallet_addresses: Vec<Pubkey>,
    pub custom_weight: Option<f64>,
    pub verification_method: VerificationMethod,
    pub added_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum VerificationMethod {
    ManualGrouping,
    SignatureVerification { signatures: Vec<[u8; 64]> },
    PDAAuthority { pda_address: Pubkey },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ProjectStatus {
    Active,
    Paused,
    Archived,
    Migrating,
}
```

### 2.2 配布履歴PDA構造

```rust
#[account]
pub struct DistributionHistoryPDA {
    /// 基本情報
    pub distribution_id: String,
    pub project_pda: Pubkey,                   // メインPDAへの参照
    pub executed_at: i64,
    pub executor: Pubkey,

    /// 配布詳細
    pub token_mint: Pubkey,                    // 配布トークン
    pub total_amount: u64,                     // 総配布量
    pub recipient_count: u32,                  // 受信者数

    /// 設定のスナップショット
    pub config_snapshot: DistributionConfigSnapshot,
    pub weighting_snapshot: WeightingConfigSnapshot,

    /// 結果
    pub execution_results: ExecutionResults,
    pub transaction_signatures: Vec<String>,

    /// メタデータ
    pub metadata: DistributionMetadata,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ExecutionResults {
    pub successful_transfers: u32,
    pub failed_transfers: u32,
    pub total_gas_used: u64,
    pub execution_time_ms: u64,
    pub error_summary: Vec<ErrorSummary>,
}
```

## 3. PDAアドレス生成戦略

### 3.1 メインPDAアドレス生成

```typescript
// プロジェクトPDAアドレス生成
function findProjectPDAAddress(
  programId: PublicKey,
  authority: PublicKey,
  projectId: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("tributary_project"),
      authority.toBuffer(),
      Buffer.from(projectId)
    ],
    programId
  );
}
```

### 3.2 配布履歴PDAアドレス生成

```typescript
// 配布履歴PDAアドレス生成
function findDistributionHistoryPDAAddress(
  programId: PublicKey,
  projectPDA: PublicKey,
  distributionId: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("distribution_history"),
      projectPDA.toBuffer(),
      Buffer.from(distributionId)
    ],
    programId
  );
}
```

## 4. PDA操作の設計

### 4.1 プロジェクト初期化

```rust
#[derive(Accounts)]
#[instruction(project_id: String)]
pub struct InitializeProject<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + TributaryProjectPDA::INIT_SPACE,
        seeds = [b"tributary_project", authority.key().as_ref(), project_id.as_bytes()],
        bump
    )]
    pub project_pda: Account<'info, TributaryProjectPDA>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_project(
    ctx: Context<InitializeProject>,
    project_id: String,
    project_name: String,
    base_token_mint: Pubkey,
    initial_config: InitialProjectConfig,
) -> Result<()> {
    let project_pda = &mut ctx.accounts.project_pda;

    project_pda.project_id = project_id;
    project_pda.project_name = project_name;
    project_pda.created_at = Clock::get()?.unix_timestamp;
    project_pda.authority = ctx.accounts.authority.key();
    project_pda.base_token_mint = base_token_mint;
    project_pda.wallet_groups = Vec::new();
    project_pda.status = ProjectStatus::Active;
    project_pda.total_distributions = 0;

    // 初期設定の適用
    project_pda.distribution_config = initial_config.distribution_config;
    project_pda.multi_token_weighting = initial_config.multi_token_weighting;
    project_pda.multi_wallet_weighting = initial_config.multi_wallet_weighting;

    emit!(ProjectInitialized {
        project_pda: project_pda.key(),
        authority: ctx.accounts.authority.key(),
        project_id,
    });

    Ok(())
}
```

### 4.2 ウォレットグループ管理

```rust
#[derive(Accounts)]
pub struct AddWalletGroup<'info> {
    #[account(
        mut,
        seeds = [b"tributary_project", authority.key().as_ref(), project_pda.project_id.as_bytes()],
        bump,
        has_one = authority
    )]
    pub project_pda: Account<'info, TributaryProjectPDA>,

    pub authority: Signer<'info>,
}

pub fn add_wallet_group(
    ctx: Context<AddWalletGroup>,
    user_id: String,
    wallet_addresses: Vec<Pubkey>,
    verification_method: VerificationMethod,
) -> Result<()> {
    let project_pda = &mut ctx.accounts.project_pda;

    // 重複チェック
    require!(
        !project_pda.wallet_groups.iter().any(|group| group.user_id == user_id),
        ErrorCode::UserGroupAlreadyExists
    );

    // ウォレット数制限チェック
    require!(
        wallet_addresses.len() <= project_pda.multi_wallet_weighting.max_wallets_per_user as usize,
        ErrorCode::TooManyWalletsPerUser
    );

    let new_group = UserWalletGroup {
        user_id: user_id.clone(),
        wallet_addresses,
        custom_weight: None,
        verification_method,
        added_at: Clock::get()?.unix_timestamp,
    };

    project_pda.wallet_groups.push(new_group);

    emit!(WalletGroupAdded {
        project_pda: project_pda.key(),
        user_id,
        wallet_count: wallet_addresses.len(),
    });

    Ok(())
}
```

### 4.3 配布実行

```rust
#[derive(Accounts)]
#[instruction(distribution_id: String)]
pub struct ExecuteDistribution<'info> {
    #[account(
        mut,
        seeds = [b"tributary_project", authority.key().as_ref(), project_pda.project_id.as_bytes()],
        bump,
        has_one = authority
    )]
    pub project_pda: Account<'info, TributaryProjectPDA>,

    #[account(
        init,
        payer = authority,
        space = 8 + DistributionHistoryPDA::INIT_SPACE,
        seeds = [b"distribution_history", project_pda.key().as_ref(), distribution_id.as_bytes()],
        bump
    )]
    pub distribution_history: Account<'info, DistributionHistoryPDA>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// 配布トークンのミント
    pub token_mint: Account<'info, Mint>,

    /// 配布元トークンアカウント
    #[account(
        mut,
        constraint = source_token_account.mint == token_mint.key(),
        constraint = source_token_account.owner == authority.key()
    )]
    pub source_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn execute_distribution(
    ctx: Context<ExecuteDistribution>,
    distribution_id: String,
    total_amount: u64,
    distribution_plan: DistributionPlan,
) -> Result<()> {
    let project_pda = &mut ctx.accounts.project_pda;
    let distribution_history = &mut ctx.accounts.distribution_history;

    // 配布実行前チェック
    require!(
        project_pda.status == ProjectStatus::Active,
        ErrorCode::ProjectNotActive
    );

    // 配布履歴の初期化
    distribution_history.distribution_id = distribution_id;
    distribution_history.project_pda = project_pda.key();
    distribution_history.executed_at = Clock::get()?.unix_timestamp;
    distribution_history.executor = ctx.accounts.authority.key();
    distribution_history.token_mint = ctx.accounts.token_mint.key();
    distribution_history.total_amount = total_amount;
    distribution_history.recipient_count = distribution_plan.recipients.len() as u32;

    // 設定のスナップショット保存
    distribution_history.config_snapshot = DistributionConfigSnapshot::from(&project_pda.distribution_config);
    distribution_history.weighting_snapshot = WeightingConfigSnapshot::from(&project_pda.multi_wallet_weighting);

    // 実際の配布処理は別命令で実行（CPIまたはクライアント側）
    // ここでは履歴の記録のみ

    project_pda.last_distribution = Some(Clock::get()?.unix_timestamp);
    project_pda.total_distributions += 1;

    emit!(DistributionExecuted {
        project_pda: project_pda.key(),
        distribution_id,
        token_mint: ctx.accounts.token_mint.key(),
        total_amount,
        recipient_count: distribution_plan.recipients.len(),
    });

    Ok(())
}
```

## 5. クライアント側PDA統合

### 5.1 PDAプロジェクト初期化

```typescript
class PDAProjectManager {
  constructor(
    private program: Program<TributaryProgram>,
    private connection: Connection
  ) {}

  async initializeProject(
    authority: Keypair,
    projectConfig: PDAProjectConfig
  ): Promise<PDAProjectResult> {
    const [projectPDA, bump] = this.findProjectPDAAddress(
      authority.publicKey,
      projectConfig.projectId
    );

    const tx = await this.program.methods
      .initializeProject(
        projectConfig.projectId,
        projectConfig.projectName,
        projectConfig.baseTokenMint,
        projectConfig.initialConfig
      )
      .accounts({
        projectPda: projectPDA,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    return {
      projectPDA,
      bump,
      transactionSignature: tx,
    };
  }

  async addWalletGroup(
    authority: Keypair,
    projectPDA: PublicKey,
    groupConfig: WalletGroupConfig
  ): Promise<string> {
    const tx = await this.program.methods
      .addWalletGroup(
        groupConfig.userId,
        groupConfig.walletAddresses,
        groupConfig.verificationMethod
      )
      .accounts({
        projectPda: projectPDA,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    return tx;
  }
}
```

### 5.2 PDA配布実行

```typescript
class PDADistributionExecutor {
  async executeMultiWalletDistribution(
    authority: Keypair,
    projectPDA: PublicKey,
    distributionConfig: PDADistributionConfig
  ): Promise<PDADistributionResult> {
    // 1. プロジェクトPDAから設定読み込み
    const projectData = await this.program.account.tributaryProjectPda.fetch(projectPDA);

    // 2. マルチウォレット重み付け計算
    const userWeights = await this.calculateMultiWalletWeights(
      projectData.walletGroups,
      projectData.multiWalletWeighting
    );

    // 3. 配布計画作成
    const distributionPlan = await this.createDistributionPlan(
      userWeights,
      distributionConfig.totalAmount,
      projectData.distributionConfig
    );

    // 4. 配布履歴PDA作成
    const distributionId = this.generateDistributionId();
    const [distributionHistoryPDA] = this.findDistributionHistoryPDAAddress(
      projectPDA,
      distributionId
    );

    // 5. 配布実行命令
    const tx = await this.program.methods
      .executeDistribution(
        distributionId,
        distributionConfig.totalAmount,
        distributionPlan
      )
      .accounts({
        projectPda: projectPDA,
        distributionHistory: distributionHistoryPDA,
        authority: authority.publicKey,
        tokenMint: distributionConfig.tokenMint,
        sourceTokenAccount: distributionConfig.sourceTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    // 6. 実際のトークン転送実行
    const transferResults = await this.executeTokenTransfers(
      authority,
      distributionPlan,
      distributionConfig
    );

    // 7. 結果の記録
    await this.updateDistributionResults(
      distributionHistoryPDA,
      transferResults
    );

    return {
      distributionId,
      projectPDA,
      distributionHistoryPDA,
      transactionSignature: tx,
      transferResults,
    };
  }
}
```

## 6. セキュリティとガバナンス

### 6.1 アクセス制御

#### 6.1.1 階層的権限管理
```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AccessControlConfig {
    pub security_level: SecurityLevel,
    pub require_multi_sig: bool,
    pub authorized_signers: Vec<Pubkey>,
    pub min_signatures: u8,
    pub emergency_pause_authority: Option<Pubkey>,
    pub permission_matrix: Vec<PermissionEntry>,
    pub delegation_config: DelegationConfig,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum SecurityLevel {
    Simple,
    Standard,
    Advanced,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PermissionEntry {
    pub user: Pubkey,
    pub operations: Vec<Operation>,
    pub level: PermissionLevel,
    pub expires_at: Option<i64>,
    pub delegated_by: Option<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum Operation {
    Collect,
    Distribute,
    ConfigChange,
    SecurityChange,
    WalletGroupManage,
    EmergencyAccess,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum PermissionLevel {
    Read,
    Write,
    Admin,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DelegationConfig {
    pub enabled: bool,
    pub max_delegation_depth: u8,
    pub require_approval: bool,
    pub auto_revoke_on_emergency: bool,
}
```

#### 6.1.2 マルチシグネチャ統合
```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MultisigConfiguration {
    pub enabled: bool,
    pub operation_configs: Vec<OperationMultisigConfig>,
    pub emergency_bypass: EmergencyBypassConfig,
    pub hierarchical_approval: Option<ApprovalHierarchy>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OperationMultisigConfig {
    pub operation: Operation,
    pub threshold: u8,
    pub signers: Vec<Pubkey>,
    pub conditions: MultisigConditions,
    pub timeout_seconds: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MultisigConditions {
    pub min_amount: Option<u64>,
    pub max_amount: Option<u64>,
    pub time_window: Option<TimeWindow>,
    pub user_types: Vec<UserType>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SignatureSession {
    pub session_id: String,
    pub operation: Operation,
    pub initiator: Pubkey,
    pub threshold: u8,
    pub current_signatures: Vec<(Pubkey, [u8; 64])>,
    pub status: SessionStatus,
    pub created_at: i64,
    pub expires_at: i64,
    pub operation_data: Vec<u8>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum SessionStatus {
    Pending,
    Approved,
    Executed,
    Expired,
    Rejected,
}
```

### 6.2 監査とログ

#### 6.2.1 包括的監査ログ構造
```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AuditConfiguration {
    pub level: AuditLevel,
    pub log_level: LogLevel,
    pub output_destinations: Vec<OutputDestination>,
    pub privacy_masking: bool,
    pub retention_config: RetentionConfig,
    pub operation_configs: Vec<OperationAuditConfig>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum AuditLevel {
    Minimal,
    Standard,
    Comprehensive,
    Custom,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum LogLevel {
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum OutputDestination {
    Console,
    File,
    PDA,
    External,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OperationAuditConfig {
    pub operation: Operation,
    pub log_level: LogLevel,
    pub include_parameters: bool,
    pub include_result: bool,
    pub mask_sensitive: bool,
}
```

#### 6.2.2 イベント定義とログ記録
```rust
// セキュリティ関連イベント
#[event]
pub struct SecurityConfigChanged {
    pub project_pda: Pubkey,
    pub changed_by: Pubkey,
    pub change_type: SecurityChangeType,
    pub old_config_hash: [u8; 32],
    pub new_config_hash: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct PermissionGranted {
    pub project_pda: Pubkey,
    pub granted_to: Pubkey,
    pub granted_by: Pubkey,
    pub operations: Vec<Operation>,
    pub level: PermissionLevel,
    pub expires_at: Option<i64>,
    pub timestamp: i64,
}

#[event]
pub struct PermissionRevoked {
    pub project_pda: Pubkey,
    pub revoked_from: Pubkey,
    pub revoked_by: Pubkey,
    pub operations: Vec<Operation>,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct MultisigSessionInitiated {
    pub project_pda: Pubkey,
    pub session_id: String,
    pub operation: Operation,
    pub initiator: Pubkey,
    pub threshold: u8,
    pub required_signers: Vec<Pubkey>,
    pub expires_at: i64,
    pub timestamp: i64,
}

#[event]
pub struct MultisigSignatureAdded {
    pub project_pda: Pubkey,
    pub session_id: String,
    pub signer: Pubkey,
    pub signature_count: u8,
    pub threshold: u8,
    pub timestamp: i64,
}

#[event]
pub struct MultisigOperationExecuted {
    pub project_pda: Pubkey,
    pub session_id: String,
    pub operation: Operation,
    pub executed_by: Pubkey,
    pub final_signature_count: u8,
    pub execution_result: ExecutionResult,
    pub timestamp: i64,
}

#[event]
pub struct EmergencyAccessUsed {
    pub project_pda: Pubkey,
    pub emergency_user: Pubkey,
    pub operation: Operation,
    pub justification: String,
    pub access_duration: i64,
    pub timestamp: i64,
    pub risk_level: RiskLevel,
}

// 通常操作イベント
#[event]
pub struct ProjectInitialized {
    pub project_pda: Pubkey,
    pub authority: Pubkey,
    pub project_id: String,
    pub security_level: SecurityLevel,
    pub timestamp: i64,
}

#[event]
pub struct WalletGroupAdded {
    pub project_pda: Pubkey,
    pub user_id: String,
    pub wallet_count: usize,
    pub added_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct DistributionExecuted {
    pub project_pda: Pubkey,
    pub distribution_id: String,
    pub token_mint: Pubkey,
    pub total_amount: u64,
    pub recipient_count: usize,
    pub executed_by: Pubkey,
    pub multisig_session_id: Option<String>,
    pub timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum SecurityChangeType {
    AccessControlUpdate,
    MultisigConfigUpdate,
    AuditConfigUpdate,
    EmergencyConfigUpdate,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ExecutionResult {
    Success,
    PartialSuccess,
    Failed,
    Reverted,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}
```

#### 6.2.3 プライバシー保護とデータ保持
```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RetentionConfig {
    pub retention_days: u32,
    pub auto_archive: bool,
    pub compression_enabled: bool,
    pub export_format: ExportFormat,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PrivacyMaskingConfig {
    pub mask_wallet_addresses: bool,
    pub mask_amounts: bool,
    pub mask_user_identifiers: bool,
    pub partial_mask_length: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ExportFormat {
    Json,
    Csv,
    Xml,
    Binary,
}
```

## 7. 性能・効率性要件

### 7.1 必要最低限の性能設計

#### 7.1.1 基本読み取り性能
```rust
// 必要最低限のページネーション
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PaginationConfig {
    pub page_size: u16,  // デフォルト: 50
    pub max_page_size: u16,  // 最大: 100
}

// シンプルなウォレットグループ取得
impl WalletGroupManager {
    pub fn get_wallet_groups_paginated(
        &self,
        start_index: u16,
        count: u16
    ) -> Result<Vec<WalletGroup>, ProgramError> {
        let effective_count = count.min(self.pagination_config.max_page_size);
        // 基本的な範囲取得のみ実装
    }
}
```

#### 7.1.2 必要最低限のキャッシュ
- **ローカルキャッシュのみ**: クライアント側でのシンプルなメモリキャッシュ
- **検索機能なし**: v1.0.0では高度な検索機能は実装しない
- **基本的なページング**: 順次読み込みのみサポート

### 7.2 書き込み効率化（必要最低限）

#### 7.2.1 バッチ操作の基本設計
```rust
// 必要最低限のバッチ操作
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BatchConfig {
    pub max_batch_size: u8,  // 最大: 10操作/バッチ
    pub timeout_seconds: u16,  // デフォルト: 300秒
}

// バッチ対象操作（最小限）
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum BatchableOperation {
    AddWalletGroup(WalletGroupData),
    UpdateWalletGroup(String, WalletGroupData),
    RemoveWalletGroup(String),
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BatchOperation {
    pub operations: Vec<BatchableOperation>,
    pub execute_all_or_none: bool,  // 全成功または全失敗
}
```

#### 7.2.2 部分失敗時の対応（シンプル）
- **All-or-Nothing方式**: 1つでも失敗したら全て取り消し
- **個別ステータス記録**: 各操作の成功/失敗を記録
- **ロールバック機能**: 失敗時は変更前の状態に復元

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BatchResult {
    pub batch_id: String,
    pub total_operations: u8,
    pub successful_operations: u8,
    pub failed_operations: u8,
    pub operation_results: Vec<OperationResult>,
    pub rollback_performed: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OperationResult {
    pub operation_index: u8,
    pub status: OperationStatus,
    pub error_message: Option<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum OperationStatus {
    Success,
    Failed,
    Skipped,
    RolledBack,
}
```

### 7.3 コスト管理とユーザビリティ

#### 7.3.1 事前コスト予測（ユーザーフレンドリー）
```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CostEstimation {
    pub operation_type: Operation,
    pub estimated_sol_cost: u64,  // ラムポート単位
    pub estimated_usd_cost: Option<f64>,  // 参考価格
    pub cost_breakdown: CostBreakdown,
    pub confidence_level: u8,  // 予測精度 (0-100%)
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CostBreakdown {
    pub pda_creation: u64,
    pub data_storage: u64,
    pub transaction_fees: u64,
    pub compute_units: u64,
}

// ユーザビリティ重視のコスト表示タイミング
impl CostManager {
    // 操作実行前の必須確認
    pub fn estimate_cost_before_operation(
        &self,
        operation: &Operation,
        data_size: u32
    ) -> Result<CostEstimation, ProgramError> {
        // 重要操作時のみコスト表示を必須とする
    }

    // コスト上限設定（ユーザー保護）
    pub fn set_cost_limit(
        &mut self,
        daily_limit_sol: u64,
        per_operation_limit_sol: u64
    ) -> Result<(), ProgramError> {
        // ユーザーの意図しない高額課金を防止
    }
}
```

#### 7.3.2 適切なタイミングでのコスト表示
```typescript
// CLI でのユーザビリティ重視実装
interface CostDisplayConfig {
  // 必須表示タイミング
  showBeforeExpensiveOperations: true;  // PDA作成、大量データ操作
  showBeforeFirstTime: true;           // 初回操作時
  showOnBatchOperations: true;         // バッチ処理時

  // オプション表示
  showDetailedBreakdown: false;        // 通常時は簡素化
  showUSDEquivalent: true;            // 分かりやすい表示
  confirmationRequired: true;          // 高額時は確認必須

  // しきい値設定
  expensiveOperationThreshold: 0.01;   // 0.01 SOL以上で警告
  confirmationThreshold: 0.1;          // 0.1 SOL以上で確認必須
}

// ユーザーフレンドリーなコスト表示例
/*
$ tributary multi-wallet init --pda-mode unified

Cost Estimation:
- PDA Creation: ~0.0024 SOL (~$0.12)
- Storage (50 groups): ~0.0015 SOL (~$0.08)
- Total: ~0.0039 SOL (~$0.20)

Continue? [y/N]:
*/
```

#### 7.3.3 効率化（ユーザー制御重視）
```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ResourceOptimization {
    // 未使用リソース削除（ユーザー制御）
    pub cleanup_config: CleanupConfig,
    // データ圧縮は v1.0.0 では実装しない
    // pub data_compression: bool,  // 今回は不要

    // 使用量監視（必須）
    pub usage_monitoring: UsageMonitoringConfig,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CleanupConfig {
    pub enabled: bool,                    // ユーザーが有効/無効を制御
    pub retention_days: u32,              // ユーザー設定可能（デフォルト: 30日）
    pub auto_cleanup: bool,               // 自動削除の有効/無効
    pub cleanup_schedule: CleanupSchedule, // 実行頻度をユーザーが制御
    pub confirm_before_cleanup: bool,     // 削除前確認の有無
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum CleanupSchedule {
    Manual,      // 手動実行のみ
    Daily,       // 毎日実行
    Weekly,      // 毎週実行
    Monthly,     // 毎月実行
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UsageMonitoringConfig {
    pub enabled: bool,                    // 必須機能だがユーザーが制御可能
    pub report_frequency: ReportFrequency,
    pub alert_thresholds: UsageThresholds,
    pub detailed_tracking: bool,          // 詳細追跡の有無
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ReportFrequency {
    Daily,
    Weekly,
    Monthly,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UsageThresholds {
    pub storage_warning_mb: u32,          // ストレージ警告しきい値
    pub cost_warning_sol: u64,            // コスト警告しきい値
    pub transaction_count_warning: u32,   // トランザクション数警告
}

// ユーザー制御重視の効率化機能
impl ResourceManager {
    // ユーザー制御による未使用データ削除
    pub fn cleanup_unused_data_user_controlled(
        &self,
        config: &CleanupConfig
    ) -> Result<CleanupResult, ProgramError> {
        if !config.enabled {
            return Ok(CleanupResult::Skipped);
        }

        if config.confirm_before_cleanup {
            // ユーザー確認を要求
        }

        // ユーザー指定の保持期間で削除実行
    }

    // 必須の使用量監視
    pub fn monitor_usage(&self, config: &UsageMonitoringConfig) -> UsageReport {
        if !config.enabled {
            // 監視無効でも基本情報は記録
            return self.get_basic_usage_report();
        }

        // 詳細な使用量監視とレポート生成
    }

    // ユーザーフレンドリーな使用量確認
    pub fn get_current_usage_summary(&self) -> UsageSummary {
        // ダッシュボード形式の使用状況表示
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CleanupResult {
    pub action: CleanupAction,
    pub deleted_items: u32,
    pub freed_storage_bytes: u64,
    pub estimated_cost_saved_sol: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum CleanupAction {
    Executed,
    Skipped,
    UserCancelled,
    Failed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UsageReport {
    pub period: DateRange,
    pub storage_used_mb: u32,
    pub transaction_count: u32,
    pub total_cost_sol: u64,
    pub trend_analysis: TrendAnalysis,
    pub recommendations: Vec<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UsageSummary {
    pub current_storage_mb: u32,
    pub monthly_cost_sol: u64,
    pub active_pdas: u32,
    pub last_cleanup_date: Option<i64>,
    pub next_scheduled_cleanup: Option<i64>,
}
```

### 7.4 設定変更の柔軟性（最大限の柔軟性）

#### 7.4.1 PDAでの設定変更可能範囲
```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ConfigurationFlexibility {
    // PDAで変更可能な設定（最大限の柔軟性）
    pub mutable_configs: MutableConfigs,
    // PDA技術制約により変更不可な設定
    pub immutable_configs: ImmutableConfigs,
    // 変更履歴管理はユーザー側で実施
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MutableConfigs {
    // ✅ 完全に変更可能（PDAデータ更新）
    pub security_settings: SecuritySettings,        // アクセス制御、マルチシグ
    pub audit_settings: AuditSettings,              // ログレベル、出力先
    pub cost_settings: CostSettings,                // 上限、警告しきい値
    pub cleanup_settings: CleanupConfig,            // 自動削除設定
    pub usage_monitoring: UsageMonitoringConfig,    // 監視設定
    pub operational_params: OperationalParams,      // バッチサイズ、タイムアウト

    // ✅ 柔軟な管理（追加・変更・無効化・削除すべて可能）
    pub wallet_groups: Vec<WalletGroup>,            // 完全な CRUD 操作
    pub authorized_users: Vec<AuthorizedUser>,      // 完全な CRUD 操作
    pub permission_matrix: Vec<PermissionEntry>,    // 権限の動的変更
    pub multisig_configs: Vec<MultisigConfig>,      // マルチシグ設定の変更

    // ✅ メタデータの変更
    pub project_metadata: ProjectMetadata,          // プロジェクト説明、タグ等
    pub display_settings: DisplaySettings,         // UI表示設定
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ImmutableConfigs {
    // ❌ PDA技術制約により変更不可（Solanaネットワーク制約）
    pub pda_address: Pubkey,                       // PDAアドレス（変更不可）
    pub creation_timestamp: i64,                   // 作成時刻（変更不可）
    pub pda_bump: u8,                              // PDA bump seed（変更不可）

    // ⚠️ 制限的変更（新PDA作成が必要）
    pub pda_mode: PDAMode,                         // unified/separated（移行時は新PDA）
    pub max_account_size: u32,                     // アカウントサイズ上限（Solana制約）
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AuthorizedUser {
    pub user_pubkey: Pubkey,
    pub permissions: Vec<Permission>,
    pub created_at: i64,
    pub created_by: Pubkey,

    // 無効化機能
    pub status: UserStatus,
    pub disabled_at: Option<i64>,
    pub disabled_by: Option<Pubkey>,
    pub disabled_reason: Option<String>,

    // 最終アクセス記録（オプション）
    pub last_active_at: Option<i64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum UserStatus {
    Active,
    Disabled,
    Suspended,      // 一時停止
    PendingReview,  // 審査中
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct WalletGroup {
    pub group_id: String,
    pub user_id: String,
    pub wallet_addresses: Vec<Pubkey>,
    pub created_at: i64,

    // 無効化機能
    pub status: GroupStatus,
    pub disabled_at: Option<i64>,
    pub disabled_by: Option<Pubkey>,
    pub disabled_reason: Option<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum GroupStatus {
    Active,
    Disabled,
    Archived,       // アーカイブ済み
}

// 最大限の柔軟性を持つ設定管理
impl ConfigurationManager {
    // 完全なCRUD操作：ユーザー管理
    pub fn add_user(&mut self, user: AuthorizedUser) -> Result<(), ProgramError> {
        self.authorized_users.push(user);
        Ok(())
    }

    pub fn update_user(&mut self, user_pubkey: &Pubkey, updated_user: AuthorizedUser) -> Result<(), ProgramError> {
        if let Some(user) = self.find_user_mut(user_pubkey) {
            *user = updated_user;
            Ok(())
        } else {
            Err(ProgramError::Custom(0x102))
        }
    }

    pub fn remove_user(&mut self, user_pubkey: &Pubkey) -> Result<(), ProgramError> {
        self.authorized_users.retain(|user| user.user_pubkey != *user_pubkey);
        Ok(())
    }

    // 完全なCRUD操作：ウォレットグループ管理
    pub fn add_wallet_group(&mut self, group: WalletGroup) -> Result<(), ProgramError> {
        self.wallet_groups.push(group);
        Ok(())
    }

    pub fn update_wallet_group(&mut self, group_id: &str, updated_group: WalletGroup) -> Result<(), ProgramError> {
        if let Some(group) = self.find_wallet_group_mut(group_id) {
            *group = updated_group;
            Ok(())
        } else {
            Err(ProgramError::Custom(0x103))
        }
    }

    pub fn remove_wallet_group(&mut self, group_id: &str) -> Result<(), ProgramError> {
        self.wallet_groups.retain(|group| group.group_id != group_id);
        Ok(())
    }

    // 柔軟な設定変更
    pub fn update_any_config<T>(&mut self, config_data: T) -> Result<(), ProgramError>
    where
        T: AnchorSerialize + AnchorDeserialize
    {
        // PDAサイズ制約チェックのみ実施
        let serialized_size = config_data.try_to_vec()?.len();
        if self.current_size() + serialized_size > MAX_PDA_SIZE {
            return Err(ProgramError::Custom(0x200)); // サイズ制限超過
        }

        // 制約内なら任意の設定変更を許可
        Ok(())
    }

    // 状態変更（無効化/有効化）
    pub fn toggle_user_status(&mut self, user_pubkey: &Pubkey, new_status: UserStatus) -> Result<(), ProgramError> {
        if let Some(user) = self.find_user_mut(user_pubkey) {
            user.status = new_status;
            Ok(())
        } else {
            Err(ProgramError::Custom(0x102))
        }
    }

    pub fn toggle_group_status(&mut self, group_id: &str, new_status: GroupStatus) -> Result<(), ProgramError> {
        if let Some(group) = self.find_wallet_group_mut(group_id) {
            group.status = new_status;
            Ok(())
        } else {
            Err(ProgramError::Custom(0x103))
        }
    }
    // 安全な設定変更
    pub fn update_mutable_config(
        &mut self,
        config_type: MutableConfigType,
        new_config: Vec<u8>,
        authority: &Pubkey
    ) -> Result<ConfigChangeResult, ProgramError> {
        // 1. 権限チェック
        // 2. 影響範囲評価
        // 3. バックアップ作成
        // 4. 段階的適用
    }

    // 設定変更の影響範囲制限
    pub fn evaluate_change_impact(
        &self,
        proposed_change: ConfigChange
    ) -> ChangeImpactAnalysis {
        // PDA制約内での変更可能性を評価
    }
}
```

#### 7.4.2 変更時の影響範囲制限（PDA技術制約）
```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ChangeImpactAnalysis {
    pub change_feasibility: ChangeFeasibility,
    pub affected_components: Vec<AffectedComponent>,
    pub required_migration: Option<MigrationPlan>,
    pub rollback_strategy: RollbackStrategy,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ChangeFeasibility {
    // ✅ 即座に変更可能
    ImmediatelyApplicable,
    // ⚠️ 制限付きで変更可能
    LimitedChange { constraints: Vec<String> },
    // 🔄 マイグレーション必要
    RequiresMigration { complexity: MigrationComplexity },
    // ❌ PDA制約により変更不可
    NotPossible { reason: String },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum MigrationComplexity {
    Simple,      // データ形式変換のみ
    Moderate,    // 一部データ再構築
    Complex,     // 新PDA作成 + データ移行
    Impossible,  // 技術的に不可能
}

// PDA制約を考慮した変更実装
impl PDAConstraintManager {
    // PDAサイズ制約チェック
    pub fn check_size_constraints(
        &self,
        current_size: usize,
        proposed_addition: usize
    ) -> Result<(), ConstraintViolation> {
        // Solana PDAサイズ上限（10KB）をチェック
        const MAX_PDA_SIZE: usize = 10240;
        if current_size + proposed_addition > MAX_PDA_SIZE {
            return Err(ConstraintViolation::SizeLimit);
        }
    }

    // レント免除要件チェック
    pub fn check_rent_exemption(
        &self,
        new_size: usize
    ) -> Result<u64, ProgramError> {
        // 新サイズでのレント免除に必要なSOL計算
    }
}
```

#### 7.4.3 変更履歴管理
**ユーザー側で管理**: 変更履歴の記録・管理はクライアント側アプリケーションまたは外部システムで実施

#### 7.4.4 PDA制約による唯一の限界
```rust
// PDA技術制約（最小限）
pub const PDA_CONSTRAINTS: PDAConstraints = PDAConstraints {
    // Solanaネットワーク制約（変更不可）
    max_pda_size_bytes: 10240,                    // 10KB上限
    max_pda_accounts_per_transaction: 64,         // トランザクション制限

    // 変更不可項目（Solana技術制約のみ）
    immutable_after_creation: vec![
        "pda_address",         // PDAアドレス
        "creation_timestamp",  // 作成時刻
        "pda_bump",           // PDA bump seed
    ],
};

// 柔軟性を最大化
impl MaxFlexibilityManager {
    // PDAサイズ制約のみチェック
    pub fn validate_change_feasibility<T>(&self, new_data: &T) -> Result<(), ProgramError>
    where
        T: AnchorSerialize
    {
        let serialized_size = new_data.try_to_vec()?.len();
        if serialized_size > PDA_CONSTRAINTS.max_pda_size_bytes {
            return Err(ProgramError::Custom(0x200)); // サイズ制限のみ
        }
        // それ以外はすべて変更可能
        Ok(())
    }

    // ほぼすべての変更を許可
    pub fn apply_flexible_change<T>(&mut self, change: T) -> Result<(), ProgramError>
    where
        T: AnchorSerialize + AnchorDeserialize
    {
        self.validate_change_feasibility(&change)?;
        // 制約内なら任意の変更を実行
        Ok(())
    }
}
```

### 7.5 障害対応とエラーハンドリング

#### 7.5.1 ユーザー制御中心の障害対応
```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct FailureHandlingConfig {
    // 自動復旧機能なし（ユーザー制御）
    pub auto_recovery_disabled: bool,              // 常にtrue

    // デバッグ用途の手動介入ポイント
    pub debug_mode_enabled: bool,                  // デバッグモード
    pub manual_intervention_points: Vec<InterventionPoint>,

    // ログ出力設定（必須）
    pub error_logging: ErrorLoggingConfig,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum InterventionPoint {
    // デバッグ用途でのオブジェクト単位実行
    SingleWalletGroupExecution,     // 単一ウォレットグループでの実行
    SingleUserOperation,            // 単一ユーザー操作
    SingleTransactionExecution,     // 単一トランザクション実行
    SinglePDAOperation,             // 単一PDA操作
    ConfigurationValidation,        // 設定検証
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ErrorLoggingConfig {
    pub enabled: bool,                             // 必須（常にtrue）
    pub log_level: ErrorLogLevel,
    pub output_destinations: Vec<LogDestination>,
    pub structured_logging: bool,                  // 構造化ログ
    pub include_stack_trace: bool,                 // スタックトレース
    pub include_context: bool,                     // コンテキスト情報
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ErrorLogLevel {
    Critical,       // 致命的エラー
    Error,          // 一般エラー
    Warning,        // 警告
    Info,           // 情報
    Debug,          // デバッグ情報
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum LogDestination {
    Console,        // コンソール出力
    File,           // ファイル出力
    PDA,            // PDAへの記録（サイズ制約考慮）
    Syslog,         // システムログ
}
```

#### 7.5.2 デバッグ用手動介入機能
```rust
// デバッグ用途のオブジェクト単位実行
impl DebugModeManager {
    // 単一ウォレットグループでのテスト実行
    pub fn execute_single_wallet_group_debug(
        &self,
        group_id: &str,
        operation: DebugOperation
    ) -> Result<DebugResult, ProgramError> {
        if !self.config.debug_mode_enabled {
            return Err(ProgramError::Custom(0x300)); // デバッグモード無効
        }

        // ログ記録
        self.log_debug_operation_start(group_id, &operation)?;

        match operation {
            DebugOperation::TestDistribution => {
                // 単一グループでの配布テスト
                self.test_distribution_single_group(group_id)
            }
            DebugOperation::ValidateWallets => {
                // ウォレット検証
                self.validate_wallet_group(group_id)
            }
            DebugOperation::CheckPermissions => {
                // 権限確認
                self.check_group_permissions(group_id)
            }
        }
    }

    // 単一ユーザー操作のデバッグ実行
    pub fn execute_single_user_debug(
        &self,
        user_pubkey: &Pubkey,
        operation: UserDebugOperation
    ) -> Result<DebugResult, ProgramError> {
        // デバッグログ記録
        self.log_user_debug_operation(user_pubkey, &operation)?;

        // 単一ユーザーでの操作テスト
        Ok(DebugResult::Success)
    }

    // 単一PDA操作のデバッグ
    pub fn execute_single_pda_debug(
        &self,
        pda_address: &Pubkey,
        operation: PDADebugOperation
    ) -> Result<DebugResult, ProgramError> {
        // PDAデバッグログ記録
        self.log_pda_debug_operation(pda_address, &operation)?;

        match operation {
            PDADebugOperation::ReadState => self.debug_read_pda_state(pda_address),
            PDADebugOperation::ValidateStructure => self.debug_validate_pda_structure(pda_address),
            PDADebugOperation::CheckSize => self.debug_check_pda_size(pda_address),
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum DebugOperation {
    TestDistribution,
    ValidateWallets,
    CheckPermissions,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum UserDebugOperation {
    CheckPermissions,
    ValidateSignatures,
    TestOperations,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum PDADebugOperation {
    ReadState,
    ValidateStructure,
    CheckSize,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DebugResult {
    pub status: DebugStatus,
    pub execution_time_ms: u64,
    pub logs: Vec<String>,
    pub errors: Vec<String>,
    pub recommendations: Vec<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum DebugStatus {
    Success,
    Warning,
    Error,
    Critical,
}
```

#### 7.5.3 ログ出力とエラー記録
```rust
// 障害対応用ログ管理
impl FailureLogger {
    // 構造化エラーログの記録
    pub fn log_error(&self, error: StructuredError) -> Result<(), ProgramError> {
        let log_entry = ErrorLogEntry {
            timestamp: Clock::get()?.unix_timestamp,
            error_id: self.generate_error_id(),
            error_type: error.error_type,
            severity: error.severity,
            context: error.context,
            stack_trace: if self.config.include_stack_trace {
                Some(error.stack_trace)
            } else {
                None
            },
            user_context: error.user_context,
            transaction_context: error.transaction_context,
            recovery_suggestions: error.recovery_suggestions,
        };

        // 複数の出力先に記録
        for destination in &self.config.output_destinations {
            match destination {
                LogDestination::Console => self.log_to_console(&log_entry)?,
                LogDestination::File => self.log_to_file(&log_entry)?,
                LogDestination::PDA => self.log_to_pda(&log_entry)?,
                LogDestination::External => self.log_to_external(&log_entry)?,
                LogDestination::Syslog => self.log_to_syslog(&log_entry)?,
            }
        }

        Ok(())
    }

    // PDAサイズ制約を考慮したログ記録
    pub fn log_to_pda_with_constraints(&self, log_entry: &ErrorLogEntry) -> Result<(), ProgramError> {
        // PDAサイズ制約により、重要なログのみ記録
        match log_entry.severity {
            ErrorLogLevel::Critical | ErrorLogLevel::Error => {
                // 重要なエラーのみPDAに記録
                self.log_to_pda_compressed(log_entry)?;
            }
            _ => {
                // その他のログはファイルまたはコンソールのみ
            }
        }
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StructuredError {
    pub error_type: ErrorType,
    pub severity: ErrorLogLevel,
    pub message: String,
    pub context: ErrorContext,
    pub stack_trace: String,
    pub user_context: Option<UserContext>,
    pub transaction_context: Option<TransactionContext>,
    pub recovery_suggestions: Vec<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ErrorType {
    PDAError,
    TransactionError,
    PermissionError,
    ValidationError,
    NetworkError,
    ConfigurationError,
    UserError,
    SystemError,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ErrorLogEntry {
    pub timestamp: i64,
    pub error_id: String,
    pub error_type: ErrorType,
    pub severity: ErrorLogLevel,
    pub context: ErrorContext,
    pub stack_trace: Option<String>,
    pub user_context: Option<UserContext>,
    pub transaction_context: Option<TransactionContext>,
    pub recovery_suggestions: Vec<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ErrorContext {
    pub operation: String,
    pub component: String,
    pub input_parameters: Vec<String>,
    pub system_state: String,
}
```

### 7.6 配布イベントキャンセル機能

#### 7.6.1 キャンセル可能な段階
```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DistributionEvent {
    pub event_id: String,
    pub status: DistributionStatus,
    pub created_at: i64,
    pub scheduled_at: Option<i64>,
    pub distribution_config: DistributionConfig,
    pub target_wallets: Vec<DistributionTarget>,
    pub cancellation_config: CancellationConfig,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum DistributionStatus {
    Draft,              // 下書き - 作成中・編集可能（キャンセル可能）
    Pending,            // 承認待ち - 実行承認待ち（キャンセル可能）
    Approved,           // 承認済み - 実行可能状態（キャンセル可能）
    InProgress,         // 実行中 - 配布処理中（キャンセル不可）
    Paused,             // 一時停止 - 実行中断（キャンセル可能）
    Completed,          // 完了 - 正常完了（キャンセル不可）
    Failed,             // 失敗 - 実行失敗（キャンセル不可）
    Cancelled,          // キャンセル - 実行前取消
    PartiallyCompleted, // 部分完了 - 一部成功・一部失敗（キャンセル不可）
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CancellationConfig {
    pub cancellation_enabled: bool,
    pub authorized_cancellers: Vec<Pubkey>,     // ユーザー側で設定
    pub require_state_recovery: bool,          // 必須（常にtrue）
    pub record_reason: bool,                   // 不要（常にfalse）
}

// キャンセル可能性チェック
impl DistributionEventManager {
    // 実配布前までキャンセル可能
    pub fn can_cancel(&self, event_id: &str) -> Result<bool, ProgramError> {
        if let Some(event) = self.find_event(event_id) {
            match event.status {
                DistributionStatus::Draft
                | DistributionStatus::Pending
                | DistributionStatus::Approved
                | DistributionStatus::Paused => Ok(true),

                DistributionStatus::InProgress
                | DistributionStatus::Completed
                | DistributionStatus::Failed
                | DistributionStatus::Cancelled
                | DistributionStatus::PartiallyCompleted => Ok(false),
            }
        } else {
            Err(ProgramError::Custom(0x400)) // イベントが見つからない
        }
    }
}
```

#### 7.6.2 キャンセル権限管理
```rust
// ユーザー側で設定可能な権限管理
impl CancellationAuthorization {
    // キャンセル権限チェック
    pub fn check_cancellation_permission(
        &self,
        event_id: &str,
        requester: &Pubkey
    ) -> Result<bool, ProgramError> {
        let event = self.find_event(event_id)?;

        // ユーザー設定の権限者リストをチェック
        Ok(event.cancellation_config.authorized_cancellers.contains(requester))
    }

    // 権限者の動的設定
    pub fn set_cancellation_authority(
        &mut self,
        event_id: &str,
        authorized_users: Vec<Pubkey>,
        setter: &Pubkey
    ) -> Result<(), ProgramError> {
        // 権限設定者の権限チェック
        self.check_admin_permission(setter)?;

        if let Some(event) = self.find_event_mut(event_id) {
            event.cancellation_config.authorized_cancellers = authorized_users;
            Ok(())
        } else {
            Err(ProgramError::Custom(0x400))
        }
    }
}
```

#### 7.6.3 状態復旧機能（必須）
```rust
// キャンセル時の状態復旧
impl DistributionCancellation {
    // 配布イベントキャンセルと状態復旧
    pub fn cancel_distribution_event(
        &mut self,
        event_id: &str,
        canceller: &Pubkey
    ) -> Result<CancellationResult, ProgramError> {
        // 1. キャンセル可能性チェック
        if !self.can_cancel(event_id)? {
            return Err(ProgramError::Custom(0x401)); // キャンセル不可
        }

        // 2. 権限チェック
        if !self.check_cancellation_permission(event_id, canceller)? {
            return Err(ProgramError::Custom(0x402)); // 権限なし
        }

        // 3. 状態復旧実行（必須）
        let recovery_result = self.restore_pre_distribution_state(event_id)?;

        // 4. イベント状態をキャンセル済みに変更
        if let Some(event) = self.find_event_mut(event_id) {
            event.status = DistributionStatus::Cancelled;

            Ok(CancellationResult {
                event_id: event_id.to_string(),
                cancelled_by: *canceller,
                cancelled_at: Clock::get()?.unix_timestamp,
                state_recovery: recovery_result,
                reason_recorded: false, // 記録不要
            })
        } else {
            Err(ProgramError::Custom(0x400))
        }
    }

    // 状態復旧処理
    pub fn restore_pre_distribution_state(
        &mut self,
        event_id: &str
    ) -> Result<StateRecoveryResult, ProgramError> {
        let event = self.find_event(event_id)?;

        let mut recovery_actions = Vec::new();

        // 準備済みリソースの解放
        if let Some(reserved_tokens) = &event.reserved_tokens {
            self.release_reserved_tokens(reserved_tokens)?;
            recovery_actions.push("Released reserved tokens".to_string());
        }

        // 一時的なPDA状態の巻き戻し
        if let Some(temp_pda_changes) = &event.temporary_pda_changes {
            self.rollback_pda_changes(temp_pda_changes)?;
            recovery_actions.push("Rolled back PDA changes".to_string());
        }

        // スケジューラからの削除
        if event.status == DistributionStatus::Pending || event.status == DistributionStatus::Approved {
            self.remove_from_scheduler(event_id)?;
            recovery_actions.push("Removed from scheduler".to_string());
        }

        // マルチシグセッションのクリーンアップ
        if let Some(multisig_session) = &event.multisig_session_id {
            self.cleanup_multisig_session(multisig_session)?;
            recovery_actions.push("Cleaned up multisig session".to_string());
        }

        Ok(StateRecoveryResult {
            recovery_completed: true,
            actions_taken: recovery_actions,
            rollback_points_cleared: true,
        })
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CancellationResult {
    pub event_id: String,
    pub cancelled_by: Pubkey,
    pub cancelled_at: i64,
    pub state_recovery: StateRecoveryResult,
    pub reason_recorded: bool,  // 常にfalse
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StateRecoveryResult {
    pub recovery_completed: bool,
    pub actions_taken: Vec<String>,
    pub rollback_points_cleared: bool,
}

// 追加のヘルパー構造体
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DistributionTarget {
    pub wallet_address: Pubkey,
    pub amount: u64,
    pub wallet_group_id: Option<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DistributionConfig {
    pub token_mint: Pubkey,
    pub total_amount: u64,
    pub distribution_method: DistributionMethod,
    pub execution_timing: ExecutionTiming,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum DistributionMethod {
    Immediate,
    Scheduled,
    BatchProcessing,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ExecutionTiming {
    Now,
    Scheduled(i64),
    Conditional(String),
}
```

### 7.7 実配布処理トリガー制御

#### 7.7.1 全ウォレット所有者承認制御
```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DistributionTriggerConfig {
    // すべてのウォレット所有者の承認が必要
    pub require_all_wallet_owner_approval: bool,  // 常にtrue

    // 実行承認者設定（ユーザー設定）
    pub execution_approvers: Vec<ExecutionApprover>,

    // 自動実行タイマー機能（必要）
    pub auto_execution_timer: Option<AutoExecutionConfig>,

    // 実行条件設定（必要）
    pub execution_conditions: ExecutionConditions,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ExecutionApprover {
    pub wallet_group_id: String,
    pub required_approvers: Vec<Pubkey>,     // ユーザー設定
    pub approval_threshold: u8,              // 必要承認数
    pub approval_window_seconds: i64,        // 承認期限
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AutoExecutionConfig {
    pub enabled: bool,
    pub timer_conditions: Vec<TimerCondition>,
    pub fallback_behavior: FallbackBehavior,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum TimerCondition {
    ScheduledTime(i64),                      // 指定時刻実行
    ApprovalTimeout(i64),                    // 承認タイムアウト後実行
    DelayedExecution { delay_seconds: i64 }, // 遅延実行
    ConditionalTimer { condition: String, delay: i64 }, // 条件付きタイマー
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ExecutionConditions {
    pub time_conditions: Vec<TimeCondition>,
    pub approval_conditions: ApprovalConditions,
    pub custom_conditions: Vec<CustomCondition>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum TimeCondition {
    ScheduledDateTime(i64),                  // 特定日時
    TimeWindow { start: i64, end: i64 },     // 時間窓
    RecurringSchedule(RecurringPattern),     // 定期実行
    BusinessHours { timezone: String },      // 営業時間内
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ApprovalConditions {
    pub minimum_approvals: u8,               // 最小承認数
    pub approval_percentage: f32,            // 承認率（0.0-1.0）
    pub unanimous_required: bool,            // 全員承認必須
    pub approval_deadline: Option<i64>,      // 承認期限
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CustomCondition {
    pub condition_id: String,
    pub condition_type: ConditionType,
    pub parameters: Vec<ConditionParameter>,
    pub required_value: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ConditionType {
    TokenBalance,        // トークン残高条件
    WalletCount,         // ウォレット数条件
    MarketCondition,     // 市場条件
    External,            // 外部条件
}
```

#### 7.7.2 承認プロセス管理
```rust
// 全ウォレット所有者承認の管理
impl DistributionApprovalManager {
    // 配布実行の承認開始
    pub fn initiate_distribution_approval(
        &mut self,
        event_id: &str,
        initiator: &Pubkey
    ) -> Result<ApprovalSession, ProgramError> {
        let event = self.find_event(event_id)?;

        // 全ウォレットグループの所有者承認が必要
        let mut required_approvals = Vec::new();

        for wallet_group in &event.target_wallet_groups {
            // 各ウォレットグループの所有者を特定
            let owners = self.get_wallet_group_owners(&wallet_group.group_id)?;

            for owner in owners {
                required_approvals.push(RequiredApproval {
                    wallet_group_id: wallet_group.group_id.clone(),
                    approver: owner,
                    status: ApprovalStatus::Pending,
                    expires_at: self.calculate_approval_deadline(&event.trigger_config)?,
                });
            }
        }

        let approval_session = ApprovalSession {
            session_id: self.generate_session_id(),
            event_id: event_id.to_string(),
            initiated_by: *initiator,
            initiated_at: Clock::get()?.unix_timestamp,
            required_approvals,
            status: ApprovalSessionStatus::Active,
            auto_execution_scheduled: event.trigger_config.auto_execution_timer.is_some(),
        };

        // 自動実行タイマーの設定
        if let Some(auto_config) = &event.trigger_config.auto_execution_timer {
            self.schedule_auto_execution(&approval_session, auto_config)?;
        }

        Ok(approval_session)
    }

    // 承認の記録
    pub fn record_approval(
        &mut self,
        session_id: &str,
        approver: &Pubkey,
        approval: bool
    ) -> Result<ApprovalResult, ProgramError> {
        let session = self.find_approval_session_mut(session_id)?;

        // 承認者の権限確認
        if let Some(required_approval) = session.required_approvals
            .iter_mut()
            .find(|ra| ra.approver == *approver) {

            required_approval.status = if approval {
                ApprovalStatus::Approved
            } else {
                ApprovalStatus::Rejected
            };
            required_approval.approved_at = Some(Clock::get()?.unix_timestamp);

            // 全承認チェック
            self.check_execution_readiness(session_id)
        } else {
            Err(ProgramError::Custom(0x500)) // 承認権限なし
        }
    }

    // 実行準備状況チェック
    pub fn check_execution_readiness(
        &self,
        session_id: &str
    ) -> Result<ApprovalResult, ProgramError> {
        let session = self.find_approval_session(session_id)?;
        let event = self.find_event(&session.event_id)?;

        // 承認条件チェック
        let approval_status = self.evaluate_approval_conditions(
            &session.required_approvals,
            &event.trigger_config.execution_conditions.approval_conditions
        )?;

        // 時間条件チェック
        let time_status = self.evaluate_time_conditions(
            &event.trigger_config.execution_conditions.time_conditions
        )?;

        // カスタム条件チェック
        let custom_status = self.evaluate_custom_conditions(
            &event.trigger_config.execution_conditions.custom_conditions
        )?;

        let ready_for_execution = approval_status.ready
            && time_status.ready
            && custom_status.ready;

        if ready_for_execution {
            // 配布実行をトリガー
            self.trigger_distribution_execution(&session.event_id)?;
        }

        Ok(ApprovalResult {
            session_id: session_id.to_string(),
            approval_status,
            time_status,
            custom_status,
            ready_for_execution,
            execution_triggered: ready_for_execution,
        })
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ApprovalSession {
    pub session_id: String,
    pub event_id: String,
    pub initiated_by: Pubkey,
    pub initiated_at: i64,
    pub required_approvals: Vec<RequiredApproval>,
    pub status: ApprovalSessionStatus,
    pub auto_execution_scheduled: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RequiredApproval {
    pub wallet_group_id: String,
    pub approver: Pubkey,
    pub status: ApprovalStatus,
    pub approved_at: Option<i64>,
    pub expires_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ApprovalStatus {
    Pending,
    Approved,
    Rejected,
    Expired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ApprovalSessionStatus {
    Active,
    Completed,
    Expired,
    Cancelled,
}
```

#### 7.7.3 自動実行タイマーとスケジューリング
```rust
// 自動実行タイマー管理
impl AutoExecutionScheduler {
    // 自動実行のスケジューリング
    pub fn schedule_auto_execution(
        &mut self,
        approval_session: &ApprovalSession,
        auto_config: &AutoExecutionConfig
    ) -> Result<ScheduleResult, ProgramError> {
        if !auto_config.enabled {
            return Ok(ScheduleResult::Disabled);
        }

        for timer_condition in &auto_config.timer_conditions {
            match timer_condition {
                TimerCondition::ScheduledTime(timestamp) => {
                    self.schedule_at_time(approval_session, *timestamp)?;
                }
                TimerCondition::ApprovalTimeout(timeout_seconds) => {
                    let execute_at = approval_session.initiated_at + timeout_seconds;
                    self.schedule_timeout_execution(approval_session, execute_at)?;
                }
                TimerCondition::DelayedExecution { delay_seconds } => {
                    let execute_at = Clock::get()?.unix_timestamp + delay_seconds;
                    self.schedule_delayed_execution(approval_session, execute_at)?;
                }
                TimerCondition::ConditionalTimer { condition, delay } => {
                    self.schedule_conditional_execution(
                        approval_session,
                        condition,
                        *delay
                    )?;
                }
            }
        }

        Ok(ScheduleResult::Scheduled)
    }

    // 条件評価と実行判定
    pub fn evaluate_execution_conditions(
        &self,
        event_id: &str,
        conditions: &ExecutionConditions
    ) -> Result<ExecutionReadiness, ProgramError> {
        let mut readiness = ExecutionReadiness {
            time_ready: false,
            approval_ready: false,
            custom_ready: false,
            overall_ready: false,
        };

        // 時間条件評価
        readiness.time_ready = self.check_time_conditions(&conditions.time_conditions)?;

        // 承認条件評価
        readiness.approval_ready = self.check_approval_conditions(
            event_id,
            &conditions.approval_conditions
        )?;

        // カスタム条件評価
        readiness.custom_ready = self.check_custom_conditions(&conditions.custom_conditions)?;

        // 全体判定
        readiness.overall_ready = readiness.time_ready
            && readiness.approval_ready
            && readiness.custom_ready;

        Ok(readiness)
    }

    // 定期実行パターンの処理
    pub fn handle_recurring_schedule(
        &mut self,
        pattern: &RecurringPattern
    ) -> Result<Vec<i64>, ProgramError> {
        match pattern {
            RecurringPattern::Daily { hour, minute } => {
                self.calculate_daily_schedule(*hour, *minute)
            }
            RecurringPattern::Weekly { day_of_week, hour, minute } => {
                self.calculate_weekly_schedule(*day_of_week, *hour, *minute)
            }
            RecurringPattern::Monthly { day_of_month, hour, minute } => {
                self.calculate_monthly_schedule(*day_of_month, *hour, *minute)
            }
            RecurringPattern::Custom { cron_expression } => {
                self.calculate_cron_schedule(cron_expression)
            }
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum RecurringPattern {
    Daily { hour: u8, minute: u8 },
    Weekly { day_of_week: u8, hour: u8, minute: u8 },
    Monthly { day_of_month: u8, hour: u8, minute: u8 },
    Custom { cron_expression: String },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum FallbackBehavior {
    CancelExecution,     // 実行キャンセル
    RequestManualApproval, // 手動承認要求
    DelayExecution(i64), // 実行遅延
    UseDefaultApproval,  // デフォルト承認使用
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ExecutionReadiness {
    pub time_ready: bool,
    pub approval_ready: bool,
    pub custom_ready: bool,
    pub overall_ready: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ApprovalResult {
    pub session_id: String,
    pub approval_status: ConditionStatus,
    pub time_status: ConditionStatus,
    pub custom_status: ConditionStatus,
    pub ready_for_execution: bool,
    pub execution_triggered: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ConditionStatus {
    pub ready: bool,
    pub details: String,
    pub next_check_at: Option<i64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ConditionParameter {
    pub name: String,
    pub value: String,
    pub data_type: ParameterType,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ParameterType {
    String,
    Number,
    Boolean,
    Timestamp,
    Address,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ScheduleResult {
    Scheduled,
    Disabled,
    Failed(String),
}
```

### 7.8 配布実行制御機能

#### 7.8.1 実行の一時停止・再開機能
```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ExecutionControlConfig {
    // 一時停止機能（必要）
    pub pause_enabled: bool,                    // 常にtrue
    pub pause_authorized_users: Vec<Pubkey>,   // ユーザー設定

    // 再開機能（必要）
    pub resume_enabled: bool,                   // 常にtrue
    pub resume_authorized_users: Vec<Pubkey>,  // ユーザー設定

    // バッチ単位制御（必要）
    pub batch_control_enabled: bool,           // 常にtrue
    pub batch_size: u16,                       // デフォルト: 25
    pub inter_batch_delay_ms: u64,             // バッチ間遅延

    // エラー時自動停止（必要）
    pub auto_stop_on_error: bool,              // 常にtrue
    pub error_threshold: ErrorThreshold,       // エラー閾値設定
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ErrorThreshold {
    pub consecutive_failures: u8,              // 連続失敗数
    pub failure_rate_percentage: f32,          // 失敗率 (0.0-1.0)
    pub total_failure_count: u32,              // 総失敗数
    pub time_window_seconds: i64,              // 評価時間窓
}

// 配布実行制御マネージャー
impl DistributionExecutionController {
    // 実行の一時停止
    pub fn pause_distribution(
        &mut self,
        event_id: &str,
        paused_by: &Pubkey,
        reason: Option<String>
    ) -> Result<PauseResult, ProgramError> {
        let event = self.find_event_mut(event_id)?;

        // 状態チェック
        match event.status {
            DistributionStatus::InProgress => {
                // 権限チェック
                if !event.execution_control.pause_authorized_users.contains(paused_by) {
                    return Err(ProgramError::Custom(0x600)); // 権限なし
                }

                // 現在実行中のバッチを完了してから停止
                event.status = DistributionStatus::Paused;

                // 停止情報を記録
                let pause_info = PauseInfo {
                    paused_by: *paused_by,
                    paused_at: Clock::get()?.unix_timestamp,
                    reason,
                    current_batch_index: event.execution_state.current_batch,
                    completed_transactions: event.execution_state.completed_count,
                    pending_transactions: event.execution_state.pending_count,
                };

                event.execution_state.pause_info = Some(pause_info.clone());

                // 現在実行中のバッチ完了を待機
                self.wait_for_current_batch_completion(event_id)?;

                Ok(PauseResult::Success(pause_info))
            }
            _ => Err(ProgramError::Custom(0x601)), // 一時停止不可能な状態
        }
    }

    // 実行の再開
    pub fn resume_distribution(
        &mut self,
        event_id: &str,
        resumed_by: &Pubkey
    ) -> Result<ResumeResult, ProgramError> {
        let event = self.find_event_mut(event_id)?;

        // 状態チェック
        match event.status {
            DistributionStatus::Paused => {
                // 権限チェック
                if !event.execution_control.resume_authorized_users.contains(resumed_by) {
                    return Err(ProgramError::Custom(0x602)); // 権限なし
                }

                // 再開処理
                event.status = DistributionStatus::InProgress;

                let resume_info = ResumeInfo {
                    resumed_by: *resumed_by,
                    resumed_at: Clock::get()?.unix_timestamp,
                    resume_from_batch: event.execution_state.current_batch,
                    remaining_transactions: event.execution_state.pending_count,
                };

                event.execution_state.resume_info = Some(resume_info.clone());

                // バッチ実行再開
                self.continue_batch_execution(event_id)?;

                Ok(ResumeResult::Success(resume_info))
            }
            _ => Err(ProgramError::Custom(0x603)), // 再開不可能な状態
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PauseInfo {
    pub paused_by: Pubkey,
    pub paused_at: i64,
    pub reason: Option<String>,
    pub current_batch_index: u32,
    pub completed_transactions: u32,
    pub pending_transactions: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ResumeInfo {
    pub resumed_by: Pubkey,
    pub resumed_at: i64,
    pub resume_from_batch: u32,
    pub remaining_transactions: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum PauseResult {
    Success(PauseInfo),
    AlreadyPaused,
    NotPausable(String),
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ResumeResult {
    Success(ResumeInfo),
    NotPaused,
    NotResumable(String),
}
```

#### 7.8.2 バッチ単位での制御
```rust
// バッチ実行制御
impl BatchExecutionController {
    // バッチ実行の開始
    pub fn execute_batch(
        &mut self,
        event_id: &str,
        batch_index: u32
    ) -> Result<BatchExecutionResult, ProgramError> {
        let event = self.find_event_mut(event_id)?;

        // バッチデータ準備
        let batch = self.prepare_batch(event, batch_index)?;

        // バッチ実行状態を記録
        let batch_execution = BatchExecution {
            batch_index,
            started_at: Clock::get()?.unix_timestamp,
            transactions: batch.transactions.clone(),
            status: BatchStatus::InProgress,
            completed_count: 0,
            failed_count: 0,
            error_details: Vec::new(),
        };

        event.execution_state.current_batch_execution = Some(batch_execution);

        // 個別トランザクション実行
        for (tx_index, transaction) in batch.transactions.iter().enumerate() {
            match self.execute_single_transaction(transaction) {
                Ok(result) => {
                    self.record_transaction_success(event_id, batch_index, tx_index, result)?;
                }
                Err(error) => {
                    self.record_transaction_failure(event_id, batch_index, tx_index, error)?;

                    // エラー閾値チェック
                    if self.should_auto_stop(event_id)? {
                        return self.auto_stop_execution(event_id, "Error threshold exceeded");
                    }
                }
            }

            // バッチ間遅延
            if tx_index < batch.transactions.len() - 1 {
                self.sleep_ms(event.execution_control.inter_batch_delay_ms);
            }
        }

        // バッチ完了処理
        self.complete_batch_execution(event_id, batch_index)
    }

    // 単一バッチの手動制御
    pub fn control_batch(
        &mut self,
        event_id: &str,
        batch_index: u32,
        control_action: BatchControlAction,
        controller: &Pubkey
    ) -> Result<BatchControlResult, ProgramError> {
        let event = self.find_event(event_id)?;

        // 権限チェック
        if !self.has_batch_control_permission(controller, &event.execution_control) {
            return Err(ProgramError::Custom(0x604)); // バッチ制御権限なし
        }

        match control_action {
            BatchControlAction::Skip => {
                self.skip_batch(event_id, batch_index, controller)
            }
            BatchControlAction::Retry => {
                self.retry_batch(event_id, batch_index, controller)
            }
            BatchControlAction::Delay(delay_seconds) => {
                self.delay_batch(event_id, batch_index, delay_seconds, controller)
            }
            BatchControlAction::ModifySize(new_size) => {
                self.modify_batch_size(event_id, batch_index, new_size, controller)
            }
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BatchExecution {
    pub batch_index: u32,
    pub started_at: i64,
    pub completed_at: Option<i64>,
    pub transactions: Vec<TransactionInfo>,
    pub status: BatchStatus,
    pub completed_count: u32,
    pub failed_count: u32,
    pub error_details: Vec<BatchError>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum BatchStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
    Skipped,
    Retrying,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum BatchControlAction {
    Skip,                    // バッチスキップ
    Retry,                   // バッチリトライ
    Delay(i64),              // バッチ遅延
    ModifySize(u16),         // バッチサイズ変更
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BatchError {
    pub transaction_index: u32,
    pub error_type: TransactionErrorType,
    pub error_message: String,
    pub retry_count: u8,
    pub timestamp: i64,
}
```

#### 7.8.3 エラー時の自動停止機能
```rust
// エラー監視と自動停止
impl ErrorMonitoringController {
    // エラー閾値評価
    pub fn should_auto_stop(&self, event_id: &str) -> Result<bool, ProgramError> {
        let event = self.find_event(event_id)?;
        let threshold = &event.execution_control.error_threshold;
        let execution_state = &event.execution_state;

        // 連続失敗数チェック
        if execution_state.consecutive_failures >= threshold.consecutive_failures {
            return Ok(true);
        }

        // 失敗率チェック
        let total_transactions = execution_state.completed_count + execution_state.failed_count;
        if total_transactions > 0 {
            let failure_rate = execution_state.failed_count as f32 / total_transactions as f32;
            if failure_rate >= threshold.failure_rate_percentage {
                return Ok(true);
            }
        }

        // 総失敗数チェック
        if execution_state.failed_count >= threshold.total_failure_count {
            return Ok(true);
        }

        // 時間窓内での失敗数チェック
        let current_time = Clock::get()?.unix_timestamp;
        let window_start = current_time - threshold.time_window_seconds;
        let recent_failures = execution_state.recent_failures
            .iter()
            .filter(|failure| failure.timestamp >= window_start)
            .count() as u32;

        if recent_failures >= threshold.total_failure_count {
            return Ok(true);
        }

        Ok(false)
    }

    // 自動停止実行
    pub fn auto_stop_execution(
        &mut self,
        event_id: &str,
        reason: &str
    ) -> Result<BatchExecutionResult, ProgramError> {
        let event = self.find_event_mut(event_id)?;

        // 実行中の処理を安全に停止
        event.status = DistributionStatus::Failed;

        // 自動停止情報を記録
        let auto_stop_info = AutoStopInfo {
            stopped_at: Clock::get()?.unix_timestamp,
            reason: reason.to_string(),
            current_batch: event.execution_state.current_batch,
            completed_transactions: event.execution_state.completed_count,
            failed_transactions: event.execution_state.failed_count,
            error_details: event.execution_state.recent_failures.clone(),
        };

        event.execution_state.auto_stop_info = Some(auto_stop_info.clone());

        // 部分完了状態の評価
        if event.execution_state.completed_count > 0 {
            event.status = DistributionStatus::PartiallyCompleted;
        }

        // クリーンアップ処理
        self.cleanup_pending_transactions(event_id)?;

        Ok(BatchExecutionResult::AutoStopped(auto_stop_info))
    }

    // エラー分析とレポート
    pub fn generate_error_analysis(
        &self,
        event_id: &str
    ) -> Result<ErrorAnalysisReport, ProgramError> {
        let event = self.find_event(event_id)?;

        let error_analysis = ErrorAnalysisReport {
            event_id: event_id.to_string(),
            total_errors: event.execution_state.failed_count,
            error_categories: self.categorize_errors(&event.execution_state.recent_failures),
            failure_patterns: self.analyze_failure_patterns(&event.execution_state.recent_failures),
            recommendations: self.generate_recommendations(&event.execution_state),
            recovery_options: self.evaluate_recovery_options(event),
        };

        Ok(error_analysis)
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AutoStopInfo {
    pub stopped_at: i64,
    pub reason: String,
    pub current_batch: u32,
    pub completed_transactions: u32,
    pub failed_transactions: u32,
    pub error_details: Vec<FailureRecord>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct FailureRecord {
    pub timestamp: i64,
    pub batch_index: u32,
    pub transaction_index: u32,
    pub error_type: TransactionErrorType,
    pub error_message: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum TransactionErrorType {
    InsufficientBalance,
    InvalidRecipient,
    NetworkError,
    SignatureError,
    ProgramError,
    TimeoutError,
    Unknown,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ErrorAnalysisReport {
    pub event_id: String,
    pub total_errors: u32,
    pub error_categories: Vec<ErrorCategory>,
    pub failure_patterns: Vec<FailurePattern>,
    pub recommendations: Vec<String>,
    pub recovery_options: Vec<RecoveryOption>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ErrorCategory {
    pub error_type: TransactionErrorType,
    pub count: u32,
    pub percentage: f32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum BatchExecutionResult {
    Success(BatchExecution),
    PartialSuccess(BatchExecution),
    Failed(BatchExecution),
    AutoStopped(AutoStopInfo),
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum BatchControlResult {
    Success,
    Failed(String),
    PermissionDenied,
}
```

## 8. PDA実構築タイミングオプション

### 8.1 構築タイミングの選択肢

PDAの実構築は以下の3つのタイミングから選択可能：

#### Option 1: ライブラリ利用者の実構築時
**特徴**:
- TributaryライブラリでPDAプログラムデプロイ時に全PDAを事前構築
- エンドユーザー利用時は既存PDAの読み書きのみ
- 初期コストはライブラリ利用者が負担

**メリット**:
- エンドユーザーのガス費負担なし
- 即座にマルチウォレット機能利用開始可能
- 一貫性のあるPDA構造保証

**デメリット**:
- ライブラリ利用者の初期コスト高
- 未使用PDAの無駄リソース
- 事前予測困難なPDA数

**適用場面**:
- 企業/プロジェクトでの内部配布システム
- 確実にマルチウォレット機能を利用予定の場合
- エンドユーザー体験を最優先する場合

#### Option 2: エンドユーザーのマルチウォレット機能実利用時
**特徴**:
- マルチウォレット配布を初回実行時にPDA構築
- オンデマンドでの必要最小限PDA作成
- 利用者払いのガス費モデル

**メリット**:
- 必要最小限のリソース利用
- 利用者が実際のコストを理解
- PDA構築の透明性

**デメリット**:
- 初回利用時の待機時間
- エンドユーザーのガス費負担
- 構築失敗のリスク

**適用場面**:
- 個人利用者向けサービス
- リソース効率を重視する場合
- マルチウォレット利用が不確実な場合

#### Option 3: ハイブリッド構築
**特徴**:
- 基本PDA構造はライブラリ構築時に作成
- 詳細設定PDAはエンドユーザー利用時に追加構築
- 段階的なコスト分散

**メリット**:
- コスト負担の合理的分散
- 基本機能の即時利用可能
- 柔軟な拡張性

**デメリット**:
- 実装複雑性の増加
- 構築状態の管理必要
- デバッグの困難性

### 7.2 構築タイミング設定の実装

```typescript
// PDA構築タイミング設定
export interface PDAConstructionConfig {
  timing: 'library_deploy' | 'user_first_use' | 'hybrid';

  // ライブラリ構築時設定
  libraryConstruction?: {
    preBuildAllStructures: boolean;
    estimatedUserCount: number;
    fallbackToUserConstruction: boolean;
  };

  // ユーザー構築時設定
  userConstruction?: {
    showCostEstimate: boolean;
    allowCostDelegation: boolean;
    maxConstructionRetries: number;
  };

  // ハイブリッド設定
  hybridConstruction?: {
    libraryStructures: string[];  // 事前構築対象
    userStructures: string[];     // ユーザー構築対象
    gracefulFallback: boolean;
  };
}

// CLI設定での構築タイミング指定
tributary init \
  --name MyProject \
  --pda-construction-timing user_first_use \  // 構築タイミング指定
  --pda-show-cost-estimate true \             // コスト表示
  --pda-max-retries 3                         // 構築リトライ回数
```

### 7.3 各タイミングでの実装例

#### Option 1実装: ライブラリ構築時
```typescript
class LibraryDeployPDABuilder {
  async deployWithPreBuiltPDAs(
    deployConfig: LibraryDeployConfig
  ): Promise<PreBuiltPDAResult> {
    // 1. 基本PDA構造の事前構築
    const basePDAs = await this.createBasePDAStructures(deployConfig);

    // 2. 予想ユーザー数に基づく事前構築
    const estimatedPDAs = await this.createEstimatedUserPDAs(
      deployConfig.estimatedUserCount
    );

    // 3. 構築済みPDAマッピングの保存
    await this.savePreBuiltPDAMapping(basePDAs, estimatedPDAs);

    return {
      preBuiltPDAs: [...basePDAs, ...estimatedPDAs],
      totalCost: this.calculateTotalCost(),
      availableSlots: estimatedPDAs.length,
    };
  }
}
```

#### Option 2実装: ユーザー利用時
```typescript
class UserFirstUsePDABuilder {
  async buildPDAOnDemand(
    user: PublicKey,
    multiWalletConfig: MultiWalletConfig
  ): Promise<OnDemandPDAResult> {
    // 1. 構築コスト見積もり
    const costEstimate = await this.estimateConstructionCost(multiWalletConfig);

    // 2. ユーザー確認
    const userConfirmation = await this.requestUserConfirmation(costEstimate);
    if (!userConfirmation) {
      throw new Error('User cancelled PDA construction');
    }

    // 3. 段階的PDA構築
    const constructionResult = await this.constructPDAWithRetry(
      user,
      multiWalletConfig,
      this.config.maxRetries
    );

    return constructionResult;
  }
}
```

#### Option 3実装: ハイブリッド
```typescript
class HybridPDABuilder {
  async initializeHybridConstruction(
    libraryConfig: LibraryConfig,
    userConfig: UserConfig
  ): Promise<HybridPDAResult> {
    // 1. ライブラリ構築部分の確認
    const libraryPDAs = await this.verifyLibraryPDAs(libraryConfig);

    // 2. ユーザー構築部分の実行
    const userPDAs = await this.buildUserSpecificPDAs(userConfig);

    // 3. 統合検証
    const integrationResult = await this.validatePDAIntegration(
      libraryPDAs,
      userPDAs
    );

    return {
      libraryPDAs,
      userPDAs,
      integrationResult,
      isFullyConstructed: integrationResult.success,
    };
  }
}
```

### 7.4 構築タイミング選択指針

```typescript
// 自動推奨ロジック
function recommendConstructionTiming(
  projectProfile: ProjectProfile
): PDAConstructionTiming {
  if (projectProfile.userType === 'enterprise' &&
      projectProfile.multiWalletUsageCertainty > 0.8) {
    return 'library_deploy';
  }

  if (projectProfile.userType === 'individual' &&
      projectProfile.costSensitivity === 'high') {
    return 'user_first_use';
  }

  return 'hybrid';
}
```

## 8. エラーハンドリング

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("User group already exists")]
    UserGroupAlreadyExists,

    #[msg("Too many wallets per user")]
    TooManyWalletsPerUser,

    #[msg("Project is not active")]
    ProjectNotActive,

    #[msg("Insufficient authority")]
    InsufficientAuthority,

    #[msg("Invalid wallet verification")]
    InvalidWalletVerification,

    #[msg("Distribution amount exceeds limit")]
    DistributionAmountExceedsLimit,

    #[msg("PDA construction failed")]
    PDAConstructionFailed,

    #[msg("PDA not found")]
    PDANotFound,

    #[msg("Invalid construction timing")]
    InvalidConstructionTiming,
}
```

## 8. 運用とメンテナンス

### 8.1 PDAのライフサイクル管理

```typescript
// PDAプロジェクトの一時停止
async pauseProject(authority: Keypair, projectPDA: PublicKey): Promise<string>

// PDAプロジェクトの再開
async resumeProject(authority: Keypair, projectPDA: PublicKey): Promise<string>

// PDAプロジェクトのアーカイブ
async archiveProject(authority: Keypair, projectPDA: PublicKey): Promise<string>

// PDAの設定更新
async updateProjectConfig(
  authority: Keypair,
  projectPDA: PublicKey,
  newConfig: Partial<ProjectConfig>
): Promise<string>
```

### 8.2 データの移行とバックアップ

```typescript
// PDAデータのエクスポート
async exportProjectData(projectPDA: PublicKey): Promise<ProjectDataExport>

// 他のPDAへのデータ移行
async migrateToNewPDA(
  authority: Keypair,
  sourcePDA: PublicKey,
  targetPDA: PublicKey
): Promise<MigrationResult>
```

この設計により、マルチウォレット配布システム専用の堅牢で透明性の高いPDAアーキテクチャが実現されます。