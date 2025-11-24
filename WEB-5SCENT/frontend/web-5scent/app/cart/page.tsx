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
import { TrashIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';

interface DeleteConfirmation {
  itemId: number | null;
  itemName: string;
}

export default function CartPage() {
  const { user, loading } = useAuth();
  const { items, total, updateQuantity, removeFromCart } = useCart();
  const { showToast } = useToast();
  const router = useRouter();
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmation>({
    itemId: null,
    itemName: '',
  });

  useEffect(() => {
    // Only redirect if auth is done loading AND user is not authenticated
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Auto-select all items when component mounts
    if (items.length > 0) {
      const allItemIds = items.map(item => item.cart_id);
      setSelectedItems(allItemIds);
      setSelectAll(true);
    }
  }, [items]);

  // Show loading state while auth is being verified
  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const handleQuantityChange = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    // If quantity becomes 0, remove the item
    if (newQuantity === 0) {
      const item = items.find(i => i.cart_id === itemId);
      if (item) {
        handleRemove(itemId, item.product.name);
      }
      return;
    }
    
    try {
      await updateQuantity(itemId, newQuantity);
    } catch (error: any) {
      showToast(error.message || 'Failed to update quantity', 'error');
    }
  };

  const handleRemove = async (itemId: number, itemName: string) => {
    setDeleteConfirm({ itemId, itemName });
  };

  const handleConfirmDelete = async (itemId: number) => {
    try {
      await removeFromCart(itemId);
      setSelectedItems(selectedItems.filter(id => id !== itemId));
      setDeleteConfirm({ itemId: null, itemName: '' });
      showToast('Item removed from cart', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to remove item', 'error');
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ itemId: null, itemName: '' });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedItems(items.map(item => item.cart_id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Remove ${selectedItems.length} item(s) from cart?`)) return;
    
    try {
      // Remove all selected items in parallel and update UI instantly
      await Promise.all(selectedItems.map(itemId => 
        removeFromCart(itemId).catch(error => {
          console.error(`Failed to remove item ${itemId}:`, error);
        })
      ));
      
      // Clear selections immediately
      setSelectedItems([]);
      setSelectAll(false);
      showToast('Items removed from cart', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to remove items', 'error');
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
          <div className="flex flex-col items-center justify-center py-24 px-4">
            {/* Cart Icon */}
            <div className="mb-6">
              <ShoppingBagIcon className="w-24 h-24 text-gray-300" />
            </div>
            
            {/* Empty Cart Text */}
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 text-lg mb-10">Add some fragrances to get started</p>
            
            {/* Continue Shopping Button */}
            <Link
              href="/products"
              className="px-8 py-3 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              {/* Select All and Delete All Controls */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">
                    Select all ({items.length} items)
                  </span>
                </div>
                {selectedItems.length > 0 && (
                  <button
                    onClick={handleDeleteAll}
                    className="px-6 py-2 border-2 border-black text-black rounded-full text-sm font-semibold hover:bg-black hover:text-white transition-colors"
                  >
                    Delete All ({selectedItems.length})
                  </button>
                )}
              </div>

              {/* Cart Items */}
              <div className="space-y-4">
                {items.map((item) => {
                  const image = item.product.images[0];
                  const imageUrl = image?.image_url || '/placeholder.jpg';

                  return (
                    <div key={item.cart_id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex gap-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.cart_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems([...selectedItems, item.cart_id]);
                            } else {
                              setSelectedItems(selectedItems.filter(id => id !== item.cart_id));
                              setSelectAll(false);
                            }
                          }}
                          className="w-5 h-5 mt-2 cursor-pointer"
                        />
                        <Link href={`/products/${item.product.product_id}`}>
                          <div className="relative w-32 h-32 bg-gray-100 rounded flex-shrink-0">
                            <Image
                              src={imageUrl}
                              alt={item.product.name}
                              fill
                              className="object-cover rounded"
                            />
                          </div>
                        </Link>
                        <div className="flex-1">
                          <div>
                            <Link href={`/products/${item.product.product_id}`}>
                              <h3 className="font-semibold text-gray-900 hover:text-primary-600 text-lg">
                                {item.product.name}
                              </h3>
                            </Link>
                            <p className="text-sm text-gray-500 mt-1">Size: {item.size}</p>
                            <p className="text-lg font-semibold text-gray-900 mt-2">
                              {formatCurrency(item.price)}
                            </p>
                          </div>
                          <div className="mt-4 flex flex-col gap-2">
                            <div className="flex items-center border border-gray-300 rounded-lg w-fit">
                              <button
                                onClick={() => handleQuantityChange(item.cart_id, item.quantity - 1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
                              >
                                −
                              </button>
                              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                              <button
                                onClick={() => handleQuantityChange(item.cart_id, item.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => handleRemove(item.cart_id, item.product.name)}
                              className="text-black hover:text-gray-700 transition-colors flex items-center gap-2 w-fit"
                            >
                              <TrashIcon className="w-5 h-5" />
                              <span className="text-sm">Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 h-fit sticky top-20">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-300">Order Summary</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Item</span>
                  <span className="font-medium text-gray-900">{selectedItems.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">{formatCurrency(selectedTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium text-green-600">Free</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (5%)</span>
                  <span className="font-medium text-gray-900">{formatCurrency(selectedTotal * 0.05)}</span>
                </div>
              </div>
              <div className="border-t-2 border-gray-300 pt-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(selectedTotal * 1.05)}</span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                disabled={selectedItems.length === 0}
                className="w-full px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
              >
                Checkout ({selectedItems.length})
              </button>
              <Link href="/products" className="block text-center text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.itemId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Remove Item</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove <span className="font-semibold">{deleteConfirm.itemName}</span> from your cart?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelDelete}
                className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmDelete(deleteConfirm.itemId!)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
