<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\Payment;
use App\Models\Product;
use App\Services\PhoneNormalizer;
use App\Services\NotificationService;
use App\Helpers\OrderCodeHelper;
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
            'checkout_mode' => 'nullable|in:cart,buy-now',
            'cart_ids' => 'nullable|array',
            'cart_ids.*' => 'exists:cart,cart_id',
            'product_id' => 'nullable|exists:product,product_id',
            'size' => 'nullable|in:30ml,50ml',
            'quantity' => 'nullable|integer|min:1',
            'phone_number' => 'required|string|max:20',
            'address_line' => 'required|string|max:255',
            'district' => 'required|string|max:255',
            'city' => 'required|string|max:255',
            'province' => 'required|string|max:255',
            'postal_code' => 'required|string|max:20',
            'payment_method' => 'required|in:QRIS,Virtual_Account,Cash',
        ]);

        $checkoutMode = $validated['checkout_mode'] ?? 'cart';

        // Buy Now mode - create order from single product
        if ($checkoutMode === 'buy-now') {
            return $this->processBuyNowCheckout($request, $validated);
        }

        // Cart checkout mode - create order from cart items
        return $this->processCartCheckout($request, $validated);
    }

    /**
     * Process a Buy Now checkout
     */
    private function processBuyNowCheckout(Request $request, array $validated)
    {
        $request->validate([
            'product_id' => 'required|exists:product,product_id',
            'size' => 'required|in:30ml,50ml',
            'quantity' => 'required|integer|min:1',
        ]);

        $product = Product::findOrFail($validated['product_id']);
        
        // Determine the price based on size
        $priceField = $validated['size'] === '30ml' ? 'price_30ml' : 'price_50ml';
        $stockField = $validated['size'] === '30ml' ? 'stock_30ml' : 'stock_50ml';
        
        $price = $product->$priceField;
        $availableStock = $product->$stockField;
        $quantity = $validated['quantity'];

        // Validate stock
        if ($quantity > $availableStock) {
            return response()->json([
                'message' => 'Insufficient stock available',
                'available' => $availableStock,
            ], 400);
        }

        $subtotal = $price * $quantity;
        $tax = $subtotal * 0.05;
        $totalPrice = $subtotal + $tax;

        // If payment method is Cash, automatically set status to Packaging
        $orderStatus = $validated['payment_method'] === 'Cash' ? 'Packaging' : 'Pending';

        // Normalize phone number to +62 format
        $normalizedPhone = PhoneNormalizer::normalize($validated['phone_number']);

        $order = Order::create([
            'user_id' => $request->user()->user_id,
            'status' => $orderStatus,
            'phone_number' => $normalizedPhone,
            'address_line' => $validated['address_line'],
            'district' => $validated['district'],
            'city' => $validated['city'],
            'province' => $validated['province'],
            'postal_code' => $validated['postal_code'],
            'subtotal' => $subtotal,
            'total_price' => $totalPrice,
            'payment_method' => $validated['payment_method'],
        ]);

        // Create order detail
        OrderDetail::create([
            'order_id' => $order->order_id,
            'product_id' => $product->product_id,
            'size' => $validated['size'],
            'quantity' => $quantity,
            'price' => $price,
            'subtotal' => $subtotal,
        ]);

        // Update product stock
        $product->decrement($stockField, $quantity);

        // Create payment record
        Payment::create([
            'order_id' => $order->order_id,
            'method' => $validated['payment_method'],
            'amount' => $totalPrice,
            'status' => 'Pending',
            'created_at' => $order->created_at,
        ]);

        // Create initial payment notification
        $orderCode = OrderCodeHelper::formatOrderCode($order);
        NotificationService::createPaymentNotification(
            $order->order_id,
            "Your payment for order {$orderCode} is pending and is being processed."
        );

        return response()->json($order->load('details.product.images', 'payment'), 201);
    }

    /**
     * Process a regular cart checkout
     */
    private function processCartCheckout(Request $request, array $validated)
    {
        $request->validate([
            'cart_ids' => 'required|array',
            'cart_ids.*' => 'exists:cart,cart_id',
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

        // Normalize phone number to +62 format
        $normalizedPhone = PhoneNormalizer::normalize($validated['phone_number']);

        $order = Order::create([
            'user_id' => $request->user()->user_id,
            'status' => $orderStatus,
            'phone_number' => $normalizedPhone,
            'address_line' => $validated['address_line'],
            'district' => $validated['district'],
            'city' => $validated['city'],
            'province' => $validated['province'],
            'postal_code' => $validated['postal_code'],
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

        // Create initial payment notification
        $orderCode = OrderCodeHelper::formatOrderCode($order);
        NotificationService::createPaymentNotification(
            $order->order_id,
            "Your payment for order {$orderCode} is pending and is being processed."
        );

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

        // Get order code for notifications
        $orderCode = OrderCodeHelper::formatOrderCode($order);

        // Create OrderUpdate notification for delivery
        NotificationService::createOrderUpdateNotification(
            $order->order_id,
            "Your order {$orderCode} has been delivered."
        );
        
        // Create delivery notification for review
        NotificationService::createDeliveryNotification($order->order_id);

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
