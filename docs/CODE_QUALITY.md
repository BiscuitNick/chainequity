# Code Quality Tools

This project uses automated code quality tools to ensure consistent code style, catch errors early, and maintain high code standards.

## Tools Configured

### 1. ESLint
TypeScript/JavaScript linter with TypeScript-specific rules.

**Configuration:** `eslint.config.js`

**Usage:**
```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix
```

### 2. Prettier
Code formatter for consistent code style across the project.

**Configuration:** `.prettierrc`, `.prettierignore`

**Usage:**
```bash
# Format all files
npm run format

# Check if files are formatted
npm run format:check
```

### 3. Solhint
Solidity linter for smart contracts with security-focused rules.

**Configuration:** `.solhint.json`

**Usage:**
```bash
# Lint Solidity contracts
npm run lint:sol
```

### 4. Husky
Git hooks manager for automated pre-commit checks.

**Configuration:** `.husky/pre-commit`

Husky automatically runs `lint-staged` before each commit to ensure only properly formatted and linted code is committed.

### 5. Lint-Staged
Runs linters only on staged git files for faster pre-commit checks.

**Configuration:** `.lintstagedrc.json`

Automatically runs on staged files:
- **TypeScript/JavaScript files** (`*.ts`, `*.js`): ESLint + Prettier
- **Solidity files** (`*.sol`): Solhint + Prettier
- **JSON/Markdown** (`*.json`, `*.md`): Prettier

## Pre-Commit Workflow

When you run `git commit`, the following happens automatically:

1. Husky intercepts the commit
2. Lint-staged identifies staged files
3. Runs appropriate linters and formatters on those files
4. If any errors are found, the commit is blocked
5. Fix the errors and try committing again

## Running All Quality Checks

To run all quality checks at once:

```bash
npm run quality
```

This runs:
- ESLint on TypeScript/JavaScript files
- Solhint on Solidity contracts
- Prettier format check

## IDE Integration

### VS Code

Install these extensions for automatic formatting and linting:

1. **ESLint** (`dbaeumer.vscode-eslint`)
2. **Prettier** (`esbenp.prettier-vscode`)
3. **Solidity** (`JuanBlanco.solidity`)

Add to your VS Code settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[solidity]": {
    "editor.defaultFormatter": "JuanBlanco.solidity"
  }
}
```

## Configuration Details

### ESLint Rules

- **TypeScript**: Recommended rules from `@typescript-eslint`
- **No explicit `any`**: Warned (should use specific types)
- **Unused variables**: Error (except those starting with `_`)
- **Console statements**: Warned (except `console.warn` and `console.error`)
- **Prettier integration**: Formatting errors show as ESLint errors

### Prettier Rules

- **Semi-colons**: Yes
- **Single quotes**: Yes
- **Print width**: 100 characters
- **Tab width**: 2 spaces
- **Trailing commas**: ES5 style
- **Solidity**: Special formatting (4-space tabs, double quotes, 120 char width)

### Solhint Rules

- **Compiler version**: Must be ^0.8.0
- **Max line length**: 120 characters
- **Security rules**: Enabled (no low-level calls, no inline assembly warnings)
- **Style rules**: Consistent naming conventions
- **Gas optimization**: Suggestions for indexed events and calldata parameters

## Bypassing Pre-Commit Hooks

**Not recommended**, but if needed in emergencies:

```bash
git commit --no-verify -m "Emergency commit message"
```

## Troubleshooting

### "Cannot find eslint.config.js"
- Ensure you're running ESLint v9+ which uses the new flat config format
- The project uses `eslint.config.js` instead of `.eslintrc.js`

### Pre-commit hook not running
```bash
# Reinstall Husky
npm run prepare
```

### Linting errors in node_modules
The configuration should ignore `node_modules/`, `dist/`, and other build directories. If you see errors in these directories, check the `ignores` section in `eslint.config.js`.

## Continuous Integration

These checks should also be run in your CI pipeline before merging pull requests:

```bash
npm run quality
npm test
```

## Contributing

Before submitting a pull request:

1. Ensure all code quality checks pass: `npm run quality`
2. Ensure all tests pass: `npm test`
3. Format your code: `npm run format`
4. Fix any linting errors: `npm run lint:fix`
5. Review Solidity warnings: `npm run lint:sol`

Following these guidelines ensures consistent, high-quality code across the project.
