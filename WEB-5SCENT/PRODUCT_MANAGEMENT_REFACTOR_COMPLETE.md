# Product Management Feature Refactor - Complete Implementation

## Summary
Comprehensive refactor of the entire product image management system to implement proper storage, naming, and CRUD operations according to strict requirements.

---

## 1. BACKEND REFACTOR: ProductController.php

### Key Changes

#### A. Image Storage Path
**Before:**
- Images stored in: `backend/laravel-5scent/public/products`
- Filenames: Random hashes (e.g., `1764850261_69317a55f25ea.png`)
- Database stored: Full paths with random names

**After:**
- Images stored in: `frontend/web-5scent/public/products`
- Filenames: Slot-based pattern (e.g., `Night_Bloom50ml.png`)
- Database stores: `/products/<slot-filename>.png`
- Path uses base_path() for portability: `base_path('../../frontend/web-5scent/public/products')`

#### B. Filename Pattern & Sanitization
Added `sanitizeProductName()` method:
```php
private function sanitizeProductName($name)
{
    // "Night Bloom" -> "Night_Bloom"
    $sanitized = str_replace(' ', '_', $name);
    // Remove special chars, keep alphanumeric/underscore/hyphen
    $sanitized = preg_replace('/[^a-zA-Z0-9_\-]/', '', $sanitized);
    return $sanitized;
}
```

Slot-based filenames via `getSlotFilename()`:
- **Slot 1 (50ml):** `{name}50ml.png` 
- **Slot 2 (30ml):** `{name}30ml.png`
- **Slot 3 (Additional 1):** `additional{name}1.png`
- **Slot 4 (Additional 2):** `additional{name}2.png`

Example: Product name "Night Bloom" generates:
```
Night_Bloom50ml.png
Night_Bloom30ml.png
additionalNight_Bloom1.png
additionalNight_Bloom2.png
```

#### C. Create Product (store method)
**Flow:**
1. Validate request data
2. Create product record
3. For each uploaded image (index 0-3):
   - Calculate slot number (index + 1)
   - Generate correct filename using sanitized name
   - Save file to frontend/web-5scent/public/products
   - Insert productimage row with:
     - `image_url`: `/products/<filename>`
     - `is_50ml`: 1 for slot 1, 0 otherwise
     - `is_additional`: 1 for slots 3-4, 0 for slots 1-2

**Database Result:**
```
productimage table entries:
- image_url: /products/Night_Bloom50ml.png,    is_50ml: 1, is_additional: 0
- image_url: /products/Night_Bloom30ml.png,    is_50ml: 0, is_additional: 0
- image_url: /products/additionalNight_Bloom1.png, is_50ml: 0, is_additional: 1
- image_url: /products/additionalNight_Bloom2.png, is_50ml: 0, is_additional: 1
```

#### D. Update Product (update method)
**Key Improvements:**
1. Accepts FormData with product fields AND images
2. Updates product fields (name, description, prices, stock, notes)
3. For each uploaded image:
   - Generates correct slot filename using UPDATED product name
   - **Deletes old file** if exists (overwrites old image)
   - Saves new file with same slot filename
   - Uses `findOrCreateSlotImage()` to find existing record for that slot
   - **Updates existing productimage row** (preserves created_at, updates updated_at)
   - Does NOT create duplicate rows

**Slot Finding Logic:**
- Main images: `is_50ml` and `is_additional` flags identify slot
- Additional images: Ordered by `created_at` to distinguish slot 3 vs 4
  - First additional image = slot 3
  - Second additional image = slot 4

#### E. Delete Image (deleteImage method)
**When admin deletes a slot:**
1. Find productimage record by ID
2. Compute expected filename for that slot
3. Delete file from filesystem: `frontend/web-5scent/public/products/<filename>`
4. Delete productimage row from database
5. No orphaned files or database records remain

**Important:** The filename is reconstructed if needed using stored `is_50ml`/`is_additional` flags, but actual deletion uses the image_id which is definitive.

#### F. Upload Image (uploadImage method)
**Handles single image upload for existing products:**
1. Determines slot from `is_50ml` and `is_additional` flags
2. For additional images, counts existing to determine slot 3 vs 4
3. Generates filename using product name
4. Deletes old file if exists
5. Saves new file
6. Updates existing record OR creates new if doesn't exist
7. Never creates duplicates

