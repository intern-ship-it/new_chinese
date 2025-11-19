<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingSetting extends Model
{
    protected $fillable = ['key', 'value', 'description', 'type'];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Current booking types
    const TYPE_GENERAL = 'GENERAL';
    const TYPE_ARCHANAI = 'ARCHANAI';
    
    // Future booking types
    const TYPE_UBAYAM = 'UBAYAM';
    const TYPE_HALL = 'HALL';
    const TYPE_ANNATHANAM = 'ANNATHANAM';
    const TYPE_DONATION = 'DONATION';
    const TYPE_PRASADAM = 'PRASADAM';
    const TYPE_INDOOR_SERVICE = 'INDOOR_SERVICE';
    const TYPE_OUTDOOR_SERVICE = 'OUTDOOR_SERVICE';

    public static function getSetting($key, $default = null)
    {
        $setting = self::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    public static function setSetting($key, $value, $type = 'GENERAL', $description = null)
    {
        return self::updateOrCreate(
            ['key' => $key],
            [
                'value' => $value, 
                'type' => $type,
                'description' => $description
            ]
        );
    }

    public static function getSettingsByType($type)
    {
        return self::where('type', $type)->pluck('value', 'key')->toArray();
    }

    // Helper to get printer mapping for a user
    public static function getPrinterForUser($userId)
    {
        $mappings = self::getSetting('printer_mappings');
        if ($mappings) {
            $mappingArray = json_decode($mappings, true);
            foreach ($mappingArray as $mapping) {
                if (isset($mapping['staff_id']) && $mapping['staff_id'] == $userId) {
                    return $mapping['printer_type'];
                }
                if (isset($mapping['admin_id']) && $mapping['admin_id'] == $userId) {
                    return $mapping['printer_type'];
                }
            }
        }
        return null;
    }
}