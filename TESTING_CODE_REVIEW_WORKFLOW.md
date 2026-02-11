# Testing the Automated Code Review System

This document provides test scenarios to verify the automated code review and notification system is working correctly.

## Prerequisites

Before testing, ensure:
- [ ] GitHub Secrets are configured (MAIL_SERVER, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_TO, MAIL_FROM)
- [ ] You have write access to the repository
- [ ] You can push to `main` or `develop` branches

## Test Scenarios

### Test 1: Workflow Triggers Successfully

**Objective**: Verify the workflow runs when code is pushed to main or develop.

**Steps**:
1. Create a test branch from main:
   ```bash
   git checkout main
   git pull
   git checkout -b test/workflow-trigger
   ```

2. Make a simple change:
   ```bash
   echo "# Test" > test-trigger.md
   git add test-trigger.md
   git commit -m "test: verify workflow triggers"
   ```

3. Push to main (or develop):
   ```bash
   git push origin test/workflow-trigger:main
   # or
   git push origin test/workflow-trigger:develop
   ```

4. Go to GitHub Actions tab
5. Verify "Automated Code Review & Notifications" workflow appears
6. Wait for workflow to complete

**Expected Results**:
- ✅ Workflow appears in Actions tab
- ✅ All 5 jobs run (codeql-analysis, code-quality, dependency-security, notify, create-issue)
- ✅ Workflow completes successfully (green checkmark)
- ✅ No email notification (no critical issues)

**Cleanup**:
```bash
git checkout main
git revert HEAD
git push origin main
```

---

### Test 2: Email Notification for Lint Errors

**Objective**: Verify email notifications are sent when ESLint errors are detected.

**Steps**:
1. Create a test branch:
   ```bash
   git checkout main
   git pull
   git checkout -b test/lint-error
   ```

2. Create a file with a lint error:
   ```bash
   cat > src/test-lint-error.ts << 'EOF'
   // This will trigger ESLint errors
   const unusedVariable = 42;
   export const testFunc = () => {
     console.log("test")
     return undefined
   };
   EOF
   git add src/test-lint-error.ts
   git commit -m "test: introduce lint error for notification test"
   ```

3. Push to develop:
   ```bash
   git push origin test/lint-error:develop
   ```

4. Wait for workflow to complete (~3-5 minutes)

**Expected Results**:
- ✅ Workflow runs
- ✅ Code quality job shows failure/errors
- ✅ Email notification is sent to configured recipient(s)
- ✅ Email contains:
  - Subject with branch name and commit SHA
  - Commit details (author, message)
  - Summary showing code quality failure
  - Link to workflow run

**Verify Email**:
- Check inbox of email configured in `MAIL_TO` secret
- Look in spam/junk folder if not in inbox
- Verify email formatting is correct

**Cleanup**:
```bash
git checkout develop
git revert HEAD
git push origin develop
rm src/test-lint-error.ts
```

---

### Test 3: TypeScript Type Error Notification

**Objective**: Verify notifications for TypeScript type errors.

**Steps**:
1. Create a test branch:
   ```bash
   git checkout main
   git pull
   git checkout -b test/type-error
   ```

2. Create a file with type errors:
   ```bash
   cat > src/test-type-error.ts << 'EOF'
   // This will trigger TypeScript errors
   const numberValue: number = "this is a string";
   const stringValue: string = 123;

   export const testTypeError = (param: string): number => {
     return param; // Type error: string not assignable to number
   };
   EOF
   git add src/test-type-error.ts
   git commit -m "test: introduce type error for notification test"
   ```

3. Push to develop:
   ```bash
   git push origin test/type-error:develop
   ```

**Expected Results**:
- ✅ Workflow detects TypeScript errors
- ✅ Email notification sent
- ✅ Email shows type check failure
- ✅ Workflow artifacts contain typecheck-output.txt

**Cleanup**:
```bash
git checkout develop
git revert HEAD
git push origin develop
rm src/test-type-error.ts
```

---

### Test 4: Dependency Vulnerability Detection

**Objective**: Verify npm audit detects vulnerabilities.

**Steps**:
1. Check current vulnerabilities:
   ```bash
   npm audit
   ```

2. If there are high/critical vulnerabilities, push any change:
   ```bash
   git checkout main
   git pull
   git checkout -b test/vuln-check
   echo "# Test" > test-vuln.md
   git add test-vuln.md
   git commit -m "test: check vulnerability detection"
   git push origin test/vuln-check:main
   ```

**Expected Results**:
- ✅ If vulnerabilities exist, email notification is sent
- ✅ Email shows dependency security failure
- ✅ Workflow artifacts contain audit-results.json

**Note**: If no vulnerabilities exist, you can't easily test this without intentionally downgrading packages (not recommended).

**Cleanup**:
```bash
git checkout main
git revert HEAD
git push origin main
rm test-vuln.md
```

---

### Test 5: CodeQL Security Scanning

**Objective**: Verify CodeQL detects security issues.

**Steps**:
1. Create a test branch:
   ```bash
   git checkout main
   git pull
   git checkout -b test/security-issue
   ```

2. Create a file with potential security issue:
   ```bash
   cat > src/test-security.ts << 'EOF'
   // Potential SQL injection (will be detected by CodeQL)
   export const unsafeQuery = (userId: string) => {
     const query = "SELECT * FROM users WHERE id = " + userId;
     return query;
   };

   // Potential XSS (will be detected by CodeQL)
   export const unsafeHTML = (userInput: string) => {
     document.body.innerHTML = userInput;
   };
   EOF
   git add src/test-security.ts
   git commit -m "test: introduce security issues for CodeQL test"
   ```

3. Push to develop:
   ```bash
   git push origin test/security-issue:develop
   ```

