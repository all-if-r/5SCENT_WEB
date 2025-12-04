# Product Management Implementation - Detailed Technical Reference

## Architecture Overview

```
Frontend (Next.js/React)
    ↓
    └─→ POST /admin/products (FormData: product data + images)
    └─→ PUT /admin/products/{id} (FormData: product data + images)
    └─→ DELETE /admin/products/{id}/images/{imageId}
    ↓
Backend (Laravel)
    ↓
    ProductController methods:
    ├─ store() - Create product with images
    ├─ update() - Update product data and images
    ├─ deleteImage() - Delete image from slot
    └─ uploadImage() - Upload image for specific slot
    ↓
    Image Storage & Database
    ├─ Filesystem: frontend/web-5scent/public/products/
    └─ Database: productimage table
```

---

## Detailed Method Documentation

### 1. sanitizeProductName(string $name) → string

**Purpose:** Convert product name to filename-safe format

**Input:** Product name (any string)
**Output:** Sanitized name suitable for filenames

**Process:**
```
"Night Bloom"
  ↓ Replace spaces with underscores
"Night_Bloom"
  ↓ Remove special characters (keep alphanumeric, _, -)
"Night_Bloom"
  ↓ Return
```

**Examples:**
- "Ocean Breeze" → "Ocean_Breeze"
- "Night & Bloom!" → "Night_Bloom"
- "Oud 50/50" → "Oud_5050"

**Edge Cases:**
- Empty name: → "" (empty string)
- Name with only special chars: → "" (empty string)
- Name with Unicode: Special chars removed, ASCII kept

---

### 2. getSlotFilename(string $productName, int $slot) → string

**Purpose:** Generate filename for specific slot

**Inputs:**
- `$productName`: Product name (used as base)
- `$slot`: 1-4 (identifies which slot)

**Output:** Complete filename with .png extension

**Logic:**
```php
$sanitized = sanitizeProductName($productName);

if ($slot === 1) return "{$sanitized}50ml.png";      // 50ml variant
if ($slot === 2) return "{$sanitized}30ml.png";      // 30ml variant
if ($slot === 3) return "additional{$sanitized}1.png"; // Additional 1
if ($slot === 4) return "additional{$sanitized}2.png"; // Additional 2
```

**Examples:**
- Product: "Night Bloom", Slot 1 → "Night_Bloom50ml.png"
- Product: "Night Bloom", Slot 3 → "additionalNight_Bloom1.png"

---

### 3. findOrCreateSlotImage(int $productId, int $slot) → ?ProductImage

**Purpose:** Find existing productimage record for a specific slot

**Inputs:**
- `$productId`: Product ID
- `$slot`: 1-4 (identifies which slot)

**Output:** ProductImage model or null

**Logic:**

For main images (slots 1-2):
```
Convert slot to flags:
  Slot 1 → is_50ml=1, is_additional=0
  Slot 2 → is_50ml=0, is_additional=0

Query productimage WHERE:
  - product_id = $productId
  - is_50ml = (flag)
  - is_additional = (flag)

Return first (and only) match
```

For additional images (slots 3-4):
```
Query productimage WHERE:
  - product_id = $productId
  - is_50ml = 0
  - is_additional = 1

Sort by created_at ASC

Return:
  Slot 3 → skip(0) first()
  Slot 4 → skip(1) first()
```

**Why this works:**
- Main images: Unique (50ml flag unique, 30ml flag unique)
- Additional images: Multiple rows, ordered by creation time
- First created = Slot 3
- Second created = Slot 4
- This allows moving images between slots without recreating

---

### 4. store() - Create Product

**Request:**
```php
POST /admin/products
Content-Type: multipart/form-data

Form data:
- name: string (required)
- description: string (required)
- category: 'Day'|'Night' (required)
- price_30ml: numeric (required)
- price_50ml: numeric (required)
- stock_30ml: integer (required)
- stock_50ml: integer (optional)
- top_notes: string (optional)
- middle_notes: string (optional)
- base_notes: string (optional)
- images[0]: file (optional, image/jpeg|png, max 10MB)
- images[1]: file (optional)
- images[2]: file (optional)
- images[3]: file (optional)
```

