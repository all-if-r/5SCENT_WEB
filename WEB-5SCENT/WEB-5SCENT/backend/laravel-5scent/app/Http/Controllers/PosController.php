<?php

namespace App\Http\Controllers;

use App\Models\PosItem;
use App\Models\PosTransaction;
use App\Models\Product;
use Illuminate\Http\Request;

class PosController extends Controller
{
    public function createTransaction(Request $request)
    {
        $validated = $request->validate([
            'customer_name' => 'required|string|max:100',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:product,product_id',
            'items.*.size' => 'required|in:30ml,50ml',
            'items.*.quantity' => 'required|integer|min:1',
            'payment_method' => 'sometimes|string|max:50',
        ]);

        $admin = $request->user();
        $totalPrice = 0;
        $items = [];

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

        $transaction = PosTransaction::create([
            'admin_id' => $admin->admin_id,
            'customer_name' => $validated['customer_name'],
            'total_price' => $totalPrice,
            'payment_method' => $validated['payment_method'] ?? 'QRIS',
        ]);

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

        return response()->json($transaction->load('items.product'), 201);
    }

    public function getTransaction($id)
    {
        $transaction = PosTransaction::with('items.product')
            ->findOrFail($id);

        return response()->json($transaction);
    }

    public function indexTransactions()
    {
        $transactions = PosTransaction::with('items.product', 'admin')
            ->orderBy('date', 'desc')
            ->paginate(20);

        return response()->json($transactions);
    }
}
