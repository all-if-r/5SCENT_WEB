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
import { ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';

// Extend window type for Midtrans Snap
declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: any) => void;
    };
  }
}

interface FormData {
  fullName: string;
  phoneNumber: string;
  addressLine: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
}

interface FormErrors {
  fullName?: string;
  phoneNumber?: string;
  addressLine?: string;
  district?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  paymentMethod?: string;
}

interface BuyNowCheckoutData {
  mode: string;
  product_id: number;
  product_name: string;
  size: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

function CheckoutContent() {
  const { user } = useAuth();
  const { items, refreshCart } = useCart();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Determine checkout mode from URL
  const checkoutMode = searchParams.get('mode') || 'cart';
  const selectedItemIds = searchParams.get('items')?.split(',').map(Number) || [];

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    phoneNumber: '',
    addressLine: '',
    district: '',
    city: '',
    province: '',
    postalCode: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [paymentMethod, setPaymentMethod] = useState<'QRIS' | 'Virtual_Account' | 'Cash'>('QRIS');
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [buyNowData, setBuyNowData] = useState<BuyNowCheckoutData | null>(null);
  const [loadingCheckoutData, setLoadingCheckoutData] = useState(checkoutMode === 'buy-now');

  // Fetch buy-now checkout data if in buy-now mode
  useEffect(() => {
    if (checkoutMode === 'buy-now') {
      fetchBuyNowData();
    }
  }, [checkoutMode]);

  const fetchBuyNowData = async () => {
    try {
      const response = await api.get('/buy-now/session');
      const sessionData = response.data?.data;
      
      if (!sessionData) {
        showToast('No Buy Now session found. Redirecting...', 'warning');
        setTimeout(() => router.push('/products'), 1500);
        return;
      }
      
      setBuyNowData(sessionData);
    } catch (error) {
      console.error('Error fetching buy-now session:', error);
      showToast('Failed to load checkout data. Please try again.', 'error');
      setTimeout(() => router.push('/products'), 1500);
    } finally {
      setLoadingCheckoutData(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleUseMyData = async () => {
    if (user) {
      setFormData({
        fullName: user.name || '',
        phoneNumber: user.phone?.replace('+62', '') || '',
        addressLine: user.address_line || '',
        district: user.district || '',
        city: user.city || '',
        province: user.province || '',
        postalCode: user.postal_code || '',
      });
      setDataLoaded(true);
      showToast('Data loaded successfully', 'success');
    }
  };

  const handleClearData = () => {
    setFormData({
      fullName: '',
      phoneNumber: '',
      addressLine: '',
      district: '',
      city: '',
      province: '',
      postalCode: '',
    });
    setDataLoaded(false);
    setErrors({});
    showToast('Data cleared', 'info');
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Please fill in your full name';
    }
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Please enter a phone number';
    } else if (!/^\d+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number (digits only)';
    } else if (formData.phoneNumber.length < 8 || formData.phoneNumber.length > 15) {
      newErrors.phoneNumber = 'Phone number must be between 8 and 15 digits';
    }
    if (!formData.addressLine.trim()) {
      newErrors.addressLine = 'Please enter your address';
    }
    if (!formData.district.trim()) {
      newErrors.district = 'Please enter your district';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'Please enter your city';
    }
    if (!formData.province.trim()) {
      newErrors.province = 'Please enter your province';
    }
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Please enter your postal code';
    } else if (!/^\d{5}$/.test(formData.postalCode)) {
      newErrors.postalCode = 'Postal code must be exactly 5 digits';
    }

    // Payment method validation
    if (!paymentMethod) {
      newErrors.paymentMethod = 'Please select a payment method';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCheckout = async () => {
    if (!validateForm()) {
      showToast('Please fix the highlighted fields before continuing', 'error');
      return;
    }

    setLoading(true);
    try {
      // Build request body based on checkout mode
      const requestBody: any = {
        checkout_mode: checkoutMode,
        phone_number: formData.phoneNumber,
        address_line: formData.addressLine,
        district: formData.district,
        city: formData.city,
        province: formData.province,
        postal_code: formData.postalCode,
        payment_method: paymentMethod,
      };

      if (checkoutMode === 'cart') {
        requestBody.cart_ids = selectedItemIds.length > 0 ? selectedItemIds : items.map(item => item.cart_id);
      } else if (checkoutMode === 'buy-now' && buyNowData) {
        requestBody.product_id = buyNowData.product_id;
        requestBody.size = buyNowData.size;
        requestBody.quantity = buyNowData.quantity;
      }

      const response = await api.post('/orders', requestBody);

      // Helper function to handle post-checkout actions
      const handlePostCheckout = async () => {
        // Clear buy-now session if applicable
        if (checkoutMode === 'buy-now') {
          try {
            await api.post('/buy-now/clear');
          } catch (error) {
            console.error('Failed to clear buy-now session:', error);
          }
        }
        refreshCart();
        // Add small delay to ensure data is ready before navigating
        setTimeout(() => {
          router.push('/orders');
        }, 500);
      };

      if (paymentMethod === 'QRIS') {
        // Create QRIS payment
        const paymentResponse = await api.post('/payments/qris', {
          order_id: response.data.order_id,
        });

        // Check if QRIS payment was created successfully
        if (paymentResponse.data.success && (paymentResponse.data.qr_url || paymentResponse.data.qris?.qr_url)) {
          // Navigate to QRIS payment page
          showToast('QRIS payment created successfully', 'success');
          router.push(`/orders/${response.data.order_id}/qris`);
        } else if (paymentResponse.data.redirect_url) {
          // Fallback for redirect URL
          window.location.href = paymentResponse.data.redirect_url;
        } else if (paymentResponse.data.token) {
          // Check if it's a mock token (for development without Midtrans credentials)
          if (paymentResponse.data.token.startsWith('mock-')) {
            // Mock mode - just complete the order
            showToast('Order placed successfully (Mock Payment)', 'success');
            await handlePostCheckout();
          } else if (window.snap) {
            // Use Midtrans Snap
            window.snap.pay(paymentResponse.data.token, {
              onSuccess: async () => {
                showToast('Payment successful', 'success');
                await handlePostCheckout();
              },
              onPending: async () => {
                showToast('Payment pending', 'info');
                await handlePostCheckout();
              },
              onError: () => {
                showToast('Payment failed', 'error');
              },
            });
          } else {
            // Midtrans Snap not loaded, but we have a token
            showToast('Payment gateway not available. Order placed.', 'info');
            await handlePostCheckout();
          }
        } else {
          showToast('Unable to process payment', 'error');
        }
      } else {
        showToast('Order placed successfully', 'success');
        await handlePostCheckout();
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to place order', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  // Calculate selected items based on checkout mode
  const itemsList = checkoutMode === 'buy-now'
    ? buyNowData
      ? [
          {
            cart_id: `buy-now-${buyNowData.product_id}`,
            product_id: buyNowData.product_id,
            name: buyNowData.product_name,
            size: buyNowData.size,
            quantity: buyNowData.quantity,
            price: buyNowData.unit_price,
            image: buyNowData.image || '/images/placeholder.jpg',
            total: buyNowData.subtotal,
          },
        ]
      : []
    : items.filter(item => selectedItemIds.length === 0 || selectedItemIds.includes(item.cart_id));

  const selectedItems = itemsList;
  const subtotal = selectedItems.reduce((sum, item) => sum + (item.total || item.price * item.quantity), 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  return (
    <main className="min-h-screen bg-white">
      <Navigation />
      
      {/* Loading state for buy-now checkout data */}
      {checkoutMode === 'buy-now' && loadingCheckoutData && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4"></div>
            <p className="text-gray-600">Loading checkout details...</p>
          </div>
        </div>
      )}

      {/* Main content - hide while loading buy-now data */}
      {!(checkoutMode === 'buy-now' && loadingCheckoutData) && (
      <div className="container mx-auto px-4 py-8">
        {/* Back Navigation - Hide for buy-now mode */}
        {checkoutMode === 'cart' && (
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-medium transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Cart
          </Link>
        )}

        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-header font-bold text-gray-900 mb-3">Checkout</h1>
          <div className="w-20 h-1.5 bg-black rounded-full"></div>
        </div>

        {/* Error Banner */}
        {Object.keys(errors).length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">Please fix the highlighted fields before continuing.</p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {/* Left Column - Customer Information & Payment */}
          <div className="md:col-span-2 space-y-6">
            {/* Customer Information Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              {/* Section Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Customer Information</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUseMyData}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <span>👤</span>
                    Use My Data
                  </button>
                  {dataLoaded && (
                    <button
                      onClick={handleClearData}
                      className="px-4 py-2 bg-red-600 text-white rounded-full text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
                      title="Clear all filled data"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      Clear Data
                    </button>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => {
                      setFormData({ ...formData, fullName: e.target.value });
                      if (errors.fullName) {
                        setErrors({ ...errors, fullName: undefined });
                      }
                    }}
                    placeholder="Enter your full name"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
                      errors.fullName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.fullName && (
                    <p className="text-red-600 text-sm mt-1">{errors.fullName}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Phone Number
                  </label>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-24">
                      <input
                        type="text"
                        value="+62"
                        disabled
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 font-medium text-center"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => {
                          setFormData({ ...formData, phoneNumber: e.target.value });
                          if (errors.phoneNumber) {
                            setErrors({ ...errors, phoneNumber: undefined });
                          }
                        }}
                        placeholder="851234567890"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
                          errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>
                  </div>
                  {errors.phoneNumber && (
                    <p className="text-red-600 text-sm mt-1">{errors.phoneNumber}</p>
                  )}
                </div>

                {/* Address Line */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Address Line
                  </label>
                  <input
                    type="text"
                    value={formData.addressLine}
                    onChange={(e) => {
                      setFormData({ ...formData, addressLine: e.target.value });
                      if (errors.addressLine) {
                        setErrors({ ...errors, addressLine: undefined });
                      }
                    }}
                    placeholder="Enter your complete shipping address"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
                      errors.addressLine ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.addressLine && (
                    <p className="text-red-600 text-sm mt-1">{errors.addressLine}</p>
                  )}
                </div>

                {/* District and City Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      District
                    </label>
                    <input
                      type="text"
                      value={formData.district}
                      onChange={(e) => {
                        setFormData({ ...formData, district: e.target.value });
                        if (errors.district) {
                          setErrors({ ...errors, district: undefined });
                        }
                      }}
                      placeholder="Enter your district"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
                        errors.district ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.district && (
                      <p className="text-red-600 text-sm mt-1">{errors.district}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => {
                        setFormData({ ...formData, city: e.target.value });
                        if (errors.city) {
                          setErrors({ ...errors, city: undefined });
                        }
                      }}
                      placeholder="Enter your city"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
                        errors.city ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.city && (
                      <p className="text-red-600 text-sm mt-1">{errors.city}</p>
                    )}
                  </div>
                </div>

                {/* Province and Postal Code Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Province
                    </label>
                    <input
                      type="text"
                      value={formData.province}
                      onChange={(e) => {
                        setFormData({ ...formData, province: e.target.value });
                        if (errors.province) {
                          setErrors({ ...errors, province: undefined });
                        }
                      }}
                      placeholder="Enter your province"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
                        errors.province ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.province && (
                      <p className="text-red-600 text-sm mt-1">{errors.province}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => {
                        setFormData({ ...formData, postalCode: e.target.value });
                        if (errors.postalCode) {
                          setErrors({ ...errors, postalCode: undefined });
                        }
                      }}
                      placeholder="Enter postal code"
                      maxLength={5}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
                        errors.postalCode ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.postalCode && (
                      <p className="text-red-600 text-sm mt-1">{errors.postalCode}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-200">
                Payment Method
              </h2>
              <div className="space-y-3">
                {/* QRIS Option */}
                <button
                  onClick={() => {
                    setPaymentMethod('QRIS');
                    if (errors.paymentMethod) {
                      setErrors({ ...errors, paymentMethod: undefined });
                    }
                  }}
                  className={`w-full px-6 py-4 rounded-lg border-2 transition-all flex items-center gap-4 ${
                    paymentMethod === 'QRIS'
                      ? 'border-black bg-white'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  {/* Icon and Text Container */}
                  <div className="flex-1 flex items-center gap-4">
                    {/* Icon - Black rounded square background with white icon */}
                    <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    </div>

                    {/* Text Content */}
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">QRIS (Midtrans)</p>
                      <p className="text-sm text-gray-600">Scan QR code to complete payment</p>
                    </div>
                  </div>
                </button>

                {/* Virtual Account Option */}
                <button
                  onClick={() => {
                    setPaymentMethod('Virtual_Account');
                    if (errors.paymentMethod) {
                      setErrors({ ...errors, paymentMethod: undefined });
                    }
                  }}
                  className={`w-full px-6 py-4 rounded-lg border-2 transition-all flex items-center gap-4 ${
                    paymentMethod === 'Virtual_Account'
                      ? 'border-black bg-white'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="flex-1 flex items-center gap-4">
                    <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                    </div>

                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Virtual Account</p>
                      <p className="text-sm text-gray-600">Transfer to bank virtual account</p>
                    </div>
                  </div>
                </button>

                {/* Cash on Delivery Option */}
                <button
                  onClick={() => {
                    setPaymentMethod('Cash');
                    if (errors.paymentMethod) {
                      setErrors({ ...errors, paymentMethod: undefined });
                    }
                  }}
                  className={`w-full px-6 py-4 rounded-lg border-2 transition-all flex items-center gap-4 ${
                    paymentMethod === 'Cash'
                      ? 'border-black bg-white'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="flex-1 flex items-center gap-4">
                    <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                      </svg>
                    </div>

                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Cash on Delivery</p>
                      <p className="text-sm text-gray-600">Pay when package arrives</p>
                    </div>
                  </div>
                </button>

                {errors.paymentMethod && (
                  <p className="text-red-600 text-sm mt-2">{errors.paymentMethod}</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="bg-gray-50 rounded-lg p-6 h-fit sticky top-20 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-200">
              Order Summary
            </h2>

            {/* Product List */}
            <div className="space-y-4 mb-6">
              {selectedItems.map((item) => {
                // Handle buy-now items (have image field directly)
                const imageUrl = 'image' in item 
                  ? (item.image || '/images/placeholder.jpg')
                  : (() => {
                      const image = item.product?.images?.find((img: any) => 
                        (item.size === '30ml' && img.is_50ml === 0) ||
                        (item.size === '50ml' && img.is_50ml === 1)
                      ) || item.product?.images?.[0];
                      return image?.image_url || '/placeholder.jpg';
                    })();

                const itemName = 'name' in item ? item.name : item.product?.name || 'Product';
                const itemSize = item.size;
                const itemQty = item.quantity;
                const itemPrice = 'total' in item ? item.total : (item.price * item.quantity);

                return (
                  <div key={'product_id' in item ? `buy-now-${item.product_id}` : item.cart_id} className="flex gap-3 pb-4 border-b border-gray-200">
                    <div className="relative w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={imageUrl}
                        alt={itemName}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{itemName}</p>
                      <p className="text-sm text-gray-600">{itemSize} × {itemQty}</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(itemPrice)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium text-gray-900">Free</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (5%)</span>
                <span className="font-medium text-gray-900">{formatCurrency(tax)}</span>
              </div>
            </div>

            {/* Total */}
            <div className="mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-900 font-medium">Total</span>
                <span className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Confirm Payment Button */}
            <button
              onClick={handleCheckout}
              disabled={loading || selectedItems.length === 0}
              className="w-full px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {loading ? 'Processing...' : 'Confirm Payment'}
            </button>

            {/* Terms Text */}
            <p className="text-xs text-gray-600 text-center">
              By placing this order, you agree to our terms and conditions.
            </p>
          </div>
        </div>
      </div>
      )}
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
