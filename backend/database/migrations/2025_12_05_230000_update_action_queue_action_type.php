<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Updates the action_type column to use the new action keys from CampaignAction.
     * Old values: send_connection_request, send_message, withdraw_request, visit_profile
     * New values: visit, invite, message, follow (plus legacy values for backwards compatibility)
     */
    public function up(): void
    {
        // MySQL requires special handling for modifying ENUM columns
        // We'll use raw SQL to add the new values
        DB::statement("ALTER TABLE action_queue MODIFY COLUMN action_type ENUM(
            'send_connection_request',
            'send_message',
            'withdraw_request',
            'visit_profile',
            'visit',
            'invite',
            'message',
            'follow'
        ) DEFAULT 'visit'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Note: This will fail if there are rows with new action types
        DB::statement("ALTER TABLE action_queue MODIFY COLUMN action_type ENUM(
            'send_connection_request',
            'send_message',
            'withdraw_request',
            'visit_profile'
        ) DEFAULT 'send_connection_request'");
    }
};
