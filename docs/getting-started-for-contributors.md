# Team Collaboration Setup Guide

Quick setup guide for colleagues getting started with the Horix POS Pro project.

## Prerequisites

Before you start, make sure you have:
- GitHub account (request access from itsmahran)
- Git installed ([download](https://git-scm.com/))
- Node.js 18+ ([download](https://nodejs.org/))
- VS Code (recommended IDE)

---

## Initial Setup (First Time Only)

### Step 1: Get Repository Access

1. Have the project lead (itsmahran) add you as a collaborator
2. Accept the invitation email from GitHub
3. Verify you have access: [Repository Link](https://github.com/itsmahran/posmate-electron-client)

### Step 2: Clone the Repository

```powershell
# Navigate to where you want the project
cd C:\Dev\Projects  # or your preferred location

# Clone the repository
git clone https://github.com/itsmahran/posmate-electron-client.git

# Navigate to frontend directory
cd posmate-electron-client
cd posmate-custom-frontend

# Verify you're on develop branch
git branch
```

### Step 3: Install Dependencies

```powershell
# Install Node packages
npm install

# Verify installation
npm --version  # Should be 9+
node --version # Should be 18+
```

### Step 4: Verify Setup

```powershell
# Run linter
npm run lint

# Run type check
npm run type-check

# Start dev server
npm run dev

# Open http://localhost:5173 in your browser
```

If everything works, you're ready to start coding! 🎉

---

## Before Each Coding Session

```powershell
# Update from latest develop
git fetch origin
git pull origin develop

# Verify you're on develop
git branch

# Check status
git status
```

---

## Typical Workflow

### Step 1: Create Feature Branch

```powershell
# Create new branch from latest develop
git checkout -b feature/your-feature-name

# Example
git checkout -b feature/add-product-search
```

### Step 2: Code & Commit

```powershell
# See what changed
git status

# Stage your changes
git add .
# or stage specific files
git add src/pages/products/

# Commit with descriptive message
git commit -m "feat(products): add search functionality

- Implement text search in product list
- Add debounced search input
- Update filters to include search"

# Make more changes...
# Commit again
git commit -m "feat(products): add filter by category in search results"
```

### Step 3: Keep Branch Updated

Before pushing, sync with develop:

```powershell
# Fetch latest changes
git fetch origin

# Rebase your branch on top of latest develop
git rebase origin/develop

# If conflicts occur:
# 1. Open files with conflicts (marked with <<<<<<)
# 2. Resolve conflicts manually
# 3. Run: git add .
# 4. Run: git rebase --continue
```

### Step 4: Push to GitHub

```powershell
# Push your branch
git push origin feature/your-feature-name

# If rebase modified history, use --force-with-lease
git push origin feature/your-feature-name --force-with-lease
```

### Step 5: Create Pull Request

1. Go to [GitHub Repository](https://github.com/itsmahran/posmate-electron-client)
2. You'll see a notification about your branch
3. Click **"Compare & pull request"**
4. Fill out the PR template:
   - Clear description of changes
   - How to test it
   - Any breaking changes
5. Click **"Create pull request"**

### Step 6: Wait for Review

- Reviewers will check your code
- They may request changes
- Fix any issues and push to same branch
- Once approved, your PR will be merged

---

## Daily Command Cheat Sheet

```powershell
# Check current branch
git branch

# See recent commits
git log --oneline -10

# See what changed
git status
git diff

# Unstage a file
git reset HEAD filename

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Get latest develop
git fetch origin develop
git pull origin develop

# Sync your branch with develop
git rebase origin/develop

# Force push after rebase
git push origin branch-name --force-with-lease

# Delete local branch
git branch -d feature/old-feature

# Delete remote branch
git push origin --delete feature/old-feature
```

---

## Code Before Pushing

Always check locally before pushing:

```powershell
# 1. Check code style
npm run lint

# 2. Check TypeScript types
npm run type-check

# 3. Run tests
npm run test

# 4. Build to verify no errors
npm run build

# 5. Start dev server and manually test
npm run dev
```

If all pass, you're good to push!

---

## Development Tips

### Using VS Code Extensions

Recommended extensions for productivity:

1. **ESLint** - Real-time linting
   - Shows errors as you type
   - Auto-fix on save: Settings → "ESLint: Auto Fix On Save"

2. **Prettier** - Code formatter
   - Auto-format on save
   - Keep formatting consistent

3. **Thunder Client** or **REST Client**
   - Test API calls without leaving VS Code

4. **Git Graph** - Visual git history
   - See branches and commits graphically

### VS Code Settings

```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "eslint.autoFixOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### File Structure Overview

```
src/
├── api/              # API calls (services)
├── components/       # Reusable UI components
├── hooks/           # Custom React hooks
├── lib/             # Utility functions
├── pages/           # Full page components
├── stores/          # State management (Zustand)
├── types/           # TypeScript types
└── App.tsx          # Root component
```

When adding a new feature:
- Create folder in `/src/pages/feature-name/`
- Add `components/`, `hooks/`, `schemas/` subfolders
- Keep related code together

---

## Troubleshooting

### Issue: "npm install" fails

```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and lock file
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json -Force

# Reinstall
npm install
```

### Issue: Git conflicts

```powershell
# See conflicted files
git status

# Open each file, find conflict markers:
# <<<<<<< HEAD
# your changes
# =======
# their changes
# >>>>>>>

# Edit to keep what you want, delete markers
# Then:
git add .
git rebase --continue
# or
git merge --continue
```

### Issue: Branch out of sync

```powershell
# Check status
git status

# Sync
git fetch origin
git pull origin develop

# If your branch is behind:
git rebase origin/develop
```

### Issue: "npm run dev" fails

```powershell
# Check port 5173 isn't already in use
netstat -ano | findstr :5173

# Kill process using port
taskkill /PID <PID> /F

# Try again
npm run dev

# Or use different port
npm run dev -- --port 3000
```

---

## Getting Help

When stuck:

1. **Check DEVELOPMENT_LOG.md** - See previous solutions
2. **Check CONTRIBUTING.md** - Guidelines and examples
3. **Ask in team chat** - Quick answers from team
4. **Check Git history** - See how similar code was done
5. **Run locally** - Reproduce the issue
6. **Read error messages** - Usually very helpful
7. **Google the error** - Stack Overflow has most answers

---

## Your First PR Checklist

- [ ] You created a feature branch
- [ ] You made focused changes (one feature per PR)
- [ ] You tested locally (`npm run dev`)
- [ ] You ran lint and type-check
- [ ] You wrote clear commit messages
- [ ] You updated DEVELOPMENT_LOG.md
- [ ] You synced with develop
- [ ] You created PR with detailed description
- [ ] You responded to review feedback
- [ ] You got 2 approvals (or 1 for develop)

---

## Next Steps

1. **Read CONTRIBUTING.md** - Full contribution guidelines
2. **Read DEVELOPMENT_LOG.md** - Architecture and patterns
3. **Check out an issue** - Look for "good first issue" label
4. **Create your feature branch** - Start coding!

---

## Quick Links

- 📖 [CONTRIBUTING.md](../CONTRIBUTING.md) - Full guidelines
- 📝 [DEVELOPMENT_LOG.md](../DEVELOPMENT_LOG.md) - Architecture docs
- 🐙 [GitHub Repo](https://github.com/itsmahran/posmate-electron-client)
- 🚀 [GitHub Actions CI/CD](.github/workflows/)
- 📚 [Pull Request Management](./pull-request-management.md)

---

## Welcome to the Team! 👋

We're glad to have you contributing to Horix POS Pro. If you have questions, don't hesitate to ask!

Happy coding! 🚀
