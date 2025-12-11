'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useToast } from '@/contexts/ToastContext';
import { FiHome, FiPackage, FiDownload, FiCheck } from 'react-icons/fi';
import {
  formatOrderCode,
  formatCurrency,
  formatCountdown,
  getTimeRemaining,
  isPaymentExpired,
} from '@/app/utils/orderHelpers';

interface QrisPaymentClientProps {
  order: {
    order_id: number;
    customer_name: string;
    total_items: number;
    total_price: number;
    created_at: string;
    payment_method: string;
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

/**
 * QRIS Payment Client Component
 * 
 * Handles:
 * - Real-time countdown timer (updates every 1 second)
 * - Payment status polling (checks every 5 seconds)
 * - QR code display and download
 * - Order summary display
 * - Success/expired state management
 * 
 * ============================================
 * IMPORTANT SETUP INSTRUCTIONS:
 * 
 * 1. NGROK TUNNEL (for webhook testing):
 *    Command: & "E:\ngrok\ngrok.exe" http 8000
 *    This creates a public URL like https://xxxx-xxx.ngrok-free.dev
 * 
 * 2. MIDTRANS WEBHOOK URL:
 *    Set in Midtrans Dashboard: https://dashboard.sandbox.midtrans.com/settings/payment/notification
 *    Use the ngrok URL: https://xxxx-xxx.ngrok-free.dev/api/midtrans/notification
 * 
 * 3. POLLING:
 *    Frontend polls every 5 seconds to /api/orders/{orderId}/payment-status
 *    This detects when backend receives webhook update
 * ============================================
 */

export default function QrisPaymentClient({
  order,
  payment,
  qris,
}: QrisPaymentClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState(
    getTimeRemaining(qris.expired_at)
  );
  const [isExpired, setIsExpired] = useState(false);
  const [isPaymentSuccessful, setIsPaymentSuccessful] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Countdown Logic:
   * - Updates every 1 second
   * - Calculates remaining time from qris.expired_at
   * - Sets isExpired = true when countdown reaches 0
   */
  useEffect(() => {
    countdownIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = Math.max(0, prev - 1000);
        if (newTime === 0) {
          setIsExpired(true);
        }
        return newTime;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  /**
   * Polling Logic:
   * - Checks payment status every 5 seconds
   * - Calls GET /api/orders/{orderId}/payment-status
   * - Detects when qris_status === 'settlement' (payment successful)
   * - Stops polling on success or expiry
   * - This is how webhook updates are detected
   */
  useEffect(() => {
    const pollPaymentStatus = async () => {
      try {
        const response = await axios.get(
          `/api/orders/${order.order_id}/payment-status`
        );

        if (response.data?.qris_status === 'settlement') {
          setIsPaymentSuccessful(true);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          // Auto redirect after 2 seconds
          setTimeout(() => {
            router.push(`/orders/${order.order_id}`);
          }, 2000);
        }
      } catch (error) {
        // Silently handle errors - don't spam toast notifications
        console.error('Polling error:', error);
      }
    };

    // Start polling immediately
    pollingIntervalRef.current = setInterval(pollPaymentStatus, 5000);
    // Also call once on mount
    pollPaymentStatus();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [order.order_id, router]);

  const handleDownloadQR = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(qris.qr_url, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(
        new Blob([response.data])
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `qris-${order.order_id}-${Date.now()}.png`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('QR code downloaded successfully', 'success');
    } catch (error) {
      showToast('Failed to download QR code', 'error');
      console.error('Download error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToHomepage = () => {
    router.push('/');
  };

  const handleViewOrders = () => {
    router.push('/orders');
  };

  // Get countdown color based on time remaining
  const getCountdownColor = () => {
    if (isExpired) return 'text-red-600';
    if (timeRemaining < 60000) return 'text-orange-600'; // Less than 1 minute
    return 'text-gray-600';
  };

  const countdown = formatCountdown(timeRemaining);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">5SCENT</h1>
            <div className="flex gap-8">
              <a href="/" className="text-gray-600 hover:text-gray-900">
                Home
              </a>
              <a href="/products" className="text-gray-600 hover:text-gray-900">
                Products
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Success State Overlay */}
          {isPaymentSuccessful && (
            <div className="fixed inset-0 bg-white bg-opacity-95 flex items-center justify-center z-50">
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
                      <FiCheck className="w-12 h-12 text-green-600" />
                    </div>
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Payment Successful!
                </h2>
                <p className="text-gray-600 mb-8">
                  Your order is now being packaged and will be shipped soon.
                </p>
                <div className="text-sm text-gray-500">
                  Redirecting to orders page...
                </div>
              </div>
            </div>
          )}

          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <FiCheck className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Order Confirmed!
            </h1>
            <p className="text-gray-600">
              Please complete your payment using the QR code below
            </p>
          </div>

          {/* QR Code Card */}
          <div className="bg-gray-50 rounded-2xl p-8 mb-6 border border-gray-200">
            {/* QR Code */}
            {!isExpired ? (
              <div className="flex justify-center mb-6">
                <div className="relative bg-white p-4 rounded-lg border border-gray-200">
                  <Image
                    src={qris.qr_url}
                    alt="QRIS QR Code"
                    width={256}
                    height={256}
                    priority
                    className="object-contain"
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-center mb-6 relative">
                <div className="relative bg-white p-4 rounded-lg border border-gray-200 opacity-50">
                  <Image
                    src={qris.qr_url}
                    alt="QRIS QR Code"
                    width={256}
                    height={256}
                    priority
                    className="object-contain"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold">
                    Payment Expired
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <p className="text-center text-sm text-gray-600 mb-4">
              Scan with any QRIS-enabled app
            </p>

            {/* Countdown */}
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600 mb-2">Payment expires in</p>
              <p className={`text-4xl font-bold ${getCountdownColor()}`}>
                {countdown}
              </p>
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownloadQR}
              disabled={isExpired || isLoading}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors mb-4 ${
                isExpired
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <FiDownload className="w-5 h-5" />
              {isLoading ? 'Downloading...' : 'Download QR Code'}
            </button>
          </div>

          {/* Order Summary Card */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Code</span>
                <span className="font-semibold text-gray-900">
                  {formatOrderCode(order.order_id, order.created_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Customer Name</span>
                <span className="font-semibold text-gray-900">
                  {order.customer_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Items</span>
                <span className="font-semibold text-gray-900">
                  {order.total_items} item(s)
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="font-semibold text-gray-900">Total Amount</span>
                <span className="font-bold text-lg text-gray-900">
                  {formatCurrency(order.total_price)}
                </span>
              </div>
            </div>
          </div>

          {/* How to Pay Instructions */}
          <div className="bg-blue-50 rounded-2xl p-6 mb-8 border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-4">How to Pay:</h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li>1. Open any QRIS-enabled app (GoPay, OVO, Dana, etc.)</li>
              <li>2. Select "Scan QR" or "QRIS" option</li>
              <li>3. Scan the QR code above</li>
              <li>4. Confirm and complete the payment</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleBackToHomepage}
              className="flex-1 px-4 py-3 border border-black text-black rounded-full font-semibold hover:bg-gray-50 transition-colors"
            >
              Back to Homepage
            </button>
            <button
              onClick={handleViewOrders}
              className="flex-1 px-4 py-3 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition-colors"
            >
              View My Orders
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-4 gap-8 mb-8">
            {/* Brand Section */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4">5SCENT</h3>
              <p className="text-sm text-gray-600">
                Premium fragrance and beauty products
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/" className="text-gray-600 hover:text-gray-900">
                    About
                  </a>
                </li>
                <li>
                  <a href="/" className="text-gray-600 hover:text-gray-900">
                    Products
                  </a>
                </li>
                <li>
                  <a href="/" className="text-gray-600 hover:text-gray-900">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Customer Service */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">
                Customer Service
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/" className="text-gray-600 hover:text-gray-900">
                    Shipping
                  </a>
                </li>
                <li>
                  <a href="/" className="text-gray-600 hover:text-gray-900">
                    Returns
                  </a>
                </li>
                <li>
                  <a href="/" className="text-gray-600 hover:text-gray-900">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Contact</h4>
              <p className="text-sm text-gray-600 mb-2">+1 555-123-4567</p>
              <p className="text-sm text-gray-600">info@5scent.com</p>
              <p className="text-sm text-gray-600 mt-2">
                123 Beauty Street, Fashion City, FC 12345
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <p className="text-sm text-gray-600 text-center">
              © 2024 5SCENT. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
