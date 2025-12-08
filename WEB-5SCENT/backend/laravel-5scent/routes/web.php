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


