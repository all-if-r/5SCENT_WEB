# Image System Rewrite - Complete Overhaul

## Problem Statement
The previous image management system used array index-based tracking, which caused critical issues:
- Deleting slot 3 would cause slot 4 to visually shift to slot 3
- Images would appear in the wrong slots after deletion
- The `imagesToDelete` array caused index mismatches when images were filtered out
- No consistent way to track which image belonged to which slot

## Solution: Slot-Based Image Tracking

### Frontend State Management Changes

**Old State:**
```typescript
const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);
```

**New State:**
```typescript
// Map of slot (1-4) -> image object (or null)
const [existingImagesBySlot, setExistingImagesBySlot] = useState<{ [key: number]: ProductImage | null }>({
  1: null, // Slot 1: 50ml image
  2: null, // Slot 2: 30ml image
  3: null, // Slot 3: Additional image 1
  4: null, // Slot 4: Additional image 2
});

// Set of image IDs marked for deletion (not indices)
const [imagesToDelete, setImagesToDelete] = useState<Set<number>>(new Set());
```

### Key Changes

#### 1. **Image Loading in `openEditModal()`**
Now properly detects which slot each image belongs to using filename suffix parsing:

```typescript
// For main images: use is_50ml flag
if (!img.is_additional) {
  slot = img.is_50ml ? 1 : 2;
} else {
  // For additional images: extract slot from filename suffix
  const filename = img.image_url.split('/').pop() || '';
  if (filename.includes('-1.')) {
    slot = 3; // Has -1 before extension -> slot 3
  } else if (filename.includes('-2.')) {
    slot = 4; // Has -2 before extension -> slot 4
  }
}
```

#### 2. **New Helper Functions**

**`getImageForSlot(slot: number)`**
- Checks if a new image was uploaded for the slot (preview takes priority)
- Falls back to existing image if not marked for deletion
- Returns null if no image exists

**`handleDeleteExistingImage(imageId: number, slot: number)`**
- Adds image ID to the deletion Set
- Clears the preview for that specific slot
- No longer modifies the existingImages array (preventing index shifts)

#### 3. **Image Deletion Logic**
- Changed from array filtering (which caused index shifts) to Set operations
- Each deletion only affects its specific slot
- No cascading effects to other slots

#### 4. **Image Rendering**
Updated to iterate with slot number and use the `getImageForSlot()` helper:

```typescript
{[0, 1, 2, 3].map((index) => {
  const slot = index + 1; // Convert to 1-based slot
  const imageUrl = getImageForSlot(slot);
  const hasExistingImage = existingImagesBySlot[slot] !== null;
  // ... render image with slot-specific logic
})}
```

### Deletion Flow

**Before (Problematic):**
1. Delete slot 3 image
2. Filter existingImages array: [slot1, slot2, slot4]
3. Render with index 0,1,2 -> slot 4 appears in slot 3 position

**After (Fixed):**
1. Delete slot 3 image
2. Add to imagesToDelete Set: {imageId}
3. existingImagesBySlot[3] = null
4. Render slot 3 with null -> stays empty, slot 4 unaffected

## Backend Compatibility

The backend was already updated to use:
- Filename suffix (-1, -2) for additional image identification
- `findSlotImage()` method that parses filenames to determine slots
- Proper file deletion with basename extraction

No changes needed to backend API.

## Testing Checklist

- [ ] Upload image to slot 1 (50ml)
- [ ] Upload image to slot 2 (30ml)
- [ ] Upload image to slot 3 (additional 1)
- [ ] Upload image to slot 4 (additional 2)
- [ ] Delete slot 3 image → slot 4 should remain in slot 4
- [ ] Edit product: all images should appear in correct slots
- [ ] Delete slot 2 image → slot 1, 3, 4 should remain unchanged
- [ ] Re-upload to a slot after deletion
- [ ] Check database: filenames contain -1 and -2 for slots 3 and 4

## Files Modified

- `frontend/web-5scent/app/admin/products/page.tsx`
  - State initialization (line ~92)
  - `openAddModal()` function
  - `openEditModal()` function with slot detection
  - `closeModals()` function
  - New `getImageForSlot()` helper
  - New `handleDeleteExistingImage()` function
  - Image rendering section with slot-based UI
  - Image deletion in `handleUpdateProduct()` (Set iteration instead of array)

## Key Principle

**Slot addresses are permanent**. Once you assign an image to slot 3 (by filename suffix), it stays in slot 3 until explicitly deleted. Deleting other images doesn't affect slot 3's position.
