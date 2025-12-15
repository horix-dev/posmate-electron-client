# Projects (Sprint Board)

Use GitHub Projects (v2) for planning and tracking.

## Create Project
1. Go to GitHub → Projects → New Project (Table layout)
2. Name: "POSMate Electron – Sprint"
3. Link to repository `horix-dev/posmate-electron-client`

## Fields
- `Priority` (Single select): Urgent, High, Medium, Low
- `Estimate` (Number): hours
- `Status` (Single select): Backlog, In Progress, In Review, Ready for QA, Done
- `Area` (Single select): POS, Products, Sales, Purchases, Sync, Electron, API

## Views
- Board by `Status`
- List by `Priority`
- Filter by `type:bug` or `type:feature`

## Automation
- Add items from repository when labeled `status:in-progress`
- Auto-move to `Done` when PR merged and issue closed

## Workflow Tips
- Create Epics as issues and add as project items; link child issues with `tracked by`
- Keep items small (≤ 1–2 days)
- Always set `Priority` and `Estimate`
