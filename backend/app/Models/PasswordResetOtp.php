<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Carbon\Carbon;

class PasswordResetOtp extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'email',
        'otp',
        'expires_at',
        'is_verified',
        'verified_at',
        'attempts',
        'reset_token',
        'reset_token_expires_at',
        'ip_address',
        'user_agent'
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'verified_at' => 'datetime',
        'reset_token_expires_at' => 'datetime',
        'is_verified' => 'boolean'
    ];

    /**
     * Generate a random 6-digit OTP
     */
    public static function generateOTP(): string
    {
        return str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Check if OTP is expired
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Check if OTP is valid (not expired and not verified yet)
     */
    public function isValid(): bool
    {
        return !$this->isExpired() && !$this->is_verified;
    }

    /**
     * Check if maximum attempts reached
     */
    public function maxAttemptsReached(): bool
    {
        return $this->attempts >= 5; // Maximum 5 verification attempts
    }

    /**
     * Increment verification attempts
     */
    public function incrementAttempts(): void
    {
        $this->increment('attempts');
    }

    /**
     * Mark OTP as verified
     */
    public function markAsVerified(): void
    {
        $this->update([
            'is_verified' => true,
            'verified_at' => now()
        ]);
    }

    /**
     * User relationship
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Create a new OTP for user
     */
    public static function createForUser(User $user, string $ipAddress = null, string $userAgent = null): self
    {
        // Delete any existing unverified OTPs for this user
        self::where('user_id', $user->id)
            ->where('is_verified', false)
            ->delete();

        // Create new OTP
        return self::create([
            'user_id' => $user->id,
            'email' => $user->email,
            'otp' => self::generateOTP(),
            'expires_at' => now()->addMinutes(10), // OTP valid for 10 minutes
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent
        ]);
    }

    /**
     * Clean up expired OTPs (run as scheduled job)
     */
    public static function cleanupExpired(): int
    {
        return self::where('expires_at', '<', now()->subHours(24))
            ->delete();
    }

    /**
     * Get valid OTP for verification
     */
    public static function findValidOTP(string $email, string $otp): ?self
    {
        return self::where('email', $email)
            ->where('otp', $otp)
            ->where('is_verified', false)
            ->where('expires_at', '>', now())
            ->where('attempts', '<', 5)
            ->latest()
            ->first();
    }
}