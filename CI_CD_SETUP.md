# CI/CD Setup & Development Build Pipeline

## Overview

This document describes the automated build and release pipeline for POSMATE desktop application. The system provides:

- **Automated dev/testing builds** from the `develop` branch
- **Beta channel auto-updates** for testing users
- **Multi-platform builds** (Windows, macOS, Linux) in parallel
- **Local dev build commands** for manual testing

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              develop branch (default)                │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Push commit → GitHub Actions triggered       │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          GitHub Actions: release-dev.yml Workflow           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ✓ Type Check (npm run typecheck)                    │   │
│  │  ✓ Lint (npm run lint)                               │   │
│  │  ✓ Build for Windows (UPDATE_CHANNEL=beta)          │   │
│  │  ✓ Build for macOS (UPDATE_CHANNEL=beta)            │   │
│  │  ✓ Build for Linux (UPDATE_CHANNEL=beta)            │   │
│  │  ✓ Upload artifacts (30-day retention)              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           GitHub Release (Pre-release, beta tag)            │
│  - Windows installer (.exe)                                 │
│  - macOS installer (.dmg)                                   │
│  - Linux installer (.AppImage)                              │
│  - Auto-update metadata                                     │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│         Tester Workflow (Auto-update enabled)               │
│  1. Download beta release from GitHub                       │
│  2. Install/update application                              │
│  3. App checks for updates on beta channel                  │
│  4. Auto-download and install new beta releases             │
└─────────────────────────────────────────────────────────────┘
```

## Configuration Files

### 1. GitHub Actions Workflow
**File**: `.github/workflows/release-dev.yml`

**Triggers**:
- `push` to `develop` branch
- `workflow_dispatch` (manual trigger from GitHub UI)

**Environment Variables**:
- `UPDATE_CHANNEL=beta` - Sets electron-updater to use beta channel
- `VITE_API_BASE_URL=http://localhost:8700` - Backend API endpoint

**Outputs**:
- Pre-release on GitHub with tag `dev-{run_number}`
- Artifacts for 30 days
- Auto-update metadata in release notes

### 2. Environment Configuration

#### `.env.development`
```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8700
VITE_APP_NAME=POSMATE DEV

# Feature Flags
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_THERMAL_PRINT=true

# Development Settings
VITE_ENV_MODE=development
UPDATE_CHANNEL=beta
```

#### `.env.production`
```env
# API Configuration - Production
VITE_API_BASE_URL=http://localhost:8700
VITE_APP_NAME=POSMATE

# Feature Flags
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_THERMAL_PRINT=true

# Production Settings
VITE_ENV_MODE=production
UPDATE_CHANNEL=latest
```

### 3. Electron Configuration

#### `electron/autoUpdater.ts`
```typescript
// Configures update channel based on environment
const updateChannel = process.env.UPDATE_CHANNEL || 'latest'
if (process.env.UPDATE_CHANNEL) {
  autoUpdater.channel = updateChannel
}
```

#### `electron/main.ts`
```typescript
// Configure update channel based on environment
// This is set during CI/CD builds: UPDATE_CHANNEL=beta for dev builds
if (!process.env.UPDATE_CHANNEL && process.env.NODE_ENV === 'development') {
  process.env.UPDATE_CHANNEL = 'latest'
}
```

### 4. Build Scripts

#### `package.json`
```json
{
  "scripts": {
    "build": "tsc && vite build && electron-builder",
    "build:win": "tsc && vite build && electron-builder --win",
    "build:mac": "tsc && vite build && electron-builder --mac",
    "build:linux": "tsc && vite build && electron-builder --linux",
    "build:dev": "cross-env UPDATE_CHANNEL=beta npm run build",
    "build:dev:win": "cross-env UPDATE_CHANNEL=beta npm run build:win",
    "build:dev:mac": "cross-env UPDATE_CHANNEL=beta npm run build:mac",
    "build:dev:linux": "cross-env UPDATE_CHANNEL=beta npm run build:linux"
  }
}
```

