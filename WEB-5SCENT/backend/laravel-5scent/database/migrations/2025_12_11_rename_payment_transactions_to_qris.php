<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if payment_transactions table exists and rename it to qris_transactions
        if (Schema::hasTable('payment_transactions')) {
            // Drop the qris_transactions table if it exists (from earlier migrations)
            if (Schema::hasTable('qris_transactions')) {
                Schema::dropIfExists('qris_transactions');
            }

            // Rename payment_transactions to qris_transactions
            Schema::rename('payment_transactions', 'qris_transactions');

            // Update the primary key name from id to qris_transaction_id
            DB::statement('ALTER TABLE qris_transactions RENAME COLUMN id TO qris_transaction_id');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert the changes
        if (Schema::hasTable('qris_transactions')) {
            DB::statement('ALTER TABLE qris_transactions RENAME COLUMN qris_transaction_id TO id');
            Schema::rename('qris_transactions', 'payment_transactions');
        }
    }
};
