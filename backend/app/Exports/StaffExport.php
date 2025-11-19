<?php

namespace App\Exports;

use App\Models\Staff;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class StaffExport implements FromCollection, WithHeadings, WithMapping
{
    protected $filters;

    public function __construct($filters = [])
    {
        $this->filters = $filters;
    }

    public function collection()
    {
        $query = Staff::with(['designation', 'user']);

        if (isset($this->filters['status'])) {
            $query->where('status', $this->filters['status']);
        }

        if (isset($this->filters['department'])) {
            $query->whereHas('designation', function ($q) {
                $q->where('department', $this->filters['department']);
            });
        }

        if (isset($this->filters['employee_type'])) {
            $query->where('employee_type', $this->filters['employee_type']);
        }

        return $query->get();
    }

    public function headings(): array
    {
        return [
            'Staff Code',
            'First Name',
            'Last Name',
            'Email',
            'Phone',
            'Designation',
            'Department',
            'Employee Type',
            'Joining Date',
            'Status',
            'Gender',
            'Date of Birth',
            'Aadhar Number',
            'PAN Number',
            'Address'
        ];
    }

    public function map($staff): array
    {
        $address = '';
        if ($staff->current_address) {
            $addr = is_string($staff->current_address) ? json_decode($staff->current_address, true) : $staff->current_address;
            if ($addr) {
                $address = implode(', ', array_filter([
                    $addr['line1'] ?? '',
                    $addr['line2'] ?? '',
                    $addr['city'] ?? '',
                    $addr['state'] ?? '',
                    $addr['pincode'] ?? ''
                ]));
            }
        }

        return [
            $staff->staff_code,
            $staff->first_name,
            $staff->last_name,
            $staff->email,
            $staff->phone,
            optional($staff->designation)->designation_name,
            optional($staff->designation)->department,
            $staff->employee_type,
            $staff->joining_date,
            $staff->status,
            $staff->gender,
            $staff->date_of_birth,
            $staff->aadhar_number,
            $staff->pan_number,
            $address
        ];
    }
}