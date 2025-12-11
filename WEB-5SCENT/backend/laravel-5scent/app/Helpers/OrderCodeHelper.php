<?php

namespace App\Helpers;

use App\Models\Order;

class OrderCodeHelper
{
    /**
     * Format order code in the format #ORD-DD-MM-YYYY-XXX
     *
     * @param Order $order
     * @return string
     *
     * Example: #ORD-10-12-2025-025 for order_id=25 created on 2025-12-10
     */
    public static function formatOrderCode(Order $order): string
    {
        $date = $order->created_at;
        $day = $date->format('d');
        $month = $date->format('m');
        $year = $date->format('Y');
        $idPadded = sprintf('%03d', $order->order_id);

        return "#ORD-{$day}-{$month}-{$year}-{$idPadded}";
    }
}
