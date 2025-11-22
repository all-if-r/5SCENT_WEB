<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_item', function (Blueprint $table) {
            $table->id('pos_item_id');
            $table->unsignedBigInteger('transaction_id');
            $table->unsignedBigInteger('product_id');
            $table->enum('size', ['30ml', '50ml']);
            $table->integer('quantity');
            $table->float('price');
            $table->float('subtotal');
            $table->foreign('transaction_id')->references('transaction_id')->on('pos_transaction')->onDelete('cascade');
            $table->foreign('product_id')->references('product_id')->on('product');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_item');
    }
};



