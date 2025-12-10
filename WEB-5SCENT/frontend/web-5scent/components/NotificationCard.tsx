'use client';

import React from 'react';
import { LuUser } from 'react-icons/lu';
import { NotificationItem, useNotification } from '@/contexts/NotificationContext';

interface NotificationCardProps {
  notification: NotificationItem;
  onAction?: () => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onAction,
}) => {
  const { markAsRead, getNotificationIcon } = useNotification();

  const handleCardClick = async () => {
    if (!notification.is_read) {
      await markAsRead(notification.notif_id);
    }
    onAction?.();
  };

  const getActionButtonText = () => {
    switch (notification.notif_type) {
      case 'ProfileReminder':
        return 'Complete Profile';
      case 'Delivery':
        return 'Write Review';
      default:
        return null;
    };
  };

  const getNotificationTitle = () => {
    switch (notification.notif_type) {
      case 'ProfileReminder':
        return 'Complete your profile';
      default:
        return notification.notif_type;
    }
  };

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

  const bgColor = notification.is_read ? 'bg-white' : 'bg-blue-50';
  const actionButtonText = getActionButtonText();

  return (
    <div
      onClick={handleCardClick}
      className={`relative border border-blue-200 rounded-lg p-4 ${bgColor} cursor-pointer transition-colors hover:bg-gray-50`}
    >
      {/* Blue indicator for unread */}
      {!notification.is_read && (
        <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-blue-500 rounded-full" />
      )}

      {/* Content */}
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-purple-600 rounded-lg bg-purple-100">
          {notification.notif_type === 'ProfileReminder' ? (
            <LuUser className="w-5 h-5" />
          ) : (
            getNotificationIcon(notification.notif_type)
          )}
        </div>

        {/* Text Content */}
        <div className="flex-1 pr-6">
          {/* Type Badge */}
          <div className="mb-1">
            <span className="inline-block text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
              {getNotificationTitle()}
            </span>
          </div>

          {/* Message */}
          <p className="text-sm font-medium text-gray-900 mb-1">
            {notification.message}
          </p>

          {/* Timestamp */}
          <p className="text-xs text-gray-500">
            {formatTimestamp(notification.created_at)}
          </p>
        </div>
      </div>

      {/* Action Button */}
      {actionButtonText && (
        <div className="mt-3 flex" style={{ marginLeft: '32px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded transition-colors ${
              notification.notif_type === 'ProfileReminder'
                ? 'bg-white text-black border border-gray-300 hover:bg-gray-50'
                : 'text-white bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {notification.notif_type === 'ProfileReminder' && <LuUser className="w-4 h-4 text-black" />}
            {actionButtonText}
          </button>
        </div>
      )}
    </div>
  );
};
