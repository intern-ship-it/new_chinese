<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TaxMaster extends Model
{
    use SoftDeletes;

    protected $table = 'tax_master';

    protected $fillable = [
        'name', 'applicable_for', 'ledger_id', 'percent',
        'status', 'created_by'
    ];

    protected $casts = [
        'percent' => 'decimal:2',
        'status' => 'integer'
    ];

    public function ledger()
    {
        return $this->belongsTo(Ledger::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }

    public function scopeForProducts($query)
    {
        return $query->whereIn('applicable_for', ['product', 'both']);
    }

    public function scopeForServices($query)
    {
        return $query->whereIn('applicable_for', ['service', 'both']);
    }
}