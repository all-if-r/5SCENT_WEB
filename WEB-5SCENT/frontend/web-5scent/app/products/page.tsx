'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import api from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { MagnifyingGlassIcon, FunnelIcon, HeartIcon as HeartOutlineIcon, HeartIcon as HeartSolidIcon, ShoppingCartIcon, StarIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';

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

  // Fetch all products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await api.get('/products');
        const productsData = response.data.data || response.data;
        const productsList = Array.isArray(productsData) ? productsData : [];
        setAllProducts(productsList);

        // Calculate max price
        const max = Math.max(...productsList.map((p: Product) => p.price_30ml), 0);
        setMaxPrice(max);
        setPriceRange([0, max]);

        // Fetch wishlist if user is logged in
        if (user) {
          try {
            const wishlistResponse = await api.get('/wishlist');
            const wishlistData = wishlistResponse.data.data || wishlistResponse.data;
            const wishlistIds = Array.isArray(wishlistData)
              ? wishlistData.map((item: any) => item.product_id)
              : [];
            setWishlistItems(wishlistIds);
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
      (product) => product.price_30ml >= priceRange[0] && product.price_30ml <= priceRange[1]
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

  const handleWishlistToggle = async (productId: number) => {
    if (!user) {
      showToast('Please login to add items to wishlist', 'info');
      router.push('/login');
      return;
    }

    try {
      const isInWishlist = wishlistItems.includes(productId);
      if (isInWishlist) {
        await api.delete(`/wishlist/${productId}`);
        setWishlistItems(wishlistItems.filter((id) => id !== productId));
        showToast('Removed from wishlist', 'success');
      } else {
        await api.post('/wishlist', { product_id: productId });
        setWishlistItems([...wishlistItems, productId]);
        showToast('Added to wishlist', 'success');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to update wishlist', 'error');
    }
  };

  const handleAddToCart = async (productId: number) => {
    if (!user) {
      showToast('Please login to add items to cart', 'info');
      router.push('/login');
      return;
    }

    try {
      await addToCart(productId, '30ml', 1);
      showToast('Added to cart successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to add to cart', 'error');
    }
  };

  // Get 30ml image for product
  const get30mlImage = (product: Product): string => {
    const image30ml = product.images.find((img) => img.is_50ml === 0);
    if (image30ml) {
      let imageUrl = image30ml.image_url;
      
      // If it's a full URL from Laravel storage
      if (imageUrl.includes('http://') || imageUrl.includes('https://')) {
        const imageName = imageUrl.split('/').pop();
        if (imageName && imageName.toLowerCase().includes('30ml')) {
          return `/products/${imageName}`;
        }
        // Try to extract filename and use local path
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

        <div className="flex flex-col lg:flex-row gap-8">
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
          <div className="flex-1">
            {/* Products Info Line */}
            <p className="text-sm text-gray-600 mb-6 font-body">
              Showing {products.length} of {allProducts.length} products
            </p>

            {/* Product Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <p className="text-gray-500 text-lg">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => {
                  const imageUrl = get30mlImage(product);
                  const isInWishlist = wishlistItems.includes(product.product_id);
                  const averageRating = product.ratings_avg_stars || 0;
                  const ratingCount = product.ratings_count || 0;

                  return (
                    <div
                      key={product.product_id}
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow relative"
                    >
                      {/* Category Badge */}
                      <div className="absolute top-4 left-4 z-10">
                        <span className="bg-black text-white text-xs px-3 py-1 rounded-full font-medium">
                          {product.category}
                        </span>
                      </div>

                      {/* Wishlist Icon */}
                      <button
                        onClick={() => handleWishlistToggle(product.product_id)}
                        className="absolute top-4 right-4 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
                      >
                        {isInWishlist ? (
                          <HeartSolid className="w-5 h-5 text-red-500" />
                        ) : (
                          <HeartOutlineIcon className="w-5 h-5 text-black" strokeWidth={2} />
                        )}
                      </button>

                      {/* Product Image */}
                      <Link href={`/products/${product.product_id}`}>
                        <div className="relative h-64 bg-gray-100 cursor-pointer">
                          <Image
                            src={imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover"
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
            )}
          </div>
        </div>
      </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
