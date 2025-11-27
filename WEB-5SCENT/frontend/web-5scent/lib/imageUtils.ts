/**
 * Image utilities for product image handling in admin dashboard
 */

/**
 * Creates a slug from product name for use in image filenames
 * @param productName - The product name to slugify
 * @returns A URL-safe slug
 */
export function createProductSlug(productName: string): string {
  return productName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Gets the appropriate filename for a product image slot
 * @param perfumeSlug - The slugified product name
 * @param slotIndex - The image slot index (0-3)
 * @returns The filename without extension
 */
export function getImageFilename(perfumeSlug: string, slotIndex: number): string {
  const slotMap = {
    0: `${perfumeSlug}50ml`,     // 50ml primary
    1: `${perfumeSlug}30ml`,     // 30ml secondary
    2: `additional${perfumeSlug}1`, // Additional 1
    3: `additional${perfumeSlug}2`, // Additional 2
  };
  
  return slotMap[slotIndex as keyof typeof slotMap] || `image_${slotIndex}`;
}

/**
 * Gets the slot label for display purposes
 * @param slotIndex - The image slot index (0-3)
 * @returns The human-readable slot label
 */
export function getSlotLabel(slotIndex: number): string {
  const labels = {
    0: '50ml - Image 1 (Primary)',
    1: '30ml - Image 2 (Secondary)',
    2: 'Additional - Image 3',
    3: 'Additional - Image 4',
  };
  
  return labels[slotIndex as keyof typeof labels] || `Slot ${slotIndex + 1}`;
}

/**
 * Validates an image file
 * @param file - The file to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
  
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: PNG, JPG, GIF. Got: ${file.type}`,
    };
  }
  
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size too large. Max: 10MB, Got: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }
  
  return { isValid: true };
}

/**
 * Prepares form data for product image upload
 * @param files - Array of files (up to 4 slots)
 * @param productName - Product name for slug generation
 * @returns FormData with properly named image files
 */
export function prepareImageFormData(files: (File | null)[], productName: string): {
  imageData: FormData;
  fileCount: number;
} {
  const slug = createProductSlug(productName);
  const imageData = new FormData();
  let fileCount = 0;
  
  files.forEach((file, index) => {
    if (file) {
      const filename = getImageFilename(slug, index);
      imageData.append('images[]', file);
      imageData.append(`image_slot[${index}]`, index.toString());
      imageData.append(`image_name[${index}]`, filename);
      fileCount++;
    }
  });
  
  return { imageData, fileCount };
}
