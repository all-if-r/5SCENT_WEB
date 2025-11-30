<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$pdo = \DB::connection()->getPdo();

echo "=== Schema Verification ===\n\n";

// Check orders.subtotal
echo "1. Checking orders.subtotal column...\n";
$result = $pdo->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='orders' AND COLUMN_NAME='subtotal' AND TABLE_SCHEMA=DATABASE()");
if ($result->rowCount() > 0) {
    echo "   ✅ orders.subtotal exists\n";
} else {
    echo "   ❌ orders.subtotal MISSING\n";
}

// Check orderdetail.subtotal
echo "\n2. Checking orderdetail.subtotal column...\n";
$result = $pdo->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='orderdetail' AND COLUMN_NAME='subtotal' AND TABLE_SCHEMA=DATABASE()");
if ($result->rowCount() > 0) {
    echo "   ❌ orderdetail.subtotal still exists (should be dropped)\n";
} else {
    echo "   ✅ orderdetail.subtotal was removed\n";
}

// Check rating.updated_at
echo "\n3. Checking rating.updated_at column...\n";
$result = $pdo->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='rating' AND COLUMN_NAME='updated_at' AND TABLE_SCHEMA=DATABASE()");
if ($result->rowCount() > 0) {
    echo "   ✅ rating.updated_at exists\n";
} else {
    echo "   ❌ rating.updated_at MISSING\n";
}

echo "\n=== Column Lists ===\n\n";

// Show orders columns
echo "Orders table columns:\n";
$result = $pdo->query("SHOW COLUMNS FROM orders");
while ($row = $result->fetch(PDO::FETCH_ASSOC)) {
    echo "  - " . $row['Field'] . " (" . $row['Type'] . ")\n";
}

// Show orderdetail columns
echo "\nOrderdetail table columns:\n";
$result = $pdo->query("SHOW COLUMNS FROM orderdetail");
while ($row = $result->fetch(PDO::FETCH_ASSOC)) {
    echo "  - " . $row['Field'] . " (" . $row['Type'] . ")\n";
}

echo "\n=== POS_TRANSACTION TABLE COLUMNS ===\n";
$result = $pdo->query("SHOW COLUMNS FROM pos_transaction");
while ($row = $result->fetch(PDO::FETCH_ASSOC)) {
    echo "  - " . $row['Field'] . " (" . $row['Type'] . ") " . ($row['Null'] == 'YES' ? '[NULL]' : '[NOT NULL]') . "\n";
}


echo "\n✅ Schema verification complete!\n";
?>
