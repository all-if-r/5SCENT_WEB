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
     * Display the sales report page
     */
    public function index(Request $request)
    {
        $timeframe = strtolower($request->input('timeframe', 'monthly'));
        $date = now();

        // Get total revenue and transactions (global, not filtered by timeframe)
        $totalRevenue = $this->salesReportService->getTotalRevenue();
        $totalTransactions = $this->salesReportService->getTotalTransactions();
        $mostSoldProduct = $this->salesReportService->getMostSoldProduct();

        // Get sales data based on selected timeframe
        $salesData = [];

        switch ($timeframe) {
            case 'daily':
                $salesData = $this->salesReportService->getDailySales($date);
                break;
            case 'weekly':
                $salesData = $this->salesReportService->getWeeklySales($date);
                break;
            case 'monthly':
                $salesData = $this->salesReportService->getMonthlySales($date);
                break;
            case 'yearly':
                $salesData = $this->salesReportService->getYearlySales($date);
                break;
            default:
                $salesData = $this->salesReportService->getMonthlySales($date);
        }

        // Format the sales data for frontend
        $formattedSalesData = array_map(function($item) {
            return [
                'date' => $item['date'],
                'orders' => $item['orders'],
                'revenue' => $item['revenue'],
                'avgOrder' => $item['avg_revenue'],
            ];
        }, $salesData);

        return response()->json([
            'totalRevenue' => $totalRevenue,
            'totalTransactions' => $totalTransactions,
            'mostSoldProduct' => $mostSoldProduct ?? 'N/A',
            'salesData' => $formattedSalesData,
        ]);
    }

    /**
     * Export sales report as PDF
     */
    public function exportPdf(Request $request)
    {
        try {
            $date = now();
            $adminName = auth()->user()->name ?? 'Unknown Admin';
            $timestamp = $date->format('d-m-Y H:i');

            // Get all datasets
            $daily = $this->salesReportService->getDailySales($date);
            $weekly = $this->salesReportService->getWeeklySales($date);
            $monthly = $this->salesReportService->getMonthlySales($date);
            $yearly = $this->salesReportService->getYearlySales($date);

            // Build filename
            $fileName = 'SALES-REPORT-DATA-' . $date->format('d-m-Y') . '.pdf';

            // Load and generate PDF
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
     */
    public function exportExcel(Request $request)
    {
        try {
            $date = now();
            $adminName = auth()->user()->name ?? 'Unknown Admin';

            // Build filename
            $fileName = 'SALES-REPORT-DATA-' . $date->format('d-m-Y') . '.xlsx';

            // Generate and download Excel
            return Excel::download(
                new SalesReportExport($this->salesReportService, $date, $adminName, $date),
                $fileName
            );
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
