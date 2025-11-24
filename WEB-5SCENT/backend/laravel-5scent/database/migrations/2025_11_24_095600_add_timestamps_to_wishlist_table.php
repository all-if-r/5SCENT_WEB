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
        Schema::table('wishlist', function (Blueprint $table) {
            // Add timestamps if they don't exist
            if (!Schema::hasColumn('wishlist', 'created_at')) {
                $table->datetime('created_at')->nullable()->default(DB::raw('CURRENT_TIMESTAMP'));
            }
            if (!Schema::hasColumn('wishlist', 'updated_at')) {
                $table->datetime('updated_at')->nullable()->default(DB::raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('wishlist', function (Blueprint $table) {
            // Drop timestamps if they were added
            $table->dropColumn(['created_at', 'updated_at']);
        });
    }
};
