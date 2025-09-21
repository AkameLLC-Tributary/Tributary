# Command Reference

## Document Information
- **File Name**: Command_Reference.md
- **Created**: 2025-01-18
- **Version**: 1.0
- **Purpose**: Complete command specification for Tributary command-line tool

## 1. Common Options

Common options available for all commands:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--config` | string | `./tributary.toml` | Configuration file path |
| `--output` | string | `table` | Output format (table/json/yaml) |
| `--log-level` | string | `info` | Log level (debug/info/warn/error) |
| `--network` | string | Config file value | Network specification (devnet/testnet/mainnet-beta) |
| `--help, -h` | boolean | - | Show help |
| `--version, -v` | boolean | - | Show version |

## 2. Command List

### 2.1 init - Project Initialization

**Purpose**: Initialize and setup new project

**Format**:
```bash
tributary init [options]
```

**Required Options**:
| Option | Type | Description |
|--------|------|-------------|
| `--name <name>` | string | Project name (1-100 characters, alphanumeric, hyphens, underscores) |
| `--token <address>` | string | Base token address (Solana Base58 format) |
| `--admin <address>` | string | Admin wallet address |

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--network <network>` | string | `devnet` | Target network |
| `--force, -f` | boolean | false | Overwrite existing configuration |
| `--interactive, -i` | boolean | false | Interactive mode |

**Examples**:
```bash
# Basic initialization
tributary init --name "MyProject" --token "So11111111111111111111111111111111111111112" --admin "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"

# Interactive mode
tributary init --interactive

# Overwrite existing configuration
tributary init --name "UpdatedProject" --force
```

### 2.2 collect - Token Holder Collection

**Purpose**: Collect holder information for specified token

**Format**:
```bash
tributary collect [options]
```

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--token <address>` | string | Config file value | Target token address for collection |
| `--threshold <amount>` | number | 0 | Minimum holding amount threshold |
| `--max-holders <number>` | number | Unlimited | Maximum collection count limit |
| `--output-file <path>` | string | - | Result output file path (supports .json/.csv/.yaml) |
| `--cache, -c` | boolean | true | Use cache |
| `--cache-ttl <seconds>` | number | 3600 | Cache TTL in seconds |
| `--exclude <addresses>` | string | - | Exclude address list (comma-separated) |

**Examples**:
```bash
# Basic collection
tributary collect --token "TokenAddress..." --threshold 100

# Exclude large holders
tributary collect --token "TokenAddress..." --exclude "LargeHolder1,LargeHolder2"

# Disable cache
tributary collect --token "TokenAddress..." --cache false

# Output to file (JSON format)
tributary collect --token "TokenAddress..." --output-file holders.json

# CSV format output (spreadsheet-compatible)
tributary collect --token "TokenAddress..." --output-file holders.csv

# YAML format output
tributary collect --token "TokenAddress..." --output-file holders.yaml
```

### 2.3 distribute - Token Distribution

**Purpose**: Execute and manage token distribution

**Format**:
```bash
tributary distribute <subcommand> [options]
```

**Subcommand List**:
| Subcommand | Description |
|------------|-------------|
| `execute` | Manual distribution execution |
| `simulate` | Distribution simulation |
| `auto` | Auto distribution configuration |
| `status` | Check distribution status |
| `history` | Display distribution history |

#### 2.3.1 distribute execute

**Purpose**: Execute token distribution

**Format**:
```bash
tributary distribute execute [options]
```

**Required Options**:
| Option | Type | Description |
|--------|------|-------------|
| `--amount <amount>` | number | Total distribution amount |

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--token <address>` | string | Config file value | Distribution token address |
| `--dry-run` | boolean | false | Dry run execution |
| `--batch-size <number>` | number | 10 | Batch size |
| `--confirm, -y` | boolean | false | Skip confirmation prompt |
| `--wallet-file <path>` | string | - | Private key file path |

**Examples**:
```bash
# Basic distribution execution
tributary distribute execute --amount 10000 --token "USDC-Address"

# Dry run execution
tributary distribute execute --amount 10000 --dry-run

# Specify batch size
tributary distribute execute --amount 10000 --batch-size 20
```

#### 2.3.2 distribute simulate

