<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles, HasUuids;

    protected $fillable = [
        'username',
        'name',
        'email',
        'password',
        'user_type',
        'user_subtype',
        'mobile_code',
        'mobile_no',
        'alternate_mobile',
        'address',
        'city',
        'state',
        'country',
        'pincode',
        'date_of_birth',
        'gender',
        'profile_photo',
        'id_proof_type',
        'id_proof_number',
        'id_proof_document',
        'allowed_booking_channels',
        'booking_channel_restricted',
        'is_active',
        'is_verified',
        'last_login_at',
        'last_login_ip',
        'login_count',
        'failed_login_attempts',
        'blocked_until',
        'created_by',
        'updated_by'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'blocked_until' => 'datetime',
        'last_login_at' => 'datetime',
        'date_of_birth' => 'date:Y-m-d',
        'is_active' => 'boolean',
        'is_verified' => 'boolean',
        'booking_channel_restricted' => 'boolean',
        'allowed_booking_channels' => 'array',
    ];

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [
            'user_type' => $this->user_type,
            'username' => $this->username,
        ];
    }

    public function devices()
    {
        return $this->hasMany(UserDevice::class);
    }

    public function loginHistory()
    {
        return $this->hasMany(UserLoginHistory::class);
    }

    public function refreshTokens()
    {
        return $this->hasMany(RefreshToken::class);
    }

    public function isBlocked()
    {
        return $this->blocked_until && $this->blocked_until->isFuture();
    }

    public function canLoginFromChannel($channel)
    {
        if (in_array($this->user_type, ['SUPER_ADMIN', 'ADMIN', 'STAFF'])) {
            return in_array($channel, ['COUNTER', 'ADMIN']);
        }
        return true;
    }

    // Additional relationships
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function memberDetails()
    {
        return $this->hasOne(MemberDetail::class);
    }

    public function staffDetails()
    {
        return $this->hasOne(StaffDetail::class);
    }

    public function agentDetails()
    {
        return $this->hasOne(AgentDetail::class);
    }
	public function memberDetail()
    {
        return $this->hasOne(MemberDetail::class);
    }

    public function organizationPositions()
    {
        return $this->hasMany(OrganizationPositionHolder::class, 'user_id')
            ->where('is_current', true);
    }

    public function currentPosition()
    {
        return $this->hasOne(OrganizationPositionHolder::class, 'user_id')
            ->where('is_current', true)
            ->with('position');
    }

    public function positionHistory()
    {
        return $this->hasMany(OrganizationPositionHistory::class, 'user_id');
    }

    public function memberSubscriptions()
    {
        return $this->hasMany(MemberSubscription::class, 'user_id');
    }

    public function hasOrganizationPosition()
    {
        return $this->organizationPositions()->exists();
    }

    public function getOrganizationPosition()
    {
        $holder = $this->currentPosition;
        return $holder ? $holder->position : null;
    }

    public function isOrganizationLeader()
    {
        $position = $this->getOrganizationPosition();
        return $position && in_array($position->name, ['president', 'vice_president']);
    }
	
	/**
	 * Get the signature for the member.
	 */
	public function signature()
	{
		return $this->hasOne(MemberSignature::class, 'user_id');
	}

	/**
	 * Check if user has a signature
	 */
	public function hasSignature()
	{
		return $this->signature()->exists();
	}

	/**
	 * Get signature URL with signed URL if needed
	 */
	public function getSignatureUrlAttribute()
	{
		if ($this->signature && $this->signature->signature_url) {
			// You can use the S3Service here to generate signed URL
			// Or return the path and handle signed URL generation in controller
			return $this->signature->signature_url;
		}
		return null;
	}
}