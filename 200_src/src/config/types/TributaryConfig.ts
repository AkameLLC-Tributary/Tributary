export interface TributaryConfig {
  project: {
    version: string;
    description: string;
  };
  network: {
    default_network: string;
    timeout: number;
    max_retries: number;
    retry_delay: number;
    confirmation_timeout: number;
    commitment: string;
  };
  rpc: {
    endpoints: Record<string, string>;
    fallback_endpoints: Record<string, string[]>;
  };
  distribution: {
    default_batch_size: number;
    max_batch_size: number;
    batch_delay_ms: number;
    estimated_gas_per_tx: number;
    estimated_time_per_batch: number;
    risk_thresholds: {
      large_amount_threshold: number;
      large_recipient_count_threshold: number;
      small_amount_threshold: number;
    };
  };
  token: {
    default_decimals: number;
    fallback_decimals: number;
    minimum_balance: number;
  };
  cache: {
    default_ttl_seconds: number;
    wallet_cache_ttl_seconds: number;
    config_cache_ttl_seconds: number;
  };
  logging: {
    default_level: string;
    default_dir: string;
    enable_console: boolean;
    enable_file: boolean;
    max_files: number;
    max_file_size: string;
  };
  security: {
    default_key_encryption: boolean;
    default_backup_enabled: boolean;
    default_audit_log: boolean;
  };
  validation: {
    max_recipients_per_distribution: number;
    min_balance_for_distribution: number;
    wallet_validation_timeout: number;
  };
  export: {
    default_format: string;
    file_name_pattern: string;
  };
  pda_capacity: {
    max_wallet_groups_unified: number;
    auto_migrate_on_capacity: boolean;
    require_user_confirmation: boolean;
    capacity_warning_threshold: number;
    capacity_monitoring: boolean;
  };
}