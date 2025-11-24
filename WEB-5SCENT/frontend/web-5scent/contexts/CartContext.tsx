'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from './AuthContext';

interface CartItem {
  cart_id: number;
  product_id: number;
  size: '30ml' | '50ml';
  quantity: number;
  product: {
    product_id: number;
    name: string;
    price_30ml: number;
    price_50ml: number;
    images: Array<{ image_id: number; image_url: string; is_50ml: number }>;
  };
  price: number;
  total: number;
}

interface CartContextType {
  items: CartItem[];
  total: number;
  loading: boolean;
  refreshCart: () => Promise<void>;
  addToCart: (productId: number, size: '30ml' | '50ml', quantity: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Update total whenever items change
  useEffect(() => {
    const newTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    setTotal(newTotal);
  }, [items]);

  const refreshCart = async () => {
    if (!user) {
      setItems([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get('/cart');
      setItems(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshCart();
    }
  }, [user]);

  const addToCart = async (productId: number, size: '30ml' | '50ml', quantity: number) => {
    try {
      await api.post('/cart', { product_id: productId, size, quantity });
      await refreshCart();
      // Dispatch cart update event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cart-updated'));
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add to cart');
    }
  };

  const updateQuantity = async (itemId: number, quantity: number) => {
    try {
      await api.put(`/cart/${itemId}`, { quantity });
      await refreshCart();
      // Dispatch cart update event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cart-updated'));
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update cart');
    }
  };

  const removeFromCart = async (itemId: number) => {
    try {
      await api.delete(`/cart/${itemId}`);
      // Update items immediately without refreshing the entire cart
      setItems(prevItems => prevItems.filter(item => item.cart_id !== itemId));
      // Dispatch cart update event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cart-updated'));
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to remove from cart');
    }
  };

  return (
    <CartContext.Provider value={{ items, total, loading, refreshCart, addToCart, updateQuantity, removeFromCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
