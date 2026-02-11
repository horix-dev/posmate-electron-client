# Automated Code Review & Notification System

## Overview

This document describes the automated code review and notification system that monitors commits to the `main` and `develop` branches. The system provides automated quality checks and sends email notifications when critical issues are detected.

## Features

### 1. **CodeQL Security Scanning**
- Scans TypeScript/JavaScript code for security vulnerabilities
- Detects common security patterns and anti-patterns
- Analyzes code for potential security issues
- Results available in GitHub Security tab

### 2. **Code Quality Analysis**
- **ESLint**: Checks code style and identifies potential bugs
- **TypeScript Type Checking**: Ensures type safety
- Detects critical errors that could cause runtime issues
- Provides detailed error reports

### 3. **Dependency Security**
- Scans npm dependencies for known vulnerabilities
- Identifies high and critical severity issues
- Reports outdated packages with security fixes
- Generates audit reports

### 4. **Email Notifications**
- Sends alerts when critical issues are found
- Includes commit details and issue summary
- HTML formatted for easy reading
- Links directly to workflow run for details

### 5. **Automated Issue Creation**
- Creates GitHub issues for critical problems on `main` branch
- Labels issues appropriately for triage
- Provides context and links to investigation

## Workflow Triggers

The automated review runs on:
- **Push to `main` branch** - Production deployments
- **Push to `develop` branch** - Development releases
- **Manual trigger** - On-demand via GitHub Actions UI

## Email Notification Setup

To enable email notifications, configure the following GitHub Secrets:

### Required Secrets

Navigate to **Repository Settings → Secrets and variables → Actions → New repository secret**

1. **`MAIL_SERVER`** - SMTP server address (e.g., `smtp.gmail.com`)
2. **`MAIL_PORT`** - SMTP port (e.g., `587` for TLS, `465` for SSL)
3. **`MAIL_USERNAME`** - Email account username
4. **`MAIL_PASSWORD`** - Email account password or app-specific password
5. **`MAIL_TO`** - Recipient email address(es) - comma-separated for multiple
6. **`MAIL_FROM`** - Sender email address

### Example: Gmail Configuration

For Gmail, you'll need to:
1. Enable 2-factor authentication on your Google account
2. Generate an app-specific password
3. Configure secrets:
   - `MAIL_SERVER`: `smtp.gmail.com`
   - `MAIL_PORT`: `587`
   - `MAIL_USERNAME`: `your-email@gmail.com`
   - `MAIL_PASSWORD`: `your-app-specific-password`
   - `MAIL_TO`: `team@example.com,manager@example.com`
   - `MAIL_FROM`: `your-email@gmail.com`

### Example: Office 365 Configuration

For Office 365/Outlook:
- `MAIL_SERVER`: `smtp.office365.com`
- `MAIL_PORT`: `587`
- `MAIL_USERNAME`: `your-email@company.com`
- `MAIL_PASSWORD`: `your-password`

### Example: Custom SMTP Server

For custom SMTP servers:
- Configure according to your SMTP provider's documentation
- Ensure the server allows automated email sending
- Check firewall rules allow outbound SMTP connections

## What Gets Checked

### Critical Issues That Trigger Notifications

The system sends notifications when it detects:

1. **Security Vulnerabilities**
   - SQL injection patterns
   - Cross-site scripting (XSS) risks
   - Authentication/authorization issues
   - Unsafe API usage
   - Hardcoded credentials

2. **Code Quality Errors**
   - ESLint errors (not warnings)
   - TypeScript compilation errors
   - Syntax errors
   - Undefined variable usage

3. **Dependency Issues**
   - High or critical severity vulnerabilities
   - Known exploits in dependencies
   - Outdated packages with security patches

### Non-Critical Issues (No Notification)

These are logged but don't trigger notifications:
- ESLint warnings
- TypeScript warnings
- Low/moderate dependency vulnerabilities
- Code style issues
- Formatting issues

## Notification Content

Email notifications include:

- **Repository & Branch Information**
- **Commit Details** (SHA, author, message)
- **Summary of Issues** (categorized by type)
- **Direct Link** to workflow run for details
- **Action Items** for fixing issues

## Viewing Results