4. Wait for workflow to complete
5. Check GitHub Security tab → Code scanning alerts

**Expected Results**:
- ✅ Workflow runs CodeQL analysis
- ✅ Alerts appear in Security tab (may take additional time)
- ✅ Email notification sent if CodeQL detects critical issues

**Note**: CodeQL results may take longer to appear than other checks.

**Cleanup**:
```bash
git checkout develop
git revert HEAD
git push origin develop
rm src/test-security.ts
```

---

### Test 6: Automated Issue Creation (Main Branch Only)

**Objective**: Verify issues are created for critical problems on main branch.

**Steps**:
1. Push a change with errors to main (not develop):
   ```bash
   git checkout main
   git pull
   git checkout -b test/issue-creation
   echo "const x = undefined_var;" > src/test-issue.ts
   git add src/test-issue.ts
   git commit -m "test: trigger issue creation"
   git push origin test/issue-creation:main
   ```

2. Wait for workflow to complete
3. Go to Issues tab in GitHub

**Expected Results**:
- ✅ Workflow detects critical issue
- ✅ GitHub issue is automatically created
- ✅ Issue has labels: bug, critical, automated
- ✅ Issue contains commit details and link to workflow

**Cleanup**:
```bash
git checkout main
git revert HEAD
git push origin main
rm src/test-issue.ts
# Close the created issue in GitHub UI
```

---

### Test 7: Manual Workflow Trigger

**Objective**: Verify workflow can be triggered manually.

**Steps**:
1. Go to GitHub Actions tab
2. Click "Automated Code Review & Notifications"
3. Click "Run workflow" dropdown
4. Select branch (main or develop)
5. Click "Run workflow" button
6. Wait for workflow to complete

**Expected Results**:
- ✅ Workflow runs successfully
- ✅ All jobs complete
- ✅ Email may or may not be sent (depends on current code state)

---

### Test 8: Workflow Artifacts

**Objective**: Verify workflow generates downloadable artifacts.

**Steps**:
1. Trigger any workflow run (using Test 1 or Test 7)
2. Go to the workflow run details page
3. Scroll to "Artifacts" section at the bottom

**Expected Results**:
- ✅ Artifact "code-quality-results" is available (if code quality ran)
- ✅ Artifact "dependency-audit-results" is available (if audit ran)
- ✅ Artifacts can be downloaded
- ✅ Artifacts contain detailed reports (txt files)

---

### Test 9: Email Format and Content

**Objective**: Verify email is formatted correctly.

**Steps**:
1. Use any test that triggers an email (Test 2 or Test 3)
2. Check received email

**Expected Results**:
- ✅ Email has proper subject line with branch and commit
- ✅ Email body is HTML formatted (not plain text garbage)
- ✅ Email contains:
  - Repository name
  - Branch name
  - Commit SHA (short)
  - Author name
  - Commit message
  - Review status with checkmarks/X marks
  - "View Details" button linking to workflow
- ✅ Email footer says "automated notification from GitHub Actions"

---

### Test 10: No False Alarms

**Objective**: Verify no emails are sent for successful checks.

**Steps**:
1. Make a clean commit with no errors:
   ```bash
   git checkout main
   git pull
   git checkout -b test/clean-code
   echo "# Clean Change" >> README.md
   git add README.md
   git commit -m "docs: update readme"
   git push origin test/clean-code:develop
   ```

2. Wait for workflow to complete

**Expected Results**:
- ✅ Workflow runs successfully
- ✅ All jobs pass (green checkmarks)
- ✅ NO email is sent
- ✅ Workflow summary shows "All checks passed!"

**Cleanup**:
```bash
git checkout develop
git revert HEAD
git push origin develop
```

---

## Troubleshooting Test Failures

### Workflow Doesn't Trigger
- Verify you pushed to `main` or `develop` branch (not feature branch)
- Check workflow file exists: `.github/workflows/code-review-notification.yml`
- Verify workflow is enabled in Actions tab

### No Email Received
- Check spam/junk folder
- Verify all GitHub Secrets are configured correctly
- Check workflow logs for email sending errors
- Verify SMTP credentials are valid
- Test SMTP manually with an email client

### CodeQL Not Running
- CodeQL may be slow to initialize (wait 5-10 minutes)
- Check workflow logs for CodeQL-specific errors
- Verify languages are correct (javascript, typescript)

### Issues Not Created
- Verify the push was to `main` branch (not develop)
- Check workflow had critical failures
- Verify repository permissions allow issue creation

### Workflow Fails Entirely
- Check YAML syntax: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/code-review-notification.yml'))"`
- Review workflow logs for specific error messages
- Ensure Node.js version is compatible (20)

---

## Quick Test Checklist

Use this checklist for a complete test:

- [ ] Test 1: Basic workflow trigger (no errors)
- [ ] Test 2: Lint error notification
- [ ] Test 7: Manual workflow trigger
- [ ] Test 8: Verify artifacts are generated
- [ ] Test 9: Check email format
- [ ] Test 10: Verify no false alarms

For comprehensive testing, run all 10 tests.

---

## After Testing

Once testing is complete:

1. **Clean up test files**: Remove any test files created
2. **Close test issues**: Close any auto-created issues
3. **Review logs**: Check workflow runs for any warnings
4. **Adjust settings**: Fine-tune notification thresholds if needed
5. **Document results**: Note any issues or improvements needed

---

## Continuous Monitoring

After initial testing:
- Monitor email notifications over the next week
- Check for false positives or false negatives
- Review CodeQL alerts in Security tab
- Adjust notification settings as needed
- Update documentation based on learnings

---

**Test Duration**: ~30-45 minutes for full test suite  
**Recommended**: Run Tests 1, 2, 7, 9, 10 for quick validation  
**Next Steps**: Once tested, communicate to team and monitor ongoing
