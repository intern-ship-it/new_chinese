<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class BookingMeta extends Model
{
    protected $table = 'booking_meta';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'booking_id', 'meta_key', 'meta_value', 'meta_type'
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = Str::uuid()->toString();
            }
        });
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function getValueAttribute()
    {
        switch ($this->meta_type) {
            case 'NUMBER':
                return (float) $this->meta_value;
            case 'BOOLEAN':
                return filter_var($this->meta_value, FILTER_VALIDATE_BOOLEAN);
            case 'JSON':
                return json_decode($this->meta_value, true);
            case 'DATE':
                return \Carbon\Carbon::parse($this->meta_value);
            default:
                return $this->meta_value;
        }
    }

    public function setValueAttribute($value)
    {
        if (is_array($value) || is_object($value)) {
            $this->meta_value = json_encode($value);
            $this->meta_type = 'JSON';
        } elseif (is_bool($value)) {
            $this->meta_value = $value ? 'true' : 'false';
            $this->meta_type = 'BOOLEAN';
        } elseif (is_numeric($value)) {
            $this->meta_value = (string) $value;
            $this->meta_type = 'NUMBER';
        } elseif ($value instanceof \DateTime) {
            $this->meta_value = $value->format('Y-m-d H:i:s');
            $this->meta_type = 'DATE';
        } else {
            $this->meta_value = (string) $value;
            $this->meta_type = 'STRING';
        }
    }
}