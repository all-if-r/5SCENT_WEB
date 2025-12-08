<?php

namespace App\Exports\Sheets;

class WeeklySalesSheet extends BaseSalesSheet
{
    public function __construct(array $data, string $adminName, string $timestamp)
    {
        parent::__construct($data, $adminName, $timestamp, 'Week', 'Weekly Sales', 'Total (Weekly)');
    }
}

