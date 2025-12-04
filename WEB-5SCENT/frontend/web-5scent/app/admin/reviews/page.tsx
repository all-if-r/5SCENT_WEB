'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import {
  XMarkIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { FaStar } from 'react-icons/fa6';
import { FiCalendar } from 'react-icons/fi';

interface Review {
  rating_id: number;
  user_id: number;
  product_id: number;
  order_id: number;
  stars: number;
  comment: string;
  created_at?: string;
  user?: {
    user_id: number;
    name: string;
    email: string;
  };
  product?: {
    product_id: number;
    name: string;
  };
  is_visible?: boolean;
}

interface ReviewsData {
  reviews: Review[];
  total: number;
}

export default function ReviewsPage() {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/reviews');
      const data: ReviewsData = response.data;
      setReviews(Array.isArray(data) ? data : data.reviews || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      showToast('Failed to load reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (review: Review) => {
    setSelectedReview(review);
    setShowDetailsModal(true);
  };

  const handleToggleVisibility = async (rating_id: number, currentVisibility: boolean) => {
    try {
      await api.put(`/admin/reviews/${rating_id}/visibility`, {
        is_visible: !currentVisibility,
      });
      setReviews(
        reviews.map((r) =>
          r.rating_id === rating_id ? { ...r, is_visible: !currentVisibility } : r
        )
      );
      showToast(
        `Review ${!currentVisibility ? 'shown' : 'hidden'} successfully`,
        'success'
      );
    } catch (error) {
      console.error('Error toggling visibility:', error);
      showToast('Failed to update review visibility', 'error');
    }
  };

  const handleDeleteReview = async (rating_id: number) => {
    try {
      await api.delete(`/admin/reviews/${rating_id}`);
      setReviews(reviews.filter((r) => r.rating_id !== rating_id));
      setDeleteConfirm(null);
      showToast('Review deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting review:', error);
      showToast('Failed to delete review', 'error');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toISOString().split('T')[0];
  };

  const truncateComment = (comment: string, length: number = 60) => {
    return comment.length > length ? comment.substring(0, length) + '...' : comment;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar
            key={star}
            size={16}
            className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
          />
        ))}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reviews Management</h1>
            <p className="text-gray-500 text-sm mt-1">Monitor customer feedback</p>
          </div>
          
          {/* Date Selector */}
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition">
            <FiCalendar className="text-gray-600" size={18} />
            <span className="text-gray-700 font-medium">
              {new Date(selectedDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </button>
        </div>

        {/* Reviews Table Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No reviews found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Comment
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reviews.map((review) => (
                    <tr key={review.rating_id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {review.user?.name || 'Unknown Customer'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {review.product?.name || 'Unknown Product'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {renderStars(review.stars)}
                          <span className="text-xs text-gray-600 ml-2">{review.stars}/5</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {truncateComment(review.comment)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 text-right">
                        {formatDate(review.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(review)}
                            className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition"
                          >
                            View
                          </button>
                          <button
                            onClick={() =>
                              handleToggleVisibility(
                                review.rating_id,
                                review.is_visible ?? true
                              )
                            }
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded transition"
                            title={
                              review.is_visible ?? true ? 'Hide review' : 'Show review'
                            }
                          >
                            {review.is_visible ?? true ? (
                              <EyeIcon size={18} />
                            ) : (
                              <EyeSlashIcon size={18} />
                            )}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(review.rating_id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                            title="Delete review"
                          >
                            <TrashIcon size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Review Details Modal */}
      {showDetailsModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
            {/* Close Button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon size={24} />
              </button>
            </div>

            {/* Modal Header */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Review Details</h2>
              <p className="text-sm text-gray-500 mt-1">Full review information</p>
            </div>

            {/* Customer and Date Row */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs text-gray-500 font-semibold mb-1">
                  Customer
                </label>
                <p className="text-sm font-bold text-gray-900">
                  {selectedReview.user?.name || 'Unknown'}
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-semibold mb-1">
                  Date
                </label>
                <p className="text-sm font-bold text-gray-900">
                  {formatDate(selectedReview.created_at)}
                </p>
              </div>
            </div>

            {/* Product */}
            <div className="mb-6">
              <label className="block text-xs text-gray-500 font-semibold mb-2">
                Product
              </label>
              <p className="text-sm font-bold text-gray-900">
                {selectedReview.product?.name || 'Unknown'}
              </p>
            </div>

            {/* Rating */}
            <div className="mb-6">
              <label className="block text-xs text-gray-500 font-semibold mb-2">
                Rating
              </label>
              <div className="flex items-center gap-2">
                {renderStars(selectedReview.stars)}
                <span className="text-sm font-semibold text-gray-900">
                  {selectedReview.stars}/5
                </span>
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-xs text-gray-500 font-semibold mb-2">
                Comment
              </label>
              <div className="bg-gray-100 rounded-lg p-4 text-sm text-gray-800 leading-relaxed">
                {selectedReview.comment}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Review</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this review? This action cannot be undone.
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteReview(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
