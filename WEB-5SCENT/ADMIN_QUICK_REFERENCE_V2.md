# Quick Reference: Admin Dashboard Updates

## Key Changes at a Glance

### 1. Calendar Location
- **Before:** Page-specific date display in dashboard and products pages
- **After:** Global calendar in AdminLayout header (visible on ALL admin pages)
- **Position:** Top-right corner with FiCalendar icon

### 2. Image Handling
- **File Naming:** `{perfumeSlug}50ml.ext`, `{perfumeSlug}30ml.ext`, etc.
- **Storage:** `public/products/` folder
- **DB Storage:** Relative path in `productimage` table
- **Behavior:** Overwrites instead of duplicates on update

### 3. Stock Fields
- **Before:** Single "Stock Quantity" field
- **After:** Two fields - "Stock Quantity 30 ml" and "Stock Quantity 50 ml"
- **Position:** Directly below their respective price fields

### 4. Error Fixed
- **Issue:** 500 error when adding products with images
- **Cause:** ProductImage model timestamps conflicting with table schema
- **Fix:** Added `public $timestamps = false;` to ProductImage model

---

## File Structure

```
frontend/
├── components/
│   └── AdminLayout.tsx                 [MODIFIED] Global header with calendar
├── lib/
│   ├── api.ts                         [UNCHANGED]
│   └── imageUtils.ts                  [NEW] Image helper functions
└── app/admin/
    ├── dashboard/
    │   └── page.tsx                   [MODIFIED] Removed duplicate date
    └── products/
        ├── page.tsx                   [MODIFIED] Stock & image handling
        └── [id]/
            └── edit/page.tsx          [MODIFIED] Stock & image handling

backend/
├── app/
│   ├── Http/Controllers/
│   │   └── ProductController.php      [MODIFIED] Image naming & overwrite logic
│   └── Models/
│       └── ProductImage.php           [MODIFIED] Disabled timestamps
└── routes/
    └── api.php                        [UNCHANGED]
```

---

## Testing Scenarios

### ✅ Scenario 1: Add New Product
1. Admin → Products → Add Product
2. Fill all fields, upload 4 images
3. Click "Add Product"
4. **Expected:** Success toast + files in `public/products/` + DB records created

### ✅ Scenario 2: Edit Product - Replace Image
1. Admin → Products → Edit product
2. Upload new image to slot 1
3. Click "Update Product"
4. **Expected:** Old file deleted, new file saved, DB updated

### ✅ Scenario 3: Edit Product - Remove Image
1. Admin → Products → Edit product
2. Hover image → Click X
3. Click "Update Product"
4. **Expected:** File deleted, DB record cleared

### ✅ Scenario 4: View Global Calendar
1. Admin → Dashboard → Check header
2. Admin → Products → Check header
3. **Expected:** Same calendar visible in both locations

---

## Image Naming Examples

**Product:** "Rose Blossom"
- Slot 0 (50ml): `rose-blossom50ml.jpg`
- Slot 1 (30ml): `rose-blossom30ml.jpg`
- Slot 2 (Additional 1): `additionalrose-blossom1.jpg`
- Slot 3 (Additional 2): `additionalrose-blossom2.jpg`

**Product:** "Midnight Oud"
- Slot 0 (50ml): `midnight-oud50ml.png`
- Slot 1 (30ml): `midnight-oud30ml.png`
- Slot 2 (Additional 1): `additionalmidnight-oud1.png`
- Slot 3 (Additional 2): `additionalmidnight-oud2.png`

---

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| 500 error on add product | Verify ProductImage model has `$timestamps = false` |
| Images not saving | Ensure `public/products/` is writable |
| Images not loading | Check `image_url` path starts with `/products/` |
| Stock fields disappear | Verify form includes `stock_30ml` and `stock_50ml` |
| Calendar not showing | Verify AdminLayout.tsx has FiCalendar import |
| Old files remain | Verify unlink() in ProductController.update() |

---

## Database Queries for Verification

### Check Product Images
```sql
SELECT p.name, pi.image_url, pi.is_50ml 
FROM product p 
JOIN productimage pi ON p.product_id = pi.product_id 
ORDER BY p.product_id;
```

### Check Stock Values
```sql
SELECT product_id, name, stock_30ml, stock_50ml 
FROM product 
ORDER BY product_id;
```

### Check for Orphaned Images
```sql
SELECT pi.* 
FROM productimage pi 
WHERE pi.product_id NOT IN (SELECT product_id FROM product);
```

---

## API Endpoints

### Product CRUD
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/admin/products` | List products |
| POST | `/admin/products` | Create product with images |
| PUT | `/admin/products/{id}` | Update product & images |
| DELETE | `/admin/products/{id}` | Delete product (cascade delete images) |
| DELETE | `/admin/products/{id}/images/{imageId}` | Delete specific image |

### Request Format (multipart/form-data)
```
POST /admin/products
├── name: "Rose Blossom"
├── price_30ml: 150000
├── price_50ml: 250000
├── stock_30ml: 50
├── stock_50ml: 30
├── images[]: [File, File, ...]
├── image_slot[0]: 0
├── image_name[0]: "rose-blossom50ml"
├── image_slot[1]: 1
├── image_name[1]: "rose-blossom30ml"
└── ... (etc for slots 2,3)
```

---

## Performance Notes

- Image files stored at `public/products/` accessible via `/products/` URL
- Filenames are deterministic (no timestamps) → predictable paths
- Overwrite behavior prevents storage bloat
- Cascade delete removes orphaned images automatically

---

## Next Steps (Optional)

- [ ] Add image compression before upload
- [ ] Implement drag-drop image reordering
- [ ] Add image cropping UI
- [ ] Support additional size variants
- [ ] Add image upload progress bar
- [ ] Implement CDN for image serving