## Channel Architecture

### Latest Channel (Production)
```
Release Flow:
  main/master branch 
    → GitHub Actions (release.yml)
    → Production Release (tag: v{version})
    → UPDATE_CHANNEL=latest
    → App checks every 4 hours
    → Only stable releases deployed
```

### Beta Channel (Development/Testing)
```
Release Flow:
  develop branch
    → GitHub Actions (release-dev.yml)
    → Pre-Release (tag: dev-{run_number})
    → UPDATE_CHANNEL=beta
    → App checks every 4 hours
    → Latest dev builds available
```

## Usage Workflows

### For Developers: Building Locally

**Build for testing (beta channel)**:
```bash
npm run build:dev              # All platforms
npm run build:dev:win          # Windows only
npm run build:dev:mac          # macOS only
npm run build:dev:linux        # Linux only
```

**Build for production (latest channel)**:
```bash
npm run build                  # All platforms
npm run build:win              # Windows only
npm run build:mac              # macOS only
npm run build:linux            # Linux only
```

### For Testers: Getting Latest Builds

1. **Install from GitHub Release**:
   - Visit: https://github.com/horix-dev/posmate-electron-client/releases
   - Find the latest pre-release with `dev-` tag
   - Download installer for your OS
   - Install/Update the application

2. **Automatic Updates**:
   - App will check for updates on beta channel every startup
   - Download notification appears automatically
   - Update installs on app close (or manually restart)

3. **Switch Channels**:
   - Testers can switch to beta channel for latest features
   - Set environment variable: `UPDATE_CHANNEL=beta`
   - App will then check beta channel for updates

### For CI/CD Pipeline

**Automated on develop branch**:
```
1. Commit pushed to develop
2. GitHub Actions workflow triggered
3. Type check + Lint validation
4. Parallel builds (Windows/macOS/Linux)
5. UPDATE_CHANNEL=beta set during build
6. Artifacts uploaded
7. Pre-release created automatically
```

## Monitoring & Troubleshooting

### Check Workflow Status
1. Go to: https://github.com/horix-dev/posmate-electron-client/actions
2. Filter by: `release-dev` workflow
3. View logs for any step

### Common Issues

**Issue**: Workflow fails at type check or lint
- **Solution**: Fix errors locally, push again, or use `npm run lint:fix`

**Issue**: Build fails on one platform
- **Solution**: Check platform-specific requirements (e.g., macOS signing)
- Look at workflow logs for error details

**Issue**: App not auto-updating on beta channel
- **Solution**: Check `UPDATE_CHANNEL` environment variable is set
- Verify GitHub release is tagged with correct channel
- Check `electron/autoUpdater.ts` channel configuration

**Issue**: Assets not uploading to release
- **Solution**: Ensure `electron-builder` created files in `release/` directory
- Check workflow artifact upload step

## Security Considerations

1. **GitHub Token**: Used for creating releases and uploading artifacts
   - Permissions: `contents: write`, `packages: write`
   - Automatically provided by GitHub Actions

2. **Code Signing**: Currently disabled (can be enabled for production)
   - macOS: Requires Apple Developer Certificate
   - Windows: Requires Code Signing Certificate

3. **Update Verification**:
   - electron-updater verifies signatures automatically
   - GitHub releases provide metadata verification

## Future Enhancements

1. **Code Signing**:
   - Add macOS code signing in workflow
   - Add Windows code signing certificates

2. **Automated Testing**:
   - Add integration tests before build
   - Smoke tests on built artifacts

3. **Release Management**:
   - Auto-generate release notes from commits
   - Changelog generation

4. **Notification System**:
   - Slack/Discord notifications for failed builds
   - Update notifications to stakeholders

5. **Performance Monitoring**:
   - Track build times
   - Monitor artifact sizes
   - Cache optimization

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [electron-builder Documentation](https://www.electron.build/)
- [electron-updater Documentation](https://www.electron.build/auto-update)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)
