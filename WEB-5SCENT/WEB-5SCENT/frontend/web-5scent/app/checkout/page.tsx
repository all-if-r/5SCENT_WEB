'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';

function CheckoutContent() {
  const { user } = useAuth();
  const { items, refreshCart } = useCart();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedItemIds = searchParams.get('items')?.split(',').map(Number) || [];

  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'QRIS'>('COD');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else {
      // Build address from user fields
      const addressParts = [
        user.address_line,
        user.district,
        user.city,
        user.province,
        user.postal_code
      ].filter(Boolean);
      setShippingAddress(addressParts.join(', ') || '');
    }
  }, [user, router]);

  if (!user) return null;

  const selectedItems = items.filter(item => selectedItemIds.includes(item.cart_id));
  const total = selectedItems.reduce((sum, item) => sum + item.total, 0);

  const handleCheckout = async () => {
    if (!shippingAddress.trim()) {
      showToast('Please enter shipping address', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/orders', {
        cart_ids: selectedItemIds,
        shipping_address: shippingAddress,
        payment_method: paymentMethod,
      });

      if (paymentMethod === 'QRIS') {
        // Create QRIS payment
        const paymentResponse = await api.post('/payments/qris', {
          order_id: response.data.order_id,
        });
        
        // Redirect to Midtrans payment page
        if (paymentResponse.data.redirect_url) {
          window.location.href = paymentResponse.data.redirect_url;
        } else if (paymentResponse.data.token) {
          // Use Midtrans Snap
          // @ts-ignore
          if (window.snap) {
            // @ts-ignore
            window.snap.pay(paymentResponse.data.token, {
              onSuccess: () => {
                showToast('Payment successful', 'success');
                refreshCart();
                router.push('/orders');
              },
              onPending: () => {
                showToast('Payment pending', 'info');
                router.push('/orders');
              },
              onError: () => {
                showToast('Payment failed', 'error');
              },
            });
          }
        }
      } else {
        showToast('Order placed successfully', 'success');
        refreshCart();
        router.push('/orders');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to place order', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-header font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
              <textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter your shipping address"
              />
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
              <div className="space-y-3">
                <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="payment"
                    value="COD"
                    checked={paymentMethod === 'COD'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'COD')}
                    className="mr-3"
                  />
                  <div>
                    <p className="font-medium">Cash on Delivery (COD)</p>
                    <p className="text-sm text-gray-500">Pay when you receive the order</p>
                  </div>
                </label>
                <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="payment"
                    value="QRIS"
                    checked={paymentMethod === 'QRIS'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'QRIS')}
                    className="mr-3"
                  />
                  <div>
                    <p className="font-medium">QRIS</p>
                    <p className="text-sm text-gray-500">Pay via QR code</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Order Items</h2>
              <div className="space-y-4">
                {selectedItems.map((item) => {
                  const image = item.product.images[0];
                  const imageUrl = image?.image_url || '/placeholder.jpg';

                  return (
                    <div key={item.cart_id} className="flex gap-4">
                      <div className="relative w-20 h-20 bg-gray-100 rounded">
                        <Image
                          src={imageUrl}
                          alt={item.product.name}
                          fill
                          className="object-cover rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{item.product.name}</h3>
                        <p className="text-sm text-gray-500">{item.size} × {item.quantity}</p>
                      </div>
                      <p className="font-semibold">{formatCurrency(item.total)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 h-fit sticky top-20">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold">Free</span>
              </div>
            </div>
            <div className="border-t pt-4 mb-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/cart"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-center hover:bg-gray-50 transition-colors"
              >
                Back
              </Link>
              <button
                onClick={handleCheckout}
                disabled={loading || selectedItems.length === 0}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
        <Footer />
      </main>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