**Purpose**: Execute distribution simulation

**Format**:
```bash
tributary distribute simulate [options]
```

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--amount <amount>` | number | Config file value | Simulation distribution amount |
| `--token <address>` | string | Config file value | Target token address |
| `--detail` | boolean | false | Show detailed results |

#### 2.3.3 distribute auto

**Purpose**: Configure and manage automatic distribution

**Format**:
```bash
tributary distribute auto <action> [options]
```

**Actions**:
| Action | Description |
|--------|-------------|
| `enable` | Enable automatic distribution |
| `disable` | Disable automatic distribution |
| `status` | Check automatic distribution status |

#### 2.3.4 distribute status

**Purpose**: Check distribution status

**Format**:
```bash
tributary distribute status [options]
```

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--tx-id <id>` | string | - | Show details of specific transaction |
| `--last <number>` | number | 10 | Show last N distributions |

#### 2.3.5 distribute history

**Purpose**: Display distribution history

**Format**:
```bash
tributary distribute history [options]
```

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--limit <number>` | number | 50 | Limit display count |
| `--from <date>` | string | - | Start date (YYYY-MM-DD) |
| `--to <date>` | string | - | End date (YYYY-MM-DD) |
| `--format <format>` | string | table | Output format (table/json/csv) |

### 2.4 config - Configuration Management

**Purpose**: Manage application configuration

**Format**:
```bash
tributary config <subcommand> [options]
```

**Subcommand List**:
| Subcommand | Description |
|------------|-------------|
| `show` | Display configuration |
| `edit` | Edit configuration |
| `export` | Export configuration |
| `import` | Import configuration |
| `validate` | Validate configuration |

#### 2.4.1 config show

**Purpose**: Display current configuration

**Format**:
```bash
tributary config show [options]
```

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--section <section>` | string | - | Show specific section only |
| `--format <format>` | string | table | Output format (table/json/yaml) |
| `--show-secrets` | boolean | false | Also show sensitive information |

#### 2.4.2 config edit

**Purpose**: Edit configuration

**Format**:
```bash
tributary config edit [key] [value] [options]
```

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--interactive, -i` | boolean | false | Interactive edit mode |
| `--editor <editor>` | string | $EDITOR | Specify editor to use |

#### 2.4.3 config export

**Purpose**: Export configuration

**Format**:
```bash
tributary config export [options]
```

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--output <path>` | string | stdout | Output file destination |
| `--format <format>` | string | toml | Output format (toml/json/yaml) |
| `--exclude-secrets` | boolean | false | Exclude sensitive information |

#### 2.4.4 config import

**Purpose**: Import configuration

**Format**:
```bash
tributary config import <file> [options]
```

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--merge` | boolean | false | Merge with existing configuration |
| `--validate` | boolean | true | Validate before import |

#### 2.4.5 config validate

**Purpose**: Validate configuration

**Format**:
```bash
tributary config validate [options]
```

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--strict` | boolean | false | Strict mode |
| `--check-network` | boolean | false | Check network connectivity |

## 3. Exit Codes

| Code | Description |
|------|-------------|
| 0 | Normal exit |
| 1 | General error |
| 2 | Command line argument error |
| 3 | Configuration error |
| 4 | Network error |
| 5 | Authentication/permission error |
| 6 | Data integrity error |
| 7 | Resource shortage error |
| 8 | Timeout error |

## 4. Output Formats

### 4.1 Table Format (Default)
```
┌─────────────────┬──────────────┬─────────────┐
│ Address         │ Balance      │ Percentage  │
├─────────────────┼──────────────┼─────────────┤
│ 7xKXtg2CW...    │ 1,234.56 SOL │ 12.35%      │
│ 9yHFdkL5...     │ 987.65 SOL   │ 9.88%       │
└─────────────────┴──────────────┴─────────────┘
```

### 4.2 JSON Format
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

### 4.3 YAML Format
```yaml
holders:
  - address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
    balance: 1234.56
    percentage: 12.35
total_holders: 1234
total_supply: 10000.0
```

## 5. Configuration File Format

### 5.1 Basic Configuration (tributary.toml)
```toml
[project]
name = "MyProject"
created = "2025-01-18T10:30:15Z"
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