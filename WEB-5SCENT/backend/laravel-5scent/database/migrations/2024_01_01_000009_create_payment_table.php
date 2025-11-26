<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payment')) {
            return;
        }

        Schema::create('payment', function (Blueprint $table) {
            $table->id('payment_id');
            $table->unsignedBigInteger('order_id');
            $table->string('method', 50)->default('QRIS');
            $table->float('amount');
            $table->enum('status', ['Pending', 'Success', 'Refunded', 'Failed']);
            $table->dateTime('transaction_time')->default(DB::raw('CURRENT_TIMESTAMP'));
            $table->foreign('order_id')->references('order_id')->on('orders')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment');
    }
};



