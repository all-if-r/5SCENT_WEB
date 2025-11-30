<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pos_transaction', function (Blueprint $table) {
            // Add cash_change field if it doesn't exist
            if (!Schema::hasColumn('pos_transaction', 'cash_change')) {
                $table->float('cash_change')->nullable()->default(0)->comment('Change amount for cash payments (cash_received - total_price)')->after('cash_received');
            }

            // Update payment_method to ENUM if it's not already
            if (Schema::hasColumn('pos_transaction', 'payment_method')) {
                $table->enum('payment_method', ['QRIS', 'Virtual_Account', 'Cash'])->change();
            }

            // Add timestamps if they don't exist
            if (!Schema::hasColumn('pos_transaction', 'created_at')) {
                $table->timestamps();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pos_transaction', function (Blueprint $table) {
            if (Schema::hasColumn('pos_transaction', 'cash_change')) {
                $table->dropColumn('cash_change');
            }
        });
    }
};
