'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BiHomeAlt } from 'react-icons/bi';
import { FiPackage, FiDownload, FiCheck } from 'react-icons/fi';
import api from '@/lib/api';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useNotification } from '@/contexts/NotificationContext';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

interface QrisData {
  order: {
    order_id: number;
    customer_name: string;
    total_items: number;
    total_price: number;
    user_id?: number;
    created_at: string;
  };
  payment: {
    amount: number;
    status: string;
  };
  qris: {
    qr_url: string;
    status: string;
    expired_at: string;
  };
}

export default function QrisPage({ params }: PageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { fetchNotifications } = useNotification();
  const [data, setData] = useState<QrisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('1:00');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // Unwrap params promise
  useEffect(() => {
    params.then((p) => setOrderId(p.orderId));
  }, [params]);

  // Fetch QRIS data - check expiry based on expired_at timestamp
  useEffect(() => {
    if (!orderId) return;
    
    // Don't re-fetch if data is already loaded (prevents timer reset)
    if (data) return;

    const fetchData = async () => {
      try {
        // Fetch existing QRIS payment
        const response = await api.get(`/orders/${orderId}/qris-detail`);
        
        if (response.data?.success && response.data?.qris) {
          const qris = response.data.qris;
          
          // Check effective status - if expired, do not re-generate
          if (qris.effective_status === 'expire' || qris.status === 'expire') {
            // QRIS has expired - show expired UI, do NOT create new payment
            setData(response.data);
            showToast('Payment has expired. Please go back and create a new order.', 'error');
            fetchNotifications();
            setLoading(false);
            return;
          }

          // QRIS is still valid or pending - reuse it
          setData(response.data);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Failed to fetch QRIS details:', error);
        // If fetch fails, try to create fresh QRIS
      }

      // Only create fresh QRIS if no existing one found
      try {
        const paymentResponse = await api.post(`/payments/qris`, {
          order_id: orderId,
        });

        if (paymentResponse.data?.success) {
          // Fetch the new QRIS details
          const detailResponse = await api.get(`/orders/${orderId}/qris-detail`);
          if (detailResponse.data?.success) {
            setData(detailResponse.data);
            setLoading(false);
            return;
          }
        }
      } catch (paymentError) {
        console.error('Failed to create fresh QRIS payment:', paymentError);
        setLoading(false);
      }
    };

    fetchData();
  }, [orderId, data]);

  // Countdown timer
  useEffect(() => {
    if (!data?.qris?.expired_at) return;

    // Calculate initial countdown immediately
    const calculateCountdown = () => {
      const expiryTime = new Date(data.qris.expired_at).getTime();
      const now = new Date().getTime();
      const difference = expiryTime - now;

      // Debug: Print actual time remaining in milliseconds
      console.log('QRIS Initial Actual Time Remaining:', difference, 'ms');
      console.log('Expired At:', data.qris.expired_at);
      console.log('Current Time:', new Date().toISOString());

      if (difference <= 0) {
        setCountdown('0:00');
        setIsExpired(true);
        // Mark payment as expired on backend
        api.post(`/orders/${orderId}/qris-expired`).catch(error => {
          console.error('Error marking QRIS as expired:', error);
        });
        // Refresh notifications when payment expires
        fetchNotifications();
        return true; // Timer expired
      }

      setIsExpired(false);
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      return false;
    };

    // Set initial countdown immediately
    const expired = calculateCountdown();
    if (expired) return;

    // Update countdown every second
    const interval = setInterval(() => {
      const expiryTime = new Date(data.qris.expired_at).getTime();
      const now = new Date().getTime();
      const difference = expiryTime - now;

      // Debug: Print actual time remaining in milliseconds
      console.log('QRIS Actual Time Remaining:', difference, 'ms');
      console.log('Expired At:', data.qris.expired_at);
      console.log('Current Time:', new Date().toISOString());

      if (difference <= 0) {
        setCountdown('0:00');
        setIsExpired(true);
        clearInterval(interval);
        // Mark payment as expired on backend
        api.post(`/orders/${orderId}/qris-expired`).catch(error => {
          console.error('Error marking QRIS as expired:', error);
        });
        return;
      }

      setIsExpired(false);
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [data?.qris?.expired_at]);

  // Poll for payment status
  useEffect(() => {
    if (!orderId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await api.get(`/orders/${orderId}/payment-status`);

        if (response.data?.payment_status === 'Success' || response.data?.qris_status === 'settlement') {
          setPaymentSuccess(true);
          clearInterval(pollInterval);
          showToast('Payment successful! Your order is being prepared.', 'success');
          // Refresh notifications to show the new payment notification
          fetchNotifications();
        }
      } catch (error) {
        // Silently fail on polling errors
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [orderId, showToast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  const handleDownloadQR = async () => {
    if (!data || !orderId) return;
    try {
      // Use backend proxy endpoint to avoid CORS issues with Midtrans
      const response = await api.get(`/orders/${orderId}/qris-download`, {
        responseType: 'blob',
      });
      
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const userId = data.order.user_id || user?.user_id || 'unknown';
      a.download = `QRIS-${userId}-Order-${data.order.order_id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download QR code via backend proxy:', error);
    }
  };

  if (paymentSuccess && data) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />

        <div className="py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
              <p className="text-gray-600">Your payment has been received and confirmed.</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8 text-center">
              <p className="text-emerald-900 font-medium">
                {(() => {
                  const day = String(new Date(data.order.created_at).getDate()).padStart(2, '0');
                  const month = String(new Date(data.order.created_at).getMonth() + 1).padStart(2, '0');
                  const year = new Date(data.order.created_at).getFullYear();
                  const id = String(data.order.order_id).padStart(3, '0');
                  return `#ORD-${day}-${month}-${year}-${id} will be processed shortly.`;
                })()}
              </p>
            </div>

            <div className="flex gap-3 justify-center flex-wrap mb-8">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-300 rounded-full font-medium text-gray-800 hover:bg-gray-50 transition text-sm"
              >
                <BiHomeAlt className="w-4 h-4" />
                Back to Homepage
              </button>
              <button
                onClick={() => router.push('/orders')}
                className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-full font-medium hover:bg-gray-900 transition text-sm"
              >
                <FiPackage className="w-4 h-4" />
                View My Orders
              </button>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="py-8 px-4 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Unable to load payment details. Please try again.</p>
            <button
              onClick={() => router.push('/orders')}
              className="px-6 py-2 bg-black text-white rounded-full font-medium"
            >
              Back to Orders
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Check if payment is expired
  const expiredAt = new Date(data.qris.expired_at).getTime();
  const now = new Date().getTime();
  const isPaymentExpired = expiredAt <= now || data.qris.status === 'expired';

  if (isPaymentExpired) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="py-12 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Expired</h1>
            <p className="text-gray-600 mb-8">Your payment request has expired. The order has been cancelled.</p>
            
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
              <p className="text-red-900 font-medium">
                {(() => {
                  const day = String(new Date(data.order.created_at).getDate()).padStart(2, '0');
                  const month = String(new Date(data.order.created_at).getMonth() + 1).padStart(2, '0');
                  const year = new Date(data.order.created_at).getFullYear();
                  const id = String(data.order.order_id).padStart(3, '0');
                  return `Order #ORD-${day}-${month}-${year}-${id} has been cancelled.`;
                })()}
              </p>
            </div>

            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => router.push('/orders')}
                className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-300 rounded-full font-medium text-gray-800 hover:bg-gray-50 transition"
              >
                <FiPackage className="w-4 h-4" />
                Back to Orders
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-full font-medium hover:bg-gray-900 transition"
              >
                <BiHomeAlt className="w-4 h-4" />
                Back to Homepage
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCheck className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
            <p className="text-gray-600 text-sm">Please complete your payment using the QR code below</p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
            {/* QR Code Section */}
            <div className="text-center mb-8">
              <div className={`inline-block bg-white p-6 rounded-lg border ${isExpired ? 'border-red-300' : 'border-gray-200'} mb-4`}>
                <img
                  src={data.qris.qr_url}
                  alt="QRIS Payment QR Code"
                  width={240}
                  height={240}
                  className={`rounded-lg ${isExpired ? 'blur-md' : ''}`}
                />
              </div>
              <p className="text-gray-600 text-xs md:text-sm mb-3">Scan this QR code with any QRIS-enabled payment app</p>
              <div className={`flex items-center justify-center gap-2 ${isExpired ? 'text-red-600' : 'text-emerald-600'} text-xs`}>
                {isExpired ? (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                    </svg>
                    Payment Expired
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    Payment expires in {countdown}
                  </>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h3 className="text-base font-semibold text-gray-900 mb-6">Order Summary</h3>

              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Customer Name</span>
                  <span className="font-medium text-gray-900">{data.order.customer_name}</span>
                </div>

                <div className="border-t border-gray-200"></div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Items</span>
                  <span className="font-medium text-gray-900">{data.order.total_items} item(s)</span>
                </div>

                <div className="border-t border-gray-200"></div>

                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Total Amount</span>
                  <span className="font-bold text-lg text-gray-900">
                    Rp{data.order.total_price.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            {/* Download Button */}
            <div className="text-center mb-8">
              <button
                onClick={handleDownloadQR}
                className="flex items-center justify-center gap-2 mx-auto px-6 py-2.5 bg-white border border-gray-300 rounded-full text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                <FiDownload className="w-4 h-4" />
                Download QR Code
              </button>
            </div>

            {/* How to Pay */}
            <div className="bg-blue-50 rounded-xl p-6">
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">How to Pay:</h4>
              <ul className="space-y-2 text-xs md:text-sm text-gray-700">
                <li>• Open any QRIS-enabled payment app (GoPay, OVO, Dana, etc.)</li>
                <li>• Select "Scan QR" or "QRIS"</li>
                <li>• Scan the QR code above or upload the downloaded image</li>
                <li>• Confirm the payment amount and complete the transaction</li>
              </ul>
            </div>
          </div>

          {/* Bottom Buttons */}
          <div className="flex gap-3 justify-center flex-wrap mb-8">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-300 rounded-full font-medium text-gray-800 hover:bg-gray-50 transition text-sm"
            >
              <BiHomeAlt className="w-4 h-4" />
              Back to Homepage
            </button>
            <button
              onClick={() => router.push('/orders')}
              className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-full font-medium hover:bg-gray-900 transition text-sm"
            >
              <FiPackage className="w-4 h-4" />
              View My Orders
            </button>
          </div>

          {/* Footer Note */}
          <div className="text-center text-xs text-gray-600 px-4">
            <p className="mb-1">Your order will be processed once payment is confirmed.</p>
            <p>
              Need help? Contact our support team at{' '}
              <a href="mailto:support@5scent.com" className="text-blue-600 hover:underline">
                support@5scent.com
              </a>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
