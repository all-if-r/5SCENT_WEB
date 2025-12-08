# Sales Report Export System - Complete Implementation Guide

## Overview

Complete implementation of PDF and Excel export functionality for the Sales Reports page with branding, admin info, and timestamps.

## Package Installation

Before implementing, install required packages:

```bash
composer require barryvdh/laravel-dompdf
composer require maatwebsite/excel
```

## File Structure

```
backend/laravel-5scent/
├── app/
│   ├── Http/Controllers/
│   │   └── SalesReportController.php          (NEW)
│   ├── Exports/
│   │   ├── SalesReportExport.php              (NEW)
│   │   └── Sheets/
│   │       ├── DailySalesSheet.php            (NEW)
│   │       ├── WeeklySalesSheet.php           (NEW)
│   │       ├── MonthlySalesSheet.php          (NEW)
│   │       └── YearlySalesSheet.php           (NEW)
│   ├── Services/
│   │   └── SalesReportService.php             (UPDATED - added getMostSoldProduct())
│   └── Helpers/
│       └── CurrencyHelper.php                 (UPDATED - added format_rupiah())
├── routes/
│   └── web.php                                (UPDATED - added sales report routes)
└── resources/views/admin/sales_reports/
    └── export_pdf.blade.php                   (NEW)

frontend/web-5scent/
└── app/admin/reports/
    └── page.tsx                               (UPDATED - added export handlers)
```

## Backend Implementation Details

### 1. SalesReportService - getMostSoldProduct()

**File**: `app/Services/SalesReportService.php`

```php
/**
 * Get the most sold product by total quantity
 * 
 * Includes:
 * - Online orders with status Packaging, Shipping, Delivered
 * - All POS transactions (if POS has product details)
 * 
 * @return string|null Product name or null if no sales
 */
public function getMostSoldProduct(): ?string
{
    // Get most sold from online orders (completed only)
    $mostSoldOnline = DB::table('products')
        ->leftJoin('order_details', 'products.product_id', '=', 'order_details.product_id')
        ->leftJoin('orders', 'order_details.order_id', '=', 'orders.order_id')
        ->where(function ($query) {
            $query->whereIn('orders.status', ['Packaging', 'Shipping', 'Delivered'])
                ->orWhereNull('orders.order_id');
        })
        ->select('products.product_id', 'products.product_name', DB::raw('SUM(order_details.quantity) as total_quantity'))
        ->groupBy('products.product_id', 'products.product_name')
        ->orderByDesc('total_quantity')
        ->first();

    // Get most sold from POS transactions (if pos_transaction_details exists)
    $mostSoldPos = null;
    if ($this->tableExists('pos_transaction_details')) {
        $mostSoldPos = DB::table('products')
            ->leftJoin('pos_transaction_details', 'products.product_id', '=', 'pos_transaction_details.product_id')
            ->select('products.product_id', 'products.product_name', DB::raw('SUM(pos_transaction_details.quantity) as total_quantity'))
            ->groupBy('products.product_id', 'products.product_name')
            ->orderByDesc('total_quantity')
            ->first();
    }

    // Determine which has higher quantity
    if ($mostSoldOnline && $mostSoldPos) {
        $onlineQty = $mostSoldOnline->total_quantity ?? 0;
        $posQty = $mostSoldPos->total_quantity ?? 0;
        
        if ($onlineQty >= $posQty && $onlineQty > 0) {
            return $mostSoldOnline->product_name;
        } elseif ($posQty > 0) {
            return $mostSoldPos->product_name;
        }
    } elseif ($mostSoldOnline && $mostSoldOnline->total_quantity > 0) {
        return $mostSoldOnline->product_name;
    } elseif ($mostSoldPos && $mostSoldPos->total_quantity > 0) {
        return $mostSoldPos->product_name;
    }

    return null;
}
```

### 2. Currency Helper - format_rupiah()

**File**: `app/Helpers/CurrencyHelper.php`

Added snake_case version alongside camelCase:

```php
if (!function_exists('format_rupiah')) {
    /**
     * Format number to Indonesian Rupiah currency format (snake_case alias)
     * 
     * @param float|int $amount
     * @return string
     */
    function format_rupiah($amount): string
    {
        if ($amount == 0) {
            return 'Rp0';
        }
        
        // Format with thousands separator (period) and no decimal places
        $formatted = number_format($amount, 0, ',', '.');
        
        return 'Rp' . $formatted;
    }
}
```

### 3. SalesReportController

**File**: `app/Http/Controllers/SalesReportController.php`

