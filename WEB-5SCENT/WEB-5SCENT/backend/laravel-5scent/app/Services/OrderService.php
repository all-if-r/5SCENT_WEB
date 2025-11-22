<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Cart;
use App\Models\OrderDetail;
use Illuminate\Support\Str;

class OrderService
{
    public function createOrderFromCart(array $cartIds, int $userId, string $shippingAddress, string $paymentMethod): Order
    {
        $cartItems = Cart::with('product')
            ->where('user_id', $userId)
            ->whereIn('id', $cartIds)
            ->get();

        if ($cartItems->isEmpty()) {
            throw new \Exception('Cart is empty');
        }

        $totalAmount = $cartItems->sum(function($item) {
            return $item->total;
        });

        $order = Order::create([
            'user_id' => $userId,
            'order_number' => 'ORD-' . strtoupper(Str::random(10)),
            'status' => 'Pending',
            'shipping_address' => $shippingAddress,
            'total_amount' => $totalAmount,
            'payment_method' => $paymentMethod,
            'payment_status' => 'Pending',
        ]);

        foreach ($cartItems as $cartItem) {
            $price = $cartItem->size === '30ml' 
                ? $cartItem->product->price_30ml 
                : $cartItem->product->price_50ml;

            OrderDetail::create([
                'order_id' => $order->id,
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

        return $order->load('details.product.images');
    }

    public function cancelOrder(Order $order): void
    {
        if (!$order->canBeCancelled()) {
            throw new \Exception('Order can only be cancelled during Packaging status');
        }

        $order->update(['status' => 'Cancel']);

        // Restore stock
        foreach ($order->details as $detail) {
            $stockField = $detail->size === '30ml' ? 'stock_30ml' : 'stock_50ml';
            $detail->product->increment($stockField, $detail->quantity);
        }
    }
}



