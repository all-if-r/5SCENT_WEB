'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import api from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { MagnifyingGlassIcon, FunnelIcon, HeartIcon as HeartOutlineIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { FaStar, FaRegStar, FaRegStarHalfStroke } from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import SizeSelectionModal from '@/components/SizeSelectionModal';
import { animateToIcon } from '@/lib/animations';
import { roundRating } from '@/lib/utils';
import { normalizeProductsResponse, pickDisplayImage } from '@/lib/productData';

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
}

// Format price as Rp200.000 (no space after Rp)
function formatPrice(amount: number): string {
  return `Rp${amount.toLocaleString('id-ID')}`;
}

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [maxPrice, setMaxPrice] = useState(0);
  const [wishlistItems, setWishlistItems] = useState<number[]>([]);
  const [wishlistMap, setWishlistMap] = useState<Map<number, number>>(new Map()); // product_id -> wishlist_id
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch all products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await api.get('/products');
        const productsList = normalizeProductsResponse(response.data) as Product[];
        setAllProducts(productsList);

        // Calculate max price
        const max = Math.max(...productsList.map((p: Product) => p.price_30ml ?? 0), 0);
        setMaxPrice(max);
        setPriceRange([0, max]);

        // Fetch wishlist if user is logged in
        if (user) {
          try {
            const wishlistResponse = await api.get('/wishlist');
            const wishlistData = wishlistResponse.data.data || wishlistResponse.data;
            const items = Array.isArray(wishlistData) ? wishlistData : [];
            const productIds = items.map((item: any) => item.product_id);
            const map = new Map<number, number>();
            items.forEach((item: any) => {
              map.set(item.product_id, item.wishlist_id);
            });
            setWishlistItems(productIds);
            setWishlistMap(map);
          } catch (error) {
            // Wishlist fetch failed, continue without it
          }
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        showToast('Failed to load products', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [user, showToast]);

  // Filter products
  useEffect(() => {
    let filtered = [...allProducts];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter((product) => product.category === selectedCategory);
    }

    // Price range filter
    filtered = filtered.filter(
      (product) => {
        const price = product.price_30ml ?? 0;
        return price >= priceRange[0] && price <= priceRange[1];
      }
    );

    setProducts(filtered);
  }, [allProducts, searchQuery, selectedCategory, priceRange]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory !== 'All') params.set('category', selectedCategory);
    router.push(`/products?${params.toString()}`);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (category !== 'All') params.set('category', category);
    router.push(`/products?${params.toString()}`);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setPriceRange([0, maxPrice]);
    router.push('/products');
  };

  const handleWishlistToggle = async (productId: number, productImageElement?: HTMLElement) => {
    if (!user) {
      showToast('Please login to add items to wishlist', 'info');
      router.push('/login');
      return;
    }

    try {
      const isInWishlist = wishlistItems.includes(productId);
      if (isInWishlist) {
        const wishlistId = wishlistMap.get(productId);
        if (wishlistId) {
          await api.delete(`/wishlist/${wishlistId}`);
          setWishlistItems(wishlistItems.filter((id) => id !== productId));
          const newMap = new Map(wishlistMap);
          newMap.delete(productId);
          setWishlistMap(newMap);
          showToast('Removed from wishlist', 'success');
          
          // Refresh navigation wishlist count
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('wishlist-updated'));
          }
        }
      } else {
        try {
          const response = await api.post('/wishlist', { product_id: productId });
          const newItem = response.data;
          setWishlistItems([...wishlistItems, productId]);
          const newMap = new Map(wishlistMap);
          if (newItem && newItem.wishlist_id) {
            newMap.set(productId, newItem.wishlist_id);
          }
          setWishlistMap(newMap);
          showToast('Added to wishlist', 'success');
          
          // Trigger animation if product image is available
          if (productImageElement) {
            animateToIcon(productImageElement, 'wishlist-icon');
          }
          
          // Refresh navigation wishlist count
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('wishlist-updated'));
          }
        } catch (error: any) {
          console.error('Wishlist add error:', error);
          throw error;
        }
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to update wishlist', 'error');
    }
  };

  const handleAddToCartClick = (product: Product) => {
    if (!user) {
      showToast('Please login to add items to cart', 'info');
      router.push('/login');
      return;
    }
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleAddToCart = async (productId: number, size: '30ml' | '50ml', quantity: number) => {
    await addToCart(productId, size, quantity);
  };

  const getProductImage = (product: Product): string => {
    return pickDisplayImage(product);
  };

  return (
    <main className="min-h-screen bg-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-header font-bold text-gray-900 mb-2">Our Collection</h1>
          <div className="h-1 w-20 bg-black"></div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative max-w-2xl">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your perfume..."
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-black focus:bg-white transition-all font-body text-sm placeholder:text-gray-400"
            />
          </div>
        </form>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Panel */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
              <div className="flex items-center gap-2 mb-6">
                <FunnelIcon className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900 font-header">Filters</h2>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 font-body">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-black focus:bg-white transition-all font-body text-sm"
                >
                  <option value="All">All</option>
                  <option value="Day">Day</option>
                  <option value="Night">Night</option>
                </select>
              </div>

              {/* Price Range Slider */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 font-body">
                  Price Range: {formatPrice(priceRange[0])} – {formatPrice(priceRange[1])}
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max={maxPrice}
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{formatPrice(0)}</span>
                    <span>{formatPrice(maxPrice)}</span>
                  </div>
                </div>
              </div>

              {/* Reset Filters Button */}
              <button
                onClick={handleResetFilters}
                className="w-full text-sm text-gray-600 hover:text-gray-900 transition-colors font-body"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Products Section */}
          <div className="flex-1 min-w-0 pr-2">
            {/* Products Info Line */}
            <p className="text-sm text-gray-600 mb-6 font-body">
              Showing {products.length} of {allProducts.length} products
            </p>

            {/* Product Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 h-64 rounded-lg mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  {allProducts.length === 0
                    ? 'No products available yet.'
                    : 'No products match your filters.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => {
                  const imageUrl = getProductImage(product);
                  const isInWishlist = wishlistItems.includes(product.product_id);
                  const averageRating = Number(product.ratings_avg_stars) || 0;
                  const ratingCount = product.ratings_count || 0;

                  return (
                    <div
                      key={product.product_id}
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105 relative group"
                    >
                      {/* Category Badge */}
                      <div className="absolute top-4 left-4 z-10">
                        <span className="bg-black text-white text-xs px-3 py-1 rounded-full font-medium">
                          {product.category}
                        </span>
                      </div>

                      {/* Wishlist Icon */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const imageElement = e.currentTarget.closest('.group')?.querySelector('img') as HTMLElement;
                          handleWishlistToggle(product.product_id, imageElement || undefined);
                        }}
                        className="absolute top-4 right-4 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      >
                        {isInWishlist ? (
                          <HeartSolid className="w-5 h-5 text-red-500" />
                        ) : (
                          <HeartOutlineIcon className="w-5 h-5 text-black" strokeWidth={2} />
                        )}
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
                        <div className="flex items-center gap-0.5 mb-3">
                          {[...Array(5)].map((_, i) => {
                            const roundedRating = roundRating(averageRating);
                            const hasHalfStar = Math.abs(roundedRating - Math.floor(roundedRating) - 0.5) < 0.01;
                            const starPosition = i;
                            
                            // Full star
                            if (starPosition < Math.floor(roundedRating)) {
                              return (
                                <FaStar
                                  key={i}
                                  className="w-4 h-4 text-black"
                                />
                              );
                            }
                            
                            // Half star
                            if (hasHalfStar && starPosition === Math.floor(roundedRating)) {
                              return (
                                <FaRegStarHalfStroke
                                  key={i}
                                  className="w-4 h-4 text-black"
                                />
                              );
                            }
                            
                            // Empty star
                            return (
                              <FaRegStar
                                key={i}
                                className="w-4 h-4 text-black"
                              />
                            );
                          })}
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
                          onClick={() => handleAddToCartClick(product)}
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
            )}
          </div>
        </div>
      </div>
      <SizeSelectionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onAddToCart={handleAddToCart}
        targetIcon="cart"
      />
      <Footer />
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white">
          <Navigation />
          <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-gray-200 h-64 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
          <Footer />
        </main>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
