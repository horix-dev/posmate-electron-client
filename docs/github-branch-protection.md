# GitHub Branch Protection Rules

This document describes the branch protection rules configured for this repository.

## Protected Branches

### `main` Branch

**Protection Rules:**

1. **Require pull request reviews before merging** ❌ (Disabled)
   - Anyone with write permission can push directly

2. **Require status checks to pass before merging** (Recommended but not enforced)
   - Recommended status checks:
     - `build` - TypeScript compilation
     - `lint` - ESLint checks
     - `test` - Unit tests
     - `type-check` - Type checking

3. **Require branches to be up to date before merging** ❌ (Disabled)

4. **Require conversation resolution before merging** ❌ (Disabled)

5. **Include administrators** ❌ (Not applicable)

6. **Restrict who can push to matching branches** ❌ (Disabled)
   - All users with write permission can push directly

### `develop` Branch

**Protection Rules:**

1. **Require pull request reviews before merging** ❌ (Disabled)
   - Anyone with write permission can push directly

2. **Require status checks to pass before merging** (Recommended but not enforced)
   - Recommended status checks:
     - `build`
     - `lint`
     - `test`
     - `type-check`

3. **Require branches to be up to date before merging** ❌ (Disabled)

4. **Require conversation resolution before merging** ❌ (Disabled)

5. **Include administrators** ❌ (Not applicable)

## How to Configure in GitHub

### Current Configuration

This repository is configured with minimal branch protection to allow anyone with write permission to push changes directly.

### Step 1: Go to Repository Settings

1. Navigate to your repository on GitHub
2. Click **Settings** (top navigation)
3. Click **Branches** (left sidebar under Code and automation)

### Step 2: Verify Branch Protection Rules

The following settings should be **disabled** for both `main` and `develop`:

```
☐ Require a pull request before merging
☐ Require status checks to pass before merging
☐ Require conversation resolution before merging
☐ Require deployments to succeed before merging
☐ Include administrators
☐ Restrict who can push to matching branches
```

### Recommended (Optional) Settings

While not enforced, you may want to keep these for visibility:

- ☑ Allow auto-merge (optional)
- ☑ Allow force pushes (optional, use with caution)
- ☑ Allow deletions (optional)

## Workflow Flexibility

With minimal branch protection, developers have flexibility in how they work:

### Direct Push to Protected Branches

All users with write permission can:
- Push directly to `main` or `develop` branches
- Create and delete branches freely
- Force push when necessary (use with caution)

### Recommended Workflow (Optional)

While not enforced, following these practices helps maintain code quality:

1. **Run tests locally** before pushing
   ```powershell
   npm run test
   npm run lint
   npm run typecheck
   ```

2. **Use feature branches** for major changes (optional)
   ```powershell
   git checkout -b feature/your-feature
   # Make changes
   git push origin feature/your-feature
   # Merge when ready
   ```

3. **Pull requests** are optional but can be useful for:
   - Getting feedback on complex changes
   - Documenting major features
   - Discussion and collaboration

## CI/CD Status Checks

Status checks from GitHub Actions are available but not required:

### Available Workflows

1. **build** - TypeScript compilation check
2. **lint** - Code style check
3. **test** - Run unit tests
4. **type-check** - TypeScript strict mode

These workflows will still run on pull requests and pushes, but **they don't block merging or pushing**.

## Best Practices

With relaxed branch protection, consider these best practices:

1. **Test before pushing** - Run tests locally to catch issues early
2. **Communicate with team** - Let others know about significant changes
3. **Use descriptive commit messages** - Makes history easier to understand
4. **Consider PRs for major changes** - Get feedback on complex features
5. **Keep commits focused** - Small, logical commits are easier to review
6. **Document breaking changes** - Update relevant documentation
7. **Tag releases** - Makes version history clear
8. **Pull before push** - Avoid unnecessary merge conflicts

## Direct Push Workflow

Since anyone with write permission can push directly:

```powershell
# Work on your changes
git add .
git commit -m "feat: add new feature"

# Push directly to main or develop
git push origin main
# or
git push origin develop
```

## Troubleshooting

### "Cannot push - permission denied"

- Verify you have write access to the repository
- Check your authentication (SSH key or token)
- Contact repository owner to grant write permission

---

For more information, see [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
