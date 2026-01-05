# Testing the CI/CD Pipeline

## Quick Start: Manual Testing

### Prerequisites
```bash
# Ensure you're on the develop branch
git checkout develop

# Install dependencies
npm install

# Ensure type checking and linting pass
npm run typecheck
npm run lint
```

### Test Dev Build Locally

**Build for Windows**:
```bash
npm run build:dev:win
# Output: release/POSMATE-*.exe
```

**Build for macOS**:
```bash
npm run build:dev:mac
# Output: release/POSMATE-*.dmg
```

**Build for Linux**:
```bash
npm run build:dev:linux
# Output: release/POSMATE-*.AppImage
```

**Build for all platforms**:
```bash
npm run build:dev
# Output: release/ (Windows, macOS, Linux installers)
```

## Testing Auto-Update Mechanism

### 1. Build the Dev Version Locally

```bash
npm run build:dev:win  # Replace with your OS
```

This creates an installer with `UPDATE_CHANNEL=beta` set.

### 2. Install and Run

```bash
# Install the application
# Run the installed application
```

### 3. Check Update Channel

The app should log the channel on startup:
```
[electron] Auto-updater initialized with channel: beta
```

### 4. Verify Auto-Update Check

The app performs update checks:
- **First check**: 5 seconds after app starts
- **Recurring check**: Every 4 hours
- **On beta channel**: Looks for pre-releases with `dev-` tag

### 5. Test Manual Update Check

If the app has a "Check for Updates" button in settings:
1. Click "Check for Updates"
2. Should query beta channel (not latest)
3. Show available beta releases if any exist

## GitHub Actions Workflow Testing

### Manual Trigger via GitHub

1. Go to: https://github.com/horix-organization/posmate-frontend/actions
2. Click "Workflows" → "Build Dev Release"
3. Click "Run workflow"
4. Select branch: `develop`
5. Click "Run workflow"

This will trigger the workflow without pushing code.

### Automatic Trigger

Push to develop branch:
```bash
git checkout develop
git commit -m "test: trigger dev build"
git push origin develop
```

This automatically triggers the workflow.

### Monitor Workflow Execution

1. Go to: https://github.com/horix-organization/posmate-frontend/actions
2. Click the latest "Build Dev Release" run
3. View real-time logs for:
   - Type checking
   - Linting
   - Build for each OS
   - Artifact upload
   - Release creation

## Validation Checklist

### Pre-Build Validation
- [ ] Type checking passes: `npm run typecheck` (no errors)
- [ ] Linting passes: `npm run lint` (no errors)
- [ ] All dependencies installed: `npm install` successful
- [ ] No uncommitted changes: `git status` clean

### Local Build Validation
- [ ] `npm run build:dev` completes without errors
- [ ] `release/` directory created with installers
- [ ] Installer files have correct names and sizes
- [ ] Application starts after installation
- [ ] UPDATE_CHANNEL is set correctly in logs

### GitHub Actions Validation
- [ ] Workflow triggers on push to develop
- [ ] Type check step passes
- [ ] Lint step passes
- [ ] Build steps pass for all platforms
- [ ] Artifacts upload successfully
- [ ] Pre-release created on GitHub

### Auto-Update Validation
- [ ] App logs show channel: `beta`
- [ ] Update check runs at startup
- [ ] Update check runs periodically (4 hour interval)
- [ ] No errors in electron log file
- [ ] App doesn't crash on update check

## Environment Verification

### Verify .env Files

**Check .env.development**:
```bash
cat .env.development | grep UPDATE_CHANNEL
# Expected output: UPDATE_CHANNEL=beta

cat .env.development | grep VITE_APP_NAME
# Expected output: VITE_APP_NAME=POSMATE DEV
```

**Check .env.production**:
```bash
cat .env.production | grep UPDATE_CHANNEL
# Expected output: UPDATE_CHANNEL=latest

cat .env.production | grep VITE_APP_NAME
# Expected output: VITE_APP_NAME=POSMATE
```

### Verify electron/autoUpdater.ts

