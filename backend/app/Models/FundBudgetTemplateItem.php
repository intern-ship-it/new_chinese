<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FundBudgetTemplateItem extends Model
{
    protected $fillable = [
        'template_id',
        'ledger_id',
        'default_amount',
        'description',
        'sort_order'
    ];

    protected $casts = [
        'default_amount' => 'decimal:2',
        'sort_order' => 'integer'
    ];

    /**
     * Relationships
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(FundBudgetTemplate::class, 'template_id');
    }

    public function ledger(): BelongsTo
    {
        return $this->belongsTo(Ledger::class);
    }

    /**
     * Scope to order by sort_order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order');
    }
}