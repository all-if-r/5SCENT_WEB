<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('productimage')) {
            // Check if the column doesn't exist before adding
            if (!Schema::hasColumn('productimage', 'created_at')) {
                Schema::table('productimage', function (Blueprint $table) {
                    $table->timestamp('created_at')->nullable()->default(now());
                    $table->timestamp('updated_at')->nullable()->default(now());
                });
            } elseif (!Schema::hasColumn('productimage', 'updated_at')) {
                // If created_at exists but updated_at doesn't, just add updated_at
                Schema::table('productimage', function (Blueprint $table) {
                    $table->timestamp('updated_at')->nullable()->default(now());
                });
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('productimage')) {
            Schema::table('productimage', function (Blueprint $table) {
                $table->dropColumn(['created_at', 'updated_at']);
            });
        }
    }
};
