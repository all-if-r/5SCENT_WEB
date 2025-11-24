<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\Product;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'message' => 'Unauthorized'
                ], 401);
            }

            $cartItems = Cart::with(['product' => function($query) {
                $query->with('images');
            }])
                ->where('user_id', $user->user_id)
                ->get()
                ->map(function($item) {
                    // Ensure product relationship is loaded, if not, set to null
                    if (!$item->product) {
                        return $item;
                    }
                    return $item;
                });

            $total = $cartItems->sum(function($item) {
                try {
                    if ($item->product) {
                        return $item->total;
                    }
                } catch (\Exception $e) {
                    \Log::warning('Error calculating cart item total: ' . $e->getMessage());
                }
                return 0;
            });

            return response()->json([
                'items' => $cartItems,
                'total' => $total,
            ]);
        } catch (\Exception $e) {
            \Log::error('Cart index error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to fetch cart',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'message' => 'Unauthorized'
                ], 401);
            }

            $validated = $request->validate([
                'product_id' => 'required|exists:product,product_id',
                'size' => 'required|in:30ml,50ml',
                'quantity' => 'required|integer|min:1',
            ]);

            $product = Product::find($validated['product_id']);
            if (!$product) {
                return response()->json([
                    'message' => 'Product not found'
                ], 404);
            }

            $stockField = $validated['size'] === '30ml' ? 'stock_30ml' : 'stock_50ml';

            if ($product->$stockField < $validated['quantity']) {
                return response()->json([
                    'message' => 'Insufficient stock'
                ], 400);
            }

            $cartItem = Cart::where('user_id', $user->user_id)
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
                $cartItem->load(['product' => function($query) {
                    $query->with('images');
                }]);
            } else {
                $cartItem = Cart::create([
                    'user_id' => $user->user_id,
                    'product_id' => $validated['product_id'],
                    'size' => $validated['size'],
                    'quantity' => $validated['quantity'],
                ]);
                $cartItem->load(['product' => function($query) {
                    $query->with('images');
                }]);
            }

            return response()->json($cartItem, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Cart store error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to add item to cart',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'message' => 'Unauthorized'
                ], 401);
            }

            $cartItem = Cart::where('user_id', $user->user_id)
                ->find($id);

            if (!$cartItem) {
                return response()->json([
                    'message' => 'Cart item not found'
                ], 404);
            }

            $validated = $request->validate([
                'quantity' => 'required|integer|min:1',
            ]);

            $product = $cartItem->product;
            if (!$product) {
                return response()->json([
                    'message' => 'Product not found'
                ], 404);
            }

            $stockField = $cartItem->size === '30ml' ? 'stock_30ml' : 'stock_50ml';

            if ($product->$stockField < $validated['quantity']) {
                return response()->json([
                    'message' => 'Insufficient stock'
                ], 400);
            }

            $cartItem->update($validated);
            $cartItem->load(['product' => function($query) {
                $query->with('images');
            }]);

            return response()->json($cartItem);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Cart update error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to update cart item',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id, Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'message' => 'Unauthorized'
                ], 401);
            }

            $cartItem = Cart::where('user_id', $user->user_id)
                ->find($id);

            if (!$cartItem) {
                return response()->json([
                    'message' => 'Cart item not found'
                ], 404);
            }

            $cartItem->delete();

            return response()->json(['message' => 'Item removed from cart']);
        } catch (\Exception $e) {
            \Log::error('Cart destroy error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to remove item from cart',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
