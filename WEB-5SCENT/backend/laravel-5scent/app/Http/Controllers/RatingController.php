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
        ]);

        return response()->json($rating, 200);
    }

    /**
     * Admin: Get all ratings/reviews with relationships
     */
    public function adminIndex()
    {
        try {
            $reviews = Rating::with(['user', 'product', 'order'])
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($reviews, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error fetching reviews',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Admin: Get a specific rating/review
     */
    public function adminShow($id)
    {
        try {
            $review = Rating::with(['user', 'product', 'order'])
                ->findOrFail($id);

            return response()->json($review, 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Review not found'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error fetching review',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Admin: Update visibility status of a review
     */
    public function adminUpdateVisibility(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'is_visible' => 'required|boolean'
            ]);

            $review = Rating::findOrFail($id);
            $review->is_visible = $validated['is_visible'];
            $review->save();

            return response()->json([
                'message' => 'Review visibility updated',
                'review' => $review
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Review not found'
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error updating review',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Admin: Delete a rating/review
     */
    public function adminDestroy($id)
    {
        try {
            $review = Rating::findOrFail($id);
            $review->delete();

            return response()->json([
                'message' => 'Review deleted successfully'
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Review not found'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error deleting review',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

