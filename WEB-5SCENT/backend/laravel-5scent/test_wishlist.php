<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

try {
    // Check wishlist table structure
    $wishlistTable = DB::select("SHOW CREATE TABLE wishlist");
    echo "=== WISHLIST TABLE ===\n";
    foreach ($wishlistTable as $row) {
        echo $row->{'Create Table'};
    }
    echo "\n\n";

    // Check cart table structure
    $cartTable = DB::select("SHOW CREATE TABLE cart");
    echo "=== CART TABLE ===\n";
    foreach ($cartTable as $row) {
        echo $row->{'Create Table'};
    }
    echo "\n\n";

    // Try to fetch wishlist
    echo "=== TESTING WISHLIST FETCH ===\n";
    $wishlist = DB::table('wishlist')->first();
    if ($wishlist) {
        echo "Wishlist query successful\n";
        echo json_encode($wishlist, JSON_PRETTY_PRINT);
    } else {
        echo "No wishlist items found (this is normal if empty)\n";
    }

    // Check if timestamps columns exist
    $columns = DB::select("DESCRIBE wishlist");
    echo "\n=== WISHLIST COLUMNS ===\n";
    foreach ($columns as $col) {
        echo $col->Field . " - " . $col->Type . "\n";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