**Process:**
1. Validate all inputs
2. Create product row with provided data
3. For each uploaded image (indexed 0-3):
   ```
   slot = index + 1
   filename = getSlotFilename(product.name, slot)
   
   Save file to frontend/web-5scent/public/products/{filename}
   
   Create productimage row:
   - product_id: {new product id}
   - image_url: /products/{filename}
   - is_50ml: (1 if slot==1, else 0)
   - is_additional: (1 if slot>=3, else 0)
   ```
4. Return created product with images

**Database State After:**
```
product: 1 row
productimage: 1-4 rows (one per uploaded image)
Files: 1-4 PNG files in frontend/web-5scent/public/products/
```

**Example Result:**
```json
{
  "product_id": 5,
  "name": "Night Bloom",
  "price_30ml": 69000,
  "price_50ml": 109000,
  "images": [
    {
      "image_id": 10,
      "product_id": 5,
      "image_url": "/products/Night_Bloom50ml.png",
      "is_50ml": 1,
      "is_additional": 0
    },
    {
      "image_id": 11,
      "product_id": 5,
      "image_url": "/products/Night_Bloom30ml.png",
      "is_50ml": 0,
      "is_additional": 0
    }
  ]
}
```

---

### 5. update() - Edit Product

**Request:**
```php
PUT /admin/products/{id}
Content-Type: multipart/form-data

Form data:
- name: string (optional)
- description: string (optional)
- category: string (optional)
- price_30ml: numeric (optional)
- price_50ml: numeric (optional)
- stock_30ml: integer (optional)
- stock_50ml: integer (optional)
- top_notes: string (optional)
- middle_notes: string (optional)
- base_notes: string (optional)
- images[0]: file (optional, replaces slot 1)
- images[1]: file (optional, replaces slot 2)
- images[2]: file (optional, replaces slot 3)
- images[3]: file (optional, replaces slot 4)
```

**Process:**
1. Find product by ID
2. Validate provided fields
3. Update product row (only provided fields)
4. For each uploaded image (indexed 0-3):
   ```
   slot = index + 1
   
   Use UPDATED product name to generate filename:
   filename = getSlotFilename(product.name, slot)
   
   Delete old file if exists:
   path = frontend/web-5scent/public/products/{filename}
   if (file_exists(path)) unlink(path)
   
   Save new file:
   image.move(products_folder, filename)
   
   Set image flags:
   is_50ml = (slot == 1 ? 1 : 0)
   is_additional = (slot >= 3 ? 1 : 0)
   
   Find existing productimage row:
   existing = findOrCreateSlotImage(product.id, slot)
   
   If exists, update:
   existing.update(['image_url' => '/products/{filename}'])
   (created_at preserved, updated_at auto-updated)
   
   If not exists, create:
   ProductImage.create({...})
   ```
5. Return updated product with images

**Key Behavior:**
- **Single update per slot:** Image row is updated, not duplicated
- **File overwriting:** Old file deleted, new file saved with same name
- **Timestamp preservation:** created_at never changes, updated_at changes
- **Name changes:** Files renamed based on updated product name

**Example Scenario:**
```
Before:
- File: Night_Bloom50ml.png
- Database: image_url = /products/Night_Bloom50ml.png

Admin edits:
- Changes name to "Ocean Breeze"
- Replaces 50ml image

After:
- Old file deleted: Night_Bloom50ml.png ✗
- New file created: Ocean_Breeze50ml.png ✓
- Database updated: image_url = /products/Ocean_Breeze50ml.png
- Same productimage row (image_id unchanged)
```

---

### 6. deleteImage() - Delete Image Slot

**Request:**
```php
DELETE /admin/products/{productId}/images/{imageId}
```

**Process:**
1. Find product by productId
2. Find image by imageId
3. Verify image belongs to product (image.product_id == productId)
4. Construct filename from image_url:
   ```php
   filename = basename(image.image_url)
   // basename('/products/Night_Bloom50ml.png') 
   //   → 'Night_Bloom50ml.png'
   ```
