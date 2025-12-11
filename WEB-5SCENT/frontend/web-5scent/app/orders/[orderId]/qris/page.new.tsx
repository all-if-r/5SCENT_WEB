'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BiHomeAlt } from 'react-icons/bi';
import { FiPackage, FiDownload, FiCheck } from 'react-icons/fi';
import axios from 'axios';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

interface QrisData {
  success: boolean;
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

export default function QrisPage({ params }: PageProps) {
  const router = useRouter();
  const [data, setData] = useState<QrisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('5:00');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Unwrap params promise
  useEffect(() => {
    params.then((p) => setOrderId(p.orderId));
  }, [params]);

  // Fetch QRIS data
  useEffect(() => {
    if (!orderId) return;

    const fetchData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await axios.get(`${apiUrl}/api/orders/${orderId}/qris-detail`);

        if (response.data?.success) {
          setData(response.data);
          setLoading(false);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch QRIS details:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [orderId]);

  // Countdown timer
  useEffect(() => {
    if (!data?.qris?.expired_at) return;

    const interval = setInterval(() => {
      const expiryTime = new Date(data.qris.expired_at).getTime();
      const now = new Date().getTime();
      const difference = expiryTime - now;

      if (difference <= 0) {
        setCountdown('0:00');
        clearInterval(interval);
        return;
      }

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
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await axios.get(`${apiUrl}/api/orders/${orderId}/payment-status`);

        if (response.data?.payment_status === 'Success' || response.data?.qris_status === 'settlement') {
          setPaymentSuccess(true);
          clearInterval(pollInterval);
        }
      } catch (error) {
        // Silently fail on polling errors
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [orderId]);

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

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Payment details not found</p>
          <button
            onClick={() => router.push('/orders')}
            className="px-6 py-2 bg-black text-white rounded-full font-medium"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const handleDownloadQR = async () => {
    try {
      const response = await fetch(data.qris.qr_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QRIS-Order-${data.order.order_id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download QR code:', error);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-white py-8 px-4">
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
              Order #{data.order.order_id} will be processed shortly.
            </p>
          </div>

          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-300 rounded-full font-medium text-gray-800 hover:bg-gray-50"
            >
              <BiHomeAlt className="w-4 h-4" />
              Back to Homepage
            </button>
            <button
              onClick={() => router.push('/orders')}
              className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-full font-medium hover:bg-gray-900"
            >
              <FiPackage className="w-4 h-4" />
              View My Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheck className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-600">Please complete your payment using the QR code below</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-6">
          {/* QR Code Section */}
          <div className="text-center mb-6">
            <div className="inline-block bg-white p-4 rounded-lg border border-gray-200">
              <Image
                src={data.qris.qr_url}
                alt="QRIS Payment QR Code"
                width={240}
                height={240}
                className="rounded-lg"
                priority
              />
            </div>
            <p className="text-gray-600 text-sm mt-4">Scan this QR code with any QRIS-enabled payment app</p>
            <div className="flex items-center justify-center gap-2 text-gray-500 text-xs md:text-sm mt-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Payment expires in {countdown}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>

            <div className="space-y-3">
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
                <span className="font-semibold text-lg text-gray-900">
                  Rp{data.order.total_price.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* Download Button */}
          <div className="text-center mb-6">
            <button
              onClick={handleDownloadQR}
              className="flex items-center justify-center gap-2 mx-auto px-6 py-2 bg-white border border-gray-300 rounded-full text-gray-700 font-medium hover:bg-gray-50"
            >
              <FiDownload className="w-4 h-4" />
              Download QR Code
            </button>
          </div>

          {/* How to Pay */}
          <div className="bg-blue-50 rounded-xl p-6">
            <h4 className="font-semibold text-gray-900 mb-3">How to Pay:</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Open any QRIS-enabled payment app (GoPay, OVO, Dana, etc.)</li>
              <li>• Select "Scan QR" or "QRIS"</li>
              <li>• Scan the QR code above or upload the downloaded image</li>
              <li>• Confirm the payment amount and complete the transaction</li>
            </ul>
          </div>
        </div>

        {/* Bottom Buttons */}
        <div className="flex gap-4 justify-center flex-wrap mb-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-300 rounded-full font-medium text-gray-800 hover:bg-gray-50"
          >
            <BiHomeAlt className="w-4 h-4" />
            Back to Homepage
          </button>
          <button
            onClick={() => router.push('/orders')}
            className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-full font-medium hover:bg-gray-900"
          >
            <FiPackage className="w-4 h-4" />
            View My Orders
          </button>
        </div>

        {/* Footer Note */}
        <div className="text-center text-xs md:text-sm text-gray-600">
          <p>Your order will be processed once payment is confirmed.</p>
          <p>
            Need help? Contact our support team at{' '}
            <a href="mailto:support@5scent.com" className="text-blue-600 hover:underline">
              support@5scent.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
