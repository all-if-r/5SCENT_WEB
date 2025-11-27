import api from './api';

export interface ProductImage {
  image_id?: number;
  image_url?: string;
  is_50ml?: number;
}

export interface ProductWithImages {
  images?: ProductImage[];
  [key: string]: any;
}

export const fallbackCarouselImages = [
  '/products/nightbloom50ml.png',
  '/products/CitrusFresh50ml.png',
  '/products/OceanBreeze50ml.png',
  '/products/RoyalOud50ml.png',
  '/products/VanillaSky50ml.png',
];

export function normalizeProductsResponse(data: any): ProductWithImages[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export function normalizeProductImageUrl(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;

  let cleanedUrl = imageUrl.trim();
  const filename = cleanedUrl.split('/').pop();

  if (cleanedUrl.startsWith('http://') || cleanedUrl.startsWith('https://')) {
    return filename ? `/products/${filename}` : cleanedUrl;
  }

  if (!cleanedUrl.startsWith('/')) {
    cleanedUrl = `/${cleanedUrl}`;
  }

  if (!cleanedUrl.startsWith('/products/')) {
    return filename ? `/products/${filename}` : cleanedUrl;
  }

  return cleanedUrl;
}

export function pickDisplayImage(product: ProductWithImages): string {
  const images = product?.images || [];

  const primary =
    images.find((img) => img?.is_50ml === 1) ||
    images.find((img) => (img?.image_url || '').toLowerCase().includes('50ml')) ||
    images[0];

  const normalized = normalizeProductImageUrl(primary?.image_url);
  return normalized || '/products/placeholder.png';
}

export function collect50mlImages(products: ProductWithImages[]): string[] {
  const imageSet = new Set<string>();

  products.forEach((product) => {
    (product?.images || []).forEach((img) => {
      const looksLike50ml =
        img?.is_50ml === 1 || (img?.image_url || '').toLowerCase().includes('50ml');

      if (!looksLike50ml) return;

      const normalized = normalizeProductImageUrl(img?.image_url);
      if (normalized) {
        imageSet.add(normalized);
      }
    });
  });

  return Array.from(imageSet);
}

function normalizeImagesPayload(payload: any): string[] {
  const rawImages = Array.isArray(payload?.images)
    ? payload.images
    : Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
    ? payload
    : [];

  const imageSet = new Set<string>();

  rawImages.forEach((item) => {
    const normalized = normalizeProductImageUrl(
      typeof item === 'string' ? item : item?.image_url
    );

    if (normalized) {
      imageSet.add(normalized);
    }
  });

  return Array.from(imageSet);
}

export async function fetchCarouselImages(): Promise<string[]> {
  try {
    const response = await api.get('/products/images/50ml');
    const images = normalizeImagesPayload(response.data);
    if (images.length > 0) {
      return images;
    }
  } catch (error) {
    console.error('Failed to fetch carousel images:', error);
  }

  try {
    const response = await api.get('/products');
    const products = normalizeProductsResponse(response.data);
    const images = collect50mlImages(products);
    if (images.length > 0) {
      return images;
    }
  } catch (error) {
    console.error('Fallback product fetch failed:', error);
  }

  return [...fallbackCarouselImages];
}
