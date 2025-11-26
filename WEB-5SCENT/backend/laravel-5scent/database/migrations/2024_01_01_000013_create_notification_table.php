<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('notification')) {
            return;
        }

        Schema::create('notification', function (Blueprint $table) {
            $table->id('notif_id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('order_id');
            $table->string('message', 255);
            $table->enum('notif_type', ['OrderUpdate', 'Payment', 'Refund']);
            $table->tinyInteger('is_read')->default(0);
            $table->dateTime('created_at')->default(DB::raw('CURRENT_TIMESTAMP'));
            $table->foreign('user_id')->references('user_id')->on('user');
            $table->foreign('order_id')->references('order_id')->on('orders');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification');
    }
};



