<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BudgetApproval extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'budget_id',
        'action',
        'action_by',
        'action_at',
        'comments',
        'previous_status',
        'new_status'
    ];

    protected $casts = [
        'action_at' => 'datetime',
    ];

    public function budget()
    {
        return $this->belongsTo(Budget::class);
    }

    public function actionBy()
    {
        return $this->belongsTo(User::class, 'action_by');
    }
}