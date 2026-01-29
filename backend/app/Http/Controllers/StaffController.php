<?php
// app/Http/Controllers/StaffController.php

namespace App\Http\Controllers;

use App\Models\Staff;
use App\Models\Designation;
use App\Services\S3UploadService;
use App\Mail\StaffCredentialsMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\StaffExport;
use App\Imports\StaffImport;
use App\Models\SystemSetting;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class StaffController extends Controller
{
    protected $s3Service;

    public function __construct(S3UploadService $s3Service)
    {
        $this->s3Service = $s3Service;
    }

    public function index(Request $request)
    {
        try {
            $query = Staff::with(['designation.role', 'user']);

            // Filters
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('department')) {
                $query->whereHas('designation', function ($q) use ($request) {
                    $q->where('department', $request->department);
                });
            }

            if ($request->has('employee_type')) {
                $query->where('employee_type', $request->employee_type);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('staff_code', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            }

            // Date range filters
            if ($request->has('joining_from') && $request->has('joining_to')) {
                $query->whereBetween('joining_date', [
                    $request->joining_from,
                    $request->joining_to
                ]);
            }

            // Sorting
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);
            $staff = $request->has('all') ? $query->get() : $query->paginate($request->get('per_page', 15));

            // Attach image URLs
            if ($staff->count() > 0) {
                $transformFn = function ($item) {
                    if ($item->profile_photo) {
                        // Decode JSON
                        $photoData = json_decode($item->profile_photo, true);

                        // Extract the path (fallback to original if decode fails)
                        $path = $photoData['url'] ?? $photoData['path'] ?? $item->profile_photo;

                        // Generate image URL
                        $item->profile_photo = app(S3UploadService::class)->getSignedUrl($path);
                    }
                    return $item;
                };

                if ($staff instanceof \Illuminate\Pagination\LengthAwarePaginator) {
                    $staff->getCollection()->transform($transformFn);
                } else {
                    $staff->transform($transformFn);
                }
            }


            return response()->json([
                'success' => true,
                'data' => $staff,
                'message' => 'Staff retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving staff: ' . $e->getMessage()
            ], 500);
        }
    }

