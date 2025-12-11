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
        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->string('midtrans_order_id', 50);
            $table->string('midtrans_transaction_id', 100)->nullable();
            $table->string('payment_type', 20); // 'qris', 'bank_transfer', etc.
            $table->unsignedBigInteger('gross_amount');
            $table->text('qr_url')->nullable();
            $table->enum('status', ['pending', 'settlement', 'expire', 'cancel', 'deny'])->default('pending');
            $table->dateTime('expired_at')->nullable();
            $table->longText('raw_notification')->nullable(); // JSON payload from Midtrans
            $table->timestamps();

            // Indexes
            $table->index('order_id');
            $table->index('midtrans_order_id');
            $table->index('midtrans_transaction_id');
            $table->index('status');

            // Foreign key
            $table->foreign('order_id')->references('order_id')->on('orders')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_transactions');
    }
};
