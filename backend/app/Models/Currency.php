<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Currency extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'symbol',
        'decimal_places',
        'is_active',
    ];

    protected $casts = [
        'decimal_places' => 'integer',
        'is_active' => 'boolean',
    ];

    public function countries()
    {
        return $this->hasMany(Country::class);
    }

    public function temples()
    {
        return $this->hasMany(Temple::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}