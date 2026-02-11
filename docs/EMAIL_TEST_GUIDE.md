# Email Notification Testing Guide

## Quick Test (1 minute)

Test if your email notification configuration is working correctly.

### Prerequisites

Ensure the following GitHub Secrets are configured in your repository:

1. Go to **Repository → Settings → Secrets and variables → Actions**
2. Verify these secrets exist:
   - `MAIL_SERVER` (e.g., `smtp.gmail.com`)
   - `MAIL_PORT` (e.g., `587`)
   - `MAIL_USERNAME` (your email address)
   - `MAIL_PASSWORD` (app password or email password)
   - `MAIL_TO` (recipient email address)
   - `MAIL_FROM` (sender email address)

### Testing Steps

#### Option 1: Using GitHub Web Interface (Easiest)

1. **Go to the Actions tab** in your repository
   - URL: `https://github.com/horix-dev/posmate-electron-client/actions`

2. **Select the workflow**
   - Click on "Automated Code Review & Notifications" in the left sidebar

3. **Trigger the test**
   - Click the "Run workflow" dropdown button (top right)
   - Select the branch you want to test from (e.g., `main` or `develop`)
   - **Check the "Send a test email notification" checkbox** ✅
   - Click the green "Run workflow" button

4. **Wait for completion**
   - The workflow should complete in ~30 seconds
   - Watch the progress in the Actions tab

5. **Check your email**
   - Check the inbox of the email address configured in `MAIL_TO`
   - Don't forget to check your **spam/junk folder**
   - You should receive a test email with subject: `[TEST] Email Notification Test - {branch}`

#### Option 2: Using GitHub CLI

```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

# Authenticate
gh auth login

# Navigate to your repository
cd /path/to/posmate-electron-client

# Trigger the test email workflow
gh workflow run code-review-notification.yml \
  --ref main \
  --field send_test_email=true

# Check the workflow run status
gh run list --workflow=code-review-notification.yml --limit 1

# View the workflow logs (optional)
gh run view --log
```

### Expected Email Content

You should receive an HTML email containing:

#### Subject
```
[TEST] Email Notification Test - {branch}
```

#### Body
- **Repository name**: horix-dev/posmate-electron-client
- **Branch name**: The branch you selected
- **Commit SHA**: The latest commit on that branch
- **Triggered by**: Your GitHub username
- **Timestamp**: When the test was run
- **Status**: ✅ Success message
- **Link**: "View Workflow Run" button linking to the workflow run

#### Visual Design
- Clean HTML formatting
- Blue header with GitHub-style colors
- Table with repository details
- Green success box
- Call-to-action button
- Footer with helpful information

### Troubleshooting

#### ❌ No email received

1. **Check spam/junk folder**
   - Email servers may flag automated emails as spam

2. **Verify secrets are configured correctly**
   - Go to Settings → Secrets and variables → Actions
   - Make sure all 6 secrets exist and have correct values

3. **Check workflow logs**
   - Go to Actions tab → Select the workflow run
   - Click on "Send Test Email" job
   - Look for error messages in the logs

4. **Common issues:**
   - **SMTP authentication failure**: Wrong username/password
   - **Connection timeout**: Wrong server address or port
   - **Blocked by firewall**: Some SMTP servers block GitHub Actions IPs
   - **App password required**: Some email providers require app-specific passwords

#### ❌ Workflow fails

1. **YAML syntax error**
   ```bash
   # Test YAML syntax locally
   python3 -c "import yaml; yaml.safe_load(open('.github/workflows/code-review-notification.yml'))"
   ```

2. **Permissions issue**
   - Verify you have write access to the repository
   - Check Actions are enabled in repository settings

3. **Secrets not configured**
   - The workflow will fail if required secrets are missing
   - Check the workflow logs for "secret not found" errors

### Email Provider Setup Examples

#### Gmail

