'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';
import { useToast } from '@/contexts/ToastContext';
import { FiCalendar, FiShoppingBag } from 'react-icons/fi';
import { TbFileText } from 'react-icons/tb';
import { RiDashboardLine } from 'react-icons/ri';
import { LuPackage, LuCalculator, LuSettings } from 'react-icons/lu';
import {
  Bars3Icon,
  XMarkIcon,
  StarIcon,
  ArrowTopRightOnSquareIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';

interface AdminLayoutProps {
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export default function AdminLayout({ children, onRefresh, refreshing }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, logoutAdmin } = useAdmin();
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: RiDashboardLine },
    { name: 'Products', href: '/admin/products', icon: LuPackage },
    { name: 'Orders', href: '/admin/orders', icon: FiShoppingBag },
    { name: 'POS Tool', href: '/admin/pos', icon: LuCalculator },
    { name: 'Sales Reports', href: '/admin/reports', icon: TbFileText },
    { name: 'Reviews', href: '/admin/reviews', icon: StarIcon },
    { name: 'Settings', href: '/admin/settings', icon: LuSettings },
  ];

  const handleLogout = async () => {
    try {
      await logoutAdmin();
      showToast('Logged out successfully', 'success');
    } catch (error) {
      showToast('Logout failed', 'error');
    }
  };

  const isActive = (href: string) => pathname === href;

  const isDashboard = pathname?.startsWith('/admin/dashboard');
  const isProducts = pathname?.startsWith('/admin/products');
  const isOrders = pathname?.startsWith('/admin/orders');
  const isPOS = pathname?.startsWith('/admin/pos');
  const isReviews = pathname?.startsWith('/admin/reviews');
  const isSettings = pathname?.startsWith('/admin/settings');
  const isReports = pathname?.startsWith('/admin/reports');

  const headerTitle = isSettings ? 'Admin Settings' : isReports ? 'Sales Reports' : isProducts ? 'Product Management' : isOrders ? 'Order Management' : isPOS ? 'POS Tool' : isReviews ? 'Reviews Management' : 'Dashboard Overview';
  const headerSubtitle = isSettings
    ? 'Manage your admin profile'
    : isReports
    ? 'Analyze sales data and trends'
    : isProducts
    ? 'Manage your perfume inventory'
    : isOrders
    ? 'View and manage customer orders'
    : isPOS
    ? 'Process offline sales and generate receipts'
    : isReviews
    ? 'Monitor customer feedback'
    : 'Monitor your store performance at a glance';

  if (!admin) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative w-64 h-screen bg-white border-r border-gray-200 flex flex-col z-50 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="px-6 py-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-black">5SCENT</h1>
          <p className="text-sm text-gray-600">Admin Dashboard</p>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-black text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="border-t border-gray-200 p-4 space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>

          {/* Left: Headline and Subtitle Block */}
          <div className="flex-1 hidden md:block">
            <h1 className="text-xl font-semibold text-gray-900">{headerTitle}</h1>
            <p className="text-sm text-gray-600">{headerSubtitle}</p>
          </div>

          {/* Right: Date Chip and Actions */}
          <div className="ml-auto flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 bg-white border border-black rounded-full px-4 py-2">
              <FiCalendar className="w-5 h-5 text-black" />
              <span className="text-sm font-medium text-black">
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            {isDashboard && onRefresh && (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {refreshing ? 'Refreshing...' : '↻ Refresh'}
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
