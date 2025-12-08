# Quick Setup Guide - Sales Report Export System

## Step 1: Install Required Packages

```bash
cd "c:\Users\alifr\Documents\COOLYEAH TELKOM\SEMESTER 5\5SCENT_1\5SCENT_WEB\WEB-5SCENT\backend\laravel-5scent"

# Install DomPDF for PDF generation
composer require barryvdh/laravel-dompdf

# Install Maatwebsite Excel for Excel export
composer require maatwebsite/excel

# Regenerate autoload files to register helpers
composer dump-autoload
```

## Step 2: Verify File Structure

All files have been created. Verify these exist:

### Backend Files Created:
✅ `app/Http/Controllers/SalesReportController.php` - Export handlers  
✅ `app/Exports/SalesReportExport.php` - Excel multi-sheet export  
✅ `app/Exports/Sheets/DailySalesSheet.php` - Daily data sheet  
✅ `app/Exports/Sheets/WeeklySalesSheet.php` - Weekly data sheet  
✅ `app/Exports/Sheets/MonthlySalesSheet.php` - Monthly data sheet  
✅ `app/Exports/Sheets/YearlySalesSheet.php` - Yearly data sheet  
✅ `resources/views/admin/sales_reports/export_pdf.blade.php` - PDF template  

### Backend Files Modified:
✅ `app/Services/SalesReportService.php` - Added `getMostSoldProduct()`  
✅ `app/Helpers/CurrencyHelper.php` - Added `format_rupiah()`  
✅ `routes/web.php` - Added sales report routes  

### Frontend Files Modified:
✅ `app/admin/reports/page.tsx` - Added export button handlers  

## Step 3: Verify Routes

Check `routes/web.php` contains:

```php
Route::prefix('admin')->middleware(['auth', 'is_admin'])->group(function () {
    Route::get('/sales-reports', [SalesReportController::class, 'index'])->name('admin.sales-reports.index');
    Route::get('/sales-reports/export/pdf', [SalesReportController::class, 'exportPdf'])->name('admin.sales-reports.export-pdf');
    Route::get('/sales-reports/export/excel', [SalesReportController::class, 'exportExcel'])->name('admin.sales-reports.export-excel');
});
```

## Step 4: Test Export Functionality

### Start the servers:

```bash
# Terminal 1 - Backend
cd "c:\Users\alifr\Documents\COOLYEAH TELKOM\SEMESTER 5\5SCENT_1\5SCENT_WEB\WEB-5SCENT\backend\laravel-5scent"
php artisan serve

# Terminal 2 - Frontend
cd "c:\Users\alifr\Documents\COOLYEAH TELKOM\SEMESTER 5\5SCENT_1\5SCENT_WEB\WEB-5SCENT\frontend\web-5scent"
npm run dev
```

### Test in browser:

1. Navigate to: `http://localhost:3000/admin/reports`
2. Click "Export PDF" button
   - File downloads: `SALES-REPORT-DATA-08-12-2025.pdf`
   - Should contain all 4 tables (Daily, Weekly, Monthly, Yearly)
   - Should show 5SCENT branding
   - Should show admin name and timestamp

3. Click "Export Excel" button
   - File downloads: `SALES-REPORT-DATA-08-12-2025.xlsx`
   - Should have 4 sheets (Daily Sales, Weekly Sales, Monthly Sales, Yearly Sales)
   - Each sheet should have 5SCENT header and metadata rows

## Features Implemented

### 1. Most Sold Product ✅
- Calculates from completed online orders (Packaging, Shipping, Delivered)
- Includes POS transactions if pos_transaction_details table exists
- Shows product name in dashboard card (no longer N/A)

### 2. PDF Export ✅
- All 4 datasets (Daily, Weekly, Monthly, Yearly)
- 5SCENT logo in Poppins Bold
- Admin name: "Exported by: {name}"
- Timestamp: "Generated at: DD-MM-YYYY HH:MM"
- Currency formatted as Rp884.000
- File name: SALES-REPORT-DATA-DD-MM-YYYY.pdf

