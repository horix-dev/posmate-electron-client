# Quick Reference: Dev Build Commands

## Overview
This guide shows you the new development build commands and how to use them.

## New Build Commands

### Development Builds (Beta Channel)

These commands build with `UPDATE_CHANNEL=beta`, perfect for testing and development releases.

```bash
# Build for all platforms (Windows, macOS, Linux)
npm run build:dev

# Build for specific platform
npm run build:dev:win        # Windows only
npm run build:dev:mac        # macOS only
npm run build:dev:linux      # Linux only
```

### Production Builds (Latest Channel)

These commands build with `UPDATE_CHANNEL=latest` for production releases.

```bash
# Build for all platforms (Windows, macOS, Linux)
npm run build

# Build for specific platform
npm run build:win            # Windows only
npm run build:mac            # macOS only
npm run build:linux          # Linux only
```

## What's Different?

| Aspect | Dev Build | Production Build |
|--------|-----------|------------------|
| Command | `npm run build:dev` | `npm run build` |
| Channel | `beta` | `latest` |
| App Name | POSMATE DEV | POSMATE |
| Auto-Update | Checks beta channel | Checks latest releases |
| Environment | `.env.development` | `.env.production` |
| Installer Tag | `dev-{number}` | `v{version}` |
| Release Type | Pre-release | Release |

## Common Workflows

### 1. Testing a Local Dev Build

```bash
# Build the dev version
npm run build:dev:win

# Installer will be in: release/POSMATE-x.y.z.exe (Windows)
# Install and run it like any other application
```

**⚠️ Important**: If you get "No published versions on GitHub" error:
- This is **normal** if no beta releases exist yet on GitHub
- The app will work fine offline; it just can't find updates
- Push to develop branch to trigger the first beta release
- After the first release, auto-updates will work

### 2. Building Before Pushing to Develop

```bash
# Ensure everything builds
npm run build:dev

# If it succeeds, your code is ready to push
git push origin develop
```

### 3. Creating a Release Build

```bash
# Build production version for all platforms
npm run build

# Or specific platform
npm run build:win
npm run build:mac
npm run build:linux
```

### 4. Testing Auto-Updates

```bash
# 1. Build dev version
npm run build:dev:win

# 2. Install it
# (from release/POSMATE-x.y.z.exe)

# 3. Push code to develop branch
git push origin develop

# 4. Wait for GitHub Actions to build
# (about 5-10 minutes)

# 5. Check GitHub Releases
# (look for dev-{number} pre-release)

# 6. Run the installed app
# (should check for beta updates automatically)
```

## Environment Variables Used

### .env.development
```env
VITE_APP_NAME=POSMATE DEV
VITE_ENV_MODE=development
UPDATE_CHANNEL=beta
```

### .env.production
```env
VITE_APP_NAME=POSMATE
VITE_ENV_MODE=production
UPDATE_CHANNEL=latest
```

## Before Building

Always run these checks:

```bash
# 1. Type checking
npm run typecheck

# 2. Linting
npm run lint

# 3. Fix lint issues if needed
npm run lint:fix

# 4. Install fresh dependencies (if you just did npm install)
npm ci
```

## After Building

Verify the build succeeded:

```bash
# Check if release directory exists
ls release/

# On Windows:
dir release/

# You should see:
# - POSMATE-x.y.z.exe (Windows)
# - POSMATE-x.y.z.dmg (macOS)
# - POSMATE-x.y.z.AppImage (Linux)
# (depending on your platform and which build you ran)
```

## Troubleshooting

### "Command not found: npm run build:dev"

Make sure you have the latest `package.json`:
```bash
git pull origin develop
npm install
```

### Build fails

Check the error message:
```bash
npm run typecheck    # Check for type errors
npm run lint         # Check for lint errors
npm run lint:fix     # Auto-fix lint issues
npm run build:dev    # Try building again
```

### UPDATE_CHANNEL not working on Windows

Use the alternative syntax:
```bash
# PowerShell
$env:UPDATE_CHANNEL='beta'; npm run build

# Or use cross-env (already installed)
npm run build:dev
```

## Files Modified

These commands use updated configuration in:
- `.env.development` - Dev environment settings
- `.env.production` - Production environment settings  
- `electron/autoUpdater.ts` - Channel configuration
- `electron/main.ts` - Environment variable setup
- `package.json` - New build scripts
- `.github/workflows/release-dev.yml` - GitHub Actions workflow

## Next Steps

1. **Build locally**: `npm run build:dev`
2. **Test the build**: Install and run from `release/`
3. **Push to develop**: `git push origin develop`
4. **Monitor workflow**: Check GitHub Actions
5. **Get build**: Download from GitHub Releases
6. **Test auto-updates**: Run built app and check for beta updates

## Need Help?

- **Setup issues**: See [CI_CD_SETUP.md](CI_CD_SETUP.md)
- **Testing guide**: See [CI_CD_TESTING.md](CI_CD_TESTING.md)
- **Development log**: See [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md)
- **Full docs**: Check the README.md

## Tips

- **For teams**: The CI/CD builds automatically, developers just push to develop
- **For testing**: Use the beta channel builds for latest features
- **For releases**: Use production builds for stable releases
- **For debugging**: Check electron logs in `%APPDATA%/posmate-desktop-client/logs/`
