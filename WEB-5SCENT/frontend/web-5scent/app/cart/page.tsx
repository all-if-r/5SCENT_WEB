'use client';

import { useEffect, useState, useMemo } from 'react';
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
  size: string;
  isDeleteAll?: boolean;
}

interface GroupedProduct {
  productId: number;
  productName: string;
  category?: string;
  images: string[];
  sizes: string[];
  cartItems: any[]; // Original cart items for this product
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
    size: '',
    isDeleteAll: false,
  });

  useEffect(() => {
    // Only redirect if auth is done loading AND user is not authenticated
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Group products by product_id, maintaining size order
  const groupedProducts = useMemo(() => {
    const groups: { [key: number]: GroupedProduct } = {};

    items.forEach((item) => {
      const productId = item.product.product_id;

      if (!groups[productId]) {
        groups[productId] = {
          productId,
          productName: item.product.name,
          category: item.product.category,
          images: [],
          sizes: [],
          cartItems: [],
        };
      }

      groups[productId].cartItems.push(item);
      groups[productId].sizes.push(item.size);

      // Get image for this size
      const sizeImage = item.product.images.find(
        (img: any) => 
          (item.size === '30ml' && img.is_50ml === 0) ||
          (item.size === '50ml' && img.is_50ml === 1)
      );
      
      if (sizeImage) {
        groups[productId].images.push(sizeImage.image_url);
      } else if (item.product.images[0]) {
        groups[productId].images.push(item.product.images[0].image_url);
      }
    });

    return Object.values(groups);
  }, [items]);

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
        handleRemove(itemId, item.product.name, item.size);
      }
      return;
    }
    
    try {
      await updateQuantity(itemId, newQuantity);
    } catch (error: any) {
      showToast(error.message || 'Failed to update quantity', 'error');
    }
  };

  const handleRemove = async (itemId: number, itemName: string, size: string) => {
    setDeleteConfirm({ itemId, itemName, size });
  };

  const handleConfirmDelete = async (itemId: number) => {
    try {
      await removeFromCart(itemId);
      setSelectedItems(selectedItems.filter(id => id !== itemId));
      setDeleteConfirm({ itemId: null, itemName: '', size: '', isDeleteAll: false });
      showToast('Item removed from cart', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to remove item', 'error');
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ itemId: null, itemName: '', size: '', isDeleteAll: false });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedItems(items.map(item => item.cart_id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleDeleteAll = () => {
    setDeleteConfirm({
      itemId: -1,
      itemName: `${selectedItems.length} item(s)`,
      size: '',
      isDeleteAll: true,
    });
  };

  const handleConfirmDeleteAll = async () => {
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
      setDeleteConfirm({ itemId: null, itemName: '', size: '', isDeleteAll: false });
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

              {/* Merged Product Containers */}
              <div className="space-y-6">
                {groupedProducts.map((group) => (
                  <div
                    key={group.productId}
                    className="bg-white border border-gray-100 rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow"
                  >
                    {/* Product Header and Size Rows */}
                    <div className="flex flex-col md:flex-row gap-5">
                      {/* Product Images Container */}
                      <div className="flex gap-3 flex-shrink-0">
                        {group.images.map((image, idx) => (
                          <div key={idx} className="relative group">
                            <div className="relative w-28 h-32 bg-gray-100 rounded-xl overflow-hidden shadow-sm border border-gray-100">
                              <Image
                                src={image}
                                alt={`${group.productName} - ${group.sizes[idx]}`}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                unoptimized
                              />
                              {/* Size Badge */}
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs py-1 px-2 text-center font-semibold">
                                {group.sizes[idx]}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Product Info & Size Rows */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <Link href={`/products/${group.productId}`}>
                            <h3 className="text-xl font-semibold text-gray-900 hover:text-gray-700 transition-colors">
                              {group.productName}
                            </h3>
                          </Link>
                          {group.category && (
                            <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-black text-white">
                              {group.category}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          {group.sizes.length} size{group.sizes.length > 1 ? 's' : ''} in cart
                        </p>

                        {/* Size Rows */}
                        <div className="space-y-3 mt-3 w-full md:max-w-3xl">
                          {group.cartItems.map((item) => (
                            <div
                              key={item.cart_id}
                              className="flex items-center gap-4 px-4 py-3 bg-gray-50/70 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors shadow-sm"
                            >
                              {/* Checkbox */}
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
                                className="w-5 h-5 cursor-pointer flex-shrink-0 rounded-md border-2 border-gray-400 text-black accent-black focus:ring-0 focus:outline-none"
                              />

                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2 text-sm text-gray-900 font-semibold">
                                    <span>Size {item.size}</span>
                                    <span className="font-bold">{formatCurrency(item.price)}</span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Stock: {item.size === '30ml' 
                                      ? item.product.stock_30ml 
                                      : item.product.stock_50ml} units available
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Quantity Controls */}
                                <div className="flex items-center border border-gray-300 rounded-full overflow-hidden bg-white shadow-sm">
                                  <button
                                    onClick={() => handleQuantityChange(item.cart_id, item.quantity - 1)}
                                    className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-700"
                                  >
                                    −
                                  </button>
                                  <span className="w-10 text-center text-sm font-semibold text-gray-900">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => handleQuantityChange(item.cart_id, item.quantity + 1)}
                                    className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-700"
                                  >
                                    +
                                  </button>
                                </div>

                                {/* Delete Button */}
                                <button
                                  onClick={() => handleRemove(item.cart_id, group.productName, item.size)}
                                  className="text-black hover:text-gray-700 transition-colors flex-shrink-0"
                                  title="Delete this size"
                                >
                                  <TrashIcon className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="bg-gray-50 rounded-lg p-6 h-fit sticky top-20 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-300">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                {/* Total Items */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Items</span>
                  <span className="font-medium text-gray-900">{selectedItems.length}</span>
                </div>

                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">{formatCurrency(selectedTotal)}</span>
                </div>

                {/* Shipping */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium text-green-600">Free</span>
                </div>

                {/* Tax */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (5%)</span>
                  <span className="font-medium text-gray-900">{formatCurrency(selectedTotal * 0.05)}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t-2 border-gray-300 pt-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(selectedTotal * 1.05)}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleCheckout}
                  disabled={selectedItems.length === 0}
                  className="w-full px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Proceed to Checkout
                </button>
                <Link
                  href="/products"
                  className="block text-center px-6 py-3 border-2 border-black text-black rounded-lg font-semibold hover:bg-black hover:text-white transition-colors"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.itemId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
            onClick={handleCancelDelete}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="mb-4">
              <p className="text-sm uppercase tracking-wide text-gray-500">
                {deleteConfirm.isDeleteAll ? 'Remove Selected Items' : 'Remove Item'}
              </p>
              <h3 className="text-2xl font-header font-bold text-gray-900">
                {deleteConfirm.isDeleteAll ? 'Delete all selected items?' : 'Delete this item?'}
              </h3>
            </div>

            <div className="mb-6 space-y-2">
              {deleteConfirm.isDeleteAll ? (
                <>
                  <p className="text-gray-700">
                    You are about to remove{' '}
                    <span className="font-semibold">
                      {selectedItems.length} item{selectedItems.length !== 1 && 's'}
                    </span>{' '}
                    from your cart.
                  </p>
                  <p className="text-sm text-gray-500">
                    This action cannot be undone. Are you sure you want to continue?
                  </p>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-gray-900 font-semibold">{deleteConfirm.itemName}</p>
                    <p className="text-sm text-gray-500">Size: {deleteConfirm.size}</p>
                  </div>
                  <p className="text-gray-700">Remove this item from your cart?</p>
                </>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelDelete}
                className="px-5 py-2 border border-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.isDeleteAll) {
                    handleConfirmDeleteAll();
                  } else {
                    handleConfirmDelete(deleteConfirm.itemId!);
                  }
                }}
                className="px-5 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition-colors"
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