---

## 2. FRONTEND REFACTOR: products/page.tsx

### Key Changes

#### A. ProductImage Interface Update
Added timestamp fields for proper image ordering:
```tsx
interface ProductImage {
  image_id: number;
  product_id: number;
  image_url: string;
  is_50ml: number;
  is_additional: number;
  created_at?: string;    // NEW
  updated_at?: string;    // NEW
}
```

#### B. openEditModal Improvement
**Problem:** Additional images displayed in wrong slots
**Solution:** Implemented proper sorting:
```tsx
// Separate main and additional images
const mainImages = images.filter((img) => !img.is_additional);
const additionalImages = images.filter((img) => img.is_additional);

// Sort additional images by created_at
additionalImages.sort((a, b) => {
  const dateA = new Date(a.created_at || 0).getTime();
  const dateB = new Date(b.created_at || 0).getTime();
  return dateA - dateB;
});

// Assign slots correctly:
// Slot 0 (50ml) <- mainImage with is_50ml=1
// Slot 1 (30ml) <- mainImage with is_50ml=0
// Slot 2 (additional 1) <- first sorted additionalImage
// Slot 3 (additional 2) <- second sorted additionalImage
mainImages.forEach((img) => {
  if (img.is_50ml) {
    previews[0] = img.image_url;
  } else {
    previews[1] = img.image_url;
  }
});

additionalImages.forEach((img, idx) => {
  if (idx === 0) previews[2] = img.image_url;
  else if (idx === 1) previews[3] = img.image_url;
});
```

**Result:** Slot 3 and Slot 4 images now display in correct positions in modal.

#### C. handleCreateProduct Refactor
**Before:** Created product first, then uploaded images separately
**After:** Sends product data + images together as FormData
```tsx
const formDataPayload = new FormData();
// Add all product fields
formDataPayload.append('name', formData.name);
// ... other fields ...
// Add images
uploadedImages.forEach((image, index) => {
  if (image) {
    formDataPayload.append(`images[${index}]`, image);
  }
});

const createResponse = await api.post('/admin/products', formDataPayload, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

**Benefit:** All data sent in one request, atomic operation, prevents partial state.

#### D. handleUpdateProduct Refactor
**Before:** Updated product, then image upload in separate calls
**After:** Sends all data in PUT request with images:
```tsx
const formDataPayload = new FormData();
// Add product fields
formDataPayload.append('name', formData.name);
// ... other fields ...
// Add only changed images
uploadedImages.forEach((image, index) => {
  if (image) {
    formDataPayload.append(`images[${index}]`, image);
  }
});

const updateResponse = await api.put(
  `/admin/products/${editingProduct.product_id}`,
  formDataPayload,
  { headers: { 'Content-Type': 'multipart/form-data' } }
);

// Then handle deletions
for (const imageId of imagesToDelete) {
  await api.delete(`/admin/products/${editingProduct.product_id}/images/${imageId}`);
}

// Refresh products
await fetchProducts();
```

**Flow:**
1. PUT request updates product + new images
2. DELETE requests remove marked images
3. Refresh product list
4. UI shows current state

#### E. handleDeleteExistingImage
Improved to track deletions:
```tsx
const handleDeleteExistingImage = (imageId: number, index: number) => {
  setImagesToDelete([...imagesToDelete, imageId]);
  const previews = [...imagePreviews];
  previews[index] = null;  // Hide from UI immediately
  setImagePreviews(previews);
  setExistingImages(existingImages.filter(img => img.image_id !== imageId));
};
```

Deletion happens when user clicks "Update Product":
- Image is sent to backend for deletion
- File is removed from filesystem
- Row is removed from database
- Slot becomes empty

#### F. Image Modal UI
Image upload section now clearly shows slot labels:
```tsx
<p className="text-xs text-gray-500 text-center mt-1">
  {index === 0 ? '50ml' : index === 1 ? '30ml' : 'Additional'}
