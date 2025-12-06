<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Campaign Action Seeder
 *
 * Seeds the campaign_actions table with the initial set of available action types.
 * These are the building blocks for creating campaigns.
 */
class CampaignActionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Inserts the following action types:
     * 1. Visit - Visit prospect's LinkedIn profile
     * 2. Invite - Send connection request with optional message
     * 3. Message - Send direct message to existing connection
     * 4. Follow - Follow the prospect's profile
     */
    public function run(): void
    {
        $actions = [
            [
                'key' => 'visit',
                'name' => 'Visit Profile',
                'description' => 'Visit your prospects\' LinkedIn profile to increase visibility',
                'icon' => 'eye',
                'requires_template' => false,
                'requires_connection' => false,
                'config' => json_encode([
                    'min_delay' => 2,
                    'max_delay' => 5,
                ]),
                'is_active' => true,
                'order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'invite',
                'name' => 'Send Connection Request',
                'description' => 'Send a connection request with an optional personalized message',
                'icon' => 'user-plus',
                'requires_template' => true,
                'requires_connection' => false,
                'config' => json_encode([
                    'min_delay' => 3,
                    'max_delay' => 7,
                    'message_max_length' => 300,
                ]),
                'is_active' => true,
                'order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'message',
                'name' => 'Send Message',
                'description' => 'Send a direct message to your existing connections',
                'icon' => 'message-square',
                'requires_template' => true,
                'requires_connection' => true,
                'config' => json_encode([
                    'min_delay' => 5,
                    'max_delay' => 10,
                ]),
                'is_active' => true,
                'order' => 3,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'follow',
                'name' => 'Follow Profile',
                'description' => 'Follow the prospect\'s LinkedIn profile',
                'icon' => 'user-check',
                'requires_template' => false,
                'requires_connection' => false,
                'config' => json_encode([
                    'min_delay' => 2,
                    'max_delay' => 4,
                ]),
                'is_active' => true,
                'order' => 4,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('campaign_actions')->insert($actions);

        $this->command->info('✅ Campaign actions seeded successfully!');
        $this->command->info('   - Visit Profile');
        $this->command->info('   - Send Connection Request');
        $this->command->info('   - Send Message');
        $this->command->info('   - Follow Profile');
    }
}
