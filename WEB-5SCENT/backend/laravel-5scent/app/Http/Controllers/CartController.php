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
                    'success' => false,
                    'message' => 'Unauthorized',
                    'items' => [],
                    'total' => 0
                ], 401);
            }

            $cartItems = Cart::with(['product' => function($query) {
                $query->with('images');
            }])
                ->where('user_id', $user->user_id)
                ->get();

            // Ensure all items are properly formatted with prices
            $formattedItems = $cartItems->map(function($item) {
                return [
                    'cart_id' => $item->cart_id,
                    'product_id' => $item->product_id,
                    'size' => $item->size,
                    'quantity' => $item->quantity,
                    'price' => $item->price,
                    'total' => $item->total,
                    'product' => $item->product,
                    'created_at' => $item->created_at,
                    'updated_at' => $item->updated_at,
                ];
            });

            $total = $formattedItems->sum(function($item) {
                return $item['total'] ?? 0;
            });

            return response()->json([
                'success' => true,
                'message' => 'Cart fetched successfully',
                'items' => $formattedItems,
                'total' => $total,
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Cart index error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'user_id' => $request->user()?->user_id ?? null,
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch cart',
                'items' => [],
                'total' => 0,
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
                    'success' => false,
                    'message' => 'Unauthorized',
                    'data' => null
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
                    'success' => false,
                    'message' => 'Product not found',
                    'data' => null
                ], 404);
            }

            $stockField = $validated['size'] === '30ml' ? 'stock_30ml' : 'stock_50ml';

            if ($product->$stockField < $validated['quantity']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient stock',
                    'data' => null
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
                        'success' => false,
                        'message' => 'Insufficient stock',
                        'data' => null
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

            return response()->json([
                'success' => true,
                'message' => 'Product added to cart',
                'data' => [
                    'cart_id' => $cartItem->cart_id,
                    'product_id' => $cartItem->product_id,
                    'size' => $cartItem->size,
                    'quantity' => $cartItem->quantity,
                    'price' => $cartItem->price,
                    'total' => $cartItem->total,
                    'product' => $cartItem->product,
                    'created_at' => $cartItem->created_at,
                    'updated_at' => $cartItem->updated_at,
                ]
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
                'data' => null
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Cart store error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'user_id' => $request->user()?->user_id ?? null,
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to add item to cart',
                'data' => null,
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
                    'success' => false,
                    'message' => 'Unauthorized',
                    'data' => null
                ], 401);
            }

            $cartItem = Cart::where('user_id', $user->user_id)
                ->find($id);

            if (!$cartItem) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cart item not found',
                    'data' => null
                ], 404);
            }

            $validated = $request->validate([
                'quantity' => 'required|integer|min:1',
            ]);

            $product = $cartItem->product;
            if (!$product) {
                return response()->json([
                    'success' => false,
                    'message' => 'Product not found',
                    'data' => null
                ], 404);
            }

            $stockField = $cartItem->size === '30ml' ? 'stock_30ml' : 'stock_50ml';

            if ($product->$stockField < $validated['quantity']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient stock',
                    'data' => null
                ], 400);
            }

            $cartItem->update($validated);
            $cartItem->load(['product' => function($query) {
                $query->with('images');
            }]);

            return response()->json([
                'success' => true,
                'message' => 'Cart item updated successfully',
                'data' => [
                    'cart_id' => $cartItem->cart_id,
                    'product_id' => $cartItem->product_id,
                    'size' => $cartItem->size,
                    'quantity' => $cartItem->quantity,
                    'price' => $cartItem->price,
                    'total' => $cartItem->total,
                    'product' => $cartItem->product,
                    'created_at' => $cartItem->created_at,
                    'updated_at' => $cartItem->updated_at,
                ]
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
                'data' => null
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Cart update error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'user_id' => $request->user()?->user_id ?? null,
                'cart_id' => $id
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update cart item',
                'data' => null,
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
                    'success' => false,
                    'message' => 'Unauthorized',
                    'data' => null
                ], 401);
            }

            $cartItem = Cart::where('user_id', $user->user_id)
                ->find($id);

            if (!$cartItem) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cart item not found',
                    'data' => null
                ], 404);
            }

            $cartItem->delete();

            return response()->json([
                'success' => true,
                'message' => 'Item removed from cart',
                'data' => null
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Cart destroy error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'user_id' => $request->user()?->user_id ?? null,
                'cart_id' => $id
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to remove item from cart',
                'data' => null,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
