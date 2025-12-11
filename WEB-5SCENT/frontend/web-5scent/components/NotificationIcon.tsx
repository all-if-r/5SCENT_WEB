'use client';

import React from 'react';
import { FiBell } from 'react-icons/fi';
import { useNotification } from '@/contexts/NotificationContext';

interface NotificationIconProps {
  onClick: () => void;
}

export const NotificationIcon: React.FC<NotificationIconProps> = ({ onClick }) => {
  const { unreadCount } = useNotification();

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      aria-label="Open notifications"
    >
      <FiBell className="w-6 h-6" />

      {/* Unread count badge */}
      {unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-black rounded-full">
          {unreadCount > 9 ? '9+' : unreadCount}
        </div>
      )}
    </button>
  );
};
