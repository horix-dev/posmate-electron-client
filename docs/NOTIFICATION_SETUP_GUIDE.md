# Quick Setup Guide: Email Notifications for Code Reviews

This guide will help you set up email notifications in **5 minutes**.

## Prerequisites

- Repository admin access (to configure secrets)
- An email account with SMTP access (Gmail, Outlook, or custom SMTP)

## Step 1: Prepare Email Account

### Option A: Gmail (Recommended for small teams)

1. Go to your Google Account settings
2. Enable **2-Step Verification**
3. Go to **Security** → **2-Step Verification** → **App passwords**
4. Generate an app password for "GitHub Actions"
5. **Save this password** - you'll need it in Step 2

### Option B: Office 365 / Outlook

1. Use your regular Office 365 email and password
2. Ensure SMTP is enabled (usually enabled by default)
3. No special setup needed

### Option C: Custom SMTP Server

1. Get SMTP server details from your email provider:
   - Server address (e.g., `mail.yourcompany.com`)
   - Port (usually `587` for TLS or `465` for SSL)
   - Username and password

## Step 2: Configure GitHub Secrets

1. **Navigate to repository settings**:
   - Go to your repository on GitHub
   - Click **Settings** (top navigation)
   - Click **Secrets and variables** → **Actions** (left sidebar)

2. **Add the following secrets** (click "New repository secret" for each):

   | Secret Name | Example Value | Description |
   |-------------|---------------|-------------|
   | `MAIL_SERVER` | `smtp.gmail.com` | SMTP server address |
   | `MAIL_PORT` | `587` | SMTP port (587 for TLS) |
   | `MAIL_USERNAME` | `your-email@gmail.com` | Your email address |
   | `MAIL_PASSWORD` | `xxxx xxxx xxxx xxxx` | App password or account password |
   | `MAIL_TO` | `team@company.com` | Who receives notifications (comma-separated for multiple) |
   | `MAIL_FROM` | `your-email@gmail.com` | Sender email address |

### Quick Reference for Common Providers

**Gmail**:
```
MAIL_SERVER: smtp.gmail.com
MAIL_PORT: 587
MAIL_USERNAME: your-email@gmail.com
MAIL_PASSWORD: [app password from Step 1]
MAIL_TO: alerts@yourcompany.com
MAIL_FROM: your-email@gmail.com
```

**Office 365**:
```
MAIL_SERVER: smtp.office365.com
MAIL_PORT: 587
MAIL_USERNAME: your-email@company.com
MAIL_PASSWORD: [your account password]
MAIL_TO: alerts@yourcompany.com
MAIL_FROM: your-email@company.com
```

**Outlook.com**:
```
MAIL_SERVER: smtp-mail.outlook.com
MAIL_PORT: 587
MAIL_USERNAME: your-email@outlook.com
MAIL_PASSWORD: [your account password]
MAIL_TO: alerts@yourcompany.com
MAIL_FROM: your-email@outlook.com
```

## Step 3: Test the Setup

### ⚡ Quick Test (NEW - 1 minute)

**Fastest way to test your email configuration:**

1. Go to **Actions** tab in your repository
2. Click **Automated Code Review & Notifications** workflow
3. Click **Run workflow** dropdown
4. **Check the "Send a test email notification" checkbox** ✅
5. Select the branch (main or develop)
6. Click **Run workflow**
7. Wait ~30 seconds
8. Check your email inbox (and spam folder)

**You should receive a test email immediately!**

📘 **Detailed guide**: See [`docs/EMAIL_TEST_GUIDE.md`](EMAIL_TEST_GUIDE.md) for complete testing instructions.

---

### Option A: Manual Trigger (Full Workflow Test)

1. Go to **Actions** tab in your repository
2. Click **Automated Code Review & Notifications** workflow
3. Click **Run workflow** dropdown
4. Select the branch (main or develop)
5. **Leave the checkbox unchecked** for full workflow
6. Click **Run workflow**
7. Wait for the workflow to complete (~2-3 minutes)
8. Check your email for the notification (only if critical issues found)

### Option B: Push to Trigger

1. Make a small test commit to `main` or `develop`:
   ```bash
   git checkout main
   echo "# Test" >> test-notification.md
   git add test-notification.md
   git commit -m "test: verify automated code review notifications"
   git push origin main
   ```

2. Wait for the workflow to run
3. Check your email
4. Remove the test file:
   ```bash
   git rm test-notification.md
   git commit -m "chore: remove test file"
   git push origin main
   ```

## Step 4: Verify

You should receive an email with:
- ✅ Subject line: `[main] Code Review Alert - [commit-sha]`
- ✅ Repository and commit information
- ✅ Review status (✅ passed or ❌ critical issues)
- ✅ Link to view full details

## Troubleshooting

### Not Receiving Emails?

1. **Check spam/junk folder** - First time emails might be filtered
2. **Verify secrets are correct**:
   - Go to Settings → Secrets and variables → Actions
   - Ensure all 6 secrets are configured
   - Double-check email addresses for typos
3. **Check workflow logs**:
   - Go to Actions → Latest workflow run
   - Expand the "Send Email Notification" step
   - Look for error messages
4. **Test SMTP manually**:
   - Use an email client with the same settings
   - Verify you can send/receive emails

### Gmail "Less secure app" Error

Gmail requires app passwords (not your main password):
1. Enable 2-Step Verification
2. Generate an app password
3. Use the app password in `MAIL_PASSWORD` secret

### Authentication Failed

- Double-check `MAIL_USERNAME` and `MAIL_PASSWORD`
- Ensure no extra spaces in secrets
- For Gmail, use app password (not main password)
- For Office 365, ensure SMTP is enabled

### Workflow Passes But No Email

This is normal! Emails are only sent when **critical issues** are detected:
- ESLint errors
- TypeScript errors
- High/critical vulnerabilities
- CodeQL security issues

To force an email (for testing):
- Introduce a lint error: `const x = unused_variable;`
- Or a type error: `const y: number = "string";`
- Push and wait for notification

## Customization

### Change Who Gets Notified

Update the `MAIL_TO` secret:
```
Single recipient: alerts@company.com
Multiple recipients: dev@company.com,manager@company.com,security@company.com
```

### Only Notify on Main Branch

Edit `.github/workflows/code-review-notification.yml`:
```yaml
notify:
  # Add condition
  if: always() && github.ref == 'refs/heads/main'
```

### Add Slack Instead of Email

You can replace the email notification with Slack:
1. Create a Slack webhook
2. Use `action-slack` GitHub Action
3. Replace the "Send Email" step

## Security Notes

⚠️ **Important Security Reminders**:
- Never commit passwords to the repository
- Use app-specific passwords when possible
- Only send notifications to trusted recipients
- Rotate passwords if they're compromised
- Review notification content for sensitive data

## Need Help?

- 📖 Full documentation: [AUTOMATED_CODE_REVIEW.md](./AUTOMATED_CODE_REVIEW.md)
- 🐛 Issues: Create an issue in the repository
- 💬 Questions: Contact the DevOps team

---

**Setup Time**: ~5 minutes  
**Next Steps**: Read the full documentation for advanced configuration
