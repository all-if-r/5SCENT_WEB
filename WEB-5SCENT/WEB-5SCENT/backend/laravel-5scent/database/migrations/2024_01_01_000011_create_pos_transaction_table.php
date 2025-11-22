<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_transaction', function (Blueprint $table) {
            $table->id('transaction_id');
            $table->unsignedBigInteger('admin_id');
            $table->string('customer_name', 100);
            $table->dateTime('date')->default(DB::raw('CURRENT_TIMESTAMP'));
            $table->float('total_price');
            $table->string('payment_method', 50)->default('QRIS');
            $table->foreign('admin_id')->references('admin_id')->on('admin');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_transaction');
    }
};



