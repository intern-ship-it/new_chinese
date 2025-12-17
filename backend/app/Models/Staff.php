<?php
// app/Models/Staff.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class Staff extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'staff';

    protected $fillable = [
        'staff_code',
        'designation_id',
        'user_id',
        'employee_type',
        'first_name',
        'last_name',
        'father_name',
        'mother_name',
        'date_of_birth',
        'gender',
        'marital_status',
        'blood_group',
        'nationality',
        'religion',
        'phone',
        'alternate_phone',
        'email',
        'personal_email',
        'current_address',
        'permanent_address',
        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact_relation',
        'joining_date',
        'confirmation_date',
        'probation_period_months',
        'work_location',
        'work_shift',
        'shift_start_time',
        'shift_end_time',
        'week_off_day',
        'aadhar_number',
        'pan_number',
        'passport_number',
        'driving_license',
        'voter_id',
        'bank_details',
        'basic_salary',
        'allowances',
        'deductions',
        'salary_payment_mode',
        'profile_photo',
        'documents',
        'status',
        'resignation_date',
        'last_working_date',
        'termination_reason',
        'created_by',
        'updated_by',
        'work_shifts'
    ];

    protected $casts = [
        'current_address' => 'array',
        'permanent_address' => 'array',
        'bank_details' => 'array',
        'allowances' => 'array',
        'deductions' => 'array',
        'documents' => 'array',
        'date_of_birth' => 'date:Y-m-d',
        'joining_date' => 'date:Y-m-d',
        'confirmation_date' => 'date:Y-m-d',
        'resignation_date' => 'date:Y-m-d',
        'last_working_date' => 'date:Y-m-d',
        'basic_salary' => 'decimal:2',
          'work_shifts' => 'array',
    ];

    protected $appends = ['full_name', 'age','profile_photo_url'];

    public function designation(): BelongsTo
    {
        return $this->belongsTo(Designation::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(StaffActivityLog::class);
    }

    public function getFullNameAttribute(): string
    {
        return $this->first_name . ' ' . $this->last_name;
    }

    public function getAgeAttribute(): int
    {
        return $this->date_of_birth ? $this->date_of_birth->age : 0;
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'ACTIVE');
    }

    public function scopeByDepartment($query, $department)
    {
        return $query->whereHas('designation', function ($q) use ($department) {
            $q->where('department', $department);
        });
    }

    public static function generateStaffCode(): string
    {
        $templeCode = 'TMP'; // This should come from temple settings
        $year = date('Y');
        
        $lastStaff = self::where('staff_code', 'like', $templeCode . '-' . $year . '-%')
            ->orderBy('staff_code', 'desc')
            ->first();

        if ($lastStaff) {
            $lastNumber = intval(substr($lastStaff->staff_code, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return $templeCode . '-' . $year . '-' . $newNumber;
    }

    public static function generateUsername($firstName, $lastName, $templeId): string
    {
        $baseUsername = strtolower($firstName . '.' . $lastName);
        $baseUsername = preg_replace('/[^a-z0-9.]/', '', $baseUsername);
        
        $username = $baseUsername . '@' . $templeId;
        
        // Check if username exists
        $counter = 1;
        while (User::where('username', $username)->exists()) {
            $username = $baseUsername . $counter . '@' . $templeId;
            $counter++;
        }
        
        return $username;
    }

    public static function generateSecurePassword(): string
    {
        $uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $lowercase = 'abcdefghijklmnopqrstuvwxyz';
        $numbers = '0123456789';
        $special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        $password = '';
        $password .= $uppercase[random_int(0, strlen($uppercase) - 1)];
        $password .= $lowercase[random_int(0, strlen($lowercase) - 1)];
        $password .= $numbers[random_int(0, strlen($numbers) - 1)];
        $password .= $special[random_int(0, strlen($special) - 1)];
        
        // Add 4 more random characters
        $allChars = $uppercase . $lowercase . $numbers . $special;
        for ($i = 0; $i < 4; $i++) {
            $password .= $allChars[random_int(0, strlen($allChars) - 1)];
        }
        
        // Shuffle the password
        return str_shuffle($password);
    }

    public function createUserAccount($password = null): User
    {
        if (!$password) {
            $password = self::generateSecurePassword();
        }

        $templeId = request()->header('X-Temple-ID', 'temple1');
        $username = self::generateUsername($this->first_name, $this->last_name, $templeId);

        $user = User::create([
            'name' => $this->full_name,
            'username' => $username,
            'email' => $this->email,
            'password' => Hash::make($password),
            'phone' => $this->phone,
            'user_type' => 'STAFF',
            'is_active' => true,
            'must_change_password' => true,
            'password_changed_at' => now(),
            'last_login_at' => null
        ]);

        // Assign role from designation
        if ($this->designation && $this->designation->role_id) {
            $user->assignRole($this->designation->role_id);
        }

        // Update staff with user_id
        $this->user_id = $user->id;
        $this->save();

        // Log activity
        $this->logActivity('USER_CREATED', null, ['user_id' => $user->id]);

        return $user;
    }

    public function updateUserRole(): void
    {
        if ($this->user && $this->designation && $this->designation->role_id) {
            // Remove all existing roles
            $this->user->syncRoles([]);
            // Assign new role
            $this->user->assignRole($this->designation->role_id);
        }
    }

    public function deactivateUser(): void
    {
        if ($this->user) {
            $this->user->update(['is_active' => false]);
            $this->logActivity('USER_DEACTIVATED');
        }
    }

    public function activateUser(): void
    {
        if ($this->user) {
            $this->user->update(['is_active' => true]);
            $this->logActivity('USER_ACTIVATED');
        }
    }

    public function logActivity($action, $oldValues = null, $newValues = null, $remarks = null): void
    {
        StaffActivityLog::create([
            'staff_id' => $this->id,
            'action' => $action,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'remarks' => $remarks,
            'performed_by' => auth()->id() ?? null
        ]);
    }
    public function getProfilePhotoUrlAttribute()
	{
		if (!$this->profile_photo) {
			return null;
		}

		// Check if it's already a full URL
		if (filter_var($this->profile_photo, FILTER_VALIDATE_URL)) {
			return $this->profile_photo;
		}

		// Generate signed URL for private S3 files
		try {
			$s3Service = app(\App\Services\S3UploadService::class);
			return $s3Service->getSignedUrl($this->profile_photo);
		} catch (\Exception $e) {
			\Log::error('Failed to generate signed URL for profile photo', [
				'staff_id' => $this->id,
				'error' => $e->getMessage()
			]);
			return null;
		}
	}
}