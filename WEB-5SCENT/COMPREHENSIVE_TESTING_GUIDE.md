# Comprehensive Testing Guide

## Pre-Testing Checklist

- [ ] Backend is running: `php artisan serve` (http://localhost:8000)
- [ ] Frontend is running: `npm run dev` (http://localhost:3000)
- [ ] Database is connected and accessible
- [ ] `public/products/` folder exists and is writable
- [ ] Admin user logged in
- [ ] Browser console open (F12) to monitor errors
- [ ] Laravel logs monitored: `tail -f storage/logs/laravel.log`

---

## Test Suite 1: Global Calendar

### Test 1.1 - Calendar Displays on Dashboard
**Steps:**
1. Navigate to `/admin/dashboard`
2. Look at page header

**Expected Results:**
- ✅ Calendar chip visible in top-right corner
- ✅ Shows current date (e.g., "Nov 27, 2025")
- ✅ FiCalendar icon present
- ✅ White background with black border (pill shape)

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 1.2 - Calendar Displays on Products Page
**Steps:**
1. Navigate to `/admin/products`
2. Look at page header

**Expected Results:**
- ✅ Calendar chip visible in top-right corner
- ✅ Same styling as dashboard
- ✅ No duplicate date display in page content

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 1.3 - Calendar Displays on Orders Page
**Steps:**
1. Navigate to `/admin/orders`
2. Look at page header

**Expected Results:**
- ✅ Calendar chip visible
- ✅ Consistent with other pages

**Actual Results:**
- [ ] Pass / [ ] Fail

---

## Test Suite 2: Add Product with Images

### Test 2.1 - Add Product Basic
**Steps:**
1. Navigate to `/admin/products`
2. Click "Add Product" button
3. Fill form:
   - Name: "Test Rose"
   - Category: "Day"
   - Price 30ml: 150000
   - Price 50ml: 250000
   - Stock 30ml: 50
   - Stock 50ml: 30
   - All other fields: any valid value

**Expected Results:**
- ✅ Form accepts input without errors
- ✅ Stock fields displayed correctly (separate)
- ✅ Can proceed to image upload step

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 2.2 - Add Product with Single Image
**Steps:**
1. Continue from Test 2.1
2. Upload image to slot 1 (50ml)
3. Click "Add Product"

**Expected Results:**
- ✅ Success toast: "Product added successfully"
- ✅ Modal closes
- ✅ Product appears in list

**File System Check:**
- ✅ File exists: `public/products/test-rose50ml.jpg` (or .png)
- ✅ File size > 0 bytes

**Database Check:**
- ✅ Product record exists in `product` table
- ✅ ProductImage record exists in `productimage` table
- ✅ `image_url` = `/products/test-rose50ml.jpg`
- ✅ `is_50ml` = 1

**Browser Console:**
- ✅ No errors or warnings

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 2.3 - Add Product with All Four Images
**Steps:**
1. Click "Add Product"
2. Fill form (same as Test 2.1, name: "Midnight Oud")
3. Upload images to all 4 slots
4. Click "Add Product"

**Expected Results:**
- ✅ Success toast
- ✅ Modal closes
- ✅ All 4 files created:
  - `midnight-oud50ml.*`
  - `midnight-oud30ml.*`
  - `additionalmidnight-oud1.*`
  - `additionalmidnight-oud2.*`
- ✅ All 4 ProductImage records created
- ✅ Correct `is_50ml` flags (1 for slot 0, 0 for others)

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 2.4 - Add Product Validation
**Steps:**
1. Click "Add Product"
2. Try to submit without uploading images
3. Click "Add Product"

**Expected Results:**
- ✅ Error message: "Please upload at least one product image"
- ✅ Modal remains open
- ✅ No product created

**Actual Results:**
- [ ] Pass / [ ] Fail

---

## Test Suite 3: Edit Product with Images

### Test 3.1 - Load Product with Existing Images
**Steps:**
1. Navigate to `/admin/products`
2. Find product created in Test 2.3 ("Midnight Oud")
3. Click edit button
4. Modal opens

**Expected Results:**
- ✅ All 4 existing images display in correct slots
- ✅ Image previews show correct files
- ✅ Form data populated correctly
- ✅ Stock fields show correct values:
  - Stock 30ml: 50
  - Stock 50ml: 30

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 3.2 - Replace Single Image
**Steps:**
1. Continue from Test 3.1
2. Hover over slot 1 (50ml image)
3. Click X button to remove
4. Upload new image to slot 1
5. Click "Update Product"

**Expected Results:**
- ✅ Success toast: "Product updated successfully"
- ✅ Modal closes
- ✅ Old file deleted from `public/products/`
- ✅ New file created with same name: `midnight-oud50ml.*`
- ✅ DB record updated (same image_id, new image_url)
- ✅ No duplicate records in productimage table

**File System Check:**
- ✅ `public/products/midnight-oud50ml.*` exists (new file, different size/date)
- ✅ No extra files like `midnight-oud50ml_old.*`

**Database Check:**
```sql
SELECT * FROM productimage WHERE product_id = ? AND is_50ml = 1;
```
- ✅ Single record returned
- ✅ `image_url` points to new file

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 3.3 - Reopen After Update
**Steps:**
1. Continue from Test 3.2
2. Click edit button again for same product
3. Modal opens

**Expected Results:**
- ✅ Slot 1 shows NEW image (not old one)
- ✅ Other slots unchanged
- ✅ All data correct

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 3.4 - Remove Image
**Steps:**
1. Open edit modal for product with images
2. Hover over any image
3. Click X button
4. Click "Update Product"

**Expected Results:**
- ✅ Success toast
- ✅ Image file deleted from `public/products/`
- ✅ DB record deleted from `productimage`
- ✅ Slot now empty on next edit

**Database Check:**
```sql
SELECT * FROM productimage WHERE image_id = ?;
```
- ✅ No record returned (deleted)

**Actual Results:**
- [ ] Pass / [ ] Fail

---

## Test Suite 4: Stock Quantity Fields

### Test 4.1 - Stock Fields Display Correctly
**Steps:**
1. Click "Add Product"
2. Look at form layout

**Expected Results:**
- ✅ Two separate fields:
  - "Stock Quantity 30 ml"
  - "Stock Quantity 50 ml"
- ✅ Fields positioned directly below price fields
- ✅ Clear field labels

**Layout Check:**
```
Price 30ml [input] | Price 50ml [input]
Stock 30ml [input] | Stock 50ml [input]
```

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 4.2 - Stock Values Save Correctly
**Steps:**
1. Add new product with:
   - Stock 30ml: 100
   - Stock 50ml: 75
2. Submit product
3. Edit product again

**Expected Results:**
- ✅ Stock 30ml = 100
- ✅ Stock 50ml = 75
- ✅ Values correct in database

**Database Check:**
```sql
SELECT stock_30ml, stock_50ml FROM product WHERE name = 'Test Product';
```
- ✅ Columns return correct values

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 4.3 - Update Stock Values
**Steps:**
1. Edit existing product
2. Change Stock 30ml to 200
3. Change Stock 50ml to 150
4. Click "Update Product"
5. Edit again

**Expected Results:**
- ✅ New values displayed
- ✅ Database updated

**Actual Results:**
- [ ] Pass / [ ] Fail

---

## Test Suite 5: Error Handling

### Test 5.1 - File Type Validation
**Steps:**
1. Open Add Product modal
2. Try to upload non-image file (e.g., .txt, .pdf)
3. Observe

**Expected Results:**
- ✅ Either file not accepted by input, or
- ✅ Error message on submit

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 5.2 - File Size Validation
**Steps:**
1. Create large image file (>10MB)
2. Try to upload to product
3. Click "Add Product"

**Expected Results:**
- ✅ Error message (if FE validation)
- ✅ Or 422 error (if BE validation)
- ✅ Product not created

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 5.3 - Browser Console
**Steps:**
1. Open browser console (F12)
2. Perform all above tests
3. Check console for errors

**Expected Results:**
- ✅ No red errors
- ✅ Normal API logs (green)
- ✅ No undefined references
- ✅ No CORS errors

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 5.4 - Laravel Logs
**Steps:**
1. Monitor: `tail -f storage/logs/laravel.log`
2. Perform add/edit operations
3. Check logs

**Expected Results:**
- ✅ No ERROR entries
- ✅ INFO logs for operations
- ✅ No database errors
- ✅ No file system errors

**Actual Results:**
- [ ] Pass / [ ] Fail

---

## Test Suite 6: Database Integrity

### Test 6.1 - No Orphaned Images
**Steps:**
1. Run query:
```sql
SELECT pi.* FROM productimage pi 
WHERE pi.product_id NOT IN (SELECT product_id FROM product);
```

**Expected Results:**
- ✅ No results returned
- ✅ All images have valid product_id references

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 6.2 - No Duplicate Image Records
**Steps:**
1. Run query:
```sql
SELECT product_id, is_50ml, COUNT(*) 
FROM productimage 
GROUP BY product_id, is_50ml 
HAVING COUNT(*) > 1;
```

**Expected Results:**
- ✅ No results returned
- ✅ Each product/slot combination unique

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 6.3 - Cascade Delete Works
**Steps:**
1. Add product with multiple images
2. Delete product from admin
3. Check database

**Expected Results:**
- ✅ Product record deleted
- ✅ All ProductImage records deleted (cascade)
- ✅ Files deleted from `public/products/`

**Database Check:**
```sql
SELECT * FROM productimage WHERE product_id = ?;
```
- ✅ No records returned

**File Check:**
- ✅ No files with product name in `public/products/`

**Actual Results:**
- [ ] Pass / [ ] Fail

---

## Test Suite 7: Performance

### Test 7.1 - Add Product Response Time
**Steps:**
1. Open browser DevTools Network tab
2. Add product with 4 images
3. Note POST request time

**Expected Results:**
- ✅ Response time < 2 seconds
- ✅ Status 201 (Created)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Response time: ___ seconds

---

### Test 7.2 - Edit Product Response Time
**Steps:**
1. Open browser DevTools
2. Edit product with image replacement
3. Note PUT request time

**Expected Results:**
- ✅ Response time < 2 seconds
- ✅ Status 200 (OK)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Response time: ___ seconds

---

## Test Suite 8: Cross-Browser

### Test 8.1 - Chrome
- [ ] All tests pass

### Test 8.2 - Firefox
- [ ] All tests pass

### Test 8.3 - Safari (if applicable)
- [ ] All tests pass

### Test 8.4 - Edge
- [ ] All tests pass

---

## Final Sign-Off

### Test Execution Summary
| Test Suite | Status | Notes |
|-----------|--------|-------|
| Global Calendar | ✅/❌ | |
| Add Product | ✅/❌ | |
| Edit Product | ✅/❌ | |
| Stock Fields | ✅/❌ | |
| Error Handling | ✅/❌ | |
| Database Integrity | ✅/❌ | |
| Performance | ✅/❌ | |
| Cross-Browser | ✅/❌ | |

### Overall Result
- [ ] ✅ ALL TESTS PASSED - Ready for Production
- [ ] ⚠️ SOME TESTS FAILED - Issues to address:
  - Issue 1: ___________
  - Issue 2: ___________
- [ ] ❌ MAJOR FAILURES - Cannot deploy

### Tester Name: ________________
### Date: ________________
### Time Spent: ________________

---

## Regression Testing

### Check Existing Features Still Work
- [ ] View products list
- [ ] Search products
- [ ] Filter by category
- [ ] Delete product
- [ ] View product details
- [ ] Dashboard stats display
- [ ] Orders page loads
- [ ] POS tool works

### Known Issues (if any)
- Issue: ___________
- Severity: High / Medium / Low
- Impact: ___________

---

## Sign-Off for Deployment
- [ ] Tester approves for production
- [ ] Product owner approves
- [ ] Tech lead approves

**Ready to Deploy:** Yes / No

Date: _________
Time: _________

