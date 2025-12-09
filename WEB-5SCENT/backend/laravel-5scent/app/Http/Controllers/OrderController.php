<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\Payment;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $status = strtolower($request->query('status', ''));

        $ordersQuery = Order::with('details.product.images', 'user', 'payment')
            ->where('user_id', $request->user()->user_id)
            ->orderBy('created_at', 'desc');

        if ($status === 'all') {
            return response()->json($ordersQuery->get());
        }

        if (!empty($status) && $status !== 'all') {
            switch ($status) {
                case 'pending':
                    $ordersQuery->where('status', 'Pending');
                    break;
                case 'packaging':
                    $ordersQuery->where('status', 'Packaging');
                    break;
                case 'shipping':
                    $ordersQuery->where('status', 'Shipping');
                    break;
                case 'delivered':
                    $ordersQuery->where('status', 'Delivered');
                    break;
                case 'cancel':
                case 'cancelled':
                    $ordersQuery->where('status', 'Cancelled');
                    break;
                default:
                    // If an unknown status is provided, fall back to all orders
                    break;
            }

            return response()->json($ordersQuery->get());
        }

        $orders = $ordersQuery->get();

        $grouped = [
            'in_process' => $orders->whereIn('status', ['Pending', 'Packaging'])->values()->all(),
            'shipping' => $orders->where('status', 'Shipping')->values()->all(),
            'completed' => $orders->where('status', 'Delivered')->values()->all(),
            'canceled' => $orders->where('status', 'Cancelled')->values()->all(),
        ];

        return response()->json($grouped);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'cart_ids' => 'required|array',
            'cart_ids.*' => 'exists:cart,cart_id',
            'shipping_address' => 'required|string|max:255',
            'payment_method' => 'required|in:QRIS,Virtual_Account,Cash',
        ]);

        $cartItems = Cart::with('product')
            ->where('user_id', $request->user()->user_id)
            ->whereIn('cart_id', $validated['cart_ids'])
            ->get();

        if ($cartItems->isEmpty()) {
            return response()->json(['message' => 'Cart is empty'], 400);
        }

        // Calculate subtotal (sum of all items before tax)
        $subtotal = $cartItems->sum(function($item) {
            $price = $item->size === '30ml' 
                ? $item->product->price_30ml 
                : $item->product->price_50ml;

            return $price * $item->quantity;
        });

        // Calculate total with 5% tax
        $tax = $subtotal * 0.05;
        $totalPrice = $subtotal + $tax;

        // If payment method is Cash, automatically set status to Packaging
        $orderStatus = $validated['payment_method'] === 'Cash' ? 'Packaging' : 'Pending';

        $order = Order::create([
            'user_id' => $request->user()->user_id,
            'status' => $orderStatus,
            'shipping_address' => $validated['shipping_address'],
            'subtotal' => $subtotal,
            'total_price' => $totalPrice,
            'payment_method' => $validated['payment_method'],
        ]);

        foreach ($cartItems as $cartItem) {
            $price = $cartItem->size === '30ml' 
                ? $cartItem->product->price_30ml 
                : $cartItem->product->price_50ml;
            
            $subtotal = $price * $cartItem->quantity;

            OrderDetail::create([
                'order_id' => $order->order_id,
                'product_id' => $cartItem->product_id,
                'size' => $cartItem->size,
                'quantity' => $cartItem->quantity,
                'price' => $price,
                'subtotal' => $subtotal,
            ]);

            // Update stock
            $stockField = $cartItem->size === '30ml' ? 'stock_30ml' : 'stock_50ml';
            $cartItem->product->decrement($stockField, $cartItem->quantity);

            $cartItem->delete();
        }

        // Create payment record with matching created_at timestamp
        $paymentStatus = 'Pending'; // Default to pending
        
        // For QRIS or Virtual Account, status is Pending (waiting for transfer)
        // For Cash, status is also Pending (waiting for delivery)
        
        Payment::create([
            'order_id' => $order->order_id,
            'method' => $validated['payment_method'],
            'amount' => $totalPrice,
            'status' => $paymentStatus,
            'created_at' => $order->created_at,
        ]);

        return response()->json($order->load('details.product.images', 'payment'), 201);
    }

    public function show($id, Request $request)
    {
        $order = Order::with('details.product.images', 'payment')
            ->where('user_id', $request->user()->user_id)
            ->findOrFail($id);

        return response()->json($order);
    }

    public function cancel($id, Request $request)
    {
        $order = Order::where('user_id', $request->user()->user_id)
            ->findOrFail($id);

        if (!$order->canBeCancelled()) {
            return response()->json([
                'message' => 'Order can only be cancelled during Packaging status'
            ], 400);
        }

        $order->update(['status' => 'Cancel']);

        // Restore stock
        foreach ($order->details as $detail) {
            $stockField = $detail->size === '30ml' ? 'stock_30ml' : 'stock_50ml';
            $detail->product->increment($stockField, $detail->quantity);
        }

        return response()->json(['message' => 'Order cancelled successfully']);
    }

    public function finish($id, Request $request)
    {
        $order = Order::where('user_id', $request->user()->user_id)
            ->findOrFail($id);

        if ($order->status !== 'Shipping') {
            return response()->json([
                'message' => 'Order can only be finished when status is Shipping'
            ], 400);
        }

        $order->update(['status' => 'Delivered']);

        return response()->json(['message' => 'Order finished successfully']);
    }

    public function update($id, Request $request)
    {
        $order = Order::where('user_id', $request->user()->user_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'status' => 'sometimes|in:Pending,Packaging,Shipping,Delivered,Cancelled',
        ]);

        if (isset($validated['status'])) {
            $order->update(['status' => $validated['status']]);
        }

        return response()->json($order->load('details.product.images', 'payment'));
    }
}
