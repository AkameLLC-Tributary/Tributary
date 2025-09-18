# Project Rules

## Overview
This document defines comprehensive development and operational rules for the Tributary project. It provides standards and guidelines to achieve high-quality, consistent project management.

## 1. Documentation Rules

### 1.1 Common Documentation Format

#### Header Rules
All documents must start with the following header:

```markdown
# [Document Title]
## Overview
[Document overview description]
```

#### File Naming Conventions

##### Japanese Documents
- Prefix: `Ja_`
- Format: `Ja_[English_filename].md`
- Examples: `Ja_README.md`, `Ja_SRS.md`, `Ja_API_Reference.md`

##### English Documents
- Format: `[Document_Type].md`
- Examples: `README.md`, `SRS.md`, `API_Reference.md`

##### Specialized Documents
- Design Documents: `Design_[item_name].md`
- Specifications: `Spec_[item_name].md`
- Procedures: `Procedure_[item_name].md`
- Rules: `[item_name]_RULES.md`

### 1.2 Directory Structure Rules

```
Tributary/
├── PROJECT_RULES.md             # This file (comprehensive project rules)
├── Ja_PROJECT_RULES.md          # Japanese version
├── README.md                    # English README
├── Ja_README.md                 # Japanese README
├── 100_doc/                     # Documentation
│   ├── 100_define/              # Requirements definition
│   │   ├── SRS.md              # English requirements specification
│   │   └── Ja_SRS.md           # Japanese requirements specification
│   ├── 200_design/             # Design documents
│   ├── 300_spec/               # Specifications
│   └── 400_procedure/          # Procedures and manuals
├── 200_src/                    # Source code
└── 300_pkg/                    # Packaging
```

### 1.3 Markdown Formatting Rules

#### Headings
- H1: Document title only
- H2: Major sections
- H3: Subsections
- H4 and below: Detail items

#### Code Blocks
```bash
# Command examples
tributary init
```

```typescript
// TypeScript code examples
interface Config {
  name: string;
  network: NetworkType;
}
```

#### Tables
| Item | Description | Notes |
|------|-------------|-------|
| Example1 | Description1 | Notes1 |

## 2. Version Management Rules

### 2.1 Semantic Versioning

The project follows [Semantic Versioning 2.0.0](https://semver.org/).

#### Version Format
```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Incompatible API changes
- **MINOR**: Backward-compatible functionality additions
- **PATCH**: Backward-compatible bug fixes

#### Version Management Commands

##### Patch Version (Recommended)
```bash
npm run version:patch    # 0.1.1 → 0.1.2
npm run release         # Patch version up + publish
```

##### Minor Version
```bash
npm run version:minor    # 0.1.1 → 0.2.0
npm run release:minor   # Minor version up + publish
```

##### Major Version
```bash
npm run version:major    # 0.1.1 → 1.0.0
npm run release:major   # Major version up + publish
```

### 2.2 Release Management

#### Pre-publish Checks (prepublishOnly)
The following checks are automatically executed:
1. **TypeScript Type Check**: `npm run typecheck`
2. **ESLint Quality Check**: `npm run lint`
3. **Test Execution**: `npm test`
4. **Build**: `npm run build`

#### Release Process
1. Complete feature development/bug fixes
2. Confirm test execution
3. Update documentation
4. Execute version up command
5. Pass automatic quality checks
6. npm publication
7. Create Git tags and GitHub releases

### 2.3 Git Management Rules

#### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

##### Types
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code formatting
- `refactor`: Refactoring
- `test`: Test additions/modifications
- `chore`: Other changes

##### Examples
```
feat(cli): add token distribution simulation
fix(config): resolve validation error handling
docs(readme): update installation instructions
```

#### Branch Strategy
- `main`: Production stable version
- `develop`: Development integration branch
- `feature/*`: Feature development branches
- `hotfix/*`: Emergency fix branches

## 3. Quality Management Rules

### 3.1 Code Quality Standards

#### Required Check Items
- [ ] No TypeScript type errors
- [ ] No ESLint errors (warnings acceptable)
- [ ] Maintain test coverage
- [ ] Successful build

#### Recommendations
- Meaningful variable and function names
- Appropriate comments (not excessive)
- Adherence to single responsibility principle
- Utilization of dependency injection

### 3.2 Testing Rules

#### Test File Naming
- Unit tests: `*.test.ts`
- Integration tests: `*.spec.ts`
- Test directory: `__tests__/`

#### Test Execution Commands
```bash
npm test           # Execute all tests
npm run test:watch # Watch mode
npm run test:coverage # Execute with coverage
```

### 3.3 Documentation Quality Standards

#### Required Check Items
- [ ] Header information correctly documented
- [ ] Overview appropriately explained
- [ ] Table of contents logically structured
- [ ] Markdown formatting correctly used
- [ ] No typos or grammatical errors

#### Recommendations
- Clear explanations considering the reader
- Visual explanations using diagrams and tables
- Provision of examples and sample code
- Appropriate links to related documents

## 4. Package Management Rules

### 4.1 NPM Package Rules

#### Scope Management
- Package name: `@akamellc/tributary`
- Scope: `akamellc`
- Publication setting: `public`

#### Dependency Management
- `dependencies`: Runtime essential libraries
- `devDependencies`: Development-only tools
- `peerDependencies`: Dependencies to be provided by the user

### 4.2 Build Artifacts

#### Distribution Files
```
dist/
├── cli.js           # CLI executable file
├── index.js         # Library entry point
└── **/*.js          # All TypeScript compilation results
```

#### Excluded Files
- Source code (`src/`)
- Test files (`*.test.ts`, `*.spec.ts`)
- Configuration files (`eslint.config.js`, `tsconfig.json`)

## 5. Update History

| Version | Date | Updater | Major Changes |
|---------|------|---------|---------------|
| 1.0.0 | 2025-01-18 | Claude | Initial creation: Integration of documentation and version management rules |

---

**Note**: This file defines comprehensive project rules. When making changes, please update with stakeholder consensus.