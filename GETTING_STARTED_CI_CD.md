# Getting Started with CI/CD & Development Builds

## 🎯 What You Need to Know

The POSMATE project now has a fully automated CI/CD pipeline for building and testing development versions. This guide helps you get started quickly.

## ⚡ Quick Start (2 minutes)

### Just Want to Build?

```bash
# Build development version (beta channel)
npm run build:dev

# Or specific platform
npm run build:dev:win        # Windows only
npm run build:dev:mac        # macOS only
npm run build:dev:linux      # Linux only

# Installer will be in the release/ folder
```

### Just Want to Deploy Dev Build?

```bash
# 1. Make your changes
git add .
git commit -m "your changes"

# 2. Push to develop (triggers automatic build)
git push origin develop

# 3. Wait ~5-10 minutes for GitHub Actions
# 4. Check GitHub Releases for "dev-{number}" pre-release
```

## 📚 Documentation Overview

| Document | Purpose | Read Time |
|----------|---------|-----------|
| [BUILD_COMMANDS.md](BUILD_COMMANDS.md) | Quick reference for all build commands | 2 min |
| [CI_CD_SETUP.md](CI_CD_SETUP.md) | Complete architecture and configuration | 10 min |
| [CI_CD_TESTING.md](CI_CD_TESTING.md) | Testing procedures and troubleshooting | 15 min |
| [CI_CD_IMPLEMENTATION_SUMMARY.md](CI_CD_IMPLEMENTATION_SUMMARY.md) | What was implemented and why | 5 min |

## 🚀 Common Tasks

### Task: Test Code Locally Before Pushing

```bash
# 1. Validate code
npm run typecheck              # Type errors?
npm run lint                   # Style issues?
npm run lint:fix              # Auto-fix style issues

# 2. Build and test
npm run build:dev:win          # Build dev version

# 3. Install and test the build
# (from release/POSMATE-*.exe)

# 4. If all good, push
git push origin develop
```

### Task: Get Latest Dev Build for Testing

```bash
# Option 1: Automatic (if already installed)
# - Run the app
# - It will auto-check for beta updates
# - Auto-download and install

# Option 2: Manual from GitHub
# - Go to: https://github.com/horix-dev/posmate-frontend/releases
# - Find latest "dev-{number}" pre-release
# - Download installer
# - Install/Update
```

### Task: Switch to Production Release

```bash
# Build production version
npm run build                  # All platforms
npm run build:win             # Windows only

# (Typically done by release team, not developers)
```

## 🔄 Understanding the Workflow

```
YOU PUSH TO DEVELOP
        ↓
GITHUB ACTIONS TRIGGERED
        ↓
TYPE CHECK + LINT
        ↓
BUILD FOR WINDOWS/macOS/LINUX
        ↓
CREATE PRE-RELEASE
        ↓
TESTERS DOWNLOAD & TEST
        ↓
FEEDBACK → IMPROVEMENTS
        ↓
REPEAT
```

## 📋 Before You Start

Ensure you have:
- [ ] Node.js 20.x installed (`node --version`)
- [ ] npm 10.x installed (`npm --version`)
- [ ] Dependencies installed (`npm install`)
- [ ] Git configured (`git config --global user.name`)
- [ ] Access to the repository

## 🎓 Key Concepts

### Channel (Beta vs Latest)
- **Beta**: Development builds, latest features, frequent updates
- **Latest**: Production builds, stable only, less frequent

### When You Push to Develop
- GitHub Actions **automatically** builds your code
- Creates a **pre-release** for testers
- Testers can **auto-update** to your changes

### When Developers Build Locally
- Use `npm run build:dev` for testing
- Simulates what GitHub Actions will do
- Catch errors early before pushing

## ⚙️ Environment Variables

The system uses different environment settings:

| Variable | Dev | Production |
|----------|-----|-----------|
| VITE_APP_NAME | POSMATE DEV | POSMATE |
| UPDATE_CHANNEL | beta | latest |
| VITE_ENV_MODE | development | production |

You don't need to set these manually—they're configured in `.env.development` and `.env.production`.

## 🐛 Something Not Working?

### Build Fails
1. Check errors: `npm run typecheck && npm run lint`
2. Fix errors
3. Try again: `npm run build:dev`

### Auto-Updates Not Working
1. Check: `.env.development` or `.env.production`
2. Verify: `UPDATE_CHANNEL` is set correctly
3. See: [CI_CD_TESTING.md#troubleshooting](CI_CD_TESTING.md)

### Workflow Doesn't Run
1. Did you push to `develop` branch?
2. Check: [GitHub Actions](https://github.com/horix-dev/posmate-frontend/actions)
3. See: [CI_CD_TESTING.md#troubleshooting](CI_CD_TESTING.md)

## 📖 Learning Paths

### If you're a...

**Developer** 👨‍💻
1. Read: [BUILD_COMMANDS.md](BUILD_COMMANDS.md) (2 min)
2. Run: `npm run build:dev` (2 min)
3. Push to develop branch
4. Monitor: GitHub Actions (optional)

**QA / Tester** 🧪
1. Read: [CI_CD_TESTING.md](CI_CD_TESTING.md) (15 min)
2. Download latest pre-release from GitHub
3. Test and report issues

**DevOps / Maintainer** 🔧
1. Read: [CI_CD_SETUP.md](CI_CD_SETUP.md) (10 min)
2. Review: `.github/workflows/release-dev.yml`
3. Monitor workflows regularly
4. Update documentation as needed

**Project Manager** 📊
1. Read: [CI_CD_IMPLEMENTATION_SUMMARY.md](CI_CD_IMPLEMENTATION_SUMMARY.md) (5 min)
2. Understand the process
3. Track development builds and releases

## ✅ Next Steps

1. **Review** this document
2. **Read** [BUILD_COMMANDS.md](BUILD_COMMANDS.md)
3. **Try** building locally: `npm run build:dev:win`
4. **Test** the installation
5. **Push** to develop and watch GitHub Actions build it

## 📞 Need Help?

- **How do I build?** → [BUILD_COMMANDS.md](BUILD_COMMANDS.md)
- **How do I test?** → [CI_CD_TESTING.md](CI_CD_TESTING.md)
- **How does it work?** → [CI_CD_SETUP.md](CI_CD_SETUP.md)
- **What was done?** → [CI_CD_IMPLEMENTATION_SUMMARY.md](CI_CD_IMPLEMENTATION_SUMMARY.md)
- **Development history?** → [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md)

## 🎉 You're All Set!

The CI/CD pipeline is ready. Your next push to develop will trigger an automatic build. Happy coding!

---

**Last Updated**: 2026-01-05  
**Status**: ✅ Ready for Use
