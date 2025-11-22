'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Product {
  product_id: number;
  name: string;
  description: string;
  category: string;
  price_30ml: number;
  price_50ml: number;
  stock_30ml: number;
  stock_50ml: number;
  top_notes: string | null;
  middle_notes: string | null;
  base_notes: string | null;
  created_at: string;
  updated_at: string;
  images: Array<{ image_id: number; image_url: string; is_50ml: number }>;
  main_image?: { image_id: number; image_url: string; is_50ml: number } | null;
}

interface ProductGridProps {
  bestSeller?: boolean;
  category?: string;
  search?: string;
}

export default function ProductGrid({ bestSeller, category, search }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (search) params.append('search', search);
        
        const fullUrl = `${api.defaults.baseURL}/products${params.toString() ? '?' + params.toString() : ''}`;
        console.log(`[API Request] GET ${fullUrl}`);
        
        const response = await api.get(`/products${params.toString() ? '?' + params.toString() : ''}`);
        
        console.log(`[API Response] ${response.status} from /products`);
        const productsData = response.data.data || response.data;
        setProducts(Array.isArray(productsData) ? productsData : []);
        console.log('[ProductGrid] Products fetched successfully:', productsData);
      } catch (error: any) {
        let errorMsg = 'Failed to fetch products';
        
        if (error.response) {
          // Server responded with error status
          errorMsg = error.response.data?.message || `Server error: ${error.response.status}`;
          console.error('[ProductGrid] Server Error:', {
            status: error.response.status,
            data: error.response.data,
          });
        } else if (error.request) {
          // Request made but no response (network/CORS issue)
          errorMsg = 'Network error: Could not reach the server. Check if backend is running and CORS is configured.';
          console.error('[ProductGrid] Network/CORS Error:', {
            message: error.message,
            request: error.request,
          });
        } else {
          // Error in request setup
          errorMsg = error.message || 'Unknown error occurred';
          console.error('[ProductGrid] Request Setup Error:', error.message);
        }
        
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [category, search]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">Failed to load products</p>
        <p className="text-red-600 text-sm mt-2">{error}</p>
        <details className="mt-4 text-left text-sm text-red-700 bg-white p-3 rounded border border-red-200">
          <summary className="cursor-pointer font-medium">Troubleshooting tips (click to expand)</summary>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Check if backend is running on <code className="bg-red-100 px-1">{process.env.NEXT_PUBLIC_API_URL}</code></li>
            <li>Check browser DevTools Console (F12) for detailed error logs</li>
            <li>Verify <code className="bg-red-100 px-1">NEXT_PUBLIC_API_URL</code> in <code className="bg-red-100 px-1">.env.local</code></li>
            <li>Check CORS headers from backend</li>
          </ul>
        </details>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 h-64 rounded-lg mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No products found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map((product, index) => {
        // Prefer mainImage (is_50ml = 1), fallback to first image
        const primaryImage = product.main_image || 
                            product.images.find(img => img.is_50ml === 1) || 
                            product.images[0];
        // Ensure image path starts with /products/
        let imageUrl = primaryImage?.image_url || '/products/placeholder.png';
        if (!imageUrl.startsWith('/')) {
          imageUrl = '/' + imageUrl;
        }
        if (!imageUrl.startsWith('/products/') && !imageUrl.startsWith('/carousel_image/')) {
          imageUrl = '/products/' + imageUrl.replace(/^\/+/, '');
        }

        return (
          <motion.div
            key={product.product_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={`/products/${product.product_id}`}>
              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
                <div className="relative h-64 bg-gray-100">
                  <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-header font-semibold text-gray-900 mb-1">{product.name}</h3>
                  <p className="text-sm text-gray-500 mb-2">{product.category}</p>
                  <p className="text-xs text-gray-400 mb-2 line-clamp-2">{product.description}</p>
                  {product.top_notes && (
                    <p className="text-xs text-gray-500 mb-1">
                      <span className="font-medium">Notes:</span> {product.top_notes}
                      {product.middle_notes && `, ${product.middle_notes}`}
                      {product.base_notes && `, ${product.base_notes}`}
                    </p>
                  )}
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-lg font-bold text-primary-600">
                      {formatCurrency(product.price_30ml)}
                    </span>
                    <span className="text-sm text-gray-500">/ 30ml</span>
                    {product.price_50ml && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className="text-base font-semibold text-gray-700">
                          {formatCurrency(product.price_50ml)}
                        </span>
                        <span className="text-sm text-gray-500">/ 50ml</span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2 text-xs text-gray-500">
                    <span>Stock 30ml: {product.stock_30ml}</span>
                    {product.stock_50ml !== undefined && (
                      <span>Stock 50ml: {product.stock_50ml}</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
