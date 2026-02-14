# Sales Totals Report Export Test Script
# Tests Excel and CSV export endpoints

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Sales Totals Report Export Test" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://127.0.0.1:8000"

# Get authentication token
Write-Host "Enter your authentication token (Bearer token):" -ForegroundColor Yellow
$token = Read-Host

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "Error: Token is required" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
}

# Test 1: Export Today's Sales to Excel
Write-Host ""
Write-Host "Test 1: Exporting today's sales to Excel..." -ForegroundColor Green
Write-Host "Endpoint: GET $baseUrl/api/v1/reports/sales/totals/export-excel?period=today" -ForegroundColor Gray
Write-Host ""

try {
    $excelFile = "sales-totals-today-$(Get-Date -Format 'yyyy-MM-dd').xlsx"
    
    Invoke-WebRequest -Uri "$baseUrl/api/v1/reports/sales/totals/export-excel?period=today" `
        -Headers $headers `
        -OutFile $excelFile

    if (Test-Path $excelFile) {
        $fileSize = (Get-Item $excelFile).Length
        Write-Host "✓ Excel export successful!" -ForegroundColor Green
        Write-Host "  File: $excelFile" -ForegroundColor White
        Write-Host "  Size: $fileSize bytes" -ForegroundColor White
        Write-Host ""
    }
} catch {
    Write-Host "✗ Excel export failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
}

# Test 2: Export Today's Sales to CSV
Write-Host "Test 2: Exporting today's sales to CSV..." -ForegroundColor Green
Write-Host "Endpoint: GET $baseUrl/api/v1/reports/sales/totals/export-csv?period=today" -ForegroundColor Gray
Write-Host ""

try {
    $csvFile = "sales-totals-today-$(Get-Date -Format 'yyyy-MM-dd').csv"
    
    Invoke-WebRequest -Uri "$baseUrl/api/v1/reports/sales/totals/export-csv?period=today" `
        -Headers $headers `
        -OutFile $csvFile

    if (Test-Path $csvFile) {
        $fileSize = (Get-Item $csvFile).Length
        Write-Host "✓ CSV export successful!" -ForegroundColor Green
        Write-Host "  File: $csvFile" -ForegroundColor White
        Write-Host "  Size: $fileSize bytes" -ForegroundColor White
        Write-Host ""
        
        # Show first few lines of CSV
        Write-Host "Preview (first 5 lines):" -ForegroundColor Yellow
        Get-Content $csvFile -TotalCount 5 | ForEach-Object {
            Write-Host "  $_" -ForegroundColor Gray
        }
        Write-Host ""
    }
} catch {
    Write-Host "✗ CSV export failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
}

# Test 3: Export Last 7 Days with Custom Filename
Write-Host "Test 3: Exporting last 7 days to Excel..." -ForegroundColor Green
Write-Host "Endpoint: GET $baseUrl/api/v1/reports/sales/totals/export-excel?period=last_7_days" -ForegroundColor Gray
Write-Host ""

try {
    $excelFile7Days = "sales-totals-last-7-days.xlsx"
    
    Invoke-WebRequest -Uri "$baseUrl/api/v1/reports/sales/totals/export-excel?period=last_7_days" `
        -Headers $headers `
        -OutFile $excelFile7Days

    if (Test-Path $excelFile7Days) {
        $fileSize = (Get-Item $excelFile7Days).Length
        Write-Host "✓ Last 7 days export successful!" -ForegroundColor Green
        Write-Host "  File: $excelFile7Days" -ForegroundColor White
        Write-Host "  Size: $fileSize bytes" -ForegroundColor White
        Write-Host ""
    }
} catch {
    Write-Host "✗ Last 7 days export failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
}

# Test 4: Export with Date Range
Write-Host "Test 4: Exporting custom date range (Feb 1-14) to CSV..." -ForegroundColor Green
$fromDate = "2026-02-01"
$toDate = "2026-02-14"
Write-Host "Endpoint: GET $baseUrl/api/v1/reports/sales/totals/export-csv?from_date=$fromDate&to_date=$toDate" -ForegroundColor Gray
Write-Host ""

try {
    $csvFileRange = "sales-totals-feb-1-14.csv"
    
    Invoke-WebRequest -Uri "$baseUrl/api/v1/reports/sales/totals/export-csv?from_date=$fromDate&to_date=$toDate" `
        -Headers $headers `
        -OutFile $csvFileRange

    if (Test-Path $csvFileRange) {
        $fileSize = (Get-Item $csvFileRange).Length
        Write-Host "✓ Date range export successful!" -ForegroundColor Green
        Write-Host "  File: $csvFileRange" -ForegroundColor White
        Write-Host "  Size: $fileSize bytes" -ForegroundColor White
        Write-Host ""
    }
} catch {
    Write-Host "✗ Date range export failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
}

# Summary
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Export Tests Complete!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Exported files in current directory:" -ForegroundColor Yellow
Get-ChildItem -Filter "sales-totals-*.*" | ForEach-Object {
    Write-Host "  - $($_.Name) ($($_.Length) bytes)" -ForegroundColor White
}
Write-Host ""
Write-Host "You can now open these files in Excel or any CSV viewer." -ForegroundColor Cyan
Write-Host ""
