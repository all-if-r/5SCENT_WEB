'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { animateToIcon } from '@/lib/animations';

interface Product {
  product_id: number;
  name: string;
  price_30ml: number;
  price_50ml: number;
  stock_30ml: number;
  stock_50ml: number;
  images: Array<{ image_id: number; image_url: string; is_50ml: number }>;
}

interface SizeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAddToCart?: (productId: number, size: '30ml' | '50ml', quantity: number) => void;
  targetIcon?: 'cart' | 'wishlist';
}

function formatPrice(amount: number): string {
  return `Rp${amount.toLocaleString('id-ID')}`;
}

export default function SizeSelectionModal({
  isOpen,
  onClose,
  product,
  onAddToCart,
  targetIcon = 'cart',
}: SizeSelectionModalProps) {
  const [selectedSize, setSelectedSize] = useState<'30ml' | '50ml'>('30ml');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && product) {
      setSelectedSize('30ml');
      setQuantity(1);
    }
  }, [isOpen, product]);

  useEffect(() => {
    // Allow background to remain scrollable while modal is open
    // No need to prevent body scroll - user can scroll behind the modal
    return () => {
      // Cleanup on unmount
    };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const getProductImage = (): string => {
    const image30ml = product.images.find((img) => img.is_50ml === 0);
    const image50ml = product.images.find((img) => img.is_50ml === 1);
    const selectedImage = selectedSize === '30ml' ? image30ml : image50ml;
    
    if (selectedImage) {
      let imageUrl = selectedImage.image_url;
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
    }
    return '/products/placeholder.png';
  };

  const getPrice = (): number => {
    return selectedSize === '30ml' ? product.price_30ml : product.price_50ml;
  };

  const getStock = (): number => {
    return selectedSize === '30ml' ? product.stock_30ml : product.stock_50ml;
  };

  const handleAddToCart = async () => {
    if (getStock() < quantity) {
      showToast('Insufficient stock', 'error');
      return;
    }

    setLoading(true);
    try {
      if (onAddToCart) {
        await onAddToCart(product.product_id, selectedSize, quantity);
      } else {
        await addToCart(product.product_id, selectedSize, quantity);
      }

      // Trigger flying animation
      if (imageRef.current) {
        const imageElement = imageRef.current.querySelector('img') as HTMLElement;
        if (imageElement) {
          animateToIcon(imageElement, targetIcon === 'cart' ? 'cart-icon' : 'wishlist-icon');
        }
      }

      showToast('Added to cart successfully', 'success');
      
      // Dispatch cart update event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cart-updated'));
      }

      // Close modal after a short delay to show animation
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error: any) {
      showToast(error.message || 'Failed to add to cart', 'error');
    } finally {
      setLoading(false);
    }
  };


  const maxQuantity = Math.min(getStock(), 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dimmed background overlay - semi-transparent */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        onClick={onClose}
      />

      {/* Modal content - compact size with scrollable content */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
        >
          <XMarkIcon className="w-5 h-5 text-gray-700" />
        </button>

        {/* Product Image */}
        <div ref={imageRef} className="relative h-40 bg-gray-100 flex-shrink-0">
          <Image
            src={getProductImage()}
            alt={product.name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>

        {/* Product Info - Scrollable */}
        <div className="p-5 overflow-y-auto flex-1 min-h-0" style={{ 
          maxHeight: 'calc(85vh - 10rem)',
          WebkitOverflowScrolling: 'touch'
        }}>
          <h2 className="text-xl font-header font-bold text-gray-900 mb-3">
            {product.name}
          </h2>

          {/* Size Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Size
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedSize('30ml')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 font-semibold transition-all ${
                  selectedSize === '30ml'
                    ? 'border-black bg-black text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                30ml
                <span className="block text-xs font-normal mt-1">
                  {product.stock_30ml > 0 ? `Stock: ${product.stock_30ml}` : 'Out of Stock'}
                </span>
              </button>
              <button
                onClick={() => setSelectedSize('50ml')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 font-semibold transition-all ${
                  selectedSize === '50ml'
                    ? 'border-black bg-black text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                50ml
                <span className="block text-xs font-normal mt-1">
                  {product.stock_50ml > 0 ? `Stock: ${product.stock_50ml}` : 'Out of Stock'}
                </span>
              </button>
            </div>
          </div>

          {/* Price */}
          <div className="mb-3">
            <p className="text-2xl font-bold text-gray-900">
              {formatPrice(getPrice())}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {selectedSize} • {getStock()} available
            </p>
          </div>

          {/* Quantity Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-10 h-10 border-2 border-gray-300 rounded-lg hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                -
              </button>
              <span className="text-lg font-semibold w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                disabled={quantity >= maxQuantity}
                className="w-10 h-10 border-2 border-gray-300 rounded-lg hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                +
              </button>
              <span className="text-sm text-gray-500 ml-auto">
                Max: {maxQuantity}
              </span>
            </div>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={loading || getStock() === 0}
            className="w-full px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}

