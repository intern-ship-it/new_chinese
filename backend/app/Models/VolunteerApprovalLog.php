<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class VolunteerApprovalLog extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'volunteer_approval_logs';
    
    // UUID primary key configuration
    public $incrementing = false;
    protected $keyType = 'string';

    // No updated_at column
    const UPDATED_AT = null;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'volunteer_id',
        'admin_user_id',
        'action',
        'previous_status',
        'new_status',
        'remarks',
        'created_at',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'created_at' => 'datetime',
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [];

    // =============================================
    // CONSTANTS
    // =============================================

    // Actions
    const ACTION_SUBMITTED = 'submitted';
    const ACTION_APPROVED = 'approved';
    const ACTION_REJECTED = 'rejected';
    const ACTION_RESUBMIT_REQUESTED = 'resubmit_requested';
    const ACTION_SUSPENDED = 'suspended';
    const ACTION_REACTIVATED = 'reactivated';
    const ACTION_DEACTIVATED = 'deactivated';

    // =============================================
    // RELATIONSHIPS
    // =============================================

    /**
     * Get the volunteer this log belongs to
     */
    public function volunteer()
    {
        return $this->belongsTo(Volunteer::class, 'volunteer_id');
    }

    /**
     * Get the admin who performed the action
     */
    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_user_id');
    }

    // =============================================
    // SCOPES
    // =============================================

    /**
     * Scope: Filter by volunteer
     */
    public function scopeForVolunteer($query, $volunteerId)
    {
        return $query->where('volunteer_id', $volunteerId);
    }

    /**
     * Scope: Filter by action
     */
    public function scopeOfAction($query, $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope: Filter by admin
     */
    public function scopeByAdmin($query, $adminId)
    {
        return $query->where('admin_user_id', $adminId);
    }

    /**
     * Scope: Recent logs
     */
    public function scopeRecent($query, $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Scope: Order by latest first
     */
    public function scopeLatest($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    // =============================================
    // HELPER METHODS
    // =============================================

    /**
     * Get action label
     */
    public function getActionLabelAttribute()
    {
        return match($this->action) {
            self::ACTION_SUBMITTED => 'Registration Submitted',
            self::ACTION_APPROVED => 'Approved',
            self::ACTION_REJECTED => 'Rejected',
            self::ACTION_RESUBMIT_REQUESTED => 'Resubmission Requested',
            self::ACTION_SUSPENDED => 'Suspended',
            self::ACTION_REACTIVATED => 'Reactivated',
            self::ACTION_DEACTIVATED => 'Deactivated',
            default => ucfirst(str_replace('_', ' ', $this->action)),
        };
    }

    /**
     * Get action color for badge
     */
    public function getActionColorAttribute()
    {
        return match($this->action) {
            self::ACTION_SUBMITTED => 'info',
            self::ACTION_APPROVED => 'success',
            self::ACTION_REJECTED => 'danger',
            self::ACTION_RESUBMIT_REQUESTED => 'warning',
            self::ACTION_SUSPENDED => 'secondary',
            self::ACTION_REACTIVATED => 'success',
            self::ACTION_DEACTIVATED => 'dark',
            default => 'secondary',
        };
    }

    /**
     * Get action icon
     */
    public function getActionIconAttribute()
    {
        return match($this->action) {
            self::ACTION_SUBMITTED => 'file-earmark-text',
            self::ACTION_APPROVED => 'check-circle',
            self::ACTION_REJECTED => 'x-circle',
            self::ACTION_RESUBMIT_REQUESTED => 'arrow-clockwise',
            self::ACTION_SUSPENDED => 'pause-circle',
            self::ACTION_REACTIVATED => 'play-circle',
            self::ACTION_DEACTIVATED => 'stop-circle',
            default => 'circle',
        };
    }

    /**
     * Get formatted timestamp
     */
    public function getFormattedDateAttribute()
    {
        return $this->created_at->format('d M Y, h:i A');
    }

    /**
     * Get admin name
     */
    public function getAdminNameAttribute()
    {
        return $this->admin ? $this->admin->name : 'System';
    }

    /**
     * Check if action requires remarks
     */
    public static function actionRequiresRemarks($action): bool
    {
        return in_array($action, [
            self::ACTION_REJECTED,
            self::ACTION_RESUBMIT_REQUESTED,
            self::ACTION_SUSPENDED,
            self::ACTION_DEACTIVATED,
        ]);
    }

    /**
     * Create approval log entry
     */
    public static function createLog(
        string $volunteerId,
        string $action,
        ?string $previousStatus = null,
        ?string $newStatus = null,
        ?string $remarks = null,
        ?string $adminUserId = null
    ): self {
        return self::create([
            'volunteer_id' => $volunteerId,
            'admin_user_id' => $adminUserId ?? auth()->id(),
            'action' => $action,
            'previous_status' => $previousStatus,
            'new_status' => $newStatus,
            'remarks' => $remarks,
            'created_at' => now(),
        ]);
    }

    /**
     * Log submission
     */
    public static function logSubmission($volunteerId, $adminUserId = null): self
    {
        return self::createLog(
            $volunteerId,
            self::ACTION_SUBMITTED,
            null,
            'pending_approval',
            'Volunteer registration submitted',
            $adminUserId
        );
    }

    /**
     * Log approval
     */
    public static function logApproval($volunteerId, $remarks = null, $adminUserId = null): self
    {
        return self::createLog(
            $volunteerId,
            self::ACTION_APPROVED,
            'pending_approval',
            'active',
            $remarks ?? 'Application approved',
            $adminUserId
        );
    }

    /**
     * Log rejection
     */
    public static function logRejection($volunteerId, $remarks, $adminUserId = null): self
    {
        return self::createLog(
            $volunteerId,
            self::ACTION_REJECTED,
            'pending_approval',
            'rejected',
            $remarks,
            $adminUserId
        );
    }

    /**
     * Log resubmission request
     */
    public static function logResubmitRequest($volunteerId, $remarks, $adminUserId = null): self
    {
        return self::createLog(
            $volunteerId,
            self::ACTION_RESUBMIT_REQUESTED,
            'pending_approval',
            'pending_approval',
            $remarks,
            $adminUserId
        );
    }

    /**
     * Log suspension
     */
    public static function logSuspension($volunteerId, $remarks, $adminUserId = null): self
    {
        return self::createLog(
            $volunteerId,
            self::ACTION_SUSPENDED,
            'active',
            'suspended',
            $remarks,
            $adminUserId
        );
    }

    /**
     * Log reactivation
     */
    public static function logReactivation($volunteerId, $remarks = null, $adminUserId = null): self
    {
        return self::createLog(
            $volunteerId,
            self::ACTION_REACTIVATED,
            'suspended',
            'active',
            $remarks ?? 'Volunteer reactivated',
            $adminUserId
        );
    }

    /**
     * Log deactivation
     */
    public static function logDeactivation($volunteerId, $remarks, $adminUserId = null): self
    {
        return self::createLog(
            $volunteerId,
            self::ACTION_DEACTIVATED,
            'active',
            'inactive',
            $remarks,
            $adminUserId
        );
    }

    /**
     * Get all action types
     */
    public static function getActionTypes(): array
    {
        return [
            self::ACTION_SUBMITTED => 'Registration Submitted',
            self::ACTION_APPROVED => 'Approved',
            self::ACTION_REJECTED => 'Rejected',
            self::ACTION_RESUBMIT_REQUESTED => 'Resubmission Requested',
            self::ACTION_SUSPENDED => 'Suspended',
            self::ACTION_REACTIVATED => 'Reactivated',
            self::ACTION_DEACTIVATED => 'Deactivated',
        ];
    }

    // =============================================
    // EVENTS
    // =============================================

    /**
     * Boot the model
     */
    protected static function boot()
    {
        parent::boot();

        // Set created_at on creation
        static::creating(function ($log) {
            if (empty($log->created_at)) {
                $log->created_at = now();
            }

            if (empty($log->admin_user_id)) {
                $log->admin_user_id = auth()->id();
            }
        });
    }
public function approver()
{
    return $this->belongsTo(User::class, 'approver_id');
}
}