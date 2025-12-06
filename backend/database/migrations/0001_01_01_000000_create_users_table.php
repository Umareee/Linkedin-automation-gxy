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
        Schema::create('users', function (Blueprint $table) {
            $table->id();

            // OAuth fields (PRIMARY authentication method)
            $table->string('linkedin_id')->unique(); // LinkedIn's unique user ID
            $table->string('name'); // Full name from LinkedIn
            $table->string('email')->unique(); // Email from LinkedIn
            $table->string('profile_url')->nullable(); // LinkedIn profile URL
            $table->string('profile_image_url')->nullable(); // Profile photo URL

            // OAuth tokens (encrypted)
            $table->text('oauth_access_token'); // LinkedIn API access token
            $table->text('oauth_refresh_token')->nullable(); // Refresh token (if provided)
            $table->timestamp('token_expires_at'); // Token expiration timestamp

            // Account status
            $table->boolean('is_active')->default(true); // Whether account is active
            $table->timestamp('last_login_at')->nullable(); // Last login timestamp

            $table->timestamps();

            // Indexes for performance
            $table->index('linkedin_id');
            $table->index('email');
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
