<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IpRestriction extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'restrictable_type',
        'restrictable_id',
        'ip_address',
        'type',
        'description',
        'is_active',
        'created_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the owning restrictable model (User or Role).
     */
    public function restrictable()
    {
        return $this->morphTo();
    }

    /**
     * Get the user who created this restriction.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope for active restrictions.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for allow type restrictions.
     */
    public function scopeAllowType($query)
    {
        return $query->where('type', 'allow');
    }

    /**
     * Scope for deny type restrictions.
     */
    public function scopeDenyType($query)
    {
        return $query->where('type', 'deny');
    }

    /**
     * Check if the given IP matches this restriction.
     */
    public function matchesIp(string $ip): bool
    {
        // Direct match
        if ($ip === $this->ip_address) {
            return true;
        }

        // CIDR notation check
        if (strpos($this->ip_address, '/') !== false) {
            list($subnet, $mask) = explode('/', $this->ip_address);
            $subnet = ip2long($subnet);
            $ip = ip2long($ip);
            $mask = -1 << (32 - $mask);
            $subnet &= $mask;
            return ($ip & $mask) == $subnet;
        }

        return false;
    }

    /**
     * Validate IP address format.
     */
    public static function isValidIp(string $ip): bool
    {
        // Check for single IP
        if (filter_var($ip, FILTER_VALIDATE_IP)) {
            return true;
        }

        // Check for CIDR notation
        if (strpos($ip, '/') !== false) {
            list($subnet, $mask) = explode('/', $ip);
            return filter_var($subnet, FILTER_VALIDATE_IP) && 
                   is_numeric($mask) && 
                   $mask >= 0 && 
                   $mask <= 32;
        }

        return false;
    }
}