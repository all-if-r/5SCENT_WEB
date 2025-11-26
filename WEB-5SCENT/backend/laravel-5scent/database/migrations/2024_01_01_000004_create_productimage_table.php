<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('productimage')) {
            return;
        }

        Schema::create('productimage', function (Blueprint $table) {
            $table->id('image_id');
            $table->unsignedBigInteger('product_id');
            $table->string('image_url', 255);
            $table->tinyInteger('is_50ml')->default(0);
            $table->foreign('product_id')->references('product_id')->on('product')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('productimage');
    }
};



