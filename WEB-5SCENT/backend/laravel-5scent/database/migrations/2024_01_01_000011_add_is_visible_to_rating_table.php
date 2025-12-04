<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('rating', 'is_visible')) {
            Schema::table('rating', function (Blueprint $table) {
                $table->boolean('is_visible')->default(true)->after('comment');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('rating', 'is_visible')) {
            Schema::table('rating', function (Blueprint $table) {
                $table->dropColumn('is_visible');
            });
        }
    }
};
