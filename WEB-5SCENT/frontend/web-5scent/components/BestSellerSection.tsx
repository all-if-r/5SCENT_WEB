'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HeartIcon, ShoppingCartIcon, StarIcon } from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutlineIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
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
  ratings_avg_stars?: number;
  ratings_count?: number;
  images: Array<{ image_id: number; image_url: string; is_50ml: number }>;
  main_image?: { image_id: number; image_url: string; is_50ml: number } | null;
}

// Format price as Rp200.000 (no space after Rp)
function formatPrice(amount: number): string {
  return `Rp${amount.toLocaleString('id-ID')}`;
}

export default function BestSellerSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    const fetchBestSellers = async () => {
      try {
        const response = await api.get('/products/best-sellers');
        const productsData = response.data.data || response.data;
        setProducts(Array.isArray(productsData) ? productsData.slice(0, 2) : []);
      } catch (error) {
        console.error('Failed to fetch best sellers:', error);
        try {
          const fallbackResponse = await api.get('/products?best_seller=true');
          const fallbackData = fallbackResponse.data.data || fallbackResponse.data;
          setProducts(Array.isArray(fallbackData) ? fallbackData.slice(0, 2) : []);
        } catch (fallbackError) {
          console.error('Fallback fetch also failed:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBestSellers();
  }, []);

  const handleAddToCart = async (product: Product) => {
    if (!user) {
      showToast('Please login to add items to cart', 'info');
      return;
    }

    try {
      await addToCart(product.product_id, '30ml', 1);
      showToast('Added to cart successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to add to cart', 'error');
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-header font-bold text-gray-900 mb-2">
              Best Seller Perfumes
            </h2>
            <div className="w-24 h-1.5 bg-black mx-auto rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-64 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-header font-bold text-gray-900 mb-6">
            Best Seller Perfumes
          </h2>
          {/* Decorative line - rounded ends to mirror the design */}
          <div className="flex justify-center">
            <div className="w-32 h-1.5 bg-black rounded-full"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {products.map((product, index) => {
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
            
            const averageRating = Math.round(product.ratings_avg_stars || 0);
            const ratingCount = product.ratings_count || 0;

            return (
              <motion.div
                key={product.product_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-md overflow-hidden relative hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
              >
                {/* Category Label */}
                <div className="absolute top-4 left-4 z-10">
                  <span className="bg-black text-white text-xs px-4 py-1.5 rounded-full font-medium">
                    {product.category}
                  </span>
                </div>

                {/* Wishlist Icon - White circle with black heart outline, aligned with Night tag */}
                <div className="absolute top-4 right-4 z-10">
                  {user ? (
                    <Link
                      href="/wishlist"
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
                    >
                      <HeartOutlineIcon className="w-5 h-5 text-black" strokeWidth={2} />
                    </Link>
                  ) : (
                    <Link
                      href="/login"
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
                    >
                      <HeartOutlineIcon className="w-5 h-5 text-black" strokeWidth={2} />
                    </Link>
                  )}
                </div>

                {/* Product Image */}
                <Link href={`/products/${product.product_id}`}>
                  <div className="relative h-64 bg-gray-100 cursor-pointer overflow-hidden">
                    <Image
                      src={imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                      unoptimized
                    />
                  </div>
                </Link>

                {/* Product Info */}
                <div className="p-5">
                  <Link href={`/products/${product.product_id}`}>
                    <h3 className="text-xl font-header font-semibold text-gray-900 mb-3 hover:text-gray-700 transition-colors cursor-pointer">
                      {product.name}
                    </h3>
                  </Link>

                  {/* Rating - Black stars for actual rating, gray for remaining */}
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon
                        key={i}
                        className={`w-5 h-5 ${
                          i < averageRating
                            ? 'text-black fill-black'
                            : 'text-[#BDBDBD] fill-[#BDBDBD]'
                        }`}
                      />
                    ))}
                    <span className="text-sm text-gray-600 ml-1">
                      ({ratingCount})
                    </span>
                  </div>

                  {/* Price - Format: Rp200.000 (no space after Rp), reduced spacing */}
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatPrice(product.price_30ml)}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">30ml</p>
                  </div>

                  {/* Add to Cart Button - Pill shape (rounded-full) */}
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition-colors"
                  >
                    <ShoppingCartIcon className="w-5 h-5" />
                    Add to Cart
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* View All Products Button - Pill shape, border */}
        <div className="text-center mt-10">
          <Link
            href="/products"
            className="inline-block px-8 py-3 border-2 border-black text-black rounded-full font-semibold hover:bg-black hover:text-white transition-colors"
          >
            View All Products
          </Link>
        </div>
      </div>
    </section>
  );
}
