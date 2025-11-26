<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('orders', 'subtotal')) {
            Schema::table('orders', function (Blueprint $table) {
                // Add subtotal column before total_price
                $table->float('subtotal')->after('user_id')->nullable();
            });

            // Backfill existing data: calculate subtotal as total_price / 1.05 (reverse the 5% tax)
            DB::statement('UPDATE orders SET subtotal = total_price / 1.05 WHERE subtotal IS NULL');
        }
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('subtotal');
        });
    }
};
