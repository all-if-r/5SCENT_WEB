'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';

interface Order {
  order_id: number;
  status: string;
  total_price: number;
  created_at: string;
  tracking_number?: string;
  details: Array<{
    order_detail_id: number;
    product: {
      product_id: number;
      name: string;
      images: Array<{ image_id: number; image_url: string; is_50ml: number }>;
    };
    size: string;
    quantity: number;
    price: number;
  }>;
}

export default function MyOrdersTab() {
  const [orders, setOrders] = useState<{
    in_process: Order[];
    shipping: Order[];
    completed: Order[];
    canceled: Order[];
  }>({
    in_process: [],
    shipping: [],
    completed: [],
    canceled: [],
  });
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (orderId: number) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
      await api.post(`/orders/${orderId}/cancel`);
      showToast('Order cancelled successfully', 'success');
      fetchOrders();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to cancel order', 'error');
    }
  };

  const handleFinish = async (orderId: number) => {
    try {
      await api.post(`/orders/${orderId}/finish`);
      showToast('Order marked as delivered', 'success');
      fetchOrders();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to finish order', 'error');
    }
  };

  const renderOrderGroup = (title: string, orderList: Order[], statusColor: string) => {
    if (orderList.length === 0) return null;

    return (
      <div className="mb-8">
        <h4 className={`text-lg font-semibold mb-4 ${statusColor}`}>{title}</h4>
        <div className="space-y-4">
          {orderList.map((order) => (
            <div key={order.order_id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-semibold">Order #{order.order_id}</p>
                  <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                  {order.tracking_number && (
                    <p className="text-sm text-gray-600 mt-1">
                      Tracking: <span className="font-mono">{order.tracking_number}</span>
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{formatCurrency(order.total_price)}</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'Cancel' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {order.details.map((detail) => {
                  const image = detail.product.images[0];
                  const imageUrl = image?.image_url || '/placeholder.jpg';

                  return (
                    <Link
                      key={detail.order_detail_id}
                      href={`/products/${detail.product.product_id}`}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded"
                    >
                      <div className="relative w-16 h-16 bg-gray-100 rounded">
                        <Image
                          src={imageUrl}
                          alt={detail.product.name}
                          fill
                          className="object-cover rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{detail.product.name}</p>
                        <p className="text-sm text-gray-500">
                          {detail.size} × {detail.quantity}
                        </p>
                      </div>
                      <p className="font-semibold">{formatCurrency(detail.price * detail.quantity)}</p>
                    </Link>
                  );
                })}
              </div>

              <div className="flex gap-2">
                {order.status === 'Packaging' && (
                  <button
                    onClick={() => handleCancel(order.order_id)}
                    className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Cancel Order
                  </button>
                )}
                {order.status === 'Shipping' && (
                  <button
                    onClick={() => handleFinish(order.order_id)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Finish Order
                  </button>
                )}
                {order.status === 'Delivered' && (
                  <Link
                    href={`/orders/${order.order_id}/rate`}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Rate Products
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  return (
    <div>
      {renderOrderGroup('In Process', orders.in_process, 'text-blue-600')}
      {renderOrderGroup('Shipping', orders.shipping, 'text-purple-600')}
      {renderOrderGroup('Completed', orders.completed, 'text-green-600')}
      {renderOrderGroup('Canceled', orders.canceled, 'text-red-600')}

      {Object.values(orders).every(arr => arr.length === 0) && (
        <div className="text-center py-12">
          <p className="text-gray-500">No orders yet</p>
          <Link
            href="/products"
            className="mt-4 inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      )}
    </div>
  );
}
