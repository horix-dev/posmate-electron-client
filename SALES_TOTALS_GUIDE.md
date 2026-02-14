# Sales Totals Report - Quick Access Guide

## How to Access

### Method 1: Via Sidebar (Recommended)
1. Open your POS application
2. Look at the left sidebar
3. Find **"Reports"** section (has a BarChart icon)
4. Click on "Reports" to expand it
5. Click on **"Sales Totals"** (has a DollarSign icon)

### Method 2: Direct URL
In your browser address bar, navigate to:
```
http://localhost:3000/#/reports/sales-totals
```
or if using a different port:
```
http://localhost:[YOUR_PORT]/#/reports/sales-totals
```

## What You Should See

The Sales Totals page should display 4 summary cards at the top:

1. **Total Sale Price** 💵
   - Shows the total revenue from sales
   - Displays number of transactions below

2. **Total Cost** 📦
   - Shows the total purchase cost of products sold
   - Displays items sold count below

3. **Total Profit** 📈
   - Shows: Total Sale Price - Total Cost
   - Displays profit margin percentage below

4. **Items Sold** 🛒
   - Shows total quantity of items sold
   - Displays unique products count below

## Debugging Steps

If you don't see the data:

1. **Open Browser DevTools** (F12)
2. Go to the **Console tab**
3. Look for debug logs:
   ```
   Sales Totals Data: {...}
   Total Cost: [number]
   Total Sale Price: [number]
   Total Profit: [number]
   ```

4. **Check Network tab**
   - Look for a request to `/api/v1/reports/sales/totals?period=today`
   - Check if it returns 200 status
   - View the response data

## Common Issues

### Issue 1: "Failed to load sales totals report"
**Solution**: Backend API not running or endpoint not implemented
- Verify backend is running at http://127.0.0.1:8000
- Test the API directly using the test scripts

### Issue 2: Shows "No sales data found"
**Solution**: No sales exist for the selected period
- Change the period filter to "Last 7 Days" or "Current Month"
- Check if you have any sales in the database

### Issue 3: Can't find "Sales Totals" in sidebar
**Solution**: Sidebar might be collapsed or Reports section not expanded
- Make sure sidebar is expanded (not just showing icons)
- Click on "Reports" section to expand the submenu

## API Test

To verify the backend API is working, run:

```powershell
# In PowerShell terminal
.\test-sales-totals.ps1
```

Or use the quick test:
```powershell
# Replace YOUR_TOKEN with your actual auth token
$token = "YOUR_TOKEN"
$response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/reports/sales/totals?period=today" -Headers @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/json"
}
$response.data.totals
```

This should output:
```
total_cost        : [number]
total_sale_price  : [number]
total_profit      : [number]
profit_margin     : [number]
total_transactions: [number]
total_items_sold  : [number]
```
