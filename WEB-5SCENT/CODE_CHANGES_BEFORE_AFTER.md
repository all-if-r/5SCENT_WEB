# Exact Code Changes - Before & After

## File 1: Frontend - `frontend/web-5scent/app/admin/products/page.tsx`

### Method: `handleUpdateProduct()`

#### BEFORE (BROKEN):
```typescript
// Create FormData to handle both product data and images
const formDataPayload = new FormData();
formDataPayload.append('name', formData.name);
formDataPayload.append('description', formData.description);
formDataPayload.append('top_notes', formData.top_notes || '');
formDataPayload.append('middle_notes', formData.middle_notes || '');
formDataPayload.append('base_notes', formData.base_notes || '');
formDataPayload.append('category', formData.category);
formDataPayload.append('price_30ml', String(formData.price_30ml || '0'));
formDataPayload.append('price_50ml', String(formData.price_50ml || '0'));
formDataPayload.append('stock_30ml', String(formData.stock_30ml || '0'));
formDataPayload.append('stock_50ml', String(formData.stock_50ml || '0'));

// Add uploaded images to FormData (for slots with new images)
uploadedImages.forEach((image, index) => {
  if (image) {
    formDataPayload.append(`images[${index}]`, image);  // WRONG: images[0], images[1]
  }
});

console.log('Updating product with data');
```

#### AFTER (FIXED):
```typescript
// Create FormData to handle both product data and images
const formDataPayload = new FormData();
formDataPayload.append('name', formData.name);
formDataPayload.append('description', formData.description);
formDataPayload.append('top_notes', formData.top_notes || '');
formDataPayload.append('middle_notes', formData.middle_notes || '');
formDataPayload.append('base_notes', formData.base_notes || '');
formDataPayload.append('category', formData.category);
formDataPayload.append('price_30ml', formData.price_30ml);  // FIXED: Removed String() and fallback
formDataPayload.append('price_50ml', formData.price_50ml);  // FIXED: Removed String() and fallback
formDataPayload.append('stock_30ml', formData.stock_30ml);  // FIXED: Removed String() and fallback
formDataPayload.append('stock_50ml', formData.stock_50ml);  // FIXED: Removed String() and fallback

// Add uploaded images to FormData with explicit slot keys
// Slot mapping: 0->1, 1->2, 2->3, 3->4
uploadedImages.forEach((image, index) => {
  if (image) {
    const slotKey = `image_slot_${index + 1}`;  // FIXED: image_slot_1, image_slot_2, etc.
    formDataPayload.append(slotKey, image);
    console.log(`Adding image for slot ${index + 1}:`, image.name);
  }
});

console.log('Updating product with FormData');
```

**Changes:**
1. Image key: `images[${index}]` → `image_slot_${index + 1}`
2. Stock fields: No default `|| '0'`, no `String()` conversion (FormData handles it)
3. Price fields: Same fix as stock
4. Console logging improved for debugging

---

## File 2: Backend - `backend/laravel-5scent/app/Http/Controllers/ProductController.php`

### Method: `update(Request $request, $id)`

#### BEFORE (BROKEN) - First Part:
```php
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
        'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:10240',  // WRONG: expects array
    ]);

    \Log::info('Validation passed', $validated);

    // Only update provided fields
    $updateData = [];
    foreach (['name', 'description', 'top_notes', 'middle_notes', 'base_notes', 'category', 'price_30ml', 'price_50ml', 'stock_30ml', 'stock_50ml'] as $field) {
        if (isset($validated[$field])) {
            $updateData[$field] = $validated[$field];  // WRONG: conditional, might skip stock
        }
    }

    if ($updateData) {
        $product->update($updateData);  // WRONG: silent if $updateData empty
        \Log::info('Product updated with data', [
            'product_id' => $product->product_id,
            'updated_fields' => $updateData,
        ]);
    }
```

#### AFTER (FIXED) - First Part:
```php
public function update(Request $request, $id)
{
    $product = Product::findOrFail($id);

    \Log::info('=== UPDATE REQUEST START ===', [  // FIXED: Better logging
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
        'stock_50ml' => 'sometimes|integer|min:0',  // FIXED: Changed from nullable
        'image_slot_1' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:10240',  // FIXED: Explicit slot keys
        'image_slot_2' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:10240',
        'image_slot_3' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:10240',
        'image_slot_4' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:10240',
    ]);

    \Log::info('Validation passed', [  // FIXED: Better logging
        'has_stock_30ml' => isset($validated['stock_30ml']),
        'has_stock_50ml' => isset($validated['stock_50ml']),
        'stock_30ml_value' => $validated['stock_30ml'] ?? 'NOT PROVIDED',
        'stock_50ml_value' => $validated['stock_50ml'] ?? 'NOT PROVIDED',
    ]);

    // Update product fields (including stock) - FIXED: Explicit assignment
    $product->name = $request->input('name', $product->name);
    $product->description = $request->input('description', $product->description);
    $product->category = $request->input('category', $product->category);
    $product->price_30ml = $request->input('price_30ml', $product->price_30ml);
    $product->price_50ml = $request->input('price_50ml', $product->price_50ml);
    $product->stock_30ml = $request->input('stock_30ml', $product->stock_30ml);  // FIXED: Direct assignment
    $product->stock_50ml = $request->input('stock_50ml', $product->stock_50ml);  // FIXED: Direct assignment
    $product->top_notes = $request->input('top_notes', $product->top_notes);
    $product->middle_notes = $request->input('middle_notes', $product->middle_notes);
    $product->base_notes = $request->input('base_notes', $product->base_notes);

    $product->save();  // FIXED: Explicit save, not conditional

    \Log::info('Product fields updated', [  // FIXED: Better logging
        'product_id' => $product->product_id,
        'stock_30ml' => $product->stock_30ml,
        'stock_50ml' => $product->stock_50ml,
    ]);
```

