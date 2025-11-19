<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class BookingRasi extends Model
{
    protected $table = 'booking_rasi';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'booking_id', 'booking_item_id', 'devotee_name', 
        'rasi_id', 'natchathram_id', 'order_no'
    ];

    protected $casts = [
        'order_no' => 'integer',
        'created_at' => 'datetime'
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = Str::uuid()->toString();
            }
            $model->created_at = now();
        });
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function bookingItem()
    {
        return $this->belongsTo(BookingItem::class);
    }

    public function rasi()
    {
        return $this->belongsTo(Rasi::class, 'rasi_id');
    }

    public function natchathram()
    {
        return $this->belongsTo(Natchathram::class, 'natchathram_id');
    }
}