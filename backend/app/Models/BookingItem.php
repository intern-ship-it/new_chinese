<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class BookingItem extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'booking_id', 'item_type', 'item_id', 'item_name', 'item_name_secondary',
        'service_date', 'service_time', 'quantity', 'unit_price', 'total_price',
        'status', 'notes'
    ];

    protected $casts = [
        'service_date' => 'date',
        'service_time' => 'datetime:H:i',
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2'
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = Str::uuid()->toString();
            }
        });
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function archanai()
    {
        return $this->hasOne(BookingArchanai::class);
    }

    public function rasi()
    {
        return $this->hasMany(BookingRasi::class);
    }

    public function vehicle()
    {
        return $this->hasOne(BookingVehicle::class);
    }

    public function commissions()
    {
        return $this->hasMany(BookingCommission::class);
    }
    public function archanaiDetail()
{
    return $this->hasOne(BookingArchanai::class, 'booking_item_id', 'id');
}

}