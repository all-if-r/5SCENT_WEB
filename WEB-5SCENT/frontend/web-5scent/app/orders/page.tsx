'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SiHackthebox } from 'react-icons/si';
import { GoPerson } from 'react-icons/go';
import { FiPhone } from 'react-icons/fi';
import { IoLocationOutline } from 'react-icons/io5';
import { IoMdStar, IoMdStarOutline } from 'react-icons/io';
import { MdOutlineContentCopy } from 'react-icons/md';
import { LiaBoxSolid } from 'react-icons/lia';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';

interface OrderItem {
  order_detail_id: number;
  order_id: number;
  product_id: number;
  size: string;
  quantity: number;
  price: number;
  product: {
    product_id: number;
    name: string;
    images: Array<{
      image_id: number;
      image_url: string;
      is_50ml: number;
    }>;
  };
}

interface OrderData {
  order_id: number;
  user_id: number;
  subtotal: number;
  total_price: number;
  status: 'Pending' | 'Packaging' | 'Shipping' | 'Delivered' | 'Cancel';
  shipping_address: string;
  tracking_number?: string;
  payment_method?: 'QRIS' | 'Virtual_Account' | 'Cash';
  created_at: string;
  updated_at: string;
  details: OrderItem[];
  user?: {
    name: string;
    phone?: string;
  };
  payment?: {
    payment_id: number;
    method: string;
    status: string;
  };
}

type TabType = 'all' | 'pending' | 'packaging' | 'shipping' | 'delivered' | 'cancelled';

interface Review {
  rating_id: number;
  user_id: number;
  product_id: number;
  order_id: number;
  stars: number;
  comment: string;
  created_at: string;
}

interface ProductReview {
  product_id: number;
  rating: number;
  comment: string;
}

interface ModalState {
  isOpen: boolean;
  order: OrderData | null;
}

interface ReviewModalState {
  isOpen: boolean;
  order: OrderData | null;
  reviews: Map<number, ProductReview>;
  mode: 'write' | 'edit';
  existingReviews: Review[];
}

interface ConfirmationModalState {
  isOpen: boolean;
  type: 'received' | 'cancel' | null;
  order: OrderData | null;
}

function OrderHistoryContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    order: null,
  });
  const [reviewModal, setReviewModal] = useState<ReviewModalState>({
    isOpen: false,
    order: null,
    reviews: new Map(),
    mode: 'write',
    existingReviews: [],
  });
  const [modalReviews, setModalReviews] = useState<Review[]>([]);
  const [allReviewedOrders, setAllReviewedOrders] = useState<Set<number>>(new Set());
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModalState>({
    isOpen: false,
    type: null,
    order: null,
  });

  const statusQueryMap: Record<TabType, string | undefined> = {
    all: 'all',
    pending: 'pending',
    packaging: 'packaging',
    shipping: 'shipping',
    delivered: 'delivered',
    cancelled: 'cancel',
  };

  const normalizeOrdersResponse = (data: any): OrderData[] => {
    if (Array.isArray(data)) {
      return data as OrderData[];
    }

    if (data && typeof data === 'object') {
      return Object.values(data).flatMap((value) =>
        Array.isArray(value) ? (value as OrderData[]) : []
      );
    }

    return [];
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loadOrders = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await api.get('/orders', {
        params: statusQueryMap[activeTab] ? { status: statusQueryMap[activeTab] } : {},
      });

      const normalizedOrders = normalizeOrdersResponse(response.data)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setOrders(normalizedOrders);

      // Check review status for all orders
      const reviewedOrderIds = new Set<number>();
      for (const order of normalizedOrders) {
        if (!order.order_id) continue;

        try {
          const reviewsResponse = await api.get(`/orders/${order.order_id}/reviews`);
          const reviews = reviewsResponse.data || [];
          const reviewedProductIds = new Set(reviews.map((r: Review) => r.product_id));
          
          // Check if all products in this order have been reviewed
          if (order.details.every(item => reviewedProductIds.has(item.product_id))) {
            reviewedOrderIds.add(order.order_id);
            // Update button text immediately
            const button = document.getElementById(`review-button-${order.order_id}`);
            if (button) {
              button.textContent = 'Edit Review';
            }
          }
        } catch (error) {
          // If reviews don't exist, order not fully reviewed
        }
      }
      setAllReviewedOrders(reviewedOrderIds);
    } catch (error: any) {
      showToast('Failed to load orders', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [user, activeTab, showToast]);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user, activeTab, loadOrders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'Packaging':
        return 'bg-blue-100 text-blue-700';
      case 'Shipping':
        return 'bg-purple-100 text-purple-700';
      case 'Delivered':
        return 'bg-green-100 text-green-700';
      case 'Cancel':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'Pending';
      case 'Packaging':
        return 'Packaging';
      case 'Shipping':
        return 'Shipping';
      case 'Delivered':
        return 'Delivered';
      case 'Cancel':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getFilteredOrders = () => {
    const sortedOrders = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    switch (activeTab) {
      case 'all':
        return sortedOrders;
      case 'pending':
        return sortedOrders.filter(o => o.status === 'Pending');
      case 'packaging':
        return sortedOrders.filter(o => o.status === 'Packaging');
      case 'shipping':
        return sortedOrders.filter(o => o.status === 'Shipping');
      case 'delivered':
        return sortedOrders.filter(o => o.status === 'Delivered');
      case 'cancelled':
        return sortedOrders.filter(o => o.status === 'Cancel');
      default:
        return [];
    }
  };

  const formatOrderDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const formatOrderCode = (orderId: number, createdAt?: string) => {
    const year = createdAt ? new Date(createdAt).getFullYear() : 2024;
    return `ORD-${year}-${String(orderId).padStart(3, '0')}`;
  };

  const handleOpenDetails = (order: OrderData) => {
    setModal({
      isOpen: true,
      order: order,
    });
    // Fetch reviews for this order
    checkExistingReviews(order.order_id).then(reviews => {
      setModalReviews(reviews);
    });
  };

  const handleCloseModal = () => {
    setModal({
      isOpen: false,
      order: null,
    });
  };

  const getProductImage = (item: OrderItem) => {
    const image = item.product.images.find((img) => 
      (item.size === '30ml' && img.is_50ml === 0) ||
      (item.size === '50ml' && img.is_50ml === 1)
    ) || item.product.images[0];
    return image?.image_url || '/placeholder.jpg';
  };

  const checkExistingReviews = async (orderId: number) => {
    try {
      const response = await api.get(`/orders/${orderId}/reviews`);
      return response.data || [];
    } catch (error: any) {
      // If 404, endpoint might not exist yet - return empty array
      if (error.response?.status === 404) {
        console.warn('Reviews endpoint not found, treating as no reviews');
        return [];
      }
      console.error('Error fetching reviews:', error);
      return [];
    }
  };

  const handleOpenReview = async (order: OrderData) => {
    const existingReviews = await checkExistingReviews(order.order_id);
    const reviewedProductIds = new Set(existingReviews.map((r: Review) => r.product_id));
    const allProductsReviewed = order.details.every(item => reviewedProductIds.has(item.product_id));

    const initialReviews = new Map<number, ProductReview>();
    existingReviews.forEach((review: Review) => {
      initialReviews.set(review.product_id, {
        product_id: review.product_id,
        rating: review.stars,
        comment: review.comment,
      });
    });

    setReviewModal({
      isOpen: true,
      order: order,
      reviews: initialReviews,
      mode: allProductsReviewed ? 'edit' : 'write',
      existingReviews: existingReviews,
    });
  };

  const handleCloseReviewModal = () => {
    setReviewModal({
      isOpen: false,
      order: null,
      reviews: new Map(),
      mode: 'write',
      existingReviews: [],
    });
  };

  const updateProductReview = (productId: number, rating: number, comment: string) => {
    const newReviews = new Map(reviewModal.reviews);
    newReviews.set(productId, {
      product_id: productId,
      rating: rating,
      comment: comment,
    });
    setReviewModal({
      ...reviewModal,
      reviews: newReviews,
    });
  };

  const isReviewComplete = () => {
    if (!reviewModal.order) return false;
    
    for (const item of reviewModal.order.details) {
      const review = reviewModal.reviews.get(item.product_id);
      if (!review || review.rating === 0 || !review.comment.trim()) {
        return false;
      }
    }
    return true;
  };

  const handleSubmitReviews = async () => {
    if (!isReviewComplete()) {
      showToast('Please rate and review all products before submitting', 'error');
      return;
    }

    if (!reviewModal.order || !user) return;

    try {
      const reviewsToSubmit = Array.from(reviewModal.reviews.values());
      
      for (const review of reviewsToSubmit) {
        if (reviewModal.mode === 'write') {
          await api.post('/ratings', {
            user_id: user.user_id,
            product_id: review.product_id,
            order_id: reviewModal.order.order_id,
            stars: review.rating,
            comment: review.comment,
          });
        } else {
          // Edit mode - update existing review
          const existingReview = reviewModal.existingReviews.find(r => r.product_id === review.product_id);
          if (existingReview) {
            await api.put(`/ratings/${existingReview.rating_id}`, {
              stars: review.rating,
              comment: review.comment,
            });
          }
        }
      }

      // Immediately update the state to mark this order as reviewed
      if (reviewModal.order) {
        setAllReviewedOrders(prev => new Set([...prev, reviewModal.order!.order_id]));
      }

      showToast(reviewModal.mode === 'write' ? 'Reviews submitted successfully!' : 'Reviews updated successfully!', 'success');
      handleCloseReviewModal();
      // Refresh orders for the current tab
      await loadOrders();
    } catch (error: any) {
      showToast('Failed to submit reviews', 'error');
      console.error(error);
    }
  };

  const handleOpenConfirmation = (type: 'received' | 'cancel', order: OrderData) => {
    setConfirmationModal({
      isOpen: true,
      type: type,
      order: order,
    });
  };

  const handleCloseConfirmation = () => {
    setConfirmationModal({
      isOpen: false,
      type: null,
      order: null,
    });
  };

  const handleConfirmReceived = async () => {
    if (!confirmationModal.order || !user) return;

    try {
      await api.post(`/orders/${confirmationModal.order.order_id}/finish`);
      
      // Update the order in state optimistically
      setOrders(prev => prev.map(o => 
        o.order_id === confirmationModal.order!.order_id
          ? { ...o, status: 'Delivered' }
          : o
      ));

      showToast('Order marked as received', 'success');
      handleCloseConfirmation();
    } catch (error: any) {
      showToast('Failed to confirm order', 'error');
      console.error(error);
    }
  };

  const handleConfirmCancel = async () => {
    if (!confirmationModal.order || !user) return;

    try {
      await api.post(`/orders/${confirmationModal.order.order_id}/cancel`);
      
      // Update the order in state optimistically
      setOrders(prev => prev.map(o => 
        o.order_id === confirmationModal.order!.order_id
          ? { ...o, status: 'Cancel' }
          : o
      ));

      showToast('Order cancelled', 'success');
      handleCloseConfirmation();
    } catch (error: any) {
      showToast('Failed to cancel order', 'error');
      console.error(error);
    }
  };

  const copyTrackingNumber = (trackingNumber: string) => {
    navigator.clipboard.writeText(trackingNumber);
    showToast('Tracking number copied', 'success');
  };

  const getActionButton = (order: OrderData) => {
    if (order.status === 'Shipping') {
      return (
        <button
          onClick={() => handleOpenConfirmation('received', order)}
          className="flex-1 px-4 py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Mark as Received
        </button>
      );
    } else if (order.status === 'Packaging') {
      return (
        <button
          onClick={() => handleOpenConfirmation('cancel', order)}
          className="flex-1 px-4 py-2.5 border border-red-500 text-red-500 rounded-full text-sm font-medium hover:bg-red-50 transition-colors"
        >
          Cancel Order
        </button>
      );
    } else if (order.status === 'Delivered') {
      const isReviewed = allReviewedOrders.has(order.order_id);
      return (
        <button
          onClick={() => handleOpenReview(order)}
          className="flex-1 px-4 py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
          id={`review-button-${order.order_id}`}
        >
          {isReviewed ? 'Edit Review' : 'Give Review'}
        </button>
      );
    } else if (order.status === 'Pending') {
      return (
        <button
          disabled
          className="flex-1 px-4 py-2.5 bg-gray-300 text-gray-500 rounded-full text-sm font-medium cursor-not-allowed"
        >
          Processing
        </button>
      );
    }

    return null;
  };

  const filteredOrders = getFilteredOrders();

  if (authLoading) {
    return (
      <main className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-header font-bold text-gray-900 mb-3">Order History</h1>
          <div className="w-20 h-1.5 bg-black rounded-full"></div>
        </div>

        {/* Tabs */}
        <div className="inline-flex gap-0 mb-8 p-1 bg-gray-100 rounded-full overflow-x-auto">
          {[
            { id: 'all' as TabType, label: 'All' },
            { id: 'pending' as TabType, label: 'Pending' },
            { id: 'packaging' as TabType, label: 'Packaging' },
            { id: 'shipping' as TabType, label: 'Shipping' },
            { id: 'delivered' as TabType, label: 'Delivered' },
            { id: 'cancelled' as TabType, label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {loading ? (
            <div className="animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gray-100 rounded-lg mb-4"></div>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <SiHackthebox className="w-24 h-24 text-gray-300 mb-4" />
              <p className="text-gray-500 text-center">No {activeTab === 'all' ? '' : activeTab} orders</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.order_id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                {/* Header Row */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Order #{formatOrderCode(order.order_id, order.created_at)}</h3>
                    <p className="text-xs text-gray-500 mt-1">{formatOrderDate(order.created_at)}</p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </div>
                </div>

                {/* Tracking Row - Show for Shipping and Delivered orders */}
                {order.tracking_number && (order.status === 'Shipping' || order.status === 'Delivered') && (
                  <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
                    <LiaBoxSolid className="w-5 h-5 text-gray-600" />
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <p>
                        Tracking: <span className="font-medium">{order.tracking_number}</span>
                      </p>
                      <button
                        onClick={() => copyTrackingNumber(order.tracking_number!)}
                        className="text-gray-600 hover:text-gray-900 transition-colors"
                        title="Copy tracking number"
                      >
                        <MdOutlineContentCopy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Products List */}
                <div className="mb-6">
                  {order.details.map((item) => (
                    <div key={item.order_detail_id} className="flex gap-3 mb-3">
                      <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={getProductImage(item)}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{item.product.name}</p>
                          <p className="text-xs text-gray-600">{item.size} × {item.quantity}</p>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm ml-4 flex-shrink-0">{formatCurrency(item.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Divider before Payment Method */}
                <div className="border-t border-gray-200 mb-4 pt-4">
                  {/* Payment Method and Total */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Payment Method</span>
                      <span className="font-medium text-gray-900">{order.payment_method?.replace('_', ' ') || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(order.total_price)}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleOpenDetails(order)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    See Details
                  </button>
                  {getActionButton(order)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <Footer />

      {/* Order Details Modal */}
      {modal.isOpen && modal.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 pointer-events-auto" onClick={handleCloseModal} />
          <div className="relative w-full max-w-2xl mx-auto p-4 pointer-events-auto z-50">
              <div className="relative bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Close Button */}
                <div className="sticky top-0 flex justify-between items-center p-6 border-b border-gray-200 bg-white rounded-t-2xl z-10">
                  <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-4">
                  {/* Order Code */}
                  <div className="text-sm text-gray-600">Order #{formatOrderCode(modal.order.order_id, modal.order.created_at)}</div>

                  {/* Customer Information */}
                  <div className="bg-gray-100 rounded-2xl p-6 space-y-4">
                    <h3 className="text-base font-semibold text-gray-900">Customer Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <GoPerson className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-600">Name</p>
                          <p className="text-sm font-medium text-gray-900">{modal.order.user?.name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FiPhone className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-600">Phone</p>
                          <p className="text-sm font-medium text-gray-900">{modal.order.user?.phone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="bg-gray-100 rounded-2xl p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Shipping Address</h3>
                    <div className="flex gap-3">
                      <IoLocationOutline className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700">{modal.order.shipping_address}</p>
                    </div>
                  </div>

                  {/* Tracking Information - Show only if tracking_number exists */}
                  {modal.order.tracking_number && (
                    <div className="bg-purple-100 rounded-2xl p-6">
                      <h3 className="text-base font-semibold text-gray-900 mb-4">Tracking Information</h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <LiaBoxSolid className="w-5 h-5 text-gray-600" />
                          <div>
                            <p className="text-xs text-gray-600">Tracking Number</p>
                            <p className="text-sm font-medium text-gray-900">{modal.order.tracking_number}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => copyTrackingNumber(modal.order!.tracking_number!)}
                          className="text-gray-600 hover:text-gray-900 transition-colors"
                          title="Copy tracking number"
                        >
                          <MdOutlineContentCopy className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="bg-gray-100 rounded-2xl p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Order Items</h3>
                    <div className="space-y-3">
                      {modal.order!.details.map((item) => (
                        <div key={item.order_detail_id} className="flex gap-4">
                          <div className="relative w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={getProductImage(item)}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                            <p className="text-xs text-gray-600">Size: {item.size}</p>
                            <p className="text-xs text-gray-600">Quantity: {item.quantity}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-gray-600">Price</p>
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.price)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Your Reviews - Show if any reviews exist */}
                  {modalReviews.length > 0 && (
                    <div className="bg-gray-100 rounded-2xl p-6">
                      <h3 className="text-base font-semibold text-gray-900 mb-4">Your Reviews</h3>
                      <div className="space-y-4">
                        {modalReviews.map((review) => {
                          const product = modal.order!.details.find(d => d.product_id === review.product_id);
                          if (!product) return null;

                          return (
                            <div key={review.rating_id} className="flex gap-4">
                              <div className="relative w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0">
                                <Image
                                  src={getProductImage(product)}
                                  alt={product.product.name}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900">{product.product.name}</p>
                                <div className="flex gap-0.5 mt-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <span key={star}>
                                      {star <= review.stars ? (
                                        <IoMdStar className="w-4 h-4 text-black" />
                                      ) : (
                                        <IoMdStarOutline className="w-4 h-4 text-gray-300" />
                                      )}
                                    </span>
                                  ))}
                                </div>
                                <p className="text-xs text-gray-600 mt-2">{review.comment}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Order Summary */}
                  <div className="bg-gray-100 rounded-2xl p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Order Summary</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Items</span>
                        <span className="font-medium text-gray-900">{modal.order!.details.reduce((sum, item) => sum + item.quantity, 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium text-gray-900">{formatCurrency(modal.order!.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tax (5%)</span>
                        <span className="font-medium text-gray-900">{formatCurrency(modal.order!.subtotal * 0.05)}</span>
                      </div>
                      <div className="border-t border-gray-300 pt-3 mt-3 flex justify-between">
                        <span className="font-semibold text-gray-900">Total Amount</span>
                        <span className="text-lg font-bold text-gray-900">{formatCurrency(modal.order!.total_price)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment & Status */}
                  <div className="bg-gray-100 rounded-2xl p-6 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method</span>
                      <span className="font-medium text-gray-900">{modal.order!.payment_method?.replace('_', ' ') || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Order Status</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(modal.order!.status)}`}>
                        {getStatusLabel(modal.order!.status)}
                      </span>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal.isOpen && reviewModal.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 pointer-events-auto" onClick={handleCloseReviewModal} />
          <div className="relative w-full max-w-2xl mx-auto p-4 pointer-events-auto z-50">
            <div className="relative bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              {/* Close Button */}
              <div className="sticky top-0 flex justify-between items-center p-6 border-b border-gray-200 bg-white rounded-t-2xl z-10">
                <h2 className="text-xl font-bold text-gray-900">
                  {reviewModal.mode === 'write' ? 'Write Your Reviews' : 'Edit Your Reviews'}
                </h2>
                <button
                  onClick={handleCloseReviewModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                <p className="text-sm text-gray-600">
                  {reviewModal.mode === 'write' ? 'Please rate and review each product from your order' : 'Please rate and review each product from your order'}
                </p>

                {/* Product Reviews */}
                <div className="space-y-6">
                  {reviewModal.order.details.map((item) => {
                    const review = reviewModal.reviews.get(item.product_id) || {
                      product_id: item.product_id,
                      rating: 0,
                      comment: '',
                    };

                    return (
                      <div key={item.product_id} className={reviewModal.mode === 'edit' ? 'bg-gray-100 rounded-2xl p-6' : 'space-y-3'}>
                        {/* Product Header */}
                        <div className="flex gap-4 mb-4">
                          <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={getProductImage(item)}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{item.product.name}</p>
                            <p className="text-xs text-gray-600">Product {reviewModal.order!.details.indexOf(item) + 1} of {reviewModal.order!.details.length}</p>
                          </div>
                        </div>

                        {/* Rating */}
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-3">Your Rating <span className="text-red-500">*</span></p>
                          <div className="flex gap-2 -mt-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => updateProductReview(item.product_id, star, review.comment)}
                                className="text-2xl transition-colors"
                              >
                                {star <= review.rating ? (
                                  <IoMdStar className="w-6 h-6 text-black" />
                                ) : (
                                  <IoMdStarOutline className="w-6 h-6 text-gray-300" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Review Text */}
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-2">Your Review <span className="text-red-500">*</span></p>
                          <textarea
                            value={review.comment}
                            onChange={(e) => updateProductReview(item.product_id, review.rating, e.target.value)}
                            placeholder={`Share your experience with ${item.product.name}...`}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none bg-white"
                            rows={4}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Validation Error Message */}
                {reviewModal.isOpen && !isReviewComplete() && (
                  <div className="text-center text-red-500 text-sm font-medium">
                    Please rate and review all products before submitting
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSubmitReviews}
                  className="w-full px-4 py-3 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  {reviewModal.mode === 'write' ? 'Submit All Reviews' : 'Update All Reviews'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Order Received */}
      {confirmationModal.isOpen && confirmationModal.type === 'received' && confirmationModal.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 pointer-events-auto" onClick={handleCloseConfirmation} />
          <div className="relative w-full max-w-md mx-auto p-4 pointer-events-auto z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 text-center">Confirm Order Received</h2>
              <p className="text-sm text-gray-600 text-center">Has your order arrived correctly and in good condition?</p>
              <div className="flex gap-3">
                <button
                  onClick={handleCloseConfirmation}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Not Yet
                </button>
                <button
                  onClick={handleConfirmReceived}
                  className="flex-1 px-4 py-3 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Yes, Received
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Cancel Order */}
      {confirmationModal.isOpen && confirmationModal.type === 'cancel' && confirmationModal.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 pointer-events-auto" onClick={handleCloseConfirmation} />
          <div className="relative w-full max-w-md mx-auto p-4 pointer-events-auto z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 text-center">Cancel Order</h2>
              <p className="text-sm text-gray-600 text-center">Are you sure you want to cancel this order? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={handleCloseConfirmation}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Keep Order
                </button>
                <button
                  onClick={handleConfirmCancel}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
        <Footer />
      </main>
    }>
      <OrderHistoryContent />
    </Suspense>
  );
}



