'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import { ChevronDownIcon, EyeIcon } from '@heroicons/react/24/outline';
import { MdContentCopy, MdCheckCircle } from 'react-icons/md';
import { FiPackage, FiTruck, FiCheck } from 'react-icons/fi';
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

export default function OrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  
  // Modal state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [updating, setUpdating] = useState(false);

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
  }, [selectedStatus, currentPage]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus) params.append('status', selectedStatus);
      params.append('page', currentPage.toString());

      const response = await api.get<PaginatedResponse>(`/admin/dashboard/orders?${params}`);
      const data = response.data;
      
      setOrders(data.data || []);
      setCurrentPage(data.current_page || 1);
      setTotalPages(data.last_page || 1);
      setTotalOrders(data.total || 0);
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

  const closeStatusModal = () => {
    setShowStatusModal(false);
    setSelectedOrder(null);
    setNewStatus('');
    setTrackingNumber('');
  };

  const handleStatusUpdate = async () => {
    if (!selectedOrder) return;

    // Validate: if changing to Shipping, tracking number is required
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

      // Update local state
      setOrders(orders.map(order => 
        order.order_id === selectedOrder.order_id
          ? { ...order, status: newStatus, tracking_number: trackingNumber || null }
          : order
      ));

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 p-8">
          {/* Filters */}
          <div className="mb-6 flex gap-4">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="">All Orders</option>
                <option value="Pending">Pending</option>
                <option value="Packaging">Packaging</option>
                <option value="Shipping">Shipping</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancel">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Orders Cards */}
          <div className="space-y-4">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No orders found</div>
            ) : (
              <>
                {orders.map((order) => (
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
                            QRIS
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

        {/* Status Update Modal */}
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
                          {selectedOrder.payment_method || 'QRIS'}
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
                      // Get the appropriate image for the size (ignoring additional images)
                      const image = item.product?.images?.find(img => {
                        // Handle both boolean and numeric values
                        const is50ml = img.is_50ml === true || img.is_50ml === 1;
                        const isAdditional = img.is_additional === true || img.is_additional === 1;
                        
                        // Skip additional images, only use variant images
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
    </AdminLayout>
  );
}
