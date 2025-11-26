<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('orders')) {
            return;
        }

        Schema::create('orders', function (Blueprint $table) {
            $table->id('order_id');
            $table->unsignedBigInteger('user_id');
            $table->float('total_price');
            $table->enum('status', ['Pending', 'Packaging', 'Shipping', 'Delivered', 'Cancel'])->default('Pending');
            $table->string('shipping_address', 255);
            $table->string('tracking_number', 100)->nullable();
            $table->dateTime('created_at')->default(DB::raw('CURRENT_TIMESTAMP'));
            $table->foreign('user_id')->references('user_id')->on('user');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
