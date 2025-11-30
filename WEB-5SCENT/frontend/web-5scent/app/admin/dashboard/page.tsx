'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import Image from 'next/image';
import {
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { FaStar, FaRegStar, FaRegStarHalfStroke } from 'react-icons/fa6';
import { PiMoneyWavy } from 'react-icons/pi';
import { FiShoppingBag, FiPackage } from 'react-icons/fi';
import { LuPackage2 } from 'react-icons/lu';
import { formatCurrency, roundRating } from '@/lib/utils';

interface OrderStats {
  total: number;
  packaging: number;
  shipping: number;
  delivered: number;
  cancelled: number;
  totalChange?: number;
  deliveredChange?: number;
}

interface DashboardData {
  orderStats: OrderStats;
  totalRevenue: number;
  averageOrderValue: number;
  totalProducts: number;
  revenueChange: number;
  salesData: { label: string; value: number }[];
  bestSellers: Array<{
    product_id: number;
    name: string;
    rating: number;
    stock: number;
    image?: string;
  }>;
  recentOrders: Array<{
    order_id: number;
    order_no: string;
    customer_name: string;
    total: number;
    date: string;
    status: string;
    items_count: number;
  }>;
}

const COLORS = ['#3B82F6', '#A855F7', '#EC4899', '#F97316', '#22C55E', '#06B6D4', '#000000'];

export default function AdminDashboardPage() {
  const router = useRouter();
  const { admin, loading: adminLoading } = useAdmin();
  const [timeFrame, setTimeFrame] = useState<'week' | 'month' | 'year'>('month');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!adminLoading && !admin) {
      router.push('/admin/login');
    }
  }, [admin, adminLoading, router]);

  const fetchDashboardData = async (options?: { isRefresh?: boolean }) => {
    const isRefresh = options?.isRefresh;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Fetch real data from API
      const response = await api.get('/admin/dashboard/data', {
        params: { timeframe: timeFrame }
      });
      
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Fallback to empty data on error
      setDashboardData((previous) => previous || {
        orderStats: {
          total: 0,
          packaging: 0,
          shipping: 0,
          delivered: 0,
          cancelled: 0,
        },
        totalRevenue: 0,
        averageOrderValue: 0,
        totalProducts: 0,
        revenueChange: 0,
        salesData: [],
        bestSellers: [],
        recentOrders: [],
      });
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Only fetch data if admin is authenticated and loading is done
    if (!adminLoading && admin) {
      fetchDashboardData();
    }
  }, [timeFrame, admin, adminLoading]);

  // Show loading while admin context is loading or dashboard data is loading
  if (adminLoading || !admin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Authenticating...</div>
      </div>
    );
  }

  if (!dashboardData || loading) {
    return (
      <AdminLayout onRefresh={() => fetchDashboardData({ isRefresh: true })} refreshing={refreshing || loading}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse">Loading dashboard...</div>
        </div>
      </AdminLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipping':
        return 'bg-purple-100 text-purple-800';
      case 'packaging':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const maxValue = Math.max(...dashboardData.salesData.map(d => d.value));

  const renderStars = (rating: number) => {
    const rounded = roundRating(rating);
    const fullStars = Math.floor(rounded);
    const hasHalf = rounded % 1 === 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

    return (
      <div className="flex gap-0.5 items-center">
        {[...Array(fullStars)].map((_, i) => (
          <FaStar key={`full-${i}`} className="w-3 h-3 text-black" />
        ))}
        {hasHalf && <FaRegStarHalfStroke className="w-3 h-3 text-black" />}
        {[...Array(emptyStars)].map((_, i) => (
          <FaRegStar key={`empty-${i}`} className="w-3 h-3 text-black" />
        ))}
        <span className="text-xs text-gray-600 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const handleRefresh = () => fetchDashboardData({ isRefresh: true });

  return (
    <AdminLayout onRefresh={handleRefresh} refreshing={refreshing || loading}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Key Metrics - Top Row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Total Orders */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FiShoppingBag className="w-6 h-6 text-gray-600" />
                </div>
                {dashboardData.orderStats.totalChange && (
                  <div className="flex items-center gap-1 text-green-600">
                    <span className="text-sm font-medium">+{dashboardData.orderStats.totalChange}%</span>
                  </div>
                )}
              </div>
              <p className="text-gray-600 text-sm mb-2">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.orderStats.total}</p>
            </div>

            {/* Packaging */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <LuPackage2 className="w-6 h-6 text-gray-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-2">Packaging</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.orderStats.packaging}</p>
            </div>

            {/* Shipping */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <TruckIcon className="w-6 h-6 text-gray-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-2">Shipping</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.orderStats.shipping}</p>
            </div>

            {/* Delivered */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                </div>
                {dashboardData.orderStats.deliveredChange && (
                  <div className="flex items-center gap-1 text-green-600">
                    <span className="text-sm font-medium">+{dashboardData.orderStats.deliveredChange}%</span>
                  </div>
                )}
              </div>
              <p className="text-gray-600 text-sm mb-2">Delivered</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.orderStats.delivered}</p>
            </div>

            {/* Cancelled */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <XCircleIcon className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-2">Cancelled</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.orderStats.cancelled}</p>
            </div>
          </div>

          {/* Financial & Inventory Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Revenue */}
            <div className="bg-black text-white rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <PiMoneyWavy className="w-6 h-6 text-white" />
              </div>
              <p className="text-gray-300 text-sm mb-2">Total Revenue</p>
              <p className="text-3xl font-bold mb-2">Rp {dashboardData.totalRevenue.toLocaleString('id-ID')}</p>
              <p className="text-sm text-gray-300">
                ↑ {dashboardData.revenueChange.toFixed(1)}% from last month
              </p>
            </div>

            {/* Average Order Value */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FiShoppingBag className="w-6 h-6 text-gray-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-2">Average Order Value</p>
              <p className="text-2xl font-bold text-gray-900">Rp {dashboardData.averageOrderValue.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-gray-600 mt-2">Per transaction</p>
            </div>

            {/* Total Products */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FiPackage className="w-6 h-6 text-gray-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-2">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.totalProducts}</p>
              <p className="text-xs text-gray-600 mt-2">Active listings</p>
            </div>
          </div>

          {/* Sales Overview & Best Sellers */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            {/* Sales Chart - 3 columns */}
            <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Sales Overview</h2>
                  <p className="text-sm text-gray-600">
                    {timeFrame === 'week'
                      ? 'Revenue trend over the last 7 days'
                      : timeFrame === 'month'
                      ? 'Monthly revenue for this month'
                      : 'Monthly revenue for this year'}
                  </p>
                </div>
                <select
                  value={timeFrame}
                  onChange={(e) => setTimeFrame(e.target.value as 'week' | 'month' | 'year')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>
              </div>

              {/* Chart */}
              <div className="space-y-3">
                {dashboardData.salesData.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-16 text-right">
                      <p className="text-xs font-medium text-gray-600">{item.label}</p>
                    </div>
                    <div className="flex-1">
                      <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden flex items-center">
                        <div
                          className="h-full rounded-lg transition-all hover:opacity-80 flex items-center justify-end pr-3"
                          style={{
                            width: `${(item.value / maxValue) * 100}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                          title={`${item.label}: Rp ${item.value.toLocaleString('id-ID')}`}
                        >
                          <p className="text-xs font-semibold text-white text-right">
                            Rp {item.value.toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Best Sellers - 1 column */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Best Sellers</h2>
              <p className="text-sm text-gray-600 mb-6">Top performing products</p>

              <div className="space-y-6">
                {dashboardData.bestSellers.map((product, index) => (
                  <div key={product.product_id} className="flex items-start gap-4 pb-6 border-b border-gray-200 last:border-0 last:pb-0">
                    {/* Ranking Circle */}
                    <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {index + 1}
                    </div>

                    {/* Product Image */}
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span className="text-xs">No image</span>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-600">{product.stock} in stock</p>
                      <div className="mt-2">{renderStars(product.rating)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                <p className="text-sm text-gray-600">Latest customer orders</p>
              </div>
              <a href="/admin/orders" className="text-sm font-medium text-gray-900 hover:text-gray-600">
                View All →
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Order ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Items</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Total</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.recentOrders.map((order) => (
                    <tr key={order.order_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">{order.order_no}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{order.customer_name}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{order.items_count} item(s)</td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">Rp {order.total.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{order.date}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
