# Quick Test Guide - Product Management Fix

## What's Different Now

### Frontend (next.js/React)
- **OLD**: `images[0]`, `images[1]`, etc.
- **NEW**: `image_slot_1`, `image_slot_2`, `image_slot_3`, `image_slot_4`
- **Why**: More explicit, easier to validate on backend

### Backend (Laravel)
- **OLD**: Conditional `$product->update($updateData)` 
- **NEW**: Explicit field assignment with direct `$product->save()`
- **Why**: Guarantees stock fields are always processed

---

## 5-Minute Test

### Step 1: Edit a Product (Stock Only)
1. Go to admin/products
2. Click Edit on "Night Bloom" or any product
3. Change **stock_30ml** from current value to `99`
4. Change **stock_50ml** from current value to `88`
5. Click "Update Product"

**Expected Result:**
- ✅ Toast says "Product updated successfully"
- ✅ Modal closes
- ✅ Product list refreshes
- ✅ Database shows: `stock_30ml=99, stock_50ml=88`

**Verify in database:**
```sql
SELECT stock_30ml, stock_50ml FROM product WHERE name='Night Bloom';
-- Should show: 99, 88
```

---

### Step 2: Edit a Product (Images Only)
1. Go to admin/products
2. Click Edit on any product
3. For Slot 1 (50ml), click "Choose File" and select any PNG/JPG
4. **Do NOT change any other fields**
5. Click "Update Product"

**Expected Result:**
- ✅ Toast says "Product updated successfully"
- ✅ Modal closes and reopens
- ✅ Slot 1 shows the new image
- ✅ File exists in `frontend/web-5scent/public/products/`

**Verify in database:**
```sql
SELECT image_url FROM productimage WHERE product_id=1 AND is_50ml=1;
-- Should show: /products/night-bloom50ml.png (or your product name)
```

**Verify file exists:**
```powershell
ls "frontend/web-5scent/public/products/" | grep "50ml"
# Should show: productname50ml.png
```

---

### Step 3: Edit a Product (Everything)
1. Edit the same product again
2. Change the **name** to something like "Super Product"
3. Change **stock_30ml** to `111`
4. Change **stock_50ml** to `222`
5. Upload images to **all 4 slots** (use same image 4 times if needed)
6. Click "Update Product"

**Expected Result:**
- ✅ Toast says "Product updated successfully"
- ✅ Database shows new name and stock
- ✅ Old files deleted (with old product name)
- ✅ New files created with pattern:
  - `super-product50ml.png`
  - `super-product30ml.png`
  - `additionalsuper-product1.png`
  - `additionalsuper-product2.png`

**Verify:**
```bash
ls "frontend/web-5scent/public/products/" | grep "super-product"
# Should show 4 files with the above names
```

```sql
SELECT image_url FROM productimage WHERE product_id=1 ORDER BY image_id;
-- Should show 4 rows with /products/super-product*.png paths
```

---

## If Something Fails

### No success toast (Form didn't submit)
- Check browser console for JavaScript errors
- Check FormData in Network tab: Does it contain image files?
- Is `multipart/form-data` header set?

### Success toast but DB unchanged
- Check Laravel logs: `tail -f backend/laravel-5scent/storage/logs/laravel.log`
- Look for `=== UPDATE REQUEST START ===`
- Is validation passing? Look for `Validation passed` log
- Is `Product fields updated` log showing new stock values?

### Images not appearing
- Check files exist: `ls frontend/web-5scent/public/products/`
- Check database:
  ```sql
  SELECT * FROM productimage WHERE product_id=YOUR_ID;
  ```
- Check image_url matches actual filename

### Wrong filename
- Product name has special characters
- Sanitization removes them: `Night & Bloom` → `night-bloom` (& removed)
- Not an error, expected behavior

---

## Filename Patterns

Your product name gets sanitized for filenames:
- Remove spaces, replace with hyphens: `Night Bloom` → `night-bloom`
- Remove special chars: `Fresh & Green` → `fresh-green`
- All lowercase: `NightBloom` → `nightbloom`

Then 4 files are created:
```
{sanitized-name}50ml.png         ← Slot 1
{sanitized-name}30ml.png         ← Slot 2
additional{sanitized-name}1.png  ← Slot 3
additional{sanitized-name}2.png  ← Slot 4
```

---

## Database Check Queries

**Check stock was saved:**
```sql
SELECT product_id, name, stock_30ml, stock_50ml, updated_at 
FROM product 
WHERE product_id = 1;
```

**Check images were saved:**
```sql
SELECT image_id, product_id, image_url, is_50ml, is_additional, updated_at
FROM productimage 
WHERE product_id = 1 
ORDER BY is_50ml DESC, is_additional ASC;
```

**Expected results:**
- 4 rows (or fewer if not all slots uploaded)
- is_50ml: 1 for slot 1, 0 for others
- is_additional: 0 for slots 1-2, 1 for slots 3-4
- image_url: `/products/{name}50ml.png`, etc.
- updated_at: Recent timestamp

---

## Success Indicators

✅ **Both features working:**
1. Stock values update in database
2. Images save to disk with correct names
3. ProductImage rows created/updated
4. Modal refreshes and shows changes

✅ **Code quality:**
- No JavaScript errors in console
- No Laravel errors in logs
- Proper validation errors if invalid data sent
- Comprehensive logging for debugging

✅ **User experience:**
- Toast notification on success
- Modal closes and data refreshes
- Product list updates immediately
- Clear error messages if something fails

---

## Still Not Working?

Check these in order:

1. **Syntax errors?**
   ```bash
   # PHP
   cd backend/laravel-5scent
   php -l app/Http/Controllers/ProductController.php
   
   # TypeScript 
   cd frontend/web-5scent
   npm run build
   ```

2. **Request reaching backend?**
   - Open DevTools → Network tab
   - Edit a product and click Update
   - Look for PUT request to `/api/admin/products/{id}`
   - Check Response tab for success/error

3. **Database connected?**
   - Can you fetch products? (you probably can if you're on the page)
   - Try a simple query: `SELECT COUNT(*) FROM product;`

4. **File permissions?**
   - Can Laravel write to `frontend/web-5scent/public/products/`?
   - Directory exists?
   - Try creating a test file:
     ```php
     touch('frontend/web-5scent/public/products/test.txt');
     ```

5. **Check Laravel logs:**
   ```bash
   cd backend/laravel-5scent
   tail -100 storage/logs/laravel.log
   # Look for error messages after failed update
   ```

---

## Files Changed

1. `frontend/web-5scent/app/admin/products/page.tsx`
   - Method: `handleUpdateProduct()`
   - Changed: Image FormData keys from `images[${index}]` to `image_slot_${index + 1}`

2. `backend/laravel-5scent/app/Http/Controllers/ProductController.php`
   - Method: `update()`
   - Changed: Stock field assignment and image processing loop

3. **No database migrations needed** - existing schema works

---

## That's It!

These are the ONLY changes needed. Everything else stays the same.

If after these changes you:
- ✅ Can update stock and see it in database
- ✅ Can upload images and see files in folder and DB
- ✅ Images appear in modal when reopened

...then it's fixed. If not, use the debug checklist above to find the issue.
