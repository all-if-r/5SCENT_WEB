<?php

namespace App\Exports\Sheets;

class DailySalesSheet extends BaseSalesSheet
{
    public function __construct(array $data, string $adminName, string $timestamp)
    {
        parent::__construct($data, $adminName, $timestamp, 'Day', 'Daily Sales', 'Total (Daily)');
    }
}