```php
<?php

namespace App\Http\Controllers;

use App\Exports\SalesReportExport;
use App\Services\SalesReportService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;

class SalesReportController extends Controller
{
    private $salesReportService;

    public function __construct(SalesReportService $salesReportService)
    {
        $this->salesReportService = $salesReportService;
    }

    /**
     * Display the sales report data (API endpoint)
     */
    public function index(Request $request)
    {
        $timeframe = strtolower($request->input('timeframe', 'monthly'));
        $date = now();

        // Get global totals
        $totalRevenue = $this->salesReportService->getTotalRevenue();
        $totalTransactions = $this->salesReportService->getTotalTransactions();
        $mostSoldProduct = $this->salesReportService->getMostSoldProduct();

        // Get sales data based on timeframe
        $salesData = match($timeframe) {
            'daily' => $this->salesReportService->getDailySales($date),
            'weekly' => $this->salesReportService->getWeeklySales($date),
            'monthly' => $this->salesReportService->getMonthlySales($date),
            'yearly' => $this->salesReportService->getYearlySales($date),
            default => $this->salesReportService->getMonthlySales($date),
        };

        return response()->json([
            'totalRevenue' => $totalRevenue,
            'totalTransactions' => $totalTransactions,
            'mostSoldProduct' => $mostSoldProduct ?? 'N/A',
            'salesData' => $salesData,
        ]);
    }

    /**
     * Export sales report as PDF
     * 
     * Includes all 4 datasets (Daily, Weekly, Monthly, Yearly) regardless of current tab
     */
    public function exportPdf(Request $request)
    {
        try {
            $date = now();
            $adminName = auth()->user()->name ?? 'Unknown Admin';

            // Get all datasets
            $daily = $this->salesReportService->getDailySales($date);
            $weekly = $this->salesReportService->getWeeklySales($date);
            $monthly = $this->salesReportService->getMonthlySales($date);
            $yearly = $this->salesReportService->getYearlySales($date);

            // Build filename: SALES-REPORT-DATA-DD-MM-YYYY.pdf
            $fileName = 'SALES-REPORT-DATA-' . $date->format('d-m-Y') . '.pdf';

            // Load Blade view and generate PDF
            $pdf = Pdf::loadView('admin.sales_reports.export_pdf', compact(
                'daily', 'weekly', 'monthly', 'yearly', 'adminName'
            ), ['generatedAt' => $date]);

            return $pdf->download($fileName);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Export sales report as Excel
     * 
     * Creates 4 sheets: Daily, Weekly, Monthly, Yearly
     */
    public function exportExcel(Request $request)
    {
        try {
            $date = now();
            $adminName = auth()->user()->name ?? 'Unknown Admin';

            // Build filename: SALES-REPORT-DATA-DD-MM-YYYY.xlsx
            $fileName = 'SALES-REPORT-DATA-' . $date->format('d-m-Y') . '.xlsx';

            return Excel::download(
                new SalesReportExport($this->salesReportService, $date, $adminName, $date),
                $fileName
            );
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
```

### 4. Excel Sheet Classes

**Files**: `app/Exports/Sheets/*.php`

Each sheet class (`DailySalesSheet`, `WeeklySalesSheet`, `MonthlySalesSheet`, `YearlySalesSheet`) implements:

- `FromArray` - provide data as array
- `WithHeadings` - add header row
- `WithTitle` - set sheet name
- `WithStyles` - format cells (bold logo, font sizes)

**Structure**:
```php
public function array(): array
{
    // Row 1: Logo "5SCENT"
    // Row 2: "Exported by: {adminName}"
    // Row 3: "Generated at: {timestamp}"
    // Row 4: Empty line
    // Row 5+: Data rows with formatted currency
}

public function headings(): array
{
    return ['Date', 'Orders', 'Revenue', 'Avg Revenue'];
}

public function styles(Worksheet $sheet)
{
    return [
        1 => ['font' => ['bold' => true, 'size' => 14, 'name' => 'Poppins']],
        2 => ['font' => ['size' => 10]],
        3 => ['font' => ['size' => 10]],
    ];
}
```

### 5. SalesReportExport Class

**File**: `app/Exports/SalesReportExport.php`

