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
        Schema::create('campaign_prospects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained()->onDelete('cascade'); // Parent campaign
            $table->foreignId('prospect_id')->constrained()->onDelete('cascade'); // Prospect from prospects table
            $table->enum('status', ['pending', 'in_progress', 'completed', 'failed', 'skipped'])->default('pending'); // Prospect status in campaign
            $table->integer('current_step')->default(0); // Current step being executed (0 = not started)
            $table->timestamp('last_action_at')->nullable(); // Last action executed time
            $table->text('failure_reason')->nullable(); // Reason if failed
            $table->timestamps();

            // Indexes
            $table->index(['campaign_id', 'status']); // Filter prospects by campaign and status
            $table->unique(['campaign_id', 'prospect_id']); // Prevent duplicate prospects in same campaign
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaign_prospects');
    }
};
