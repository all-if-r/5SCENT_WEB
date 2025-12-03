<?php

namespace App\Http\Controllers;

use App\Models\PosItem;
use App\Models\PosTransaction;
use App\Models\Product;
use App\Models\ProductImage;
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

            // Extract just the filename from the full path
            $product->image_thumb = $image30ml ? basename($image30ml->image_url) : null;
            $product->image_thumb_50ml = $image50ml ? basename($image50ml->image_url) : null;
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
            'payment_method' => 'required|in:Cash,QRIS,Virtual Account',
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
        // Eloquent will automatically set created_at and updated_at
        $transaction = PosTransaction::create([
            'admin_id' => $admin->admin_id,
            'customer_name' => $validated['customer_name'],
            'phone' => $validated['phone'],
            'payment_method' => $validated['payment_method'],
            'cash_received' => $validated['payment_method'] === 'Cash' ? $validated['cash_received'] : null,
            'cash_change' => $cashChange,
            'total_price' => $totalPrice,
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

        return response()->json([
            'transaction_id' => $transaction->transaction_id,
            'customer_name' => $transaction->customer_name,
            'total_price' => $transaction->total_price,
            'payment_method' => $transaction->payment_method,
        ], 201);
    }

    /**
     * Generate PDF receipt for a transaction
     */
    public function generateReceipt($transactionId)
    {
        try {
            $transaction = PosTransaction::with('items.product', 'admin')
                ->findOrFail($transactionId);

            \Log::info('POS receipt timestamp', [
                'transaction_id' => $transaction->transaction_id,
                'created_at' => $transaction->created_at,
                'app_timezone' => config('app.timezone'),
            ]);

            $data = [
                'transaction' => $transaction,
                'items' => $transaction->items,
                'admin' => $transaction->admin,
            ];

            $pdf = PDF::loadView('pos.receipt', $data);
            
            // Sanitize customer name: replace spaces with underscores, remove special characters
            // Keep alphanumeric, spaces (to be replaced), hyphens, and underscores
            $customerName = preg_replace('/[^a-zA-Z0-9\s\-]/', '', $transaction->customer_name);
            $customerName = str_replace(' ', '_', trim($customerName));
            
            $filename = "pos-receipt-{$transaction->transaction_id}-{$customerName}.pdf";
            
            return $pdf->download($filename);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
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
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($transactions);
    }
}
