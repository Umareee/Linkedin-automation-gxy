<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // Campaign owner
            $table->string('name'); // Campaign name
            $table->text('description')->nullable(); // Campaign description
            $table->enum('status', ['draft', 'active', 'paused', 'completed', 'archived'])->default('draft'); // Campaign status
            $table->integer('daily_limit')->default(50); // Daily action limit
            $table->integer('total_prospects')->default(0); // Total prospects in campaign
            $table->integer('processed_prospects')->default(0); // Prospects processed
            $table->integer('success_count')->default(0); // Successful actions
            $table->integer('failure_count')->default(0); // Failed actions
            $table->timestamp('started_at')->nullable(); // Campaign start time
            $table->timestamp('completed_at')->nullable(); // Campaign completion time
            $table->timestamps();
            $table->softDeletes(); // Soft delete support

            // Indexes
            $table->index(['user_id', 'status']); // Filter campaigns by user and status
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};
