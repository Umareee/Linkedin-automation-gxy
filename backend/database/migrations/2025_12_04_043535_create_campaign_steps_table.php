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
        Schema::create('campaign_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained()->onDelete('cascade'); // Parent campaign
            $table->foreignId('campaign_action_id')->constrained()->onDelete('cascade'); // Action type
            $table->integer('order')->default(0); // Step order in campaign sequence
            $table->integer('delay_days')->default(0); // Days to wait before this step (after previous step)
            $table->foreignId('message_template_id')->nullable()->constrained('message_templates')->onDelete('set null'); // Message template (if applicable)
            $table->json('config')->nullable(); // Step-specific configuration (e.g., custom delays, limits)
            $table->timestamps();

            // Indexes
            $table->index(['campaign_id', 'order']); // Get steps in order for a campaign
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaign_steps');
    }
};
