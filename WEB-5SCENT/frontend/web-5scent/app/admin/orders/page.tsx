'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import { ChevronDownIcon, EyeIcon } from '@heroicons/react/24/outline';
import { MdContentCopy } from 'react-icons/md';
import { FiPackage, FiTruck, FiCheck, FiShoppingCart } from 'react-icons/fi';
import { LuSearch } from 'react-icons/lu';
import { useToast } from '@/contexts/ToastContext';

interface OrderItem {
  detail_id: number;
  product_id: number;
  quantity: number;
  price: number;
  size: string;
  product?: {
    name: string;
    product_id: number;
    images?: Array<{
      image_id?: number;
      image_url: string;
      is_50ml?: boolean;
      is_additional?: boolean;
    }>;
  };
}

interface Order {
  order_id: number;
  user_id: number;
  status: string;
  tracking_number: string | null;
  total_price: number;
  shipping_address: string;
  created_at: string;
  payment_method?: string;
  user?: {
    name: string;
    email: string;
    phone?: string;
    address_line?: string;
    district?: string;
    city?: string;
    province?: string;
    postal_code?: string;
  };
  details?: OrderItem[];
}

interface PaginatedResponse {
  data: Order[];
  current_page: number;
  last_page: number;
  total: number;
}

interface PosItem {
  pos_item_id?: number;
  transaction_id?: number;
  product_id?: number;
  size: string;
  quantity: number;
  price: number;
  subtotal?: number;
  product?: {
    name: string;
    images?: Array<{
      image_url: string;
      is_50ml?: boolean | number;
      is_additional?: boolean | number;
    }>;
  };
}

interface PosOrder {
  transaction_id: number;
  customer_name: string;
  phone?: string;
  payment_method: string;
  total_price: number;
  date: string;
  cash_change?: number;
  cash_received?: number;
  pos_code?: string;
  items?: PosItem[];
}

type OrderType = 'online' | 'pos' | 'all';

