<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Facades\Cache;

class SystemSetting extends Model
{
    use HasUuids;

    protected $fillable = ['key', 'value', 'description', 'type'];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get a single setting value by key
     */
    public static function get($key, $default = null)
    {
        return Cache::remember("system_setting_{$key}", 3600, function () use ($key, $default) {
            $setting = self::where('key', $key)->first();
            return $setting ? $setting->value : $default;
        });
    }

    /**
     * Set a setting value
     */
    public static function set($key, $value, $type = 'SYSTEM')
    {
        Cache::forget("system_setting_{$key}");
        Cache::forget("system_settings_type_{$type}");
        Cache::forget('system_settings_all');
        
        return self::updateOrCreate(
            ['key' => $key],
            [
                'value' => $value,
                'type' => $type
            ]
        );
    }

    /**
     * Get all settings
     */
    public static function getAll()
    {
        return Cache::remember('system_settings_all', 3600, function () {
            return self::pluck('value', 'key')->toArray();
        });
    }

    /**
     * Get settings by type
     */
    public static function getByType($type)
    {
        return Cache::remember("system_settings_type_{$type}", 3600, function () use ($type) {
            return self::where('type', $type)->pluck('value', 'key')->toArray();
        });
    }

    /**
     * Get all settings grouped by type
     */
    public static function getAllGroupedByType()
    {
        return Cache::remember('system_settings_grouped', 3600, function () {
            $settings = self::all();
            $grouped = [];
            
            foreach ($settings as $setting) {
                if (!isset($grouped[$setting->type])) {
                    $grouped[$setting->type] = [];
                }
                $grouped[$setting->type][$setting->key] = $setting->value;
            }
            
            return $grouped;
        });
    }

    /**
     * Clear all settings cache
     */
    public static function clearCache()
    {
        $settings = self::all();
        
        foreach ($settings as $setting) {
            Cache::forget("system_setting_{$setting->key}");
        }
        
        $types = self::distinct('type')->pluck('type');
        foreach ($types as $type) {
            Cache::forget("system_settings_type_{$type}");
        }
        
        Cache::forget('system_settings_all');
        Cache::forget('system_settings_grouped');
    }

    /**
     * Boot method
     */
    protected static function boot()
    {
        parent::boot();

        static::saved(function ($setting) {
            Cache::forget("system_setting_{$setting->key}");
            Cache::forget("system_settings_type_{$setting->type}");
            Cache::forget('system_settings_all');
            Cache::forget('system_settings_grouped');
        });

        static::deleted(function ($setting) {
            Cache::forget("system_setting_{$setting->key}");
            Cache::forget("system_settings_type_{$setting->type}");
            Cache::forget('system_settings_all');
            Cache::forget('system_settings_grouped');
        });
    }
}