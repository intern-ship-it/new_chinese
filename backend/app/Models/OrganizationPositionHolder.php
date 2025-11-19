<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class OrganizationPositionHolder extends Model
{
    use HasUuids;

    protected $fillable = [
        'position_id',
        'user_id',
        'term_start_date',
        'term_end_date',
        'is_current',
        'appointed_by',
        'appointment_reason',
        'notes'
    ];

    protected $casts = [
        'is_current' => 'boolean',
        'term_start_date' => 'date:Y-m-d',
        'term_end_date' => 'date:Y-m-d'
    ];

    public function position()
    {
        return $this->belongsTo(OrganizationPosition::class, 'position_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function appointedBy()
    {
        return $this->belongsTo(User::class, 'appointed_by');
    }
}