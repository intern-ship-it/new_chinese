<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class QueueToken extends Model
{
    protected $fillable = [
        'archanai_id',
        'token_number',
        'token_date',
        'reset_period',
        'last_reset_date'
    ];

    protected $casts = [
        'token_number' => 'integer',
        'token_date' => 'date',
        'last_reset_date' => 'date',
        'created_at' => 'datetime'
    ];

    public $timestamps = false;

    const RESET_DAILY = 'DAILY';
    const RESET_WEEKLY = 'WEEKLY';
    const RESET_MONTHLY = 'MONTHLY';

    public function archanai()
    {
        return $this->belongsTo(Archanai::class);
    }

    // Generate next token with auto-reset
    public function generateNextToken()
    {
        $shouldReset = $this->shouldResetToken();
        
        if ($shouldReset) {
            $this->resetToken();
        } else {
            $this->increment('token_number');
        }
        
        return $this->token_number;
    }

    // Check if token should be reset
    public function shouldResetToken()
    {
        $now = Carbon::now();
        
        switch ($this->reset_period) {
            case self::RESET_DAILY:
                return !$this->last_reset_date->isToday();
                
            case self::RESET_WEEKLY:
                $lastWeekStart = $this->last_reset_date->startOfWeek();
                $currentWeekStart = $now->startOfWeek();
                return !$lastWeekStart->eq($currentWeekStart);
                
            case self::RESET_MONTHLY:
                return $this->last_reset_date->month !== $now->month ||
                       $this->last_reset_date->year !== $now->year;
                
            default:
                return false;
        }
    }

    // Reset token counter
    public function resetToken()
    {
        $this->update([
            'token_number' => 1,
            'last_reset_date' => Carbon::now()->toDateString()
        ]);
    }

    // Get formatted token display
    public function getFormattedTokenAttribute()
    {
        $prefix = '';
        
        switch ($this->reset_period) {
            case self::RESET_DAILY:
                $prefix = 'D' . Carbon::today()->format('dmy');
                break;
            case self::RESET_WEEKLY:
                $prefix = 'W' . Carbon::today()->weekOfYear;
                break;
            case self::RESET_MONTHLY:
                $prefix = 'M' . Carbon::today()->format('my');
                break;
        }
        
        return $prefix . '-' . str_pad($this->token_number, 4, '0', STR_PAD_LEFT);
    }

    // Scope for today's tokens
    public function scopeToday($query)
    {
        return $query->where('token_date', Carbon::today());
    }

    // Scope for specific reset period
    public function scopeByResetPeriod($query, $period)
    {
        return $query->where('reset_period', $period);
    }

    // Get token statistics
    public static function getStatistics($archanaiId, $date = null)
    {
        $date = $date ?: Carbon::today();
        
        $token = self::where('archanai_id', $archanaiId)
                    ->where('token_date', $date)
                    ->first();
        
        return [
            'current_token' => $token ? $token->token_number : 0,
            'reset_period' => $token ? $token->reset_period : null,
            'last_reset' => $token ? $token->last_reset_date : null,
            'formatted_token' => $token ? $token->formatted_token : 'N/A'
        ];
    }
}