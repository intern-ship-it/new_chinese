<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PagodaRenewalReminder extends Model
{
    use HasUuids;

    protected $table = 'pagoda_renewal_reminders';
    
    protected $fillable = [
        'registration_id',
        'reminder_type',
        'scheduled_date',
        'sent_date',
        'delivery_method',
        'delivery_status',
        'error_message'
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'sent_date' => 'datetime',
        'created_at' => 'datetime'
    ];

    public $timestamps = false;

    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            $model->created_at = now();
        });
    }

    // Relationships
    public function registration()
    {
        return $this->belongsTo(PagodaLightRegistration::class, 'registration_id');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('delivery_status', 'pending');
    }

    public function scopeSent($query)
    {
        return $query->where('delivery_status', 'sent');
    }

    public function scopeFailed($query)
    {
        return $query->where('delivery_status', 'failed');
    }

    public function scopeDueToday($query)
    {
        return $query->where('scheduled_date', '<=', now()->toDateString())
                     ->where('delivery_status', 'pending');
    }

    // Helper methods
    public function markAsSent()
    {
        $this->update([
            'delivery_status' => 'sent',
            'sent_date' => now()
        ]);
    }

    public function markAsDelivered()
    {
        $this->update([
            'delivery_status' => 'delivered',
            'sent_date' => now()
        ]);
    }

    public function markAsFailed($errorMessage = null)
    {
        $this->update([
            'delivery_status' => 'failed',
            'error_message' => $errorMessage
        ]);
    }
}