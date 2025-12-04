# Team Collaboration Quick Reference

## 🚀 For Colleagues (Contributors)

### Starting Work
```powershell
git checkout -b feature/your-feature
npm install
npm run dev
```

### Before Committing
```powershell
npm run lint
npm run type-check
npm run test
```

### Commit Template
```
type(scope): subject

- Detail 1
- Detail 2
```

**Types:** `feat` `fix` `docs` `style` `refactor` `perf` `test` `chore`

### Creating PR
1. Push branch: `git push origin feature/your-feature`
2. Click "Create PR" on GitHub
3. Fill template (auto-generates)
4. Request review

### If Review Feedback
```powershell
# Fix issues locally
git add .
git commit -m "fix: address review feedback"
git push

# Re-request review on GitHub
```

### Common Problems

**"Cannot merge - branch not up to date"**
```powershell
git fetch origin
git rebase origin/develop
git push --force-with-lease
```

**"Cannot merge - tests failing"**
```powershell
npm run test
# Fix failing tests locally
git add .
git commit -m "test: fix failing tests"
git push
```

---

## 👨‍💼 For Project Lead (itsmahran)

### Adding Team Members
```
Settings → Collaborators and teams
→ Add people
→ Select role (Maintain, Push, or Read)
```

### Reviewing a PR
1. Read description
2. Check "Files changed" tab
3. Review code line-by-line
4. Either:
   - Click **"Approve"** if good
   - Click **"Request changes"** if issues

### Merging PR
```
Check all GREEN ✅
- All status checks pass
- Required approvals met
- Conversations resolved
- Branch up to date

Click "Merge pull request"
Click "Delete branch"
```

### Key Settings to Enable
```
Settings → Branches → Edit rule for 'main' & 'develop'

☑ Require pull request reviews
   - Set to 2 for main, 1-2 for develop
   
☑ Require status checks to pass
   - Add: build, lint, test, type-check
   
☑ Require branches up to date
☑ Require conversation resolution
☑ Include administrators
```

---

## 📊 GitHub Rules Explained

### ✅ Can Only Merge If:
- 1-2 people approved
- All automated checks pass
- No conflicts with base branch
- All comments resolved
- Branch is up to date

### ❌ Will Be Blocked If:
- Tests fail
- ESLint finds issues
- TypeScript errors
- Build fails
- Someone requests changes
- Not enough approvals

---

## 📁 Important Files

```
CONTRIBUTING.md ...................... Read this first
docs/getting-started-for-contributors.md  For new team members
docs/pull-request-management.md ....... For project lead
.github/pull_request_template.md ...... Auto-fills PR form
.github/CODEOWNERS ................... Routes reviews to right people
.github/workflows/ci-cd.yml .......... Automated checks config
```

---

## 🔄 Typical PR Journey

```
1. Create branch
   └─ git checkout -b feature/name

2. Make changes
   └─ Test locally: npm run lint, test, build

3. Push to GitHub
   └─ git push origin feature/name

4. Create PR
   └─ GitHub auto-fills template

5. CI Runs (Auto)
   ├─ ESLint ✅
   ├─ TypeScript ✅
   ├─ Tests ✅
   └─ Build ✅

6. Reviewers Check
   ├─ Code review
   └─ Approve or request changes

7. Address Feedback (If Needed)
   ├─ Make fixes
   └─ Push updates

8. Merge ✅
   └─ Branch deleted

9. Done! 🎉
```

---

## 💡 Pro Tips

**For Contributors:**
- Keep PRs small (< 100 lines of changes when possible)
- Commit often with clear messages
- Write tests for new features
- Update DEVELOPMENT_LOG.md for significant changes
- Ask questions in PR comments
- Respond promptly to feedback

**For Project Lead:**
- Review PRs within 24 hours
- Leave constructive feedback
- Approve good code quickly
- Help unblock contributors
- Monitor CI/CD health
- Merge when all requirements met

---

## 🎯 Branch Strategy

```
main ← production-ready (deploy here)
   ↓
   └─ merge pull requests from release/*
   
develop ← integration (default branch)
   ↓
   ├─ feature/* ← new features
   ├─ bugfix/* ← non-critical bugs
   └─ hotfix/* ← critical production fixes
```

**Creating branches:**
```powershell
git checkout -b feature/cool-feature
git checkout -b bugfix/fix-typo
git checkout -b hotfix/critical-issue
```

---

## 📝 Commit Message Format

```
feat: add new feature description
fix: fix bug description
docs: update documentation
style: format code
refactor: improve code quality
perf: optimize performance
test: add/update tests
chore: update dependencies

Example:
feat(products): add variant product management
- Implement single API request for product+variants
- Add VariantManager component
- Update product service
```

---

## 🔍 Status Check Failures

**ESLint Failed?**
```powershell
npm run lint
npm run lint -- --fix  # Auto-fixes many issues
git add . && git commit -m "style: fix linting"
git push
```

**TypeScript Failed?**
```powershell
npm run type-check
# Fix reported type errors
git add . && git commit -m "fix: resolve type errors"
git push
```

**Tests Failed?**
```powershell
npm run test
# Fix failing tests or add new ones
git add . && git commit -m "test: fix test failures"
git push
```

**Build Failed?**
```powershell
npm run build
# Fix compilation errors
git add . && git commit -m "fix: resolve build errors"
git push
```

---

## 🆘 Need Help?

**Quick Questions:**
- Ask in team chat
- Check CONTRIBUTING.md
- Review DEVELOPMENT_LOG.md

**Stuck on Git:**
- Check git-workflow.md
- Ask project lead
- Reference troubleshooting section

**PR Issues:**
- Check status in GitHub
- Click "Details" on failed check
- Read the error message carefully

---

## ✨ Quick Links

- 📖 Full Guide: [CONTRIBUTING.md](../CONTRIBUTING.md)
- 🚀 Getting Started: [getting-started-for-contributors.md](./getting-started-for-contributors.md)
- 👀 Code Review: [pull-request-management.md](./pull-request-management.md)
- 🔧 Setup: [team-collaboration-setup.md](./team-collaboration-setup.md)
- 📱 Protection: [github-branch-protection.md](./github-branch-protection.md)

---

## 🎓 Remember

```
✅ Small PRs
✅ Clear messages
✅ Tests always
✅ Wait for approval
✅ Respond to feedback

❌ Big PRs
❌ Vague messages
❌ Skip tests
❌ Merge without review
❌ Ignore comments
```

---

**Last Updated:** December 4, 2025  
**Version:** 1.0  
**Status:** Production Ready

Print this and share with your team! 📋