```bash
grep -n "UPDATE_CHANNEL" electron/autoUpdater.ts
# Should show channel configuration logic
```

### Verify electron/main.ts

```bash
grep -n "UPDATE_CHANNEL" electron/main.ts
# Should show environment variable setup
```

## Troubleshooting

### Type Check Fails
```bash
npm run typecheck
# Fix errors shown in output
# Re-run to verify
```

### Lint Fails
```bash
npm run lint:fix
# Auto-fixes most issues
npm run lint
# Verify any remaining issues
```

### Build Fails Locally
```bash
# Check for Node/npm versions
node --version   # Should be 20.x
npm --version    # Should be 10.x

# Clear and reinstall dependencies
rm -r node_modules package-lock.json
npm install

# Try building again
npm run build:dev
```

### Workflow Fails on GitHub

1. Check workflow logs:
   - Go to Actions → Build Dev Release → Failed run
   - View logs for specific step that failed

2. Common issues:
   - **Type check fails**: Fix types in code, push again
   - **Lint fails**: Run `npm run lint:fix`, commit, push
   - **Build fails**: Check OS-specific requirements
   - **No artifacts**: Ensure `release/` directory created

### Auto-Update Not Working

1. Verify channel in logs:
   ```
   [electron] Auto-updater initialized with channel: beta
   ```

2. Check electron log file:
   ```
   Windows: %APPDATA%/posmate-desktop-client/logs/
   macOS: ~/Library/Logs/posmate-desktop-client/
   Linux: ~/.config/posmate-desktop-client/logs/
   ```

3. Verify GitHub release has beta tag:
   - Release tag format: `dev-{number}`
   - Marked as pre-release: yes
   - Files attached: yes (installers)

4. Check network access:
   - Ensure app can reach api.github.com
   - Check firewall/proxy settings
   - Verify GitHub token in workflow

## Performance Testing

### Build Time
Track build times across platforms:
```bash
time npm run build:dev
# Note: Windows/macOS/Linux times may vary
```

### Artifact Sizes
Check installer sizes:
```bash
ls -lh release/
# Compare to previous builds for size regression
```

### Update Check Performance
Monitor in electron logs:
- Check time to complete update check
- Verify no memory leaks during checks
- Confirm periodic checks don't impact performance

## Documentation Testing

1. Read through `CI_CD_SETUP.md`
2. Follow each workflow described
3. Verify actual behavior matches documentation
4. Update documentation if any discrepancies found

## Continuous Integration Testing

### Before Merging to Main
```bash
# Ensure develop branch builds successfully
git checkout develop
npm run build:dev

# Check that artifact is valid
# (can extract and run locally)

# Verify automated tests pass
npm run test

# Verify test coverage
npm run test:coverage
```

### After Merging to Main
```bash
# Verify production build works
npm run build

# Check that production artifact works
# (simulates what users download)
```

## Team Testing Protocol

### For QA Team
1. Download latest dev release from GitHub
2. Install on test machine
3. Perform test suite
4. Check for auto-updates
5. Report issues with proper environment info

### For Developers
1. Test locally before pushing
2. Monitor workflow on push
3. Download artifacts and test on actual hardware
4. Verify auto-update logic works
5. Update documentation as needed

## Reporting Issues

When reporting CI/CD issues, include:
1. **Workflow run URL**: Link to failed run
2. **Branch**: Which branch triggered it
3. **Error logs**: Copy of error message
4. **Environment**: OS, Node version, npm version
5. **Steps to reproduce**: If testing locally

## Success Criteria

CI/CD pipeline is working correctly when:
- ✅ Workflow triggers automatically on develop push
- ✅ Type checking passes
- ✅ Linting passes
- ✅ Builds succeed for all platforms (Windows/macOS/Linux)
- ✅ Artifacts upload to GitHub
- ✅ Pre-release created with beta tag
- ✅ Downloaded installer runs without errors
- ✅ App detects beta channel correctly
- ✅ Auto-update check works (logs show "Checking for update...")
- ✅ New releases auto-download when available