5. Delete file from filesystem:
   ```php
   path = 'frontend/web-5scent/public/products/' . filename
   if (file_exists(path)) unlink(path)
   ```
6. Delete database row:
   ```php
   image.delete()
   ```
7. Return success response

**State After:**
- Slot is now empty (no file, no database row)
- When opening edit modal, slot shows empty upload placeholder

---

### 7. uploadImage() - Upload Single Image

**Request:**
```php
POST /admin/products/{productId}/upload-image
Content-Type: multipart/form-data

Form data:
- image: file (required, image/jpeg|png, max 10MB)
- is_50ml: '0'|'1' (optional, default 0)
- is_additional: '0'|'1' (optional, default 0)
```

**Process:**
1. Find product by productId
2. Validate image file
3. Determine slot from flags:
   ```php
   if (is_50ml==1 && is_additional==0) slot = 1
   if (is_50ml==0 && is_additional==0) slot = 2
   if (is_50ml==0 && is_additional==1) {
     // Count existing additional images
     count = ProductImage.where(product_id, is_additional=1).count()
     slot = count < 1 ? 3 : 4
   }
   ```
4. Generate filename:
   ```php
   filename = getSlotFilename(product.name, slot)
   ```
5. Delete old file if exists
6. Save new file
7. Update or create productimage row
8. Return image data

**Used By:**
- Upload individual images via separate API calls (if needed)
- Currently integrated into store() and update()

---

## Frontend Integration

### Image Slot Array Structure
```tsx
uploadedImages: File[] = [null, null, null, null]
// Index 0 = Slot 1 (50ml)
// Index 1 = Slot 2 (30ml)
// Index 2 = Slot 3 (Additional 1)
// Index 3 = Slot 4 (Additional 2)

imagePreviews: (string|null)[] = [null, null, null, null]
// Same structure, base64 preview data

existingImages: ProductImage[] = []
// Current product images from database

imagesToDelete: number[] = []
// Image IDs to delete when updating
```

### Image Upload Form Data
```tsx
const formDataPayload = new FormData();

// Product fields
formDataPayload.append('name', 'Night Bloom');
formDataPayload.append('description', '...');
// ... other fields ...

// Images (only non-null ones)
uploadedImages.forEach((file, index) => {
  if (file) {
    formDataPayload.append(`images[${index}]`, file);
  }
});

// Send
api.put(`/admin/products/${id}`, formDataPayload, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

This maps to backend:
```php
$request->file('images')[0] → Slot 1 (50ml)
$request->file('images')[1] → Slot 2 (30ml)
$request->file('images')[2] → Slot 3
$request->file('images')[3] → Slot 4
```

---

## Troubleshooting Guide

### Issue: Images not uploading

**Check:**
1. Frontend folder path: `frontend/web-5scent/public/products/` exists
2. Folder permissions: `chmod 755`
3. Laravel logs: `storage/logs/laravel.log`
4. Browser console: Network tab, check POST response

**Solution:**
```bash
# Create folder if missing
mkdir -p frontend/web-5scent/public/products
chmod 755 frontend/web-5scent/public/products
```

### Issue: Images in wrong slots in edit modal

**Likely cause:** Additional images not sorted by created_at

**Check:** Frontend `openEditModal()` function
- Verify images sorted: `additionalImages.sort((a,b) => ...)`
- Check created_at field exists in ProductImage interface

**Test:**
```php
// Laravel
SELECT * FROM productimage 
WHERE product_id = 5 AND is_additional = 1 
ORDER BY created_at ASC;

// Should show first created = slot 3, second = slot 4
```

### Issue: Edit product creates duplicate image rows

**Likely cause:** Old code still using `ProductImage::create()` instead of update

**Check:** ProductController `update()` method
- Must use `findOrCreateSlotImage()` to find existing row
- Must call `$existing->update()` instead of `create()`

**Fix:**
```php
$existingImage = $this->findOrCreateSlotImage($product->product_id, $slot);
if ($existingImage) {
    $existingImage->update(['image_url' => $imageUrl]);
} else {
    ProductImage::create([...]);
}
```

### Issue: Old image files not deleted

**Likely cause:** File path constructed incorrectly

**Check:** 
```php
// WRONG - adds extra /
$path = $frontendProductsPath . '/' . $filename;

