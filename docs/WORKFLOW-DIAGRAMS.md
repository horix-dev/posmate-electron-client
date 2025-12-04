# Visual Team Collaboration Workflow

## Pull Request Flow Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                  DEVELOPER'S JOURNEY                            │
└────────────────────────────────────────────────────────────────┘

Step 1: Start Feature
─────────────────────
   $ git checkout -b feature/add-reports
              ↓
   Create new branch from 'develop'


Step 2: Code & Commit
─────────────────────
   Code locally...
   Test with 'npm run dev'
              ↓
   $ npm run lint          ✅ Code style OK
   $ npm run type-check    ✅ No TypeScript errors
   $ npm run test          ✅ All tests pass
   $ npm run build         ✅ Build succeeds
              ↓
   $ git add .
   $ git commit -m "feat(reports): add sales dashboard"
              ↓
   Make more commits...


Step 3: Push to GitHub
──────────────────────
   $ git push origin feature/add-reports
              ↓
   ✅ Branch uploaded to GitHub


Step 4: Create PR
─────────────────
   On GitHub, click "Create Pull Request"
              ↓
   PR Template appears:
   - Description (required)
   - Testing steps (required)
   - Screenshots (if UI change)
   - Checklist (optional)
              ↓
   Fill template → Click "Create Pull Request"


Step 5: Automated Checks (GitHub Actions)
──────────────────────────────────────────
   GitHub runs automatically:
   
   ┌─────────────────────────┐
   │ ESLint (Code Style)     │ → ✅ Pass / ❌ Fail
   ├─────────────────────────┤
   │ TypeScript (Type Check) │ → ✅ Pass / ❌ Fail
   ├─────────────────────────┤
   │ Unit Tests              │ → ✅ Pass / ❌ Fail
   ├─────────────────────────┤
   │ Build                   │ → ✅ Pass / ❌ Fail
   └─────────────────────────┘
           ↓
   If ANY fails → Can't merge (fix and re-push)
   If ALL pass → Move to code review


Step 6: Code Review
───────────────────
   Reviewers assigned automatically (via CODEOWNERS)
   
   $ Project Lead (itsmahran)
   └─ Reviews code
      ├─ Checks logic
      ├─ Verifies tests
      ├─ Looks for bugs
      └─ Either:
         ├─ Approves ✅
         └─ Requests Changes ❌
         
   $ Other Reviewer (colleague)
   └─ Also reviews
      └─ Approves ✅


Step 7: Feedback Loop (if changes requested)
─────────────────────────────────────────────
   If reviewer requested changes:
   
   Developer sees comment:
   "Line 45: Need to handle error case"
              ↓
   Developer fixes locally:
   $ git add .
   $ git commit -m "fix: add error handling"
   $ git push origin feature/add-reports
              ↓
   GitHub Actions runs again (auto)
              ↓
   Reviewer checks again
              ↓
   Approve ✅


Step 8: Merge Criteria Met ✅
────────────────────────────
   Before merge is allowed:
   
   ☑ 1-2 approvals received
   ☑ All GitHub Actions checks pass
   ☑ No conflicts with develop
   ☑ All conversations resolved
   ☑ Branch is up to date
   
   All conditions met → Merge button enabled


Step 9: Merge PR
────────────────
   Project Lead clicks "Merge Pull Request"
              ↓
   Changes merged into 'develop' branch
              ↓
   Branch deleted automatically
              ↓
   ✅ Feature now in develop!


Step 10: Celebrate 🎉
──────────────────────
   Feature deployed to develop environment
   Ready for next iteration or release


┌────────────────────────────────────────────────────────────────┐
│                    TOTAL TIME: 1-3 days                        │
│     (Depending on feedback and complexity)                     │
└────────────────────────────────────────────────────────────────┘
```

---

## Control Points Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      QUALITY GATES                               │
├──────────────────────────────────────────────────────────────────┤

GATE 1: Local Development
├─ ESLint (code style)
├─ TypeScript (type safety)
├─ Tests (functionality)
└─ Manual testing

GATE 2: GitHub Actions (CI/CD)
├─ ESLint check → ❌ Fail = No Merge
├─ TypeScript → ❌ Fail = No Merge
├─ Tests → ❌ Fail = No Merge
└─ Build → ❌ Fail = No Merge

GATE 3: Code Review
├─ Logic verification
├─ Test coverage check
├─ Standards compliance
└─ ❌ Request Changes = No Merge

GATE 4: Approval Count
├─ Main branch: 2 approvals required
├─ Develop branch: 1-2 approvals required
└─ ❌ Insufficient = No Merge

GATE 5: Branch Status
├─ No conflicts allowed
├─ Must be up-to-date
├─ Conversations must resolve
└─ ❌ Conflicts = No Merge

         ↓ ALL GATES PASS ↓
         
    ✅ MERGE ALLOWED ✅

└──────────────────────────────────────────────────────────────────┘
```