### 3. Excel Export ✅
- 4 separate sheets for each timeframe
- Header rows with 5SCENT branding
- Admin info and timestamp on each sheet
- Poppins Bold font for logo (size 14)
- Currency formatted as Rp884.000
- File name: SALES-REPORT-DATA-DD-MM-YYYY.xlsx

### 4. Frontend Integration ✅
- Export PDF button calls `/admin/sales-reports/export/pdf`
- Export Excel button calls `/admin/sales-reports/export/excel`
- Automatic file download with correct naming
- Toast notifications for success/error

## File Naming Convention

Both exports use the same naming pattern:

```
SALES-REPORT-DATA-DD-MM-YYYY.pdf
SALES-REPORT-DATA-DD-MM-YYYY.xlsx
```

For December 8, 2025:
```
SALES-REPORT-DATA-08-12-2025.pdf
SALES-REPORT-DATA-08-12-2025.xlsx
```

## Database Requirements

For Most Sold Product to work correctly, you need:

### Tables:
- `products` - product_id, product_name
- `orders` - order_id, status, created_at
- `order_details` - order_id, product_id, quantity
- `pos_transactions` - transaction_id, created_at
- `pos_transaction_details` (optional) - transaction_id, product_id, quantity

### Status Values (case-sensitive):
- ✅ Packaging
- ✅ Shipping
- ✅ Delivered
- ❌ Pending (excluded)
- ❌ Cancelled (excluded)

## Troubleshooting

### PDF not generating
- Ensure `barryvdh/laravel-dompdf` is installed: `composer require barryvdh/laravel-dompdf`
- Check if Blade view exists: `resources/views/admin/sales_reports/export_pdf.blade.php`
- Verify format_rupiah() helper is available

### Excel not generating
- Ensure `maatwebsite/excel` is installed: `composer require maatwebsite/excel`
- Check if all 4 sheet classes exist in `app/Exports/Sheets/`
- Verify SalesReportExport class implements WithMultipleSheets

### Most Sold showing N/A
- Check if order_details table has correct quantity values
- Verify orders have status Packaging, Shipping, or Delivered
- Check product_id foreign keys are correct

### Export file has wrong name
- Check if auth()->user()->name is set correctly
- Verify now()->format('d-m-Y') returns correct date format
- Look for content-disposition header in response

## Architecture

```
Frontend Click Event
    ↓
Fetch Request to /admin/sales-reports/export/[pdf|excel]
    ↓
SalesReportController (exportPdf/exportExcel)
    ↓
SalesReportService (getDailySales, getWeeklySales, etc.)
    ↓
Database Queries (Orders + POS Transactions)
    ↓
Format Data with format_rupiah() helper
    ↓
Blade View (PDF) or Excel Sheet Classes
    ↓
Download File (SALES-REPORT-DATA-DD-MM-YYYY.[pdf|xlsx])
```

## Next Steps

1. ✅ Run `composer require barryvdh/laravel-dompdf`
2. ✅ Run `composer require maatwebsite/excel`
3. ✅ Run `composer dump-autoload`
4. ✅ Test PDF export
5. ✅ Test Excel export
6. ✅ Verify Most Sold product displays correctly
7. ✅ Verify branding appears in both exports
8. ✅ Verify timestamps show correctly

## Support Files

All implementation files are in:

**Documentation**:
- `SALES_REPORT_EXPORT_IMPLEMENTATION.md` - Full implementation details
- `SALES_REPORT_IMPLEMENTATION.md` - Previous sales report setup

**Backend Code**:
- `app/Http/Controllers/SalesReportController.php`
- `app/Exports/SalesReportExport.php`
- `app/Exports/Sheets/*.php`
- `app/Services/SalesReportService.php`
- `app/Helpers/CurrencyHelper.php`

**Frontend Code**:
- `app/admin/reports/page.tsx`

**Views**:
- `resources/views/admin/sales_reports/export_pdf.blade.php`

**Configuration**:
- `routes/web.php`
