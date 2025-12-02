<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates the prospects table to store extracted LinkedIn leads.
     * Prospects are people extracted from LinkedIn search results.
     * Each prospect belongs to a user who extracted them.
     */
    public function up(): void
    {
        Schema::create('prospects', function (Blueprint $table) {
            $table->id();

            // Foreign key to users table (who extracted this prospect)
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // LinkedIn profile information
            $table->string('linkedin_id')->nullable(); // LinkedIn's internal ID
            $table->string('full_name'); // Person's name
            $table->string('profile_url')->unique(); // LinkedIn profile URL (unique identifier)
            $table->string('profile_image_url')->nullable(); // Profile picture

            // Connection status
            $table->enum('connection_status', [
                'not_connected',
                'pending',
                'connected',
                'withdrawn'
            ])->default('not_connected');

            $table->timestamps();

            // Index for faster queries
            $table->index('user_id');
            $table->index('connection_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prospects');
    }
};
