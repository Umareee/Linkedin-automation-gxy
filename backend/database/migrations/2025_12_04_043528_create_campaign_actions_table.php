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
        Schema::create('campaign_actions', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique(); // Unique action identifier (e.g., 'visit', 'invite', 'message', 'follow')
            $table->string('name'); // Display name (e.g., 'Visit Profile')
            $table->text('description'); // Action description
            $table->string('icon')->nullable(); // Icon identifier for UI
            $table->boolean('requires_template')->default(false); // Does this action require a message template?
            $table->boolean('requires_connection')->default(false); // Does this action require an existing connection?
            $table->json('config')->nullable(); // Additional configuration (delays, limits, etc.)
            $table->boolean('is_active')->default(true); // Is this action type available?
            $table->integer('order')->default(0); // Display order in UI
            $table->timestamps();

            // Indexes
            $table->index('is_active'); // Filter active actions
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaign_actions');
    }
};
