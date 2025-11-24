<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$connection = app('db');

// Check for cart table
try {
    $cartCount = $connection->table('cart')->count();
    echo "Cart table exists with " . $cartCount . " items\n";
} catch (\Exception $e) {
    echo "Cart table does NOT exist: " . $e->getMessage() . "\n";
}

// Check for wishlist table
try {
    $wishlistCount = $connection->table('wishlist')->count();
    echo "Wishlist table exists with " . $wishlistCount . " items\n";
} catch (\Exception $e) {
    echo "Wishlist table does NOT exist: " . $e->getMessage() . "\n";
}

// Check for product table
try {
    $productCount = $connection->table('product')->count();
    echo "Product table exists with " . $productCount . " products\n";
} catch (\Exception $e) {
    echo "Product table does NOT exist: " . $e->getMessage() . "\n";
}

// Check for user table
try {
    $userCount = $connection->table('user')->count();
    echo "User table exists with " . $userCount . " users\n";
} catch (\Exception $e) {
    echo "User table does NOT exist: " . $e->getMessage() . "\n";
}

// List all tables
echo "\nAll tables in database:\n";
$tables = $connection->select('SHOW TABLES');
foreach($tables as $table) {
    $tableName = (array)$table;
    echo "- " . current($tableName) . "\n";
}
?>
