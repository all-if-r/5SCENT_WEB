'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { FiDownload } from 'react-icons/fi';
import { PiMoneyWavy } from 'react-icons/pi';
import { RiShoppingBag3Line } from 'react-icons/ri';
import { FaRegStar } from 'react-icons/fa6';

interface SalesData {
  date: string;
  orders: number;
  revenue: number;
  avgOrder: number;
}

interface DashboardStats {
  totalRevenue: number;
  totalTransactions: number;
  mostSoldProduct: string;
  salesData: SalesData[];
}

export default function SalesReportsPage() {
  const { showToast } = useToast();
  const [timeFrame, setTimeFrame] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Monthly');
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalTransactions: 0,
    mostSoldProduct: '',
    salesData: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [timeFrame]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Map timeframe to API parameter
      const timeframeParam = timeFrame.toLowerCase();
      
      // Fetch sales report data with global totals
      const salesReportResponse = await api.get('/admin/dashboard/sales-report', {
        params: { timeframe: timeframeParam },
      });
      const salesReportData = salesReportResponse.data;
      
      // Fetch dashboard data to get mostSoldProduct
      const dashboardResponse = await api.get('/admin/dashboard/data');
      const dashboardData = dashboardResponse.data;
      
      setStats({
        totalRevenue: salesReportData.totalRevenue || 0,
        totalTransactions: salesReportData.totalTransactions || 0,
        mostSoldProduct: dashboardData.mostSoldProduct || 'N/A',
        salesData: salesReportData.salesData || [],
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      showToast('Failed to load sales reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Format currency in Indonesian Rupiah format: Rp884.000
  const formatCurrency = (amount: number): string => {
    if (amount === 0) return 'Rp0';
    
    // Format with thousands separator (period)
    const formatted = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return `Rp${formatted}`;
  };

  // Handle PDF export
  const handleExportPDF = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/admin/sales-reports/export/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      });
      
      if (!response.ok) throw new Error(`Export failed: ${response.statusText}`);
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with current date
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      const fileName = `SALES-REPORT-DATA-${day}-${month}-${year}.pdf`;
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showToast('PDF exported successfully', 'success');
    } catch (error) {
      console.error('PDF export error:', error);
      showToast('Failed to export PDF', 'error');
    }
  };

  // Handle Excel export
  const handleExportExcel = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/admin/sales-reports/export/excel`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
      
      if (!response.ok) throw new Error(`Export failed: ${response.statusText}`);
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with current date
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      const fileName = `SALES-REPORT-DATA-${day}-${month}-${year}.xlsx`;
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showToast('Excel exported successfully', 'success');
    } catch (error) {
      console.error('Excel export error:', error);
      showToast('Failed to export Excel', 'error');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Revenue Card */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                <PiMoneyWavy className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-gray-600 font-medium mb-2">Total Revenue</h3>
            <p className="text-2xl font-bold text-black">
              {formatCurrency(stats.totalRevenue)}
            </p>
          </div>

          {/* Total Transactions Card */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                <RiShoppingBag3Line className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-gray-600 font-medium mb-2">Total Transactions</h3>
            <p className="text-2xl font-bold text-black">{stats.totalTransactions}</p>
          </div>

          {/* Most Sold Card */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                <FaRegStar className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-gray-600 font-medium mb-2">Most Sold</h3>
            <p className="text-2xl font-bold text-black">{stats.mostSoldProduct}</p>
          </div>
        </div>

        {/* Export Section */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-black mb-4">Export Reports</h2>
          <div className="flex gap-4">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors font-medium"
            >
              <FiDownload className="w-5 h-5" />
              Export PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-6 py-2 bg-white text-black border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              <FiDownload className="w-5 h-5" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Timeframe Tabs */}
        <div className="flex gap-2">
          {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setTimeFrame(tab)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                timeFrame === tab
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-black">
              {timeFrame === 'Daily'
                ? 'Daily Sales'
                : timeFrame === 'Weekly'
                ? 'Weekly Sales'
                : timeFrame === 'Monthly'
                ? 'Monthly Sales'
                : 'Yearly Sales'}
            </h2>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-600">Loading sales data...</p>
            </div>
          ) : stats.salesData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      {timeFrame === 'Daily' ? 'Day' : timeFrame === 'Weekly' ? 'Week' : timeFrame === 'Monthly' ? 'Month' : 'Year'}
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                      Orders
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                      Avg Order
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.salesData.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{item.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">{item.orders}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {formatCurrency(item.revenue)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {formatCurrency(item.avgOrder)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-600">No sales data available</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
