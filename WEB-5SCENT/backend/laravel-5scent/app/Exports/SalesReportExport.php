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
