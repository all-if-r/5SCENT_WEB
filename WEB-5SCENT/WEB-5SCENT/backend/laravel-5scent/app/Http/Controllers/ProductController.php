<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Product::with(['images', 'mainImage']);

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('category', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }

            if ($request->has('category')) {
                $query->where('category', $request->category);
            }

            $products = $query->withAvg('ratings', 'stars')
                             ->withCount('ratings')
                             ->get();

            // Filter best sellers if requested
            if ($request->has('best_seller') && $request->best_seller) {
                $products = $products->filter(function ($product) {
                    return ($product->ratings_avg_stars ?? 0) >= 4.5;
                })->values();
            }

            return response()->json([
                'data' => $products,
                'count' => $products->count(),
            ], 200);
        } catch (\Exception $e) {
            \Log::error('ProductController@index error: ' . $e->getMessage());
            \Log::error('ProductController@index stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'error' => 'Failed to fetch products',
                'message' => $e->getMessage(),
                'details' => config('app.debug') ? $e->getTraceAsString() : null,
            ], 500);
        }
    }

    public function bestSellers()
    {
        try {
            $products = Product::with(['images', 'mainImage'])
                ->withAvg('ratings', 'stars')
                ->withCount('ratings')
                ->get()
                ->filter(function ($product) {
                    return ($product->ratings_avg_stars ?? 0) >= 4.5;
                })
                ->sortByDesc('ratings_avg_stars')
                ->values();

            return response()->json([
                'data' => $products,
                'count' => $products->count(),
            ], 200);
        } catch (\Exception $e) {
            \Log::error('ProductController@bestSellers error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch best sellers',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function show($id)
    {
        $product = Product::with('images', 'ratings.user')->findOrFail($id);
        $product->average_rating = $product->average_rating;

        return response()->json($product);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'required|string',
            'top_notes' => 'nullable|string|max:255',
            'middle_notes' => 'nullable|string|max:255',
            'base_notes' => 'nullable|string|max:255',
            'category' => 'required|in:Day,Night',
            'price_30ml' => 'required|numeric|min:0',
            'price_50ml' => 'required|numeric|min:0',
            'stock_30ml' => 'required|integer|min:0',
            'stock_50ml' => 'required|integer|min:0',
            'images' => 'required|array|min:1',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $product = Product::create($validated);

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $index => $image) {
                $path = $image->store('products', 'public');
                $imageUrl = asset('storage/' . $path);
                
                ProductImage::create([
                    'product_id' => $product->product_id,
                    'image_url' => $imageUrl,
                    'is_50ml' => $index === 0 ? 0 : 0, // Adjust based on your logic
                ]);
            }
        }

        return response()->json($product->load('images'), 201);
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'description' => 'sometimes|string',
            'top_notes' => 'nullable|string|max:255',
            'middle_notes' => 'nullable|string|max:255',
            'base_notes' => 'nullable|string|max:255',
            'category' => 'sometimes|in:Day,Night',
            'price_30ml' => 'sometimes|numeric|min:0',
            'price_50ml' => 'sometimes|numeric|min:0',
            'stock_30ml' => 'sometimes|integer|min:0',
            'stock_50ml' => 'sometimes|integer|min:0',
            'images' => 'sometimes|array',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $product->update($validated);

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $index => $image) {
                $path = $image->store('products', 'public');
                $imageUrl = asset('storage/' . $path);
                
                ProductImage::create([
                    'product_id' => $product->product_id,
                    'image_url' => $imageUrl,
                    'is_50ml' => 0,
                ]);
            }
        }

        return response()->json($product->load('images'));
    }

    public function destroy($id)
    {
        $product = Product::findOrFail($id);
        $product->delete();

        return response()->json(['message' => 'Product deleted successfully']);
    }
}
