<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description');
            $table->text('notes')->nullable();
            $table->enum('category', ['Day', 'Night']);
            $table->decimal('price_30ml', 10, 2);
            $table->decimal('price_50ml', 10, 2);
            $table->integer('stock_30ml')->default(0);
            $table->integer('stock_50ml')->default(0);
            $table->boolean('is_best_seller')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};



