<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * The Artisan commands provided by your application.
     *
     * @var array
     */
    protected $commands = [
        // Custom Commands
        \App\Console\Commands\FixSettingsEncoding::class,
        
        // Add other custom commands here if you have any
        // \App\Console\Commands\SendBookingReminders::class,
        // \App\Console\Commands\CheckSubscriptionExpiry::class,
        // \App\Console\Commands\GenerateMonthlyReports::class,
        // \App\Console\Commands\CleanupOldSessions::class,
        // \App\Console\Commands\BackupDatabase::class,
    ];

    /**
     * Define the application's command schedule.
     *
     * @param  \Illuminate\Console\Scheduling\Schedule  $schedule
     * @return void
     */
    protected function schedule(Schedule $schedule)
    {
        // Schedule commands to run automatically
        
        // Example: Send booking reminders every hour
        // $schedule->command('bookings:send-reminders')->hourly();
        
        // Example: Check for expiring member subscriptions daily at 9 AM
        // $schedule->command('subscriptions:check-expiry')->dailyAt('09:00');
        
        // Example: Generate daily reports at midnight
        // $schedule->command('reports:daily')->dailyAt('00:00');
        
        // Example: Clean up old sessions weekly
        // $schedule->command('sessions:cleanup')->weekly();
        
        // Example: Backup database daily at 2 AM
        // $schedule->command('backup:run')->dailyAt('02:00');
        
        // Example: Clear expired password reset tokens
        // $schedule->command('auth:clear-resets')->everyFifteenMinutes();
        
        // Example: Clean temporary files daily
        // $schedule->command('storage:clean-temp')->daily();
        
        // Example: Send subscription expiry notifications
        // $schedule->command('notifications:subscription-expiry')
        //     ->dailyAt('10:00')
        //     ->when(function () {
        //         return config('notifications.subscription_expiry_enabled', true);
        //     });
        
        // Example: Process queued emails if using database queue
        // $schedule->command('queue:work --stop-when-empty')
        //     ->everyMinute()
        //     ->withoutOverlapping();
        
        // Example: Generate monthly reports on the first day of each month
        // $schedule->command('reports:monthly')
        //     ->monthlyOn(1, '00:30');
        
        // Example: Sync with external payment gateways
        // $schedule->command('payments:sync')->everyThirtyMinutes();
        
        // Example: Update member statistics cache
        // $schedule->command('members:update-stats')->hourly();
        
        // Log scheduled task execution (optional)
        // $schedule->command('schedule:list')->dailyAt('23:59')
        //     ->appendOutputTo(storage_path('logs/schedule.log'));
    }

    /**
     * Register the commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }

    /**
     * Get the timezone that should be used by default for scheduled events.
     *
     * @return \DateTimeZone|string|null
     */
    protected function scheduleTimezone()
    {
        // You can set the timezone for scheduled tasks
        // This can be pulled from your settings if needed
        return config('app.schedule_timezone', 'Asia/Kolkata');
    }
}