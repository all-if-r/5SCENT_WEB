'use client';

import React, { useEffect } from 'react';
import { FiCheckCircle } from 'react-icons/fi';
import { useNotification } from '@/contexts/NotificationContext';
import { NotificationCard } from './NotificationCard';
import { useRouter } from 'next/navigation';

interface NotificationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationOverlay: React.FC<NotificationOverlayProps> = ({
  isOpen,
  onClose,
}) => {
  const { notifications, markAllAsRead, unreadCount } = useNotification();
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      // Prevent background scroll when overlay is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll when closed
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleNotificationAction = (notification: typeof notifications[0]) => {
    switch (notification.notif_type) {
      case 'ProfileReminder':
        router.push('/profile');
        onClose();
        break;
      case 'Delivery':
        router.push(`/orders?openReview=${notification.order_id}`);
        onClose();
        break;
      default:
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/10 backdrop-blur-[10px] z-40 transition-opacity"
        onClick={onClose}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
        }}
      />

      {/* Overlay Panel */}
      <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <p className="text-xs text-gray-500 mt-1">You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close notifications"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Mark All as Read Button */}
        {unreadCount > 0 && (
          <div className="px-6 py-3 border-b border-gray-200">
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white font-semibold rounded-lg hover:bg-gray-900 transition-colors"
            >
              <FiCheckCircle className="w-5 h-5" />
              Mark all as read
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <svg
                className="w-12 h-12 text-gray-300 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <p className="text-gray-500 font-medium">No notifications</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {notifications.map((notification) => (
                <NotificationCard
                  key={notification.notif_id}
                  notification={notification}
                  onAction={() => handleNotificationAction(notification)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
};
