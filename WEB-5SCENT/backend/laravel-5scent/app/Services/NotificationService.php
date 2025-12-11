<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Order;
use App\Models\User;
use App\Helpers\OrderCodeHelper;

class NotificationService
{
    /**
     * Create a ProfileReminder notification for incomplete profile
     * This will only create ONCE per user - never recreate even if read
     */
    public static function createProfileReminderNotification($userId)
    {
        // Check if user already has a ProfileReminder notification (read or unread)
        $existingNotification = Notification::where('user_id', $userId)
            ->where('notif_type', 'ProfileReminder')
            ->first();

        if ($existingNotification) {
            return $existingNotification; // Don't create duplicate - reuse existing one
        }

        return Notification::create([
            'user_id' => $userId,
            'order_id' => null,
            'message' => 'Complete your profile to enjoy a faster checkout experience. Add your shipping address and phone number.',
            'notif_type' => 'ProfileReminder',
            'is_read' => false,
        ]);
    }

    /**
     * Create a Delivery notification when order is marked as delivered
     * Allows multiple notifications - each delivery event creates a new notification
     */
    public static function createDeliveryNotification($orderId, $message = null)
    {
        $order = Order::find($orderId);

        if (!$order) {
            return null;
        }

        $orderCode = OrderCodeHelper::formatOrderCode($order);

        return Notification::create([
            'user_id' => $order->user_id,
            'order_id' => $orderId,
            'message' => $message ?? "Your order {$orderCode} has been delivered. We'd love to hear your thoughts.",
            'notif_type' => 'Delivery',
            'is_read' => false,
        ]);
    }

    /**
     * Create a Payment notification
     * Allows multiple notifications - each payment event creates a new notification
     */
    public static function createPaymentNotification($orderId, $message = null)
    {
        $order = Order::find($orderId);

        if (!$order) {
            return null;
        }

        return Notification::create([
            'user_id' => $order->user_id,
            'order_id' => $orderId,
            'message' => $message ?? 'Your payment has been processed.',
            'notif_type' => 'Payment',
            'is_read' => false,
        ]);
    }

    /**
     * Create an OrderUpdate notification
     * Allows multiple notifications - each status change creates a new notification
     */
    public static function createOrderUpdateNotification($orderId, $message = null)
    {
        $order = Order::find($orderId);

        if (!$order) {
            return null;
        }

        return Notification::create([
            'user_id' => $order->user_id,
            'order_id' => $orderId,
            'message' => $message ?? 'Your order status has been updated.',
            'notif_type' => 'OrderUpdate',
            'is_read' => false,
        ]);
    }

    /**
     * Create a Refund notification
     * Allows multiple notifications - each refund event creates a new notification
     */
    public static function createRefundNotification($orderId, $message = null)
    {
        $order = Order::find($orderId);

        if (!$order) {
            return null;
        }

        return Notification::create([
            'user_id' => $order->user_id,
            'order_id' => $orderId,
            'message' => $message ?? 'Your refund has been processed.',
            'notif_type' => 'Refund',
            'is_read' => false,
        ]);
    }

    /**
     * Mark a notification as read
     */
    public static function markAsRead($notificationId)
    {
        return Notification::find($notificationId)?->update(['is_read' => true]);
    }

    /**
     * Mark all notifications as read for a user
     */
    public static function markAllAsRead($userId)
    {
        return Notification::where('user_id', $userId)
            ->unread()
            ->update(['is_read' => true]);
    }

    /**
     * Get unread notification count for user
     */
    public static function getUnreadCount($userId)
    {
        return Notification::where('user_id', $userId)
            ->unread()
            ->count();
    }
}
