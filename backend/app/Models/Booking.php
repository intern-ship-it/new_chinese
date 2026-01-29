<?php
// app/Models/Booking.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Booking extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'booking_number',
        'booking_type',      // SALES, BUDDHA_LAMP, DONATION, HALL, ROM, DHARMA_ASSEMBLY, EVENT
        'devotee_id',
        'booking_date',
        'booking_status',
        'payment_status',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'deposit_amount',
        'total_amount',
        'paid_amount',
        'invoice_no',
        'payment_method',
        'print_option',
        'special_instructions',
        'booking_through',
        'commission_migration',  // NEW: 0=pending, 1=completed
        'inventory_migration',   // NEW: 0=pending, 1=completed
        'account_migration',     // 0=pending, 1=completed
        'created_by',
        'user_id'
    ];

    protected $casts = [
        'booking_date' => 'datetime',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'deposit_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'commission_migration' => 'integer',
        'inventory_migration' => 'integer',
        'account_migration' => 'integer'
    ];

    /**
     * Booking Status Constants
     */
    const STATUS_PENDING = 'PENDING';
    const STATUS_CONFIRMED = 'CONFIRMED';
    const STATUS_COMPLETED = 'COMPLETED';
    const STATUS_CANCELLED = 'CANCELLED';
    const STATUS_FAILED = 'FAILED';

    /**
     * Payment Status Constants
     */
    const PAYMENT_PENDING = 'PENDING';
    const PAYMENT_PARTIAL = 'PARTIAL';
    const PAYMENT_FULL = 'FULL';

    /**
     * Print Option Constants
     */
    const PRINT_NO = 'NO_PRINT';
    const PRINT_SINGLE = 'SINGLE_PRINT';
    const PRINT_SEPARATE = 'SEP_PRINT';

    /**
     * Booking Type Constants
     */
    const TYPE_SALES = 'SALES';
    const TYPE_BUDDHA_LAMP = 'BUDDHA_LAMP';
    const TYPE_DONATION = 'DONATION';
    const TYPE_HALL = 'HALL';
    const TYPE_ROM = 'ROM';
    const TYPE_DHARMA_ASSEMBLY = 'DHARMA_ASSEMBLY';
    const TYPE_EVENT = 'EVENT';
	
	/**
     * Booking Through Constants
     */
    const THROUGH_ADMIN = 'ADMIN';
    const THROUGH_COUNTER = 'COUNTER';
    const THROUGH_APP = 'APP';
    const THROUGH_KIOSK = 'KIOSK';
    const THROUGH_ONLINE = 'ONLINE';

    /**
     * Migration Status Constants
     */
    const MIGRATION_PENDING = 0;
    const MIGRATION_COMPLETED = 1;

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = Str::uuid()->toString();
            }
        });
    }

    public function items()
    {
        return $this->hasMany(BookingItem::class);
    }

    public function meta()
    {
        return $this->hasMany(BookingMeta::class);
    }

    public function payments()
    {
        return $this->hasMany(BookingPayment::class);
    }
	public function payment()
    {
        return $this->hasOne(BookingPayment::class)->latestOfMany();
    }
	public function commissions()
    {
        return $this->hasMany(BookingCommission::class, 'booking_id');
    }
    public function devotee()
    {
        return $this->belongsTo(User::class, 'devotee_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function rasiEntries()
    {
        return $this->hasMany(BookingRasi::class, 'booking_id', 'id');
    }

    public function vehicles()
    {
        return $this->hasMany(BookingVehicle::class, 'booking_id', 'id');
    }
        public function rasi()
    {
        return $this->hasMany(BookingRasi::class, 'booking_id');
    }

    public function deity()
    {
        return $this->belongsTo(Deity::class, 'deity_id', 'id');
    }

    public function group()
    {
        return $this->belongsTo(Group::class, 'group_id', 'id');
    }

    /**
     * Scope: Filter by booking type
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $type
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('booking_type', $type);
    }

    /**
     * Scope: Filter by booking status
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $status
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeStatus($query, $status)
    {
        return $query->where('booking_status', $status);
    }

    /**
     * Scope: Filter by payment status
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $status
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopePaymentStatus($query, $status)
    {
        return $query->where('payment_status', $status);
    }

    /**
     * Scope: Filter pending bookings
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopePending($query)
    {
        return $query->where('booking_status', self::STATUS_PENDING);
    }

    /**
     * Scope: Filter confirmed bookings
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeConfirmed($query)
    {
        return $query->where('booking_status', self::STATUS_CONFIRMED);
    }

    /**
     * Scope: Filter completed bookings
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeCompleted($query)
    {
        return $query->where('booking_status', self::STATUS_COMPLETED);
    }

    /**
     * Scope: Filter cancelled bookings
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeCancelled($query)
    {
        return $query->where('booking_status', self::STATUS_CANCELLED);
    }

    /**
     * Scope: Filter by commission migration status
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $status
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeCommissionMigration($query, $status)
    {
        return $query->where('commission_migration', $status);
    }

    /**
     * Scope: Filter by inventory migration status
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $status
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeInventoryMigration($query, $status)
    {
        return $query->where('inventory_migration', $status);
    }

    /**
     * Scope: Pending commission migration
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopePendingCommissionMigration($query)
    {
        return $query->where('commission_migration', self::MIGRATION_PENDING);
    }

    /**
     * Scope: Pending inventory migration
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopePendingInventoryMigration($query)
    {
        return $query->where('inventory_migration', self::MIGRATION_PENDING);
    }

    /**
     * Get meta value by key
     *
     * @param string $key
     * @return mixed
     */
    public function getMetaValue($key)
    {
        $meta = $this->meta->where('meta_key', $key)->first();
        return $meta ? $meta->value : null;
    }

    /**
     * Set meta value
     *
     * @param string $key
     * @param mixed $value
     * @param string $type
     * @return BookingMeta
     */
    public function setMetaValue($key, $value, $type = 'STRING')
    {
        $meta = $this->meta()->updateOrCreate(
            ['meta_key' => $key],
            ['meta_value' => $value, 'meta_type' => $type]
        );
        
        return $meta;
    }

    /**
     * Check if booking is cancellable
     *
     * @return bool
     */
    public function isCancellable()
    {
        return !in_array($this->booking_status, [
            self::STATUS_COMPLETED,
            self::STATUS_CANCELLED
        ]);
    }

    /**
     * Check if booking is fully paid
     *
     * @return bool
     */
    public function isFullyPaid()
    {
        return $this->payment_status === self::PAYMENT_FULL;
    }

    /**
     * Get balance amount
     *
     * @return float
     */
    public function getBalanceAmount()
    {
        return max(0, (float) $this->total_amount - (float) $this->paid_amount);
    }

    /**
     * Check if commission migration is pending
     *
     * @return bool
     */
    public function isCommissionMigrationPending()
    {
        return $this->commission_migration === self::MIGRATION_PENDING;
    }

    /**
     * Check if inventory migration is pending
     *
     * @return bool
     */
    public function isInventoryMigrationPending()
    {
        return $this->inventory_migration === self::MIGRATION_PENDING;
    }

    /**
     * Mark commission migration as completed
     *
     * @return bool
     */
    public function markCommissionMigrated()
    {
        return $this->update(['commission_migration' => self::MIGRATION_COMPLETED]);
    }

    /**
     * Mark inventory migration as completed
     *
     * @return bool
     */
    public function markInventoryMigrated()
    {
        return $this->update(['inventory_migration' => self::MIGRATION_COMPLETED]);
    }

     // Relationships
    public function bookingItems(): HasMany
    {
        return $this->hasMany(BookingItem::class, 'booking_id');
    }

    public function bookingPayments(): HasMany
    {
        return $this->hasMany(BookingPayment::class, 'booking_id');
    }

    public function bookingMeta(): HasMany
    {
        return $this->hasMany(BookingMeta::class, 'booking_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }


    // Helper methods
    public function getMeta($key)
    {
        return $this->bookingMeta()->where('meta_key', $key)->first()?->meta_value;
    }

    public function setMeta($key, $value, $type = 'string')
    {
        return $this->bookingMeta()->updateOrCreate(
            ['meta_key' => $key],
            ['meta_value' => $value, 'meta_type' => $type]
        );
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
     * Check if booking is paid in full
     */
    public function isPaidInFull()
    {
        return $this->payment_status === 'FULL' || 
               ($this->paid_amount >= $this->total_amount && $this->total_amount > 0);
    }

    /**
     * Check if booking is cancelled
     */
    public function isCancelled()
    {
        return $this->booking_status === 'CANCELLED';
    }
public function user()
{
    return $this->belongsTo(User::class, 'user_id');
}
    /**
     * Check if booking is confirmed
     */
    public function isConfirmed()
    {
        return $this->booking_status === 'CONFIRMED';
    }

    /**
     * Check if booking is completed
     */
    public function isCompleted()
    {
        return $this->booking_status === 'COMPLETED';
    }

    /**
     * Scope to filter by booking status
     */
    public function scopeWithStatus($query, $status)
    {
        return $query->where('booking_status', $status);
    }

    /**
     * Scope to filter by payment status
     */
    public function scopeWithPaymentStatus($query, $status)
    {
        return $query->where('payment_status', $status);
    }

    /**
     * Scope to filter by booking channel
     */
    public function scopeThroughChannel($query, $channel)
    {
        return $query->where('booking_through', $channel);
    }

    /**
     * Scope to get bookings for a specific date
     */
    public function scopeForDate($query, $date)
    {
        return $query->whereDate('booking_date', $date);
    }

    /**
     * Scope to get bookings within date range
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('booking_date', [$startDate, $endDate]);
    }

    /**
     * Scope to get recent bookings
     */
    public function scopeRecent($query, $days = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

}