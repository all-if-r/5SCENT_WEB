<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add subtotal to orders table if it doesn't exist
        if (!Schema::hasColumn('orders', 'subtotal')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->float('subtotal')->nullable()->after('user_id');
            });
            
            // Backfill existing data
            DB::statement('UPDATE orders SET subtotal = total_price / 1.05 WHERE subtotal IS NULL');
        }

        // 2. Drop subtotal from orderdetail if it exists
        if (Schema::hasColumn('orderdetail', 'subtotal')) {
            Schema::table('orderdetail', function (Blueprint $table) {
                $table->dropColumn('subtotal');
            });
        }

        // 3. Add updated_at to rating table if it doesn't exist
        if (!Schema::hasColumn('rating', 'updated_at')) {
            Schema::table('rating', function (Blueprint $table) {
                $table->dateTime('updated_at')->nullable()->after('created_at');
            });
        }
    }

    public function down(): void
    {
        // Rollback changes
        if (Schema::hasColumn('orders', 'subtotal')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropColumn('subtotal');
            });
        }

        if (Schema::hasColumn('rating', 'updated_at')) {
            Schema::table('rating', function (Blueprint $table) {
                $table->dropColumn('updated_at');
            });
        }

        // Re-add subtotal to orderdetail if needed
        if (!Schema::hasColumn('orderdetail', 'subtotal')) {
            Schema::table('orderdetail', function (Blueprint $table) {
                $table->float('subtotal')->nullable()->after('price');
            });
        }
    }
};
