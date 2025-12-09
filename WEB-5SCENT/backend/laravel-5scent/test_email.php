<?php
// Quick email test script
// Run this in the root directory to test email configuration

require 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Mail;

// Try sending a test email
try {
    Mail::raw('This is a test email from 5SCENT reset password system.', function ($message) {
        $message->to('alifrahmanra5@gmail.com')
                ->subject('Test Email from 5SCENT')
                ->from(config('mail.from.address'), config('mail.from.name'));
    });
    
    echo "✓ Email sent successfully\n";
    echo "Mail Configuration:\n";
    echo "- Host: " . config('mail.mailers.smtp.host') . "\n";
    echo "- Port: " . config('mail.mailers.smtp.port') . "\n";
    echo "- Username: " . config('mail.mailers.smtp.username') . "\n";
    echo "- From: " . config('mail.from.address') . "\n";
    
} catch (\Exception $e) {
    echo "✗ Email send failed: " . $e->getMessage() . "\n";
    echo "\nStack Trace:\n";
    echo $e->getTraceAsString() . "\n";
}
