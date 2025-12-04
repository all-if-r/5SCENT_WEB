# Visual Flow Diagram - How The Fix Works

## STOCK UPDATE FLOW

```
┌─────────────────────────────────────────────────────────────┐
│ USER ACTION: Edit Product Stock                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (Next.js/React)                                    │
│ ─────────────────────────────────────────────────────────── │
│ Create FormData:                                            │
│   - name: "Night Bloom"                                     │
│   - stock_30ml: "50"        ← User entered value            │
│   - stock_50ml: "75"        ← User entered value            │
│   - price_30ml: "299000"                                    │
│   - price_50ml: "399000"                                    │
│   - (no images)                                             │
│                                                             │
│ Send: PUT /api/admin/products/1                            │
│       Content-Type: multipart/form-data                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ NETWORK                              │
        │ ─────────────────────────────────── │
        │ PUT /api/admin/products/1           │
        │ Header: multipart/form-data         │
        │ Body: (FormData from above)         │
        └──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND (Laravel)                                           │
│ ─────────────────────────────────────────────────────────── │
│ ProductController::update()                                 │
│                                                             │
│ 1. Validate request                                         │
│    ✓ 'stock_30ml' => 'sometimes|integer|min:0'            │
│    ✓ 'stock_50ml' => 'sometimes|integer|min:0'            │
│                                                             │
│ 2. Get product from database                               │
│    $product = Product::findOrFail(1);                      │
│                                                             │
│ 3. Update stock fields (EXPLICIT)                          │
│    $product->stock_30ml = $request->input('stock_30ml');  │
│    $product->stock_50ml = $request->input('stock_50ml');  │
│                                                             │
│ 4. Save to database (GUARANTEED)                           │
│    $product->save();  ← Must execute, not conditional     │
│                                                             │
│ 5. Return success response                                 │
│    return response()->json($product, 200);                │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ DATABASE (MySQL)                                            │
│ ─────────────────────────────────────────────────────────── │
│ UPDATE product                                              │
│   SET stock_30ml = 50,                                     │
│       stock_50ml = 75,                                     │
│       updated_at = NOW()                                   │
│   WHERE product_id = 1;                                    │
│                                                             │
│ Result: ✓ Stock values updated                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND RECEIVES RESPONSE                                  │
│ ─────────────────────────────────────────────────────────── │
│ Response: {                                                 │
│   "product_id": 1,                                          │
│   "name": "Night Bloom",                                    │
│   "stock_30ml": 50,         ← New value confirmed          │
│   "stock_50ml": 75,         ← New value confirmed          │
│   ...                                                       │
│ }                                                           │
│                                                             │
│ Actions:                                                    │
│ 1. Show toast: "Product updated successfully!"             │
│ 2. Close modal                                              │
│ 3. Refresh product list                                    │
│ 4. User sees updated stock in list                         │
└─────────────────────────────────────────────────────────────┘
```

---

## IMAGE UPLOAD FLOW

