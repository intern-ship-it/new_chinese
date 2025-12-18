<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OccasionOptionService extends Model
{
    protected $table = 'occasion_option_services';

    public $timestamps = false;

    protected $fillable = [
        'option_id',
        'service_id',
        'quantity',
        'is_included',
        'additional_price',
        'created_at'
    ];

    protected $casts = [
        'quantity' => 'integer',
        'is_included' => 'boolean',
        'additional_price' => 'decimal:2',
        'created_at' => 'datetime'
    ];

    /**
     * Get the option this service belongs to
     */
    public function option()
    {
        return $this->belongsTo(OccasionOption::class, 'option_id');
    }

    /**
     * Get the service details
     */
    public function service()
    {
        return $this->belongsTo(OccasionService::class, 'service_id');
    }
}