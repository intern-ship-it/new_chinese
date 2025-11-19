<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class BookingPayment extends Model
{
    protected $table = 'booking_payments';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = true;

    protected $fillable = [
        'booking_id', 'payment_mode_id', 'payment_method', 'amount', 'transaction_id',
        'payment_status', 'payment_date', 'notes', 'created_by'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_date' => 'datetime',
        'created_at' => 'datetime'
    ];

    protected static function boot()
    {
        parent::boot();
        /* static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = Str::uuid()->toString();
            }
            $model->created_at = now();
        }); */
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}