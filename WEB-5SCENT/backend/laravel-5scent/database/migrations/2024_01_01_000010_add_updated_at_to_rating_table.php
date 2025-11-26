<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('rating', 'updated_at')) {
            Schema::table('rating', function (Blueprint $table) {
                $table->dateTime('updated_at')->after('created_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        Schema::table('rating', function (Blueprint $table) {
            $table->dropColumn('updated_at');
        });
    }
};