// RIGHT - already has filename
$path = $frontendProductsPath . '/' . basename($image->image_url);
```

### Issue: Database image_url wrong format

**Expected format:** `/products/Night_Bloom50ml.png`

**Wrong formats:**
- ✗ `C:\Users\...\frontend\web-5scent\public\products\1764850261_69317a55f25ea.png`
- ✗ `/web-5scent/public/products/filename.png`
- ✗ `products/filename.png` (missing leading slash)

**Check:** Store only should use slot-based names:
```php
$filename = $this->getSlotFilename($product->name, $slot);
$imageUrl = '/products/' . $filename;  // NOT '/products/' . basename(...)
```

---

## Performance Considerations

### Image Lookups
Finding correct slot image:
- Main images (slots 1-2): O(1) - indexed lookup
- Additional images (slots 3-4): O(n) - sorts by created_at
- Typical case: 1-2 additional images, negligible performance impact

### File Operations
Per image operation:
- Read 1 file (if exists)
- Delete 1 file (if exists)
- Write 1 file
- Update/create 1 DB row
- Total: ~3 disk operations per image

Optimization: Combine operations in transactions if needed.

---

## Database Consistency

### Invariants (always true)
1. One 50ml image per product (or zero)
   - `is_50ml=1 AND is_additional=0` exists at most once
2. One 30ml image per product (or zero)
   - `is_50ml=0 AND is_additional=0` exists at most once
3. At most two additional images per product
   - `is_additional=1` appears 0-2 times
4. File exists for every productimage row
5. Every image file has a productimage row (no orphans)

### Crash Safety
If server crashes during image update:
1. File saved, DB not updated → Orphaned file (OK, can be cleaned up)
2. DB updated, file not saved → Missing file (Detected at load time)
3. Atomicity: Update in transaction if critical

### Cleanup Query (if needed)
```sql
-- Find orphaned files (db rows without matching file)
SELECT * FROM productimage 
WHERE CONCAT('/products/', SUBSTRING_INDEX(image_url, '/', -1)) NOT IN (
  SELECT image_name FROM (
    SELECT ... /* list of actual files */
  ) AS files
);
```

---

## Migration Notes (if upgrading)

### No migration needed!
This refactor uses existing table schema:
- `is_50ml` column (already exists)
- `is_additional` column (already exists)
- `image_url` column (already exists)
- Timestamps (already exist)

### For existing products:
On first edit, images will be:
1. Located by `is_50ml` and `is_additional` flags
2. Renamed to slot-based names when replaced
3. Database rows updated with new names

Old image files with hash names can be safely deleted:
```bash
cd frontend/web-5scent/public/products
ls -la  # Verify all files
# If you see: 1764850261_69317a55f25ea.png → These are old
# Delete if product has been edited (new names will exist)
```

---

## Code Review Checklist

- [x] Store path uses `base_path('../../frontend/web-5scent/public/products')`
- [x] Filenames generated with `sanitizeProductName()` and `getSlotFilename()`
- [x] Update method uses `findOrCreateSlotImage()` to avoid duplicates
- [x] Delete method removes both file and DB row
- [x] Frontend openEditModal sorts additional images by created_at
- [x] Frontend sends FormData with product fields + images together
- [x] No hardcoded Windows paths
- [x] No old-style `time() . '_' . uniqid()` filename generation
- [x] Error handling for file operations
- [x] Logging for debugging

---

## Related Files
- Controller: `backend/laravel-5scent/app/Http/Controllers/ProductController.php`
- Frontend: `frontend/web-5scent/app/admin/products/page.tsx`
- Models: `app/Models/Product.php`, `app/Models/ProductImage.php`
- Routes: `routes/api.php` (product endpoints)
