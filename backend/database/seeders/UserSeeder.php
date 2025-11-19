<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Start transaction
        DB::beginTransaction();

        try {
            // Create default users
            $users = [
                // Super Admin
                [
                    'name' => 'Super Administrator',
                    'username' => 'superadmin',
                    'email' => 'superadmin@templemgmt.com',
                    'password' => Hash::make('SuperAdmin@123'),
                    'role_id' => 1, // Super Admin role
                    'is_active' => 1,
                    'created_by' => null,
                ],
                
                // Admin Users
                [
                    'name' => 'John Admin',
                    'username' => 'johnadmin',
                    'email' => 'john.admin@templemgmt.com',
                    'password' => Hash::make('Admin@123'),
                    'role_id' => 2, // Admin role
                    'is_active' => 1,
                    'created_by' => 1,
                ],
                [
                    'name' => 'Sarah Administrator',
                    'username' => 'sarahadmin',
                    'email' => 'sarah.admin@templemgmt.com',
                    'password' => Hash::make('Admin@123'),
                    'role_id' => 2, // Admin role
                    'is_active' => 1,
                    'created_by' => 1,
                ],
                
                // Manager Users
                [
                    'name' => 'Michael Manager',
                    'username' => 'michaelmanager',
                    'email' => 'michael.manager@templemgmt.com',
                    'password' => Hash::make('Manager@123'),
                    'role_id' => 3, // Manager role
                    'is_active' => 1,
                    'created_by' => 1,
                ],
                [
                    'name' => 'Emily Manager',
                    'username' => 'emilymanager',
                    'email' => 'emily.manager@templemgmt.com',
                    'password' => Hash::make('Manager@123'),
                    'role_id' => 3, // Manager role
                    'is_active' => 1,
                    'created_by' => 1,
                ],
                [
                    'name' => 'David Regional Manager',
                    'username' => 'davidmanager',
                    'email' => 'david.manager@templemgmt.com',
                    'password' => Hash::make('Manager@123'),
                    'role_id' => 3, // Manager role
                    'is_active' => 1,
                    'created_by' => 1,
                ],
                
                // Support Staff
                [
                    'name' => 'Alex Support',
                    'username' => 'alexsupport',
                    'email' => 'alex.support@templemgmt.com',
                    'password' => Hash::make('Support@123'),
                    'role_id' => 4, // Support role
                    'is_active' => 1,
                    'created_by' => 2,
                ],
                [
                    'name' => 'Lisa Support',
                    'username' => 'lisasupport',
                    'email' => 'lisa.support@templemgmt.com',
                    'password' => Hash::make('Support@123'),
                    'role_id' => 4, // Support role
                    'is_active' => 1,
                    'created_by' => 2,
                ],
                [
                    'name' => 'Tom Support',
                    'username' => 'tomsupport',
                    'email' => 'tom.support@templemgmt.com',
                    'password' => Hash::make('Support@123'),
                    'role_id' => 4, // Support role
                    'is_active' => 1,
                    'created_by' => 2,
                ],
                
                // Demo/Test Users
                [
                    'name' => 'Demo Admin',
                    'username' => 'demoadmin',
                    'email' => 'demo.admin@templemgmt.com',
                    'password' => Hash::make('Demo@123'),
                    'role_id' => 2, // Admin role
                    'is_active' => 1,
                    'created_by' => 1,
                ],
                [
                    'name' => 'Test Manager',
                    'username' => 'testmanager',
                    'email' => 'test.manager@templemgmt.com',
                    'password' => Hash::make('Test@123'),
                    'role_id' => 3, // Manager role
                    'is_active' => 1,
                    'created_by' => 1,
                ],
                
                // Inactive User (for testing)
                [
                    'name' => 'Inactive User',
                    'username' => 'inactiveuser',
                    'email' => 'inactive@templemgmt.com',
                    'password' => Hash::make('Inactive@123'),
                    'role_id' => 4, // Support role
                    'is_active' => 0,
                    'created_by' => 1,
                ],
                
                // Locked User (for testing)
                [
                    'name' => 'Locked User',
                    'username' => 'lockeduser',
                    'email' => 'locked@templemgmt.com',
                    'password' => Hash::make('Locked@123'),
                    'role_id' => 4, // Support role
                    'is_active' => 1,
                    'locked_until' => now()->addHours(24),
                    'login_attempts' => 5,
                    'created_by' => 1,
                ],
            ];

            // Create users
            foreach ($users as $userData) {
                $user = User::create($userData);
                
                // Assign role using Spatie (model_has_roles table)
                $roleId = $userData['role_id'];
                DB::table('model_has_roles')->insert([
                    'role_id' => $roleId,
                    'model_type' => 'App\\Models\\User',
                    'model_id' => $user->id,
                ]);
                
                $this->command->info("Created user: {$user->username}");
            }

            // Create IP restrictions for some users
            $ipRestrictions = [
                // Super Admin - Allow only from specific IPs
                [
                    'restrictable_type' => 'App\\Models\\User',
                    'restrictable_id' => 1, // Super Admin
                    'ip_address' => '127.0.0.1',
                    'type' => 'allow',
                    'description' => 'Allow localhost for Super Admin',
                    'is_active' => 1,
                    'created_by' => 1,
                ],
                [
                    'restrictable_type' => 'App\\Models\\User',
                    'restrictable_id' => 1, // Super Admin
                    'ip_address' => '192.168.1.0/24',
                    'type' => 'allow',
                    'description' => 'Allow local network for Super Admin',
                    'is_active' => 1,
                    'created_by' => 1,
                ],
                
                // Role-based restrictions
                [
                    'restrictable_type' => 'App\\Models\\Role',
                    'restrictable_id' => 1, // Super Admin role
                    'ip_address' => '10.0.0.0/8',
                    'type' => 'allow',
                    'description' => 'Allow corporate network for Super Admin role',
                    'is_active' => 1,
                    'created_by' => 1,
                ],
            ];

            DB::table('ip_restrictions')->insert($ipRestrictions);

            // Create some login activities for demo
            $loginActivities = [
                [
                    'user_id' => 1,
                    'username' => 'superadmin',
                    'ip_address' => '127.0.0.1',
                    'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'login_status' => 'success',
                    'failure_reason' => null,
                    'location' => 'Nagercoil, India',
                    'device_type' => 'desktop',
                    'browser' => 'Chrome',
                    'platform' => 'Windows',
                    'created_at' => now()->subHours(2),
                ],
                [
                    'user_id' => 2,
                    'username' => 'johnadmin',
                    'ip_address' => '192.168.1.100',
                    'user_agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                    'login_status' => 'success',
                    'failure_reason' => null,
                    'location' => 'Chennai, India',
                    'device_type' => 'desktop',
                    'browser' => 'Safari',
                    'platform' => 'macOS',
                    'created_at' => now()->subHours(3),
                ],
                [
                    'user_id' => null,
                    'username' => 'wronguser',
                    'ip_address' => '192.168.1.50',
                    'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'login_status' => 'failed',
                    'failure_reason' => 'User not found',
                    'location' => null,
                    'device_type' => 'desktop',
                    'browser' => 'Edge',
                    'platform' => 'Windows',
                    'created_at' => now()->subHours(5),
                ],
                [
                    'user_id' => 3,
                    'username' => 'sarahadmin',
                    'ip_address' => '192.168.1.75',
                    'user_agent' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
                    'login_status' => 'success',
                    'failure_reason' => null,
                    'location' => 'Mumbai, India',
                    'device_type' => 'mobile',
                    'browser' => 'Safari',
                    'platform' => 'iOS',
                    'created_at' => now()->subDays(1),
                ],
            ];

            // Insert login activities one by one to handle null values properly
            foreach ($loginActivities as $activity) {
                DB::table('login_activities')->insert($activity);
            }

            DB::commit();

            $this->command->info('');
            $this->command->info('====================================');
            $this->command->info('Users seeded successfully!');
            $this->command->info('====================================');
            $this->command->info('');
            $this->command->info('Default Login Credentials:');
            $this->command->info('');
            $this->command->info('Super Admin:');
            $this->command->info('  Username: superadmin');
            $this->command->info('  Password: SuperAdmin@123');
            $this->command->info('');
            $this->command->info('Admin Users:');
            $this->command->info('  Username: johnadmin / sarahadmin');
            $this->command->info('  Password: Admin@123');
            $this->command->info('');
            $this->command->info('Manager Users:');
            $this->command->info('  Username: michaelmanager / emilymanager / davidmanager');
            $this->command->info('  Password: Manager@123');
            $this->command->info('');
            $this->command->info('Support Users:');
            $this->command->info('  Username: alexsupport / lisasupport / tomsupport');
            $this->command->info('  Password: Support@123');
            $this->command->info('');
            $this->command->info('Demo/Test Users:');
            $this->command->info('  Demo Admin - Username: demoadmin, Password: Demo@123');
            $this->command->info('  Test Manager - Username: testmanager, Password: Test@123');
            $this->command->info('');
            $this->command->info('Special Test Users:');
            $this->command->info('  Inactive User - Username: inactiveuser (Cannot login - inactive)');
            $this->command->info('  Locked User - Username: lockeduser (Cannot login - locked)');
            $this->command->info('');
            $this->command->info('====================================');

        } catch (\Exception $e) {
            DB::rollBack();
            $this->command->error('Error seeding users: ' . $e->getMessage());
            throw $e;
        }
    }
}