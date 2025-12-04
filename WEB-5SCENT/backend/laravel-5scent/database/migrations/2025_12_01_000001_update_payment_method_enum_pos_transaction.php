<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Update the ENUM column to include 'Virtual Account' with space instead of underscore
        DB::statement("ALTER TABLE pos_transaction MODIFY COLUMN payment_method ENUM('Cash', 'QRIS', 'Virtual Account') DEFAULT 'Cash'");
        
        // Update any existing records with 'Virtual_Account' to 'Virtual Account'
        DB::table('pos_transaction')
            ->where('payment_method', 'Virtual_Account')
            ->update(['payment_method' => 'Virtual Account']);
    }

    public function down(): void
    {
        // Revert back to the original ENUM values
        DB::statement("ALTER TABLE pos_transaction MODIFY COLUMN payment_method ENUM('QRIS', 'Virtual_Account', 'Cash') DEFAULT 'QRIS'");
        
        // Update any existing records with 'Virtual Account' back to 'Virtual_Account'
        DB::table('pos_transaction')
            ->where('payment_method', 'Virtual Account')
            ->update(['payment_method' => 'Virtual_Account']);
    }
};