### GitHub Actions Tab
1. Navigate to **Actions** tab in repository
2. Select **Automated Code Review & Notifications** workflow
3. Click on the specific run to view details

### GitHub Security Tab
1. Navigate to **Security** tab in repository
2. Click **Code scanning alerts** to view CodeQL findings
3. Review and dismiss false positives

### Workflow Artifacts
Each run generates artifacts with detailed reports:
- `code-quality-results` - Lint and type check output
- `dependency-audit-results` - npm audit results

Download these from the workflow run page for detailed analysis.

## Integration with CI/CD

This workflow is **non-blocking** - it won't prevent pushes from completing. This aligns with the repository's policy of allowing anyone with write permission to push to `main` and `develop`.

However, you should:
- Monitor email notifications
- Address critical issues promptly
- Review security alerts regularly
- Keep dependencies updated

## Best Practices

### Before Pushing

1. **Run checks locally**:
   ```bash
   npm run lint
   npm run typecheck
   npm audit
   ```

2. **Fix issues before pushing**:
   ```bash
   npm run lint:fix
   npm audit fix
   ```

3. **Test your changes**:
   ```bash
   npm test
   npm run build
   ```

### After Pushing

1. **Monitor workflow runs** - Check Actions tab
2. **Review email notifications** - If you receive one
3. **Address critical issues immediately** - Don't let them accumulate
4. **Update dependencies regularly** - Prevent security debt

### For Critical Issues

If the workflow detects critical issues:

1. **Review the notification email** - Understand what was found
2. **Check the workflow run** - Get detailed logs
3. **Fix the issue** - Address the root cause
4. **Push the fix** - The workflow will run again
5. **Verify** - Confirm the issue is resolved

## Disabling Notifications

If you need to temporarily disable notifications:

1. **Option 1**: Remove the email secrets (notifications will fail silently)
2. **Option 2**: Disable the workflow:
   - Go to **Actions** → **Automated Code Review & Notifications**
   - Click the "..." menu → **Disable workflow**
3. **Option 3**: Modify the workflow file to skip the notify job

## Customization

### Adjusting Notification Threshold

To change what triggers notifications, edit `.github/workflows/code-review-notification.yml`:

```yaml
# In the notify job's prepare step
# Modify the CRITICAL_ISSUES conditions
```

### Adding More Checks

You can add additional jobs to the workflow:
- Performance benchmarks
- Bundle size checks
- Accessibility audits
- Custom validation scripts

### Customizing Email Content

Edit the notification content in the `notify` job:
- Modify `notification.txt` for plain text
- Modify `notification.html` for HTML formatting

## Troubleshooting

### Emails Not Being Sent

1. **Check secrets are configured** - All required secrets must be set
2. **Verify SMTP credentials** - Test with an email client
3. **Check workflow logs** - Look for error messages
4. **Verify email addresses** - Ensure they're valid
5. **Check spam folder** - Notifications might be filtered

### False Positives

If CodeQL reports false positives:
1. Review the alert in GitHub Security tab
2. If confirmed false, dismiss with reason
3. Consider adding CodeQL query filters

### Workflow Failures

If the workflow itself fails:
1. Check the workflow run logs
2. Verify Node.js version compatibility
3. Ensure all dependencies install correctly
4. Check for syntax errors in workflow file

## Security Considerations

- **Secret Management**: Never commit email credentials to the repository
- **Email Content**: Notifications may contain sensitive information about vulnerabilities
- **Recipient List**: Only send to trusted team members
- **SMTP Security**: Use TLS/SSL encrypted connections
- **App Passwords**: Use app-specific passwords instead of main account passwords

## Support

For issues with this workflow:
1. Check this documentation first
2. Review workflow logs for errors
3. Test email configuration manually
4. Create an issue in the repository
5. Contact the DevOps team

## Related Documentation

- [CI/CD Setup](./CI_CD_SETUP.md)
- [Contributing Guidelines](./CONTRIBUTING.md)
- [Branch Protection](./github-branch-protection.md)
- [Security Best Practices](./SECURITY.md) (if exists)

---

**Last Updated**: 2026-02-11  
**Workflow File**: `.github/workflows/code-review-notification.yml`  
**Contact**: DevOps Team
