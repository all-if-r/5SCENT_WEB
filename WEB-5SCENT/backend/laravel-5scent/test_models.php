<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Test cart query
try {
    $cartItems = \App\Models\Cart::with(['product' => function($query) {
        $query->with('images');
    }])
        ->where('user_id', 1)
        ->get();
    
    echo "Cart items for user_id=1: " . count($cartItems) . "\n";
    foreach($cartItems as $item) {
        echo "  - Item: " . $item->product_id . ", Size: " . $item->size . ", Qty: " . $item->quantity . "\n";
        if($item->product) {
            echo "    Product: " . $item->product->name . "\n";
        }
    }
} catch (\Exception $e) {
    echo "Error fetching cart: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}

// Test wishlist query
echo "\n";
try {
    $wishlistItems = \App\Models\Wishlist::with(['product' => function($query) {
        $query->with('images');
    }])
        ->where('user_id', 1)
        ->get();
    
    echo "Wishlist items for user_id=1: " . count($wishlistItems) . "\n";
    foreach($wishlistItems as $item) {
        echo "  - Product: " . $item->product_id . "\n";
        if($item->product) {
            echo "    Name: " . $item->product->name . "\n";
        }
    }
} catch (\Exception $e) {
    echo "Error fetching wishlist: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
?>
