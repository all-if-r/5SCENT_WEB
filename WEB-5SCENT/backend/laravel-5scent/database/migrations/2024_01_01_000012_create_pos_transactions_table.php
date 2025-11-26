<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pos_transaction')) {
            return;
        }

        Schema::create('pos_transaction', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_number');
            $table->string('item_code');
            $table->integer('quantity');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('subtotal', 10, 2);
            $table->decimal('total', 10, 2);
            $table->decimal('money_given', 10, 2);
            $table->decimal('change', 10, 2);
            $table->timestamp('transaction_date');
            $table->timestamps();
            
            $table->foreign('item_code')->references('item_code')->on('pos_item')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_transaction');
    }
};



