<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Update the ENUM column to use underscore in 'Virtual_Account'
        DB::statement("ALTER TABLE pos_transaction MODIFY COLUMN payment_method ENUM('Cash', 'QRIS', 'Virtual_Account') DEFAULT 'Cash'");
    }

    public function down(): void
    {
        // Revert back to the original ENUM values
        DB::statement("ALTER TABLE pos_transaction MODIFY COLUMN payment_method ENUM('QRIS', 'Virtual_Account', 'Cash') DEFAULT 'QRIS'");
    }
};
