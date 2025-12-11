'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiHome, FiPackage, FiDownload, FiCheck } from 'react-icons/fi';
import {
  formatOrderCode,
  formatCurrency,
  formatCountdown,
  getTimeRemaining,
  isPaymentExpired,
} from '@/app/utils/orderHelpers';

/**
 * QRIS Payment Detail Client Component
 * 
 * ============================================
 * IMPORTANT NGROK SETUP REMINDER
 * ============================================
 * To test this page locally, you MUST run ngrok to expose Laravel to the internet.
 * 
 * Command to run ngrok:
 *   & "E:\ngrok\ngrok.exe" http 8000
 * 
 * Notes:
 * - ngrok.exe is located at: E:\ngrok\ngrok.exe
 * - Ngrok can be run from ANY folder (does not need to be in Laravel directory)
 * - Laravel must be running: php artisan serve
 * - Ngrok will output a public URL like: https://mariela-nondiametral-translucently.ngrok-free.dev
 * 
 * ============================================
 * MIDTRANS WEBHOOK URL (ALREADY CONFIGURED)
 * ============================================
 * The Midtrans Sandbox is already configured to send webhook notifications to:
 *   https://mariela-nondiametral-translucently.ngrok-free.dev/api/midtrans/notification
 * 
 * This endpoint will be triggered when payment status changes:
 * - pending (initial state)
 * - settlement (payment successful)
 * - expire (5 minutes passed)
 * - cancel (customer cancelled)
 * - deny (fraud detection)
 * 
 * The frontend polls /api/orders/{orderId}/payment-status every 5 seconds to detect changes.
 */

interface Order {
  order_id: number;
  customer_name: string;
  total_items: number;
  total_price: number;
  created_at: string;
  payment_method: string;
}

interface Payment {
  amount: number;
  status: 'Pending' | 'Success' | 'Refunded' | 'Failed';
}

interface QRISData {
  qr_url: string;
  status: 'pending' | 'settlement' | 'expire' | 'cancel' | 'deny';
  expired_at: string;
}

interface QrisPaymentClientProps {
  orderId: number;
  order: Order;
  payment: Payment;
  qris: QRISData;
}

interface PaymentStatusResponse {
  payment_status: string;
  qris_status: string;
  order_status: string;
}

