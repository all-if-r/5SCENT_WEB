<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Test creating a cart item
try {
    echo "Testing Cart insert...\n";
    $cart = \App\Models\Cart::create([
        'user_id' => 1,
        'product_id' => 2,
        'size' => '50ml',
        'quantity' => 2,
    ]);
    echo "Success! Created cart item with ID: " . $cart->cart_id . "\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

// Test creating a wishlist item
try {
    echo "\nTesting Wishlist insert...\n";
    $wishlist = \App\Models\Wishlist::create([
        'user_id' => 1,
        'product_id' => 3,
    ]);
    echo "Success! Created wishlist item with ID: " . $wishlist->wishlist_id . "\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
