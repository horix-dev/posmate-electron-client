# Sales Totals Export - Quick Guide

## 📥 How to Export Sales Totals Report

### Location
The export buttons are located in the **top-right corner** of the Sales Totals Report page, next to the "Offline Mode" badge (if offline).

### Available Export Formats

1. **📊 Export Excel** - Downloads as `.xlsx` file
   - Perfect for detailed analysis in Microsoft Excel, Google Sheets, etc.
   - Preserves formatting and structure
   - Includes all summary data and product details

2. **📄 Export CSV** - Downloads as `.csv` file
   - Simple comma-separated values format
   - Opens in any spreadsheet application
   - Great for importing into other systems

### How to Export

#### Step 1: Apply Filters (Optional)
Before exporting, you can filter the data:
- Select a **period** (Today, Yesterday, Last 7 Days, etc.)
- Or use **custom date range** (From Date → To Date)
- Optionally filter by **branch** or other criteria

#### Step 2: Click Export Button
- Click **"Export Excel"** for .xlsx format
- Or click **"Export CSV"** for .csv format

#### Step 3: Download
- The file will automatically download to your browser's download folder
- Filename format: `sales-totals-report-YYYY-MM-DD-HHMMSS.xlsx` (or .csv)

### What's Included in the Export?

The exported file contains:

#### 1. Summary Section
- Total Cost
- Total Sale Price
- Total Profit
- Profit Margin percentage
- Total Transactions count
- Total Items Sold

#### 2. Product Type Summary
- Statistics for **Single Products**
- Statistics for **Variant Products**
- Statistics for **Combo Products**

Each type shows:
- Count of products
- Total quantity sold
- Total sales revenue
- Total profit

#### 3. Detailed Product List
Every product sold with:
- Serial Number (SL)
- Product Name
- Product Type (Single/Variant/Combo)
- Variant Name (if applicable)
- Batch Number (if applicable)
- Total Quantity
- Total Cost
- Total Sale Price
- Total Profit
- Sales Count (number of times sold)
- Manufacturing Date (if applicable)
- Expiry Date (if applicable)

### Export States

**Enabled (Green)** ✅
- Data is loaded
- You can click to export

**Disabled (Gray)** 🚫
- Currently loading data
- Currently exporting (shows "Exporting...")
- No data available for selected period

### Notifications

**Success** ✅
- Green toast notification: "Report exported successfully as EXCEL" (or CSV)
- File downloaded to your downloads folder

**Error** ❌
- Red toast notification: "Failed to export report. Please try again."
- Check your internet connection
- Verify you're logged in
- Ensure backend API is running

### Tips

💡 **Tip 1: Export matches your view**
The export uses the same filters as the on-screen report. What you see is what gets exported!

💡 **Tip 2: Best format for analysis**
- Use **Excel** for complex analysis with formulas
- Use **CSV** for simple data viewing or importing

💡 **Tip 3: Exporting large datasets**
For large date ranges (months/years), the export may take a few seconds. Wait for the "Exporting..." message to complete.

💡 **Tip 4: Offline mode**
Export requires internet connection. You cannot export while offline.

### Troubleshooting

**Problem: Export button is disabled**
✅ Solution: Wait for data to load or check if there's data for the selected period

**Problem: "Authentication required" error**
✅ Solution: Log out and log back in to refresh your session

**Problem: Export fails immediately**
✅ Solution: 
1. Check browser console (F12) for errors
2. Verify backend is running at http://127.0.0.1:8000
3. Test the export API directly using PowerShell script

**Problem: File downloads but shows as corrupted**
✅ Solution: This means the backend returned an error. Check:
1. Backend logs for errors
2. Ensure export endpoints are implemented
3. Verify database has sales data

### Testing the Export API

You can test the export functionality directly using PowerShell:

```powershell
.\test-sales-totals-export.ps1
```

This will:
- Test Excel export
- Test CSV export
- Test different date ranges
- Download sample files to your current directory

### File Locations

**Windows:**
- Default: `C:\Users\[YourName]\Downloads\`
- Check browser settings to change download location

**Mac:**
- Default: `/Users/[YourName]/Downloads/`

**Linux:**
- Default: `~/Downloads/`

### Opening the Exported Files

**Excel Files (.xlsx):**
- Microsoft Excel
- Google Sheets (upload to Google Drive)
- LibreOffice Calc
- Numbers (Mac)

**CSV Files (.csv):**
- Microsoft Excel
- Google Sheets
- Any text editor
- Database import tools

---

## 🎉 You're All Set!

Navigate to **Reports → Sales Totals** and look for the export buttons in the top-right corner!
