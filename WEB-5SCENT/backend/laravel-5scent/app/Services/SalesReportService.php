<?php

namespace App\Services;

use App\Models\Order;
use App\Models\PosTransaction;
use App\Models\OrderDetail;
use App\Models\PosItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SalesReportService
{
    /**
     * Get total revenue from completed orders and all POS transactions
     * 
     * @return float
     */
    public function getTotalRevenue(): float
    {
        // Sum of completed online orders (Packaging, Shipping, Delivered)
        $onlineRevenue = Order::completed()->sum('total_price') ?? 0;
        
        // Sum of ALL POS transactions
        $posRevenue = PosTransaction::sum('total_price') ?? 0;
        
        return (float)($onlineRevenue + $posRevenue);
    }

    /**
     * Get total transaction count (ALL orders + ALL POS)
     * 
     * @return int
     */
    public function getTotalTransactions(): int
    {
        // Count ALL online orders (including Pending and Cancelled)
        $onlineCount = Order::count();
        
        // Count ALL POS transactions
        $posCount = PosTransaction::count();
        
        return $onlineCount + $posCount;
    }

    /**
     * Get daily sales for the current week (Monday to Sunday)
     * 
     * @param Carbon $date
     * @return array
     */
    public function getDailySales(Carbon $date): array
    {
        $salesData = [];
        $startOfWeek = $date->copy()->startOfWeek();
        
        for ($i = 0; $i < 7; $i++) {
            $currentDate = $startOfWeek->copy()->addDays($i);
            
            // Count completed online orders for this day
            $onlineOrders = Order::completed()
                ->whereDate('created_at', $currentDate)
                ->count();
            
            // Count ALL POS transactions for this day
            $posOrders = PosTransaction::whereDate('created_at', $currentDate)
                ->count();
            
            $totalOrders = $onlineOrders + $posOrders;
            
            // Revenue from completed online orders
            $onlineRevenue = Order::completed()
                ->whereDate('created_at', $currentDate)
                ->sum('total_price') ?? 0;
            
            // Revenue from POS transactions
            $posRevenue = PosTransaction::whereDate('created_at', $currentDate)
                ->sum('total_price') ?? 0;
            
            $totalRevenue = (float)($onlineRevenue + $posRevenue);
            
            // Calculate average revenue
            $avgRevenue = $totalOrders > 0 ? $totalRevenue / $totalOrders : 0;
            
            $salesData[] = [
                'date' => $currentDate->format('l'), // Monday, Tuesday, etc.
                'orders' => $totalOrders,
                'revenue' => $totalRevenue,
                'avg_revenue' => (float)$avgRevenue,
            ];
        }
        
        return $salesData;
    }

    /**
     * Get weekly sales for the current month (4 weeks)
     * 
     * @param Carbon $date
     * @return array
     */
    public function getWeeklySales(Carbon $date): array
    {
        $salesData = [];
        $startOfMonth = $date->copy()->startOfMonth();
        $endOfMonth = $date->copy()->endOfMonth();
        
        // Calculate weeks in the month
        $weeksInMonth = [];
        $currentWeekStart = $startOfMonth->copy();
        
        while ($currentWeekStart->lte($endOfMonth)) {
            $weekEnd = $currentWeekStart->copy()->endOfWeek();
            if ($weekEnd->gt($endOfMonth)) {
                $weekEnd = $endOfMonth->copy();
            }
            
            $weeksInMonth[] = [
                'start' => $currentWeekStart->copy(),
                'end' => $weekEnd->copy(),
            ];
            
            $currentWeekStart->addWeek()->startOfWeek();
        }
        
        foreach ($weeksInMonth as $index => $week) {
            // Count completed online orders for this week
            $onlineOrders = Order::completed()
                ->whereBetween('created_at', [$week['start'], $week['end']])
                ->count();
            
            // Count ALL POS transactions for this week
            $posOrders = PosTransaction::whereBetween('created_at', [$week['start'], $week['end']])
                ->count();
            
            $totalOrders = $onlineOrders + $posOrders;
            
            // Revenue from completed online orders
            $onlineRevenue = Order::completed()
                ->whereBetween('created_at', [$week['start'], $week['end']])
                ->sum('total_price') ?? 0;
            
            // Revenue from POS transactions
            $posRevenue = PosTransaction::whereBetween('created_at', [$week['start'], $week['end']])
                ->sum('total_price') ?? 0;
            
            $totalRevenue = (float)($onlineRevenue + $posRevenue);
            
            // Calculate average revenue
            $avgRevenue = $totalOrders > 0 ? $totalRevenue / $totalOrders : 0;
            
            $salesData[] = [
                'date' => 'Week ' . ($index + 1),
                'orders' => $totalOrders,
                'revenue' => $totalRevenue,
                'avg_revenue' => (float)$avgRevenue,
            ];
        }
        
        return $salesData;
    }

    /**
     * Get monthly sales for the current year (12 months)
     * 
     * @param Carbon $date
     * @return array
     */
    public function getMonthlySales(Carbon $date): array
    {
        $salesData = [];
        $year = $date->year;
        
        for ($month = 1; $month <= 12; $month++) {
            $startOfMonth = Carbon::create($year, $month, 1)->startOfMonth();
            $endOfMonth = Carbon::create($year, $month, 1)->endOfMonth();
            
            // Count completed online orders for this month
            $onlineOrders = Order::completed()
                ->whereBetween('created_at', [$startOfMonth, $endOfMonth])
                ->count();
            
            // Count ALL POS transactions for this month
            $posOrders = PosTransaction::whereBetween('created_at', [$startOfMonth, $endOfMonth])
                ->count();
            
            $totalOrders = $onlineOrders + $posOrders;
            
            // Revenue from completed online orders
            $onlineRevenue = Order::completed()
                ->whereBetween('created_at', [$startOfMonth, $endOfMonth])
                ->sum('total_price') ?? 0;
            
            // Revenue from POS transactions
            $posRevenue = PosTransaction::whereBetween('created_at', [$startOfMonth, $endOfMonth])
                ->sum('total_price') ?? 0;
            
            $totalRevenue = (float)($onlineRevenue + $posRevenue);
            
            // Calculate average revenue
            $avgRevenue = $totalOrders > 0 ? $totalRevenue / $totalOrders : 0;
            
            $salesData[] = [
                'date' => $startOfMonth->format('F'), // January, February, etc.
                'orders' => $totalOrders,
                'revenue' => $totalRevenue,
                'avg_revenue' => (float)$avgRevenue,
            ];
        }
        
        return $salesData;
    }

    /**
     * Get yearly sales (last 10 years or from earliest transaction)
     * 
     * @param Carbon $date
     * @return array
     */
    public function getYearlySales(Carbon $date): array
    {
        $salesData = [];
        $currentYear = $date->year;
        
        // Find earliest transaction year
        $earliestOrder = Order::orderBy('created_at', 'asc')->first();
        $earliestPos = PosTransaction::orderBy('created_at', 'asc')->first();
        
        $earliestYear = $currentYear - 10; // Default to 10 years back
        
        if ($earliestOrder) {
            $earliestYear = min($earliestYear, Carbon::parse($earliestOrder->created_at)->year);
        }
        
        if ($earliestPos) {
            $earliestYear = min($earliestYear, Carbon::parse($earliestPos->created_at)->year);
        }
        
        // Generate data from earliest year to current year
        for ($year = $earliestYear; $year <= $currentYear; $year++) {
            $startOfYear = Carbon::create($year, 1, 1)->startOfYear();
            $endOfYear = Carbon::create($year, 12, 31)->endOfYear();
            
            // Count completed online orders for this year
            $onlineOrders = Order::completed()
                ->whereBetween('created_at', [$startOfYear, $endOfYear])
                ->count();
            
            // Count ALL POS transactions for this year
            $posOrders = PosTransaction::whereBetween('created_at', [$startOfYear, $endOfYear])
                ->count();
            
            $totalOrders = $onlineOrders + $posOrders;
            
            // Revenue from completed online orders
            $onlineRevenue = Order::completed()
                ->whereBetween('created_at', [$startOfYear, $endOfYear])
                ->sum('total_price') ?? 0;
            
            // Revenue from POS transactions
            $posRevenue = PosTransaction::whereBetween('created_at', [$startOfYear, $endOfYear])
                ->sum('total_price') ?? 0;
            
            $totalRevenue = (float)($onlineRevenue + $posRevenue);
            
            // Calculate average revenue
            $avgRevenue = $totalOrders > 0 ? $totalRevenue / $totalOrders : 0;
            
            $salesData[] = [
                'date' => (string)$year,
                'orders' => $totalOrders,
                'revenue' => $totalRevenue,
                'avg_revenue' => (float)$avgRevenue,
            ];
        }
        
        return $salesData;
    }

    /**
     * Get the most sold product by total quantity
     * 
     * Includes:
     * - Online orders with status Packaging, Shipping, Delivered
     * - All POS transactions
     * 
     * Combines online and POS quantities for each product, then returns the one with highest total.
     * 
     * @return string|null Product name or null if no sales
     */
    public function getMostSoldProduct(): ?string
    {
        try {
            // Online orders: join orders with orderdetail, filter by status
            $onlineResult = DB::table('orderdetail')
                ->join('orders', 'orderdetail.order_id', '=', 'orders.order_id')
                ->whereIn('orders.status', ['Packaging', 'Shipping', 'Delivered'])
                ->select('orderdetail.product_id', DB::raw('SUM(orderdetail.quantity) as total_qty'))
                ->groupBy('orderdetail.product_id')
                ->get()
                ->keyBy('product_id')
                ->map(fn($row) => $row->total_qty)
                ->toArray();

            \Log::info('Online orders aggregation', ['count' => count($onlineResult), 'data' => $onlineResult]);

            // POS transactions: join pos_transaction with pos_item, all records
            $posResult = DB::table('pos_item')
                ->join('pos_transaction', 'pos_item.transaction_id', '=', 'pos_transaction.transaction_id')
                ->select('pos_item.product_id', DB::raw('SUM(pos_item.quantity) as total_qty'))
                ->groupBy('pos_item.product_id')
                ->get()
                ->keyBy('product_id')
                ->map(fn($row) => $row->total_qty)
                ->toArray();

            \Log::info('POS transactions aggregation', ['count' => count($posResult), 'data' => $posResult]);

            // Combine quantities: total_qty[product_id] = online_qty + pos_qty
            $combined = [];
            foreach (array_keys(array_merge($onlineResult, $posResult)) as $productId) {
                $combined[$productId] = ($onlineResult[$productId] ?? 0) + ($posResult[$productId] ?? 0);
            }

            \Log::info('Combined quantities', ['count' => count($combined), 'data' => $combined]);

            // If no data, return null
            if (empty($combined)) {
                \Log::warning('No most sold product data found');
                return null;
            }

            // Find product_id with highest total_qty
            $topProductId = array_key_first(array_slice($combined, 0, 1, true));
            $topProductId = array_reduce(
                array_keys($combined),
                fn($carry, $id) => ($combined[$id] > ($combined[$carry] ?? 0)) ? $id : $carry
            );

            \Log::info('Top product ID', ['product_id' => $topProductId, 'quantity' => $combined[$topProductId]]);

            // Get product name from product table
            $product = DB::table('product')
                ->where('product_id', $topProductId)
                ->select('name')
                ->first();

            \Log::info('Product lookup result', ['product_id' => $topProductId, 'product' => $product]);

            return $product ? $product->name : null;
        } catch (\Exception $e) {
            \Log::error('Error in getMostSoldProduct: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return null;
        }
    }
}

