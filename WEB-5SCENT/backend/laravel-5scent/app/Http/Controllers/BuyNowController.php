<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class BuyNowController extends Controller
{
    private function getBuyNowCacheKey($userId)
    {
        return "buy_now_checkout_{$userId}";
    }

    /**
     * Get the appropriate product image based on selected size
     */
    private function getImageForSize($product, $size)
    {
        $is50ml = ($size === '50ml') ? 1 : 0;
        
        // Try to find image matching the selected size
        $image = $product->images()
            ->where('is_50ml', $is50ml)
            ->first();
        
        // Fall back to any available image
        if (!$image) {
            $image = $product->images()->first();
        }
        
        return $image?->image_url ?? '/images/placeholder.jpg';
    }

    /**
     * Initialize a Buy Now session with a single product
     * This endpoint does NOT add the item to cart
     */
    public function initiateCheckout(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:product,product_id',
            'size' => 'required|in:30ml,50ml',
            'quantity' => 'required|integer|min:1',
        ]);

        $product = Product::findOrFail($validated['product_id']);

        // Get the price based on size
        $priceField = $validated['size'] === '30ml' ? 'price_30ml' : 'price_50ml';
        $stockField = $validated['size'] === '30ml' ? 'stock_30ml' : 'stock_50ml';
        
        $price = $product->$priceField;
        $availableStock = $product->$stockField;

        // Validate stock
        if ($validated['quantity'] > $availableStock) {
            return response()->json([
                'message' => 'Insufficient stock available',
                'available' => $availableStock,
            ], 400);
        }

        // Create a temporary checkout object
        $checkoutData = [
            'mode' => 'buy-now',
            'product_id' => $validated['product_id'],
            'product_name' => $product->name,
            'size' => $validated['size'],
            'quantity' => $validated['quantity'],
            'unit_price' => $price,
            'subtotal' => $price * $validated['quantity'],
            'image' => $this->getImageForSize($product, $validated['size']),
            'created_at' => now()->toIso8601String(),
        ];

        // Store in cache (temporary, expires in 30 minutes)
        $cacheKey = $this->getBuyNowCacheKey($request->user()->id);
        Cache::put($cacheKey, $checkoutData, now()->addMinutes(30));

        return response()->json([
            'success' => true,
            'checkout_data' => $checkoutData,
        ]);
    }

    /**
     * Get the current Buy Now checkout session
     */
    public function getCheckoutSession(Request $request)
    {
        $cacheKey = $this->getBuyNowCacheKey($request->user()->id);
        $buyNowData = Cache::get($cacheKey);

        return response()->json([
            'success' => true,
            'data' => $buyNowData,
        ]);
    }

    /**
     * Clear the Buy Now session after checkout completes
     */
    public function clearCheckoutSession(Request $request)
    {
        $cacheKey = $this->getBuyNowCacheKey($request->user()->id);
        Cache::forget($cacheKey);

        return response()->json([
            'success' => true,
            'message' => 'Checkout session cleared',
        ]);
    }
}
