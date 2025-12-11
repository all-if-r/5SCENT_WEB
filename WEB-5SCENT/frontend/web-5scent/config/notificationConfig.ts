/**
 * Notification mapping configuration
 * Defines icons, headers, and templates for each notification type
 */

import React from 'react';
import { FiPackage, FiCreditCard } from 'react-icons/fi';
import { FaRegStar } from 'react-icons/fa';
import { LuUser } from 'react-icons/lu';

export interface NotificationConfig {
  icon: React.ReactNode;
  iconBgColor: string;
  iconTextColor: string;
  headerText: string;
  messageTemplate?: string;
  actionButtonText?: string;
  actionButtonStyle?: 'primary' | 'secondary';
}

/**
 * Get the icon component based on notification type
 */
function getIconComponent(notifType: string, orderStatus?: string): React.ReactNode {
  switch (notifType) {
    case 'OrderUpdate':
      return React.createElement(FiPackage, { className: 'w-5 h-5' });
    case 'Payment':
    case 'Refund':
      return React.createElement(FiCreditCard, { className: 'w-5 h-5' });
    case 'Delivery':
      return React.createElement(FaRegStar, { className: 'w-5 h-5' });
    case 'ProfileReminder':
      return React.createElement(LuUser, { className: 'w-5 h-5' });
    default:
      return React.createElement(FiPackage, { className: 'w-5 h-5' });
  }
}

/**
 * Get notification configuration based on notif_type and optional order status/payment status
 */
export function getNotificationConfig(
  notifType: string,
  orderStatus?: string,
  paymentStatus?: string
): NotificationConfig {
  
  switch (notifType) {
    // Order Status Notifications
    case 'OrderUpdate':
      if (orderStatus === 'Packaging') {
        return {
          icon: getIconComponent('OrderUpdate'),
          iconBgColor: '#F0F9FF',
          iconTextColor: '#0284C7',
          headerText: 'Order Being Packaged',
          messageTemplate: 'Your order {orderCode} is being carefully packaged.',
        };
      }
      if (orderStatus === 'Shipping') {
        return {
          icon: getIconComponent('OrderUpdate'),
          iconBgColor: '#F0F9FF',
          iconTextColor: '#0284C7',
          headerText: 'Order Shipped',
          messageTemplate: 'Your order {orderCode} is on its way. Track your package for estimated delivery.',
        };
      }
      if (orderStatus === 'Delivered') {
        return {
          icon: getIconComponent('OrderUpdate'),
          iconBgColor: '#F0F9FF',
          iconTextColor: '#0284C7',
          headerText: 'Order Delivered',
          messageTemplate: 'Your order {orderCode} has been delivered.',
        };
      }
      if (orderStatus === 'Cancelled') {
        return {
          icon: getIconComponent('OrderUpdate'),
          iconBgColor: '#F0F9FF',
          iconTextColor: '#0284C7',
          headerText: 'Order Cancelled',
          messageTemplate: 'Your order {orderCode} has been cancelled.',
        };
      }
      // Default OrderUpdate
      return {
        icon: getIconComponent('OrderUpdate'),
        iconBgColor: '#F0F9FF',
        iconTextColor: '#0284C7',
        headerText: 'Order Updated',
      };

    // Delivery Review Notification
    case 'Delivery':
      return {
        icon: getIconComponent('Delivery'),
        iconBgColor: '#FFFAF0',
        iconTextColor: '#D97706',
        headerText: 'Order Delivered - Share Your Thoughts',
        messageTemplate: 'Your order has been delivered. We would love to hear your thoughts.',
        actionButtonText: 'Write Review',
        actionButtonStyle: 'primary',
      };

    // Payment Notifications
    case 'Payment':
      if (paymentStatus === 'Pending') {
        return {
          icon: getIconComponent('Payment'),
          iconBgColor: '#FEF3C7',
          iconTextColor: '#D97706',
          headerText: 'Payment Pending',
          messageTemplate: 'Your payment for order {orderCode} is pending and is being processed.',
        };
      }
      if (paymentStatus === 'Success') {
        return {
          icon: getIconComponent('Payment'),
          iconBgColor: '#DCFCE7',
          iconTextColor: '#15803D',
          headerText: 'Payment Successful',
          messageTemplate: 'Your payment for order {orderCode} has been confirmed. Thank you for your purchase.',
        };
      }
      if (paymentStatus === 'Failed') {
        return {
          icon: getIconComponent('Payment'),
          iconBgColor: '#FEE2E2',
          iconTextColor: '#DC2626',
          headerText: 'Payment Failed',
          messageTemplate: 'Your payment for order {orderCode} failed. Please try again or use another payment method.',
        };
      }
      // Default Payment
      return {
        icon: getIconComponent('Payment'),
        iconBgColor: '#FEF3C7',
        iconTextColor: '#D97706',
        headerText: 'Payment Update',
      };

    // Refund Notification
    case 'Refund':
      return {
        icon: getIconComponent('Refund'),
        iconBgColor: '#DCFCE7',
        iconTextColor: '#15803D',
        headerText: 'Refund Processed',
        messageTemplate: 'Your refund for order {orderCode} has been processed and will arrive in 3-5 business days.',
      };

    // Profile Reminder Notification
    case 'ProfileReminder':
      return {
        icon: getIconComponent('ProfileReminder'),
        iconBgColor: '#F3E8FF',
        iconTextColor: '#9333EA',
        headerText: 'Complete Your Profile',
        messageTemplate: 'Complete your profile to enjoy a faster checkout experience. Add your shipping address and phone number.',
        actionButtonText: 'Complete Profile',
        actionButtonStyle: 'secondary',
      };

    // Default fallback
    default:
      return {
        icon: getIconComponent('OrderUpdate'),
        iconBgColor: '#F0F9FF',
        iconTextColor: '#0284C7',
        headerText: notifType,
      };
  }
}

/**
 * Extract order code from notification message
 * Example: "Your order #ORD-10-12-2025-025 is being packaged" -> "#ORD-10-12-2025-025"
 */
export function extractOrderCode(message: string): string | null {
  const match = message.match(/#ORD-\d{2}-\d{2}-\d{4}-\d{3}/);
  return match ? match[0] : null;
}
