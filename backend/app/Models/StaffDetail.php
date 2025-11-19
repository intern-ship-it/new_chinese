<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class StaffDetail extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'employee_code',
        'department',
        'designation',
        'joining_date',
        'reporting_to',
        'salary_type',
        'base_salary',
        'emergency_contact',
        'blood_group',
        'medical_conditions',
        'bank_name',
        'bank_account_no',
        'bank_ifsc',
        'pan_number',
        'uan_number',
        'is_active'
    ];

    protected $casts = [
        'joining_date' => 'date:Y-m-d',
        'base_salary' => 'decimal:2',
        'is_active' => 'boolean'
    ];

    protected $hidden = [
        'bank_account_no',
        'pan_number',
        'uan_number'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reportingTo()
    {
        return $this->belongsTo(User::class, 'reporting_to');
    }
}