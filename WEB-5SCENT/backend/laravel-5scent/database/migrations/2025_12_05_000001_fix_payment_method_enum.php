<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: Change ENUM column to VARCHAR temporarily
        DB::statement("ALTER TABLE pos_transaction MODIFY COLUMN payment_method VARCHAR(50)");
        
        // Step 2: Update any old values to the correct format
        DB::table('pos_transaction')
            ->where('payment_method', 'Virtual_Account')
            ->update(['payment_method' => 'Virtual Account']);
        
        // Step 3: Change back to ENUM with correct values (including 'Virtual Account' with space)
        DB::statement("ALTER TABLE pos_transaction MODIFY COLUMN payment_method ENUM('Cash', 'QRIS', 'Virtual Account') DEFAULT 'Cash'");
    }

    public function down(): void
    {
        // Revert to VARCHAR for flexibility during downgrade
        DB::statement("ALTER TABLE pos_transaction MODIFY COLUMN payment_method VARCHAR(50)");
    }
};
