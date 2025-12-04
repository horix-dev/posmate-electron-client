# GitHub Branch Protection Rules

This document describes the branch protection rules configured for this repository.

## Protected Branches

### `main` Branch

**Protection Rules:**

1. **Require pull request reviews before merging**
   - Required number of dismissals: **2**
   - Require review from Code Owners: ✅
   - Dismiss stale pull request approvals when new commits are pushed: ✅

2. **Require status checks to pass before merging**
   - Required status checks:
     - `build` - TypeScript compilation
     - `lint` - ESLint checks
     - `test` - Unit tests
     - `type-check` - Type checking

3. **Require branches to be up to date before merging** ✅

4. **Require conversation resolution before merging** ✅

5. **Include administrators** ✅

6. **Restrict who can push to matching branches**
   - Only allow: Repository administrators

### `develop` Branch

**Protection Rules:**

1. **Require pull request reviews before merging**
   - Required number of dismissals: **1-2**
   - Require review from Code Owners: ✅
   - Dismiss stale pull request approvals when new commits are pushed: ✅

2. **Require status checks to pass before merging**
   - Required status checks:
     - `build`
     - `lint`
     - `test`
     - `type-check`

3. **Require branches to be up to date before merging** ✅

4. **Require conversation resolution before merging** ✅

5. **Include administrators** ✅

## How to Set Up in GitHub

### Step 1: Go to Repository Settings

1. Navigate to your repository on GitHub
2. Click **Settings** (top navigation)
3. Click **Branches** (left sidebar under Code and automation)

### Step 2: Add Branch Protection Rule

1. Click **Add rule** button
2. Enter pattern: `main` or `develop`

### Step 3: Configure Rule (for main)

```
☑ Require a pull request before merging
   ☑ Require approvals: 2
   ☑ Dismiss stale pull request approvals when new commits are pushed
   ☑ Require review from Code Owners
   ☑ Restrict who can dismiss pull request reviews

☑ Require status checks to pass before merging
   ☑ Require branches to be up to date before merging
   ○ Require strict status checks (recommended)
   
   Add status checks:
   - build
   - lint
   - test
   - type-check

☑ Require conversation resolution before merging

☑ Require deployments to succeed before merging

☑ Require a merge commit
   (Choose merge strategy)

☑ Include administrators

☑ Restrict who can push to matching branches
   (Select: Only specified roles/users)

☑ Allow auto-merge

☑ Allow force pushes
   (Choose: Dismiss)
```

### Step 4: Configure Rule (for develop)

Same as above, but:
- Require approvals: **1** (or 2 for stricter control)
- Adjust other settings as needed

## Code Owners File

Create `.github/CODEOWNERS` to specify who must review certain files:

```
# Global owners
* @itsmahran

# Product management
/src/pages/products/ @itsmahran @colleague1

# POS/Sales
/src/pages/pos/ @itsmahran @colleague2

# API/Services
/src/api/ @itsmahran

# Database/Offline
/src/lib/db/ @itsmahran @colleague3
```

## CODEOWNERS Enforcement

To enforce CODEOWNERS reviews:

1. Go to **Settings** → **Branches**
2. Edit branch protection rule
3. Check **Require review from Code Owners** ✅

## Automation Rules

### Auto-merge Configuration

Enable auto-merge for:
- Feature branches to `develop` after 1-2 approvals
- Release branches to `main` after admin approval

1. Go to **Settings** → **Branches**
2. Edit rule
3. Check **Allow auto-merge** ✅

## CI/CD Status Checks

Configure required status checks from GitHub Actions:

### Required Workflows

1. **build** - TypeScript compilation check
2. **lint** - Code style check
3. **test** - Run unit tests
4. **type-check** - TypeScript strict mode

These must pass before PR can be merged.

## Dismissal Permissions

Only these can dismiss reviews:
- Repository owner (itsmahran)
- Team leads / Code owners

## Enforcement for Administrators

**Include administrators in branch protections** ensures that:
- Even admins cannot bypass the protection rules
- Maintains consistency across the team
- Prevents accidental pushes to protected branches

## Exceptions

To temporarily bypass branch protection:

1. **Emergency hotfix**: 
   - Create hotfix branch from `main`
   - Get fast-tracked approval from owner
   - Bypass requires owner permission

2. **Admin override**: 
   - Only in critical situations
   - Must document in PR description
   - Notify team

## Troubleshooting

### "Cannot merge - branch needs to be up to date"

```powershell
git fetch origin
git rebase origin/develop
git push origin feature/your-feature --force-with-lease
```

### "Cannot merge - status checks not passing"

Check CI/CD pipeline:
1. Go to PR → Checks tab
2. See which checks failed
3. Click "Details" on failed check
4. Fix issues locally
5. Push fixes to same branch

### "Cannot merge - needs code owner review"

- Assign PR to code owner
- Tag them in a comment
- Wait for their review

## Best Practices

1. **Never force push to protected branches**
2. **Keep PRs small** - easier to review
3. **Address all review comments** - even if disagreeing, explain
4. **Require CI to pass** - don't merge failing PRs
5. **Use squash merge** for small changes
6. **Use merge commit** for large features
7. **Delete branch after merge** - keep repo clean
8. **Tag releases** - makes history clear

---

For more information, see [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
