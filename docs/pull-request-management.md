# Pull Request Management & Code Review Process

This document outlines how to effectively manage pull requests and maintain code quality for the Horix POS Pro project.

## Overview

Our PR management strategy ensures:
- **Quality Control**: All code is reviewed before merging
- **Team Knowledge**: Reviewers learn from each PR
- **Consistency**: Code standards are maintained
- **Traceability**: Every change is documented

---

## PR Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Developer creates branch from develop                   │
├─────────────────────────────────────────────────────────────┤
│  2. Developer makes changes + commits                       │
├─────────────────────────────────────────────────────────────┤
│  3. Developer opens PR with detailed description            │
├─────────────────────────────────────────────────────────────┤
│  4. GitHub Actions runs automated checks (CI/CD)            │
├─────────────────────────────────────────────────────────────┤
│  5. Reviewers check code + request changes (if needed)      │
├─────────────────────────────────────────────────────────────┤
│  6. Developer addresses feedback + pushes updates           │
├─────────────────────────────────────────────────────────────┤
│  7. Reviewers approve + PR is merged to develop             │
├─────────────────────────────────────────────────────────────┤
│  8. Developer deletes branch                                │
└─────────────────────────────────────────────────────────────┘
```

---

## For Project Lead (itsmahran)

### Managing Contributors

#### Step 1: Give Collaborator Access

1. Go to Repository → **Settings** → **Collaborators and teams**
2. Click **Add people**
3. Enter GitHub username
4. Choose role:
   - **Maintain**: Can merge PRs, manage branches (recommended for senior devs)
   - **Push**: Can push to branches but not merge
   - **Triage**: Can manage issues and PRs but not code changes
   - **Read**: View-only access

#### Step 2: Configure Branch Protection

See [github-branch-protection.md](./github-branch-protection.md) for detailed setup.

Key settings:
- **main**: 2 approvals required, status checks must pass
- **develop**: 1-2 approvals required, status checks must pass
- Require Code Owners review
- Require conversation resolution

#### Step 3: Set Code Owners

Edit `.github/CODEOWNERS`:

```
* @itsmahran                          # You review everything by default
/src/pages/products/ @itsmahran @colleague1  # Colleague1 reviews products
/src/pages/pos/ @itsmahran @colleague2       # Colleague2 reviews POS
```

### Reviewing PRs

#### Quick Review Checklist

```
□ Is description clear and complete?
□ Are changes aligned with project scope?
□ Does code follow our style guidelines?
□ Are there TypeScript/ESLint errors?
□ Are there test cases?
□ Is DEVELOPMENT_LOG.md updated?
□ Are there breaking changes documented?
□ Is the PR size reasonable (not too large)?
```

#### Approving a PR

1. Click **Review changes**
2. Select **Approve** 
3. Add comment (optional)
4. Click **Submit review**

#### Requesting Changes

```markdown
## Issues Found

1. **Missing error handling** in line 45
   - The component doesn't catch errors from the API call
   - Suggestion: Add try/catch or error boundary

2. **TypeScript error** at line 120
   - Type 'any' is not allowed
   - Suggestion: Use proper type annotation

3. **Code duplication**
   - Similar logic in ProductCard and ProductRow
   - Suggestion: Extract to shared utility

Please address these and re-request review.
```

#### Merging PRs

**Before Merging:**
- [ ] All checks pass ✅
- [ ] At least 2 approvals (main) or 1-2 (develop)
- [ ] No merge conflicts
- [ ] Code owners have reviewed
- [ ] Conversations resolved

**Merge Options:**

1. **Squash and merge** (small changes, <5 commits)
   - Cleaner history
   - Use for: bug fixes, small features

2. **Create a merge commit** (large features, >10 commits)
   - Preserves branch history
   - Use for: major features, refactoring

3. **Rebase and merge** (rarely used)
   - Linear history
   - Use for: hotfixes

**After Merging:**
- [ ] Delete branch (checkbox in merge dialog)
- [ ] Close any related issues
- [ ] Notify team if needed

### Handling Conflicts

If PR has conflicts:

1. Comment: "@contributor Please resolve conflicts with develop"
2. Contributor runs:
   ```powershell
   git fetch origin
   git rebase origin/develop
   # Fix conflicts
   git add .
   git rebase --continue
   git push --force-with-lease
   ```

### Troubleshooting Common Issues

#### PR Won't Merge - Status Checks Failing

```markdown
## CI Pipeline Failed

The build failed due to:
- ESLint errors in src/pages/products/ProductCard.tsx
- Missing TypeScript types

**Action Required:**
1. Fix linting errors
2. Add type annotations
3. Push changes
4. Wait for CI to pass again
```

#### PR Too Large to Review

```markdown
## PR Size

This PR is quite large (100+ files changed). Could you split it into:
1. PR #1: Core changes
2. PR #2: New components
3. PR #3: Tests

This makes review easier and faster.
```

#### Stale PR (No Activity)

1. Comment: "This PR seems inactive. Can you update it?"
2. Wait 1 week
3. If no response: Close with reason
4. Contributor can reopen when ready

---

## For Contributors

### Creating a Quality PR

#### 1. Pre-PR Checklist

```powershell
# Update branch
git fetch origin
git rebase origin/develop

# Run all checks locally
npm run lint
npm run type-check
npm run test

