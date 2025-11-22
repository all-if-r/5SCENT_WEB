'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import AddToCartButton from '@/components/AddToCartButton';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { motion } from 'framer-motion';

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
  average_rating: number;
  images: Array<{ image_id: number; image_url: string; is_50ml: number }>;
  ratings: Array<{
    rating_id: number;
    stars: number;
    comment: string;
    user: { name: string };
  }>;
}

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<'30ml' | '50ml'>('30ml');
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      console.info(`[ProductDetail] Fetching product ${productId} from: ${api.defaults.baseURL}/products/${productId}`);
      const response = await api.get(`/products/${productId}`);
      setProduct(response.data);
      const primaryImage = response.data.images.find((img: any) => img.is_50ml === 0) || response.data.images[0];
      if (primaryImage) {
        setSelectedImage(primaryImage.image_url);
      }
      console.info('[ProductDetail] Product fetched successfully:', response.data);
    } catch (error: any) {
      console.error('[ProductDetail] Error details:', {
        message: error.message,
        hasResponse: !!error.response,
        hasRequest: !!error.request,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
      });
      showToast('Failed to load product. Check console for details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <div className="animate-pulse">
            <div className="grid md:grid-cols-2 gap-8">
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
  const availableImages = product.images.map(img => img.image_url);

  return (
    <main className="min-h-screen bg-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Images */}
          <div>
            <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
              {selectedImage && (
                <Image
                  src={selectedImage}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              )}
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {availableImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(img)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                      selectedImage === img ? 'border-primary-600' : 'border-transparent'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-4xl font-header font-bold text-gray-900 mb-4">{product.name}</h1>
            <p className="text-lg text-gray-600 mb-4">{product.category} Fragrance</p>

            {product.average_rating > 0 && (
              <div className="flex items-center gap-2 mb-6">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.round(product.average_rating)
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {product.average_rating.toFixed(1)} ({product.ratings.length} reviews)
                </span>
              </div>
            )}

            <div className="mb-6">
              <p className="text-3xl font-bold text-primary-600 mb-2">
                {formatCurrency(currentPrice)}
              </p>
              <p className="text-sm text-gray-500">per {selectedSize}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setSelectedSize('30ml');
                    setQuantity(1);
                  }}
                  className={`px-6 py-3 border-2 rounded-lg font-medium transition-colors ${
                    selectedSize === '30ml'
                      ? 'border-primary-600 bg-primary-50 text-primary-600'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  30ml - {formatCurrency(product.price_30ml)}
                </button>
                <button
                  onClick={() => {
                    setSelectedSize('50ml');
                    setQuantity(1);
                  }}
                  className={`px-6 py-3 border-2 rounded-lg font-medium transition-colors ${
                    selectedSize === '50ml'
                      ? 'border-primary-600 bg-primary-50 text-primary-600'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  50ml - {formatCurrency(product.price_50ml)}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  -
                </button>
                <span className="text-lg font-medium w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                  disabled={quantity >= currentStock}
                  className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
                <span className="text-sm text-gray-500">({currentStock} available)</span>
              </div>
            </div>

            <AddToCartButton
              productId={product.product_id}
              size={selectedSize}
              quantity={quantity}
              disabled={currentStock === 0}
            />

            <div className="mt-8 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600">{product.description}</p>
              </div>
              {(product.top_notes || product.middle_notes || product.base_notes) && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Fragrance Notes</h3>
                  {product.top_notes && <p className="text-gray-600"><strong>Top:</strong> {product.top_notes}</p>}
                  {product.middle_notes && <p className="text-gray-600"><strong>Middle:</strong> {product.middle_notes}</p>}
                  {product.base_notes && <p className="text-gray-600"><strong>Base:</strong> {product.base_notes}</p>}
                </div>
              )}
            </div>

            {product.ratings.length > 0 && (
              <div className="mt-8">
                <h3 className="font-semibold text-gray-900 mb-4">Reviews</h3>
                <div className="space-y-4">
                  {product.ratings.map((rating) => (
                    <div key={rating.rating_id} className="border-t pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-4 h-4 ${
                                i < rating.stars ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="font-medium">{rating.user.name}</span>
                      </div>
                      {rating.comment && <p className="text-gray-600">{rating.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
