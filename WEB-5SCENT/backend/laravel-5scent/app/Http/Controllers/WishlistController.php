<?php

namespace App\Http\Controllers;

use App\Models\Wishlist;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WishlistController extends Controller
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

            $wishlistItems = Wishlist::with(['product' => function($query) {
                $query->with('images');
            }])
                ->where('user_id', $user->user_id)
                ->get();

            return response()->json($wishlistItems);
        } catch (\Exception $e) {
            \Log::error('Wishlist index error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to fetch wishlist',
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
            ]);

            // Check if product exists
            $product = \App\Models\Product::find($validated['product_id']);
            if (!$product) {
                return response()->json([
                    'message' => 'Product not found'
                ], 404);
            }

            // Check if item already exists
            $existingItem = Wishlist::where('user_id', $user->user_id)
                ->where('product_id', $validated['product_id'])
                ->with(['product' => function($query) {
                    $query->with('images');
                }])
                ->first();

            if ($existingItem) {
                // Item already exists, return it
                return response()->json($existingItem, 200);
            }

            // Create new wishlist item
            $wishlistItem = Wishlist::create([
                'user_id' => $user->user_id,
                'product_id' => $validated['product_id'],
            ]);

            // Load relationships
            $wishlistItem->load(['product' => function($query) {
                $query->with('images');
            }]);

            return response()->json($wishlistItem, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Wishlist store error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to add item to wishlist',
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

            $wishlistItem = Wishlist::where('user_id', $user->user_id)
                ->find($id);

            if (!$wishlistItem) {
                return response()->json([
                    'message' => 'Wishlist item not found'
                ], 404);
            }

            $wishlistItem->delete();

            return response()->json(['message' => 'Item removed from wishlist']);
        } catch (\Exception $e) {
            \Log::error('Wishlist destroy error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to remove item from wishlist',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
