<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class AgentDetail extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'agent_code',
        'agency_name',
        'commission_rate',
        'service_areas',
        'specializations',
        'bank_name',
        'bank_account_no',
        'bank_ifsc',
        'gst_number',
        'agreement_date',
        'agreement_document',
        'is_active'
    ];

    protected $casts = [
        'commission_rate' => 'decimal:2',
        'service_areas' => 'array',
        'specializations' => 'array',
        'agreement_date' => 'date:Y-m-d',
        'is_active' => 'boolean'
    ];

    protected $hidden = [
        'bank_account_no',
        'gst_number'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}