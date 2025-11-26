'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import TiltedCard from '@/components/TiltedCard';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { HeartIcon as HeartOutlineIcon, HeartIcon as HeartSolidIcon, ShoppingCartIcon, StarIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

interface Product {
  product_id: number;
  name: string;
  description: string;
  top_notes?: string;
  middle_notes?: string;
  base_notes?: string;
  category: string;
  price_30ml: number;
  price_50ml: number;
  stock_30ml: number;
  stock_50ml: number;
  average_rating?: number;
  images: Array<{ image_id: number; image_url: string; is_50ml: number }>;
  ratings: Array<{
    rating_id: number;
    stars: number;
    comment: string;
    created_at: string;
    user: { 
      name: string;
      profile_pic?: string;
    };
  }>;
}

// Format price as Rp200.000 (no space after Rp)
function formatPrice(amount: number): string {
  return `Rp${amount.toLocaleString('id-ID')}`;
}

// Format date as YYYY-MM-DD
function formatReviewDate(date: string | Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<'30ml' | '50ml'>('30ml');
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    fetchProduct();
    if (user) {
      checkWishlist();
    }
  }, [productId, user]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/products/${productId}`);
      setProduct(response.data);
      
      // Set initial image (prefer 30ml, then 50ml, then first available)
      const image30ml = response.data.images.find((img: any) => img.is_50ml === 0);
      const image50ml = response.data.images.find((img: any) => img.is_50ml === 1);
      const primaryImage = image30ml || image50ml || response.data.images[0];
      if (primaryImage) {
        setSelectedImage(getImageUrl(primaryImage.image_url));
      }
    } catch (error: any) {
      console.error('Error fetching product:', error);
      showToast('Failed to load product', 'error');
    } finally {
      setLoading(false);
    }
  };

  const [wishlistId, setWishlistId] = useState<number | null>(null);

  const checkWishlist = async () => {
    try {
      const response = await api.get('/wishlist');
      const wishlistData = response.data.data || response.data;
      const items = Array.isArray(wishlistData) ? wishlistData : [];
      const item = items.find((item: any) => item.product_id === parseInt(productId));
      if (item) {
        setIsInWishlist(true);
        setWishlistId(item.wishlist_id);
      } else {
        setIsInWishlist(false);
        setWishlistId(null);
      }
    } catch (error) {
      // Wishlist check failed, continue without it
    }
  };

  const handleWishlistToggle = async () => {
    if (!user) {
      showToast('Please login to add items to wishlist', 'info');
      router.push('/login');
      return;
    }

    setWishlistLoading(true);
    try {
      if (isInWishlist && wishlistId) {
        await api.delete(`/wishlist/${wishlistId}`);
        setIsInWishlist(false);
        setWishlistId(null);
        showToast('Removed from wishlist', 'success');
      } else {
        const response = await api.post('/wishlist', { product_id: parseInt(productId) });
        setIsInWishlist(true);
        setWishlistId(response.data.wishlist_id);
        showToast('Added to wishlist', 'success');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to update wishlist', 'error');
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      showToast('Please login to add items to cart', 'info');
      router.push('/login');
      return;
    }

    try {
      await addToCart(parseInt(productId), selectedSize, quantity);
      showToast('Added to cart successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to add to cart', 'error');
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      showToast('Please login to purchase', 'info');
      router.push('/login');
      return;
    }

    try {
      await addToCart(parseInt(productId), selectedSize, quantity);
      router.push('/checkout');
    } catch (error: any) {
      showToast(error.message || 'Failed to add to cart', 'error');
    }
  };

  const getImageUrl = (imageUrl: string): string => {
    if (imageUrl.includes('http://') || imageUrl.includes('https://')) {
      const imageName = imageUrl.split('/').pop();
      if (imageName) {
        return `/products/${imageName}`;
      }
    }
    if (imageUrl.startsWith('/products/')) {
      return imageUrl;
    }
    const imageName = imageUrl.split('/').pop();
    return imageName ? `/products/${imageName}` : '/products/placeholder.png';
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <div className="animate-pulse">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="bg-gray-200 h-96 rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-24 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-gray-500">Product not found</p>
          <Link href="/products" className="mt-4 inline-block text-primary-600 hover:underline">
            Back to Products
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  const currentPrice = selectedSize === '30ml' ? product.price_30ml : product.price_50ml;
  const currentStock = selectedSize === '30ml' ? product.stock_30ml : product.stock_50ml;
  const averageRating = Number(product.average_rating) || 0;
  const ratingCount = product.ratings?.length || 0;
  const allImages = product.images.map(img => ({
    ...img,
    url: getImageUrl(img.image_url)
  }));

  return (
    <main className="min-h-screen bg-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          {/* Product Gallery (Left Side) */}
          <div>
            {/* Main Image with Tilt Card Effect */}
            {selectedImage && (
              <TiltedCard
                imageSrc={selectedImage}
                altText={product.name}
                labelText={`${product.name} - ${selectedSize}`}
                containerHeight="500px"
                containerWidth="100%"
                rotateAmplitude={15}
                showShadow={true}
              />
            )}
            
            {/* Thumbnail Images */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                {allImages.map((img, index) => (
                  <button
                    key={img.image_id}
                    onClick={() => setSelectedImage(img.url)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === img.url
                        ? 'border-black scale-105'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Image
                      src={img.url}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Information (Right Panel) */}
          <div>
            {/* Category Tag and Wishlist Button - Same Line */}
            <div className="flex items-center justify-between mb-4">
              <span className="inline-block bg-black text-white text-sm px-4 py-1.5 rounded-full font-medium">
                {product.category}
              </span>
              <button
                onClick={handleWishlistToggle}
                disabled={wishlistLoading}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow border border-gray-200"
              >
                {isInWishlist ? (
                  <HeartSolid className="w-5 h-5 text-red-500" />
                ) : (
                  <HeartOutlineIcon className="w-5 h-5 text-black" strokeWidth={2} />
                )}
              </button>
            </div>

            {/* Product Title */}
            <h1 className="text-4xl font-header font-bold text-gray-900 mb-4">{product.name}</h1>

            {/* Rating Summary */}
            {averageRating > 0 && (
              <div className="flex items-center gap-2 mb-6">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.round(averageRating)
                          ? 'text-black fill-black'
                          : 'text-[#BDBDBD] fill-[#BDBDBD]'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-base text-gray-700 font-body">
                  {averageRating.toFixed(1)} ({ratingCount} {ratingCount === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            )}

            {/* Price */}
            <div className="mb-6">
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {formatPrice(currentPrice)}
              </p>
              <p className="text-sm text-gray-500">per {selectedSize}</p>
            </div>

            {/* Stock Status */}
            <div className="mb-6">
              <p className="text-sm text-gray-700 font-body">
                {currentStock > 0 ? (
                  <span className="text-green-600 font-medium">In stock: {currentStock} units</span>
                ) : (
                  <span className="text-red-600 font-medium">Out of stock</span>
                )}
              </p>
            </div>

            {/* Size Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3 font-body">Size</label>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setSelectedSize('30ml');
                    setQuantity(1);
                  }}
                  className={`px-12 py-6 border-2 rounded-lg font-medium transition-colors font-body flex flex-col items-center ${
                    selectedSize === '30ml'
                      ? 'border-black bg-white text-black'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <span className="font-bold">30ml</span>
                  <span className="text-sm text-gray-500 mt-1">{formatPrice(product.price_30ml)}</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedSize('50ml');
                    setQuantity(1);
                  }}
                  className={`px-12 py-6 border-2 rounded-lg font-medium transition-colors font-body flex flex-col items-center ${
                    selectedSize === '50ml'
                      ? 'border-black bg-white text-black'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <span className="font-bold">50ml</span>
                  <span className="text-sm text-gray-500 mt-1">{formatPrice(product.price_50ml)}</span>
                </button>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3 font-body">Quantity</label>
              <div className="inline-flex items-center border-2 border-gray-300 rounded-lg bg-white">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 hover:bg-gray-50 font-body text-lg"
                >
                  -
                </button>
                <span className="text-lg font-medium w-12 text-center font-body border-x border-gray-300 py-2">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                  disabled={quantity >= currentStock}
                  className="px-4 py-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-body text-lg"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-8">
              <button
                onClick={handleAddToCart}
                disabled={currentStock === 0}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-body"
              >
                <ShoppingCartIcon className="w-5 h-5" />
                Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                disabled={currentStock === 0}
                className="flex-1 px-6 py-3 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-body"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>

        {/* Product Details (Middle Section) */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Description Card (Left) */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-header font-bold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-600 mb-6 font-body leading-relaxed">{product.description}</p>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-header font-bold text-gray-900 mb-1">Longevity</h3>
                <p className="text-gray-600 font-body">8-10 hours</p>
              </div>
              <div>
                <h3 className="text-lg font-header font-bold text-gray-900 mb-1">Category</h3>
                <p className="text-gray-600 font-body">{product.category}</p>
              </div>
            </div>
          </div>

          {/* Fragrance Notes Card (Right) */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-header font-bold text-gray-900 mb-4">Fragrance Notes</h2>
            <div className="space-y-4">
              {product.top_notes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1 font-body">Top Notes</h3>
                  <p className="text-gray-600 font-body">{product.top_notes}</p>
                </div>
              )}
              {product.middle_notes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1 font-body">Middle Notes</h3>
                  <p className="text-gray-600 font-body">{product.middle_notes}</p>
                </div>
              )}
              {product.base_notes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1 font-body">Base Notes</h3>
                  <p className="text-gray-600 font-body">{product.base_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customer Reviews (Bottom Section) */}
        {product.ratings && product.ratings.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-header font-bold text-gray-900 mb-6">Customer Reviews</h2>
            <div className="space-y-6">
              {product.ratings.map((rating) => {
                const userInitial = rating.user.name ? rating.user.name.charAt(0).toUpperCase() : 'U';
                const reviewDate = formatReviewDate(rating.created_at);

                return (
                  <div key={rating.rating_id} className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-start gap-4">
                      {/* User Avatar/Initial */}
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        {rating.user.profile_pic ? (
                          <img
                            src={
                              rating.user.profile_pic.startsWith('http')
                                ? rating.user.profile_pic
                                : rating.user.profile_pic.includes('profile_pics')
                                ? `/profile_pics/${rating.user.profile_pic.split('/').pop()}`
                                : `http://localhost:8000/storage/${rating.user.profile_pic}`
                            }
                            alt={rating.user.name}
                            className="w-full h-full rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : null}
                        <div className={`${rating.user.profile_pic ? 'hidden' : 'flex'} w-full h-full items-center justify-center text-gray-700 font-semibold`}>
                          {userInitial}
                        </div>
                      </div>

                      {/* Review Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-gray-900 font-body">{rating.user.name}</span>
                          <span className="text-sm text-gray-500 font-body">{reviewDate}</span>
                        </div>
                        
                        {/* Star Rating */}
                        <div className="flex items-center gap-1 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <StarIcon
                              key={i}
                              className={`w-4 h-4 ${
                                i < rating.stars
                                  ? 'text-black fill-black'
                                  : 'text-[#BDBDBD] fill-[#BDBDBD]'
                              }`}
                            />
                          ))}
                        </div>

                        {/* Comment */}
                        {rating.comment && (
                          <p className="text-gray-600 font-body leading-relaxed">{rating.comment}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
