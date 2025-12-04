# Contributing to Horix POS Pro

Thank you for contributing to Horix POS Pro! This document outlines our contribution workflow, code standards, and pull request process.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Branch Strategy](#branch-strategy)
3. [Development Workflow](#development-workflow)
4. [Pull Request Process](#pull-request-process)
5. [Code Standards](#code-standards)
6. [Commit Message Guidelines](#commit-message-guidelines)
7. [Code Review Guidelines](#code-review-guidelines)
8. [Testing Requirements](#testing-requirements)

---

## Getting Started

### Prerequisites

- Node.js 18+
- Git
- GitHub account with access to the repository

### Initial Setup

1. **Clone the repository**
   ```powershell
   git clone https://github.com/itsmahran/posmate-electron-client.git
   cd posmate-custom-frontend
   ```

2. **Create a feature branch**
   ```powershell
   git checkout -b feature/your-feature-name
   ```

3. **Install dependencies**
   ```powershell
   npm install
   ```

4. **Start development server**
   ```powershell
   npm run dev
   ```

---

## Branch Strategy

We use **Git Flow** with the following branch structure:

### Main Branches

- **`main`** (production-ready)
  - Protected branch - requires pull request reviews
  - All commits must be from merged PRs
  - Automatically deployed to production

- **`develop`** (integration branch)
  - Protected branch - requires pull request reviews
  - Base branch for feature branches
  - Integration point for features

### Supporting Branches

1. **Feature Branches** (`feature/*`)
   ```
   feature/add-variant-products
   feature/improve-offline-sync
   feature/fix-product-filtering
   ```
   - Branch from: `develop`
   - Merge back to: `develop`
   - Naming: `feature/short-description`

2. **Bugfix Branches** (`bugfix/*`)
   ```
   bugfix/fix-stock-calculation
   bugfix/null-pointer-exception
   ```
   - Branch from: `develop`
   - Merge back to: `develop`
   - For non-critical bugs

3. **Hotfix Branches** (`hotfix/*`)
   ```
   hotfix/critical-payment-issue
   hotfix/security-vulnerability
   ```
   - Branch from: `main`
   - Merge back to: `main` and `develop`
   - For critical production issues only

4. **Release Branches** (`release/*`)
   ```
   release/v1.0.0
   release/v1.2.1
   ```
   - Branch from: `develop`
   - Final testing and bug fixes before release
   - Merge back to: `main` and `develop`

---

## Development Workflow

### Step 1: Create a Feature Branch

Always branch from `develop`:

```powershell
git fetch origin
git checkout -b feature/your-feature develop
```

### Step 2: Work on Your Feature

Follow the code standards (see [Code Standards](#code-standards)):

```powershell
# Make your changes
git add .
git commit -m "feat: add variant product management"
```

### Step 3: Keep Your Branch Updated

Before submitting PR, sync with develop:

```powershell
git fetch origin
git rebase origin/develop

# If conflicts occur, resolve them:
# 1. Fix conflicts in files
# 2. git add .
# 3. git rebase --continue
```

### Step 4: Push Your Branch

```powershell
git push origin feature/your-feature
```

### Step 5: Create a Pull Request

See [Pull Request Process](#pull-request-process)

---

## Pull Request Process

### Before Creating a PR

**Checklist:**

- [ ] Code follows project style guidelines
- [ ] All tests pass locally (`npm run test`)
- [ ] No console errors or warnings
- [ ] TypeScript strict mode passes (`npm run type-check`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Branch is up to date with `develop`
- [ ] No merge conflicts
- [ ] DEVELOPMENT_LOG.md updated with changes (if applicable)

### Creating a PR

1. **Push your branch to GitHub**
   ```powershell
   git push origin feature/your-feature
   ```

2. **Open PR on GitHub**
   - Base: `develop` (or `main` for hotfixes)
   - Compare: `feature/your-feature`

3. **Fill out PR Template**

   Use the template below:

   ```markdown
   ## Description
   Brief description of what this PR does.

   ## Related Issue
   Closes #123 (if applicable)

   ## Type of Change
   - [ ] Bug fix (non-breaking change)
   - [ ] New feature (non-breaking change)
   - [ ] Breaking change
   - [ ] Documentation update

   ## Changes Made
   - Point 1
   - Point 2
   - Point 3

   ## Testing
   Describe how you tested this change:
   - Tested X functionality
   - Verified Y behavior

   ## Screenshots (if applicable)
   Include screenshots for UI changes

   ## Breaking Changes
   List any breaking changes and migration steps

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-reviewed own code
   - [ ] Commented complex logic
   - [ ] Updated DEVELOPMENT_LOG.md
   - [ ] No new warnings generated
   - [ ] Tests added/updated
   - [ ] Documentation updated
   ```

### PR Review Process

1. **At least 2 approvals required** before merging
2. **All CI checks must pass**
3. **No conflicts with develop branch**
4. **Address all review comments**

### Merging PR

- **Squash and merge** for small changes (1-3 commits)
- **Create a merge commit** for larger features (10+ commits)
- Delete branch after merging

---

## Code Standards

### TypeScript

- **Strict mode**: All files must compile in strict mode
- **Type annotations**: Explicit types for function params and returns
- **No `any`**: Use `unknown` or specific types instead

```typescript
// ❌ Bad
function getProduct(id: any): any {
  // ...
}

// ✅ Good
function getProduct(id: number): Product {
  // ...
}
```

### React Components

- **Functional components**: No class components
- **Custom hooks**: Extract reusable logic into hooks
- **PropTypes/TypeScript**: Always type props

```tsx
// ❌ Bad
export function ProductCard(props) {
  return <div>{props.name}</div>
}

// ✅ Good
interface ProductCardProps {
  name: string
  price: number
  onSelect: (id: number) => void
}

export function ProductCard({ name, price, onSelect }: ProductCardProps) {
  return <div>{name}</div>
}
```

### File Organization

```
src/pages/products/
├── components/
│   ├── ProductCard.tsx
│   ├── ProductTable.tsx
│   └── ProductFormDialog.tsx
├── hooks/
│   ├── useProducts.ts
│   └── useProductForm.ts
├── schemas/
│   └── product.schema.ts
├── ProductsPage.tsx
└── index.ts
```

### Naming Conventions

- **Files**: `camelCase` for utilities, `PascalCase` for components
- **Functions**: `camelCase` (e.g., `calculateTotal`)
- **Components**: `PascalCase` (e.g., `ProductCard`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_PRODUCTS`)
- **Boolean functions**: Start with `is`, `has`, `can` (e.g., `isValidEmail`)

### Import Order

```typescript
// 1. React/External libraries
import { useState, useEffect } from 'react'
import { format } from 'date-fns'

// 2. Project imports
import { Button } from '@/components/ui/button'
import { productsService } from '@/api/services'

// 3. Types
import type { Product } from '@/types/api.types'

// 4. Local imports
import { useProducts } from './hooks'
```

### Comments & Documentation

```typescript
/**
 * Calculate total stock value for a product
 * @param product - The product to calculate for
 * @param includeVariants - Whether to include variant stock
 * @returns Total stock value in currency units
 */
function calculateStockValue(product: Product, includeVariants = true): number {
  // Implementation
}
```

---

## Commit Message Guidelines

Follow **Conventional Commits** format:

```
type(scope): subject

body

footer
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding/updating tests
- `chore`: Build process, dependencies

### Examples

```
feat(products): add variant product management

- Implement single API request for product creation with variants
- Add VariantManager component with local variant generation
- Update product service to handle JSON payload for variable products

Closes #123

feat(offline): cache product images for offline access
fix(cart): fix total calculation with dealer prices
docs(api): update product endpoints documentation
refactor(hooks): simplify useProducts hook
```

### Git Hooks (Recommended)

Install Husky for automated checks:

```powershell
npm install husky --save-dev
npx husky install
npx husky add .husky/pre-commit "npm run lint-staged"
npx husky add .husky/pre-push "npm run test"
```

---

## Code Review Guidelines

### For Reviewers

**Things to Check:**

1. **Code Quality**
   - [ ] Code is readable and maintainable
   - [ ] No code duplication
   - [ ] Follows project conventions
   - [ ] TypeScript strict mode compliant

2. **Functionality**
   - [ ] Logic is correct and efficient
   - [ ] No hardcoded values
   - [ ] Proper error handling
   - [ ] Edge cases handled

3. **Testing**
   - [ ] Code is testable
   - [ ] Tests cover happy path and edge cases
   - [ ] No test regressions

4. **Performance**
   - [ ] No unnecessary re-renders (React)
   - [ ] Efficient algorithms
   - [ ] No memory leaks
   - [ ] API calls are optimized

5. **Security**
   - [ ] No sensitive data in logs/comments
   - [ ] Input validation done
   - [ ] No SQL injection vulnerabilities
   - [ ] Proper authentication/authorization

**How to Review:**

```
Request changes for:
- Breaking changes without migration path
- Code that doesn't match project standards
- Logic errors or security issues

Approve with suggestions for:
- Code style improvements
- Performance optimizations
- Documentation suggestions
```

### For PR Authors

- **Respond to all comments** - even if you disagree, explain why
- **Keep scope small** - easier to review, easier to merge
- **Request re-review** after making changes
- **Don't merge your own PRs** - always have another reviewer

---

## Testing Requirements

### Unit Tests

```typescript
// Example test
describe('calculateStockValue', () => {
  it('should calculate correct stock value', () => {
    const product = {
      productStock: 10,
      productPurchasePrice: 100,
    }
    expect(calculateStockValue(product)).toBe(1000)
  })

  it('should return 0 for out of stock', () => {
    const product = { productStock: 0, productPurchasePrice: 100 }
    expect(calculateStockValue(product)).toBe(0)
  })
})
```

### Running Tests

```powershell
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

Minimum coverage requirements:
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

---

## Common Scenarios

### Scenario 1: I've Made a Mistake in My Branch

```powershell
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo and discard last commit
git reset --hard HEAD~1

# Rewrite commit message
git commit --amend -m "new message"
```

### Scenario 2: I Have Conflicts with develop

```powershell
git fetch origin
git rebase origin/develop

# If conflicts occur:
# 1. Fix conflicts
# 2. git add .
# 3. git rebase --continue

# Or abort and start over
git rebase --abort
```

### Scenario 3: I Need to Sync My Branch

```powershell
# Fetch latest changes
git fetch origin

# Rebase on latest develop
git rebase origin/develop

# Or merge (not recommended)
git merge origin/develop
```

### Scenario 4: My PR is Too Large

Split it into multiple PRs:

1. Create separate branches for each logical change
2. Submit PRs in dependency order
3. Each PR targets `develop`
4. Reviewers can approve independently

---

## CI/CD Pipeline

Our GitHub Actions workflows:

### On Every Push

- **Linting**: ESLint checks
- **Type Checking**: TypeScript compilation
- **Tests**: Unit and integration tests

### On PR Creation

- All above checks
- Code coverage analysis
- Security scanning

### On Merge to main

- Build release
- Deploy to staging

### On Release Tag

- Deploy to production

---

## Questions or Issues?

- **Code questions**: Create a discussion in GitHub
- **Bug in main branch**: Create an issue with reproduction steps
- **Feature request**: Create an issue with feature description
- **Need help with PR**: Comment on the PR or ask in team chat

---

## Additional Resources

- [Git Workflow Documentation](./docs/git-workflow.md)
- [Architecture Guide](./DEVELOPMENT_LOG.md)
- [Code Style Guide](./docs/code-style.md)
- [API Documentation](./API_DOCUMENTATION.md)

Thank you for contributing! 🚀
