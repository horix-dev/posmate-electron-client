# Team Collaboration Setup Checklist

Complete this checklist to set up your repository for team collaboration. This ensures your team can contribute safely and maintain code quality.

## GitHub Configuration

### Repository Settings

- [ ] **Visibility**: Set to Private (if not already)
  - Settings → General → Change repository visibility to Private

- [ ] **Default Branch**: Set to `develop`
  - Settings → Branches → Default branch → Select `develop`

- [ ] **Branch Protection**: Enable for `main` and `develop`
  - See [github-branch-protection.md](./github-branch-protection.md)

### Collaborator Management

- [ ] **Add Code Owners File**
  - ✅ `.github/CODEOWNERS` created
  - Update with your team structure

- [ ] **Add Collaborators**
  - Settings → Collaborators and teams
  - Add team members with appropriate roles:
    - Owner: Full access (you)
    - Maintain: Can merge PRs (senior devs)
    - Push: Can push branches (regular devs)

- [ ] **Set Code Owner Review Requirements**
  - Settings → Branches → Edit `main`
  - Check "Require review from Code Owners"

## Pull Request Configuration

- [ ] **PR Template Created**
  - ✅ `.github/pull_request_template.md` created
  - Reviewers will see this template when creating PRs

- [ ] **Branch Protection Rules**
  - [ ] `main`: Require 2 approvals
    - Status checks: build, lint, test, type-check
    - Require up-to-date branches
    - Require resolved conversations
    - Include admins
  
  - [ ] `develop`: Require 1-2 approvals
    - Status checks: build, lint, test, type-check
    - Require up-to-date branches
    - Require resolved conversations
    - Include admins

## CI/CD Pipeline

- [ ] **GitHub Actions Configured**
  - ✅ `.github/workflows/ci-cd.yml` created
  - Verify workflows are enabled:
    - Settings → Actions → General
    - Check "Allow all actions and reusable workflows"

- [ ] **Required Status Checks Set**
  - Settings → Branches → Edit rules
  - Add these status checks:
    - `lint-and-type-check`
    - `build`
    - `test`

- [ ] **Secrets Configured** (if needed)
  - Settings → Secrets and variables
  - Add any required API keys, tokens, etc.

## Documentation

- [ ] **CONTRIBUTING.md**
  - ✅ Created and comprehensive
  - Covers branch strategy, PR process, code standards

- [ ] **Pull Request Management Guide**
  - ✅ `docs/pull-request-management.md` created
  - Explains review process and decision making

- [ ] **Getting Started for Contributors**
  - ✅ `docs/getting-started-for-contributors.md` created
  - New team members can follow this

- [ ] **GitHub Branch Protection Guide**
  - ✅ `docs/github-branch-protection.md` created
  - Reference for setting up branch rules

## Development Setup

- [ ] **package.json Scripts**
  - Verify these scripts exist:
    ```json
    {
      "lint": "eslint src",
      "type-check": "tsc --noEmit",
      "test": "vitest",
      "build": "vite build",
      "dev": "vite"
    }
    ```

- [ ] **ESLint Configuration**
  - Verify `.eslintrc` or `eslint.config.js` exists
  - Ensure it enforces your standards

- [ ] **TypeScript Strict Mode**
  - Verify `tsconfig.json` has `"strict": true`
  - Ensure `noImplicitAny`, `strictNullChecks`, etc.

- [ ] **Prettier Configuration** (optional but recommended)
  - Create `.prettierrc` for consistent formatting
  - Configure in `package.json` or `.prettierrc`

## Git Configuration

- [ ] **Branch Naming Convention**
  - Document in CONTRIBUTING.md ✅
  - Convention: `feature/*`, `bugfix/*`, `hotfix/*`

- [ ] **Commit Message Convention**
  - Document in CONTRIBUTING.md ✅
  - Convention: Conventional Commits (feat:, fix:, etc.)

- [ ] **Git Hooks** (optional but recommended)
  - [ ] Install Husky:
    ```powershell
    npm install husky --save-dev
    npx husky install
    ```
  
  - [ ] Add pre-commit hook:
    ```powershell
    npx husky add .husky/pre-commit "npm run lint"
    ```
  
  - [ ] Add pre-push hook:
    ```powershell
    npx husky add .husky/pre-push "npm run test"
    ```

