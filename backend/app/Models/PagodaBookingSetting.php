<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PagodaBookingSetting extends Model
{
    use HasUuids;

    protected $table = 'pagoda_booking_settings';
    
    protected $fillable = [
        'setting_key',
        'setting_value',
        'setting_type',
        'description',
        'is_system'
    ];

    protected $casts = [
        'is_system' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Helper methods to get typed values
    public function getValue()
    {
        switch ($this->setting_type) {
            case 'number':
                return (int) $this->setting_value;
            case 'boolean':
                return filter_var($this->setting_value, FILTER_VALIDATE_BOOLEAN);
            case 'json':
                return json_decode($this->setting_value, true);
            default:
                return $this->setting_value;
        }
    }

    // Static helper to get setting by key
    public static function get($key, $default = null)
    {
        $setting = static::where('setting_key', $key)->first();
        return $setting ? $setting->getValue() : $default;
    }

    // Static helper to set setting
    public static function set($key, $value, $type = 'string')
    {
        return static::updateOrCreate(
            ['setting_key' => $key],
            [
                'setting_value' => is_array($value) ? json_encode($value) : $value,
                'setting_type' => $type
            ]
        );
    }
}