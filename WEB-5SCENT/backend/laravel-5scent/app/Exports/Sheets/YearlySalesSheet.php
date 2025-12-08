<?php

namespace App\Exports\Sheets;

class YearlySalesSheet extends BaseSalesSheet
{
    public function __construct(array $data, string $adminName, string $timestamp)
    {
        parent::__construct($data, $adminName, $timestamp, 'Year', 'Yearly Sales', 'Total (Yearly)');
    }
}
