<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\Product;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function index(Request $request)
    {
        $cartItems = Cart::with('product.images')
            ->where('user_id', $request->user()->user_id)
            ->get();

        $total = $cartItems->sum(function($item) {
            return $item->total;
        });

        return response()->json([
            'items' => $cartItems,
            'total' => $total,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:product,product_id',
            'size' => 'required|in:30ml,50ml',
            'quantity' => 'required|integer|min:1',
        ]);

        $product = Product::findOrFail($validated['product_id']);
        $stockField = $validated['size'] === '30ml' ? 'stock_30ml' : 'stock_50ml';

        if ($product->$stockField < $validated['quantity']) {
            return response()->json([
                'message' => 'Insufficient stock'
            ], 400);
        }

        $cartItem = Cart::where('user_id', $request->user()->user_id)
            ->where('product_id', $validated['product_id'])
            ->where('size', $validated['size'])
            ->first();

        if ($cartItem) {
            $newQuantity = $cartItem->quantity + $validated['quantity'];
            if ($product->$stockField < $newQuantity) {
                return response()->json([
                    'message' => 'Insufficient stock'
                ], 400);
            }
            $cartItem->update(['quantity' => $newQuantity]);
        } else {
            $cartItem = Cart::create([
                'user_id' => $request->user()->user_id,
                'product_id' => $validated['product_id'],
                'size' => $validated['size'],
                'quantity' => $validated['quantity'],
            ]);
        }

        return response()->json($cartItem->load('product.images'), 201);
    }

    public function update(Request $request, $id)
    {
        $cartItem = Cart::where('user_id', $request->user()->user_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        $product = $cartItem->product;
        $stockField = $cartItem->size === '30ml' ? 'stock_30ml' : 'stock_50ml';

        if ($product->$stockField < $validated['quantity']) {
            return response()->json([
                'message' => 'Insufficient stock'
            ], 400);
        }

        $cartItem->update($validated);

        return response()->json($cartItem->load('product.images'));
    }

    public function destroy($id, Request $request)
    {
        $cartItem = Cart::where('user_id', $request->user()->user_id)
            ->findOrFail($id);
        $cartItem->delete();

        return response()->json(['message' => 'Item removed from cart']);
    }
}
