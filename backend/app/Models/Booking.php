<?php
// app/Models/Booking.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Booking extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'booking_number',
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
        'created_by'
    ];

    protected $casts = [
        'booking_date' => 'datetime',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'deposit_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2'
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
        public function archanais()
    {
        return $this->hasMany(BookingArchanai::class, 'booking_id', 'id');
    }

    public function deity()
    {
        return $this->belongsTo(Deity::class, 'deity_id', 'id');
    }

    public function group()
    {
        return $this->belongsTo(Group::class, 'group_id', 'id');
    }
}
