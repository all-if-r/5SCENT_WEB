'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import api from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { HeartIcon as HeartOutlineIcon, ShoppingCartIcon, StarIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';

interface WishlistItem {
  wishlist_id: number;
  product_id: number;
  product: {
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
  };
}

// Format price as Rp200.000 (no space after Rp)
function formatPrice(amount: number): string {
  return `Rp${amount.toLocaleString('id-ID')}`;
}

export default function WishlistPage() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const router = useRouter();

  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchWishlist();
  }, [user, router]);

  const fetchWishlist = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await api.get('/wishlist');
      const wishlistData = response.data.data || response.data;
      const items = Array.isArray(wishlistData) ? wishlistData : [];
      setWishlistItems(items);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      showToast('Failed to load wishlist', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (wishlistId: number) => {
    try {
      await api.delete(`/wishlist/${wishlistId}`);
      setWishlistItems(wishlistItems.filter((item) => item.wishlist_id !== wishlistId));
      showToast('Removed from wishlist', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to remove from wishlist', 'error');
    }
  };

  const handleAddToCart = async (productId: number) => {
    try {
      await addToCart(productId, '30ml', 1);
      showToast('Added to cart successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to add to cart', 'error');
    }
  };

  // Get 30ml image for product
  const get30mlImage = (product: WishlistItem['product']): string => {
    const image30ml = product.images.find((img) => img.is_50ml === 0);
    if (image30ml) {
      let imageUrl = image30ml.image_url;
      
      // If it's a full URL from Laravel storage
      if (imageUrl.includes('http://') || imageUrl.includes('https://')) {
        const imageName = imageUrl.split('/').pop();
        if (imageName && imageName.toLowerCase().includes('30ml')) {
          return `/products/${imageName}`;
        }
        if (imageName) {
          return `/products/${imageName}`;
        }
      }
      
      // If it already contains 30ml in the path
      if (imageUrl.toLowerCase().includes('30ml')) {
        const imageName = imageUrl.split('/').pop();
        if (imageName) {
          return `/products/${imageName}`;
        }
      }
      
      // If it's a relative path, check if it starts with /products
      if (imageUrl.startsWith('/products/')) {
        return imageUrl;
      }
      
      // Default: try to use the image URL as is, or fallback to products folder
      const imageName = imageUrl.split('/').pop();
      return imageName ? `/products/${imageName}` : '/products/placeholder.png';
    }
    return '/products/placeholder.png';
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-64 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-header font-bold text-gray-900 mb-2">My Wishlist</h1>
          <div className="h-1 w-20 bg-black"></div>
        </div>

        {/* Empty State */}
        {wishlistItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-32 h-32 mb-6 flex items-center justify-center">
              <HeartOutlineIcon className="w-full h-full text-gray-300 stroke-1" />
            </div>
            <h2 className="text-2xl font-header font-bold text-gray-900 mb-2">
              Your wishlist is empty
            </h2>
            <p className="text-gray-600 mb-8 font-body">
              Start adding your favorite fragrances.
            </p>
            <Link
              href="/products"
              className="px-8 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors font-body"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <>
            {/* Item Counter */}
            <p className="text-sm text-gray-600 mb-6 font-body">
              {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} in your wishlist
            </p>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlistItems.map((item) => {
                const product = item.product;
                const imageUrl = get30mlImage(product);
                const averageRating = Number(product.ratings_avg_stars) || 0;
                const ratingCount = product.ratings_count || 0;

                return (
                  <div
                    key={item.wishlist_id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105 relative group"
                  >
                    {/* Category Badge */}
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-black text-white text-xs px-3 py-1 rounded-full font-medium">
                        {product.category}
                      </span>
                    </div>

                    {/* Wishlist Icon - Remove from wishlist */}
                    <button
                      onClick={() => handleRemoveFromWishlist(item.wishlist_id)}
                      className="absolute top-4 right-4 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
                    >
                      <HeartSolid className="w-5 h-5 text-red-500" />
                    </button>

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
                        <h3 className="text-lg font-header font-semibold text-gray-900 mb-2 hover:text-gray-700 transition-colors">
                          {product.name}
                        </h3>
                      </Link>

                      {/* Rating */}
                      <div className="flex items-center gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                          <StarIcon
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.round(averageRating)
                                ? 'text-black fill-black'
                                : 'text-[#BDBDBD] fill-[#BDBDBD]'
                            }`}
                          />
                        ))}
                        <span className="text-sm text-gray-600 ml-1">({ratingCount})</span>
                      </div>

                      {/* Price */}
                      <div className="mb-3">
                        <p className="text-xl font-bold text-gray-900">
                          {formatPrice(product.price_30ml)}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">30ml</p>
                      </div>

                      {/* Add to Cart Button */}
                      <button
                        onClick={() => handleAddToCart(product.product_id)}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition-colors"
                      >
                        <ShoppingCartIcon className="w-5 h-5" />
                        Add to Cart
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}

