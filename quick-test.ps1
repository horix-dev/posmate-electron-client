# Quick Sales Totals Test
# Copy and paste this into PowerShell terminal

# Set your token here (replace with actual token)
$token = "YOUR_TOKEN_HERE"

# Quick test
$response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/reports/sales/totals?period=today" -Headers @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/json"
}

# Display key metrics
Write-Host "`n=== TODAY'S SALES TOTALS ===" -ForegroundColor Cyan
Write-Host "Total Cost (Purchase):  " -NoNewline; Write-Host $response.data.totals.total_cost -ForegroundColor Yellow
Write-Host "Total Sale Price:       " -NoNewline; Write-Host $response.data.totals.total_sale_price -ForegroundColor Yellow
Write-Host "Total Profit:           " -NoNewline; Write-Host $response.data.totals.total_profit -ForegroundColor Green
Write-Host "Profit Margin:          " -NoNewline; Write-Host "$($response.data.totals.profit_margin)%" -ForegroundColor Green
Write-Host "Transactions:           " -NoNewline; Write-Host $response.data.totals.total_transactions
Write-Host "Items Sold:             " -NoNewline; Write-Host $response.data.totals.total_items_sold

# Full response
Write-Host "`n=== FULL RESPONSE ===" -ForegroundColor Cyan
$response | ConvertTo-Json -Depth 10
