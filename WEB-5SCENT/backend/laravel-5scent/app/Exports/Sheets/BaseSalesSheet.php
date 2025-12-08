<?php

namespace App\Exports\Sheets;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

abstract class BaseSalesSheet implements FromArray, WithTitle, WithEvents
{
    protected array $data;
    protected string $adminName;
    protected string $timestamp;
    protected string $labelHeader;
    protected string $sheetTitle;
    protected string $totalLabel;

    public function __construct(
        array $data,
        string $adminName,
        string $timestamp,
        string $labelHeader,
        string $sheetTitle,
        string $totalLabel
    ) {
        $this->data = array_values($data);
        $this->adminName = $adminName;
        $this->timestamp = $timestamp;
        $this->labelHeader = $labelHeader;
        $this->sheetTitle = $sheetTitle;
        $this->totalLabel = $totalLabel;
    }

    public function array(): array
    {
        $rows = [
            ['5SCENT'],
            ['SALES REPORTS'],
            ["Exported by: {$this->adminName}"],
            ["Generated at: {$this->timestamp}"],
            [$this->labelHeader, 'Orders', 'Revenue', 'Avg Revenue'],
        ];

        $totalOrders = 0;
        $totalRevenue = 0.0;

        foreach ($this->data as $item) {
            $orders = $this->parseOrders($item['orders'] ?? null);
            $revenue = $this->parseMoney($item['revenue'] ?? null);
            $avgRevenue = $this->parseMoney($item['avg_revenue'] ?? ($item['avgOrder'] ?? null));

            $rows[] = [
                $this->extractLabel($item),
                $orders === 0 ? '0' : $orders,  // Convert 0 to string "0" to force display
                format_rupiah($revenue),
                format_rupiah($avgRevenue),
            ];

            $totalOrders += $orders;
            $totalRevenue += $revenue;
        }

        $totalOrders = (int) $totalOrders;
        $totalRevenue = (float) $totalRevenue;
        $avgRevenue = $totalOrders > 0 ? (float) round($totalRevenue / $totalOrders) : 0;

        $rows[] = [
            $this->totalLabel,
            $totalOrders === 0 ? '0' : $totalOrders,  // Convert 0 to string "0" to force display
            format_rupiah($totalRevenue),
            format_rupiah($avgRevenue),
        ];

        return $rows;
    }

    public function title(): string
    {
        return $this->sheetTitle;
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $this->styleSheet($event);
            },
        ];
    }

    protected function styleSheet(AfterSheet $event): void
    {
        $sheet = $event->sheet->getDelegate();
        $dataCount = count($this->data);
        $headerRow = 5;
        $firstDataRow = 6;
        $lastDataRow = $dataCount > 0 ? $firstDataRow + $dataCount - 1 : $firstDataRow - 1;
        $totalRow = $firstDataRow + $dataCount;

        $sheet->mergeCells('A1:D1');
        $sheet->mergeCells('A2:D2');
        $sheet->mergeCells('A3:D3');
        $sheet->mergeCells('A4:D4');

        $sheet->getColumnDimension('A')->setWidth(25);
        $sheet->getColumnDimension('B')->setWidth(15);
        $sheet->getColumnDimension('C')->setWidth(18);
        $sheet->getColumnDimension('D')->setWidth(18);

        $sheet->getStyle('A1:D1')->getFont()
            ->setName('Poppins')
            ->setBold(true)
            ->setSize(18);
        $sheet->getStyle('A1:D1')->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->getStyle('A2:D2')->getFont()
            ->setName('Poppins')
            ->setBold(true)
            ->setSize(12);
        $sheet->getStyle('A2:D2')->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->getStyle("A{$headerRow}:D{$headerRow}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]],
        ]);

        if ($dataCount > 0) {
            $sheet->getStyle("A{$firstDataRow}:D{$lastDataRow}")->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT],
            ]);
        }

        $sheet->getStyle("A{$totalRow}:D{$totalRow}")->applyFromArray([
            'font' => ['bold' => true],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'D9E1F2']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]],
        ]);

        // Force Orders column to display numeric zeros instead of blanks
        $sheet->getStyle("B{$firstDataRow}:B{$totalRow}")->getNumberFormat()->setFormatCode('0');
    }

    protected function extractLabel(array $item): string
    {
        return (string) ($item['label'] ?? $item['date'] ?? '');
    }

    protected function parseOrders($value): int
    {
        if ($value === null || $value === '' || !is_numeric($value)) {
            return 0;
        }

        return (int) $value;
    }

    protected function parseMoney($value): float
    {
        if ($value === null || $value === '' || !is_numeric($value)) {
            return 0.0;
        }

        return (float) $value;
    }
}
