<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

try {
    echo "Adding created_at and updated_at columns to wishlist table...\n";
    
    // Add created_at column if it doesn't exist
    $hasCreatedAt = DB::select("SHOW COLUMNS FROM wishlist WHERE Field = 'created_at'");
    if (empty($hasCreatedAt)) {
        DB::statement("ALTER TABLE wishlist ADD COLUMN created_at datetime DEFAULT CURRENT_TIMESTAMP");
        echo "✓ Added created_at column\n";
    } else {
        echo "✓ created_at column already exists\n";
    }
    
    // Add updated_at column if it doesn't exist
    $hasUpdatedAt = DB::select("SHOW COLUMNS FROM wishlist WHERE Field = 'updated_at'");
    if (empty($hasUpdatedAt)) {
        DB::statement("ALTER TABLE wishlist ADD COLUMN updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
        echo "✓ Added updated_at column\n";
    } else {
        echo "✓ updated_at column already exists\n";
    }
    
    echo "\n=== UPDATED WISHLIST TABLE ===\n";
    $wishlistTable = DB::select("SHOW CREATE TABLE wishlist");
    foreach ($wishlistTable as $row) {
        echo $row->{'Create Table'};
    }
    
    echo "\n\n✓ Database schema update complete!\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
