'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { SiHackthebox } from 'react-icons/si';
import { GoPerson } from 'react-icons/go';
import { FiPhone, FiPackage } from 'react-icons/fi';
import { IoLocationOutline } from 'react-icons/io5';
import { FaStar, FaRegStar, FaRegStarHalfStroke } from 'react-icons/fa6';
import { LuCopy } from 'react-icons/lu';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api';
import { formatCurrency, roundRating, formatOrderId } from '@/lib/utils';
import Image from 'next/image';

interface OrderItem {
  order_detail_id: number;
  order_id: number;
  product_id: number;
  size: string;
  quantity: number;
  price: number;
  subtotal: number;
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
  total_price: number;
  status: 'Pending' | 'Packaging' | 'Shipping' | 'Delivered' | 'Cancelled';
  phone_number?: string;
  address_line?: string;
  district?: string;
  city?: string;
  province?: string;
  postal_code?: string;
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

interface GroupedOrders {
  in_process: OrderData[];
  shipping: OrderData[];
  completed: OrderData[];
  canceled: OrderData[];
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
  type: 'cancel_order' | 'mark_received' | null;
  order: OrderData | null;
}

function OrderHistoryContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<GroupedOrders>({
    in_process: [],
    shipping: [],
    completed: [],
    canceled: [],
  });
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
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModalState>({
    isOpen: false,
    type: null,
    order: null,
  });
  const [modalReviews, setModalReviews] = useState<Review[]>([]);
  const [allReviewedOrders, setAllReviewedOrders] = useState<Set<number>>(new Set());
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await api.get('/orders');
        
        // Handle both array and grouped object responses
        let ordersData: GroupedOrders;
        if (Array.isArray(response.data)) {
          // If response is an array, group it by status
          ordersData = {
            in_process: response.data.filter((o: OrderData) => ['Pending', 'Packaging'].includes(o.status)),
            shipping: response.data.filter((o: OrderData) => o.status === 'Shipping'),
            completed: response.data.filter((o: OrderData) => o.status === 'Delivered'),
            canceled: response.data.filter((o: OrderData) => o.status === 'Cancelled'),
          };
        } else if (response.data && typeof response.data === 'object') {
          // If response is an object, ensure each property is an array
          ordersData = {
            in_process: Array.isArray(response.data.in_process) ? response.data.in_process : (response.data.in_process ? Object.values(response.data.in_process) : []),
            shipping: Array.isArray(response.data.shipping) ? response.data.shipping : (response.data.shipping ? Object.values(response.data.shipping) : []),
            completed: Array.isArray(response.data.completed) ? response.data.completed : (response.data.completed ? Object.values(response.data.completed) : []),
            canceled: Array.isArray(response.data.canceled) ? response.data.canceled : (response.data.canceled ? Object.values(response.data.canceled) : []),
          };
        } else {
          ordersData = {
            in_process: [],
            shipping: [],
            completed: [],
            canceled: [],
          };
        }
        
        setOrders(ordersData);
        
        // Check review status for all orders
        const reviewedOrderIds = new Set<number>();
        const allOrders = Object.values(ordersData).flat() as OrderData[];
        
        for (const order of allOrders) {
          try {
            if (!order || !order.order_id || !order.details) {
              continue;
            }
            
            // Only check reviews for non-cancelled orders
            if (order.status === 'Cancelled') {
              continue;
            }
            
            try {
              const reviewsResponse = await api.get(`/orders/${order.order_id}/reviews`);
              const reviews = reviewsResponse.data || [];
              const reviewedProductIds = new Set(reviews.map((r: Review) => r.product_id));
              
              // Check if all products in this order have been reviewed
              if (order.details.every(item => reviewedProductIds.has(item.product_id))) {
                reviewedOrderIds.add(order.order_id);
              }
            } catch (reviewError) {
              // If reviews don't exist, order not fully reviewed
            }
          } catch (itemError) {
            console.error(`Error processing order ${order?.order_id}:`, itemError);
          }
        }
        