```php
<?php

namespace App\Exports;

use App\Exports\Sheets\DailySalesSheet;
use App\Exports\Sheets\WeeklySalesSheet;
use App\Exports\Sheets\MonthlySalesSheet;
use App\Exports\Sheets\YearlySalesSheet;
use App\Services\SalesReportService;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Carbon\Carbon;

class SalesReportExport implements WithMultipleSheets
{
    private $salesReportService;
    private $date;
    private $adminName;
    private $timestamp;

    public function __construct(SalesReportService $salesReportService, Carbon $date, $adminName, $timestamp)
    {
        $this->salesReportService = $salesReportService;
        $this->date = $date;
        $this->adminName = $adminName;
        $this->timestamp = $timestamp;
    }

    public function sheets(): array
    {
        return [
            new DailySalesSheet(
                $this->salesReportService->getDailySales($this->date),
                $this->adminName,
                $this->timestamp->format('d-m-Y H:i')
            ),
            new WeeklySalesSheet(
                $this->salesReportService->getWeeklySales($this->date),
                $this->adminName,
                $this->timestamp->format('d-m-Y H:i')
            ),
            new MonthlySalesSheet(
                $this->salesReportService->getMonthlySales($this->date),
                $this->adminName,
                $this->timestamp->format('d-m-Y H:i')
            ),
            new YearlySalesSheet(
                $this->salesReportService->getYearlySales($this->date),
                $this->adminName,
                $this->timestamp->format('d-m-Y H:i')
            ),
        ];
    }
}
```

### 6. PDF Blade View

**File**: `resources/views/admin/sales_reports/export_pdf.blade.php`

```blade
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: 'Poppins', 'Arial', sans-serif;
            font-size: 12px;
            margin: 0;
            padding: 20px;
            color: #000;
        }
        
        .header {
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #000;
        }
        
        .logo {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 8px;
            font-family: 'Poppins', 'Arial', sans-serif;
        }
        
        .meta {
            font-size: 11px;
            line-height: 1.6;
        }
        
        .meta p {
            margin: 4px 0;
        }
        
        h2 {
            margin-top: 20px;
            margin-bottom: 12px;
            font-size: 14px;
            font-weight: 600;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
            font-size: 11px;
        }
        
        thead {
            background-color: #f5f5f5;
        }
        
        th {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-weight: 600;
        }
        
        td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
        }
        
        td.number {
            text-align: right;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">5SCENT</div>
        <div class="meta">
            <p>Exported by: {{ $adminName }}</p>
            <p>Generated at: {{ $generatedAt->format('d-m-Y H:i') }}</p>
        </div>
    </div>

    <h2>Daily Sales</h2>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Orders</th>
                <th>Revenue</th>
                <th>Avg Revenue</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($daily as $row)
            <tr>
                <td>{{ $row['date'] }}</td>
                <td class="number">{{ $row['orders'] }}</td>
                <td class="number">{{ format_rupiah($row['revenue']) }}</td>
                <td class="number">{{ format_rupiah($row['avg_revenue']) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Same structure for Weekly, Monthly, Yearly tables -->
</body>
</html>
```

### 7. Routes

**File**: `routes/web.php`

```php
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SalesReportController;

Route::get('/', function () {
    return response()->json(['message' => '5SCENT API']);
});

Route::prefix('admin')->middleware(['auth', 'is_admin'])->group(function () {
    Route::get('/sales-reports', [SalesReportController::class, 'index'])->name('admin.sales-reports.index');
    Route::get('/sales-reports/export/pdf', [SalesReportController::class, 'exportPdf'])->name('admin.sales-reports.export-pdf');
    Route::get('/sales-reports/export/excel', [SalesReportController::class, 'exportExcel'])->name('admin.sales-reports.export-excel');
});
```

## Frontend Implementation

### React Component - Export Handlers

**File**: `app/admin/reports/page.tsx`

```typescript
// Handle PDF export
const handleExportPDF = async () => {
  try {
    const response = await fetch('/admin/sales-reports/export/pdf');
    if (!response.ok) throw new Error('Failed to export PDF');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Get filename from response header if available
    const contentDisposition = response.headers.get('content-disposition');
    let fileName = 'SALES-REPORT-DATA.pdf';
    
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (fileNameMatch) {
        fileName = fileNameMatch[1].replace(/['"]/g, '');
      }
    }
    
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    showToast('PDF exported successfully', 'success');
  } catch (error) {
    console.error('PDF export error:', error);
    showToast('Failed to export PDF', 'error');
  }
};

// Handle Excel export
const handleExportExcel = async () => {
  try {
    const response = await fetch('/admin/sales-reports/export/excel');
    if (!response.ok) throw new Error('Failed to export Excel');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Get filename from response header if available
    const contentDisposition = response.headers.get('content-disposition');
    let fileName = 'SALES-REPORT-DATA.xlsx';
    
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (fileNameMatch) {
        fileName = fileNameMatch[1].replace(/['"]/g, '');
      }
    }
    
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    showToast('Excel exported successfully', 'success');
  } catch (error) {
    console.error('Excel export error:', error);
    showToast('Failed to export Excel', 'error');
  }
};
```

