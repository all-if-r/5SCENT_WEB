<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pos_transaction')) {
            return;
        }

        Schema::create('pos_transaction', function (Blueprint $table) {
            $table->id('transaction_id');
            $table->unsignedBigInteger('admin_id');
            $table->string('customer_name', 100);
            $table->string('phone', 20)->nullable();
            $table->dateTime('date')->default(DB::raw('CURRENT_TIMESTAMP'));
            $table->float('total_price');
            // Payment method as ENUM with exact values: QRIS, Virtual_Account, Cash
            $table->enum('payment_method', ['QRIS', 'Virtual_Account', 'Cash'])->default('QRIS');
            // Cash-related fields (only populated for Cash payments)
            $table->float('cash_received')->nullable()->comment('Amount customer paid in cash');
            $table->float('cash_change')->nullable()->comment('Change to return to customer');
            // Link to Orders table
            $table->unsignedBigInteger('order_id')->nullable();
            $table->timestamps();
            
            // Foreign keys
            $table->foreign('admin_id')->references('admin_id')->on('admin');
            $table->foreign('order_id')->references('order_id')->on('orders');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_transaction');
    }
};




