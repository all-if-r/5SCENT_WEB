<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Get all notifications for authenticated user
     */
    public function index(Request $request)
    {
        $userId = $request->user()->user_id;

        $notifications = Notification::where('user_id', $userId)
            ->with(['user', 'order'])
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($notification) {
                return [
                    'notif_id' => $notification->notif_id,
                    'user_id' => $notification->user_id,
                    'order_id' => $notification->order_id,
                    'message' => $notification->message,
                    'notif_type' => $notification->notif_type,
                    'is_read' => (bool) $notification->is_read,
                    'created_at' => $notification->created_at->toIso8601String(),
                    'updated_at' => $notification->updated_at?->toIso8601String(),
                    'user' => $notification->user ? [
                        'user_id' => $notification->user->user_id,
                        'name' => $notification->user->name,
                        'email' => $notification->user->email,
                        'phone' => $notification->user->phone,
                    ] : null,
                    'order' => $notification->order ? [
                        'order_id' => $notification->order->order_id,
                        'status' => $notification->order->status,
                    ] : null,
                ];
            });

        $unreadCount = NotificationService::getUnreadCount($userId);

        return response()->json([
            'success' => true,
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Mark a single notification as read
     */
    public function markAsRead(Request $request, $notificationId)
    {
        $notification = Notification::find($notificationId);

        if (!$notification) {
            return response()->json(['error' => 'Notification not found'], 404);
        }

        // Verify the notification belongs to the authenticated user
        if ($notification->user_id !== $request->user()->user_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        NotificationService::markAsRead($notificationId);

        $unreadCount = NotificationService::getUnreadCount($request->user()->user_id);

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read',
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Mark all notifications as read for authenticated user
     */
    public function markAllAsRead(Request $request)
    {
        $userId = $request->user()->user_id;

        NotificationService::markAllAsRead($userId);

        $unreadCount = NotificationService::getUnreadCount($userId);

        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read',
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Get unread notification count for authenticated user
     */
    public function unreadCount(Request $request)
    {
        $userId = $request->user()->user_id;
        $unreadCount = NotificationService::getUnreadCount($userId);

        return response()->json([
            'success' => true,
            'unread_count' => $unreadCount,
        ]);
    }
}
