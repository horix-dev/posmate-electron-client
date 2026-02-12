# Automated Code Review System - Flow Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                  AUTOMATED CODE REVIEW SYSTEM                       │
│                                                                       │
│  Monitors commits to main/develop branches                          │
│  Detects security issues, code quality problems, vulnerabilities    │
│  Sends email notifications for critical findings                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Workflow Trigger

```
Developer Push          GitHub Repository
─────────────┐          ┌─────────────────
             │          │
             ▼          ▼
      ┌──────────────────────┐
      │   Code Push Event    │
      │   • main branch      │
      │   • develop branch   │
      └──────────┬───────────┘
                 │
                 ▼
      ┌──────────────────────┐
      │  Workflow Triggers   │
      │  (Non-blocking)      │
      └──────────┬───────────┘
                 │
                 └──────► 5 Parallel Jobs
```

## Jobs Execution Flow

```
┌───────────────────────────────────────────────────────────────────────┐
│                           JOB EXECUTION                               │
└───────────────────────────────────────────────────────────────────────┘

Job 1                  Job 2                Job 3
CodeQL Analysis        Code Quality         Dependency Security
─────────────          ──────────           ──────────────────
     │                      │                     │
     ▼                      ▼                     ▼
┌─────────────┐      ┌──────────────┐     ┌──────────────────┐
│  Initialize │      │ Setup Node.js│     │  Setup Node.js   │
│  CodeQL     │      │ Install deps │     │  Install deps    │
└─────┬───────┘      └──────┬───────┘     └────────┬─────────┘
      │                     │                       │
      ▼                     ▼                       ▼
┌─────────────┐      ┌──────────────┐     ┌──────────────────┐
│  Autobuild  │      │ Run ESLint   │     │  Run npm audit   │
│  TypeScript │      │ (capture     │     │  (high/critical) │
└─────┬───────┘      │  errors)     │     └────────┬─────────┘
      │              └──────┬───────┘              │
      ▼                     │                       ▼
┌─────────────┐            ▼                ┌──────────────────┐
│  Security   │      ┌──────────────┐      │ Check for High/  │
│  Analysis   │      │ Run TypeCheck│      │ Critical Vulns   │
└─────┬───────┘      └──────┬───────┘      └────────┬─────────┘
      │                     │                       │
      ▼                     ▼                       ▼
┌─────────────┐      ┌──────────────┐     ┌──────────────────┐
│  Results to │      │ Upload       │     │  Upload Audit    │
│  Security   │      │ Artifacts    │     │  Results         │
│  Tab        │      └──────────────┘     └──────────────────┘
└─────────────┘

      │                     │                       │
      └─────────────────────┼───────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │   Job 4: Notify  │
                  │   (needs: all)   │
                  └──────────────────┘
```

## Notification Decision Flow

```
┌────────────────────────────────────────────────────────────┐
│                    NOTIFICATION LOGIC                      │
└────────────────────────────────────────────────────────────┘

              ┌─────────────────────┐
              │  Gather Job Results │
              └──────────┬──────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Check Each Job:     │
              │  • CodeQL Analysis   │
              │  • Code Quality      │
              │  • Dependency Scan   │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Any Job Failed?      │
              └──────────┬───────────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
          YES                         NO
           │                           │
           ▼                           ▼
┌─────────────────────┐    ┌────────────────────┐
│ CRITICAL = TRUE     │    │ CRITICAL = FALSE   │
│                     │    │                    │
│ Prepare HTML Email: │    │ Log: All Passed    │
│ • Commit details    │    │ No email sent      │
│ • Author info       │    └────────────────────┘
│ • Issues found      │
│ • Link to run       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Send Email via SMTP │
│ (high priority)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Update Step Summary │
│ (GitHub UI)         │
└─────────────────────┘
```

## Issue Creation Flow (Main Branch Only)

```
┌────────────────────────────────────────────────────────┐
│              JOB 5: CREATE ISSUE                       │
│              (Only if jobs failed)                     │
│              (Only on main branch)                     │
└────────────────────────────────────────────────────────┘

        ┌──────────────────┐
        │  Job Condition:  │
        │  • failure()     │
        │  • main branch   │
        └────────┬─────────┘
                 │
        ┌────────▼─────────┐
        │   Jobs Failed?   │
        └────────┬─────────┘
                 │
          ┌──────┴──────┐
         YES           NO
          │              │
          ▼              ▼
┌────────────────┐  ┌───────────┐
│ Create GitHub  │  │   Skip    │
│ Issue:         │  └───────────┘
│ • Title with   │
│   commit SHA   │
│ • Body with    │
│   details      │
│ • Labels:      │
│   bug,         │
│   critical,    │
│   automated    │
└────────────────┘
```

## Complete Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         DEVELOPER ACTION                             │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ git push origin main/develop
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         GITHUB REPOSITORY                            │
│  Push event detected → Workflow triggers                             │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      PARALLEL JOB EXECUTION                          │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐         │
│  │   CodeQL     │  │    Code      │  │   Dependency     │         │
│  │   Security   │  │   Quality    │  │    Security      │         │
│  │   Scanning   │  │   Analysis   │  │    Checking      │         │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘         │
│         │                 │                    │                   │
│         └─────────────────┼────────────────────┘                   │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
                            │ All jobs complete
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        NOTIFY JOB RUNS                               │
│                                                                      │
│  1. Download all artifacts                                          │
│  2. Analyze job results                                             │
│  3. Prepare notification content                                    │
│  4. Decide: Send email or not?                                      │
└──────────────────────────────────────────────────────────────────────┘
                            │
                            │
              ┌─────────────┴─────────────┐
              │                           │
         Critical                     All Passed
         Issues                           │
              │                           │
              ▼                           ▼
