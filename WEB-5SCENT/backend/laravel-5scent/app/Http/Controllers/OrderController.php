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
        $orders = Order::with('details.product.images', 'user', 'payment')
            ->where('user_id', $request->user()->user_id)
            ->orderBy('created_at', 'desc')
            ->get();

        $grouped = [
            'in_process' => $orders->whereIn('status', ['Pending', 'Packaging']),
            'shipping' => $orders->where('status', 'Shipping'),
            'completed' => $orders->where('status', 'Delivered'),
            'canceled' => $orders->where('status', 'Cancel'),
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

        $totalPrice = $cartItems->sum(function($item) {
            return $item->total;
        });

        $order = Order::create([
            'user_id' => $request->user()->user_id,
            'status' => 'Pending',
            'shipping_address' => $validated['shipping_address'],
            'total_price' => $totalPrice,
            'payment_method' => $validated['payment_method'],
        ]);

        foreach ($cartItems as $cartItem) {
            $price = $cartItem->size === '30ml' 
                ? $cartItem->product->price_30ml 
                : $cartItem->product->price_50ml;

            OrderDetail::create([
                'order_id' => $order->order_id,
                'product_id' => $cartItem->product_id,
                'size' => $cartItem->size,
                'quantity' => $cartItem->quantity,
                'price' => $price,
                'subtotal' => $cartItem->total,
            ]);

            // Update stock
            $stockField = $cartItem->size === '30ml' ? 'stock_30ml' : 'stock_50ml';
            $cartItem->product->decrement($stockField, $cartItem->quantity);

            $cartItem->delete();
        }

        // Create payment record
        Payment::create([
            'order_id' => $order->order_id,
            'method' => $validated['payment_method'],
            'amount' => $totalPrice,
            'status' => 'Pending',
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
}
