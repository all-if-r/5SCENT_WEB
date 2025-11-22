<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product', function (Blueprint $table) {
            $table->id('product_id');
            $table->string('name', 100);
            $table->text('description');
            $table->enum('category', ['Day', 'Night']);
            $table->float('price_30ml');
            $table->float('price_50ml');
            $table->integer('stock_30ml');
            $table->integer('stock_50ml');
            $table->string('top_notes', 255)->nullable();
            $table->string('middle_notes', 255)->nullable();
            $table->string('base_notes', 255)->nullable();
            $table->dateTime('created_at')->default(DB::raw('CURRENT_TIMESTAMP'));
            $table->dateTime('updated_at')->default(DB::raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product');
    }
};



