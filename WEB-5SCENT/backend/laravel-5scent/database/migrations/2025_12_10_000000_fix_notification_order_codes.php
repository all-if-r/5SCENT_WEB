<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Get all notifications with order_id that contain the old format
        $notifications = DB::table('notification')
            ->whereNotNull('order_id')
            ->get();

        foreach ($notifications as $notif) {
            // Get the related order
            $order = DB::table('orders')
                ->where('order_id', $notif->order_id)
                ->first();

            if (!$order) {
                continue; // Skip if order doesn't exist
            }

            // Format the order code using the helper format
            $date = Carbon::parse($order->created_at);
            $orderCode = sprintf(
                '#ORD-%s-%s-%s-%03d',
                $date->format('d'),
                $date->format('m'),
                $date->format('Y'),
                $order->order_id
            );

            // Update the message by replacing old order code format with new one
            $message = $notif->message;
            
            // Replace old format #ORD-{order_id} with new format
            $message = preg_replace(
                '/#ORD-\d+\b/',
                $orderCode,
                $message
            );

            // Also handle format with 3-digit padding that may already be there
            $message = preg_replace(
                '/#ORD-\d{3}\b/',
                $orderCode,
                $message
            );

            // Update the notification message
            DB::table('notification')
                ->where('notif_id', $notif->notif_id)
                ->update(['message' => $message]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration updates existing data, so we don't need to reverse it
        // The down() method is intentionally left empty as this is a data correction
    }
};
