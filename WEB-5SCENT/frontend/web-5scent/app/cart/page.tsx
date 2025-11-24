'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/lib/utils';
import { TrashIcon } from '@heroicons/react/24/outline';

export default function CartPage() {
  const { user } = useAuth();
  const { items, total, updateQuantity, removeFromCart } = useCart();
  const { showToast } = useToast();
  const router = useRouter();
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  useEffect(() => {
    setSelectedItems(items.map(item => item.cart_id));
  }, [items]);

  if (!user) {
    return null;
  }

  const handleQuantityChange = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      await updateQuantity(itemId, newQuantity);
    } catch (error: any) {
      showToast(error.message || 'Failed to update quantity', 'error');
    }
  };

  const handleRemove = async (itemId: number) => {
    if (!confirm('Remove this item from cart?')) return;
    try {
      await removeFromCart(itemId);
      showToast('Item removed from cart', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to remove item', 'error');
    }
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      showToast('Please select at least one item', 'error');
      return;
    }
    router.push(`/checkout?items=${selectedItems.join(',')}`);
  };

  const selectedTotal = items
    .filter(item => selectedItems.includes(item.cart_id))
    .reduce((sum, item) => sum + item.total, 0);

  return (
    <main className="min-h-screen bg-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-header font-bold text-gray-900 mb-4">Shopping Cart</h1>
          <div className="h-1.5 w-20 bg-black rounded-full"></div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">Your cart is empty</p>
            <Link
              href="/products"
              className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              {items.map((item) => {
                const image = item.product.images[0];
                const imageUrl = image?.image_url || '/placeholder.jpg';

                return (
                  <div key={item.cart_id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex gap-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.cart_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems([...selectedItems, item.cart_id]);
                          } else {
                            setSelectedItems(selectedItems.filter(id => id !== item.cart_id));
                          }
                        }}
                        className="mt-1"
                      />
                      <Link href={`/products/${item.product.product_id}`}>
                        <div className="relative w-24 h-24 bg-gray-100 rounded">
                          <Image
                            src={imageUrl}
                            alt={item.product.name}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                      </Link>
                      <div className="flex-1">
                        <Link href={`/products/${item.product.product_id}`}>
                          <h3 className="font-semibold text-gray-900 hover:text-primary-600">
                            {item.product.name}
                          </h3>
                        </Link>
                        <p className="text-sm text-gray-500">{item.size}</p>
                        <p className="text-lg font-semibold text-primary-600 mt-2">
                          {formatCurrency(item.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQuantityChange(item.cart_id, item.quantity - 1)}
                            className="w-8 h-8 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(item.cart_id, item.quantity + 1)}
                            className="w-8 h-8 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            +
                          </button>
                        </div>
                        <p className="font-semibold w-24 text-right">
                          {formatCurrency(item.total)}
                        </p>
                        <button
                          onClick={() => handleRemove(item.cart_id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-gray-50 rounded-lg p-6 h-fit sticky top-20">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">{formatCurrency(selectedTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-semibold">Free</span>
                </div>
              </div>
              <div className="border-t pt-4 mb-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedTotal)}</span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                disabled={selectedItems.length === 0}
                className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Checkout ({selectedItems.length} items)
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
