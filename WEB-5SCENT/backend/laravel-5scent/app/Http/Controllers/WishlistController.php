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
                    'success' => false,
                    'message' => 'Unauthorized',
                    'data' => []
                ], 401);
            }

            $wishlistItems = Wishlist::with(['product' => function($query) {
                $query->with('images');
            }])
                ->where('user_id', $user->user_id)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Wishlist fetched successfully',
                'data' => $wishlistItems,
                'count' => $wishlistItems->count(),
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Wishlist index error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'user_id' => $request->user()?->user_id ?? null,
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch wishlist',
                'data' => [],
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
            ]);

            // Check if product exists
            $product = \App\Models\Product::find($validated['product_id']);
            if (!$product) {
                return response()->json([
                    'success' => false,
                    'message' => 'Product not found',
                    'data' => null
                ], 404);
            }

            // Check if item already exists
            $existingItem = Wishlist::where('user_id', $user->user_id)
                ->where('product_id', $validated['product_id'])
                ->first();

            if ($existingItem) {
                // Load with relationships before returning
                $existingItem->load(['product' => function($query) {
                    $query->with('images');
                }]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Product already in wishlist',
                    'data' => $existingItem,
                ], 200);
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

            return response()->json([
                'success' => true,
                'message' => 'Product added to wishlist',
                'data' => $wishlistItem,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
                'data' => null
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Wishlist store error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'user_id' => $request->user()?->user_id ?? null,
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to add item to wishlist',
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

            $wishlistItem = Wishlist::where('user_id', $user->user_id)
                ->find($id);

            if (!$wishlistItem) {
                return response()->json([
                    'success' => false,
                    'message' => 'Wishlist item not found',
                    'data' => null
                ], 404);
            }

            $wishlistItem->delete();

            return response()->json([
                'success' => true,
                'message' => 'Item removed from wishlist',
                'data' => null
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Wishlist destroy error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'user_id' => $request->user()?->user_id ?? null,
                'wishlist_id' => $id
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to remove item from wishlist',
                'data' => null,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