export default function OrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [posOrders, setPosOrders] = useState<PosOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [orderType, setOrderType] = useState<OrderType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  
  // Modal state - online
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [updating, setUpdating] = useState(false);

  // Modal state - POS
  const [showPosModal, setShowPosModal] = useState(false);
  const [selectedPosOrder, setSelectedPosOrder] = useState<PosOrder | null>(null);

  const statusColors: Record<string, { bg: string; text: string; badge: string }> = {
    Pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-200 text-yellow-800' },
    Packaging: { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-200 text-blue-800' },
    Shipping: { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-200 text-purple-800' },
    Delivered: { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-200 text-green-800' },
    Cancel: { bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-200 text-red-800' },
  };

  const statusFlow = ['Pending', 'Packaging', 'Shipping', 'Delivered'];

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus, currentPage, orderType, searchTerm]);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      if (orderType === 'online') {
        const params = new URLSearchParams();
        if (selectedStatus) params.append('status', selectedStatus);
        if (searchTerm) params.append('search', searchTerm);
        params.append('page', currentPage.toString());

        const response = await api.get<PaginatedResponse>(`/admin/dashboard/orders?${params}`);
        const data = response.data;
        
        setOrders(data.data || []);
        setPosOrders([]);
        setCurrentPage(data.current_page || 1);
        setTotalPages(data.last_page || 1);
        setTotalOrders(data.total || 0);
      } else if (orderType === 'pos') {
        const response = await api.get(`/admin/pos/transactions`, {
          params: {
            q: searchTerm,
            page: currentPage,
          },
        });

        const data = response.data;
        setPosOrders(data.data || []);
        setOrders([]);
        setCurrentPage(data.current_page || 1);
        setTotalPages(data.last_page || 1);
        setTotalOrders(data.total || 0);
      } else {
        // All orders: fetch both, combine counts; pagination tied to max of both sources
        const [onlineRes, posRes] = await Promise.all([
          api.get<PaginatedResponse>(`/admin/dashboard/orders?${new URLSearchParams({ ...(selectedStatus ? { status: selectedStatus } : {}), ...(searchTerm ? { search: searchTerm } : {}), page: currentPage.toString() }).toString()}`),
          api.get(`/admin/pos/transactions`, { params: { q: searchTerm, page: currentPage } }),
        ]);
        const onlineData = onlineRes.data;
        const posData = posRes.data;
        setOrders(onlineData.data || []);
        setPosOrders(posData.data || []);
        const combinedTotal = (onlineData.total || 0) + (posData.total || 0);
        const maxPages = Math.max(onlineData.last_page || 1, posData.last_page || 1);
        setTotalOrders(combinedTotal);
        setTotalPages(maxPages);
        setCurrentPage(Math.min(currentPage, maxPages));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const openStatusModal = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus('');
    setTrackingNumber(order.tracking_number || '');
    setShowStatusModal(true);
  };

  const openPosModal = async (order: PosOrder) => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/pos/transactions/${order.transaction_id}`);
      setSelectedPosOrder(response.data);
      setShowPosModal(true);
    } catch (error) {
      console.error('Error loading POS order:', error);
      showToast('Failed to load POS order details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const closeStatusModal = () => {
    setShowStatusModal(false);
    setSelectedOrder(null);
    setNewStatus('');
    setTrackingNumber('');
  };

  const handleStatusUpdate = async () => {
    if (!selectedOrder) return;

    if (newStatus === 'Shipping' && !trackingNumber.trim()) {
      showToast('Tracking number is required for Shipping status', 'error');
      return;
    }

    try {
      setUpdating(true);
      await api.put(`/admin/dashboard/orders/${selectedOrder.order_id}/status`, {
        status: newStatus,
        tracking_number: trackingNumber || null,
      });

      setOrders((prev) =>
        prev.map((order) =>
          order.order_id === selectedOrder.order_id
            ? { ...order, status: newStatus, tracking_number: trackingNumber || null }
            : order
        )
      );

      showToast('Order status updated successfully', 'success');
      closeStatusModal();
    } catch (error) {
      console.error('Error updating order status:', error);
      showToast('Failed to update order status', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const getNextStatuses = (currentStatus: string): string[] => {
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex === -1) return statusFlow;
    return statusFlow.slice(currentIndex + 1);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatOrderDate = (date: string) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatPosDisplayDate = (date: string) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatPayment = (method?: string) => {
    if (!method) return 'QRIS';
    if (method === 'Virtual_Account') return 'Virtual Account';
    return method;
  };

  const getPosOrderId = (order: PosOrder) => {
    const dateSource = order.date || (order as any).display_date || (order as any).created_at;
    const formatted = dateSource ? formatPosDisplayDate(dateSource as string) : formatPosDisplayDate(new Date().toISOString());
    return order.pos_code || `#POS-${formatted}-${String(order.transaction_id).padStart(3, '0')}`;
  };

  const getPosItemsCount = (order: PosOrder) => order.items?.length || 0;

  const getPosSubtotal = (order: PosOrder) => {
    if (order.items && order.items.length > 0) {
      return order.items.reduce((sum, item) => {
        const unit = Number(item.price || 0);
        const qty = Number(item.quantity || 0);
        const subtotal = item.subtotal ?? unit * qty;
        return sum + subtotal;
      }, 0);
    }
    return order.total_price || 0;
  };

  const getPosProductImage = (item: PosItem) => {
    const image = item.product?.images?.find((img) => {
      const is50ml = img.is_50ml === true || img.is_50ml === 1;
      const isAdditional = img.is_additional === true || img.is_additional === 1;
      if (isAdditional) return false;
      return item.size === '50ml' ? is50ml : !is50ml;
    }) || item.product?.images?.[0];

    if (image?.image_url) {
      return `/products/${image.image_url.split('/').pop()}`;
    }
    return null;
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 p-8">
          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4 items-end justify-between">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Status
                </label>
                <select
                  value={selectedStatus}
                  disabled={orderType === 'pos'}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent disabled:opacity-60"
                >
                  <option value="">All Orders</option>
                  <option value="Pending">Pending</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Shipping">Shipping</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancel">Cancelled</option>
                </select>
              </div>

              <div className="flex-1 min-w-[220px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Type
                </label>
                <select
                  value={orderType}
                  onChange={(e) => {
                    setOrderType(e.target.value as OrderType);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="all">All Orders</option>
                  <option value="online">Online Order</option>
                  <option value="pos">Offline Order (POS)</option>
                </select>
              </div>
            </div>

            <div className="w-full sm:w-96 lg:w-[420px] relative">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Search by Order ID or Customer Name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-black/10 bg-white focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          </div>

          {/* Orders Cards */}
          <div className="space-y-4">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading orders...</div>
            ) : (
              <>
                {(orderType === 'online' || orderType === 'all') && orders.map((order) => (
                    <div key={order.order_id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                      {/* First Row */}
                      <div className="flex items-start justify-between mb-6 pb-6 border-b border-gray-200">
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 font-medium mb-1">Order ID</div>
                          <div className="font-bold text-gray-900 text-lg">#ORD-{formatOrderDate(order.created_at)}-{String(order.order_id).padStart(3, '0')}</div>
                        </div>

                        <div className="flex-1">
                          <div className="text-xs text-gray-500 font-medium mb-1">Customer</div>
                          <div className="font-semibold text-gray-900">{order.user?.name || 'N/A'}</div>
                        </div>

                        <div className="flex-1 flex items-center gap-6 justify-end">
                          {/* Payment */}
                          <div>
                            <div className="text-xs text-gray-500 font-medium mb-1">Payment</div>
                            <div className="px-3 py-1 bg-gray-100 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 inline-block">
                              {formatPayment(order.payment_method)}
                            </div>
                          </div>

                          {/* Status */}
                          <div>
                            <div className="text-xs text-gray-500 font-medium mb-1">Status</div>
                            <span className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold ${statusColors[order.status]?.badge || statusColors.Pending.badge}`}>
                              {order.status}
                            </span>
                          </div>

                          {/* View Button */}
                          <button
                            onClick={() => openStatusModal(order)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors ml-4"
                          >
                            <EyeIcon className="w-5 h-5" />
                            <span className="font-medium">View</span>
                          </button>
                        </div>
                      </div>

                      {/* Second Row */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 font-medium mb-1">Customer Address</div>
                          <div className="text-sm text-gray-700">{order.shipping_address || 'N/A'}</div>
                        </div>

                        <div className="flex-1 flex justify-end gap-12">
                          {/* Items */}
                          <div className="text-right">
                            <div className="text-xs text-gray-500 font-medium mb-1">Items</div>
                            <div className="font-bold text-gray-900">{order.details?.length || 0} product(s)</div>
                          </div>

                          {/* Total */}
                          <div className="text-right">
                            <div className="text-xs text-gray-500 font-medium mb-1">Total</div>
                            <div className="font-bold text-gray-900">{formatCurrency(order.total_price)}</div>
                          </div>

                          {/* Date */}
                          <div className="text-right">
                            <div className="text-xs text-gray-500 font-medium mb-1">Date</div>
                            <div className="text-sm text-gray-700">{formatDate(order.created_at)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                {(orderType === 'pos' || orderType === 'all') && posOrders.map((order) => (
                    <div
                      key={order.transaction_id}
                      className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-6 pb-4 border-b border-gray-100">
                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="flex flex-wrap items-center gap-4">
                            <div>
                              <div className="text-xs text-gray-500 font-medium">Order ID</div>
                              <div className="font-bold text-gray-900 text-lg">{getPosOrderId(order)}</div>
                            </div>
                            <div className="px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700 inline-flex items-center gap-2">
                              <FiShoppingCart className="w-4 h-4" />
                              POS
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 font-medium">Customer Name</div>
                              <div className="font-semibold text-gray-900">{order.customer_name || 'N/A'}</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6 text-sm text-gray-700">
                            <div>
                              <div className="text-xs text-gray-500 font-medium">Phone Number</div>
                              <div>{order.phone || 'N/A'}</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                          <div className="w-full flex items-center justify-end gap-6">
                            <div className="text-right">
                              <div className="text-xs text-gray-500 font-medium">Payment</div>
                              <div className="px-3 py-1 bg-gray-100 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 inline-block">
                                {formatPayment(order.payment_method)}
                              </div>
                            </div>
                            <button
                              onClick={() => openPosModal(order)}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors"
                            >
                              <EyeIcon className="w-5 h-5" />
                              <span className="font-medium">View</span>
                            </button>
                          </div>
                          <div className="flex flex-wrap justify-end gap-4 text-right w-full text-sm text-gray-700">
                            <div>
                              <div className="text-xs text-gray-500 font-medium">Items</div>
                              <div className="font-medium text-gray-900">{getPosItemsCount(order)} product(s)</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 font-medium">Total</div>
                              <div className="font-bold text-gray-900">{formatCurrency(order.total_price)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 font-medium">Date</div>
                              <div className="text-gray-900">{order.date || (order as any).display_date || (order as any).created_at || '-'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                {orders.length === 0 && posOrders.length === 0 && !loading && (
                  <div className="p-8 text-center text-gray-500">No orders found</div>
                )}

                {/* Pagination */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * 20 + 1} to {Math.min(currentPage * 20, totalOrders)} of {totalOrders} orders
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium ${
                              currentPage === page
                                ? 'bg-black text-white'
                                : 'border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status Update Modal (Online Orders) */}
        {showStatusModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-start sticky top-0">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Order #ORD-{formatOrderDate(selectedOrder.created_at)}-{String(selectedOrder.order_id).padStart(3, '0')}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">View and manage order details</p>
                </div>
                <button
                  onClick={closeStatusModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Order Info Grid - 2x2 Layout with Gray Background */}
                <div className="bg-gray-100 rounded-xl p-8">
                  <div className="grid grid-cols-2 gap-8">
                    {/* Top Left - Order Date */}
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-1">Order Date</div>
                      <div className="text-lg font-semibold text-gray-900">{formatDate(selectedOrder.created_at)}</div>
                    </div>
                    
                    {/* Top Right - Subtotal */}
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-600 mb-1">Subtotal</div>
                      <div className="text-lg font-semibold text-gray-900">{formatCurrency(selectedOrder.total_price)}</div>
                    </div>
                    
                    {/* Bottom Left - Payment Method */}
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-2">Payment Method</div>
                      <div className="inline-block">
                        <div className="px-4 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-900">
                          {formatPayment(selectedOrder.payment_method)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Bottom Right - Total */}
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-600 mb-1">Total</div>
                      <div className="text-2xl font-bold text-gray-900">{formatCurrency(selectedOrder.total_price)}</div>
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Customer Information</h3>
                  <div className="bg-gray-50 rounded-xl p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-medium text-gray-600 mb-1">Name</div>
                        <div className="text-sm font-medium text-gray-900">{selectedOrder.user?.name || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-600 mb-1">Phone</div>
                        <div className="text-sm font-medium text-gray-900">{selectedOrder.user?.phone || 'N/A'}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs font-medium text-gray-600 mb-1">Address</div>
                        <div className="text-sm font-medium text-gray-900">{selectedOrder.user?.address_line || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-600 mb-1">District</div>
                        <div className="text-sm font-medium text-gray-900">{selectedOrder.user?.district || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-600 mb-1">City</div>
                        <div className="text-sm font-medium text-gray-900">{selectedOrder.user?.city || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-600 mb-1">Province</div>
                        <div className="text-sm font-medium text-gray-900">{selectedOrder.user?.province || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-600 mb-1">Postal Code</div>
                        <div className="text-sm font-medium text-gray-900">{selectedOrder.user?.postal_code || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Status */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Order Status</h3>
                  <div>
                    <div className="relative mb-4">
                      <select
                        value={newStatus || selectedOrder.status}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg appearance-none focus:ring-2 focus:ring-black focus:border-transparent bg-gray-50"
                      >
                        <option value={selectedOrder.status}>{selectedOrder.status}</option>
                        {getNextStatuses(selectedOrder.status).map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                      <ChevronDownIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    <p className="text-xs text-gray-600">Orders cannot be cancelled once shipping has started</p>
                  </div>
                </div>

                {/* Tracking Number */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Tracking Number (Resi)</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newStatus === 'Shipping' ? trackingNumber : (selectedOrder.tracking_number || '')}
                      onChange={(e) => newStatus === 'Shipping' && setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number"
                      readOnly={newStatus !== 'Shipping' && !!selectedOrder.tracking_number}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-sm bg-gray-50"
                    />
                    <button
                      onClick={() => {
                        const text = newStatus === 'Shipping' ? trackingNumber : (selectedOrder.tracking_number || '');
                        if (text) navigator.clipboard.writeText(text);
                      }}
                      className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                    >
                      <MdContentCopy className="w-5 h-5 text-gray-700" />
                    </button>
                  </div>
                  {newStatus === 'Shipping' && (
                    <p className="text-xs text-gray-600 mt-2">Tracking number is required for Shipping status</p>
                  )}
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => setNewStatus('Packaging')}
                      disabled={!getNextStatuses(selectedOrder.status).includes('Packaging')}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <FiPackage className="w-4 h-4" />
                      Set Packaging
                    </button>
                    <button
                      onClick={() => setNewStatus('Shipping')}
                      disabled={!getNextStatuses(selectedOrder.status).includes('Shipping')}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <FiTruck className="w-4 h-4" />
                      Set Shipping
                    </button>
                    <button
                      onClick={() => setNewStatus('Delivered')}
                      disabled={!getNextStatuses(selectedOrder.status).includes('Delivered')}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <FiCheck className="w-4 h-4" />
                      Set Delivered
                    </button>
                  </div>
                </div>

                {/* Order Items */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Order Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.details?.map((item, idx) => {
                      const image = item.product?.images?.find(img => {
                        const is50ml = img.is_50ml === true || img.is_50ml === 1;
                        const isAdditional = img.is_additional === true || img.is_additional === 1;
                        if (isAdditional) return false;
                        if (item.size === '50ml') return is50ml;
                        return !is50ml;
                      }) || item.product?.images?.[0];
                      
                      const imageUrl = image?.image_url ? `/products/${image.image_url.split('/').pop()}` : null;
                      
                      return (
                        <div key={`${item.detail_id || idx}-${item.product_id}`} className="flex gap-4 items-center">
                          <div className="w-16 h-16 bg-gray-300 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                            {imageUrl ? (
                              <img 
                                src={imageUrl} 
                                alt={item.product?.name || 'Product'} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-gray-500 text-xs">No Image</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm">{item.product?.name || 'Product'}</div>
                            <div className="text-xs text-gray-600">{item.size} • Qty: {item.quantity}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-semibold text-gray-900 text-sm">
                              {formatCurrency(item.price * item.quantity)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 px-6 py-4 flex gap-3 sticky bottom-0 bg-white">
                <button
                  onClick={closeStatusModal}
                  disabled={updating}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-900 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Close
                </button>
                <button
                  onClick={handleStatusUpdate}
                  disabled={updating || newStatus === selectedOrder.status}
                  className="flex-1 px-4 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* POS Order Modal */}
        {showPosModal && selectedPosOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{getPosOrderId(selectedPosOrder)}</h2>
                  <p className="text-sm text-gray-600 mt-1">View and manage order details</p>
                </div>
                <button
                  onClick={() => setShowPosModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-8">
                {/* Summary */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-1">Order Date</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {selectedPosOrder.date || (selectedPosOrder as any).display_date || (selectedPosOrder as any).created_at
                          ? formatPosDisplayDate((selectedPosOrder.date || (selectedPosOrder as any).display_date || (selectedPosOrder as any).created_at) as string)
                          : '-'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-600 mb-1">Subtotal</div>
                      <div className="text-lg font-semibold text-gray-900">{formatCurrency(getPosSubtotal(selectedPosOrder))}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium text-gray-600">Payment Method</div>
                      <div className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-700 inline-block">
                        {formatPayment(selectedPosOrder.payment_method)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-600 mb-1">Total</div>
                      <div className="text-2xl font-bold text-gray-900">{formatCurrency(selectedPosOrder.total_price)}</div>
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer Information</h3>
                  <div className="bg-gray-50 rounded-xl p-6 space-y-3">
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">Name:</div>
                      <div className="text-sm font-semibold text-gray-900">{selectedPosOrder.customer_name || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">Phone:</div>
                      <div className="text-sm text-gray-900">{selectedPosOrder.phone || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Items</h3>
                  <div className="space-y-3">
                    {selectedPosOrder.items?.map((item, idx) => {
                      const imageUrl = getPosProductImage(item);
                      const itemSubtotal = (item.subtotal ?? (item.price * item.quantity)) || 0;
                      return (
                        <div key={`${item.pos_item_id || idx}`} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 shadow-sm bg-white">
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                            {imageUrl ? (
                              <img src={imageUrl} alt={item.product?.name || 'Product'} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-gray-500 text-xs">No Image</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900">{item.product?.name || 'Product'}</div>
                            <div className="text-xs text-gray-600">{item.size} • Qty: {item.quantity}</div>
                          </div>
                          <div className="text-right text-sm font-semibold text-gray-900 flex-shrink-0">
                            {formatCurrency(itemSubtotal)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 px-6 py-4 flex gap-3 bg-white rounded-b-2xl">
                <button
                  onClick={() => setShowPosModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-900 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => setShowPosModal(false)}
                  className="flex-1 px-4 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-900 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
    </AdminLayout>
  );
}