1. Enable 2-factor authentication
2. Generate an [App Password](https://myaccount.google.com/apppasswords)
3. Configure secrets:
   - `MAIL_SERVER`: `smtp.gmail.com`
   - `MAIL_PORT`: `587`
   - `MAIL_USERNAME`: `your-email@gmail.com`
   - `MAIL_PASSWORD`: `your-app-password` (16 characters, no spaces)
   - `MAIL_FROM`: `your-email@gmail.com`
   - `MAIL_TO`: `recipient@example.com`

#### Outlook/Hotmail

1. Configure secrets:
   - `MAIL_SERVER`: `smtp-mail.outlook.com`
   - `MAIL_PORT`: `587`
   - `MAIL_USERNAME`: `your-email@outlook.com`
   - `MAIL_PASSWORD`: `your-password`
   - `MAIL_FROM`: `your-email@outlook.com`
   - `MAIL_TO`: `recipient@example.com`

#### Custom SMTP Server

1. Get SMTP credentials from your email administrator
2. Configure secrets:
   - `MAIL_SERVER`: Your SMTP server address
   - `MAIL_PORT`: Usually `587` (TLS) or `465` (SSL)
   - `MAIL_USERNAME`: Your SMTP username
   - `MAIL_PASSWORD`: Your SMTP password
   - `MAIL_FROM`: Sender email address
   - `MAIL_TO`: Recipient email address

### Understanding the Test vs. Real Notifications

#### Test Email (Manual Trigger)
- ✅ Sent immediately when you manually trigger with the checkbox
- ✅ Always sends, regardless of code quality
- ✅ Short execution time (~30 seconds)
- ✅ Skips code analysis jobs
- ✅ Subject prefix: `[TEST]`
- ✅ Green success message
- ✅ Used to verify email configuration

#### Real Notification (Automatic)
- 🔔 Sent automatically when critical issues are detected
- 🔔 Only sent if ESLint errors, TypeScript errors, or vulnerabilities found
- 🔔 Full execution time (~3-5 minutes)
- 🔔 Runs all code analysis jobs
- 🔔 Subject prefix: `[CRITICAL]`
- 🔔 Red/yellow warning indicators
- 🔔 Contains detailed issue information

### Best Practices

1. **Test before relying on notifications**
   - Run this test after initial setup
   - Test again if you change email configuration

2. **Document your email configuration**
   - Keep a secure record of which email accounts are used
   - Document any special configuration requirements

3. **Monitor spam folder initially**
   - First few emails might go to spam
   - Mark as "Not Spam" to train email filters

4. **Use a dedicated monitoring email**
   - Consider using a team email or monitoring inbox
   - Avoid personal emails for production notifications

5. **Test periodically**
   - Run a test every few months to ensure configuration is still valid
   - Email passwords and app passwords can expire

### Next Steps

After successful testing:

1. ✅ **Verify email received** - Check formatting and content
2. ✅ **Test with a real issue** - Follow `TESTING_CODE_REVIEW_WORKFLOW.md` Test 2 or 3
3. ✅ **Adjust notification settings** - Customize the workflow if needed
4. ✅ **Communicate to team** - Let team members know the system is active
5. ✅ **Monitor for a week** - Watch for false positives or issues

### Related Documentation

- **Full Setup Guide**: `docs/NOTIFICATION_SETUP_GUIDE.md`
- **Comprehensive Testing**: `TESTING_CODE_REVIEW_WORKFLOW.md`
- **Workflow Details**: `docs/AUTOMATED_CODE_REVIEW.md`
- **Visual Diagrams**: `WORKFLOW_DIAGRAM.md`

### Support

If you continue to have issues:

1. Check workflow logs in the Actions tab
2. Review error messages carefully
3. Verify each secret value individually
4. Try a different email provider
5. Create an issue in the repository with:
   - Workflow run URL
   - Error messages from logs
   - Email provider you're using
   - Any other relevant details

---

**Test Duration**: ~1 minute  
**Recommended**: Test immediately after configuring email secrets  
**Frequency**: Test after any email configuration changes
