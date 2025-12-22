<?php

/**
 * Test script to check what Midtrans returns for QRIS custom_expiry
 * Run with: php debug_midtrans_response.php
 */

require_once 'vendor/autoload.php';

use Midtrans\Config;
use Midtrans\CoreApi;

// Load .env
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Configure Midtrans
Config::$serverKey = env('MIDTRANS_SERVER_KEY');
Config::$clientKey = env('MIDTRANS_CLIENT_KEY');
Config::$isProduction = env('MIDTRANS_IS_PRODUCTION', false);

// Disable SSL verification for localhost/sandbox
Config::$curlOptions[CURLOPT_SSL_VERIFYHOST] = 0;
Config::$curlOptions[CURLOPT_SSL_VERIFYPEER] = 0;

echo "=== Midtrans QRIS Expiry Test ===\n";
echo "Mode: " . (Config::$isProduction ? "PRODUCTION" : "SANDBOX") . "\n\n";

// Create test transaction with 1-minute expiry
$payload = [
    'payment_type' => 'qris',
    'transaction_details' => [
        'order_id' => 'TEST-QRIS-' . time(),
        'gross_amount' => 100000,
    ],
    'customer_details' => [
        'first_name' => 'Test',
        'email' => 'test@example.com',
    ],
    'item_details' => [
        [
            'id' => '1',
            'price' => 100000,
            'quantity' => 1,
            'name' => 'Test Item',
        ]
    ],
    'qris' => [
        'acquirer' => 'gopay',
    ],
    'custom_expiry' => [
        'order_time' => date('Y-m-d H:i:s O'),
        'expiry_duration' => 1,
        'unit' => 'minute',
    ],
];

echo "Request Payload:\n";
echo json_encode($payload, JSON_PRETTY_PRINT) . "\n\n";

try {
    // Call Midtrans API
    $response = CoreApi::charge($payload);
    
    echo "Midtrans Response:\n";
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n\n";
    
    // Check for expiry-related fields
    echo "=== Expiry Analysis ===\n";
    
    if (isset($response['expiry_time'])) {
        echo "✓ expiry_time: " . $response['expiry_time'] . "\n";
    } else {
        echo "✗ No expiry_time field in response\n";
    }
    
    if (isset($response['transaction_time'])) {
        echo "✓ transaction_time: " . $response['transaction_time'] . "\n";
    }
    
    if (isset($response['transaction_status'])) {
        echo "✓ transaction_status: " . $response['transaction_status'] . "\n";
    }
    
    // List all response keys
    echo "\nAll response keys:\n";
    foreach (array_keys($response) as $key) {
        echo "  - " . $key . "\n";
    }
    
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
