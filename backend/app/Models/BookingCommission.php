<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class BookingCommission extends Model
{
    protected $table = 'booking_commissions';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'booking_id', 'booking_item_id', 'staff_id', 'archanai_id',
        'commission_percent', 'commission_amount', 'status'
    ];

    protected $casts = [
        'commission_percent' => 'decimal:2',
        'commission_amount' => 'decimal:2',
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

    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function archanai()
    {
        return $this->belongsTo(Archanai::class);
    }
}