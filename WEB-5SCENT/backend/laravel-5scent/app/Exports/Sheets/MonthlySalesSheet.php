<?php

namespace App\Exports\Sheets;

class MonthlySalesSheet extends BaseSalesSheet
{
    public function __construct(array $data, string $adminName, string $timestamp)
    {
        parent::__construct($data, $adminName, $timestamp, 'Month', 'Monthly Sales', 'Total (Monthly)');
    }
}
