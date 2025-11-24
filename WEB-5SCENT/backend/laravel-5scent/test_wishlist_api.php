<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Wishlist;
use Illuminate\Support\Facades\DB;

try {
    echo "=== TESTING WISHLIST FUNCTIONALITY ===\n\n";
    
    // Check if there's a user
    $user = User::first();
    if (!$user) {
        echo "No user found in database. Creating test user...\n";
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password123'),
        ]);
        echo "Test user created with ID: " . $user->user_id . "\n\n";
    } else {
        echo "Using existing user: " . $user->name . " (ID: " . $user->user_id . ")\n\n";
    }
    
    // Check wishlist items
    echo "=== WISHLIST ITEMS ===\n";
    $wishlistItems = Wishlist::with(['product' => function($query) {
        $query->with('images');
    }])
        ->where('user_id', $user->user_id)
        ->orderBy('created_at', 'desc')
        ->get();
    
    echo "Found " . $wishlistItems->count() . " items in wishlist\n";
    foreach ($wishlistItems as $item) {
        echo "  - Wishlist ID: " . $item->wishlist_id;
        echo ", Product ID: " . $item->product_id;
        if ($item->product) {
            echo ", Product: " . $item->product->name;
        }
        echo "\n";
    }
    
    echo "\n=== WISHLIST TABLE DATA ===\n";
    $allItems = DB::table('wishlist')->get();
    echo "Total items in wishlist table: " . $allItems->count() . "\n";
    echo json_encode($allItems, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    
    echo "\n\n=== CART TABLE DATA ===\n";
    $cartItems = DB::table('cart')->get();
    echo "Total items in cart table: " . $cartItems->count() . "\n";
    echo json_encode($cartItems, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    
    echo "\n\n✓ Wishlist functionality test complete!\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
