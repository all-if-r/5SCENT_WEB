<?php

// Direct SQL fix script - run this file to apply schema changes directly
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$connection = \DB::connection();
$pdo = $connection->getPdo();

try {
    echo "Starting schema fixes...\n";

    // 1. Add subtotal to orders table if it doesn't exist
    echo "1. Checking orders.subtotal...\n";
    $checkSubtotal = $pdo->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='orders' AND COLUMN_NAME='subtotal' AND TABLE_SCHEMA=DATABASE()");
    if ($checkSubtotal->rowCount() == 0) {
        echo "   - Adding subtotal column to orders table...\n";
        $pdo->exec("ALTER TABLE orders ADD COLUMN subtotal FLOAT NULL AFTER user_id");
        echo "   - Backfilling subtotal data...\n";
        $pdo->exec("UPDATE orders SET subtotal = total_price / 1.05 WHERE subtotal IS NULL");
        echo "   ✓ subtotal added and backfilled\n";
    } else {
        echo "   ✓ subtotal column already exists\n";
    }

    // 2. Drop subtotal from orderdetail if it exists
    echo "2. Checking orderdetail.subtotal...\n";
    $checkOrderDetailSubtotal = $pdo->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='orderdetail' AND COLUMN_NAME='subtotal' AND TABLE_SCHEMA=DATABASE()");
    if ($checkOrderDetailSubtotal->rowCount() > 0) {
        echo "   - Dropping subtotal column from orderdetail table...\n";
        $pdo->exec("ALTER TABLE orderdetail DROP COLUMN subtotal");
        echo "   ✓ subtotal dropped from orderdetail\n";
    } else {
        echo "   ✓ subtotal column doesn't exist in orderdetail\n";
    }

    // 3. Add updated_at to rating table if it doesn't exist
    echo "3. Checking rating.updated_at...\n";
    $checkUpdatedAt = $pdo->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='rating' AND COLUMN_NAME='updated_at' AND TABLE_SCHEMA=DATABASE()");
    if ($checkUpdatedAt->rowCount() == 0) {
        echo "   - Adding updated_at column to rating table...\n";
        $pdo->exec("ALTER TABLE rating ADD COLUMN updated_at DATETIME NULL AFTER created_at");
        echo "   ✓ updated_at added to rating table\n";
    } else {
        echo "   ✓ updated_at column already exists\n";
    }

    echo "\n✅ All schema fixes applied successfully!\n";

} catch (\Exception $e) {
    echo "\n❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>
