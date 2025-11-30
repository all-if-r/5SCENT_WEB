<?php

namespace App\Http\Controllers;

use App\Models\PosItem;
use App\Models\PosTransaction;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Order;
use Illuminate\Http\Request;
use PDF;
use Carbon\Carbon;

class PosController extends Controller
{
    /**
     * Search products by code or name
     */
    public function searchProducts(Request $request)
    {
        $search = $request->input('q', '');

        if (strlen($search) < 1) {
            return response()->json(['message' => 'Search query too short'], 400);
        }

        $products = Product::where('product_id', 'LIKE', "%{$search}%")
            ->orWhere('name', 'LIKE', "%{$search}%")
            ->select('product_id', 'name', 'price_30ml', 'price_50ml', 'stock_30ml', 'stock_50ml')
            ->limit(10)
            ->get();

        // Add images for each product
        $products = $products->map(function ($product) {
            $image30ml = ProductImage::where('product_id', $product->product_id)
                ->where('is_50ml', false)
                ->first();
            $image50ml = ProductImage::where('product_id', $product->product_id)
                ->where('is_50ml', true)
                ->first();

            // Store just the filename, Next.js will resolve from /products folder
            $product->image_thumb = $image30ml ? $image30ml->image_url : null;
            $product->image_thumb_50ml = $image50ml ? $image50ml->image_url : null;
            return $product;
        });

        return response()->json($products);
    }

    /**
     * Create a POS transaction with items and generate receipt
     */
    public function createTransaction(Request $request)
    {
        $validated = $request->validate([
            'customer_name' => 'required|string|max:100',
            'phone' => 'required|string|regex:/^\+62[0-9]{8,12}$/',
            'payment_method' => 'required|in:Cash,QRIS,Virtual_Account',
            'cash_received' => 'nullable|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:product,product_id',
            'items.*.size' => 'required|in:30ml,50ml',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        // Validate cash_received if payment method is Cash
        if ($validated['payment_method'] === 'Cash' && (!isset($validated['cash_received']) || $validated['cash_received'] === null)) {
            return response()->json(['message' => 'Cash received is required for Cash payments'], 400);
        }

        // If not Cash payment, validate cash_received is not provided
        if ($validated['payment_method'] !== 'Cash' && isset($validated['cash_received']) && $validated['cash_received'] !== null) {
            $validated['cash_received'] = null;
        }

        $admin = $request->user();
        $totalPrice = 0;
        $items = [];

        // Calculate totals and validate stock
        foreach ($validated['items'] as $itemData) {
            $product = Product::findOrFail($itemData['product_id']);
            $stockField = $itemData['size'] === '30ml' ? 'stock_30ml' : 'stock_50ml';
            $price = $itemData['size'] === '30ml' ? $product->price_30ml : $product->price_50ml;

            if ($product->$stockField < $itemData['quantity']) {
                return response()->json([
                    'message' => "Insufficient stock for {$product->name} ({$itemData['size']})"
                ], 400);
            }

            $subtotal = $price * $itemData['quantity'];
            $totalPrice += $subtotal;

            $items[] = [
                'product_id' => $product->product_id,
                'size' => $itemData['size'],
                'quantity' => $itemData['quantity'],
                'price' => $price,
                'subtotal' => $subtotal,
            ];
        }

        // Calculate cash_change based on payment method
        $cashChange = 0;
        if ($validated['payment_method'] === 'Cash' && $validated['cash_received']) {
            $cashChange = $validated['cash_received'] - $totalPrice;
        }

        // Create POS transaction with all fields
        $transaction = PosTransaction::create([
            'admin_id' => $admin->admin_id,
            'customer_name' => $validated['customer_name'],
            'phone' => $validated['phone'],
            'payment_method' => $validated['payment_method'],
            'cash_received' => $validated['payment_method'] === 'Cash' ? $validated['cash_received'] : null,
            'cash_change' => $cashChange,
            'total_price' => $totalPrice,
            'date' => now(),
        ]);

        // Create POS items and update stock
        foreach ($items as $itemData) {
            $product = Product::find($itemData['product_id']);
            $stockField = $itemData['size'] === '30ml' ? 'stock_30ml' : 'stock_50ml';
            
            PosItem::create([
                'transaction_id' => $transaction->transaction_id,
                'product_id' => $itemData['product_id'],
                'size' => $itemData['size'],
                'quantity' => $itemData['quantity'],
                'price' => $itemData['price'],
                'subtotal' => $itemData['subtotal'],
            ]);

            // Update stock
            $product->decrement($stockField, $itemData['quantity']);
        }

        // Create corresponding Order record with POS pattern
        $posOrder = $this->createPosOrder($transaction, $items);
        
        $transaction->update(['order_id' => $posOrder->order_id]);

        return response()->json([
            'transaction' => $transaction->load('items.product'),
            'order_id' => $posOrder->order_id,
        ], 201);
    }

    /**
     * Create an Order record for POS transaction with #POS-DD-MM-YYYY-XXX pattern
     */
    private function createPosOrder($transaction, $items)
    {
        $date = $transaction->date ?? now();
        $dateStr = $date->format('d-m-Y');
        
        // Get today's POS order count for padding
        $todayCount = Order::whereDate('created_at', $date)
            ->where('shipping_address', 'LIKE', 'POS%')
            ->count() + 1;
        
        $orderCode = 'POS-' . $dateStr . '-' . str_pad($todayCount, 3, '0', STR_PAD_LEFT);

        // Calculate subtotal from items
        $subtotal = collect($items)->sum('subtotal');

        $order = Order::create([
            'user_id' => $transaction->admin_id, // Store admin_id in user_id for POS orders
            'subtotal' => $subtotal,
            'total_price' => $transaction->total_price,
            'status' => 'Delivered', // POS sales are immediately completed
            'shipping_address' => $orderCode, // Store order code in shipping_address
            'payment_method' => $transaction->payment_method,
            'tracking_number' => 'POS-' . $transaction->transaction_id,
            'created_at' => $transaction->date,
        ]);

        // Create OrderDetail entries for each item
        foreach ($items as $item) {
            $order->details()->create([
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
                'price' => $item['price'],
                'size' => $item['size'],
                'subtotal' => $item['subtotal'],
            ]);
        }

        return $order;
    }

    /**
     * Generate PDF receipt for a transaction
     */
    public function generateReceipt($transactionId)
    {
        $transaction = PosTransaction::with('items.product', 'admin')
            ->findOrFail($transactionId);

        $data = [
            'transaction' => $transaction,
            'date' => $transaction->date->format('Y-m-d H:i:s'),
        ];

        $pdf = PDF::loadView('pos.receipt', $data);
        
        // Sanitize filename: remove spaces, special characters
        $sanitizedName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $transaction->customer_name);
        $filename = 'pos-receipt-' . $transaction->transaction_id . '-' . $sanitizedName . '.pdf';
        
        return $pdf->download($filename);
    }

    /**
     * Get a single transaction
     */
    public function getTransaction($id)
    {
        $transaction = PosTransaction::with('items.product', 'admin')
            ->findOrFail($id);

        return response()->json($transaction);
    }

    /**
     * Get all transactions
     */
    public function indexTransactions()
    {
        $transactions = PosTransaction::with('items.product', 'admin')
            ->orderBy('date', 'desc')
            ->paginate(20);

        return response()->json($transactions);
    }
}