## Testing

- [ ] **Test Framework Configured**
  - Verify Vitest or Jest is set up
  - Verify tests can be run with `npm run test`

- [ ] **Coverage Requirements**
  - Set minimum coverage: 80%
  - Enforce in CI/CD if possible

- [ ] **Test Examples**
  - Document testing patterns in DEVELOPMENT_LOG.md ✅
  - Show examples for common cases

## Communication

- [ ] **Team Chat Integration** (optional)
  - Set up GitHub notifications in Slack/Teams
  - Configure notification settings for PRs

- [ ] **Code Review Assignment**
  - Settings → Code owners → Auto-request reviewers
  - Set default reviewers per file/folder

- [ ] **Issue Templates** (optional)
  - Create `.github/ISSUE_TEMPLATE/bug_report.md`
  - Create `.github/ISSUE_TEMPLATE/feature_request.md`

## First PR Test

- [ ] **Test Full Workflow**
  - [ ] Create test branch from develop
  - [ ] Make small change
  - [ ] Push and create PR
  - [ ] Verify CI runs
  - [ ] Verify PR template appears
  - [ ] Request review from team member
  - [ ] Practice reviewing and merging
  - [ ] Delete test branch

## Team Communication

- [ ] **Share Documentation**
  - Send links to all team members:
    - CONTRIBUTING.md
    - Getting Started for Contributors
    - Pull Request Management
  
- [ ] **Conduct Team Meeting**
  - Explain branch strategy
  - Walk through PR process
  - Show examples
  - Answer questions

- [ ] **Establish Ground Rules**
  - How often to sync with develop
  - Expected PR review time
  - Who can merge PRs
  - When to use force push
  - Emergency hotfix process

## Ongoing Maintenance

- [ ] **Weekly**
  - Review open PRs
  - Address stale PRs
  - Update dependencies

- [ ] **Monthly**
  - Review branch protection rules
  - Check CI/CD pipeline health
  - Analyze PR metrics
  - Update documentation if needed

- [ ] **Quarterly**
  - Review and refine workflow
  - Get team feedback
  - Update standards if needed

---

## Verification Checklist

Run through these to verify everything works:

```powershell
# 1. Clone and setup
git clone https://github.com/itsmahran/posmate-electron-client.git
cd posmate-custom-frontend
npm install

# 2. Verify scripts work
npm run lint
npm run type-check
npm run build
npm run test

# 3. Verify branch exists
git branch -a
# Should see: develop, main, etc.

# 4. Verify can create branch
git checkout -b test/setup-verification
echo "test" > test.txt
git add .
git commit -m "test: verification"
git push origin test/setup-verification

# 5. On GitHub:
# - Check PR template appears
# - Check CI runs
# - Check status checks required

# 6. Cleanup
git checkout develop
git push origin --delete test/setup-verification
```

---

## Support Resources

### For Project Lead (itsmahran)

- [GitHub Docs - Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [GitHub Docs - Code Owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

### For Contributors

- [CONTRIBUTING.md](../CONTRIBUTING.md)
- [Getting Started Guide](./getting-started-for-contributors.md)
- [Pull Request Management](./pull-request-management.md)

---

## Completion Timeline

**Day 1:**
- [ ] Setup GitHub configuration
- [ ] Add team members
- [ ] Create PR template
- [ ] Enable branch protection

**Day 2:**
- [ ] Configure CI/CD
- [ ] Add documentation
- [ ] Test full workflow
- [ ] Brief team

**Week 1:**
- [ ] Monitor first PRs
- [ ] Adjust rules if needed
- [ ] Support team members
- [ ] Fix any issues

---

## Sign-Off

- **Project Lead**: ___________________________ Date: __________
- **Team Lead** (if applicable): _______________ Date: __________
- **Documentation**: ___________________________ Date: __________

Once all checkboxes are complete, your team is ready for collaborative development! 🚀

---

## Questions?

- Check the relevant documentation file
- Ask on GitHub Discussions
- Create an issue for problems
- Refer to team leads

---

**Last Updated**: December 4, 2025
**Version**: 1.0
**Status**: Ready for Implementation