---

## Access Control Hierarchy

```
┌─────────────────────────────────────────────┐
│          REPOSITORY PERMISSIONS             │
├─────────────────────────────────────────────┤

OWNER (itsmahran)
├─ Can merge PRs without restrictions
├─ Can bypass branch protection (not recommended)
├─ Can manage team members
└─ Can change repository settings
   
   ↓↓↓

MAINTAIN (Senior Developers)
├─ Can merge PRs
├─ Can push directly (but shouldn't)
└─ Cannot bypass branch protection
   
   ↓↓↓

PUSH (Regular Developers)
├─ Can push feature branches
├─ Cannot push to protected branches
├─ Cannot merge PRs
└─ Must go through PR review
   
   ↓↓↓

READ (Viewers)
├─ Can see code
├─ Cannot make changes
└─ Cannot create PRs

└─────────────────────────────────────────────┘
```

---

## File-Specific Review Routing

```
CODE OWNERS SYSTEM:
───────────────────

When colleague changes files in:

/src/pages/products/
   └─ @itsmahran ← Auto-assigned to review
   └─ @colleague1 ← Auto-assigned to review
   
   GitHub: "Waiting for @itsmahran to review"

/src/api/
   └─ @itsmahran ← Auto-assigned to review
   
/src/pages/pos/
   └─ @colleague2 ← Auto-assigned to review

* (everything else)
   └─ @itsmahran ← Default fallback

Result: Right people review right code! 🎯
```

---

## Status Check Failure Scenarios

```
SCENARIO 1: ESLint Fails ❌
─────────────────────────
Developer's PR
   ↓
GitHub Actions runs
   ↓
ESLint finds issues
   ↓
❌ Status Check: FAILED
   ↓
PR shows RED X
   ↓
Message: "Some checks were unsuccessful"
   ↓
Developer can't merge
   ↓
Developer fixes:
$ npm run lint --fix
$ git add .
$ git commit -m "style: fix linting"
$ git push
   ↓
GitHub Actions runs again (auto)
   ↓
ESLint passes
   ↓
✅ Status Check: PASSED
   ↓
Can now proceed to review


SCENARIO 2: Tests Fail ❌
────────────────────────
Developer's PR
   ↓
GitHub Actions runs
   ↓
Tests fail (not enough coverage)
   ↓
❌ Status Check: FAILED
   ↓
Developer must write tests:
$ npm run test  // See which tests fail
// Write tests to cover the code
$ npm run test  // Verify tests pass
$ git add .
$ git commit -m "test: add test coverage"
$ git push
   ↓
GitHub Actions runs again (auto)
   ↓
Tests pass
   ↓
✅ Status Check: PASSED


SCENARIO 3: Type Error ❌
────────────────────────
Developer's PR
   ↓
GitHub Actions runs
   ↓
TypeScript finds type mismatch
   ↓
❌ Status Check: FAILED
   ↓
Developer sees error:
"Type 'any' is not assignable to 'Product'"
   ↓
Developer fixes:
// Add proper type annotations
// Remove 'any' types
$ npm run type-check  // Verify
$ git add .
$ git commit -m "fix: resolve type errors"
$ git push
   ↓
✅ Status Check: PASSED


SCENARIO 4: Review Requested Changes ❌
──────────────────────────────────────
PR Ready to Review
   ↓
Reviewer reads code
   ↓
Reviewer clicks "Request Changes"
   ↓
Adds comment:
"Line 45: Need to validate user input"
   ↓
PR status: "Changes requested"
   ↓
Developer sees notification
   ↓
Developer fixes:
// Add input validation
$ git add .
$ git commit -m "fix: add input validation"
$ git push
   ↓
Reviewer is notified again
   ↓
Reviewer checks fix
   ↓
Reviewer clicks "Approve"
   ↓
PR status: "Changes approved"

```

