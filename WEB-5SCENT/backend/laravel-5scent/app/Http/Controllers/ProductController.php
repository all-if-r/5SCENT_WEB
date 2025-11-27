<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class ProductController extends Controller
{
    private function getFrontendProductsPath(): string
    {
        // Backend lives in backend/laravel-5scent; frontend is two levels up
        $path = base_path('../../frontend/web-5scent/public/products');
        return $path;
    }

    private function ensureFrontendProductsPath(): string
    {
        $path = $this->getCanonicalPath($this->getFrontendProductsPath());

        if (!File::exists($path)) {
            File::makeDirectory($path, 0755, true);
        }

        return $path;
    }

    private function getCanonicalPath(string $path): string
    {
        $real = realpath($path);
        return $real !== false ? $real : $path;
    }

    private function resolveSlotFromImage(ProductImage $image): ?int
    {
        if ($image->is_50ml) {
            return 0;
        }

        $filename = strtolower(basename($image->image_url ?? ''));

        if (str_contains($filename, '50ml')) {
            return 0;
        }
        if (str_contains($filename, '30ml')) {
            return 1;
        }
        if (preg_match('/additional.*1/', $filename)) {
            return 2;
        }
        if (preg_match('/additional.*2/', $filename)) {
            return 3;
        }

        return null;
    }

    private function storeProductImage($image, string $filename): string
    {
        $targetDir = $this->ensureFrontendProductsPath();
        $image->move($targetDir, $filename);

        return '/products/' . $filename;
    }

    private function deleteProductImageFile(?string $imageUrl): void
    {
        if (!$imageUrl) {
            return;
        }

        $targetDir = $this->ensureFrontendProductsPath();
        $filePath = $targetDir . DIRECTORY_SEPARATOR . basename($imageUrl);

        if (File::exists($filePath)) {
            File::delete($filePath);
        }

        $legacyPath = public_path(ltrim($imageUrl, '/'));
        if (File::exists($legacyPath)) {
            File::delete($legacyPath);
        }
    }

    private function resolveFileName(string $baseName, $image): string
    {
        $safeName = preg_replace('/[^A-Za-z0-9_-]/', '', $baseName) ?: 'image';
        $extension = $image->getClientOriginalExtension() ?: $image->guessExtension() ?: 'png';

        return $safeName . '.' . $extension;
    }

    private function normalizeImageUrl(?string $imageUrl): ?string
    {
        if (!$imageUrl) {
            return null;
        }

        $imageUrl = trim($imageUrl);

        if (str_starts_with($imageUrl, 'http://') || str_starts_with($imageUrl, 'https://')) {
            $path = parse_url($imageUrl, PHP_URL_PATH);
            $filename = $path ? basename($path) : basename($imageUrl);
            return $filename ? '/products/' . $filename : $imageUrl;
        }

        if (!str_starts_with($imageUrl, '/')) {
            $imageUrl = '/' . $imageUrl;
        }

        if (!str_starts_with($imageUrl, '/products/')) {
            $filename = basename($imageUrl);
            return $filename ? '/products/' . $filename : $imageUrl;
        }

        return $imageUrl;
    }

    private function mapImagesToSlots(Product $product): array
    {
        $slots = [null, null, null, null];
        $product->images()->orderBy('image_id')->get()->each(function ($image) use (&$slots) {
            $slot = $this->resolveSlotFromImage($image);

            if ($slot !== null && $slot >= 0 && $slot < 4) {
                $slots[$slot] = $image;
                return;
            }

            for ($i = 0; $i < 4; $i++) {
                if ($slots[$i] === null) {
                    $slots[$i] = $image;
                    break;
                }
            }
        });

        return $slots;
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

            $products = $products->map(function ($product) {
                if ($product->relationLoaded('images')) {
                    $product->images->transform(function ($image) {
                        $image->image_url = $this->normalizeImageUrl($image->image_url);
                        return $image;
                    });
                }

                if ($product->relationLoaded('mainImage') && $product->mainImage) {
                    $product->mainImage->image_url = $this->normalizeImageUrl($product->mainImage->image_url);
                }

                return $product;
            });

            // Filter best sellers if requested
            if ($request->has('best_seller') && $request->best_seller) {
                $products = $products->filter(function ($product) {
                    return ($product->ratings_avg_stars ?? 0) >= 4.5;
                })->values();
            }

            return response()->json([
                'data' => $products,
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
                ->map(function ($product) {
                    if ($product->relationLoaded('images')) {
                        $product->images->transform(function ($image) {
                            $image->image_url = $this->normalizeImageUrl($image->image_url);
                            return $image;
                        });
                    }

                    if ($product->relationLoaded('mainImage') && $product->mainImage) {
                        $product->mainImage->image_url = $this->normalizeImageUrl($product->mainImage->image_url);
                    }

                    return $product;
                })
                ->values();

            return response()->json([
                'data' => $products,
                'products' => $products,
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
            'image_slot' => 'nullable|array',
            'image_name' => 'nullable|array',
        ]);

        // Set stock_50ml if not provided
        if (!isset($validated['stock_50ml']) || $validated['stock_50ml'] === null || $validated['stock_50ml'] === '') {
            $validated['stock_50ml'] = $validated['stock_30ml'];
        }

        $product = Product::create($validated);

        if ($request->hasFile('images')) {
            $imageNames = $request->input('image_name', []);

            for ($slot = 0; $slot < 4; $slot++) {
                if (!$request->hasFile("images.$slot")) {
                    continue;
                }

                $image = $request->file("images.$slot");
                $customName = $request->input("image_name.$slot", $imageNames[$slot] ?? "image_{$slot}");

                $filename = $this->resolveFileName($customName, $image);
                $imageUrl = $this->storeProductImage($image, $filename);

                ProductImage::create([
                    'product_id' => $product->product_id,
                    'image_url' => $imageUrl,
                    'is_50ml' => $slot === 0 ? 1 : 0,
                ]);
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
            'image_slot' => 'nullable|array',
            'image_name' => 'nullable|array',
        ]);

        \Log::info('Validation passed', $validated);

        // Debug incoming files to verify slot mapping
        $incomingImages = [];
        for ($slot = 0; $slot < 4; $slot++) {
            $incomingImages[$slot] = $request->hasFile("images.$slot")
                ? $request->file("images.$slot")->getClientOriginalName()
                : null;
        }
        \Log::info('Edit product files', [
            'product_id' => $id,
            'incoming_images' => $incomingImages,
            'image_slot_input' => $request->input('image_slot', []),
            'image_name_input' => $request->input('image_name', []),
        ]);

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

        $existingImages = [];

        if ($request->hasFile('images') || $request->filled('images_to_delete')) {
            $existingImages = $this->mapImagesToSlots($product);
        }

        $imagesToDelete = $request->input('images_to_delete');
        if ($imagesToDelete) {
            $deleteIds = is_array($imagesToDelete) ? $imagesToDelete : json_decode($imagesToDelete, true);

            if (is_array($deleteIds)) {
                foreach ($deleteIds as $imageId) {
                    $image = ProductImage::find($imageId);

                    if ($image && $image->product_id == $product->product_id) {
                        $this->deleteProductImageFile($image->image_url);
                        $image->delete();

                        foreach ($existingImages as $index => $slotImage) {
                            if ($slotImage && $slotImage->image_id == $imageId) {
                                $existingImages[$index] = null;
                            }
                        }
                    }
                }
            }
        }

        if ($request->hasFile('images')) {
            $imageNames = $request->input('image_name', []);

            for ($slot = 0; $slot < 4; $slot++) {
                $fieldName = "images.$slot";

                if (!$request->hasFile($fieldName)) {
                    continue;
                }

                $image = $request->file($fieldName);
                $customName = $request->input("image_name.$slot", $imageNames[$slot] ?? "image_{$slot}");
                $existingImage = $existingImages[$slot] ?? null;

                $targetFilename = $existingImage && $existingImage->image_url
                    ? basename($existingImage->image_url)
                    : $this->resolveFileName($customName, $image);

                if ($existingImage) {
                    $this->deleteProductImageFile($existingImage->image_url);
                }

                $imageUrl = $this->storeProductImage($image, $targetFilename);
                
                if ($existingImage) {
                    $existingImage->update([
                        'image_url' => $imageUrl,
                        'is_50ml' => $slot === 0 ? 1 : 0,
                    ]);
                    $existingImages[$slot] = $existingImage->fresh();
                } else {
                    $existingImages[$slot] = ProductImage::create([
                        'product_id' => $product->product_id,
                        'image_url' => $imageUrl,
                        'is_50ml' => $slot === 0 ? 1 : 0,
                    ]);
                }
                
                \Log::info('Image processed:', [
                    'product_id' => $product->product_id,
                    'filename' => $targetFilename,
                    'slot' => $slot,
                    'is_50ml' => $slot === 0 ? 1 : 0,
                ]);
            }
        }

        // Ensure the product updated_at always reflects changes (including image-only updates)
        $product->touch();

        return response()->json($product->load('images'));
    }

    public function destroy($id)
    {
        $product = Product::with('images')->findOrFail($id);

        // Remove associated files first (fail-safe if files are already missing)
        foreach ($product->images as $image) {
            $this->deleteProductImageFile($image->image_url);
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

        $this->deleteProductImageFile($image->image_url);

        $image->delete();

        $product->touch();

        return response()->json(['message' => 'Image deleted successfully']);
    }

    public function carouselImages()
    {
        try {
            $images = ProductImage::select('image_id', 'product_id', 'image_url', 'is_50ml')
                ->whereNotNull('image_url')
                ->where(function ($query) {
                    $query->where('is_50ml', 1)
                          ->orWhereRaw('LOWER(image_url) LIKE ?', ['%50ml%']);
                })
                ->orderBy('product_id')
                ->orderBy('image_id')
                ->get()
                ->groupBy('product_id')
                ->map(function ($group) {
                    $primary = $group->firstWhere('is_50ml', 1) ?: $group->first();

                    if ($primary) {
                        $primary->image_url = $this->normalizeImageUrl($primary->image_url);
                    }

                    return $primary;
                })
                ->filter()
                ->values()
                ->map(function ($image) {
                    return [
                        'product_id' => $image->product_id,
                        'image_id' => $image->image_id,
                        'image_url' => $this->normalizeImageUrl($image->image_url),
                    ];
                });

            return response()->json([
                'images' => $images,
                'count' => $images->count(),
            ]);
        } catch (\Exception $e) {
            \Log::error('ProductController@carouselImages error: ' . $e->getMessage());

            return response()->json([
                'error' => 'Failed to fetch product images',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