export default function QrisPaymentClient({
  orderId,
  order,
  payment,
  qris,
}: QrisPaymentClientProps) {
  const router = useRouter();
  const [timeRemaining, setTimeRemaining] = useState<number>(
    getTimeRemaining(qris.expired_at)
  );
  const [isExpired, setIsExpired] = useState<boolean>(
    isPaymentExpired(qris.expired_at)
  );
  const [isPaymentSuccessful, setIsPaymentSuccessful] = useState<boolean>(
    qris.status === 'settlement'
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * COUNTDOWN LOGIC
   * Updates every 1 second to show remaining time until QRIS expires
   * When countdown reaches 0, payment is marked as expired
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
   * POLLING LOGIC
   * Polls backend every 5 seconds to check for payment status changes
   * When status changes to 'settlement' (success), stops polling and shows success state
   * 
   * This works because:
   * 1. Customer scans QRIS and completes payment in Midtrans
   * 2. Midtrans sends webhook to https://mariela-nondiametral-translucently.ngrok-free.dev/api/midtrans/notification
   * 3. Laravel MidtransNotificationController updates qris_transactions.status to 'settlement'
   * 4. Next polling cycle detects the status change and updates UI
   */
  useEffect(() => {
    if (isPaymentSuccessful || isExpired) {
      return; // Stop polling if already successful or expired
    }

    const pollPaymentStatus = async () => {
      try {
        const response = await axios.get<PaymentStatusResponse>(
          `/api/orders/${orderId}/payment-status`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
            },
          }
        );

        const { qris_status, payment_status } = response.data;

        // Check if payment was successful
        if (qris_status === 'settlement' || payment_status === 'Success') {
          setIsPaymentSuccessful(true);
          setIsLoading(false);
          
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }

          // Show success toast
          toast.success('Payment successful! Your order is being prepared.');

          // Optional: Redirect after 2 seconds
          setTimeout(() => {
            router.push(`/orders/${orderId}`);
          }, 2000);
        }

        // Check if payment expired
        if (qris_status === 'expire') {
          setIsExpired(true);
          setIsLoading(false);
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }

          toast.error('Payment expired. Please generate a new QR code.');
        }
      } catch (error) {
        // Silently handle polling errors to avoid toast spam
        console.error('Polling error:', error);
      }
    };

    pollingIntervalRef.current = setInterval(pollPaymentStatus, 5000);

    // Initial check immediately
    pollPaymentStatus();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [orderId, isPaymentSuccessful, isExpired, router]);

  /**
   * Download QR code image
   * Fetches the QR image and triggers browser download
   */
  const handleDownloadQR = async () => {
    try {
      setIsLoading(true);

      // Fetch the QR image
      const response = await fetch(qris.qr_url);
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QRIS-${order.order_id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('QR code downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download QR code');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Navigate to homepage
   */
  const handleBackToHomepage = () => {
    router.push('/');
  };

  /**
   * Navigate to orders page
   */
  const handleViewOrders = () => {
    router.push('/orders');
  };

  const orderCode = formatOrderCode(order.order_id, order.created_at);
  const countdownText = formatCountdown(timeRemaining);
  const totalAmount = formatCurrency(order.total_price);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* NAVBAR */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">5SCENT</h1>
          <div className="hidden md:flex gap-8">
            <a href="/" className="text-gray-700 hover:text-gray-900">
              Home
            </a>
            <a href="/products" className="text-gray-700 hover:text-gray-900">
              Products
            </a>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 md:py-16">
        <div className="w-full max-w-lg">
          {/* SUCCESS ICON & HEADER */}
          <div className="text-center mb-8">
            {isPaymentSuccessful ? (
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <FiCheck className="text-green-600 text-6xl" />
                </div>
              </div>
            ) : (
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
            )}

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isPaymentSuccessful ? 'Payment Successful!' : 'Order Confirmed!'}
            </h1>
            <p className="text-gray-500">
              {isPaymentSuccessful
                ? 'Your order is now being packaged and will be shipped soon.'
                : 'Please complete your payment using the QR code below'}
            </p>
          </div>

          {/* QR CARD */}
          {!isPaymentSuccessful && (
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
              {/* QR IMAGE */}
              <div className="flex justify-center mb-6">
                {isExpired ? (
                  <div className="relative w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-red-300">
                    <div className="text-center">
                      <p className="text-red-600 font-semibold text-lg">
                        Payment Expired
                      </p>
                      <p className="text-gray-500 text-sm mt-2">
                        Please generate a new QR code
                      </p>
                    </div>
                  </div>
                ) : qris.qr_url ? (
                  <Image
                    src={qris.qr_url}
                    alt="QRIS Payment QR Code"
                    width={256}
                    height={256}
                    className="rounded-lg"
                    priority
                  />
                ) : (
                  <div className="w-64 h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Loading QR code...</p>
                  </div>
                )}
              </div>

              {/* COUNTDOWN */}
              <div className="text-center mb-6">
                <p className="text-gray-700 mb-2">
                  Scan this QR code with any QRIS-enabled payment app
                </p>
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className={`w-5 h-5 ${
                      isExpired
                        ? 'text-red-500'
                        : timeRemaining < 60000
                          ? 'text-orange-500'
                          : 'text-gray-500'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00-.293.707l-.707.707a1 1 0 101.414 1.414L9 9.414V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p
                    className={`font-semibold ${
                      isExpired
                        ? 'text-red-600'
                        : timeRemaining < 60000
                          ? 'text-orange-600'
                          : 'text-gray-600'
                    }`}
                  >
                    {isExpired
                      ? 'Payment Expired'
                      : `Payment expires in ${countdownText}`}
                  </p>
                </div>
              </div>

              {/* DOWNLOAD BUTTON */}
              <button
                onClick={handleDownloadQR}
                disabled={isExpired || isLoading}
                className={`w-full py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                  isExpired || isLoading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiDownload className="w-5 h-5" />
                Download QR Code
              </button>
            </div>
          )}

          {/* ORDER SUMMARY CARD */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Order Summary
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Order Code</span>
                <span className="text-gray-900 font-semibold">{orderCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Customer Name</span>
                <span className="text-gray-900">{order.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Items</span>
                <span className="text-gray-900">{order.total_items} item(s)</span>
              </div>

              <div className="border-t border-gray-300 pt-3 mt-3 flex justify-between">
                <span className="text-gray-900 font-semibold">Total Amount</span>
                <span className="text-gray-900 font-bold text-lg">
                  {totalAmount}
                </span>
              </div>
            </div>
          </div>

          {/* HOW TO PAY BOX */}
          {!isPaymentSuccessful && !isExpired && (
            <div className="bg-blue-50 rounded-2xl p-6 mb-8 border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                How to Pay:
              </h3>
              <ol className="text-gray-700 text-sm space-y-2 list-decimal list-inside">
                <li>Open any QRIS-enabled payment app (GoPay, OVO, Dana, etc.)</li>
                <li>Select "Scan QR" or "QRIS"</li>
                <li>
                  Scan the QR code above or upload the downloaded image
                </li>
                <li>Confirm the payment amount and complete the transaction</li>
              </ol>
            </div>
          )}

          {/* BOTTOM BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleBackToHomepage}
              className="flex-1 py-3 px-4 rounded-full bg-white border-2 border-gray-300 text-gray-900 font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <FiHome className="w-5 h-5" />
              <span>Back to Homepage</span>
            </button>

            <button
              onClick={handleViewOrders}
              className="flex-1 py-3 px-4 rounded-full bg-black text-white font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
            >
              <FiPackage className="w-5 h-5" />
              <span>View My Orders</span>
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-gray-50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* BRAND */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">5SCENT</h3>
              <p className="text-gray-600 text-sm">
                Discover your signature scent with our luxurious collection of
                premium fragrances.
              </p>
            </div>

            {/* QUICK LINKS */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="/" className="hover:text-gray-900">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="/products" className="hover:text-gray-900">
                    Products
                  </a>
                </li>
                <li>
                  <a href="/" className="hover:text-gray-900">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* CUSTOMER SERVICE */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">
                Customer Service
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="/" className="hover:text-gray-900">
                    Shipping Info
                  </a>
                </li>
                <li>
                  <a href="/" className="hover:text-gray-900">
                    Returns
                  </a>
                </li>
                <li>
                  <a href="/" className="hover:text-gray-900">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* CONTACT */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Contact Us</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span>📞</span>
                  <a href="tel:+1234567890">+1 (555) 123-4567</a>
                </li>
                <li className="flex items-center gap-2">
                  <span>✉️</span>
                  <a href="mailto:info@5scent.com">info@5scent.com</a>
                </li>
                <li>123 Fragrance Ave, New York, NY 10001</li>
              </ul>
            </div>
          </div>

          {/* DIVIDER & COPYRIGHT */}
          <div className="border-t border-gray-300 mt-8 pt-8 text-center text-sm text-gray-600">
            <p>© 2024 5SCENT. All rights reserved. Crafted with elegance.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
