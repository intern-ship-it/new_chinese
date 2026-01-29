<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Volunteer extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'volunteers';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'volunteer_id',
        'user_id',
        'full_name',
        'full_name_en',  // ✅ Already added
        'gender',
        'id_type',
        'ic_number',
        'passport_number',
        'date_of_birth',
        'marital_status',
        'mobile_primary',
        'email',
        'address',
        'city',
        'state',
        'postal_code',
        'country',
        'emergency_contact_name',
        'emergency_contact_relationship',
        'emergency_contact_phone',
        'languages_spoken',
        'skills_strengths',
        'preferred_department_id',
        'preferred_tasks',
        'past_volunteer_experience',
        'physical_limitations',
        'status',
        'registered_at',
        'approved_at',
        'approved_by',
        'rejection_reason',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'date_of_birth' => 'date:Y-m-d',
        'registered_at' => 'datetime',
        'approved_at' => 'datetime',
        'languages_spoken' => 'array',
        'preferred_tasks' => 'array',
        'past_volunteer_experience' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime'
    ];

    protected $hidden = [];

    // Constants for status
    const STATUS_PENDING_APPROVAL = 'pending_approval';
    const STATUS_ACTIVE = 'active';
    const STATUS_REJECTED = 'rejected';
    const STATUS_SUSPENDED = 'suspended';
    const STATUS_INACTIVE = 'inactive';

    // Constants for gender
    const GENDER_MALE = 'male';
    const GENDER_FEMALE = 'female';
    const GENDER_OTHER = 'other';

    // Constants for ID type
    const ID_TYPE_IC = 'ic';
    const ID_TYPE_PASSPORT = 'passport';

    // Constants for marital status
    const MARITAL_STATUS_SINGLE = 'single';
    const MARITAL_STATUS_MARRIED = 'married';
    const MARITAL_STATUS_DIVORCED = 'divorced';
    const MARITAL_STATUS_WIDOWED = 'widowed';

    /**
     * Relationship: User account (if volunteer has login access)
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Relationship: Preferred Department
     */
    public function preferredDepartment()
    {
        return $this->belongsTo(VolunteerDepartment::class, 'preferred_department_id');
    }

    /**
     * Relationship: Approved By User
     */
    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Relationship: Created By User
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relationship: Updated By User
     */
    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Relationship: Documents
     */
    public function documents()
    {
        return $this->hasMany(VolunteerDocument::class, 'volunteer_id');
    }

    /**
     * Relationship: Task Assignments
     */
    public function assignments()
    {
        return $this->hasMany(VolunteerTaskAssignment::class, 'volunteer_id');
    }

    /**
     * Relationship: Attendance Records
     */
    public function attendances()
    {
        return $this->hasMany(VolunteerAttendance::class, 'volunteer_id');
    }

    /**
     * Relationship: Approval Logs
     */
    public function approvalLogs()
    {
        return $this->hasMany(VolunteerApprovalLog::class, 'volunteer_id');
    }

    /**
     * Scope: Active volunteers
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    /**
     * Scope: Pending approval volunteers
     */
    public function scopePendingApproval($query)
    {
        return $query->where('status', self::STATUS_PENDING_APPROVAL);
    }

    /**
     * Scope: Rejected volunteers
     */
    public function scopeRejected($query)
    {
        return $query->where('status', self::STATUS_REJECTED);
    }

    /**
     * Scope: Suspended volunteers
     */
    public function scopeSuspended($query)
    {
        return $query->where('status', self::STATUS_SUSPENDED);
    }

    /**
     * Scope: Inactive volunteers
     */
    public function scopeInactive($query)
    {
        return $query->where('status', self::STATUS_INACTIVE);
    }

    /**
     * Scope: Search by name, IC, passport, or mobile
     */
    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('full_name', 'ILIKE', "%{$search}%")
              ->orWhere('full_name_en', 'ILIKE', "%{$search}%") // ⭐ ADD THIS - search English name too
              ->orWhere('ic_number', 'ILIKE', "%{$search}%")
              ->orWhere('passport_number', 'ILIKE', "%{$search}%")
              ->orWhere('mobile_primary', 'ILIKE', "%{$search}%")
              ->orWhere('volunteer_id', 'ILIKE', "%{$search}%")
              ->orWhere('email', 'ILIKE', "%{$search}%");
        });
    }

    /**
     * Scope: Filter by status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope: Filter by department
     */
    public function scopeByDepartment($query, $departmentId)
    {
        return $query->where('preferred_department_id', $departmentId);
    }

    /**
     * Scope: Filter by gender
     */
    public function scopeByGender($query, $gender)
    {
        return $query->where('gender', $gender);
    }

    /**
     * Scope: Filter by registration date range
     */
    public function scopeRegisteredBetween($query, $fromDate, $toDate)
    {
        return $query->whereBetween('registered_at', [$fromDate, $toDate]);
    }

    /**
     * Check if volunteer is active
     */
    public function isActive()
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * Check if volunteer is pending approval
     */
    public function isPendingApproval()
    {
        return $this->status === self::STATUS_PENDING_APPROVAL;
    }

    /**
     * Check if volunteer is inactive
     */
    public function isInactive()
    {
        return $this->status === self::STATUS_INACTIVE;
    }

    /**
     * Get full IC/Passport identifier
     */
    public function getIdentifierAttribute()
    {
        return $this->id_type === self::ID_TYPE_IC 
            ? $this->ic_number 
            : $this->passport_number;
    }

    /**
     * ⭐ FIXED: Combined display name with bilingual support
     * Shows: "Chinese Name (English Name) - VOL202400XX"
     * Or: "Chinese Name - VOL202400XX" (if no English name)
     */
    public function getDisplayNameAttribute()
    {
        $name = $this->full_name;
        
        // Add English name in parentheses if available
        if ($this->full_name_en) {
            $name .= " ({$this->full_name_en})";
        }
        
        // Add volunteer ID
        if ($this->volunteer_id) {
            $name .= " - {$this->volunteer_id}";
        }
        
        return $name;
    }

    /**
     * ⭐ NEW: Get bilingual name only (without volunteer ID)
     * Shows: "Chinese Name (English Name)"
     * Or: "Chinese Name" (if no English name)
     */
    public function getBilingualNameAttribute()
    {
        if ($this->full_name_en) {
            return "{$this->full_name} ({$this->full_name_en})";
        }
        return $this->full_name;
    }

    /**
     * Get age from date of birth
     */
    public function getAgeAttribute()
    {
        return $this->date_of_birth ? $this->date_of_birth->age : null;
    }

    /**
     * Get status label for display
     */
    public function getStatusLabelAttribute()
    {
        $labels = [
            self::STATUS_PENDING_APPROVAL => 'Pending Approval',
            self::STATUS_ACTIVE => 'Active',
            self::STATUS_REJECTED => 'Rejected',
            self::STATUS_SUSPENDED => 'Suspended',
            self::STATUS_INACTIVE => 'Inactive',
        ];

        return $labels[$this->status] ?? ucfirst($this->status);
    }

    /**
     * Get status color for UI
     */
    public function getStatusColorAttribute()
    {
        $colors = [
            self::STATUS_PENDING_APPROVAL => 'warning',
            self::STATUS_ACTIVE => 'success',
            self::STATUS_REJECTED => 'danger',
            self::STATUS_SUSPENDED => 'secondary',
            self::STATUS_INACTIVE => 'dark',
        ];

        return $colors[$this->status] ?? 'secondary';
    }

    /**
     * Get formatted address
     */
    public function getFormattedAddressAttribute()
    {
        $parts = array_filter([
            $this->address,
            $this->city,
            $this->state,
            $this->postal_code,
            $this->country
        ]);

        return implode(', ', $parts) ?: 'Not provided';
    }

    /**
     * Check if volunteer has required documents
     */
    public function hasRequiredDocuments()
    {
        $requiredTypes = ['ic_photostat', 'passport_photo'];
        $uploadedTypes = $this->documents->pluck('document_type')->toArray();

        foreach ($requiredTypes as $type) {
            if (!in_array($type, $uploadedTypes)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get missing required documents
     */
    public function getMissingDocuments()
    {
        $requiredTypes = ['ic_photostat', 'passport_photo'];
        $uploadedTypes = $this->documents->pluck('document_type')->toArray();

        return array_diff($requiredTypes, $uploadedTypes);
    }

    /**
     * Check if volunteer can be assigned tasks
     */
    public function canBeAssignedTasks()
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * Check if volunteer can clock in
     */
    public function canClockIn()
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * Extract date of birth from Malaysian IC number
     */
    public static function extractDobFromIc($icNumber)
    {
        if (empty($icNumber) || strlen($icNumber) < 6) {
            return null;
        }

        // Remove dashes or spaces
        $ic = preg_replace('/[^0-9]/', '', $icNumber);

        if (strlen($ic) < 6) {
            return null;
        }

        $year = substr($ic, 0, 2);
        $month = substr($ic, 2, 2);
        $day = substr($ic, 4, 2);

        // Determine century (assume 00-30 is 2000s, 31-99 is 1900s)
        $century = ((int)$year <= 30) ? '20' : '19';

        try {
            return \Carbon\Carbon::createFromFormat('Y-m-d', $century . $year . '-' . $month . '-' . $day);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Boot method for model events
     */
    protected static function boot()
    {
        parent::boot();

        // Auto-generate volunteer_id before creating
        static::creating(function ($volunteer) {
            if (empty($volunteer->volunteer_id)) {
                $volunteer->volunteer_id = self::generateVolunteerId();
            }

            if (empty($volunteer->registered_at)) {
                $volunteer->registered_at = now();
            }
        });
    }

    /**
     * Generate unique volunteer ID
     */
    public static function generateVolunteerId()
    {
        $prefix = 'VOL';
        $year = date('Y');
        
        // Get the last volunteer ID for this year
        $lastVolunteer = self::where('volunteer_id', 'LIKE', "{$prefix}{$year}%")
            ->orderBy('volunteer_id', 'desc')
            ->first();

        if ($lastVolunteer) {
            // Extract the number part and increment
            $lastNumber = (int) substr($lastVolunteer->volunteer_id, -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . $year . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }
}