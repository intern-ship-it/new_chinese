<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Natchathram extends Model
{
    protected $table = 'natchathram';
    public $timestamps = false;

    protected $fillable = [
        'name_eng', 'name_tamil'
    ];
}