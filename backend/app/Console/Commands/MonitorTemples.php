<?php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Temple;
use App\Models\TempleNotification;
use Illuminate\Support\Facades\Log;

class MonitorTemples extends Command
{
    protected $signature = 'temples:monitor';
    protected $description = 'Monitor temple status and send alerts';

    public function handle()
    {
        $this->info('Monitoring temple status...');
        
        // Check for temples with expired trials
        $this->checkExpiredTrials();
        
        // Check for temples nearing billing limits
        $this->checkBillingLimits();
        
        // Check for inactive temples
        $this->checkInactiveTemples();
        
        $this->info('Temple monitoring completed');
        
        return 0;
    }
    
    private function checkExpiredTrials()
    {
        $expiredTrials = Temple::where('status', 'active')
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '<', now())
            ->get();
            
        foreach ($expiredTrials as $temple) {
            $temple->update(['status' => 'expired']);
            
            Log::warning("Temple {$temple->temple_code} trial expired");
            
            // Send notification
            $this->sendExpirationNotice($temple);
        }
        
        $this->line("Found {$expiredTrials->count()} expired trials");
    }
    
    private function checkBillingLimits()
    {
        // Check temples approaching their user limits
        $temples = Temple::where('status', 'active')
            ->whereNotNull('max_users')
            ->get();
            
        foreach ($temples as $temple) {
            $userCount = $temple->users()->count();
            $percentage = ($userCount / $temple->max_users) * 100;
            
            if ($percentage >= 90 && $percentage < 100) {
                // Send warning at 90%
                $this->sendLimitWarning($temple, 'users', $userCount, $temple->max_users);
            }
        }
    }
    
    private function checkInactiveTemples()
    {
        // Check for temples with no activity in last 30 days
        $inactiveDate = now()->subDays(30);
        
        $inactiveTemples = Temple::where('status', 'active')
            ->where(function ($query) use ($inactiveDate) {
                $query->whereNull('last_accessed_at')
                      ->orWhere('last_accessed_at', '<', $inactiveDate);
            })
            ->get();
            
        foreach ($inactiveTemples as $temple) {
            Log::info("Temple {$temple->temple_code} has been inactive for 30+ days");
        }
        
        $this->line("Found {$inactiveTemples->count()} inactive temples");
    }
    
    private function sendExpirationNotice($temple)
    {
        $contact = $temple->primaryContact;
        
        if (!$contact || !$contact->email) {
            return;
        }
        
        TempleNotification::create([
            'temple_id' => $temple->id,
            'type' => 'system_update',
            'channel' => 'email',
            'recipient' => $contact->email,
            'subject' => "Trial Period Expired - {$temple->temple_name}",
            'message' => "Your trial period has expired. Please contact support to continue using the service.",
            'status' => 'pending',
        ]);
    }
    
    private function sendLimitWarning($temple, $limitType, $current, $max)
    {
        $contact = $temple->primaryContact;
        
        if (!$contact || !$contact->email) {
            return;
        }
        
        $percentage = round(($current / $max) * 100);
        
        TempleNotification::create([
            'temple_id' => $temple->id,
            'type' => 'system_update',
            'channel' => 'email',
            'recipient' => $contact->email,
            'subject' => "Approaching {$limitType} Limit - {$temple->temple_name}",
            'message' => "You are currently using {$percentage}% of your {$limitType} limit ({$current}/{$max}). " .
                        "Please contact support if you need to increase your limits.",
            'status' => 'pending',
        ]);
    }
}