</p>
```

---

## 3. DATABASE BEHAVIOR

### productimage table
**Columns:**
- `image_id`: Primary key
- `product_id`: Foreign key
- `image_url`: `/products/filename.png`
- `is_50ml`: 1 or 0
- `is_additional`: 1 or 0
- `created_at`: Set once, never changes
- `updated_at`: Changes only when image is overwritten

### What Changed

#### Before (Broken State):
```sql
-- Random filenames, wrong path
productimage:
- image_id: 1, image_url: /products/1764850261_69317a55f25ea.png
- image_id: 2, image_url: /products/1764850262_abcd1234.png
- image_id: 3, image_url: /products/1764850263_xyz9876.png

-- Edited product created duplicate rows, not updated existing
- image_id: 4, image_url: /products/1764850264_new_hash.png (DUPLICATE!)
```

#### After (Fixed State):
```sql
-- Slot-based names, frontend path
productimage:
- image_id: 1, image_url: /products/Night_Bloom50ml.png, is_50ml: 1, is_additional: 0
- image_id: 2, image_url: /products/Night_Bloom30ml.png, is_50ml: 0, is_additional: 0
- image_id: 3, image_url: /products/additionalNight_Bloom1.png, is_50ml: 0, is_additional: 1
- image_id: 4, image_url: /products/additionalNight_Bloom2.png, is_50ml: 0, is_additional: 1

-- Edit product updates existing rows, doesn't create duplicates
-- File system has exactly 4 files, one per slot
```

---

## 4. FILE SYSTEM BEHAVIOR

### Storage Location
```
frontend/web-5scent/public/products/
├── Night_Bloom50ml.png
├── Night_Bloom30ml.png
├── additionalNight_Bloom1.png
├── additionalNight_Bloom2.png
├── Ocean_Breeze50ml.png
├── Ocean_Breeze30ml.png
├── additionalOcean_Breeze1.png
├── additionalOcean_Breeze2.png
└── ... (one filename pattern per product, max 4 per product)
```

### No More:
- ~~Storing in backend/public folder~~
- ~~Random hash filenames~~
- ~~Orphaned files when images are deleted~~
- ~~Duplicate files when images are updated~~
- ~~Windows absolute paths in database~~

---

## 5. COMPLETE WORKFLOW

### Creating a Product
1. Admin fills form with name, prices, stock, notes
2. Admin uploads 1-4 images in UI slots
3. Frontend sends FormData with all data + images
4. Backend `store()`:
   - Creates product row
   - For each image: generates slot filename, saves file, creates productimage row
5. Database has 1 product row + up to 4 productimage rows
6. Filesystem has up to 4 PNG files with proper names
7. UI refreshes, product appears in list

### Editing a Product
1. Admin clicks edit on existing product
2. openEditModal loads product and images
3. Images properly sorted and displayed in correct slots
4. Admin updates fields and/or replaces images
5. Frontend sends PUT request with updated fields + new images
6. Backend `update()`:
   - Updates product fields
   - For each new image:
     - Generates filename using CURRENT product name
     - Deletes old file if exists
     - Saves new file (overwrites)
     - Updates existing productimage row (or creates if missing)
7. Images to delete are sent as separate DELETE requests
8. Backend `deleteImage()`:
   - Deletes file from filesystem
   - Deletes productimage row
9. UI refreshes, shows new state

### Deleting Images
1. Admin hovers over image in modal, clicks X
2. Image hidden from UI immediately
3. When admin clicks "Update Product":
   - DELETE request sent for each marked image
   - File deleted from filesystem
   - productimage row deleted
   - Slot becomes empty
4. UI refreshes

### Deleting Entire Product
1. Admin clicks trash icon on product in list
2. Confirmation modal appears
3. If confirmed:
   - All associated files deleted from filesystem
   - All productimage rows deleted
   - Product row deleted
4. UI refreshes

---

## 6. TECHNICAL IMPLEMENTATION DETAILS

### Image Slot Identification
The system uses two methods to identify slots:

**Method 1: Using flags (primary)**
```php
is_50ml = 1, is_additional = 0  => Slot 1 (50ml)
is_50ml = 0, is_additional = 0  => Slot 2 (30ml)
is_50ml = 0, is_additional = 1  => Slot 3 OR 4
```

**Method 2: Using created_at ordering (for additional)**
When is_additional = 1, multiple rows exist. Order by created_at:
- First (chronologically earliest) => Slot 3
- Second (chronologically later) => Slot 4

This allows moving images between slots (e.g., slot 4 → slot 3) without recreating.

### Cross-Platform Path Safety
```php
// This works on all OS (Windows, Linux, Mac)
$frontendProductsPath = base_path('../../frontend/web-5scent/public/products');

