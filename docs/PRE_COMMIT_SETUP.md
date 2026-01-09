# Pre-commit Setup

This project uses Husky and lint-staged to automatically check code quality before commits.

## What runs before each commit?

1. **Lint check** - ESLint validates TypeScript/JSX files for code standards
2. **Format check** - Prettier formats code files (ts, tsx, css, json)
3. **Type check** - TypeScript compiler validates type safety

## Installation

After cloning, run:

```bash
npm install
```

This will automatically set up the Husky pre-commit hook.

## Manual setup (if needed)

If the hook doesn't work, manually initialize Husky:

```bash
npx husky install
```

## Bypassing pre-commit (not recommended)

If you need to skip the pre-commit checks (only for emergency cases):

```bash
git commit --no-verify
```

## Running checks manually

- **Lint**: `npm run lint`
- **Type check**: `npm run typecheck`
- **Format**: `npm run format`
- **All pre-commit checks**: `npm run pre-commit`

## Troubleshooting

### Hook not running on commit
- Ensure `.husky/pre-commit` has execute permissions: `chmod +x .husky/pre-commit`
- Verify Husky is installed: `npm list husky`

### Tests fail before commit
- Fix issues: `npm run lint:fix && npm run typecheck`
- Then commit again

### Windows Git Bash issues
- Ensure Git is properly configured
- Run in PowerShell or CMD if Bash fails
