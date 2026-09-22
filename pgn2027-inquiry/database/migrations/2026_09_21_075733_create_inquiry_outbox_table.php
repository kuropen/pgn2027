<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inquiry_outbox', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->text('payload');
            $table->timestamp('created_at');
            $table->timestamp('enqueued_at')->nullable()->index();
            $table->timestamp('failed_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inquiry_outbox');
    }
};
