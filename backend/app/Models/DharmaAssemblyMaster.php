<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class DharmaAssemblyMaster extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'dharma_assembly_masters';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'name',
        'application_options',
        'enable_dedication',
        'dedication_name',
        'dedication_options',
        'enable_offering',
        'offerings',
        'status',
        'created_by',
        'updated_by',
        'deleted_by'
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'application_options' => 'array',
        'dedication_options' => 'array',
        'offerings' => 'array',
        'enable_dedication' => 'boolean',
        'enable_offering' => 'boolean',
        'status' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime'
    ];

    /**
     * The attributes that should be hidden for arrays.
     */
    protected $hidden = [
        'deleted_at',
        'deleted_by'
    ];

    /**
     * UUID configuration
     */
    protected $keyType = 'string';
    public $incrementing = false;

    /**
     * Boot method for model events
     */
    protected static function boot()
    {
        parent::boot();

        // Auto-generate UUID on creation
        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }

    /**
     * Relationships
     */

    /**
     * Get the user who created this master
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who last updated this master
     */
    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Get the user who deleted this master
     */
    public function deletedBy()
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    /**
     * Scopes
     */

    /**
     * Scope to get only active masters
     */
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }

    /**
     * Scope to get only inactive masters
     */
    public function scopeInactive($query)
    {
        return $query->where('status', 0);
    }

    /**
     * Scope to search by name
     */
    public function scopeSearch($query, $search)
    {
        return $query->where('name', 'ILIKE', "%{$search}%");
    }

    /**
     * Scope to filter masters with dedication enabled
     */
    public function scopeWithDedication($query)
    {
        return $query->where('enable_dedication', true);
    }

    /**
     * Scope to filter masters with offering enabled
     */
    public function scopeWithOffering($query)
    {
        return $query->where('enable_offering', true);
    }

    /**
     * Accessor & Mutator Methods
     */

    /**
     * Get application options as decoded array
     */
    public function getApplicationOptionsAttribute($value)
    {
        if (is_string($value)) {
            return json_decode($value, true) ?? [];
        }
        return $value ?? [];
    }

    /**
     * Set application options as JSON
     */
    public function setApplicationOptionsAttribute($value)
    {
        $this->attributes['application_options'] = is_array($value) 
            ? json_encode($value) 
            : $value;
    }

    /**
     * Get dedication options as decoded array
     */
    public function getDedicationOptionsAttribute($value)
    {
        if (is_string($value)) {
            return json_decode($value, true) ?? [];
        }
        return $value ?? [];
    }

    /**
     * Set dedication options as JSON
     */
    public function setDedicationOptionsAttribute($value)
    {
        $this->attributes['dedication_options'] = is_array($value) 
            ? json_encode($value) 
            : $value;
    }

    /**
     * Get offerings as decoded array
     */
    public function getOfferingsAttribute($value)
    {
        if (is_string($value)) {
            return json_decode($value, true) ?? [];
        }
        return $value ?? [];
    }

    /**
     * Set offerings as JSON
     */
    public function setOfferingsAttribute($value)
    {
        $this->attributes['offerings'] = is_array($value) 
            ? json_encode($value) 
            : $value;
    }

    /**
     * Helper Methods
     */

    /**
     * Get total number of application options
     */
    public function getApplicationOptionsCount()
    {
        return count($this->application_options);
    }

    /**
     * Get total number of dedication entries
     */
    public function getDedicationEntriesCount()
    {
        if (!$this->enable_dedication) {
            return 0;
        }
        return count($this->dedication_options);
    }

    /**
     * Get total number of offerings
     */
    public function getOfferingsCount()
    {
        if (!$this->enable_offering) {
            return 0;
        }
        return count($this->offerings);
    }

    /**
     * Check if master is active
     */
    public function isActive()
    {
        return $this->status === 1;
    }

    /**
     * Check if master has dedication enabled
     */
    public function hasDedication()
    {
        return $this->enable_dedication === true;
    }

    /**
     * Check if master has offering enabled
     */
    public function hasOffering()
    {
        return $this->enable_offering === true;
    }

    /**
     * Get specific application option by index
     */
    public function getApplicationOption($index)
    {
        $options = $this->application_options;
        return $options[$index] ?? null;
    }

    /**
     * Get specific offering by index
     */
    public function getOffering($index)
    {
        if (!$this->enable_offering) {
            return null;
        }
        $offerings = $this->offerings;
        return $offerings[$index] ?? null;
    }

    /**
     * Get offering by name
     */
    public function getOfferingByName($name)
    {
        if (!$this->enable_offering) {
            return null;
        }
        
        foreach ($this->offerings as $offering) {
            if ($offering['name'] === $name) {
                return $offering;
            }
        }
        
        return null;
    }

    /**
     * Calculate total amount for given options
     */
    public function calculateTotalAmount(array $selectedOptions)
    {
        $total = 0;
        
        foreach ($selectedOptions as $option) {
            if (isset($option['amount'])) {
                $total += floatval($option['amount']);
            }
        }
        
        return $total;
    }

    /**
     * Get formatted summary of configuration
     */
    public function getConfigurationSummary()
    {
        $summary = [
            'name' => $this->name,
            'status' => $this->isActive() ? 'Active' : 'Inactive',
            'application_options_count' => $this->getApplicationOptionsCount(),
            'has_dedication' => $this->hasDedication(),
            'dedication_entries_count' => $this->getDedicationEntriesCount(),
            'has_offering' => $this->hasOffering(),
            'offerings_count' => $this->getOfferingsCount()
        ];

        return $summary;
    }
}