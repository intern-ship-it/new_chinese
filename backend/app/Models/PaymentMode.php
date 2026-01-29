<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;
use App\Services\S3UploadService;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PaymentMode extends Model
{
    protected $table = 'payment_modes';

    protected $fillable = [
        'name',
        'ledger_id',
        'description',
        'status',
        'is_payment_gateway',
        'is_live',
        'merchant_code',
        'merchant_key',
        'password',
        'url',
        'icon_type',
        'icon_value',
        'icon_path',
        'icon_url',
        'created_by'
    ];

    protected $casts = [
        'status' => 'integer',
        'is_payment_gateway' => 'boolean',
        'is_live' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',

    ];

    protected $hidden = [
        'merchant_key',
        'password',
    ];

    protected $appends = ['icon_display_url'];

    // Automatically encrypt sensitive fields when setting
    public function setMerchantKeyAttribute($value)
    {
        $this->attributes['merchant_key'] = $value ? Crypt::encryptString($value) : null;
    }

    public function setPasswordAttribute($value)
    {
        $this->attributes['password'] = $value ? Crypt::encryptString($value) : null;
    }

    // Automatically decrypt when retrieving
    public function getMerchantKeyAttribute($value)
    {
        try {
            return $value ? Crypt::decryptString($value) : null;
        } catch (\Exception $e) {
            return null;
        }
    }

    public function getPasswordAttribute($value)
    {
        try {
            return $value ? Crypt::decryptString($value) : null;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Get icon display URL based on icon type
     */
    public function getIconDisplayUrlAttribute()
    {
        return $this->getIconDisplayUrl();
    }

    /**
     * Get the appropriate icon URL or class
     */
    public function getIconDisplayUrl()
    {
        // If bootstrap icon, return the icon class
        if ($this->icon_type === 'bootstrap' && $this->icon_value) {
            return [
                'type' => 'bootstrap',
                'value' => $this->icon_value
            ];
        }

        // If uploaded icon with path
        if ($this->icon_type === 'upload' && $this->icon_path) {
            // Check if URL needs refresh (signed URLs expire)
            if ($this->icon_url) {
                return [
                    'type' => 'upload',
                    'value' => $this->icon_url
                ];
            }

            // Generate new signed URL
            try {
                $s3Service = app(S3UploadService::class);
                $signedUrl = $s3Service->getSignedUrl($this->icon_path);

                // Update the URL in database (optional, for caching)
                if ($signedUrl) {
                    $this->icon_url = $signedUrl;
                    $this->saveQuietly(); // Save without triggering events
                }

                return [
                    'type' => 'upload',
                    'value' => $signedUrl
                ];
            } catch (\Exception $e) {
                \Log::error('Failed to generate signed URL for payment mode icon', [
                    'payment_mode_id' => $this->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        // Default icon (bootstrap)
        return [
            'type' => 'bootstrap',
            'value' => 'bi-currency-dollar'
        ];
    }

    /**
     * Get icon HTML for display
     */
    public function getIconHtml($size = '32px', $class = '')
    {
        $iconData = $this->getIconDisplayUrl();

        if ($iconData['type'] === 'bootstrap') {
            return sprintf(
                '<i class="bi %s %s" style="font-size: %s;"></i>',
                $iconData['value'],
                $class,
                $size
            );
        } elseif ($iconData['type'] === 'upload') {
            return sprintf(
                '<img src="%s" alt="%s" class="%s" style="width: %s; height: %s; object-fit: contain;">',
                $iconData['value'],
                htmlspecialchars($this->name),
                $class,
                $size,
                $size
            );
        }

        return '';
    }

    /**
     * Relationship: Payment Mode belongs to many Roles
     */
    public function roles()
    {
        return $this->belongsToMany(
            Role::class,
            'payment_mode_roles',
            'payment_mode_id',
            'role_id'
        )->withTimestamps();
    }

    /**
     * Relationship: Payment Mode belongs to a Ledger
     */
    public function ledger()
    {
        return $this->belongsTo(Ledger::class, 'ledger_id');
    }

    /**
     * Relationship: Payment Mode created by User
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope: Get only active payment modes
     */
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }

    /**
     * Scope: Get payment modes for a specific role
     */
    public function scopeForRole($query, $roleId)
    {
        return $query->whereHas('roles', function ($q) use ($roleId) {
            $q->where('roles.id', $roleId);
        });
    }

    /**
     * Scope: Get payment modes for multiple roles
     */
    public function scopeForRoles($query, array $roleIds)
    {
        return $query->whereHas('roles', function ($q) use ($roleIds) {
            $q->whereIn('roles.id', $roleIds);
        });
    }

    /**
     * Scope: Get payment gateways only
     */
    public function scopePaymentGateways($query)
    {
        return $query->where('is_payment_gateway', true);
    }

    public function scopeForModule($query, $moduleId)
    {
        return $query->whereHas('modules', function ($q) use ($moduleId) {
            $q->where('modules.id', $moduleId);
        });
    }

    /**
     * Scope: Get live payment modes
     */
    public function scopeLive($query)
    {
        return $query->where('is_live', true);
    }

    /**
     * Check if payment mode is assigned to super_admin only
     */
    public function isSuperAdminOnly()
    {
        $roleNames = $this->roles->pluck('name')->toArray();
        return count($roleNames) === 1 && in_array('super_admin', $roleNames);
    }

    /**
     * Check if user can access this payment mode
     */
    public function canBeAccessedBy($user)
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        $userRoleIds = $user->roles->pluck('id')->toArray();
        $paymentModeRoleIds = $this->roles->pluck('id')->toArray();

        return count(array_intersect($userRoleIds, $paymentModeRoleIds)) > 0;
    }

    /**
     * Modules assigned to this payment mode
     */
    public function modules()
    {
        return $this->belongsToMany(Module::class, 'payment_mode_modules');
    }

    /**
     * Get all payments made with this mode
     */
    public function payments()
    {
        return $this->hasMany(BookingPayment::class, 'payment_mode_id');
    }


    /**
     * Scope to get online payment modes
     */
    public function scopeOnline($query)
    {
        return $query->where('is_online', true);
    }

    /**
     * Scope to get offline payment modes
     */
    public function scopeOffline($query)
    {
        return $query->where('is_online', false);
    }

    /**
     * Scope to order by sort order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order');
    }

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

public function meta()
{
    return $this->hasMany(PaymentModeMeta::class, 'payment_mode_id')
                ->orderBy('id', 'asc');
}

    // Helper to get meta as key-value array
    public function getMetaArray()
    {
        return $this->meta->pluck('meta_value', 'meta_key')->toArray();
    }

    // Helper to get meta with type information
    public function getMetaWithTypes()
    {
        return $this->meta->map(function ($meta) {
            return [
                'key' => $meta->meta_key,
                'value' => $meta->meta_value,
                'type' => $meta->meta_type,
                'id' => $meta->id
            ];
        })->toArray();
    }
}
