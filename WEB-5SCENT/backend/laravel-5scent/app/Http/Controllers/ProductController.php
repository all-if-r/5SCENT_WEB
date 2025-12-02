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

            // Add image thumbnails for POS Tool compatibility
            $products = $products->map(function ($product) {
                $image30ml = ProductImage::where('product_id', $product->product_id)
                    ->where('is_50ml', false)
                    ->first();
                $image50ml = ProductImage::where('product_id', $product->product_id)
                    ->where('is_50ml', true)
                    ->first();

                // Extract just the filename to ensure correct path construction
                $product->image_thumb = $image30ml ? basename($image30ml->image_url) : null;
                $product->image_thumb_50ml = $image50ml ? basename($image50ml->image_url) : null;
                return $product;
            });

            return response()->json([
                'products' => $products,
                'total' => $products->count(),
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
            'stock_50ml' => 'nullable|integer|min:0',
            'images' => 'nullable|array',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:10240',
        ]);

        // Set stock_50ml if not provided
        if (!isset($validated['stock_50ml'])) {
            $validated['stock_50ml'] = $validated['stock_30ml'];
        }

        $product = Product::create($validated);

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $index => $image) {
                if ($image) {
                    $filename = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
                    $image->move(public_path('products'), $filename);
                    $imageUrl = '/products/' . $filename;
                    
                    ProductImage::create([
                        'product_id' => $product->product_id,
                        'image_url' => $imageUrl,
                        'is_50ml' => $index === 0 ? 1 : 0,
                    ]);
                }
            }
        }

        return response()->json($product->load('images'), 201);
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        \Log::info('Update request received', [
            'product_id' => $id,
            'request_data' => $request->except('images'),
            'has_images' => $request->hasFile('images'),
            'files' => $request->file('images') ? count($request->file('images')) : 0,
        ]);

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
            'stock_50ml' => 'nullable|integer|min:0',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:10240',
        ]);

        \Log::info('Validation passed', $validated);

        // Only update provided fields
        $updateData = [];
        foreach (['name', 'description', 'top_notes', 'middle_notes', 'base_notes', 'category', 'price_30ml', 'price_50ml', 'stock_30ml', 'stock_50ml'] as $field) {
            if (isset($validated[$field])) {
                $updateData[$field] = $validated[$field];
            }
        }

        if ($updateData) {
            $product->update($updateData);
        }

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $index => $image) {
                if ($image) {
                    $filename = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
                    $image->move(public_path('products'), $filename);
                    $imageUrl = '/products/' . $filename;
                    
                    \Log::info('Creating ProductImage:', [
                        'product_id' => $product->product_id,
                        'image_url' => $imageUrl,
                        'index' => $index,
                    ]);
                    
                    ProductImage::create([
                        'product_id' => $product->product_id,
                        'image_url' => $imageUrl,
                        'is_50ml' => 0,
                    ]);
                }
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

    public function deleteImage($productId, $imageId)
    {
        $product = Product::findOrFail($productId);
        $image = ProductImage::findOrFail($imageId);

        if ($image->product_id != $productId) {
            return response()->json(['error' => 'Image does not belong to this product'], 403);
        }

        // Delete the file from public directory
        $filePath = public_path($image->image_url);
        if (file_exists($filePath)) {
            unlink($filePath);
        }

        $image->delete();

        return response()->json(['message' => 'Image deleted successfully']);
    }

    public function uploadImage($productId, Request $request)
    {
        try {
            \Log::info('uploadImage called', [
                'product_id' => $productId,
                'has_image' => $request->hasFile('image'),
                'is_50ml' => $request->input('is_50ml'),
            ]);

            $product = Product::findOrFail($productId);

            $request->validate([
                'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:10240',
                'is_50ml' => 'sometimes|in:0,1',
            ]);

            $image = $request->file('image');
            $filename = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            $image->move(public_path('products'), $filename);
            $imageUrl = '/products/' . $filename;

            $is50ml = $request->input('is_50ml', 0);

            \Log::info('Creating ProductImage', [
                'product_id' => $productId,
                'image_url' => $imageUrl,
                'is_50ml' => $is50ml,
            ]);

            $productImage = ProductImage::create([
                'product_id' => $productId,
                'image_url' => $imageUrl,
                'is_50ml' => $is50ml,
            ]);

            return response()->json([
                'message' => 'Image uploaded successfully',
                'image' => $productImage,
            ], 201);
        } catch (\Exception $e) {
            \Log::error('uploadImage error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to upload image',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