// base_path() returns absolute path to Laravel root
// ../../ goes up to 5SCENT_WEB folder
// Then down to frontend path
// Result on Windows:
//   C:\Users\...\5SCENT_WEB\frontend\web-5scent\public\products
// Result on Linux:
//   /home/.../5SCENT_WEB/frontend/web-5scent/public/products
```

---

## 7. TESTING CHECKLIST

### Add Product
- [ ] Upload 4 images (50ml, 30ml, additional 1, additional 2)
- [ ] Check files created in: `frontend/web-5scent/public/products/`
- [ ] Check filenames match pattern: `Night_Bloom50ml.png`, etc.
- [ ] Check productimage table has 4 rows with correct image_url, is_50ml, is_additional
- [ ] Refresh admin page, product appears in list

### Edit Product
- [ ] Load existing product in edit modal
- [ ] Verify all 4 images show in correct slots
- [ ] Replace image in slot 1 (50ml)
- [ ] Check old file deleted from filesystem
- [ ] Check new file saved with same name: `Night_Bloom50ml.png`
- [ ] Check productimage row updated (created_at unchanged, updated_at changed)
- [ ] No duplicate rows created

### Delete Image Slot
- [ ] Load product in edit modal
- [ ] Click X on slot 3 image
- [ ] Image disappears from UI
- [ ] Click "Update Product"
- [ ] Check file deleted from filesystem
- [ ] Check productimage row deleted
- [ ] Reload modal, slot 3 empty

### Delete Product
- [ ] Click trash icon on product
- [ ] Confirm deletion
- [ ] Check all 4 files deleted from filesystem
- [ ] Check all productimage rows deleted
- [ ] Check product row deleted
- [ ] Product removed from list

---

## 8. IMPORTANT NOTES

### Product Name Changes
When editing a product and changing its name (e.g., "Night Bloom" → "Ocean Breeze"):
- Old files: `Night_Bloom50ml.png`, etc.
- New files: `Ocean_Breeze50ml.png`, etc.
- Old files are deleted when slots are updated
- Database always reflects current filenames

### File Overwriting
When replacing an image in edit mode:
- Same filename is used (slot-based)
- Old file is deleted first
- New file saved with same name
- Database row updated once, no duplicates

### Empty Slots
If product has only 50ml image:
- Slot 1: has file `Night_Bloom50ml.png`
- Slot 2: empty (no 30ml file, no productimage row)
- Slot 3: empty
- Slot 4: empty

Filesystem and database remain in sync.

---

## 9. CODE QUALITY

### No Table Structure Changes
- No new columns added
- No table schema modifications
- Existing `is_50ml` and `is_additional` used correctly
- Timestamps (`created_at`, `updated_at`) used correctly

### Error Handling
- Files deleted before/after DB operations in try-catch blocks
- Orphaned files prevented
- Failed uploads don't create empty productimage rows

### Logging
Backend logs all operations:
```php
\Log::info('PDF receipt generated', [...]);
\Log::info('Image uploaded successfully', [...]);
\Log::error('generateReceipt error', [...]);
```

Check `storage/logs/laravel.log` for debugging.

---

## Summary of Fixes

| Issue | Before | After |
|-------|--------|-------|
| Image storage path | Backend public folder | Frontend public folder |
| Filenames | Random hashes | Slot-based pattern |
| Edit product | Creates new rows | Updates existing rows |
| Delete image | Orphaned files | Files and DB rows deleted |
| Database URL | Windows absolute paths | Portable `/products/filename` |
| Additional images | Wrong slots in UI | Correctly sorted by created_at |
| Multiple edits | Duplicate rows created | Single row updated |
| File overwrites | Old file kept | Old file deleted |

---

## Deployment

No migrations needed. System works with existing database schema. Start servers and test workflows above.

```bash
# Backend
php artisan serve

# Frontend  
npm run dev
```

Then test complete workflow: Add → Edit → Replace Images → Delete Images → Delete Product.