# Build to catch any issues
npm run build

# Check for console errors
npm run dev
# Test your feature manually
```

#### 2. Detailed PR Description

```markdown
## Description
Implement variant product creation with single API request

## Related Issue
Closes #123

## Type of Change
- [x] New feature
- [ ] Bug fix
- [ ] Breaking change

## Changes Made
- Created VariantManager component for local variant generation
- Updated products service to accept variants in payload
- Added formDataToVariableProductPayload converter function

## Testing
1. Open product creation dialog
2. Select "Variable Product" type
3. Select attributes (Size, Color)
4. Verify variants are generated correctly
5. Edit variant prices
6. Save and verify API payload

## Breaking Changes
None

## Screenshots
[Include relevant screenshots]

## Checklist
- [x] Code follows style guidelines
- [x] Tests added/updated
- [x] TypeScript strict mode passes
- [x] DEVELOPMENT_LOG.md updated
```

#### 3. Responding to Feedback

**When reviewer suggests changes:**

```markdown
> The component doesn't handle loading state

You're right! I'll add a loading spinner while variants are being generated.

[Make changes]
[Push updates]
[Re-request review]
```

**When you disagree with feedback:**

```markdown
> We should use Redux instead of Zustand

Actually, I chose Zustand because:
1. Lighter bundle size (important for Electron app)
2. Simpler API for this use case
3. Matches existing state management

Would you prefer we discuss this separately?
```

### PR Best Practices

**DO:**
- ✅ Keep PRs focused on one feature/fix
- ✅ Write clear commit messages
- ✅ Add tests for new functionality
- ✅ Update documentation
- ✅ Respond to feedback promptly
- ✅ Request re-review after changes
- ✅ Keep branch up to date

**DON'T:**
- ❌ Create massive 500+ line PRs
- ❌ Mix refactoring with feature work
- ❌ Push commits like "fix" or "wip"
- ❌ Force push without warning
- ❌ Merge your own PRs
- ❌ Ignore review comments
- ❌ Create PR without description

---

## Monitoring & Metrics

### PR Statistics to Track

```
Dashboard Metrics:
├── Average PR review time: < 24 hours
├── Average time to merge: < 48 hours
├── Failed CI runs: < 10%
├── Reverted PRs: < 5%
└── Code coverage: > 80%
```

### Review Velocity

```powershell
# Get PR stats from GitHub CLI
gh pr list --limit 50 --state merged --search "merged:>=2025-01-01"
```

### Code Review Quality

Track over time:
- How many PRs needed multiple review rounds?
- How many bugs made it through to main?
- Are reviewers catching issues before production?

---

## Automation & Tools

### GitHub Bots

Consider enabling:

1. **Dependabot** - Auto-update dependencies
   ```yaml
   # .github/dependabot.yml
   version: 2
   updates:
     - package-ecosystem: "npm"
       directory: "/"
       schedule:
         interval: "weekly"
   ```

2. **Stale PR Bot** - Close inactive PRs
   ```yaml
   # .github/stale.yml
   daysUntilStale: 14
   daysUntilClose: 7
   ```

3. **Release Bot** - Auto-create releases
   ```yaml
   # Automatic version bumping and releases
   ```

### Local Git Hooks

Prevent bad commits:

```powershell
# Install Husky
npm install husky --save-dev
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint-staged"

# Add pre-push hook
npx husky add .husky/pre-push "npm run test"
```

---

## Decision Making

### When to Approve

- ✅ Code meets our standards
- ✅ All checks pass
- ✅ Tests are comprehensive
- ✅ No security issues
- ✅ Follows project conventions

### When to Request Changes

- ❌ Security vulnerabilities
- ❌ Breaking changes undocumented
- ❌ Code significantly duplicates existing logic
- ❌ No tests for new functionality
- ❌ Poor performance impact
- ❌ Accessibility issues

### When to Comment (No Action Needed)

- 💡 Suggestions for improvement
- 📚 Educational comments
- 🎯 Future optimization ideas
- 📝 Documentation tips

---

## Examples

### Example 1: Good PR

```markdown
## Description
Add product image caching for offline support

## Problem
Product images don't display when offline

## Solution
- Create CachedImage component that stores images in IndexedDB
- Use useImageCache hook to manage cache lifecycle
- Clear cache when storage quota exceeded

## Testing
✅ Created images offline
✅ Verified cache persists after restart
✅ Verified cache clears when full
✅ All tests pass

## Files Changed
- src/components/common/CachedImage.tsx (new)
- src/hooks/useImageCache.ts (new)
- src/pages/pos/components/ProductCard.tsx (modified)

Status: Ready for review
```

### Example 2: Needs Work PR

```markdown
## Description
Fix product bug

## Testing
Tested it locally

## Files Changed
10 files...
```

**Issues:**
- No clear description
- No problem statement
- No testing details
- Too many file changes at once
- No DEVELOPMENT_LOG update

---

## Resources

- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [GitHub PR Docs](https://docs.github.com/en/pull-requests)
- [Git Workflow Docs](./git-workflow.md)
- [Code Review Best Practices](https://google.github.io/eng-practices/review/)

---

## Questions?

Have questions about the PR process?
- Ask in team chat
- Create a discussion on GitHub
- DM the project lead