        setAllReviewedOrders(reviewedOrderIds);
      } catch (error: any) {
        showToast('Failed to load orders', 'error');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchOrders();
    }
  }, [user, showToast]);

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
      case 'Cancelled':
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
      case 'Cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getFilteredOrders = () => {
    const in_process = Array.isArray(orders.in_process) ? orders.in_process : [];
    const shipping = Array.isArray(orders.shipping) ? orders.shipping : [];
    const completed = Array.isArray(orders.completed) ? orders.completed : [];
    const canceled = Array.isArray(orders.canceled) ? orders.canceled : [];
    
    switch (activeTab) {
      case 'all':
        return [...in_process, ...shipping, ...completed, ...canceled];
      case 'pending':
        return in_process.filter(o => o.status === 'Pending');
      case 'packaging':
        return in_process.filter(o => o.status === 'Packaging');
      case 'shipping':
        return shipping;
      case 'delivered':
        return completed;
      case 'cancelled':
        return canceled;
      default:
        return [];
    }
  };

  const formatOrderDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
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

  const handleOpenConfirmation = (type: 'cancel_order' | 'mark_received', order: OrderData) => {
    setConfirmationModal({
      isOpen: true,
      type,
      order,
    });
  };

  const handleCloseConfirmation = () => {
    setConfirmationModal({
      isOpen: false,
      type: null,
      order: null,
    });
  };

  const handleConfirmAction = async (confirmed: boolean) => {
    if (!confirmationModal.order) return;

    if (confirmationModal.type === 'mark_received' && confirmed) {
      try {
        setConfirmLoading(true);
        // Update order status to Delivered
        await api.put(`/orders/${confirmationModal.order.order_id}`, {
          status: 'Delivered',
        });
        showToast('Order marked as received!', 'success');
        
        // Refresh orders
        const response = await api.get('/orders');
        let ordersData: GroupedOrders;
        if (Array.isArray(response.data)) {
          ordersData = {
            in_process: response.data.filter((o: OrderData) => ['Pending', 'Packaging'].includes(o.status)),
            shipping: response.data.filter((o: OrderData) => o.status === 'Shipping'),
            completed: response.data.filter((o: OrderData) => o.status === 'Delivered'),
            canceled: response.data.filter((o: OrderData) => o.status === 'Cancelled'),
          };
        } else {
          ordersData = {
            in_process: Array.isArray(response.data.in_process) ? response.data.in_process : (response.data.in_process ? Object.values(response.data.in_process) : []),
            shipping: Array.isArray(response.data.shipping) ? response.data.shipping : (response.data.shipping ? Object.values(response.data.shipping) : []),
            completed: Array.isArray(response.data.completed) ? response.data.completed : (response.data.completed ? Object.values(response.data.completed) : []),
            canceled: Array.isArray(response.data.canceled) ? response.data.canceled : (response.data.canceled ? Object.values(response.data.canceled) : []),
          };
        }
        setOrders(ordersData);
        handleCloseConfirmation();
      } catch (error) {
        showToast('Failed to update order', 'error');
        console.error(error);
      } finally {
        setConfirmLoading(false);
      }
    } else {
      handleCloseConfirmation();
    }
  };

  const handlePayNow = async (order: OrderData) => {
    // Redirect to payment page
    router.push(`/checkout?items=${order.details.map(d => d.order_detail_id).join(',')}}`);
  };

  const handleCancelOrder = async (order: OrderData) => {
    handleOpenConfirmation('cancel_order', order);
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

      showToast(reviewModal.mode === 'write' ? 'Reviews submitted successfully!' : 'Reviews updated successfully!', 'success');
      handleCloseReviewModal();
      // Refresh orders
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error: any) {
      showToast('Failed to submit reviews', 'error');
      console.error(error);
    }
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
                    <h3 className="text-base font-bold text-gray-900">Order #{formatOrderId(order.order_id, order.created_at)}</h3>
                    <p className="text-xs text-gray-500 mt-1">{formatOrderDate(order.created_at)}</p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </div>
                </div>

                {/* Tracking Number - Show if available */}
                {order.tracking_number && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FiPackage className="text-gray-600" size={18} />
                      <div>
                        <p className="text-xs text-gray-600">Tracking</p>
                        <p className="text-sm font-medium text-gray-900">{order.tracking_number}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(order.tracking_number);
                        showToast('Tracking number copied!', 'success');
                      }}
                      className="p-2 hover:bg-gray-200 rounded-lg transition"
                      title="Copy tracking number"
                    >
                      <LuCopy size={18} className="text-gray-600" />
                    </button>
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
                        <div className="text-right ml-4 flex-shrink-0">
                          <p className="text-xs text-gray-600">Unit Price</p>
                          <p className="font-semibold text-gray-900 text-sm">{formatCurrency(item.price)}</p>
                        </div>
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
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleOpenDetails(order)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      See Details
                    </button>
                    {order.status === 'Pending' ? (
                      <button
                        onClick={() => handleCancelOrder(order)}
                        className="flex-1 px-4 py-2.5 border border-red-300 text-red-600 rounded-full text-sm font-medium hover:bg-red-50 transition-colors"
                      >
                        Cancel Order
                      </button>
                    ) : order.status === 'Packaging' ? (
                      <button
                        onClick={() => handleCancelOrder(order)}
                        className="flex-1 px-4 py-2.5 border border-red-300 text-red-600 rounded-full text-sm font-medium hover:bg-red-50 transition-colors"
                      >
                        Cancel Order
                      </button>
                    ) : order.status === 'Shipping' ? (
                      <button
                        onClick={() => handleOpenConfirmation('mark_received', order)}
                        className="flex-1 px-4 py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
                      >
                        Mark as Received
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenReview(order)}
                        className="flex-1 px-4 py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
                        id={`review-button-${order.order_id}`}
                      >
                        {allReviewedOrders.has(order.order_id) ? 'Edit Review' : 'Give Review'}
                      </button>
                    )}
                  </div>
                  {order.status === 'Pending' && (
                    <button
                      onClick={() => handlePayNow(order)}
                      className="w-full px-4 py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                      Pay Now
                    </button>
                  )}
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
                  <div className="text-sm text-gray-600">Order #{formatOrderId(modal.order.order_id, modal.order.created_at)}</div>

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
                          <p className="text-sm font-medium text-gray-900">
                            {modal.order.phone_number || modal.order.user?.phone || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="bg-gray-100 rounded-2xl p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Shipping Address</h3>
                    <div className="flex gap-3">
                      <IoLocationOutline className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-700">
                        {modal.order.address_line ? (
                          <>
                            <p>{modal.order.address_line}</p>
                            <p>{modal.order.district}</p>
                            <p>{modal.order.city}, {modal.order.province} {modal.order.postal_code}</p>
                          </>
                        ) : (
                          <p>No address information</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tracking Information */}
                  {modal.order.tracking_number && (
                    <div className="bg-purple-50 rounded-2xl p-6">
                      <h3 className="text-base font-semibold text-gray-900 mb-4">Tracking Information</h3>
                      <div className="flex items-center gap-3">
                        <FiPackage className="w-5 h-5 text-purple-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 mb-1">Tracking Number</p>
                          <p className="text-sm font-semibold text-gray-900">{modal.order.tracking_number}</p>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(modal.order!.tracking_number!);
                            showToast('Tracking number copied!', 'success');
                          }}
                          className="p-2 hover:bg-purple-100 rounded-lg transition flex-shrink-0"
                          title="Copy tracking number"
                        >
                          <LuCopy size={18} className="text-purple-600" />
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
                            <p className="text-xs text-gray-600 mt-2">Subtotal</p>
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.subtotal)}</p>
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
                                  {[1, 2, 3, 4, 5].map((star) => {
                                    const roundedRating = roundRating(review.stars);
                                    const hasHalfStar = Math.abs(roundedRating - Math.floor(roundedRating) - 0.5) < 0.01;
                                    const starPosition = star - 1;
                                    
                                    // Full star
                                    if (starPosition < Math.floor(roundedRating)) {
                                      return (
                                        <FaStar
                                          key={star}
                                          className="w-4 h-4 text-black"
                                        />
                                      );
                                    }
                                    
                                    // Half star
                                    if (hasHalfStar && starPosition === Math.floor(roundedRating)) {
                                      return (
                                        <FaRegStarHalfStroke
                                          key={star}
                                          className="w-4 h-4 text-black"
                                        />
                                      );
                                    }
                                    
                                    // Empty star
                                    return (
                                      <FaRegStar
                                        key={star}
                                        className="w-4 h-4 text-black"
                                      />
                                    );
                                  })}
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
                        <span className="font-medium text-gray-900">{formatCurrency(modal.order!.details.reduce((sum, item) => sum + item.subtotal, 0))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tax (5%)</span>
                        <span className="font-medium text-gray-900">{formatCurrency(modal.order!.details.reduce((sum, item) => sum + item.subtotal, 0) * 0.05)}</span>
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

      {/* Confirmation Modal */}
      {confirmationModal.isOpen && confirmationModal.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 pointer-events-auto" onClick={handleCloseConfirmation} />
          <div className="relative w-full max-w-md mx-auto p-4 pointer-events-auto z-50">
            <div className="relative bg-white rounded-2xl shadow-2xl p-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {confirmationModal.type === 'mark_received' ? 'Confirm Order Received' : 'Cancel Order'}
                </h2>
                <p className="text-gray-600 text-sm mb-6">
                  {confirmationModal.type === 'mark_received' 
                    ? 'Has your order arrived correctly and in good condition?'
                    : 'Are you sure you want to cancel this order?'
                  }
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleConfirmAction(false)}
                    disabled={confirmLoading}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {confirmationModal.type === 'mark_received' ? 'Not Yet' : 'No'}
                  </button>
                  <button
                    onClick={() => handleConfirmAction(true)}
                    disabled={confirmLoading}
                    className={`flex-1 px-4 py-2.5 text-white rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${
                      confirmationModal.type === 'cancel_order'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-black hover:bg-gray-800'
                    }`}
                  >
                    {confirmLoading ? 'Loading...' : confirmationModal.type === 'mark_received' ? 'Yes, Received' : 'Yes, Cancel'}
                  </button>
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
                                  <FaStar className="w-6 h-6 text-black" />
                                ) : (
                                  <FaRegStar className="w-6 h-6 text-black" />
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



