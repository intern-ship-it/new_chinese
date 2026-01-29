<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class RomVenueMaster extends Model
{
    use SoftDeletes;

    protected $table = 'rom_venue_masters';
    
    // ✅ CRITICAL: Tell Laravel this is a UUID, not auto-increment integer
    protected $keyType = 'uuid';
    public $incrementing = false;
    
    protected $fillable = [
        'name_primary',
        'name_secondary',
        'description',
        'city',
        'pincode',
        'status',
        'created_by',
        'updated_by',
        'deleted_by'
    ];

    protected $casts = [
        'id' => 'string',  // ✅ Cast UUID to string
        'status' => 'integer',
        'created_by' => 'string',
        'updated_by' => 'string',
        'deleted_by' => 'string',
    ];

    protected $dates = [
        'created_at',
        'updated_at',
        'deleted_at'
    ];

    // ✅ Auto-generate UUID when creating new record
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
            }
        });
    }

    // Accessor for formatted name
    public function getFormattedNameAttribute()
    {
        return trim(
            ($this->name_primary ?? '') . 
            ($this->name_secondary ? ' - ' . $this->name_secondary : '')
        );
    }

    // Relationships
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function deleter()
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }
}