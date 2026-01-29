<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class BookingItemMeta extends Model
{
    protected $table = 'booking_item_meta';

    protected $keyType = 'string';
    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'booking_item_id',
        'meta_key',
        'meta_value',
        'meta_type',
        'created_at'
    ];

    protected $casts = [
        'created_at' => 'datetime'
    ];

    /**
     * Meta Type Constants
     */
    const TYPE_STRING = 'STRING';
    const TYPE_INTEGER = 'INTEGER';
    const TYPE_DECIMAL = 'DECIMAL';
    const TYPE_DATE = 'DATE';
    const TYPE_DATETIME = 'DATETIME';
    const TYPE_JSON = 'JSON';
    const TYPE_BOOLEAN = 'BOOLEAN';

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = Str::uuid()->toString();
            }
            if (empty($model->created_at)) {
                $model->created_at = now();
            }
        });
    }

    /**
     * Relationship: Booking Item
     */
    public function bookingItem()
    {
        return $this->belongsTo(BookingItem::class, 'booking_item_id');
    }

    /**
     * Scope: Filter by meta key
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $key
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeKey($query, $key)
    {
        return $query->where('meta_key', $key);
    }

    /**
     * Scope: Filter by meta type
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $type
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeType($query, $type)
    {
        return $query->where('meta_type', $type);
    }

    /**
     * Get typed value based on meta_type
     *
     * @return mixed
     */
    public function getTypedValue()
    {
        switch ($this->meta_type) {
            case self::TYPE_INTEGER:
                return (int) $this->meta_value;
            case self::TYPE_DECIMAL:
                return (float) $this->meta_value;
            case self::TYPE_BOOLEAN:
                return filter_var($this->meta_value, FILTER_VALIDATE_BOOLEAN);
            case self::TYPE_JSON:
                return json_decode($this->meta_value, true);
            case self::TYPE_DATE:
            case self::TYPE_DATETIME:
                return $this->meta_value ? \Carbon\Carbon::parse($this->meta_value) : null;
            default:
                return $this->meta_value;
        }
    }

    /**
     * Set typed value
     *
     * @param mixed $value
     * @param string $type
     * @return void
     */
    public function setTypedValue($value, $type = null)
    {
        if ($type) {
            $this->meta_type = $type;
        }

        switch ($this->meta_type) {
            case self::TYPE_JSON:
                $this->meta_value = is_array($value) ? json_encode($value) : $value;
                break;
            case self::TYPE_DATE:
                $this->meta_value = $value instanceof \Carbon\Carbon
                    ? $value->format('Y-m-d')
                    : $value;
                break;
            case self::TYPE_DATETIME:
                $this->meta_value = $value instanceof \Carbon\Carbon
                    ? $value->format('Y-m-d H:i:s')
                    : $value;
                break;
            case self::TYPE_BOOLEAN:
                $this->meta_value = $value ? '1' : '0';
                break;
            default:
                $this->meta_value = (string) $value;
        }
    }

    /**
     * Scope to filter by meta key
     */
    public function scopeWhereKey($query, $key)
    {
        return $query->where('meta_key', $key);
    }

    /**
     * Scope to filter by meta type
     */
    public function scopeWhereType($query, $type)
    {
        return $query->where('meta_type', $type);
    }

}
