<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop if exists (to handle previous failed migration)
        DB::statement('DROP TABLE IF EXISTS payment_transactions');

        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('order_id')->index(); // Match the signed BIGINT type from orders.order_id
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
            $table->index('midtrans_order_id');
            $table->index('midtrans_transaction_id');
            $table->index('status');
        });

        // Add foreign key constraint separately to ensure data type compatibility
        Schema::table('payment_transactions', function (Blueprint $table) {
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
