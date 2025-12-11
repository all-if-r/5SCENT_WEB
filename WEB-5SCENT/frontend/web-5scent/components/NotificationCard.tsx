'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LuUser } from 'react-icons/lu';
import { NotificationItem, useNotification } from '@/contexts/NotificationContext';
import { getNotificationConfig, extractOrderCode } from '@/config/notificationConfig';

interface NotificationCardProps {
  notification: NotificationItem;
  onAction?: () => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onAction,
}) => {
  const router = useRouter();
  const { markAsRead } = useNotification();

  const handleCardClick = async () => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.notif_id);
    }

    // Handle redirect based on notification type
    if (notification.notif_type === 'ProfileReminder') {
      // ProfileReminder redirects to profile
      router.push('/profile');
    } else {
      // All other types (Payment, OrderUpdate, Refund, Delivery) redirect to orders
      router.push('/orders');
    }

    onAction?.();
  };

  // Extract order status and payment status from the message for better config
  const getStatusFromMessage = () => {
    const message = notification.message.toLowerCase();
    
    // Check order statuses
    if (message.includes('packaged')) return { orderStatus: 'Packaging' };
    if (message.includes('shipped')) return { orderStatus: 'Shipping' };
    if (message.includes('delivered')) return { orderStatus: 'Delivered' };
    if (message.includes('cancelled')) return { orderStatus: 'Cancelled' };
    
    // Check payment statuses
    if (message.includes('pending')) return { paymentStatus: 'Pending' };
    if (message.includes('successful') || message.includes('success')) return { paymentStatus: 'Success' };
    if (message.includes('failed')) return { paymentStatus: 'Failed' };
    
    return {};
  };

  const statusInfo = getStatusFromMessage();
  const config = getNotificationConfig(
    notification.notif_type,
    statusInfo.orderStatus,
    statusInfo.paymentStatus
  );

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const bgColor = notification.is_read ? '#FFFFFF' : '#EFF6FF';
  const borderColor = '#DBEAFE';

  return (
    <div
      onClick={handleCardClick}
      className="relative border rounded-lg p-4 cursor-pointer transition-all duration-200"
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
      }}
    >
      {/* Blue indicator for unread */}
      {!notification.is_read && (
        <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#2B7FFF' }} />
      )}

      {/* Content */}
      <div className="flex gap-3">
        {/* Icon */}
        <div 
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg"
          style={{
            backgroundColor: config.iconBgColor,
            color: config.iconTextColor,
          }}
        >
          {config.icon}
        </div>

        {/* Text Content */}
        <div className="flex-1 pr-6">
          {/* Title */}
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {config.headerText}
          </h3>

          {/* Message */}
          <p className="text-sm font-normal text-gray-600 mb-1">
            {notification.message}
          </p>

          {/* Timestamp */}
          <p className="text-xs text-gray-500">
            {formatTimestamp(notification.created_at)}
          </p>
        </div>
      </div>

      {/* Action Button */}
      {config.actionButtonText && (
        <div className="mt-3 flex" style={{ marginLeft: '32px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 transition-colors ${
              config.actionButtonStyle === 'secondary'
                ? 'bg-white text-black border border-gray-300 hover:bg-gray-50 rounded-full'
                : 'text-white bg-black hover:bg-gray-800 rounded-lg'
            }`}
          >
            {notification.notif_type === 'ProfileReminder' && <LuUser className="w-4 h-4 text-black" />}
            {config.actionButtonText}
          </button>
        </div>
      )}
    </div>
  );
};
