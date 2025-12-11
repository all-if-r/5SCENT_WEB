<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$notifications = \DB::table('notification')
    ->whereNotNull('order_id')
    ->limit(5)
    ->get(['notif_id', 'order_id', 'message', 'notif_type', 'created_at']);

echo "=== Notification Order Code Format Verification ===\n\n";

if ($notifications->isEmpty()) {
    echo "No notifications with order_id found.\n";
} else {
    foreach ($notifications as $notif) {
        echo "Notif ID: {$notif->notif_id} | Order ID: {$notif->order_id}\n";
        echo "Type: {$notif->notif_type}\n";
        echo "Message: {$notif->message}\n";
        echo "---\n";
    }
}
