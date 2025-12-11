<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\Payment;
use App\Models\PosTransaction;
use App\Services\SalesReportService;
use App\Services\NotificationService;
use App\Helpers\OrderCodeHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function stats()
    {
        $totalOrders = Order::count();
        $totalRevenue = Payment::where('status', 'Success')->sum('amount');
        $totalProducts = Product::count();
        $totalUsers = User::count();

        $recentOrders = Order::with('user', 'details.product')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'stats' => [
                'total_orders' => $totalOrders,
                'total_revenue' => $totalRevenue,
                'total_products' => $totalProducts,
                'total_users' => $totalUsers,
            ],
            'recent_orders' => $recentOrders,
        ]);
    }

    public function dashboardData(Request $request, SalesReportService $salesReportService)
    {
        $timeFrame = strtolower($request->input('timeframe', 'month')); // week, month, year, monthly, yearly
        
        // Normalize timeframe values
        if ($timeFrame === 'monthly') {
            $timeFrame = 'month';
        } elseif ($timeFrame === 'yearly') {
            $timeFrame = 'year';
        }
        
        // Get most sold product
        $mostSoldProduct = $salesReportService->getMostSoldProduct() ?? 'N/A';
        
        // Calculate date range
        if ($timeFrame === 'week' || $timeFrame === 'weekly') {
            $startDate = now()->startOfWeek();
            $endDate = now()->endOfWeek();
        } elseif ($timeFrame === 'year') {
            $startDate = now()->startOfYear();
            $endDate = now()->endOfYear();
        } else {
            $startDate = now()->startOfMonth();
            $endDate = now()->endOfMonth();
        }

        // Order stats - include both orders and POS transactions for total
        // Count ALL orders for total transactions, but only Packaging/Shipping/Delivered for revenue
        $totalOrders = Order::count();
        $totalPosTransactions = PosTransaction::count();
        $totalProducts = Product::count();
        
        $orderStats = [
            'total' => $totalOrders + $totalPosTransactions,
            'pending' => Order::where('status', 'Pending')->count(),
            'packaging' => Order::where('status', 'Packaging')->count(),
            'shipping' => Order::where('status', 'Shipping')->count(),
            'delivered' => Order::where('status', 'Delivered')->count(),
            'cancelled' => Order::where('status', 'Cancelled')->count(),
            'pos_orders' => $totalPosTransactions,
            'total_products' => $totalProducts,
        ];

        // Total revenue - exclude Pending orders + include POS transactions
        $orderRevenue = Order::whereIn('status', ['Packaging', 'Shipping', 'Delivered'])
            ->sum('total_price') ?? 0;
        $posRevenue = PosTransaction::sum('total_price') ?? 0;
        $totalRevenue = $orderRevenue + $posRevenue;
        
        // Previous month revenue - exclude Pending orders + include POS transactions
        $previousOrderRevenue = Order::whereIn('status', ['Packaging', 'Shipping', 'Delivered'])
            ->whereBetween('created_at', [now()->subMonth()->startOfMonth(), now()->subMonth()->endOfMonth()])
            ->sum('total_price') ?? 0;
        $previousPosRevenue = PosTransaction::whereBetween('created_at', [now()->subMonth()->startOfMonth(), now()->subMonth()->endOfMonth()])
            ->sum('total_price') ?? 0;
        $previousMonthRevenue = $previousOrderRevenue + $previousPosRevenue;
        
        $revenueChange = $previousMonthRevenue > 0 
            ? (($totalRevenue - $previousMonthRevenue) / $previousMonthRevenue) * 100 
            : 0;

        // Average order value - exclude Pending orders + include POS transactions
        $completedOrdersCount = Order::whereIn('status', ['Packaging', 'Shipping', 'Delivered'])->count();
        $posTransactionCount = PosTransaction::count();
        $totalTransactionCount = $completedOrdersCount + $posTransactionCount;
        $averageOrderValue = $totalTransactionCount > 0 
            ? $totalRevenue / $totalTransactionCount 
            : 0;

        // Total products
        $totalProducts = Product::count();

        // Sales data
        if ($timeFrame === 'daily') {
            $salesData = [];
            $dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            for ($i = 0; $i < 7; $i++) {
                $date = now()->startOfWeek()->addDays($i);
                // Count only Delivered, Shipping, Packaging orders + all POS
                $orderCount = Order::whereDate('created_at', $date)
                    ->whereIn('status', ['Delivered', 'Shipping', 'Packaging'])
                    ->count();
                $posCount = PosTransaction::whereDate('created_at', $date)->count();
                $totalCount = $orderCount + $posCount;
                
                // Sum revenue only from Packaging, Shipping, Delivered status
                $orderValue = Order::whereDate('created_at', $date)
                    ->whereIn('status', ['Delivered', 'Shipping', 'Packaging'])
                    ->sum('total_price') ?? 0;
                $posValue = PosTransaction::whereDate('created_at', $date)
                    ->sum('total_price') ?? 0;
                $value = $orderValue + $posValue;
                $avgOrder = $totalCount > 0 ? $value / $totalCount : 0;
                
                $dayOfWeek = $date->dayOfWeek; // 0 = Sunday, 1 = Monday, etc.
                $salesData[] = [
                    'label' => $dayNames[$dayOfWeek],
                    'orders' => $totalCount,
                    'revenue' => (float)$value,
                    'avgOrder' => (float)$avgOrder,
                ];
            }
        } elseif ($timeFrame === 'weekly') {
            // Show 5 weeks of current month
            $salesData = [];
            $monthStart = now()->startOfMonth();
            $monthEnd = now()->endOfMonth();
            
            // Week 1: Start of month to end of first week
            $week1Start = $monthStart->copy();
            $week1End = $monthStart->copy()->endOfWeek();
            
            // Weeks 2-5: Each starting at the beginning of a week
            $weeks = [];
            $weeks[] = ['start' => $week1Start, 'end' => $week1End];
            
            // Calculate remaining weeks
            $currentWeekStart = $week1End->copy()->addDay()->startOfWeek();
            $weekCount = 2;
            
            while ($currentWeekStart < $monthEnd && $weekCount <= 5) {
                $currentWeekEnd = $currentWeekStart->copy()->endOfWeek();
                // Don't extend beyond month end
                if ($currentWeekEnd > $monthEnd) {
                    $currentWeekEnd = $monthEnd;
                }
                $weeks[] = ['start' => $currentWeekStart, 'end' => $currentWeekEnd];
                $currentWeekStart = $currentWeekEnd->copy()->addDay()->startOfWeek();
                $weekCount++;
            }
            
            foreach ($weeks as $index => $week) {
                $weekStart = $week['start'];
                $weekEnd = $week['end'];
                
                // Count only Delivered, Shipping, Packaging orders + all POS
                $orderCount = Order::whereBetween('created_at', [$weekStart, $weekEnd])
                    ->whereIn('status', ['Delivered', 'Shipping', 'Packaging'])
                    ->count();
                $posCount = PosTransaction::whereBetween('created_at', [$weekStart, $weekEnd])->count();
                $totalCount = $orderCount + $posCount;
                
                // Sum revenue only from Packaging, Shipping, Delivered status
                $orderValue = Order::whereBetween('created_at', [$weekStart, $weekEnd])
                    ->whereIn('status', ['Delivered', 'Shipping', 'Packaging'])
                    ->sum('total_price') ?? 0;
                $posValue = PosTransaction::whereBetween('created_at', [$weekStart, $weekEnd])
                    ->sum('total_price') ?? 0;
                $value = $orderValue + $posValue;
                $avgOrder = $totalCount > 0 ? $value / $totalCount : 0;
                
                $salesData[] = [
                    'label' => 'Week ' . ($index + 1),
                    'orders' => $totalCount,
                    'revenue' => (float)$value,
                    'avgOrder' => (float)$avgOrder,
                ];
            }
        } elseif ($timeFrame === 'year') {
            // Show years: current year and 10 years back (e.g., 2015-2025)
            $salesData = [];
            $currentYear = now()->year;
            for ($i = 10; $i >= 0; $i--) {
                $year = $currentYear - $i;
                // Count only Delivered, Shipping, Packaging orders + all POS
                $orderCount = Order::whereYear('created_at', $year)
                    ->whereIn('status', ['Delivered', 'Shipping', 'Packaging'])
                    ->count();
                $posCount = PosTransaction::whereYear('created_at', $year)->count();
                $totalCount = $orderCount + $posCount;
                
                // Sum revenue only from Packaging, Shipping, Delivered status
                $orderValue = Order::whereYear('created_at', $year)
                    ->whereIn('status', ['Delivered', 'Shipping', 'Packaging'])
                    ->sum('total_price') ?? 0;
                $posValue = PosTransaction::whereYear('created_at', $year)
                    ->sum('total_price') ?? 0;
                $value = $orderValue + $posValue;
                $avgOrder = $totalCount > 0 ? $value / $totalCount : 0;
                
                $salesData[] = [
                    'label' => (string)$year,
                    'orders' => $totalCount,
                    'revenue' => (float)$value,
                    'avgOrder' => (float)$avgOrder,
                ];
            }
        } else { // month - show past 12 months
            $salesData = [];
            for ($i = 0; $i < 12; $i++) {
                // Calculate month going backwards from current month
                $monthDate = Carbon::now()->subMonths(11 - $i);
                $monthStart = $monthDate->copy()->startOfMonth();
                $monthEnd = $monthDate->copy()->endOfMonth();
                
                // Count only Delivered, Shipping, Packaging orders + all POS transactions
                $orderCount = Order::whereBetween('created_at', [$monthStart, $monthEnd])
                    ->whereIn('status', ['Delivered', 'Shipping', 'Packaging'])
                    ->count();
                $posCount = PosTransaction::whereBetween('created_at', [$monthStart, $monthEnd])->count();
                $totalCount = $orderCount + $posCount;
                
                // Sum revenue only from Packaging, Shipping, Delivered status
                $orderValue = Order::whereBetween('created_at', [$monthStart, $monthEnd])
                    ->whereIn('status', ['Delivered', 'Shipping', 'Packaging'])
                    ->sum('total_price') ?? 0;
                $posValue = PosTransaction::whereBetween('created_at', [$monthStart, $monthEnd])
                    ->sum('total_price') ?? 0;
                $monthRevenue = (float)($orderValue + $posValue);
                $avgOrder = $totalCount > 0 ? $monthRevenue / $totalCount : 0;
                
                $salesData[] = [
                    'label' => $monthDate->format('M Y'),
                    'orders' => $totalCount,
                    'revenue' => $monthRevenue,
                    'avgOrder' => $avgOrder,
                ];
            }
        }

        // Best sellers - filter by rating >= 4.5, sort by rating descending, limit to 5
        $bestSellers = Product::with('images')
            ->distinct()
            ->withCount('orderDetails')
            ->get()
            ->filter(function($product) {
                // Filter products with rating >= 4.5
                $rating = (float)($product->average_rating ?? 0);
                return $rating >= 4.5;
            })
            ->sortByDesc(function($product) {
                // Sort by rating descending
                return (float)($product->average_rating ?? 0);
            })
            ->take(5)
            ->map(function($product) {
                return [
                    'product_id' => $product->product_id,
                    'name' => $product->name,
                    'rating' => (float)($product->average_rating ?? 4.5),
                    'stock' => ($product->stock_30ml ?? 0) + ($product->stock_50ml ?? 0),
                    'image' => $product->images->first()?->image_url,
                ];
            })
            ->values();

        // Recent orders and POS transactions combined
        $orders = Order::with('user', 'details.product.images', 'payment')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function($order) {
                $createdDate = $order->created_at;
                if (is_string($createdDate)) {
                    $createdDate = \Carbon\Carbon::parse($createdDate);
                }
                // Format: #ORD-DD-MM-YYYY-XXX (3 digit order_id)
                $formattedDate = $createdDate->format('d-m-Y');
                $orderId = str_pad($order->order_id, 3, '0', STR_PAD_LEFT);
                $totalQuantity = $order->details->sum('quantity') ?? 0;
                
                return [
                    'order_id' => $order->order_id,
                    'order_no' => "#ORD-{$formattedDate}-{$orderId}",
                    'customer_name' => $order->user?->name ?? 'Unknown',
                    'total' => $order->total_price ?? 0,
                    'date' => $createdDate->format('Y-m-d'),
                    'status' => $order->status ?? 'Pending',
                    'items_count' => $totalQuantity,
                ];
            });

        $posTransactions = PosTransaction::orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function($transaction) {
                $createdDate = $transaction->created_at;
                if (is_string($createdDate)) {
                    $createdDate = \Carbon\Carbon::parse($createdDate);
                }
                if (!$createdDate) {
                    $createdDate = \Carbon\Carbon::now();
                }
                // Format: #POS-DD-MM-YYYY-XXX (3 digit transaction_id)
                $formattedDate = $createdDate->format('d-m-Y');
                $transactionId = str_pad($transaction->transaction_id, 3, '0', STR_PAD_LEFT);
                $totalQuantity = $transaction->items->sum('quantity') ?? 0;
                
                return [
                    'order_id' => $transaction->transaction_id,
                    'order_no' => "#POS-{$formattedDate}-{$transactionId}",
                    'customer_name' => $transaction->customer_name,
                    'total' => $transaction->total_price ?? 0,
                    'date' => $createdDate->format('Y-m-d'),
                    'status' => 'POS',
                    'items_count' => $totalQuantity,
                ];
            });

        // Combine and sort by date descending, limit to 10
        $recentOrders = $orders->concat($posTransactions)
            ->sortByDesc('date')
            ->take(10)
            ->values();

        // Build cards array for frontend 2x4 grid
        $cards = [
            [
                'label' => 'Total Orders',
                'value' => $orderStats['total'] ?? 0,
                'icon' => 'FiShoppingBag',
            ],
            [
                'label' => 'Pending',
                'value' => $orderStats['pending'] ?? 0,
                'icon' => 'LuClock',
            ],
            [
                'label' => 'Packaging',
                'value' => $orderStats['packaging'] ?? 0,
                'icon' => 'LuPackage2',
            ],
            [
                'label' => 'Shipping',
                'value' => $orderStats['shipping'] ?? 0,
                'icon' => 'TruckIcon',
            ],
            [
                'label' => 'Delivered',
                'value' => $orderStats['delivered'] ?? 0,
                'icon' => 'CheckCircleIcon',
            ],
            [
                'label' => 'Cancelled',
                'value' => $orderStats['cancelled'] ?? 0,
                'icon' => 'XCircleIcon',
            ],
            [
                'label' => 'POS Orders',
                'value' => $orderStats['pos_orders'] ?? 0,
                'icon' => 'LuCalculator',
            ],
            [
                'label' => 'Total Products',
                'value' => $totalProducts,
                'icon' => 'FiPackage',
            ],
        ];

        // Build salesOverview array for chart
        $salesOverview = $salesData;

        // Return new structure for frontend
        return response()->json([
            'cards' => $cards,
            'revenue' => [
                'total' => $totalRevenue,
                'change' => round($revenueChange, 1),
                'averageOrderValue' => $averageOrderValue,
            ],
            'salesOverview' => $salesOverview,
            'bestSellers' => $bestSellers,
            'recentOrders' => $recentOrders,
            'mostSoldProduct' => $mostSoldProduct,
        ]);
    }

    public function orders(Request $request)
    {
        $query = Order::with('user', 'details.product.images', 'payment')->select('*');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Search by order_id or customer name
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('order_id', 'LIKE', "%{$search}%")
                  ->orWhereHas('user', function($userQuery) use ($search) {
                      $userQuery->where('name', 'LIKE', "%{$search}%");
                  });
            });
        }

        $orders = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($orders);
    }

    public function updateOrderStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'nullable|in:Pending,Packaging,Shipping,Delivered,Cancel,Cancelled',
            'tracking_number' => 'nullable|string|max:100',
            'payment_status' => 'nullable|in:Pending,Success,Failed,Refunded',
        ]);

        $order = Order::with('payment')->findOrFail($id);
        $orderCode = OrderCodeHelper::formatOrderCode($order);
        
        // Store old status to detect changes
        $oldStatus = $order->status;
        $oldPaymentStatus = $order->payment?->status;
        
        // Prepare update array for order
        $orderUpdateData = [];
        
        // Update order status if provided and different
        if (!empty($validated['status']) && $order->status !== $validated['status']) {
            $newStatus = $validated['status'];
            $orderUpdateData['status'] = $newStatus;
            
            // Create OrderUpdate notification based on new status
            match($newStatus) {
                'Packaging' => NotificationService::createOrderUpdateNotification(
                    $order->order_id,
                    "Your order {$orderCode} is being carefully packaged."
                ),
                'Shipping' => NotificationService::createOrderUpdateNotification(
                    $order->order_id,
                    "Your order {$orderCode} has been shipped. Track your package for delivery updates."
                ),
                'Delivered' => [
                    NotificationService::createOrderUpdateNotification(
                        $order->order_id,
                        "Your order {$orderCode} has been delivered."
                    ),
                    NotificationService::createDeliveryNotification($order->order_id),
                ],
                'Cancelled' => NotificationService::createOrderUpdateNotification(
                    $order->order_id,
                    "Your order {$orderCode} has been cancelled."
                ),
                default => null,
            };
        }
        
        // Update tracking number if provided
        if (!empty($validated['tracking_number'])) {
            $orderUpdateData['tracking_number'] = $validated['tracking_number'];
        }
        
        // Apply order updates if there are any
        if (!empty($orderUpdateData)) {
            $order->update($orderUpdateData);
        }
        
        // Update payment status if provided and different
        if (!empty($validated['payment_status']) && $order->payment && $order->payment->status !== $validated['payment_status']) {
            $newPaymentStatus = $validated['payment_status'];
            $order->payment->update([
                'status' => $newPaymentStatus,
            ]);
            
            // Create Payment notification based on new payment status
            match($newPaymentStatus) {
                'Pending' => NotificationService::createPaymentNotification(
                    $order->order_id,
                    "Your payment for order {$orderCode} is pending and is being processed."
                ),
                'Success' => NotificationService::createPaymentNotification(
                    $order->order_id,
                    "Your payment for order {$orderCode} was successful. Thank you for your purchase."
                ),
                'Failed' => NotificationService::createPaymentNotification(
                    $order->order_id,
                    "Your payment for order {$orderCode} failed. Please try again or use another payment method."
                ),
                'Refunded' => NotificationService::createRefundNotification(
                    $order->order_id,
                    "Your payment for order {$orderCode} has been refunded. The funds will be returned to your account shortly."
                ),
                default => null,
            };
        }

        return response()->json($order->fresh()->load('user', 'details.product.images', 'payment'));
    }

    /**
     * Get sales report data based on timeframe
     * Uses SalesReportService for business logic
     */
    public function salesReport(Request $request, SalesReportService $salesService)
    {
        $timeframe = strtolower($request->input('timeframe', 'monthly'));
        $date = now(); // You can make this configurable if needed
        
        // Get total revenue and transactions (global, not filtered by timeframe)
        $totalRevenue = $salesService->getTotalRevenue();
        $totalTransactions = $salesService->getTotalTransactions();
        
        // Get sales data based on selected timeframe
        $salesData = [];
        
        switch ($timeframe) {
            case 'daily':
                $salesData = $salesService->getDailySales($date);
                break;
            case 'weekly':
                $salesData = $salesService->getWeeklySales($date);
                break;
            case 'monthly':
                $salesData = $salesService->getMonthlySales($date);
                break;
            case 'yearly':
                $salesData = $salesService->getYearlySales($date);
                break;
            default:
                $salesData = $salesService->getMonthlySales($date);
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
            'salesData' => $formattedSalesData,
        ]);
    }
}
