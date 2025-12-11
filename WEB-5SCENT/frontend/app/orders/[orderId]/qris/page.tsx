import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QrisPaymentClient from './QrisPaymentClient';

/**
 * QRIS Payment Detail Page (Server Component)
 * 
 * Route: /orders/[orderId]/qris
 * 
 * ============================================
 * IMPORTANT: NGROK WEBHOOK URL
 * ============================================
 * Midtrans Sandbox Payment Notification URL is already set to:
 * https://mariela-nondiametral-translucently.ngrok-free.dev/api/midtrans/notification
 * 
 * To test this page:
 * 1. Run Laravel: php artisan serve
 * 2. Run ngrok: & "E:\ngrok\ngrok.exe" http 8000
 * 3. Access frontend
 * 4. Complete payment in Midtrans
 * 5. Watch the QR page auto-update via polling
 */

interface OrderData {
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
    status: 'Pending' | 'Success' | 'Refunded' | 'Failed';
  };
  qris: {
    qr_url: string;
    status: 'pending' | 'settlement' | 'expire' | 'cancel' | 'deny';
    expired_at: string;
  };
}

interface PageParams {
  params: Promise<{
    orderId: string;
  }>;
}

export const metadata: Metadata = {
  title: 'QRIS Payment | 5SCENT',
  description: 'Complete your payment using QRIS QR code',
};

async function fetchQrisPaymentData(orderId: string): Promise<OrderData | null> {
  try {
    // Get the token from headers/cookies if available
    // Note: Server components can access cookies via cookies() import if needed
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const response = await fetch(
      `${baseUrl}/api/orders/${orderId}/qris-detail`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add auth header if token is available via environment
          // Authorization: `Bearer ${token}`,
        },
        // Cache for 10 seconds
        next: { revalidate: 10 },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch QRIS data: ${response.status}`);
      return null;
    }

    const data: OrderData = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching QRIS payment data:', error);
    return null;
  }
}

export default async function QrisPaymentPage({ params }: PageParams) {
  const { orderId } = await params;

  // Fetch QRIS payment data
  const qrisData = await fetchQrisPaymentData(orderId);

  // Handle 404
  if (!qrisData) {
    notFound();
  }

  const { order, payment, qris } = qrisData;

  return (
    <QrisPaymentClient
      orderId={order.order_id}
      order={order}
      payment={payment}
      qris={qris}
    />
  );
}

/**
 * Generate static params for pre-rendering (optional)
 * Remove if you have too many orders or don't want static generation
 */
export async function generateStaticParams() {
  // Return empty array to use dynamic rendering
  // Or fetch top order IDs and return them for pre-rendering
  return [];
}
