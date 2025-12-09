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
import { LuClock, LuCalculator } from 'react-icons/lu';
import { FaStar, FaRegStar, FaRegStarHalfStroke } from 'react-icons/fa6';
import { PiMoneyWavy } from 'react-icons/pi';
import { FiShoppingBag, FiPackage } from 'react-icons/fi';
import { LuPackage2 } from 'react-icons/lu';
import { formatCurrency, roundRating } from '@/lib/utils';

interface Card {
  label: string;
  value: number;
  icon: string;
}

interface DashboardData {
  cards: Card[];
  revenue: {
    total: number;
    change: number;
    averageOrderValue: number;
  };
  salesOverview: Array<{
    label: string;
    orders: number;
    revenue: number;
    avgOrder: number;
  }>;
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
  mostSoldProduct?: string;
}

const COLORS = ['#3B82F6', '#A855F7', '#EC4899', '#F97316', '#22C55E', '#06B6D4', '#000000'];

export default function AdminDashboardPage() {
  const router = useRouter();
  const { admin, loading: adminLoading } = useAdmin();
  const [timeFrame, setTimeFrame] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
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
      setDashboardData({
        cards: [],
        revenue: { total: 0, change: 0, averageOrderValue: 0 },
        salesOverview: [],
        bestSellers: [],
        recentOrders: [],
        mostSoldProduct: 'N/A',
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
      case 'pos':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'FiShoppingBag':
        return <FiShoppingBag className="w-6 h-6 text-gray-600" />;
      case 'LuClock':
        return <LuClock className="w-6 h-6 text-gray-600" />;
      case 'LuPackage2':
        return <LuPackage2 className="w-6 h-6 text-gray-600" />;
      case 'TruckIcon':
        return <TruckIcon className="w-6 h-6 text-gray-600" />;
      case 'CheckCircleIcon':
        return <CheckCircleIcon className="w-6 h-6 text-green-600" />;
      case 'XCircleIcon':
        return <XCircleIcon className="w-6 h-6 text-red-600" />;
      case 'LuCalculator':
        return <LuCalculator className="w-6 h-6 text-gray-600" />;
      case 'FiPackage':
        return <FiPackage className="w-6 h-6 text-gray-600" />;
      default:
        return null;
    }
  };

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

  // Get max revenue for chart scaling
  const maxRevenue = Math.max(...(dashboardData.salesOverview?.map(d => d.revenue || 0) || [0]), 1);

  return (
    <AdminLayout onRefresh={handleRefresh} refreshing={refreshing || loading}>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 space-y-8">
          {/* Stats Grid - 2 rows of 4 cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboardData.cards?.map((card, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    {getIconComponent(card.icon)}
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-2">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value ?? 0}</p>
              </div>
            ))}
          </div>

          {/* Financial & Inventory Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Total Revenue */}
            <div className="bg-black text-white rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <PiMoneyWavy className="w-6 h-6 text-white" />
              </div>
              <p className="text-gray-300 text-sm mb-2">Total Revenue</p>
              <p className="text-3xl font-bold mb-2">Rp {(dashboardData.revenue?.total || 0).toLocaleString('id-ID')}</p>
              <p className="text-sm text-gray-300">
                ↑ {(dashboardData.revenue?.change || 0).toFixed(1)}% from last month
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
              <p className="text-2xl font-bold text-gray-900">Rp {(dashboardData.revenue?.averageOrderValue || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-gray-600 mt-2">Per transaction</p>
            </div>
          </div>

          {/* Sales Overview & Best Sellers */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sales Chart - 3 columns */}
            <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Sales Overview</h2>
                  <p className="text-sm text-gray-600">
                    {timeFrame === 'daily'
                      ? 'Revenue by day of the week'
                      : timeFrame === 'weekly'
                      ? 'Revenue by week of the month'
                      : timeFrame === 'monthly'
                      ? 'Revenue by month of the year'
                      : 'Revenue by year (2025–2015)'}
                  </p>
                </div>
                <select
                  value={timeFrame}
                  onChange={(e) => setTimeFrame(e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              {/* Chart */}
              <div className="space-y-3">
                {dashboardData.salesOverview?.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-16 text-right">
                      <p className="text-xs font-medium text-gray-600">{item.label}</p>
                    </div>
                    <div className="flex-1">
                      <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden flex items-center">
                        <div
                          className="h-full rounded-lg transition-all hover:opacity-80 flex items-center justify-end pr-3"
                          style={{
                            width: `${((item.revenue || 0) / maxRevenue) * 100}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                          title={`${item.label}: Rp ${(item.revenue || 0).toLocaleString('id-ID')}`}
                        >
                          <p className="text-xs font-semibold text-white text-right">
                            Rp {(item.revenue || 0).toLocaleString('id-ID')}
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
                {dashboardData.bestSellers?.map((product, index) => (
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
                      <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
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
                  {dashboardData.recentOrders?.map((order) => (
                    <tr key={order.order_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">{order.order_no}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{order.customer_name}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{order.items_count} item(s)</td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">Rp {(order.total || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}</td>
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
