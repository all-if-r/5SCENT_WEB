# Sales Report Export - Visual Reference & Code Snippets

## Export File Examples

### PDF Export Output

```
═══════════════════════════════════════════════════════════════════
                        5SCENT
                        
    Exported by: Admin Name
    Generated at: 08-12-2025 21:03
═══════════════════════════════════════════════════════════════════

Daily Sales
┌──────────┬────────┬──────────────┬──────────────┐
│ Date     │ Orders │ Revenue      │ Avg Revenue  │
├──────────┼────────┼──────────────┼──────────────┤
│ Monday   │ 0      │ Rp0          │ Rp0          │
│ Tuesday  │ 2      │ Rp606.000    │ Rp303.000    │
│ Wednesday│ 0      │ Rp0          │ Rp0          │
│ Thursday │ 0      │ Rp0          │ Rp0          │
│ Friday   │ 1      │ Rp119.000    │ Rp119.000    │
│ Saturday │ 1      │ Rp159.000    │ Rp159.000    │
│ Sunday   │ 0      │ Rp0          │ Rp0          │
└──────────┴────────┴──────────────┴──────────────┘

[Similar tables for Weekly, Monthly, Yearly...]
```

### Excel Export Output

Sheet: Daily Sales
```
Row 1: | 5SCENT                                              |
Row 2: | Exported by: Admin Name                             |
Row 3: | Generated at: 08-12-2025 21:03                      |
Row 4: | [empty]                                             |
Row 5: | Date      | Orders | Revenue    | Avg Revenue    |
Row 6: | Monday    | 0      | Rp0        | Rp0            |
Row 7: | Tuesday   | 2      | Rp606.000  | Rp303.000      |
Row 8: | Wednesday | 0      | Rp0        | Rp0            |
...
```

Sheet: Weekly Sales  
Sheet: Monthly Sales  
Sheet: Yearly Sales  

## Controller Methods

### SalesReportController::index()

Purpose: API endpoint to get sales data for current timeframe

```php
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
```

### SalesReportController::exportPdf()

Purpose: Generate and download PDF with all 4 datasets

```php
public function exportPdf(Request $request)
{
    try {
        $date = now();
        $adminName = auth()->user()->name ?? 'Unknown Admin';

        // Get all 4 datasets
        $daily = $this->salesReportService->getDailySales($date);
        $weekly = $this->salesReportService->getWeeklySales($date);
        $monthly = $this->salesReportService->getMonthlySales($date);
        $yearly = $this->salesReportService->getYearlySales($date);

        // File name: SALES-REPORT-DATA-08-12-2025.pdf
        $fileName = 'SALES-REPORT-DATA-' . $date->format('d-m-Y') . '.pdf';

        $pdf = Pdf::loadView('admin.sales_reports.export_pdf', compact(
            'daily', 'weekly', 'monthly', 'yearly', 'adminName'
        ), ['generatedAt' => $date]);

        return $pdf->download($fileName);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
}
```

### SalesReportController::exportExcel()

Purpose: Generate and download Excel with 4 sheets

```php
public function exportExcel(Request $request)
{
    try {
        $date = now();
        $adminName = auth()->user()->name ?? 'Unknown Admin';

        // File name: SALES-REPORT-DATA-08-12-2025.xlsx
        $fileName = 'SALES-REPORT-DATA-' . $date->format('d-m-Y') . '.xlsx';

        return Excel::download(
            new SalesReportExport($this->salesReportService, $date, $adminName, $date),
            $fileName
        );
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
}
```

## Service Methods

### SalesReportService::getMostSoldProduct()

```php
public function getMostSoldProduct(): ?string
{
    // Online orders with completed status
    $mostSoldOnline = DB::table('products')
        ->leftJoin('order_details', 'products.product_id', '=', 'order_details.product_id')
        ->leftJoin('orders', 'order_details.order_id', '=', 'orders.order_id')
        ->whereIn('orders.status', ['Packaging', 'Shipping', 'Delivered'])
        ->select('products.product_id', 'products.product_name', 
                 DB::raw('SUM(order_details.quantity) as total_quantity'))
        ->groupBy('products.product_id', 'products.product_name')
        ->orderByDesc('total_quantity')
        ->first();

    // POS transactions if table exists
    $mostSoldPos = $this->tableExists('pos_transaction_details') 
        ? DB::table('products')
            ->leftJoin('pos_transaction_details', ...)
            ->select(...)->groupBy(...)->orderByDesc('total_quantity')->first()
        : null;

    // Return highest quantity
    if ($mostSoldOnline && $mostSoldOnline->total_quantity > 0) {
        return $mostSoldOnline->product_name;
    } elseif ($mostSoldPos && $mostSoldPos->total_quantity > 0) {
        return $mostSoldPos->product_name;
    }

    return null;
}
```

## Frontend Integration

