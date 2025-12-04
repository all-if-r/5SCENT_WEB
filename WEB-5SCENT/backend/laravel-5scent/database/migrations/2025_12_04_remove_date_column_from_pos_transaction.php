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
            // Drop the old 'date' column if it exists
            if (Schema::hasColumn('pos_transaction', 'date')) {
                $table->dropColumn('date');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pos_transaction', function (Blueprint $table) {
            // Restore the 'date' column for rollback
            $table->dateTime('date')->nullable()->after('phone');
        });
    }
};
