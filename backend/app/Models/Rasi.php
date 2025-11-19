<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rasi extends Model
{
    protected $table = 'rasi';
    public $timestamps = false;

    protected $fillable = [
        'name_eng', 'name_tamil', 'natchathra_id'
    ];

    public function getNatchathraIdsAttribute()
    {
        return explode(',', $this->natchathra_id);
    }
}