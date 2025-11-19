<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Fund extends Model
{
    protected $table = 'funds';
    
    protected $fillable = [
        'code',
        'name',
        'description',
        'created_at'
    ];
    
    /**
     * Get the entries for the fund.
     */
    public function entries()
    {
        return $this->hasMany(Entry::class, 'fund_id');
    }
    
    /**
     * Check if fund can be deleted
     */
    public function canDelete()
    {
        // Cannot delete fund with id = 1
        if ($this->id == 1) {
            return false;
        }
        
        // Cannot delete if it has entries
        if ($this->entries()->exists()) {
            return false;
        }
        
        // Cannot delete if it's the last fund
        if (self::count() <= 1) {
            return false;
        }
        
        return true;
    }
}