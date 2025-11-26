<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('user')) {
            return;
        }

        Schema::create('user', function (Blueprint $table) {
            $table->id('user_id');
            $table->string('name', 100);
            $table->string('email', 100)->unique();
            $table->string('password', 255);
            $table->string('phone', 20)->nullable();
            $table->string('address_line', 255)->nullable();
            $table->string('district', 255)->nullable();
            $table->string('city', 255)->nullable();
            $table->string('province', 255)->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->string('profile_pic', 255)->nullable();
            $table->dateTime('created_at')->default(DB::raw('CURRENT_TIMESTAMP'));
            $table->dateTime('updated_at')->default(DB::raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user');
    }
};



