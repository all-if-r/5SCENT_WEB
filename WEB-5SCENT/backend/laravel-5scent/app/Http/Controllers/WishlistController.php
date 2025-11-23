<?php

namespace App\Http\Controllers;

use App\Models\Wishlist;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WishlistController extends Controller
{
    public function index(Request $request)
    {
        $wishlistItems = Wishlist::with('product.images')
            ->where('user_id', $request->user()->user_id)
            ->get();

        return response()->json($wishlistItems);
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'product_id' => 'required|exists:product,product_id',
            ]);

            // Check if item already exists
            $existingItem = Wishlist::where('user_id', $request->user()->user_id)
                ->where('product_id', $validated['product_id'])
                ->with('product.images')
                ->first();

            if ($existingItem) {
                // Item already exists, return it
                return response()->json($existingItem, 200);
            }

            // Create new wishlist item
            $wishlistItem = Wishlist::create([
                'user_id' => $request->user()->user_id,
                'product_id' => $validated['product_id'],
            ]);

            // Load relationships
            $wishlistItem->load('product.images');

            return response()->json($wishlistItem, 201);
        } catch (\Exception $e) {
            \Log::error('Wishlist store error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to add item to wishlist',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id, Request $request)
    {
        $wishlistItem = Wishlist::where('user_id', $request->user()->user_id)
            ->findOrFail($id);
        $wishlistItem->delete();

        return response()->json(['message' => 'Item removed from wishlist']);
    }
}
