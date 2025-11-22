<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

    public function orders(Request $request)
    {
        $query = Order::with('user', 'details.product.images');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $orders = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($orders);
    }

    public function updateOrderStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:Pending,Packaging,Shipping,Delivered,Cancel',
            'tracking_number' => 'nullable|string|max:100',
        ]);

        $order = Order::findOrFail($id);
        $order->update([
            'status' => $validated['status'],
            'tracking_number' => $validated['tracking_number'] ?? $order->tracking_number,
        ]);

        return response()->json($order->load('user', 'details.product'));
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
