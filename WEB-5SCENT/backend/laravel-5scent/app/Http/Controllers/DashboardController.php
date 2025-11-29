<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\Payment;
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

    public function dashboardData(Request $request)
    {
        $timeFrame = $request->input('timeframe', 'month'); // week, month, year
        
        // Calculate date range
        if ($timeFrame === 'week') {
            $startDate = now()->startOfWeek();
            $endDate = now()->endOfWeek();
        } elseif ($timeFrame === 'year') {
            $startDate = now()->startOfYear();
            $endDate = now()->endOfYear();
        } else {
            $startDate = now()->startOfMonth();
            $endDate = now()->endOfMonth();
        }

        // Order stats
        $orderStats = [
            'total' => Order::count(),
            'packaging' => Order::where('status', 'Packaging')->count(),
            'shipping' => Order::where('status', 'Shipping')->count(),
            'delivered' => Order::where('status', 'Delivered')->count(),
            'cancelled' => Order::where('status', 'Cancelled')->count(),
        ];

        // Total revenue
        $totalRevenue = Payment::where('status', 'Success')->sum('amount') ?? 0;
        $previousMonthRevenue = Payment::where('status', 'Success')
            ->whereBetween('transaction_time', [now()->subMonth()->startOfMonth(), now()->subMonth()->endOfMonth()])
            ->sum('amount') ?? 0;
        $revenueChange = $previousMonthRevenue > 0 ? (($totalRevenue - $previousMonthRevenue) / $previousMonthRevenue) * 100 : 0;

        // Average order value
        $averageOrderValue = Order::avg('total_price') ?? 0;

        // Total products
        $totalProducts = Product::count();

        // Sales data
        if ($timeFrame === 'week') {
            $salesData = [];
            for ($i = 0; $i < 7; $i++) {
                $date = now()->startOfWeek()->addDays($i);
                $value = Order::whereDate('created_at', $date)
                    ->whereIn('status', ['Delivered', 'Shipping', 'Packaging'])
                    ->sum('total_price') ?? 0;
                
                $salesData[] = [
                    'label' => $date->format('D'),
                    'value' => (float)$value,
                ];
            }
        } elseif ($timeFrame === 'year') {
            $salesData = [];
            for ($i = 1; $i <= 12; $i++) {
                $value = Order::whereMonth('created_at', $i)
                    ->whereYear('created_at', now()->year)
                    ->whereIn('status', ['Delivered', 'Shipping', 'Packaging'])
                    ->sum('total_price') ?? 0;
                
                $salesData[] = [
                    'label' => Carbon::create(now()->year, $i, 1)->format('M'),
                    'value' => (float)$value,
                ];
            }
        } else { // month
            $salesData = [];
            $weeksInMonth = ceil(now()->daysInMonth / 7);
            
            for ($week = 1; $week <= 4; $week++) {
                $weekStart = now()->startOfMonth()->addWeeks($week - 1);
                $weekEnd = $weekStart->copy()->addDays(6);
                
                $value = Order::whereBetween('created_at', [$weekStart, $weekEnd])
                    ->whereIn('status', ['Delivered', 'Shipping', 'Packaging'])
                    ->sum('total_price') ?? 0;
                
                $salesData[] = [
                    'label' => 'Week ' . $week,
                    'value' => (float)$value,
                ];
            }
        }

        // Best sellers - filter by rating >= 4.5, sort by rating descending, limit to 5
        $bestSellers = Product::with('images')
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
                    'stock' => $product->stock_30ml ?? 0,
                    'image' => $product->images->first()?->image_url,
                ];
            })
            ->values();

        // Recent orders
        $recentOrders = Order::with('user', 'details.product.images', 'payment')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function($order) {
                $createdDate = $order->created_at;
                if (is_string($createdDate)) {
                    $createdDate = \Carbon\Carbon::parse($createdDate);
                }
                return [
                    'order_id' => $order->order_id,
                    'order_no' => '#ORD-' . str_pad($order->order_id, 4, '0', STR_PAD_LEFT),
                    'customer_name' => $order->user?->name ?? 'Unknown',
                    'total' => $order->total_price ?? 0,
                    'date' => $createdDate->format('Y-m-d'),
                    'status' => $order->status ?? 'Pending',
                    'items_count' => $order->details->count(),
                ];
            });

        return response()->json([
            'orderStats' => $orderStats,
            'totalRevenue' => $totalRevenue,
            'averageOrderValue' => $averageOrderValue,
            'totalProducts' => $totalProducts,
            'revenueChange' => round($revenueChange, 1),
            'salesData' => $salesData,
            'bestSellers' => $bestSellers,
            'recentOrders' => $recentOrders,
        ]);
    }

    public function orders(Request $request)
    {
        $query = Order::with('user', 'details.product.images');

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
            'status' => 'required|in:Pending,Packaging,Shipping,Delivered,Cancel,Cancelled',
            'tracking_number' => 'nullable|string|max:100',
        ]);

        $order = Order::findOrFail($id);
        $order->update([
            'status' => $validated['status'],
            'tracking_number' => $validated['tracking_number'] ?? $order->tracking_number,
        ]);

        return response()->json($order->load('user', 'details.product.images', 'payment'));
    }

    public function salesReport(Request $request)
    {
        $startDate = $request->input('start_date', now()->startOfMonth());
        $endDate = $request->input('end_date', now()->endOfMonth());

        $orders = Order::with('details.product', 'payment')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereHas('payment', function($q) {
                $q->where('status', 'Success');
            })
            ->get();

        $report = [
            'period' => [
                'start' => $startDate,
                'end' => $endDate,
            ],
            'total_revenue' => $orders->sum('total_price'),
            'total_orders' => $orders->count(),
            'orders' => $orders,
        ];

        return response()->json($report);
    }
}
