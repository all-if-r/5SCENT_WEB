<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_reminder_only_created_once()
    {
        // Create a user
        $user = User::factory()->create();

        // First call - should create ProfileReminder
        NotificationService::createProfileReminderNotification($user->user_id);
        $firstCount = Notification::where('user_id', $user->user_id)
            ->where('notif_type', 'ProfileReminder')
            ->count();
        $this->assertEquals(1, $firstCount, 'First call should create 1 ProfileReminder');

        // Second call - should NOT create another ProfileReminder
        NotificationService::createProfileReminderNotification($user->user_id);
        $secondCount = Notification::where('user_id', $user->user_id)
            ->where('notif_type', 'ProfileReminder')
            ->count();
        $this->assertEquals(1, $secondCount, 'Second call should still have only 1 ProfileReminder');

        // Mark as read
        $notification = Notification::where('user_id', $user->user_id)
            ->where('notif_type', 'ProfileReminder')
            ->first();
        $notification->update(['is_read' => true]);

        // Third call - should NOT recreate even though marked as read
        NotificationService::createProfileReminderNotification($user->user_id);
        $thirdCount = Notification::where('user_id', $user->user_id)
            ->where('notif_type', 'ProfileReminder')
            ->count();
        $this->assertEquals(1, $thirdCount, 'Third call (after marking read) should still have only 1 ProfileReminder');

        // Verify it's still marked as read
        $notification->refresh();
        $this->assertTrue($notification->is_read, 'Notification should still be marked as read');
    }

    public function test_fetch_notifications_returns_both_read_and_unread()
    {
        // Create a user
        $user = User::factory()->create();

        // Create some notifications
        Notification::factory()->create([
            'user_id' => $user->user_id,
            'notif_type' => 'Payment',
            'is_read' => false,
        ]);

        Notification::factory()->create([
            'user_id' => $user->user_id,
            'notif_type' => 'OrderUpdate',
            'is_read' => true,
        ]);

        Notification::factory()->create([
            'user_id' => $user->user_id,
            'notif_type' => 'ProfileReminder',
            'is_read' => false,
        ]);

        // Fetch notifications for user
        $allNotifications = Notification::where('user_id', $user->user_id)
            ->orderByDesc('created_at')
            ->get();

        // Should return 3 notifications (both read and unread)
        $this->assertEquals(3, $allNotifications->count(), 'Should return all 3 notifications');

        // Count unread
        $unreadCount = Notification::where('user_id', $user->user_id)
            ->where('is_read', false)
            ->count();
        $this->assertEquals(2, $unreadCount, 'Should have 2 unread notifications');

        // Count read
        $readCount = Notification::where('user_id', $user->user_id)
            ->where('is_read', true)
            ->count();
        $this->assertEquals(1, $readCount, 'Should have 1 read notification');
    }

    public function test_mark_as_read_updates_is_read_flag()
    {
        // Create a user and notification
        $user = User::factory()->create();
        $notification = Notification::factory()->create([
            'user_id' => $user->user_id,
            'is_read' => false,
        ]);

        // Verify initially unread
        $this->assertFalse($notification->is_read);

        // Mark as read
        NotificationService::markAsRead($notification->notif_id);

        // Refresh and verify
        $notification->refresh();
        $this->assertTrue($notification->is_read, 'Notification should be marked as read');

        // Verify unread count decreased
        $unreadCount = NotificationService::getUnreadCount($user->user_id);
        $this->assertEquals(0, $unreadCount, 'Unread count should be 0');
    }

    public function test_unread_count_only_counts_is_read_false()
    {
        // Create a user
        $user = User::factory()->create();

        // Create 5 unread and 3 read notifications
        Notification::factory(5)->create([
            'user_id' => $user->user_id,
            'is_read' => false,
        ]);

        Notification::factory(3)->create([
            'user_id' => $user->user_id,
            'is_read' => true,
        ]);

        // Get unread count
        $unreadCount = NotificationService::getUnreadCount($user->user_id);

        // Should only count unread
        $this->assertEquals(5, $unreadCount, 'Unread count should be 5 (not including read notifications)');
    }
}
