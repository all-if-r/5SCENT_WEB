<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    /**
     * Generate sanitized product name for filenames
     * Example: "Night Bloom" -> "Night-Bloom"
     */
    private function sanitizeProductName($name)
    {
        // Replace spaces/underscores with hyphens, drop other special chars, and collapse repeats
        $sanitized = preg_replace('/[^A-Za-z0-9-]/', '', str_replace([' ', '_'], '-', $name));
        $sanitized = preg_replace('/-+/', '-', $sanitized);
        $sanitized = trim($sanitized, '-');
        return $sanitized ?: 'product';
    }

    /**
     * Get filename for a specific slot using required naming rules
     * Slot 1: {name}-50ml.{ext}
     * Slot 2: {name}-30ml.{ext}
     * Slot 3: additional-{name}-1.{ext}
     * Slot 4: additional-{name}-2.{ext}
     */
    private function getSlotFilename($productName, $slot, $extension = 'png')
    {
        $sanitized = $this->sanitizeProductName($productName);
        $extension = $extension ?: 'png';
        
        switch ($slot) {
            case 1: // 50ml
                return "{$sanitized}-50ml.{$extension}";
            case 2: // 30ml
                return "{$sanitized}-30ml.{$extension}";
            case 3: // additional 1
                return "additional-{$sanitized}-1.{$extension}";
            case 4: // additional 2
                return "additional-{$sanitized}-2.{$extension}";
            default:
                return null;
        }
    }

    /**
     * Get slot info from is_50ml and is_additional flags
     */
    private function getSlotFromFlags($is50ml, $isAdditional)
    {
        if (!$isAdditional) {
            return $is50ml ? 1 : 2; // Slot 1 (50ml) or Slot 2 (30ml)
        }
        // For additional images, we need to check by created_at or image_id
        return null; // Will be determined by ordering
    }

    /**
     * Find or create product image record for a specific slot
     */
    private function findOrCreateSlotImage($productId, $slot)
    {
        $is50ml = ($slot === 1) ? 1 : 0;
        $isAdditional = ($slot >= 3) ? 1 : 0;

        $query = ProductImage::where('product_id', $productId)
            ->where('is_50ml', $is50ml)
            ->where('is_additional', $isAdditional);

        // For additional images, we need to order by created_at to distinguish slot 3 vs 4
        if ($isAdditional) {
            if ($slot === 4) {
                $image = $query->orderBy('created_at', 'asc')->skip(1)->first();
            } else {
                $image = $query->orderBy('created_at', 'asc')->first();
            }
        } else {
            $image = $query->first();
        }

        return $image;
    }

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
            $frontendProductsPath = base_path('../../frontend/web-5scent/public/products');
            if (!is_dir($frontendProductsPath)) {
                mkdir($frontendProductsPath, 0755, true);
            }
            
            foreach ($request->file('images') as $index => $image) {
                if ($image) {
                    // Slot numbering: index 0 = slot 1 (50ml), index 1 = slot 2 (30ml), index 2 = slot 3, index 3 = slot 4
                    $slot = $index + 1;
                    $extension = strtolower($image->getClientOriginalExtension() ?: 'png');
                    $filename = $this->getSlotFilename($product->name, $slot, $extension);
                    
                    $image->move($frontendProductsPath, $filename);
                    $imageUrl = '/products/' . $filename;
                    
                    $is50ml = ($slot === 1) ? 1 : 0;
                    $isAdditional = ($slot >= 3) ? 1 : 0;
                    
                    ProductImage::create([
                        'product_id' => $product->product_id,
                        'image_url' => $imageUrl,
                        'is_50ml' => $is50ml,
                        'is_additional' => $isAdditional,
                    ]);
                }
            }
        }

        return response()->json($product->load('images'), 201);
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        \Log::info('=== UPDATE REQUEST START ===', [
            'product_id' => $id,
            'product_name' => $product->name,
        ]);

        // Validate request
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
            'image_slot_1' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:10240',
            'image_slot_2' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:10240',
            'image_slot_3' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:10240',
            'image_slot_4' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:10240',
            'images' => 'sometimes|array',
            'images.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:10240',
        ]);

        \Log::info('Validation passed', [
            'has_stock_30ml' => isset($validated['stock_30ml']),
            'has_stock_50ml' => isset($validated['stock_50ml']),
            'stock_30ml_value' => $validated['stock_30ml'] ?? 'NOT PROVIDED',
            'stock_50ml_value' => $validated['stock_50ml'] ?? 'NOT PROVIDED',
        ]);

        // Update product fields (including stock)
        $product->name = $request->input('name', $product->name);
        $product->description = $request->input('description', $product->description);
        $product->category = $request->input('category', $product->category);
        $product->price_30ml = $request->input('price_30ml', $product->price_30ml);
        $product->price_50ml = $request->input('price_50ml', $product->price_50ml);
        $product->stock_30ml = $request->input('stock_30ml', $product->stock_30ml);
        $product->stock_50ml = $request->input('stock_50ml', $product->stock_50ml);
        $product->top_notes = $request->input('top_notes', $product->top_notes);
        $product->middle_notes = $request->input('middle_notes', $product->middle_notes);
        $product->base_notes = $request->input('base_notes', $product->base_notes);

        $product->save();

        \Log::info('Product fields updated', [
            'product_id' => $product->product_id,
            'stock_30ml' => $product->stock_30ml,
            'stock_50ml' => $product->stock_50ml,
        ]);

        // Handle images - check each slot explicitly
        $frontendProductsPath = base_path('../../frontend/web-5scent/public/products');
        if (!is_dir($frontendProductsPath)) {
            mkdir($frontendProductsPath, 0755, true);
        }

        // Collect uploaded files keyed by slot (supports legacy "images" array)
        $slotFiles = [];
        for ($slot = 1; $slot <= 4; $slot++) {
            $slotKey = "image_slot_{$slot}";
            if ($request->hasFile($slotKey)) {
                $slotFiles[$slot] = $request->file($slotKey);
            }
        }
        if (empty($slotFiles) && $request->hasFile('images')) {
            foreach ($request->file('images') as $index => $file) {
                $slot = $index + 1;
                if ($file && $slot <= 4) {
                    $slotFiles[$slot] = $file;
                }
            }
        }

        // Process each provided slot upload
        foreach ($slotFiles as $slot => $image) {
            \Log::info("Processing slot {$slot}", [
                'has_file' => true,
                'filename' => $image->getClientOriginalName(),
                'size' => $image->getSize(),
            ]);

            $extension = strtolower($image->getClientOriginalExtension() ?: 'png');
            $filename = $this->getSlotFilename($product->name, $slot, $extension);
            \Log::info("Generated filename for slot {$slot}", [
                'filename' => $filename,
            ]);

            // Delete old file if exists
            $oldFilePath = $frontendProductsPath . '/' . $filename;
            if (file_exists($oldFilePath)) {
                unlink($oldFilePath);
                \Log::info("Deleted old file", ['path' => $oldFilePath]);
            }

            // Move new file
            $image->move($frontendProductsPath, $filename);
            \Log::info("Moved image file", [
                'destination' => $frontendProductsPath . '/' . $filename,
            ]);

            $imageUrl = '/products/' . $filename;

            // Determine flags
            $is50ml = ($slot === 1) ? 1 : 0;
            $isAdditional = ($slot >= 3) ? 1 : 0;

            // Find or create productimage record
            $existingImage = ProductImage::where('product_id', $product->product_id)
                ->where('is_50ml', $is50ml)
                ->where('is_additional', $isAdditional);

            // For additional images, we need to get the correct one by order
            if ($isAdditional) {
                if ($slot === 4) {
                    // Get the second additional image
                    $existingImage = $existingImage->orderBy('created_at', 'asc')->skip(1)->first();
                } else {
                    // Get the first additional image
                    $existingImage = $existingImage->orderBy('created_at', 'asc')->first();
                }
            } else {
                $existingImage = $existingImage->first();
            }

            if ($existingImage) {
                // Update existing
                $existingImage->image_url = $imageUrl;
                $existingImage->save();
                \Log::info('Updated ProductImage', [
                    'image_id' => $existingImage->image_id,
                    'product_id' => $product->product_id,
                    'image_url' => $imageUrl,
                    'slot' => $slot,
                ]);
            } else {
                // Create new
                $newImage = ProductImage::create([
                    'product_id' => $product->product_id,
                    'image_url' => $imageUrl,
                    'is_50ml' => $is50ml,
                    'is_additional' => $isAdditional,
                ]);
                \Log::info('Created ProductImage', [
                    'image_id' => $newImage->image_id,
                    'product_id' => $product->product_id,
                    'image_url' => $imageUrl,
                    'slot' => $slot,
                ]);
            }
        }

        // Reload product with all updated data
        $product = $product->fresh()->load('images');

        \Log::info('=== UPDATE REQUEST COMPLETE ===', [
            'product_id' => $product->product_id,
            'stock_30ml_final' => $product->stock_30ml,
            'stock_50ml_final' => $product->stock_50ml,
            'images_count' => $product->images->count(),
        ]);

        return response()->json($product, 200);
    }

    public function destroy($id)
    {
        $product = Product::findOrFail($id);
        
        // Delete all associated images from filesystem
        $frontendProductsPath = base_path('../../frontend/web-5scent/public/products');
        foreach ($product->images as $image) {
            $filePath = $frontendProductsPath . basename($image->image_url);
            if (file_exists($filePath)) {
                unlink($filePath);
            }
        }
        
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

        // Delete the file from frontend public directory
        $frontendProductsPath = base_path('../../frontend/web-5scent/public/products');
        $filePath = $frontendProductsPath . '/' . basename($image->image_url);
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
                'is_additional' => $request->input('is_additional'),
            ]);

            $product = Product::findOrFail($productId);

            $request->validate([
                'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:10240',
                'is_50ml' => 'sometimes|in:0,1',
                'is_additional' => 'sometimes|in:0,1',
            ]);

            $is50ml = (int)$request->input('is_50ml', 0);
            $isAdditional = (int)$request->input('is_additional', 0);

            // Determine the slot
            if (!$isAdditional) {
                $slot = $is50ml ? 1 : 2;
            } else {
                // For additional images, count existing ones to determine slot
                $additionalCount = ProductImage::where('product_id', $productId)
                    ->where('is_additional', 1)
                    ->count();
                $slot = $additionalCount < 1 ? 3 : 4;
            }

            $image = $request->file('image');
            $extension = strtolower($image->getClientOriginalExtension() ?: 'png');
            $filename = $this->getSlotFilename($product->name, $slot, $extension);
            $frontendProductsPath = base_path('../../frontend/web-5scent/public/products');
            if (!is_dir($frontendProductsPath)) {
                mkdir($frontendProductsPath, 0755, true);
            }
            
            // Delete old file if exists
            $oldFilePath = $frontendProductsPath . '/' . $filename;
            if (file_exists($oldFilePath)) {
                unlink($oldFilePath);
            }
            
            $image->move($frontendProductsPath, $filename);
            $imageUrl = '/products/' . $filename;

            // Check if image already exists for this slot
            $existingImage = ProductImage::where('product_id', $productId)
                ->where('is_50ml', $is50ml)
                ->where('is_additional', $isAdditional)
                ->first();

            if ($existingImage) {
                // Update existing
                $existingImage->update(['image_url' => $imageUrl]);
                $productImage = $existingImage;
            } else {
                // Create new
                $productImage = ProductImage::create([
                    'product_id' => $productId,
                    'image_url' => $imageUrl,
                    'is_50ml' => $is50ml,
                    'is_additional' => $isAdditional,
                ]);
            }

            \Log::info('Image uploaded successfully', [
                'product_id' => $productId,
                'image_url' => $imageUrl,
                'is_50ml' => $is50ml,
                'is_additional' => $isAdditional,
                'slot' => $slot,
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
