'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BiHomeAlt } from 'react-icons/bi';
import { FiPackage, FiDownload, FiCheck } from 'react-icons/fi';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function QrisExamplePage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState('5:00');

  // Countdown timer
  useEffect(() => {
    const startTime = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, fiveMinutes - elapsed);
      
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      
      setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDownloadQR = async () => {
    try {
      const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=ORDER-35-EXAMPLE';
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QRIS-Order-35.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download QR code:', error);
    }
  };

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
              <div className="inline-block bg-white p-6 rounded-lg border border-gray-200 mb-4">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=ORDER-35-EXAMPLE"
                  alt="QRIS Payment QR Code"
                  width={240}
                  height={240}
                  className="rounded-lg"
                />
              </div>
              <p className="text-gray-600 text-xs md:text-sm mb-3">Scan this QR code with any QRIS-enabled payment app</p>
              <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                Payment expires in {countdown}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h3 className="text-base font-semibold text-gray-900 mb-6">Order Summary</h3>

              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Customer Name</span>
                  <span className="font-medium text-gray-900">Hapis</span>
                </div>

                <div className="border-t border-gray-200"></div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Items</span>
                  <span className="font-medium text-gray-900">1 item(s)</span>
                </div>

                <div className="border-t border-gray-200"></div>

                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Total Amount</span>
                  <span className="font-bold text-lg text-gray-900">
                    Rp78,750
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
