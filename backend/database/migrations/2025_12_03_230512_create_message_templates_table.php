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
        Schema::create('message_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // Owner of the template
            $table->string('name'); // Template name (e.g., "Tech Startup Outreach")
            $table->enum('type', ['invitation', 'message']); // Type: invitation or direct message
            $table->text('content'); // Template message content
            $table->timestamps();

            // Indexes
            $table->index(['user_id', 'type']); // Filter templates by user and type
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('message_templates');
    }
};
