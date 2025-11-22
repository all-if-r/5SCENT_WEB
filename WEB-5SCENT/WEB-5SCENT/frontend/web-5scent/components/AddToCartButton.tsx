'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';

interface AddToCartButtonProps {
  productId: number;
  size: '30ml' | '50ml';
  quantity: number;
  disabled?: boolean;
}

export default function AddToCartButton({ productId, size, quantity, disabled }: AddToCartButtonProps) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAddToCart = async () => {
    if (!user) {
      showToast('Please login to add items to cart', 'info');
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      await addToCart(productId, size, quantity);
      showToast('Added to cart successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to add to cart', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleAddToCart}
      disabled={disabled || loading}
      className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}
