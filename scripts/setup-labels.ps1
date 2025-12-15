# Requires GitHub CLI (gh). Authenticate first: gh auth login
# Usage: ./scripts/setup-labels.ps1 -Repo "horix-dev/posmate-electron-client"

param(
  [Parameter(Mandatory=$true)]
  [string]$Repo
)

function Ensure-Label($name, $color, $description) {
  $existing = gh label list --repo $Repo | Where-Object { $_ -like "$name*" }
  if (-not $existing) {
    Write-Host "Creating label: $name" -ForegroundColor Green
    gh label create "$name" --color "$color" --description "$description" --repo $Repo | Out-Null
  } else {
    Write-Host "Label exists: $name" -ForegroundColor Yellow
  }
}

# Type
Ensure-Label "type:feature" "0E8A16" "Feature work"
Ensure-Label "type:bug" "D73A4A" "Bug report"
Ensure-Label "type:tech-debt" "5319E7" "Refactor/maintenance"
Ensure-Label "type:epic" "1F6FEB" "Large initiative"

# Priority
Ensure-Label "priority:urgent" "B60205" "Immediate attention"
Ensure-Label "priority:high" "E99695" "High priority"
Ensure-Label "priority:medium" "FBCA04" "Medium priority"
Ensure-Label "priority:low" "C2E0C6" "Low priority"

# Status
Ensure-Label "status:blocked" "000000" "Blocked by dependency"
Ensure-Label "status:in-progress" "0366D6" "Actively being worked"
Ensure-Label "status:review" "5319E7" "In code review"
Ensure-Label "status:ready-for-qa" "0E8A16" "Ready for QA"
Ensure-Label "status:done" "C2E0C6" "Completed"

# Area
Ensure-Label "area:pos" "1D76DB" "POS module"
Ensure-Label "area:products" "1D76DB" "Products module"
Ensure-Label "area:sales" "1D76DB" "Sales module"
Ensure-Label "area:purchases" "1D76DB" "Purchases module"
Ensure-Label "area:sync" "1D76DB" "Sync subsystem"
Ensure-Label "area:electron" "1D76DB" "Electron runtime"
Ensure-Label "area:api" "1D76DB" "External Laravel API"

# Platform
Ensure-Label "platform:windows" "5319E7" "Windows-specific"
Ensure-Label "platform:mac" "5319E7" "macOS-specific"
Ensure-Label "platform:linux" "5319E7" "Linux-specific"
Ensure-Label "platform:web" "5319E7" "Web-specific"

Write-Host "Labels setup complete for $Repo" -ForegroundColor Green
