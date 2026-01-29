<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VolunteerAttendanceAudit extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'volunteer_attendance_audit';

    public $incrementing = false;
    protected $keyType = 'string';

    // No updated_at in the database
    public $timestamps = false;

    protected $fillable = [
        'attendance_id',
        'admin_user_id',
        'action',
        'before_values',
        'after_values',
        'reason'
    ];

    protected $casts = [
        'before_values' => 'array',
        'after_values' => 'array',
        'created_at' => 'datetime'
    ];

    // Constants for action types (matching database check constraint)
    const ACTION_MANUAL_CREATE = 'manual_create';
    const ACTION_EDIT_TIME = 'edit_time';
    const ACTION_CANCEL = 'cancel';
    const ACTION_CORRECTION = 'correction';

    // Keep these for backward compatibility
    const ACTION_CREATE = 'manual_create';
    const ACTION_UPDATE = 'edit_time';
    const ACTION_DELETE = 'cancel';
    const ACTION_CLOCK_IN = 'manual_create';
    const ACTION_CLOCK_OUT = 'edit_time';
    const ACTION_MANUAL_ENTRY = 'manual_create';
    const ACTION_MANUAL_EDIT = 'correction';

    /**
     * Relationship: Attendance Record
     */
    public function attendance()
    {
        return $this->belongsTo(VolunteerAttendance::class, 'attendance_id', 'id');
    }

    /**
     * Relationship: Admin User (note: column is admin_user_id, not performed_by)
     */
    public function adminUser()
    {
        return $this->belongsTo(User::class, 'admin_user_id', 'id');
    }

    /**
     * Alias for backward compatibility
     */
    public function performedBy()
    {
        return $this->adminUser();
    }

    /**
     * Scope: Filter by attendance
     */
    public function scopeByAttendance($query, $attendanceId)
    {
        return $query->where('attendance_id', $attendanceId);
    }

    /**
     * Scope: Filter by action type
     */
    public function scopeByActionType($query, $actionType)
    {
        return $query->where('action', $actionType);
    }

    /**
     * Scope: Filter by user
     */
    public function scopeByUser($query, $userId)
    {
        return $query->where('admin_user_id', $userId);
    }

    /**
     * Scope: Manual actions only
     */
    public function scopeManualActions($query)
    {
        return $query->whereIn('action', [
            self::ACTION_MANUAL_CREATE,
            self::ACTION_CORRECTION
        ]);
    }

    /**
     * Scope: Recent audits (last 30 days)
     */
    public function scopeRecent($query, $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Get formatted timestamp
     */
    public function getFormattedTimestampAttribute()
    {
        return $this->created_at ? $this->created_at->format('d M Y H:i:s') : null;
    }

    /**
     * Get formatted action type
     */
    public function getFormattedActionTypeAttribute()
    {
        return ucwords(str_replace('_', ' ', $this->action));
    }

    /**
     * Get changes summary
     */
    public function getChangesSummaryAttribute()
    {
        if (!$this->before_values || !$this->after_values) {
            return null;
        }

        $changes = [];
        foreach ($this->after_values as $key => $newValue) {
            $oldValue = $this->before_values[$key] ?? null;
            if ($oldValue != $newValue) {
                $changes[] = [
                    'field' => ucwords(str_replace('_', ' ', $key)),
                    'old' => $oldValue,
                    'new' => $newValue
                ];
            }
        }

        return $changes;
    }

    /**
     * Create audit log entry
     * Updated to match actual database schema
     *
     * @param string $attendanceId
     * @param string $actionType
     * @param string $adminUserId
     * @param array|null $beforeValues
     * @param array|null $afterValues
     * @param string $reason
     * @return self
     */
    public static function logAction(
        $attendanceId,
        $actionType,
        $adminUserId,
        $beforeValues = null,
        $afterValues = null,
        $reason = null
    ) {
        // Map action types to database-compatible values
        $actionMap = [
            'clock_in' => self::ACTION_MANUAL_CREATE,
            'clock_out' => self::ACTION_EDIT_TIME,
            'manual_entry' => self::ACTION_MANUAL_CREATE,
            'manual_edit' => self::ACTION_CORRECTION,
            'create' => self::ACTION_MANUAL_CREATE,
            'update' => self::ACTION_EDIT_TIME,
            'delete' => self::ACTION_CANCEL
        ];

        $mappedAction = $actionMap[$actionType] ?? $actionType;

        return self::create([
            'attendance_id' => $attendanceId,
            'action' => $mappedAction,
            'admin_user_id' => $adminUserId,
            'before_values' => $beforeValues,
            'after_values' => $afterValues,
            'reason' => $reason ?? 'No reason provided'
        ]);
    }
}