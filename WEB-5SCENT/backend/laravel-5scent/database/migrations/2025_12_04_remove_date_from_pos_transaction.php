<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pos_transaction') && Schema::hasColumn('pos_transaction', 'date')) {
            Schema::table('pos_transaction', function (Blueprint $table) {
                $table->dropColumn('date');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('pos_transaction') && !Schema::hasColumn('pos_transaction', 'date')) {
            Schema::table('pos_transaction', function (Blueprint $table) {
                $table->dateTime('date')->default(DB::raw('CURRENT_TIMESTAMP'))->after('phone');
            });
        }
    }
};
