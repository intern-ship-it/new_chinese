<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class BookingItem extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'booking_id',
        'item_type',
        'item_id',
        'deity_id',          // NEW: Reference to deities table for deity-specific items
        'short_code',        // NEW: Short code for the sale item
        'item_name',
        'item_name_secondary',
        'service_date',
        'service_time',
        'quantity',
        'unit_price',
        'total_price',
        'status',
        'add_ons',           // NEW: 0 = regular item, 1 = addon service
        'notes'
    ];

    protected $casts = [
        'service_date' => 'date',
        'service_time' => 'datetime:H:i',
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'deity_id' => 'integer',
        'item_id' => 'integer',
        'add_ons' => 'integer'  // NEW: Cast to integer
    ];

    /**
     * Status Constants
     */
    const STATUS_PENDING = 'PENDING';
    const STATUS_PROCESSING = 'PROCESSING';
    const STATUS_COMPLETED = 'COMPLETED';
    const STATUS_CANCELLED = 'CANCELLED';

    /**
     * Item Type Constants
     */
    const TYPE_SALES = 'SALES';
    const TYPE_BUDDHA_LAMP = 'BUDDHA_LAMP';
    const TYPE_DONATION = 'DONATION';
    const TYPE_HALL_SESSION = 'HALLL_SESSION';
    const TYPE_HALL_SERVICES = 'HALLL_SERVICES';
    const TYPE_ROM = 'ROM';
    const TYPE_DHARMA_ASSEMBLY = 'DHARMA_ASSEMBLY';
    const TYPE_EVENT = 'EVENT';

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = Str::uuid()->toString();
            }
        });
    }

    /**
     * Relationship: Booking
     */
    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * Relationship: Deity
     */
    public function deity()
    {
        return $this->belongsTo(Deity::class, 'deity_id');
    }

    /**
     * Relationship: Sale Item (original item reference)
     */
    public function saleItem()
    {
        return $this->belongsTo(SaleItem::class, 'item_id');
    }

    /**
     * Relationship: Rasi entries
     */
    public function rasi()
    {
        return $this->hasMany(BookingRasi::class);
    }

    /**
     * Relationship: Vehicle
     */
    public function vehicle()
    {
        return $this->hasOne(BookingVehicle::class);
    }

    /**
     * Relationship: Vehicles (multiple)
     */
    public function vehicles()
    {
        return $this->hasMany(BookingVehicle::class, 'booking_item_id');
    }

    /**
     * Relationship: Commissions
     */
    public function commissions()
    {
        return $this->hasMany(BookingCommission::class);
    }

    /**
     * Relationship: Item Meta
     */
    public function meta()
    {
        return $this->hasMany(BookingItemMeta::class, 'booking_item_id');
    }

    /**
     * Relationship: Archanai detail (alternate name)
     */
    public function archanaiDetail()
    {
        return $this->hasOne(BookingArchanai::class, 'booking_item_id', 'id');
    }

    /**
     * Scope: Filter by item type
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $type
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('item_type', $type);
    }

    /**
     * Scope: Filter by deity
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $deityId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeForDeity($query, $deityId)
    {
        return $query->where('deity_id', $deityId);
    }

    /**
     * Scope: Filter by status
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $status
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope: Pending items
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /**
     * Scope: Completed items
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    /**
     * Scope: Filter by add_ons flag
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $isAddon
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeAddons($query, $isAddon = 1)
    {
        return $query->where('add_ons', $isAddon);
    }

    /**
     * Scope: Regular items (not addons)
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeRegularItems($query)
    {
        return $query->where('add_ons', 0);
    }

    /**
     * Get meta value by key
     *
     * @param string $key
     * @return mixed
     */
    public function getMetaValue($key)
    {
        $meta = $this->meta()->where('meta_key', $key)->first();
        return $meta ? $meta->meta_value : null;
    }

    /**
     * Set meta value
     *
     * @param string $key
     * @param mixed $value
     * @param string $type
     * @return BookingItemMeta
     */
    public function setMetaValue($key, $value, $type = 'STRING')
    {
        return $this->meta()->updateOrCreate(
            ['meta_key' => $key],
            ['meta_value' => $value, 'meta_type' => $type]
        );
    }

    /**
     * Calculate total price
     *
     * @return float
     */
    public function calculateTotal()
    {
        return (float) $this->unit_price * (int) $this->quantity;
    }

    /**
     * Get full display name
     *
     * @return string
     */
    public function getDisplayName()
    {
        if ($this->item_name_secondary) {
            return $this->item_name . ' / ' . $this->item_name_secondary;
        }
        return $this->item_name;
    }

    /**
     * Get all meta as key-value array
     */
    public function getMetaArray()
    {
        $metaArray = [];
        foreach ($this->meta as $meta) {
            $metaArray[$meta->meta_key] = $meta->meta_value;
        }
        return $metaArray;
    }

    /**
     * Check if item is an addon service
     *
     * @return bool
     */
    public function isAddon()
    {
        return $this->add_ons === 1;
    }

    /**
     * Check if item is a regular (non-addon) item
     *
     * @return bool
     */
    public function isRegular()
    {
        return $this->add_ons === 0;
    }

    /**
     * Check if item is successful
     */
    public function isSuccess()
    {
        return $this->status === 'SUCCESS';
    }

    /**
     * Check if item is pending
     */
    public function isPending()
    {
        return $this->status === 'PENDING';
    }

    /**
     * Check if item is failed
     */
    public function isFailed()
    {
        return $this->status === 'FAILED';
    }

    /**
     * Scope to filter by status
     */
    public function scopeWithStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to filter by service date
     */
    public function scopeForDate($query, $date)
    {
        return $query->whereDate('service_date', $date);
    }

    /**
     * Scope to filter by date range
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('service_date', [$startDate, $endDate]);
    }

    /**
     * Scope to get items with deity
     */
    public function scopeWithDeity($query, $deityId)
    {
        return $query->where('deity_id', $deityId);
    }
    public function bookingItemMeta()
    {
        return $this->hasMany(BookingItemMeta::class, 'booking_item_id', 'id');
    }
}