public function store(Request $request)
{
    $validator = Validator::make($request->all(), [
        // Basic Information
        'designation_id' => 'required|exists:designations,id',
        'employee_type' => 'required|in:PERMANENT,CONTRACT,PART_TIME,VOLUNTEER,CONSULTANT',
        'first_name' => 'required|string|max:100',
        'last_name' => 'nullable|string|max:100',
        'father_name' => 'nullable|string|max:100',
        'date_of_birth' => 'nullable|date|before:today',
        'gender' => 'required|in:MALE,FEMALE,OTHER',
        'marital_status' => 'nullable|in:SINGLE,MARRIED,DIVORCED,WIDOWED',

        // Contact Information
        'phone' => 'required|string|max:20',
        'email' => 'required|email|unique:staff,email',
        'current_address' => 'required|array',
        'current_address.line1' => 'required|string',
        'current_address.city' => 'required|string',
        'current_address.state' => 'required|string',
        'current_address.pincode' => 'required|string',

        // Employment Information
        'joining_date' => 'required|date',
        'work_location' => 'nullable|string|max:100',

        // Documents
        'aadhar_number' => 'nullable|string|size:12|unique:staff,aadhar_number',
        'pan_number' => 'nullable|string|size:10|unique:staff,pan_number',

        // Bank Details
        'bank_details' => 'nullable|array',
        'bank_details.bank_name' => 'nullable|string',
        'bank_details.account_number' => 'nullable|string',
        'bank_details.ifsc_code' => 'nullable|string',

        // Password Option
        'generate_password' => 'nullable|in:on,off,1,0,true,false',
        'custom_password' => 'nullable|string|min:8|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/',
        'send_credentials' => 'nullable|in:on,off,1,0,true,false',

        // Files
        'profile_photo' => 'nullable|image|max:2048',
        'documents.*' => 'nullable|file|max:5120',
        
        // Work Shifts
        'work_shifts' => 'nullable|array',
        'work_shifts.*' => 'in:MORNING,AFTERNOON,EVENING,NIGHT,GENERAL',
    ]);

    if ($validator->fails()) {
        \Log::warning('Staff validation failed', [
            'errors' => $validator->errors()->toArray(),
            'input' => $request->except(['password', 'custom_password', 'profile_photo', 'documents'])
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Validation failed',
            'errors' => $validator->errors()
        ], 422);
    }

    DB::beginTransaction();
    try {
        // Prepare data (exclude files and password fields)
        $data = $request->except([
            'profile_photo', 
            'documents', 
            'generate_password', 
            'custom_password', 
            'send_credentials'
        ]);

        // ===================================
        // HANDLE JSON STRING CONVERSIONS
        // ===================================
        // Convert JSON strings to arrays if needed
        if ($request->has('current_address') && is_string($request->current_address)) {
            $data['current_address'] = json_decode($request->current_address, true);
        }

        if ($request->has('permanent_address') && is_string($request->permanent_address)) {
            $data['permanent_address'] = json_decode($request->permanent_address, true);
        }

        if ($request->has('bank_details') && is_string($request->bank_details)) {
            $data['bank_details'] = json_decode($request->bank_details, true);
        }

        // ===================================
        // GENERATE STAFF CODE
        // ===================================
        $data['staff_code'] = Staff::generateStaffCode();
        
        \Log::info('Generated staff code', [
            'staff_code' => $data['staff_code']
        ]);

        // ===================================
        // SET DEFAULT VALUES
        // ===================================
        $data['status'] = 'ACTIVE';
        $data['created_by'] = auth()->id();

        // ===================================
        // HANDLE FILE UPLOADS
        // ===================================
        // Handle profile photo
        if ($request->hasFile('profile_photo')) {
            try {
                $data['profile_photo'] = $this->s3Service->uploadFile(
                    $request->file('profile_photo'),
                    'staff/photos'
                );
                
                \Log::info('Profile photo uploaded', [
                    'path' => $data['profile_photo']
                ]);
            } catch (\Exception $e) {
                \Log::error('Profile photo upload failed', [
                    'error' => $e->getMessage()
                ]);
                // Continue without photo
            }
        }

        // Handle documents
        if ($request->hasFile('documents')) {
            $documentUrls = [];
            foreach ($request->file('documents') as $document) {
                try {
                    $documentUrls[] = $this->s3Service->uploadFile(
                        $document,
                        'staff/documents'
                    );
                } catch (\Exception $e) {
                    \Log::error('Document upload failed', [
                        'error' => $e->getMessage()
                    ]);
                    // Continue with other documents
                }
            }
            $data['documents'] = $documentUrls;
            
            \Log::info('Documents uploaded', [
                'count' => count($documentUrls)
            ]);
        }

        // ===================================
        // CREATE STAFF RECORD
        // ===================================
        $staff = Staff::create($data);
        
        \Log::info('Staff record created', [
            'staff_id' => $staff->id,
            'staff_code' => $staff->staff_code,
            'email' => $staff->email,
            'name' => $staff->full_name
        ]);

        // ===================================
        // CREATE USER ACCOUNT
        // ===================================
        // Determine password
        $password = $request->generate_password
            ? Staff::generateSecurePassword()
            : ($request->custom_password ?? Staff::generateSecurePassword());

        \Log::info('Creating user account for staff', [
            'staff_id' => $staff->id,
            'staff_code' => $staff->staff_code,
            'email' => $staff->email,
            'user_type' => 'STAFF',
            'generate_password' => $request->generate_password ? 'yes' : 'no',
            'custom_password' => $request->custom_password ? 'yes' : 'no'
        ]);

        try {
            // Create user account
            $user = $staff->createUserAccount($password);
            
            \Log::info('User account created successfully', [
                'user_id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'staff_id' => $staff->id,
                'is_active' => $user->is_active,
                'user_type' => $user->user_type,
                'has_role' => $user->roles()->count() > 0,
                'roles' => $user->roles()->pluck('name')->toArray()
            ]);

            // Check if user can login from required channels
            $canLoginAdmin = $user->canLoginFromChannel('ADMIN');
            $canLoginCounter = $user->canLoginFromChannel('COUNTER');
            
            \Log::info('User channel access check', [
                'user_id' => $user->id,
                'username' => $user->username,
                'can_login_admin' => $canLoginAdmin,
                'can_login_counter' => $canLoginCounter
            ]);

            if (!$canLoginAdmin && !$canLoginCounter) {
                \Log::error('User cannot login from any valid channel', [
                    'user_id' => $user->id,
                    'username' => $user->username,
                    'user_type' => $user->user_type
                ]);
            }

        } catch (\Exception $userException) {
            \Log::error('Failed to create user account', [
                'staff_id' => $staff->id,
                'staff_code' => $staff->staff_code,
                'email' => $staff->email,
                'error' => $userException->getMessage(),
                'file' => $userException->getFile(),
                'line' => $userException->getLine(),
                'trace' => $userException->getTraceAsString()
            ]);
            
            // Rollback and return detailed error
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Staff record created but user account creation failed',
                'error' => $userException->getMessage(),
                'staff_id' => $staff->id,
                'staff_code' => $staff->staff_code,
                'troubleshooting' => [
                    'Check Laravel logs for details',
                    'Verify designation has a valid role_id',
                    'Ensure users table has all required fields',
                    'Check database constraints'
                ]
            ], 500);
        }

        // ===================================
        // SEND CREDENTIALS EMAIL
        // ===================================
        if ($request->get('send_credentials', true)) {
            try {
                Mail::to($staff->email)->send(new StaffCredentialsMail($staff, $user, $password));
                
                \Log::info('Credentials email sent successfully', [
                    'staff_id' => $staff->id,
                    'email' => $staff->email
                ]);
            } catch (\Exception $mailException) {
                // Log but don't fail the request
                \Log::warning('Failed to send credentials email', [
                    'staff_id' => $staff->id,
                    'email' => $staff->email,
                    'error' => $mailException->getMessage()
                ]);
                // Email failure should not stop the process
            }
        } else {
            \Log::info('Credentials email not sent (user opted out)', [
                'staff_id' => $staff->id
            ]);
        }

        // ===================================
        // LOG ACTIVITY
        // ===================================
        $staff->logActivity('CREATED', null, $data);

        DB::commit();

        \Log::info('Staff creation completed successfully', [
            'staff_id' => $staff->id,
            'user_id' => $user->id,
            'username' => $user->username
        ]);

        // ===================================
        // RETURN SUCCESS RESPONSE
        // ===================================
        return response()->json([
            'success' => true,
            'data' => $staff->load(['designation', 'user']),
            'credentials' => [
                'username' => $user->username,
                'password' => $password,
                'sent_to_email' => $request->get('send_credentials', true)
            ],
            'login_instructions' => [
                'step_1' => 'Use the FULL username including @temple1 suffix',
                'step_2' => 'Select login channel as ADMIN or COUNTER',
                'step_3' => 'Staff must change password on first login',
                'username' => $user->username,
                'allowed_channels' => ['ADMIN', 'COUNTER'],
                'example_request' => [
                    'url' => '/api/v1/auth/login',
                    'method' => 'POST',
                    'headers' => [
                        'Content-Type' => 'application/json',
                        'X-Temple-ID' => 'temple1'
                    ],
                    'body' => [
                        'username' => $user->username,
                        'password' => '[Your Password]',
                        'request_through' => 'ADMIN'
                    ]
                ]
            ],
            'message' => 'Staff created successfully'
        ], 201);

    } catch (\Exception $e) {
        DB::rollBack();
        
        \Log::error('Staff creation failed with exception', [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
            'request_data' => $request->except(['password', 'custom_password', 'profile_photo', 'documents'])
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Error creating staff: ' . $e->getMessage(),
            'error_details' => [
                'message' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine()
            ],
            'troubleshooting' => [
                'Check Laravel logs at storage/logs/laravel.log',
                'Verify all required database tables exist',
                'Ensure foreign keys are valid',
                'Check S3 configuration if file uploads are involved'
            ]
        ], 500);
    }
}
    public function show($id)
    {
        try {
            $staff = Staff::with([
                'designation.role',
                'user',
                'activityLogs' => function ($q) {
                    $q->latest()->limit(10);
                }
            ])->findOrFail($id);

            if ($staff->profile_photo) {
                $photoData = json_decode($staff->profile_photo, true);
                $path = $photoData['url'] ?? $photoData['path'] ?? $staff->profile_photo;
                $staff->profile_photo = app(S3UploadService::class)->getSignedUrl($path);
            }

            return response()->json([
                'success' => true,
                'data' => $staff,
                'message' => 'Staff retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Staff not found'
            ], 404);
        }
    }


    public function update(Request $request, $id)
    {
        $staff = Staff::findOrFail($id);

        $validator = Validator::make($request->all(), [

            'designation_id' => 'exists:designations,id',
            'employee_type' => 'in:PERMANENT,CONTRACT,PART_TIME,VOLUNTEER,CONSULTANT',
            'first_name' => 'string|max:100',
            'last_name' => 'nullable|string|max:100',
            'father_name' => 'nullable|string|max:100',
            'date_of_birth' => 'nullable|date|before:today',
            'marital_status' => 'nullable|in:SINGLE,MARRIED,DIVORCED,WIDOWED',
            'gender' => 'in:MALE,FEMALE,OTHER',
            'phone' => 'string|max:20',
            'email' => 'email|unique:staff,email,' . $id,

            'aadhar_number' => 'nullable|string|size:12|unique:staff,aadhar_number,' . $id,
            'pan_number' => 'nullable|string|size:10|unique:staff,pan_number,' . $id,
            'status' => 'in:ACTIVE,INACTIVE,TERMINATED,SUSPENDED,ON_LEAVE,RESIGNED',
            'profile_photo' => 'nullable|image|max:2048',
            'documents.*' => 'nullable|file|max:5120',
            'work_shifts'   => 'nullable|array',
            'work_shifts.*' => 'in:MORNING,AFTERNOON,EVENING,NIGHT,GENERAL',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $oldValues = $staff->toArray();
            $data = $request->except(['profile_photo', 'documents', 'generate_password', 'custom_password', 'send_credentials']);

            if ($request->has('current_address') && is_string($request->current_address)) {
                $data['current_address'] = json_decode($request->current_address, true);
            }

            if ($request->has('permanent_address') && is_string($request->permanent_address)) {
                $data['permanent_address'] = json_decode($request->permanent_address, true);
            }

            if ($request->has('bank_details') && is_string($request->bank_details)) {
                $data['bank_details'] = json_decode($request->bank_details, true);
            }
            // Check if designation changed
            $designationChanged = isset($data['designation_id']) && $data['designation_id'] != $staff->designation_id;

            // Handle file uploads
            if ($request->hasFile('profile_photo')) {
                // Delete old photo from S3
                // if ($staff->profile_photo) {
                //     $this->s3Service->deleteFile($staff->profile_photo);
                // }

                $data['profile_photo'] = $this->s3Service->uploadFile(
                    $request->file('profile_photo'),
                    'staff/photos'
                );
            }

            if ($request->hasFile('documents')) {
                $documentUrls = $staff->documents ?? [];
                foreach ($request->file('documents') as $document) {
                    $documentUrls[] = $this->s3Service->uploadFile(
                        $document,
                        'staff/documents'
                    );
                }
                $data['documents'] = $documentUrls;
            }

            // Update staff
            $data['updated_by'] = auth()->id();
            $staff->update($data);

            // Update user if needed
            if ($staff->user) {
                $userUpdates = [];

                if (isset($data['first_name']) || isset($data['last_name'])) {
                    $userUpdates['name'] = $staff->full_name;
                }

                if (isset($data['email'])) {
                    $userUpdates['email'] = $data['email'];
                }

                if (isset($data['phone'])) {
                    $userUpdates['phone'] = $data['phone'];
                }

                if (isset($data['status'])) {
                    $userUpdates['is_active'] = $data['status'] === 'ACTIVE';
                }

                if (!empty($userUpdates)) {
                    $staff->user->update($userUpdates);
                }

                // Update role if designation changed
                if ($designationChanged) {
                    $staff->updateUserRole();
                }
            }

            // Log activity
            $staff->logActivity('UPDATED', $oldValues, $data);

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $staff->fresh()->load(['designation', 'user']),
                'message' => 'Staff updated successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error updating staff: ' . $e->getMessage()
            ], 500);
        }
    }

    public function terminate(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'termination_reason' => 'required|string',
            'last_working_date' => 'required|date'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $staff = Staff::findOrFail($id);

            $staff->update([
                'status' => 'TERMINATED',
                'termination_reason' => $request->termination_reason,
                'last_working_date' => $request->last_working_date,
                'updated_by' => auth()->id()
            ]);

            // Deactivate user account
            $staff->deactivateUser();

            // Log activity
            $staff->logActivity('TERMINATED', null, $request->all(), $request->termination_reason);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Staff terminated successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error terminating staff: ' . $e->getMessage()
            ], 500);
        }
    }

    public function activate($id)
    {
        DB::beginTransaction();
        try {
            $staff = Staff::findOrFail($id);

            $staff->update([
                'status' => 'ACTIVE',
                'updated_by' => auth()->id()
            ]);

            // Activate user account
            $staff->activateUser();

            // Log activity
            $staff->logActivity('ACTIVATED');

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Staff activated successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error activating staff: ' . $e->getMessage()
            ], 500);
        }
    }

    public function resetPassword($id)
    {
        DB::beginTransaction();
        try {
            $staff = Staff::with('user')->findOrFail($id);

            if (!$staff->user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User account not found for this staff'
                ], 404);
            }

            $newPassword = Staff::generateSecurePassword();
            $staff->user->update([
                'password' => \Hash::make($newPassword),
                'must_change_password' => true
            ]);

            // Send new password via email
            Mail::to($staff->email)->send(new StaffCredentialsMail($staff, $staff->user, $newPassword, true));

            // Log activity
            $staff->logActivity('PASSWORD_RESET');

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Password reset successfully and sent to staff email'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error resetting password: ' . $e->getMessage()
            ], 500);
        }
    }

    public function importStaff(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|mimes:xlsx,xls,csv|max:10240' // 10MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $import = new StaffImport();
            Excel::import($import, $request->file('file'));

            $errors = $import->getErrors();
            $successCount = $import->getSuccessCount();

            if ($successCount > 0) {
                DB::commit();
                return response()->json([
                    'success' => true,
                    'data' => [
                        'imported' => $successCount,
                        'total_rows' => $import->getRowCount(),
                        'errors' => $errors
                    ],
                    'message' => "Successfully imported {$successCount} staff members"
                ]);
            } else {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'data' => [
                        'imported' => 0,
                        'total_rows' => $import->getRowCount(),
                        'errors' => $errors
                    ],
                    'message' => 'No staff members were imported. Please check the errors.'
                ], 422);
            }
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Staff import error: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Error importing staff: ' . $e->getMessage()
            ], 500);
        }
    }



    public function getStatistics()
    {
        try {
            $stats = [
                'total' => Staff::count(),
                'active' => Staff::where('status', 'ACTIVE')->count(),
                'inactive' => Staff::where('status', 'INACTIVE')->count(),
                'terminated' => Staff::where('status', 'TERMINATED')->count(),
                'by_department' => Staff::with('designation')
                    ->get()
                    ->groupBy('designation.department')
                    ->map(function ($items) {
                        return $items->count();
                    }),
                'by_type' => Staff::selectRaw('employee_type, count(*) as count')
                    ->groupBy('employee_type')
                    ->pluck('count', 'employee_type'),
                'recent_joinings' => Staff::where('joining_date', '>=', now()->subMonth())
                    ->count(),
                'upcoming_confirmations' => Staff::whereNull('confirmation_date')
                    ->whereDate('joining_date', '<=', now()->subMonths(3))
                    ->count()
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
                'message' => 'Statistics retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving statistics: ' . $e->getMessage()
            ], 500);
        }
    }


    public function exportStaff(Request $request)
    {
        try {
            $format = $request->get('format', 'excel');
            $filters = $request->only(['status', 'department', 'employee_type']);

            if ($format === 'pdf') {
                $query = Staff::with(['designation', 'user']);

                // Apply filters
                if (!empty($filters['status'])) {
                    $query->where('status', $filters['status']);
                }

                if (!empty($filters['department'])) {
                    $query->whereHas('designation', function ($q) use ($filters) {
                        $q->where('department', $filters['department']);
                    });
                }

                if (!empty($filters['employee_type'])) {
                    $query->where('employee_type', $filters['employee_type']);
                }

                $staff = $query->get();

                // Get temple settings with logo
                $settings = $this->getTempleSettingsWithLogo();

                // Generate enhanced HTML
                $html = $this->generateEnhancedPdfHtml($staff, $settings);

                $pdf = Pdf::loadHTML($html);
                $pdf->setPaper('A4', 'landscape');

                return $pdf->download('staff-list-' . date('Y-m-d') . '.pdf');
            } else {
                // Excel export
                return Excel::download(
                    new StaffExport($filters),
                    'staff-list-' . date('Y-m-d') . '.xlsx'
                );
            }
        } catch (\Exception $e) {
            \Log::error('Staff export error: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Error exporting staff: ' . $e->getMessage()
            ], 500);
        }
    }
    private function getTempleSettingsWithLogo()
    {
        $settings = [
            'temple_name' => 'Temple Management System',
            'temple_address' => '',
            'temple_city' => '',
            'temple_state' => '',
            'temple_pincode' => '',
            'temple_country' => 'Malaysia',
            'temple_phone' => '',
            'temple_email' => '',
            'temple_logo' => null,
            'temple_logo_base64' => null,
            'primary_color' => '#ff00ff',
            'secondary_color' => '#808000'
        ];

        try {
            // Try to get from settings table first
            $systemSettings = DB::table('system_settings')
                ->where('type', 'SYSTEM')
                ->first();

            if ($systemSettings && $systemSettings->values) {
                $values = json_decode($systemSettings->values, true);
                if ($values) {
                    foreach ($settings as $key => $default) {
                        if ($key !== 'temple_logo_base64') {
                            $settings[$key] = $values[$key] ?? $default;
                        }
                    }

                    // Convert logo to base64 if exists
                    if (!empty($values['temple_logo'])) {
                        $settings['temple_logo_base64'] = $this->convertLogoToBase64($values['temple_logo']);
                    }
                }
            }

            // Fallback to API if needed
            if (empty($settings['temple_logo_base64'])) {
                try {
                    // Attempt to fetch from API endpoint
                    $apiSettings = \App\Models\SystemSetting::getByType('SYSTEM');
                    if (!empty($apiSettings['temple_logo'])) {
                        $settings['temple_logo_base64'] = $this->convertLogoToBase64($apiSettings['temple_logo']);
                    }
                } catch (\Exception $e) {
                    \Log::warning('Could not fetch temple logo from API: ' . $e->getMessage());
                }
            }
        } catch (\Exception $e) {
            \Log::warning('Could not load temple settings: ' . $e->getMessage());
        }

        return $settings;
    }

    private function convertLogoToBase64($logoPath)
    {
        try {
            // Check if it's a full URL
            if (filter_var($logoPath, FILTER_VALIDATE_URL)) {
                $imageContent = @file_get_contents($logoPath);
                if ($imageContent !== false) {
                    $finfo = new \finfo(FILEINFO_MIME_TYPE);
                    $mimeType = $finfo->buffer($imageContent);
                    return 'data:' . $mimeType . ';base64,' . base64_encode($imageContent);
                }
            }
            // Check if it's an S3 path
            elseif (strpos($logoPath, 's3://') === 0 || strpos($logoPath, 'https://') === 0) {
                $imageContent = @file_get_contents($logoPath);
                if ($imageContent !== false) {
                    $finfo = new \finfo(FILEINFO_MIME_TYPE);
                    $mimeType = $finfo->buffer($imageContent);
                    return 'data:' . $mimeType . ';base64,' . base64_encode($imageContent);
                }
            }
            // Check local storage
            elseif (Storage::exists($logoPath)) {
                $imageContent = Storage::get($logoPath);
                $mimeType = Storage::mimeType($logoPath);
                return 'data:' . $mimeType . ';base64,' . base64_encode($imageContent);
            }
            // Check public path
            elseif (file_exists(public_path($logoPath))) {
                $imageContent = file_get_contents(public_path($logoPath));
                $mimeType = mime_content_type(public_path($logoPath));
                return 'data:' . $mimeType . ';base64,' . base64_encode($imageContent);
            }
        } catch (\Exception $e) {
            \Log::warning('Could not convert logo to base64: ' . $e->getMessage());
        }

        return null;
    }
    private function generateEnhancedPdfHtml($staff, $settings)
    {
        // Calculate summary statistics
        $stats = $this->calculateStatistics($staff);

        // Generate logo HTML
        $logoHtml = '';
        if (!empty($settings['temple_logo_base64'])) {
            $logoHtml = '<img src="' . $settings['temple_logo_base64'] . '" style="width:120px;height:100px;object-fit:contain;" alt="Logo" />';
        } else {
            $logoHtml = '<div style="width:120px;height:100px;border:1px solid #ddd;text-align:center;line-height:100px;background:#f5f5f5;"><span style="font-size:10px;color:#666;">TEMPLE LOGO</span></div>';
        }

        $html = '<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Staff List Report</title>
        <style>
            body { 
                font-family: DejaVu Sans, sans-serif; 
                font-size: 10px;
                color: #333;
                margin: 0;
                padding: 20px;
            }
            
            .header-section {
                margin-bottom: 20px;
            }
            
            .header-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .header-table td {
                vertical-align: top;
                padding: 0;
            }
            
            .logo-cell {
                width: 130px;
            }
            
            .temple-info {
                padding-left: 20px;
                font-size: 11px;
            }
            
            .temple-name {
                font-size: 21px;
                font-weight: bold;
                color: ' . ($settings['primary_color'] ?? '#ff00ff') . ';
                margin-bottom: 5px;
            }
            
            .divider {
                border-top: 2px solid #c2c2c2;
                margin: 15px 0;
            }
            
            .report-title {
                text-align: center;
                font-size: 20px;
                font-weight: bold;
                text-transform: uppercase;
                margin: 20px 0;
            }
            
            .sub-header {
                text-align: center;
                margin-bottom: 20px;
                padding: 10px;
                background-color: #f8f9fa;
                border: 1px solid #dee2e6;
            }
            
            .staff-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
            }
            
            .staff-table th {
                background-color: #4a5568;
                color: white;
                padding: 8px 4px;
                text-align: left;
                font-size: 9px;
                font-weight: bold;
                border: 1px solid #4a5568;
            }
            
            .staff-table td {
                padding: 6px 4px;
                border: 1px solid #e2e8f0;
                font-size: 9px;
                vertical-align: top;
            }
            
            .staff-table tr:nth-child(even) {
                background-color: #f7fafc;
            }
            
            .status-badge {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 8px;
                font-weight: bold;
                text-align: center;
                color: white;
            }
            
            .status-ACTIVE { background-color: #48bb78; }
            .status-INACTIVE { background-color: #718096; }
            .status-TERMINATED { background-color: #f56565; }
            .status-SUSPENDED { background-color: #ed8936; }
            .status-ON_LEAVE { background-color: #4299e1; }
            .status-RESIGNED { background-color: #2d3748; }
            
            .summary-section {
                margin-top: 30px;
                padding: 15px;
                background-color: #f8f9fa;
                border: 1px solid #dee2e6;
            }
            
            .summary-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .summary-table td {
                padding: 5px;
                font-size: 10px;
            }
            
            .footer-section {
                margin-top: 40px;
                text-align: center;
                font-size: 8px;
                color: #666;
                border-top: 1px solid #dee2e6;
                padding-top: 20px;
            }
        </style>
    </head>
    <body>
      
        <!-- Report Title -->
        <div class="report-title">Staff List Report</div>
        
        <!-- Sub Header -->
        <div class="sub-header">
            <div>Generated on: ' . date('d F Y, h:i A') . '</div>
            <div>Total Records: ' . count($staff) . '</div>
        </div>
        
        <!-- Staff Table -->
        <table class="staff-table">
            <thead>
                <tr>
                    <th style="width:8%">Code</th>
                    <th style="width:18%">Name</th>
                    <th style="width:14%">Designation</th>
                    <th style="width:12%">Department</th>
                    <th style="width:10%">Type</th>
                    <th style="width:18%">Contact</th>
                    <th style="width:10%">Joining Date</th>
                    <th style="width:10%">Status</th>
                </tr>
            </thead>
            <tbody>';

        foreach ($staff as $member) {
            $html .= '<tr>
            <td>' . htmlspecialchars($member->staff_code ?? '-') . '</td>
            <td><strong>' . htmlspecialchars($member->first_name . ' ' . $member->last_name) . '</strong></td>
            <td>' . htmlspecialchars(optional($member->designation)->designation_name ?? '-') . '</td>
            <td>' . htmlspecialchars(optional($member->designation)->department ?? '-') . '</td>
            <td>' . htmlspecialchars(str_replace('_', ' ', $member->employee_type ?? '')) . '</td>
            <td>' . htmlspecialchars($member->phone) .
                ($member->email ? '<br/>' . htmlspecialchars($member->email) : '') . '</td>
            <td>' . ($member->joining_date ? date('d-M-Y', strtotime($member->joining_date)) : '-') . '</td>
            <td><span class="status-badge status-' . $member->status . '">' . $member->status . '</span></td>
        </tr>';
        }

        if (count($staff) == 0) {
            $html .= '<tr><td colspan="8" style="text-align:center;padding:20px;">No staff records found</td></tr>';
        }

        $html .= '</tbody>
        </table>';

        // Add summary statistics
        if (count($staff) > 0) {
            $html .= '
            <div class="summary-section">
                <h4 style="margin-bottom:10px;">Summary Statistics</h4>
                <table class="summary-table">
                    <tr>
                        <td><strong>Total Staff:</strong> ' . $stats['total'] . '</td>
                        <td><strong>Active:</strong> ' . $stats['active'] . '</td>
                        <td><strong>Inactive:</strong> ' . $stats['inactive'] . '</td>
                    </tr>
                    <tr>
                        <td><strong>On Leave:</strong> ' . $stats['on_leave'] . '</td>
                        <td><strong>Suspended:</strong> ' . $stats['suspended'] . '</td>
                        <td><strong>Terminated:</strong> ' . $stats['terminated'] . '</td>
                    </tr>
                    <tr>
                        <td><strong>Permanent:</strong> ' . $stats['permanent'] . '</td>
                        <td><strong>Contract:</strong> ' . $stats['contract'] . '</td>
                        <td><strong>Others:</strong> ' . $stats['others'] . '</td>
                    </tr>
                </table>
            </div>';
        }

        $html .= '
        <!-- Footer Section -->
        <div class="footer-section">
            <div>This is a system generated report</div>
            <div>' . htmlspecialchars($settings['temple_name']) . ' - Staff Management Module</div>
            <div>Generated on: ' . date('d-M-Y H:i:s') . '</div>
        </div>
    </body>
    </html>';

        return $html;
    }

    private function calculateStatistics($staff)
    {
        $stats = [
            'total' => count($staff),
            'active' => 0,
            'inactive' => 0,
            'on_leave' => 0,
            'suspended' => 0,
            'terminated' => 0,
            'resigned' => 0,
            'permanent' => 0,
            'contract' => 0,
            'others' => 0
        ];

        foreach ($staff as $member) {
            // Status counts
            switch ($member->status) {
                case 'ACTIVE':
                    $stats['active']++;
                    break;
                case 'INACTIVE':
                    $stats['inactive']++;
                    break;
                case 'ON_LEAVE':
                    $stats['on_leave']++;
                    break;
                case 'SUSPENDED':
                    $stats['suspended']++;
                    break;
                case 'TERMINATED':
                    $stats['terminated']++;
                    break;
                case 'RESIGNED':
                    $stats['resigned']++;
                    break;
            }

            // Employee type counts
            switch ($member->employee_type) {
                case 'PERMANENT':
                    $stats['permanent']++;
                    break;
                case 'CONTRACT':
                    $stats['contract']++;
                    break;
                default:
                    $stats['others']++;
                    break;
            }
        }

        return $stats;
    }
    // Add this method to StaffController.php

    public function downloadTemplate(Request $request)
    {
        try {
            $format = $request->get('format', 'csv');

            // Get sample designations for the template
            $designations = Designation::limit(5)->get();

            if ($format === 'xlsx') {
                $spreadsheet = new Spreadsheet();
                $sheet = $spreadsheet->getActiveSheet();

                // Set headers
                $headers = [
                    'Staff Code',
                    'First Name',
                    'Last Name',
                    'Email',
                    'Phone',
                    'Designation Code',
                    'Employee Type',
                    'Date of Birth',
                    'Gender',
                    'Joining Date',
                    'Address Line 1',
                    'Address Line 2',
                    'City',
                    'State',
                    'Pincode',
                    'Country',
                    'Aadhar Number',
                    'PAN Number',
                    'Bank Name',
                    'Bank Account Number',
                    'IFSC Code'
                ];

                $sheet->fromArray([$headers], NULL, 'A1');

                // Add sample data
                $sampleData = [
                    'AUTO',
                    'John',
                    'Doe',
                    'john@temple.com',
                    '9876543210',
                    $designations->first()->designation_code ?? 'PRIEST01',
                    'PERMANENT',
                    '1985-05-15',
                    'MALE',
                    '2024-01-01',
                    '123 Temple Street',
                    'Near Main Gate',
                    'Chennai',
                    'Tamil Nadu',
                    '600001',
                    'India',
                    '123456789012',
                    'ABCDE1234F',
                    'SBI',
                    '12345678901234',
                    'SBIN0001234'
                ];

                $sheet->fromArray([$sampleData], NULL, 'A2');

                // Style the header row
                $sheet->getStyle('A1:U1')->getFont()->setBold(true);
                $sheet->getStyle('A1:U1')->getFill()
                    ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                    ->getStartColor()->setARGB('FFE0E0E0');

                // Auto-size columns
                foreach (range('A', 'U') as $col) {
                    $sheet->getColumnDimension($col)->setAutoSize(true);
                }

                $writer = new Xlsx($spreadsheet);
                $fileName = 'staff-import-template.xlsx';

                header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                header('Content-Disposition: attachment;filename="' . $fileName . '"');
                header('Cache-Control: max-age=0');

                $writer->save('php://output');
                exit;
            } else {
                // CSV format
                $fileName = 'staff-import-template.csv';

                $headers = [
                    'staff_code',
                    'first_name',
                    'last_name',
                    'email',
                    'phone',
                    'designation_code',
                    'employee_type',
                    'date_of_birth',
                    'gender',
                    'joining_date',
                    'address_line_1',
                    'address_line_2',
                    'city',
                    'state',
                    'pincode',
                    'country',
                    'aadhar_number',
                    'pan_number',
                    'bank_name',
                    'bank_account_number',
                    'ifsc_code'
                ];

                $callback = function () use ($headers, $designations) {
                    $file = fopen('php://output', 'w');

                    // Add headers
                    fputcsv($file, $headers);

                    // Add sample row
                    fputcsv($file, [
                        'AUTO',
                        'John',
                        'Doe',
                        'john@temple.com',
                        '9876543210',
                        $designations->first()->designation_code ?? 'PRIEST01',
                        'PERMANENT',
                        '1985-05-15',
                        'MALE',
                        '2024-01-01',
                        '123 Temple Street',
                        'Near Main Gate',
                        'Chennai',
                        'Tamil Nadu',
                        '600001',
                        'India',
                        '123456789012',
                        'ABCDE1234F',
                        'SBI',
                        '12345678901234',
                        'SBIN0001234'
                    ]);

                    fclose($file);
                };

                return response()->stream($callback, 200, [
                    'Content-Type' => 'text/csv',
                    'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('Template download error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error generating template: ' . $e->getMessage()
            ], 500);
        }
    }
    public function activeStaff(Request $request)
    {
        try {
            $staff = Staff::where('status', 'ACTIVE')
                ->join('users', 'staff.user_id', '=', 'users.id')
                ->select('staff.*', 'users.name as user_name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $staff,
                'message' => 'Staff retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving staff: ' . $e->getMessage()
            ], 500);
        }
    }

    public function resetPasswordManual(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'new_password' => 'required|string|min:8|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/',
            'confirm_password' => 'required|same:new_password'
        ], [
            'new_password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
            'confirm_password.same' => 'Passwords do not match.'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $staff = Staff::with('user')->findOrFail($id);

            if (!$staff->user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User account not found for this staff'
                ], 404);
            }

            $staff->user->update([
                'password' => \Hash::make($request->new_password),
                'must_change_password' => false
            ]);

            // Log activity
            $staff->logActivity('PASSWORD_RESET', null, null, 'Password reset manually by admin');

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Password reset successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error resetting password: ' . $e->getMessage()
            ], 500);
        }
    }
}
