<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notification', function (Blueprint $table) {
            // Change notif_type enum to include ProfileReminder and Delivery
            $table->enum('notif_type', ['Payment', 'OrderUpdate', 'Refund', 'ProfileReminder', 'Delivery'])
                  ->change();
        });

        // Make order_id nullable (allow 0 for notifications without order relation)
        Schema::table('notification', function (Blueprint $table) {
            $table->unsignedBigInteger('order_id')->nullable()->change();
        });

        // Add updated_at timestamp column only if it doesn't exist
        if (!Schema::hasColumn('notification', 'updated_at')) {
            Schema::table('notification', function (Blueprint $table) {
                $table->dateTime('updated_at')->nullable()->after('is_read');
            });
        }
    }

    public function down(): void
    {
        Schema::table('notification', function (Blueprint $table) {
            // Revert enum back
            $table->enum('notif_type', ['OrderUpdate', 'Payment', 'Refund'])
                  ->change();
        });

        // Make order_id not nullable again
        Schema::table('notification', function (Blueprint $table) {
            $table->unsignedBigInteger('order_id')->change();
        });

        // Drop updated_at
        Schema::table('notification', function (Blueprint $table) {
            $table->dropColumn('updated_at');
        });
    }
};
