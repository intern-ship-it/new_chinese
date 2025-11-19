<?php
// app/Imports/StaffImport.php

namespace App\Imports;

use App\Models\Staff;
use App\Models\Designation;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\SkipsErrors;

class StaffImport implements ToModel, WithHeadingRow, WithValidation, SkipsOnError
{
    use SkipsErrors;
    
    private $rowCount = 0;
    private $successCount = 0;
    private $errors = [];

    public function model(array $row)
    {
        $this->rowCount++;

        try {
            // Skip empty rows
            if (empty($row['first_name']) || empty($row['email'])) {
                return null;
            }

            // Find designation by code or name
            $designation = Designation::where('designation_code', $row['designation_code'] ?? '')
                ->orWhere('designation_name', $row['designation_code'] ?? '')
                ->first();
            
            if (!$designation) {
                $this->errors[] = "Row {$this->rowCount}: Designation '{$row['designation_code']}' not found";
                return null;
            }

            // Generate staff code if not provided or if AUTO
            $staffCode = (!empty($row['staff_code']) && $row['staff_code'] !== 'AUTO') 
                ? $row['staff_code'] 
                : Staff::generateStaffCode();

            $staff = Staff::create([
                'staff_code' => $staffCode,
                'designation_id' => $designation->id,
                'employee_type' => strtoupper($row['employee_type'] ?? 'PERMANENT'),
                'first_name' => $row['first_name'],
                'last_name' => $row['last_name'],
                'email' => $row['email'],
                'phone' => $row['phone'],
                'date_of_birth' => $row['date_of_birth'],
                'gender' => strtoupper($row['gender'] ?? 'MALE'),
                'joining_date' => $row['joining_date'],
                'current_address' => [
                    'line1' => $row['address_line_1'] ?? $row['address_line1'] ?? '',
                    'line2' => $row['address_line_2'] ?? $row['address_line2'] ?? '',
                    'city' => $row['city'] ?? '',
                    'state' => $row['state'] ?? '',
                    'country' => $row['country'] ?? 'India',
                    'pincode' => $row['pincode'] ?? ''
                ],
                'permanent_address' => [
                    'line1' => $row['permanent_address_line_1'] ?? $row['address_line_1'] ?? '',
                    'line2' => $row['permanent_address_line_2'] ?? $row['address_line_2'] ?? '',
                    'city' => $row['permanent_city'] ?? $row['city'] ?? '',
                    'state' => $row['permanent_state'] ?? $row['state'] ?? '',
                    'country' => $row['permanent_country'] ?? $row['country'] ?? 'India',
                    'pincode' => $row['permanent_pincode'] ?? $row['pincode'] ?? ''
                ],
                'aadhar_number' => $row['aadhar_number'] ?? null,
                'pan_number' => $row['pan_number'] ?? null,
                'bank_details' => !empty($row['bank_name']) ? [
                    'bank_name' => $row['bank_name'] ?? '',
                    'account_number' => $row['bank_account_number'] ?? '',
                    'ifsc_code' => $row['ifsc_code'] ?? '',
                    'branch' => $row['bank_branch'] ?? ''
                ] : null,
                'status' => 'ACTIVE',
                'created_by' => auth()->id()
            ]);

            // Create user account with default password
            $password = Staff::generateSecurePassword();
            $staff->createUserAccount($password);

            $this->successCount++;
            return $staff;
            
        } catch (\Exception $e) {
            $this->errors[] = "Row {$this->rowCount}: " . $e->getMessage();
            return null;
        }
    }

    public function rules(): array
    {
        return [
            'first_name' => 'required|string',
            'last_name' => 'required|string',
            'email' => 'required|email',
            'phone' => 'required',
            'designation_code' => 'required',
            'employee_type' => 'required|in:PERMANENT,CONTRACT,PART_TIME,VOLUNTEER,CONSULTANT',
            'date_of_birth' => 'required|date',
            'gender' => 'required|in:MALE,FEMALE,OTHER',
            'joining_date' => 'required|date',
            'address_line_1' => 'required|string',
            'city' => 'required|string',
            'state' => 'required|string',
            'pincode' => 'required'
        ];
    }

    public function getRowCount(): int
    {
        return $this->rowCount;
    }

    public function getSuccessCount(): int
    {
        return $this->successCount;
    }

    public function getErrors(): array
    {
        return $this->errors;
    }
}