# Sales Totals Report API Test Script
# Tests the /api/v1/reports/sales/totals endpoint

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Sales Totals Report API Test" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://127.0.0.1:8000"
$endpoint = "/api/v1/reports/sales/totals"

# Get authentication token
Write-Host "Enter your authentication token (Bearer token):" -ForegroundColor Yellow
$token = Read-Host

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "Error: Token is required" -ForegroundColor Red
    exit 1
}

# Test 1: Today's Sales Totals
Write-Host ""
Write-Host "Test 1: Fetching today's sales totals..." -ForegroundColor Green
Write-Host "Endpoint: GET $baseUrl$endpoint`?period=today" -ForegroundColor Gray
Write-Host ""

try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Accept" = "application/json"
    }

    $response = Invoke-RestMethod -Uri "$baseUrl$endpoint`?period=today" -Headers $headers -Method Get

    # Display results
    Write-Host "✓ Successfully retrieved sales totals report" -ForegroundColor Green
    Write-Host ""
    Write-Host "Period: $($response.data.period.from) to $($response.data.period.to)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "=== TOTALS SUMMARY ===" -ForegroundColor Yellow
    Write-Host "Total Cost:            $($response.data.totals.total_cost)" -ForegroundColor White
    Write-Host "Total Sale Price:      $($response.data.totals.total_sale_price)" -ForegroundColor White
    Write-Host "Total Profit:          $($response.data.totals.total_profit)" -ForegroundColor Green
    Write-Host "Profit Margin:         $($response.data.totals.profit_margin)%" -ForegroundColor Green
    Write-Host "Total Transactions:    $($response.data.totals.total_transactions)" -ForegroundColor White
    Write-Host "Total Items Sold:      $($response.data.totals.total_items_sold)" -ForegroundColor White
    Write-Host ""

    # Display summary by type
    if ($response.data.summary_by_type) {
        Write-Host "=== SUMMARY BY PRODUCT TYPE ===" -ForegroundColor Yellow
        
        if ($response.data.summary_by_type.single) {
            Write-Host ""
            Write-Host "Single Products:" -ForegroundColor Cyan
            Write-Host "  Count:        $($response.data.summary_by_type.single.count)" -ForegroundColor White
            Write-Host "  Quantity:     $($response.data.summary_by_type.single.total_quantity)" -ForegroundColor White
            Write-Host "  Sale Price:   $($response.data.summary_by_type.single.total_sale_price)" -ForegroundColor White
            Write-Host "  Profit:       $($response.data.summary_by_type.single.total_profit)" -ForegroundColor Green
        }
        
        if ($response.data.summary_by_type.variant) {
            Write-Host ""
            Write-Host "Variant Products:" -ForegroundColor Cyan
            Write-Host "  Count:        $($response.data.summary_by_type.variant.count)" -ForegroundColor White
            Write-Host "  Quantity:     $($response.data.summary_by_type.variant.total_quantity)" -ForegroundColor White
            Write-Host "  Sale Price:   $($response.data.summary_by_type.variant.total_sale_price)" -ForegroundColor White
            Write-Host "  Profit:       $($response.data.summary_by_type.variant.total_profit)" -ForegroundColor Green
        }
        
        if ($response.data.summary_by_type.combo) {
            Write-Host ""
            Write-Host "Combo Products:" -ForegroundColor Cyan
            Write-Host "  Count:        $($response.data.summary_by_type.combo.count)" -ForegroundColor White
            Write-Host "  Quantity:     $($response.data.summary_by_type.combo.total_quantity)" -ForegroundColor White
            Write-Host "  Sale Price:   $($response.data.summary_by_type.combo.total_sale_price)" -ForegroundColor White
            Write-Host "  Profit:       $($response.data.summary_by_type.combo.total_profit)" -ForegroundColor Green
        }
        Write-Host ""
    }

    # Display top 5 products
    if ($response.data.products -and $response.data.products.Count -gt 0) {
        Write-Host "=== TOP PRODUCTS (by Revenue) ===" -ForegroundColor Yellow
        $topProducts = $response.data.products | Select-Object -First 5
        $index = 1
        foreach ($product in $topProducts) {
            Write-Host ""
            Write-Host "$index. $($product.product_name)" -ForegroundColor Cyan
            Write-Host "   Type:        $($product.product_type)" -ForegroundColor Gray
            if ($product.variant_name) {
                Write-Host "   Variant:     $($product.variant_name)" -ForegroundColor Gray
            }
            if ($product.batch_no) {
                Write-Host "   Batch:       $($product.batch_no)" -ForegroundColor Gray
            }
            Write-Host "   Quantity:    $($product.total_quantity)" -ForegroundColor White
            Write-Host "   Cost:        $($product.total_cost)" -ForegroundColor White
            Write-Host "   Sale Price:  $($product.total_sale_price)" -ForegroundColor White
            Write-Host "   Profit:      $($product.total_profit)" -ForegroundColor Green
            Write-Host "   Sales Count: $($product.sales_count)" -ForegroundColor White
            $index++
        }
        Write-Host ""
        
        if ($response.data.products.Count -gt 5) {
            Write-Host "... and $($response.data.products.Count - 5) more products" -ForegroundColor Gray
            Write-Host ""
        }
    } else {
        Write-Host "No products found for today." -ForegroundColor Gray
        Write-Host ""
    }

    # Test 2: Last 7 Days
    Write-Host ""
    Write-Host "Test 2: Fetching last 7 days sales totals..." -ForegroundColor Green
    Write-Host "Endpoint: GET $baseUrl$endpoint`?period=last_7_days" -ForegroundColor Gray
    Write-Host ""
    
    $response7Days = Invoke-RestMethod -Uri "$baseUrl$endpoint`?period=last_7_days" -Headers $headers -Method Get
    
    Write-Host "✓ Successfully retrieved last 7 days report" -ForegroundColor Green
    Write-Host ""
    Write-Host "Period: $($response7Days.data.period.from) to $($response7Days.data.period.to)" -ForegroundColor Cyan
    Write-Host "Total Cost:        $($response7Days.data.totals.total_cost)" -ForegroundColor White
    Write-Host "Total Sale Price:  $($response7Days.data.totals.total_sale_price)" -ForegroundColor White
    Write-Host "Total Profit:      $($response7Days.data.totals.total_profit)" -ForegroundColor Green
    Write-Host "Profit Margin:     $($response7Days.data.totals.profit_margin)%" -ForegroundColor Green
    Write-Host "Transactions:      $($response7Days.data.totals.total_transactions)" -ForegroundColor White
    Write-Host "Items Sold:        $($response7Days.data.totals.total_items_sold)" -ForegroundColor White
    Write-Host ""

    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "  All Tests Passed! ✓" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Cyan

} catch {
    Write-Host ""
    Write-Host "✗ Error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Response details:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  1. Backend server not running at $baseUrl" -ForegroundColor Gray
    Write-Host "  2. Invalid authentication token" -ForegroundColor Gray
    Write-Host "  3. Endpoint not implemented in backend" -ForegroundColor Gray
    Write-Host ""
    
    exit 1
}
