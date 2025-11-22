<?php

namespace App\Http\Controllers;

use App\Models\Wishlist;
use Illuminate\Http\Request;

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
        $validated = $request->validate([
            'product_id' => 'required|exists:product,product_id',
        ]);

        $wishlistItem = Wishlist::firstOrCreate([
            'user_id' => $request->user()->user_id,
            'product_id' => $validated['product_id'],
        ]);

        return response()->json($wishlistItem->load('product.images'), 201);
    }

    public function destroy($id, Request $request)
    {
        $wishlistItem = Wishlist::where('user_id', $request->user()->user_id)
            ->findOrFail($id);
        $wishlistItem->delete();

        return response()->json(['message' => 'Item removed from wishlist']);
    }
}
