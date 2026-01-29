<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BuddhaLampMaster extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'buddha_lamp_masters';

    /**
     * The primary key type
     *
     * @var string
     */
    protected $keyType = 'uuid';

    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'secondary_name',
        'details',
        'ledger_id',
        'status',
        'amount',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'id' => 'string',
        'status' => 'integer',
        'amount' => 'decimal:2',
        'ledger_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',

        'deleted_at' => 'datetime',
    ];

    /**
     * Get the ledger associated with this Buddha Lamp Master
     */
    public function ledger()
    {
        return $this->belongsTo(Ledger::class, 'ledger_id');
    }

    /**
     * Get the user who created this record
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who last updated this record
     */
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Get the user who deleted this record
     */
    public function deleter()
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    /**
     * Scope a query to only include active masters
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }

    /**
     * Scope a query to only include inactive masters
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeInactive($query)
    {
        return $query->where('status', 0);
    }

    /**
     * Get the display name (combination of primary and secondary names)
     *
     * @return string
     */
    public function getDisplayNameAttribute()
    {
        return $this->secondary_name
            ? "{$this->name} / {$this->secondary_name}"
            : $this->name;
    }

    /**
     * Check if the master is active
     *
     * @return bool
     */
    public function isActive()
    {
        return $this->status === 1;
    }

    /**
     * Check if the master is inactive
     *
     * @return bool
     */
    public function isInactive()
    {
        return $this->status === 0;
    }
}