## File Naming Convention

Both exports follow this pattern:

- **Pattern**: `SALES-REPORT-DATA-DD-MM-YYYY.[pdf|xlsx]`
- **Example**: `SALES-REPORT-DATA-08-12-2025.pdf` and `SALES-REPORT-DATA-08-12-2025.xlsx`
- **Generated**: Uses server time via `now()->format('d-m-Y')`

## Branding & Metadata

All exports include:

1. **Logo Text**: "5SCENT" in Poppins Bold (size 20 for PDF, 14 for Excel)
2. **Admin Name**: "Exported by: {auth()->user()->name}"
3. **Timestamp**: "Generated at: DD-MM-YYYY HH:MM" (24-hour format)

## Data Structure in Exports

Each export contains 4 sheets/sections:

### Daily Sales
- 7 rows (Monday to Sunday)
- Columns: Date, Orders, Revenue, Avg Revenue

### Weekly Sales
- Up to 4 rows (Week 1-4 of current month)
- Columns: Week, Orders, Revenue, Avg Revenue

### Monthly Sales
- 12 rows (January to December of current year)
- Columns: Month, Orders, Revenue, Avg Revenue

### Yearly Sales
- Historical data (from earliest transaction to current year)
- Columns: Year, Orders, Revenue, Avg Revenue

## Currency Formatting

All monetary values use `format_rupiah()`:

```php
format_rupiah(606000); // Returns "Rp606.000"
format_rupiah(0);      // Returns "Rp0"
```

## Testing the Implementation

### 1. Install Packages
```bash
cd backend/laravel-5scent
composer require barryvdh/laravel-dompdf
composer require maatwebsite/excel
composer dump-autoload
```

### 2. Test Endpoints
```bash
# PDF export
GET http://localhost:8000/admin/sales-reports/export/pdf

# Excel export
GET http://localhost:8000/admin/sales-reports/export/excel

# Data API
GET http://localhost:8000/admin/sales-reports?timeframe=monthly
```

### 3. Test Frontend Buttons
Click "Export PDF" or "Export Excel" on the Sales Reports page. Both buttons should:
- Download file immediately
- Show success toast
- File should have correct name: `SALES-REPORT-DATA-DD-MM-YYYY.[pdf|xlsx]`

## Key Features

✅ **All 4 Datasets**: Always exports Daily, Weekly, Monthly, Yearly regardless of active tab  
✅ **Branding**: 5SCENT logo text with Poppins Bold font  
✅ **Admin Info**: Shows admin name who triggered export  
✅ **Timestamps**: DD-MM-YYYY HH:MM format on all exports  
✅ **Currency**: Indonesian Rupiah format (Rp884.000)  
✅ **Multiple Sheets**: Excel has 4 separate sheets for each timeframe  
✅ **PDF Layout**: Clean table layout with header borders  
✅ **File Naming**: Consistent SALES-REPORT-DATA-DD-MM-YYYY format  
✅ **Most Sold Product**: Calculated from completed orders + POS transactions  
✅ **Error Handling**: Try-catch blocks with user feedback  

## Files Modified/Created

### Created
- `app/Http/Controllers/SalesReportController.php`
- `app/Exports/SalesReportExport.php`
- `app/Exports/Sheets/DailySalesSheet.php`
- `app/Exports/Sheets/WeeklySalesSheet.php`
- `app/Exports/Sheets/MonthlySalesSheet.php`
- `app/Exports/Sheets/YearlySalesSheet.php`
- `resources/views/admin/sales_reports/export_pdf.blade.php`

### Modified
- `app/Services/SalesReportService.php` (added `getMostSoldProduct()`)
- `app/Helpers/CurrencyHelper.php` (added `format_rupiah()`)
- `routes/web.php` (added sales report routes)
- `app/admin/reports/page.tsx` (added export handlers)

## Composer Commands Reference

```bash
# Install DomPDF for PDF generation
composer require barryvdh/laravel-dompdf

# Install Excel package for spreadsheet generation
composer require maatwebsite/excel

# Regenerate autoload files
composer dump-autoload
```

## Implementation Status

✅ Most Sold Product calculation  
✅ Currency helper function  
✅ Excel export with 4 sheets  
✅ PDF export with all tables  
✅ Branding and metadata  
✅ File naming convention  
✅ Frontend button handlers  
✅ Error handling  
✅ No errors in implementation  

**Ready for testing!**
