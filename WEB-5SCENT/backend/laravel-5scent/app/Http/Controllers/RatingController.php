<?php

namespace App\Http\Controllers;

use App\Models\Rating;
use App\Models\Order;
use Illuminate\Http\Request;
use Carbon\Carbon;

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

        $now = Carbon::now();

        $rating = Rating::create([
            'user_id' => $request->user()->user_id,
            'product_id' => $validated['product_id'],
            'order_id' => $validated['order_id'],
            'stars' => $validated['stars'],
            'comment' => $validated['comment'] ?? null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json($rating->load('user'), 201);
    }

    public function getOrderReviews($orderId, Request $request)
    {
        $order = Order::where('user_id', $request->user()->user_id)
            ->findOrFail($orderId);

        $reviews = Rating::where('order_id', $orderId)
            ->where('user_id', $request->user()->user_id)
            ->get();

        return response()->json($reviews);
    }

    public function update($ratingId, Request $request)
    {
        $validated = $request->validate([
            'stars' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string',
        ]);

        $rating = Rating::findOrFail($ratingId);

        // Verify the rating belongs to the authenticated user
        if ($rating->user_id !== $request->user()->user_id) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        $rating->update([
            'stars' => $validated['stars'],
            'comment' => $validated['comment'] ?? $rating->comment,
            'updated_at' => Carbon::now(),
        ]);

        return response()->json($rating, 200);
    }
}