---

## Timeline Example

```
Monday 9:00 AM
├─ Developer creates feature branch
├─ Writes code and commits
└─ Pushes to GitHub 3:00 PM

Monday 3:00 PM
├─ PR created with template filled
├─ GitHub Actions runs automatically
├─ Takes 5 minutes
├─ All checks pass ✅
└─ Shows "Ready for review"

Monday 3:30 PM
├─ You (project lead) review
├─ See good code
├─ Click "Approve"
└─ Waiting for 2nd reviewer

Tuesday 10:00 AM
├─ 2nd reviewer (colleague1) checks PR
├─ All looks good
└─ Clicks "Approve"

Tuesday 10:05 AM
├─ Both approvals complete ✅
├─ All checks pass ✅
├─ No conversations pending ✅
├─ You click "Merge Pull Request"
├─ Branch automatically deleted
└─ Changes now in develop ✅

Tuesday 10:10 AM
├─ Feature deployed to staging
└─ Ready for next steps 🎉

TOTAL TIME: ~25 hours
(Most of which is waiting for humans to review)
```

---

## What Gets Blocked At Each Stage

```
STAGE 1: Commit → Push
─────────────────────
Git Hooks check:
├─ ESLint → ❌ Fail = Commit rejected
└─ Tests (optional) → ❌ Fail = Push rejected

Developer must fix locally


STAGE 2: PR Creation
────────────────────
GitHub checks:
├─ Branch exists ✅
├─ PR template available ✅
└─ Can create PR ✅

(No blocking here, just structure)


STAGE 3: PR Submitted
──────────────────────
GitHub Actions automatically:
├─ ESLint → ❌ Blocks merge
├─ TypeScript → ❌ Blocks merge
├─ Tests → ❌ Blocks merge
└─ Build → ❌ Blocks merge

Status shows: ❌ Some checks were unsuccessful
Developer sees: "All required status checks have passed"


STAGE 4: Code Review
────────────────────
Humans review:
├─ Logic errors → ❌ Request changes = Blocks merge
├─ Missing tests → ❌ Request changes = Blocks merge
├─ Security issues → ❌ Request changes = Blocks merge
├─ Bad practice → ❌ Request changes = Blocks merge
└─ Looks good → ✅ Approve

GitHub requires: 1-2 approvals (depending on branch)
Status shows: "Waiting for review from @itsmahran"


STAGE 5: Merge Requirements
───────────────────────────
System checks:
├─ Approvals count → ❌ Too few = Can't merge
├─ Status checks → ❌ Failed = Can't merge
├─ Merge conflicts → ❌ Has conflicts = Can't merge
├─ Branch updated → ❌ Out of date = Can't merge
└─ Conversations → ❌ Unresolved = Can't merge

Only when ALL are ✅:
└─ Merge button becomes enabled


RESULT: Bad code literally cannot reach production 🔒
```

---

## Decision Tree: Can This PR Merge?

```
START
  │
  ├─ All automated checks pass?
  │  ├─ NO  → ❌ CANNOT MERGE
  │  │       Reason: Failed status checks
  │  │       Solution: Fix issues and push
  │  │
  │  └─ YES → ↓
  │
  ├─ Required approvals received?
  │  ├─ NO  → ❌ CANNOT MERGE
  │  │       Reason: Waiting for reviews
  │  │       Solution: Ask reviewers for feedback
  │  │
  │  └─ YES → ↓
  │
  ├─ Branch up to date?
  │  ├─ NO  → ❌ CANNOT MERGE
  │  │       Reason: Has conflicts with develop
  │  │       Solution: Rebase on develop
  │  │
  │  └─ YES → ↓
  │
  ├─ All conversations resolved?
  │  ├─ NO  → ❌ CANNOT MERGE
  │  │       Reason: Unresolved comments
  │  │       Solution: Address comments and resolve
  │  │
  │  └─ YES → ↓
  │
  ├─ Code owner reviewed?
  │  ├─ NO  → ❌ CANNOT MERGE
  │  │       Reason: Code owners haven't approved
  │  │       Solution: Wait for their review
  │  │
  │  └─ YES → ↓
  │
  └─ ✅ MERGE ALLOWED!
     Click "Merge Pull Request"
```

---

**Visual Guide Created:** December 4, 2025  
**Format:** ASCII Diagrams & Text  
**Audience:** Everyone on the team
