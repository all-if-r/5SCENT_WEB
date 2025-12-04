# Product Management - Complete Fix

## What Was Fixed

### Problem 1: Images Not Saving
**Root Cause:** Frontend was using `images[${index}]` which doesn't match the explicit slot validation in the backend.

**The Fix:**
- Frontend now uses explicit keys: `image_slot_1`, `image_slot_2`, `image_slot_3`, `image_slot_4`
- Backend validation now explicitly expects these keys
- Backend loop processes each slot individually (not iterating over an array)

### Problem 2: Stock Values Not Updating
**Root Cause:** The old code used `$product->update($updateData)` with conditional field population, which could silently skip stock fields.

**The Fix:**
- Changed to explicit field assignment: `$product->stock_30ml = $request->input('stock_30ml', ...)`
- Explicit `$product->save()` call
- Stock fields are always processed from the request
- Added comprehensive logging to verify the values are received and saved

## Frontend Changes

**File:** `frontend/web-5scent/app/admin/products/page.tsx`

**Method:** `handleUpdateProduct()`

### What Changed:
```typescript
// OLD (WRONG):
formDataPayload.append(`images[${index}]`, image);

// NEW (CORRECT):
uploadedImages.forEach((image, index) => {
  if (image) {
    const slotKey = `image_slot_${index + 1}`;  // image_slot_1, image_slot_2, etc.
    formDataPayload.append(slotKey, image);
  }
});
```

### Stock Fields:
```typescript
// Always send these fields with actual values (never default to '0')
formDataPayload.append('stock_30ml', formData.stock_30ml);
formDataPayload.append('stock_50ml', formData.stock_50ml);
```

## Backend Changes

**File:** `backend/laravel-5scent/app/Http/Controllers/ProductController.php`

**Method:** `update($request, $id)`

### What Changed:

1. **Validation** - Explicit image keys:
```php
'image_slot_1' => 'nullable|image|...',
'image_slot_2' => 'nullable|image|...',
'image_slot_3' => 'nullable|image|...',
'image_slot_4' => 'nullable|image|...',
```

2. **Stock Field Updates** - Explicit assignment:
```php
// OLD (WRONG):
if ($updateData) {
    $product->update($updateData);  // Could silently skip fields
}

// NEW (CORRECT):
$product->stock_30ml = $request->input('stock_30ml', $product->stock_30ml);
$product->stock_50ml = $request->input('stock_50ml', $product->stock_50ml);
$product->save();  // Explicit save
```

3. **Image Processing** - Explicit slot loop:
```php
// OLD (WRONG):
foreach ($request->file('images') as $index => $image) {  // Might not iterate properly
    $slot = $index + 1;
}

// NEW (CORRECT):
for ($slot = 1; $slot <= 4; $slot++) {
    $slotKey = "image_slot_{$slot}";
    if ($request->hasFile($slotKey)) {  // Check each slot explicitly
        // Process this slot
    }
}
```

## Testing the Fix

### Test 1: Update Stock Only
1. Go to Admin Products page
2. Click Edit on any product
3. Change `stock_30ml` to a different number (e.g., 50)
4. Change `stock_50ml` to a different number (e.g., 75)
5. Do NOT upload any images
6. Click "Update Product"
7. **Expected:** Success message, stock values change in database and list view

**Verification SQL:**
```sql
SELECT stock_30ml, stock_50ml, updated_at FROM product WHERE product_id = 1;
-- Should show new values with recent updated_at
```

### Test 2: Update Images Only
1. Edit any existing product
2. Upload new image to Slot 1 (50ml) only
3. Do NOT change any product fields
4. Click "Update Product"
5. **Expected:** 
   - Success message
   - File appears in `frontend/web-5scent/public/products/` with name pattern `{sanitized-name}50ml.png`
   - ProductImage table has a record with that image_url
   - Modal reopens and shows the new image in Slot 1

**Verification:**
```bash
# Check files exist
ls -la "frontend/web-5scent/public/products/" | grep "50ml"
# Should show: productname50ml.png
```

```sql
-- Check database
SELECT * FROM productimage WHERE product_id = 1 AND is_50ml = 1;
-- Should show updated image_url matching the filename
```

### Test 3: Update Everything
1. Edit product named "Night Bloom"
2. Change name to "Day Dream"
3. Change all prices and stock values
4. Upload images to all 4 slots
5. Click "Update Product"
6. **Expected:**
   - Success message
   - New files created with pattern:
     - `day-dream50ml.png` (slot 1)
     - `day-dream30ml.png` (slot 2)
     - `additionalday-dream1.png` (slot 3)
     - `additionalday-dream2.png` (slot 4)
   - Old files deleted (with "night-bloom" pattern)
   - Product table shows new name and stock values
   - ProductImage rows updated with new image_urls
   - Modal shows all 4 new images when reopened

### Test 4: Filename Sanitization
Tests that product names are correctly converted to filenames:

| Product Name | Slot 1 File | Slot 2 File | Slot 3 File | Slot 4 File |
|---|---|---|---|---|
| Night Bloom | night-bloom50ml.png | night-bloom30ml.png | additionalnight-bloom1.png | additionalnight-bloom2.png |
| Fresh & Green | fresh-green50ml.png | fresh-green30ml.png | additionalfresh-green1.png | additionalfresh-green2.png |
| Product! #1 | product1-50ml.png | product1-30ml.png | additionalproduct1-1.png | additionalproduct1-2.png |

