<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payment') || Schema::hasTable('payments')) {
            return;
        }

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->onDelete('cascade');
            $table->enum('payment_method', ['COD', 'QRIS']);
            $table->enum('payment_status', ['Pending', 'Paid', 'Failed'])->default('Pending');
            $table->string('transaction_id')->nullable();
            $table->string('midtrans_order_id')->nullable();
            $table->string('midtrans_transaction_id')->nullable();
            $table->decimal('amount', 10, 2);
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};



