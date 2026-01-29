<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Carbon\Carbon;

class PagodaLightRegistration extends Model
{
    use HasUuids;

    protected $table = 'pagoda_light_registrations';
    
    protected $fillable = [
        'devotee_id',
        'light_slot_id',
        'light_number',
        'light_code',
          'category_id',
        'tower_code',
        'block_code',
        'floor_number',
        'rag_position',
        'light_option',
        'merit_amount',
        'offer_date',
        'expiry_date',
        'payment_method',
        'payment_reference',
        'payment_mode_id',
        'receipt_number',
        'staff_id',
        'status',
        'termination_reason',
        'termination_date',
        'remarks'
    ];

    protected $casts = [
        'merit_amount' => 'decimal:2',
        'offer_date' => 'date',
        'expiry_date' => 'date',
        'termination_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relationships
    public function devotee()
    {
        return $this->belongsTo(PagodaDevotee::class, 'devotee_id');
    }

    public function lightSlot()
    {
        return $this->belongsTo(PagodaLightSlot::class, 'light_slot_id');
    }

    public function paymentMode()
    {
        return $this->belongsTo(PaymentMode::class, 'payment_mode_id');
    }

    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function renewals()
    {
        return $this->hasMany(PagodaLightRenewal::class, 'original_registration_id');
    }

    public function renewedFrom()
    {
        return $this->hasOne(PagodaLightRenewal::class, 'new_registration_id');
    }

    public function reminders()
    {
        return $this->hasMany(PagodaRenewalReminder::class, 'registration_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeExpired($query)
    {
        return $query->where('status', 'expired');
    }

    public function scopeExpiringSoon($query, $days = 30)
    {
        return $query->where('status', 'active')
                     ->where('expiry_date', '<=', Carbon::now()->addDays($days))
                     ->where('expiry_date', '>=', Carbon::now());
    }

    public function scopeByReceiptNumber($query, $receiptNumber)
    {
        return $query->where('receipt_number', $receiptNumber);
    }

    // Helper methods
    public function isActive()
    {
        return $this->status === 'active';
    }

    public function isExpired()
    {
        return $this->status === 'expired' || Carbon::parse($this->expiry_date)->isPast();
    }

    public function daysUntilExpiry()
    {
        return Carbon::now()->diffInDays(Carbon::parse($this->expiry_date), false);
    }
        public function category()
    {
        return $this->belongsTo(TowerCategory::class, 'category_id');
    }
}