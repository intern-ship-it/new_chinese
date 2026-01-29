<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentModeMeta extends Model
{
    protected $table = 'payment_mode_meta';

    protected $fillable = [
        'payment_mode_id',
        'meta_key',
        'meta_value',
        'meta_type',
    ];

    public function paymentMode()
    {
        return $this->belongsTo(PaymentMode::class, 'payment_mode_id');
    }
}