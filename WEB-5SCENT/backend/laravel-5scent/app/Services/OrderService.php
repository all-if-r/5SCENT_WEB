<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Cart;
use App\Models\OrderDetail;

class OrderService
{
    public function createOrderFromCart(array $cartIds, int $userId, string $shippingAddress, string $paymentMethod): Order
    {
        $cartItems = Cart::with('product')
            ->where('user_id', $userId)
            ->whereIn('cart_id', $cartIds)
            ->get();

        if ($cartItems->isEmpty()) {
            throw new \Exception('Cart is empty');
        }

        $subtotal = $cartItems->sum(function($item) {
            $price = $item->size === '30ml'
                ? $item->product->price_30ml
                : $item->product->price_50ml;

            return $price * $item->quantity;
        });

        $totalAmount = $subtotal * 1.05;

        $order = Order::create([
            'user_id' => $userId,
            'status' => 'Pending',
            'shipping_address' => $shippingAddress,
            'subtotal' => $subtotal,
            'total_price' => $totalAmount,
            'payment_method' => $paymentMethod,
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