┌─────────────────────────┐   ┌──────────────────────┐
│  SEND EMAIL             │   │  NO EMAIL            │
│  ────────────           │   │  ─────────           │
│  To: Team/Managers      │   │  Log: Success        │
│  Subject: [CRITICAL]    │   │  Update summary      │
│  Content:               │   └──────────────────────┘
│  • Commit details       │
│  • Issues found         │
│  • Link to workflow     │
└─────────┬───────────────┘
          │
          └──► Team receives notification
               Team investigates
               Team fixes issues
               Push fix → Workflow runs again
```

## Email Notification Example

```
┌─────────────────────────────────────────────────────────────┐
│  Subject: [CRITICAL] Code Review Alert - develop - abc1234 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Automated Code Review Results                              │
│  ══════════════════════════════════════════════            │
│                                                             │
│  Repository: horix-dev/posmate-electron-client              │
│  Branch: develop                                            │
│  Commit: abc1234                                            │
│  Author: developer-name                                     │
│  Message: feat: add new feature                             │
│                                                             │
│  Review Status                                              │
│  ─────────────                                             │
│  - ❌ Code Quality: Linting failures detected               │
│  - ✅ Dependencies: No vulnerabilities found                │
│  - ✅ Security: No issues detected                          │
│                                                             │
│  ┌──────────────────────────────┐                          │
│  │   View Full Report ➜         │                          │
│  └──────────────────────────────┘                          │
│                                                             │
│  This is an automated notification from GitHub Actions.    │
└─────────────────────────────────────────────────────────────┘
```

## GitHub Security Integration

```
┌──────────────────────────────────────────────────────────┐
│                    GITHUB SECURITY TAB                   │
└──────────────────────────────────────────────────────────┘

CodeQL Results → Security Tab → Code scanning alerts
                      │
                      ├── Alert 1: Potential SQL injection
                      ├── Alert 2: XSS vulnerability
                      └── Alert 3: Hardcoded credential
                            │
                            ├── Severity: High/Medium/Low
                            ├── Status: Open/Dismissed
                            ├── Location: File:Line
                            └── Recommendation: How to fix
```

## System Benefits Visualization

```
┌────────────────────────────────────────────────────────────────┐
│                        BENEFITS                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  For Developers:                    For Project Leads:         │
│  ───────────────                   ─────────────────          │
│  • Immediate feedback               • Automated oversight      │
│  • Non-blocking checks              • Track quality trends     │
│  • Clear error messages             • Audit trail              │
│  • Detailed reports                 • Risk mitigation          │
│                                                                │
│  For Business:                      For Security:              │
│  ──────────────                    ─────────────              │
│  • Faster development               • Vulnerability detection  │
│  • Consistent quality               • Compliance evidence      │
│  • Early issue detection            • Security alerts          │
│  • Cost savings                     • Audit logs               │
└────────────────────────────────────────────────────────────────┘
```

## Workflow Files Structure

```
Repository Root
│
├── .github/
│   └── workflows/
│       ├── ci-cd.yml                    (Existing - Full CI/CD)
│       ├── release.yml                  (Existing - Production)
│       ├── release-dev.yml              (Existing - Development)
│       └── code-review-notification.yml (NEW - Automated Review)
│
├── docs/
│   ├── AUTOMATED_CODE_REVIEW.md         (NEW - Full documentation)
│   ├── NOTIFICATION_SETUP_GUIDE.md      (NEW - Quick setup)
│   └── INDEX.md                         (Updated - References added)
│
├── AUTOMATED_CODE_REVIEW_IMPLEMENTATION.md  (NEW - Summary)
├── TESTING_CODE_REVIEW_WORKFLOW.md          (NEW - Test guide)
└── DEVELOPMENT_LOG.md                       (Updated - Changes logged)
```

## Monitoring & Maintenance

```
┌────────────────────────────────────────────────────────┐
│               ONGOING MAINTENANCE                      │
└────────────────────────────────────────────────────────┘

Daily:
  • Monitor email notifications
  • Review critical issues immediately

Weekly:
  • Check Security tab for new CodeQL alerts
  • Review workflow run history
  • Analyze false positives

Monthly:
  • Update dependencies to fix vulnerabilities
  • Review notification thresholds
  • Optimize detection rules
  • Update documentation

Quarterly:
  • Analyze quality trends
  • Review team feedback
  • Adjust workflows as needed
  • Update test scenarios
```

---

## Quick Reference

**Triggers**: Push to main or develop branches  
**Jobs**: 5 (CodeQL, Code Quality, Dep Security, Notify, Create Issue)  
**Duration**: ~3-5 minutes per run  
**Blocking**: No (non-blocking by design)  
**Notifications**: Only for critical issues  
**Setup Time**: 5 minutes (configure secrets)  

**Key URLs**:
- Workflow runs: `Actions → Automated Code Review & Notifications`
- Security alerts: `Security → Code scanning alerts`
- Email config: `Settings → Secrets and variables → Actions`

---

**Last Updated**: 2026-02-11  
**System Status**: Ready for use  
**Next Step**: Configure email secrets and test
