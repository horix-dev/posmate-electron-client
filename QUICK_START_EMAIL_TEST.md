# 🚀 Quick Start: Test Your Email Notification

## 1-Minute Test

Test your email notification configuration instantly!

### Steps

1. **Go to GitHub Actions**
   - Navigate to your repository
   - Click the "Actions" tab

2. **Select the Workflow**
   - Click "Automated Code Review & Notifications"

3. **Run with Test Mode**
   - Click "Run workflow" dropdown
   - ✅ **Check "Send a test email notification"**
   - Select branch (e.g., main)
   - Click "Run workflow"

4. **Check Email**
   - Wait ~30 seconds
   - Check your email inbox
   - Don't forget spam/junk folder!

### Expected Result

You should receive an email with:
- Subject: `[TEST] Email Notification Test - {branch}`
- Green success message
- Repository and commit details
- Link to workflow run

### Troubleshooting

**No email?**
- Check spam/junk folder first
- Verify GitHub Secrets are configured:
  - `MAIL_SERVER`, `MAIL_PORT`
  - `MAIL_USERNAME`, `MAIL_PASSWORD`
  - `MAIL_TO`, `MAIL_FROM`
- Check workflow logs for errors

**Need help?**
- See detailed guide: [`docs/EMAIL_TEST_GUIDE.md`](docs/EMAIL_TEST_GUIDE.md)
- Email setup: [`docs/NOTIFICATION_SETUP_GUIDE.md`](docs/NOTIFICATION_SETUP_GUIDE.md)

---

**That's it!** 🎉

Once you receive the test email, your notification system is working correctly.
