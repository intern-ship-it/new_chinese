<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Uom extends Model
{
    protected $table = 'uoms';
    
    protected $fillable = [
        'name',
        'uom_short',
        'base_unit',
        'conversion_factor',
        'is_active'
    ];

    protected $casts = [
        'conversion_factor' => 'decimal:4',
        'is_active' => 'integer'
    ];

    /**
     * Get the base unit relationship
     */
    public function baseUnit(): BelongsTo
    {
        return $this->belongsTo(Uom::class, 'base_unit');
    }

    /**
     * Get derived units
     */
    public function derivedUnits(): HasMany
    {
        return $this->hasMany(Uom::class, 'base_unit');
    }

    /**
     * Check if UOM is used in inventory product
     */
    public function isUsed(): bool
    {
        // Check if used in product table
        return \DB::table('product')
            ->where('uom_id', $this->id)
            ->exists();
    }

    /**
     * Scope for active UOMs
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for base units only
     */
    public function scopeBaseUnits($query)
    {
        return $query->whereNull('base_unit');
    }
}