```
┌─────────────────────────────────────────────────────────────┐
│ USER ACTION: Upload Image to Slot 1                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (Next.js/React)                                    │
│ ─────────────────────────────────────────────────────────── │
│ Create FormData:                                            │
│   - name: "Night Bloom"                                     │
│   - stock_30ml: "50"                                        │
│   - stock_50ml: "75"                                        │
│   - image_slot_1: [File: myimage.jpg]   ← User selected    │
│   - image_slot_2: (absent)              ← Not selected     │
│   - image_slot_3: (absent)              ← Not selected     │
│   - image_slot_4: (absent)              ← Not selected     │
│                                                             │
│ Send: PUT /api/admin/products/1                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ NETWORK                              │
        │ ─────────────────────────────────── │
        │ PUT /api/admin/products/1           │
        │ FormData with file                  │
        └──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND (Laravel)                                           │
│ ─────────────────────────────────────────────────────────── │
│ ProductController::update()                                 │
│                                                             │
│ 1. Validate request                                         │
│    ✓ 'image_slot_1' => 'nullable|image|...'              │
│    ✓ 'image_slot_2' => 'nullable|image|...'              │
│    ✓ 'image_slot_3' => 'nullable|image|...'              │
│    ✓ 'image_slot_4' => 'nullable|image|...'              │
│                                                             │
│ 2. Update product fields                                   │
│    (same as stock update)                                  │
│    $product->save();                                        │
│                                                             │
│ 3. Process images - EXPLICIT LOOP                          │
│    for ($slot = 1; $slot <= 4; $slot++) {                │
│      $slotKey = "image_slot_{$slot}";                     │
│                                                             │
│    SLOT 1:                                                 │
│      ✓ hasFile('image_slot_1') = TRUE                    │
│      ✓ Get file: myimage.jpg                             │
│      ✓ Sanitize product name: "night-bloom"              │
│      ✓ Generate filename: "night-bloom50ml.png"           │
│      ✓ Delete old file if exists                          │
│      ✓ Move file to: frontend/web-5scent/public/products/ │
│      ✓ Create/Update ProductImage row:                    │
│        {                                                   │
│          product_id: 1,                                    │
│          image_url: '/products/night-bloom50ml.png',      │
│          is_50ml: 1,                                       │
│          is_additional: 0                                  │
│        }                                                   │
│                                                             │
│    SLOT 2:                                                 │
│      ✓ hasFile('image_slot_2') = FALSE                   │
│      → SKIP (no file)                                     │
│                                                             │
│    SLOT 3:                                                 │
│      ✓ hasFile('image_slot_3') = FALSE                   │
│      → SKIP (no file)                                     │
│                                                             │
│    SLOT 4:                                                 │
│      ✓ hasFile('image_slot_4') = FALSE                   │
│      → SKIP (no file)                                     │
│    }                                                        │
│                                                             │
│ 4. Return success response with images                     │
│    return response()->json($product->load('images'), 200);│
└─────────────────────────────────────────────────────────── ┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ FILESYSTEM (frontend/web-5scent/public/products/)           │
│ ─────────────────────────────────────────────────────────── │
│ File created: night-bloom50ml.png                           │
│ Size: ~50KB                                                 │
│ Path: frontend/web-5scent/public/products/night-bloom50ml.png
│                                                             │
│ ✓ File accessible via: /products/night-bloom50ml.png      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ DATABASE (MySQL)                                            │
│ ─────────────────────────────────────────────────────────── │
│ productimage table:                                         │
│ ┌──────────┬────────────┬────────────────────────────────┐ │
│ │image_id  │product_id  │image_url                       │ │
│ ├──────────┼────────────┼────────────────────────────────┤ │
│ │5         │1           │/products/night-bloom50ml.png  │ │
│ │(is_50ml=1, is_additional=0)                            │ │
│ └──────────┴────────────┴────────────────────────────────┘ │
│                                                             │
│ ✓ Image record created/updated                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND RECEIVES RESPONSE                                  │
│ ─────────────────────────────────────────────────────────── │
│ Response includes:                                          │
│ {                                                           │
│   "images": [                                               │
│     {                                                       │
│       "image_id": 5,                                        │
│       "product_id": 1,                                      │
│       "image_url": "/products/night-bloom50ml.png",       │
│       "is_50ml": 1,                                         │
│       "is_additional": 0                                    │
│     }                                                       │
│   ]                                                         │
│ }                                                           │
│                                                             │
│ Actions:                                                    │
│ 1. Show toast: "Product updated successfully!"             │
│ 2. Close modal                                              │
│ 3. Refresh product list                                    │
│ 4. When reopened, show new image in Slot 1                │
└─────────────────────────────────────────────────────────────┘
```

---

## KEY DIFFERENCES: OLD vs NEW

### Image Keys
```
OLD (BROKEN):
  images[0] ─→ Array iteration fails
  images[1]
  images[3]
        ↓
  forEach might skip items
        ↓
  Images not processed

NEW (FIXED):
  image_slot_1 ─→ Explicit check: hasFile('image_slot_1')
  image_slot_2 ─→ Explicit check: hasFile('image_slot_2')
  image_slot_3 ─→ Explicit check: hasFile('image_slot_3')
  image_slot_4 ─→ Explicit check: hasFile('image_slot_4')
        ↓
  Each slot checked individually
        ↓
  All images processed correctly
```

### Stock Update
```
OLD (BROKEN):
  $updateData = [];
  if (field exists) $updateData['field'] = value;
  if ($updateData) $product->update($updateData);
        ↓
  Conditional logic
  Might skip if $updateData empty
        ↓
  Silent failure

NEW (FIXED):
  $product->stock_30ml = $request->input('stock_30ml', ...);
  $product->save();  ← ALWAYS executed
        ↓
  No conditionals
  Guaranteed execution
        ↓
  Always works
```

---

## VALIDATION RULES

### Stock Fields
```php
'stock_30ml' => 'sometimes|integer|min:0',
'stock_50ml' => 'sometimes|integer|min:0',
```
- Optional: use `sometimes`
- Must be: integer (no decimals)
- Range: >= 0

### Image Fields
```php
'image_slot_1' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:10240',
'image_slot_2' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:10240',
'image_slot_3' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:10240',
'image_slot_4' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:10240',
```
- Optional: use `nullable`
- Must be: image file
- Formats: jpeg, png, jpg, gif, webp
- Size: <= 10MB (10240 KB)

---

## DATABASE OPERATIONS

### Stock Update
```sql
UPDATE product 
SET stock_30ml = 50, 
    stock_50ml = 75, 
    updated_at = CURRENT_TIMESTAMP 
WHERE product_id = 1;
```

### Image Update/Create
```sql
-- If exists, update:
UPDATE productimage 
SET image_url = '/products/night-bloom50ml.png', 
    updated_at = CURRENT_TIMESTAMP 
WHERE product_id = 1 AND is_50ml = 1;

-- If not exists, create:
INSERT INTO productimage 
  (product_id, image_url, is_50ml, is_additional) 
VALUES 
  (1, '/products/night-bloom50ml.png', 1, 0);
```

---

## SUCCESS INDICATORS

After update:
```
✅ Toast shows "Product updated successfully!"
✅ Modal closes
✅ Product list refreshes
✅ Database stock_30ml = 50
✅ Database stock_50ml = 75
✅ File exists: /frontend/.../public/products/night-bloom50ml.png
✅ ProductImage row has correct image_url
✅ Reopening modal shows new image in Slot 1
```

If any of these are missing, check the logs and database.