#### BEFORE (BROKEN) - Second Part (Image Processing):
```php
    if ($request->hasFile('images')) {  // WRONG: expects 'images' array
        $frontendProductsPath = base_path('../../frontend/web-5scent/public/products');
        if (!is_dir($frontendProductsPath)) {
            mkdir($frontendProductsPath, 0755, true);
        }
        
        foreach ($request->file('images') as $index => $image) {  // WRONG: iteration might fail
            if ($image) {
                // Slot numbering: index 0 = slot 1 (50ml), index 1 = slot 2 (30ml), index 2 = slot 3, index 3 = slot 4
                $slot = $index + 1;
                $filename = $this->getSlotFilename($product->name, $slot);
                
                // Delete old file if exists
                $oldFilePath = $frontendProductsPath . '/' . $filename;
                if (file_exists($oldFilePath)) {
                    unlink($oldFilePath);
                }
                
                // Save new file
                $image->move($frontendProductsPath, $filename);
                $imageUrl = '/products/' . $filename;
                
                $is50ml = ($slot === 1) ? 1 : 0;
                $isAdditional = ($slot >= 3) ? 1 : 0;
                
                // Find existing image for this slot and update, or create new
                $existingImage = $this->findOrCreateSlotImage($product->product_id, $slot);
                
                if ($existingImage) {
                    // Update existing image record
                    $existingImage->update([
                        'image_url' => $imageUrl,
                    ]);
                    \Log::info('Updated ProductImage:', [
                        'image_id' => $existingImage->image_id,
                        'product_id' => $product->product_id,
                        'image_url' => $imageUrl,
                        'slot' => $slot,
                    ]);
                } else {
                    // Create new image record
                    ProductImage::create([
                        'product_id' => $product->product_id,
                        'image_url' => $imageUrl,
                        'is_50ml' => $is50ml,
                        'is_additional' => $isAdditional,
                    ]);
                    \Log::info('Created ProductImage:', [
                        'product_id' => $product->product_id,
                        'image_url' => $imageUrl,
                        'slot' => $slot,
                    ]);
                }
            }
        }
    }

    // Refresh the product from the database to ensure all updated fields are included
    $product = $product->fresh()->load('images');

    return response()->json($product);  // WRONG: No explicit 200 status
}
```

#### AFTER (FIXED) - Second Part (Image Processing):
```php
    // Handle images - check each slot explicitly - FIXED: Explicit loop
    $frontendProductsPath = base_path('../../frontend/web-5scent/public/products');
    if (!is_dir($frontendProductsPath)) {
        mkdir($frontendProductsPath, 0755, true);
    }

    // Process each slot (1-4) - FIXED: Loop through slots, not array
    for ($slot = 1; $slot <= 4; $slot++) {
        $slotKey = "image_slot_{$slot}";  // FIXED: Explicit slot key

        if ($request->hasFile($slotKey)) {  // FIXED: Check specific slot
            $image = $request->file($slotKey);
            \Log::info("Processing slot {$slot}", [  // FIXED: Better logging
                'has_file' => true,
                'filename' => $image->getClientOriginalName(),
                'size' => $image->getSize(),
            ]);

            // Generate the target filename
            $filename = $this->getSlotFilename($product->name, $slot);
            \Log::info("Generated filename for slot {$slot}", [  // FIXED: Better logging
                'filename' => $filename,
            ]);

            // Delete old file if exists
            $oldFilePath = $frontendProductsPath . '/' . $filename;
            if (file_exists($oldFilePath)) {
                unlink($oldFilePath);
                \Log::info("Deleted old file", ['path' => $oldFilePath]);  // FIXED: Log deletion
            }

            // Move new file
            $image->move($frontendProductsPath, $filename);
            \Log::info("Moved image file", [  // FIXED: Better logging
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
                $existingImage->image_url = $imageUrl;  // FIXED: Direct property assignment
                $existingImage->save();  // FIXED: Explicit save
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
    }

    // Reload product with all updated data
    $product = $product->fresh()->load('images');

    \Log::info('=== UPDATE REQUEST COMPLETE ===', [  // FIXED: Better logging
        'product_id' => $product->product_id,
        'stock_30ml_final' => $product->stock_30ml,
        'stock_50ml_final' => $product->stock_50ml,
        'images_count' => $product->images->count(),
    ]);

    return response()->json($product, 200);  // FIXED: Explicit 200 status
}
```

---

## Summary of Key Changes

### Frontend
1. **Image keys**: `images[${index}]` → `image_slot_${index + 1}`
2. **Stock/Price fields**: Removed default `|| '0'` and `String()` conversion
3. **Logging**: More detailed console logs for debugging

### Backend
1. **Validation**: `images.*` → `image_slot_1`, `image_slot_2`, `image_slot_3`, `image_slot_4`
2. **Stock update**: Changed from conditional `update()` to explicit field assignment
3. **Image processing**: Changed from `foreach($request->file('images'))` to explicit `for ($slot = 1; $slot <= 4)`
4. **DB save**: Changed from conditional `update()` to explicit property assignment + `save()`
5. **Logging**: Much more detailed logging at each step for debugging

### Why These Changes Work

1. **Explicit slot keys** prevent ambiguity in form submission
2. **Explicit field assignment** guarantees stock fields are processed
3. **Explicit loop** ensures all 4 slots are checked, not skipped
4. **Better logging** makes debugging easier if issues occur

### Files Not Changed

- Product model (already has correct fillable fields)
- Routes (apiResource already includes PUT)
- No database migrations needed
