<?php

namespace App\Http\Controllers;

use App\Models\Rating;
use App\Models\Order;
use Illuminate\Http\Request;

class RatingController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:product,product_id',
            'order_id' => 'required|exists:orders,order_id',
            'stars' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string',
        ]);

        $order = Order::where('user_id', $request->user()->user_id)
            ->findOrFail($validated['order_id']);

        if ($order->status !== 'Delivered') {
            return response()->json([
                'message' => 'You can only rate products from delivered orders'
            ], 400);
        }

        $existingRating = Rating::where('user_id', $request->user()->user_id)
            ->where('product_id', $validated['product_id'])
            ->where('order_id', $validated['order_id'])
            ->first();

        if ($existingRating) {
            return response()->json([
                'message' => 'You have already rated this product for this order'
            ], 400);
        }

        $rating = Rating::create([
            'user_id' => $request->user()->user_id,
            'product_id' => $validated['product_id'],
            'order_id' => $validated['order_id'],
            'stars' => $validated['stars'],
            'comment' => $validated['comment'] ?? null,
        ]);

        return response()->json($rating->load('user'), 201);
    }
}
