<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LightLayoutRow extends Model
{
    use HasFactory;

    protected $table = 'light_layout_row';
    protected $primaryKey = 'row_id';

    protected $fillable = [
        'config_id',
        'row_no',
        'column_count',
        'row_label',
        'meaning',
        'price',
        'sort_order'
    ];

    protected $casts = [
        'row_no' => 'integer',
        'column_count' => 'integer',
        'price' => 'decimal:2',
        'sort_order' => 'integer'
    ];

    /**
     * Get the config this row belongs to
     */
    public function config()
    {
        return $this->belongsTo(LightLayoutConfig::class, 'config_id', 'config_id');
    }

    /**
     * Get the units for this row
     */
    public function units()
    {
        return $this->hasMany(LightUnit::class, 'config_id', 'config_id')
                    ->where('row_no', $this->row_no)
                    ->orderBy('col_no');
    }

    /**
     * Scope to order by row number
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('row_no');
    }
}