### React Hook: Export Handlers

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
    
    // Extract filename from header
    const contentDisposition = response.headers.get('content-disposition');
    let fileName = 'SALES-REPORT-DATA.pdf';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match) fileName = match[1].replace(/['"]/g, '');
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

// Handle Excel export - similar logic with Excel endpoint
const handleExportExcel = async () => {
  // Same pattern as PDF but calls /admin/sales-reports/export/excel
  // and uses .xlsx file extension
};
```

### Usage in Component

```typescript
<button
  onClick={handleExportPDF}
  className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-lg"
>
  <FiDownload className="w-5 h-5" />
  Export PDF
</button>

<button
  onClick={handleExportExcel}
  className="flex items-center gap-2 px-6 py-2 bg-white text-black border"
>
  <FiDownload className="w-5 h-5" />
  Export Excel
</button>
```

## Helper Functions

### format_rupiah()

```php
function format_rupiah($amount): string
{
    if ($amount == 0) {
        return 'Rp0';
    }
    
    // number_format($amount, decimals, decimal_sep, thousands_sep)
    $formatted = number_format($amount, 0, ',', '.');
    
    return 'Rp' . $formatted;
}

// Examples:
format_rupiah(0)        // "Rp0"
format_rupiah(1000)     // "Rp1.000"
format_rupiah(1000000)  // "Rp1.000.000"
format_rupiah(606000)   // "Rp606.000"
```

## Routes

```php
// Get sales data (API)
GET /admin/sales-reports?timeframe=monthly
Response: {
    "totalRevenue": 884000,
    "totalTransactions": 4,
    "mostSoldProduct": "Elegance Noir",
    "salesData": [...]
}

// Export PDF
GET /admin/sales-reports/export/pdf
Response: Blob (PDF file)
Header: Content-Disposition: attachment; filename="SALES-REPORT-DATA-08-12-2025.pdf"

// Export Excel
GET /admin/sales-reports/export/excel
Response: Blob (Excel file)
Header: Content-Disposition: attachment; filename="SALES-REPORT-DATA-08-12-2025.xlsx"
```

## Excel Sheet Structure

### All Sheets (Daily, Weekly, Monthly, Yearly)

```
[Row 1] 5SCENT                          (Poppins Bold 14px, merged across columns)
[Row 2] Exported by: Admin Name         (Font 10px)
[Row 3] Generated at: 08-12-2025 21:03  (Font 10px)
[Row 4] [empty]
[Row 5] | Date/Week/Month/Year | Orders | Revenue | Avg Revenue |  (Headers)
[Row 6] | Data Row 1          | 0      | Rp0     | Rp0         |
[Row 7] | Data Row 2          | 2      | Rp606   | Rp303       |
...
```

## PDF Blade View Structure

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Poppins', sans-serif; }
        .logo { font-size: 20px; font-weight: 700; }
        table { border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 8px; }
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
                <td>{{ $row['orders'] }}</td>
                <td>{{ format_rupiah($row['revenue']) }}</td>
                <td>{{ format_rupiah($row['avg_revenue']) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Weekly, Monthly, Yearly tables follow same pattern -->
</body>
</html>
```

## File Download Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User clicks "Export PDF" button                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │ fetch('/admin/sales-     │
        │ reports/export/pdf')     │
        └──────────────┬───────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ SalesReportController::exportPdf │
        └──────────────┬───────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
    Get Sales Data         Get Admin Info
    (getDailySales, etc.)  (auth()->user()->name)
        │                             │
        └──────────────┬──────────────┘
                       │
                       ▼
        ┌───────────────────────────────────┐
        │ Load Blade View & Generate PDF    │
        │ (Pdf::loadView(...)->download())  │
        └──────────────┬────────────────────┘
                       │
                       ▼
        ┌────────────────────────────────────┐
        │ Return PDF Blob with Header:       │
        │ Content-Disposition: attachment;   │
        │ filename="SALES-REPORT-DATA-...pdf"│
        └──────────────┬─────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ Frontend: Create Object URL &     │
        │ Trigger Browser Download          │
        └──────────────┬───────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ File Downloaded:                  │
        │ SALES-REPORT-DATA-08-12-2025.pdf │
        └──────────────────────────────────┘
```

## Status Codes & Error Handling

### Success
- **Status 200**: PDF/Excel file returned as Blob
- **Content-Type**: application/pdf or application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- **Content-Disposition**: attachment; filename="..."

### Errors
- **Status 500**: Exception occurred during export
- **Response**: `{"error": "Error message"}`
- **Frontend**: Shows error toast to user

## Complete Example: Using the Export Feature

### 1. Backend is running
```bash
cd backend/laravel-5scent
php artisan serve
```

### 2. Frontend is running
```bash
cd frontend/web-5scent
npm run dev
```

### 3. User navigates to Sales Reports
```
http://localhost:3000/admin/reports
```

### 4. User sees dashboard stats
```
Total Revenue: Rp884.000
Total Transactions: 4
Most Sold: Elegance Noir
```

### 5. User clicks "Export PDF"
```
Backend processes:
  - Get all sales data (daily, weekly, monthly, yearly)
  - Format currency with Rp prefix
  - Load Blade view
  - Generate PDF
  - Return as Blob

Frontend:
  - Creates temporary download link
  - Triggers download
  - Shows success toast
  - File saved: SALES-REPORT-DATA-08-12-2025.pdf
```

### 6. User opens PDF
```
Header: 5SCENT, Admin Name, Timestamp
Content: 4 tables (Daily, Weekly, Monthly, Yearly)
Currency: Rp format
```

---

**All implementations complete and ready for testing!** ✅