**How it works:**
1. Spaces → hyphens
2. Remove special characters
3. Convert to lowercase
4. Remove consecutive hyphens
5. Trim hyphens from edges

## Debug Logging

If something still doesn't work, check the Laravel logs:

```bash
cd backend/laravel-5scent
tail -f storage/logs/laravel.log
```

Look for these log markers:
- `=== UPDATE REQUEST START ===` - Request received
- `Validation passed` - Input validated successfully
- `Product fields updated` - Stock fields saved
- `Processing slot N` - Image processing for each slot
- `Generated filename for slot N` - Filename computed
- `Moved image file` - File saved to disk
- `Created ProductImage` or `Updated ProductImage` - DB record created/updated
- `=== UPDATE REQUEST COMPLETE ===` - Request finished

Example log flow for a successful update:
```
[2024-12-04 10:30:15] local.INFO: === UPDATE REQUEST START === {"product_id":"1","product_name":"Night Bloom"}
[2024-12-04 10:30:15] local.INFO: Validation passed {"has_stock_30ml":true,"stock_30ml_value":"50"}
[2024-12-04 10:30:15] local.INFO: Product fields updated {"product_id":"1","stock_30ml":"50","stock_50ml":"75"}
[2024-12-04 10:30:15] local.INFO: Processing slot 1 {"has_file":true,"filename":"nightbloom50ml.png"}
[2024-12-04 10:30:15] local.INFO: Moved image file {"destination":"/path/to/products/nightbloom50ml.png"}
[2024-12-04 10:30:15] local.INFO: Created ProductImage {"image_id":"42","product_id":"1","image_url":"/products/nightbloom50ml.png","slot":1}
[2024-12-04 10:30:15] local.INFO: === UPDATE REQUEST COMPLETE === {"product_id":"1","stock_30ml_final":"50","stock_50ml_final":"75","images_count":"4"}
```

## Common Issues & Solutions

### Issue: "Images not appearing in modal after update"
**Check:**
1. Files exist in `frontend/web-5scent/public/products/`?
   ```bash
   ls -la "frontend/web-5scent/public/products/"
   ```
2. ProductImage table has correct records?
   ```sql
   SELECT * FROM productimage WHERE product_id = YOUR_PRODUCT_ID;
   ```
3. Image URLs in DB match filenames?

### Issue: "Stock values still old after update"
**Check:**
1. Look for "Product fields updated" log entry with new values
2. Verify SQL after update:
   ```sql
   SELECT stock_30ml, stock_50ml FROM product WHERE product_id = YOUR_PRODUCT_ID;
   ```
3. Check that formData actually contains the values before sending

### Issue: "Getting validation error for images"
**Check:**
1. File is actually selected (check FormData in Network tab of DevTools)
2. File is valid image (jpg, png, gif, webp)
3. File is under 10MB
4. Check logs for validation error details

### Issue: "File appears but wrong filename"
**Check:**
1. Product name has special characters that don't sanitize well
2. Sanitization function removes them all
3. Example: "Night & Bloom" → "night-bloom" (& is removed)

## Request/Response Format

### Frontend Sends:
```
PUT /api/admin/products/1

FormData:
  name: "Night Bloom"
  description: "..."
  stock_30ml: "50"
  stock_50ml: "75"
  price_30ml: "299000"
  price_50ml: "399000"
  category: "Night"
  top_notes: "..."
  middle_notes: "..."
  base_notes: "..."
  image_slot_1: [File object]      <- Only if user selected this slot
  image_slot_2: [File object]      <- Only if user selected this slot
  image_slot_3: (not present)      <- User didn't select this slot
  image_slot_4: (not present)      <- User didn't select this slot
```

### Backend Returns (on success):
```json
{
  "product_id": 1,
  "name": "Night Bloom",
  "description": "...",
  "stock_30ml": 50,
  "stock_50ml": 75,
  "price_30ml": 299000,
  "price_50ml": 399000,
  "category": "Night",
  "top_notes": "...",
  "middle_notes": "...",
  "base_notes": "...",
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-12-04T10:30:15",
  "images": [
    {
      "image_id": 1,
      "product_id": 1,
      "image_url": "/products/night-bloom50ml.png",
      "is_50ml": 1,
      "is_additional": 0,
      "created_at": "2024-01-15T10:30:00",
      "updated_at": "2024-12-04T10:30:15"
    },
    ...
  ]
}
```

## Final Verification Checklist

- [ ] Product name in edit modal can be changed
- [ ] Stock fields can be changed
- [ ] Images can be uploaded to each slot
- [ ] Successfully click "Update Product"
- [ ] Get "Product updated successfully" toast
- [ ] Database shows new stock values
- [ ] Files exist in `frontend/web-5scent/public/products/`
- [ ] Filenames follow pattern `{name}{slot}.png`
- [ ] ProductImage table has correct records
- [ ] Reopening modal shows all updates applied
- [ ] Product list view shows updated values
- [ ] No JavaScript errors in console
- [ ] No Laravel errors in logs

If all of these pass, the fix is complete and working properly.
