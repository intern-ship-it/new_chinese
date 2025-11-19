<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->command->info('Starting database seeding...');
        
        // Since roles and permissions are already in SQL file,
        // we only need to seed users
        $this->call([
            UserSeeder::class,
        ]);
        
        // If you want to seed permissions and roles via PHP instead of SQL
        // Uncomment the following lines:
        // $this->call([
        //     RolesAndPermissionsSeeder::class,
        //     UserSeeder::class,
        // ]);
        
        $this->command->info('Database seeding completed successfully!');
    }
}