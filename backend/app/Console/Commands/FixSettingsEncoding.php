<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SystemSetting;
use Illuminate\Support\Facades\DB;

class FixSettingsEncoding extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'settings:fix-encoding {--clean : Remove problematic settings}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix UTF-8 encoding issues in system settings';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting to fix settings encoding issues...');
        
        $settings = SystemSetting::all();
        $fixed = 0;
        $removed = 0;
        $errors = [];

        foreach ($settings as $setting) {
            try {
                $originalValue = $setting->value;
                
                // Check if value is null or empty
                if ($originalValue === null || $originalValue === '') {
                    $this->warn("Setting {$setting->key} has null/empty value");
                    continue;
                }
                
                // Try to detect and fix encoding
                if (is_string($originalValue)) {
                    // Check if it's valid UTF-8
                    if (!mb_check_encoding($originalValue, 'UTF-8')) {
                        $this->error("Setting {$setting->key} has invalid UTF-8 encoding");
                        
                        if ($this->option('clean')) {
                            // Remove the problematic setting
                            $setting->delete();
                            $removed++;
                            $this->info("Removed setting: {$setting->key}");
                        } else {
                            // Try to fix encoding
                            $encoding = mb_detect_encoding($originalValue, ['UTF-8', 'ISO-8859-1', 'Windows-1252', 'ASCII'], true);
                            
                            if ($encoding && $encoding !== 'UTF-8') {
                                $cleanValue = mb_convert_encoding($originalValue, 'UTF-8', $encoding);
                            } else {
                                // Force UTF-8 and remove invalid characters
                                $cleanValue = iconv('UTF-8', 'UTF-8//IGNORE', $originalValue);
                            }
                            
                            // Remove control characters
                            $cleanValue = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $cleanValue);
                            
                            $setting->value = $cleanValue;
                            $setting->save();
                            $fixed++;
                            $this->info("Fixed encoding for: {$setting->key}");
                        }
                    } else {
                        // Even if UTF-8, check for control characters
                        $cleanValue = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $originalValue);
                        
                        if ($cleanValue !== $originalValue) {
                            $setting->value = $cleanValue;
                            $setting->save();
                            $fixed++;
                            $this->info("Removed control characters from: {$setting->key}");
                        }
                    }
                }
                
                // Ensure type is set
                if (empty($setting->type) || $setting->type === null) {
                    $type = $this->determineType($setting->key);
                    $setting->type = $type;
                    $setting->save();
                    $this->info("Set type for {$setting->key} to {$type}");
                }
                
            } catch (\Exception $e) {
                $errors[] = "Failed to process {$setting->key}: " . $e->getMessage();
                $this->error("Failed to process {$setting->key}: " . $e->getMessage());
            }
        }

        // Clear all caches
        \Artisan::call('cache:clear');
        
        $this->info('----------------------------------------');
        $this->info("Fixed: {$fixed} settings");
        $this->info("Removed: {$removed} settings");
        $this->info("Errors: " . count($errors));
        
        if (count($errors) > 0) {
            $this->error('Errors encountered:');
            foreach ($errors as $error) {
                $this->error($error);
            }
        }
        
        $this->info('Settings encoding fix completed!');
        
        // Show current status
        $this->showCurrentStatus();
    }
    
    /**
     * Show current status of settings
     */
    private function showCurrentStatus()
    {
        $this->info('');
        $this->info('Current Settings Status:');
        $this->info('----------------------------------------');
        
        $types = SystemSetting::select('type', DB::raw('count(*) as count'))
            ->groupBy('type')
            ->get();
        
        $this->table(['Type', 'Count'], $types->map(function($item) {
            return [$item->type ?: 'NULL', $item->count];
        })->toArray());
        
        // Check for any remaining encoding issues
        $this->info('');
        $this->info('Checking for remaining encoding issues...');
        
        $hasIssues = false;
        $settings = SystemSetting::all();
        
        foreach ($settings as $setting) {
            if (is_string($setting->value) && !mb_check_encoding($setting->value, 'UTF-8')) {
                $this->error("Still has encoding issue: {$setting->key}");
                $hasIssues = true;
            }
        }
        
        if (!$hasIssues) {
            $this->info('? No encoding issues found!');
        }
    }
    
    /**
     * Determine setting type based on key prefix
     */
    private function determineType($key)
    {
        $typeMap = [
            'aws_' => 'AWS',
            'mail_' => 'EMAIL',
            'email_' => 'EMAIL',
            'sms_' => 'SMS',
            'payment_' => 'PAYMENT',
            'razorpay_' => 'PAYMENT',
            'stripe_' => 'PAYMENT',
            'notification_' => 'NOTIFICATION',
            'temple_' => 'SYSTEM',
            'background_' => 'SYSTEM',
        ];

        foreach ($typeMap as $prefix => $type) {
            if (str_starts_with($key, $prefix)) {
                return $type;
            }
        }

        return 'SYSTEM';
    }
}