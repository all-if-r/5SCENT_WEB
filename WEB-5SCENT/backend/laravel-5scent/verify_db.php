<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Wishlist;
use App\Models\Product;

try {
    echo "=== DATABASE VERIFICATION ===\n\n";
    
    // Get first user
    $user = User::first();
    if (!$user) {
        die("No user found. Please create a user first.\n");
    }
    
    echo "User: " . $user->name . " (ID: " . $user->user_id . ")\n";
    
    // Get wishlist items for this user
    echo "\n=== TESTING WISHLIST QUERY ===\n";
    $wishlistItems = Wishlist::with(['product' => function($query) {
        $query->with('images');
    }])
        ->where('user_id', $user->user_id)
        ->orderBy('created_at', 'desc')
        ->get();
    
    echo "Query successful! Found " . $wishlistItems->count() . " items\n";
    
    if ($wishlistItems->count() > 0) {
        echo "\n=== WISHLIST ITEMS ===\n";
        foreach ($wishlistItems as $item) {
            echo "Wishlist ID: " . $item->wishlist_id . "\n";
            echo "Product ID: " . $item->product_id . "\n";
            if ($item->product) {
                echo "Product Name: " . $item->product->name . "\n";
                echo "Price 30ml: " . $item->product->price_30ml . "\n";
            }
            echo "Created: " . $item->created_at . "\n";
            echo "---\n";
        }
    }
    
    // Verify timestamps columns exist
    echo "\n=== TABLE STRUCTURE ===\n";
    $columns = \Illuminate\Support\Facades\DB::select("DESCRIBE wishlist");
    echo "Wishlist columns:\n";
    foreach ($columns as $col) {
        echo "  - " . $col->Field . " (" . $col->Type . ")\n";
    }
    
    echo "\n✓ All database operations successful!\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    die();
}
