<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Deity extends Model
{
    protected $fillable = [
        'deity_code', 'name', 'name_secondary', 
        'image_url', 'order_no', 'status',
        'created_by', 'updated_by'
    ];

    protected $casts = [
        'status' => 'boolean',
        'order_no' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    public function archanais()
    {
        return $this->hasMany(Archanai::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', true)->orderBy('order_no');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}