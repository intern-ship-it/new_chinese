<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Volunteer;
use App\Models\VolunteerApprovalLog;
use App\Models\VolunteerTask;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class VolunteerApprovalController extends Controller
{
    /**
     * Get approval queue (pending approvals)
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function getApprovalQueue(Request $request)
    {
        try {
            $query = Volunteer::with([
                'preferredDepartment:id,department_name',
                'documents',
                'approvalLogs' => function($q) {
                    $q->latest()->limit(1);
                }
            ])
            ->where('status', 'pending_approval')
            ->whereNull('deleted_at');

            // Apply filters
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('volunteer_id', 'LIKE', "%{$search}%")
                      ->orWhere('full_name', 'LIKE', "%{$search}%")
                      ->orWhere('ic_number', 'LIKE', "%{$search}%")
                      ->orWhere('mobile_primary', 'LIKE', "%{$search}%");
                });
            }

            if ($request->filled('department_id')) {
                $query->where('preferred_department_id', $request->department_id);
            }

            if ($request->filled('from_date')) {
                $query->whereDate('registered_at', '>=', $request->from_date);
            }

            if ($request->filled('to_date')) {
                $query->whereDate('registered_at', '<=', $request->to_date);
            }

            $volunteers = $query->orderBy('registered_at', 'asc')->get();

            // Add document status for each volunteer
            $volunteers->each(function($volunteer) {
                $requiredDocs = ['ic_photostat', 'passport_photo'];
                if ($volunteer->id_type === 'passport') {
                    $requiredDocs[] = 'passport_photostat';
                }
                
                $uploadedDocs = $volunteer->documents->pluck('document_type')->toArray();
                $missingDocs = array_diff($requiredDocs, $uploadedDocs);
                
                $volunteer->document_status = empty($missingDocs) ? 'complete' : 'incomplete';
                $volunteer->missing_documents = array_values($missingDocs);
            });

            return response()->json([
                'success' => true,
                'data' => $volunteers
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching approval queue: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to load approval queue',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get volunteer details for approval review
     * 
     * @param string $volunteerId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getVolunteerForApproval($volunteerId)
    {
        try {
            Log::info('Fetching volunteer for approval. ID: ' . $volunteerId);
            
            // First, load the volunteer with basic relationships
            $volunteer = Volunteer::with([
                'preferredDepartment:id,department_name',
                'documents',
                'approvalLogs.approver:id,name',
                'createdBy:id,name',
                'user:id,name,email'
            ])
            ->where(function($query) use ($volunteerId) {
                $query->where('id', $volunteerId)
                      ->orWhere('volunteer_id', $volunteerId);
            })
            ->whereNull('deleted_at')
            ->first();

            if (!$volunteer) {
                Log::warning('Volunteer not found for ID: ' . $volunteerId);
                return response()->json([
                    'success' => false,
                    'message' => 'Volunteer not found'
                ], 404);
            }

            // Manually load preferred tasks if preferred_tasks_ids exists
            if ($volunteer->preferred_tasks_ids && is_array($volunteer->preferred_tasks_ids)) {
                $volunteer->preferred_tasks_details = VolunteerTask::whereIn('id', $volunteer->preferred_tasks_ids)
                    ->select('id', 'task_name', 'department_id')
                    ->get();
            } else {
                $volunteer->preferred_tasks_details = collect([]);
            }

            // Check document completeness
            $requiredDocs = ['ic_photostat', 'passport_photo'];
            if ($volunteer->id_type === 'passport') {
                $requiredDocs[] = 'passport_photostat';
            }
            
            $uploadedDocs = $volunteer->documents->pluck('document_type')->toArray();
            $missingDocs = array_diff($requiredDocs, $uploadedDocs);
            
            $volunteer->document_status = empty($missingDocs) ? 'complete' : 'incomplete';
            $volunteer->missing_documents = array_values($missingDocs);

            // Calculate age if date_of_birth exists
            if ($volunteer->date_of_birth) {
                $volunteer->age = \Carbon\Carbon::parse($volunteer->date_of_birth)->age;
            }

            Log::info('Volunteer found successfully. ID: ' . $volunteer->volunteer_id);

            return response()->json([
                'success' => true,
                'data' => $volunteer
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching volunteer for approval: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to load volunteer details',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve volunteer registration
     * 
     * @param Request $request
     * @param string $volunteerId
     * @return \Illuminate\Http\JsonResponse
     */
    public function approve(Request $request, $volunteerId)
    {
        $validator = Validator::make($request->all(), [
            'remarks' => 'nullable|string|max:500'
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
            $volunteer = Volunteer::where(function($query) use ($volunteerId) {
                $query->where('id', $volunteerId)
                      ->orWhere('volunteer_id', $volunteerId);
            })
            ->whereNull('deleted_at')
            ->first();

            if (!$volunteer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Volunteer not found'
                ], 404);
            }

            // Check if volunteer is in pending status
            if ($volunteer->status !== 'pending_approval') {
                return response()->json([
                    'success' => false,
                    'message' => "Volunteer status is '{$volunteer->status}'. Can only approve volunteers with 'pending_approval' status."
                ], 400);
            }

            // Check if all required documents are uploaded
            $requiredDocs = ['ic_photostat', 'passport_photo'];
            if ($volunteer->id_type === 'passport') {
                $requiredDocs[] = 'passport_photostat';
            }
            
            $uploadedDocs = $volunteer->documents->pluck('document_type')->toArray();
            $missingDocs = array_diff($requiredDocs, $uploadedDocs);
            
            if (!empty($missingDocs)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot approve. Missing required documents: ' . implode(', ', $missingDocs)
                ], 400);
            }

            // Store old status
            $oldStatus = $volunteer->status;

            // Update volunteer status to active
            $volunteer->status = 'active';
            $volunteer->approved_at = now();
            $volunteer->approved_by = Auth::id();
            $volunteer->rejection_reason = null;
            $volunteer->updated_by = Auth::id();
            $volunteer->save();

            // Create approval log
            VolunteerApprovalLog::create([
                'volunteer_id' => $volunteer->id,
                'action' => 'approved',
                'previous_status' => $oldStatus,
                'new_status' => 'active',
                'remarks' => $request->remarks ?? 'Volunteer registration approved',
                'admin_user_id' => Auth::id()
            ]);

            DB::commit();

            // Load relationships for response
            $volunteer->load([
                'preferredDepartment:id,department_name',
                'approvalLogs' => function($q) {
                    $q->latest()->limit(1)->with('approver:id,name');
                }
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Volunteer approved successfully',
                'data' => $volunteer
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error approving volunteer: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve volunteer',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject volunteer registration
     * 
     * @param Request $request
     * @param string $volunteerId
     * @return \Illuminate\Http\JsonResponse
     */
    public function reject(Request $request, $volunteerId)
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed. Rejection reason is required.',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $volunteer = Volunteer::where(function($query) use ($volunteerId) {
                $query->where('id', $volunteerId)
                      ->orWhere('volunteer_id', $volunteerId);
            })
            ->whereNull('deleted_at')
            ->first();

            if (!$volunteer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Volunteer not found'
                ], 404);
            }

            // Check if volunteer is in pending status
            if ($volunteer->status !== 'pending_approval') {
                return response()->json([
                    'success' => false,
                    'message' => "Volunteer status is '{$volunteer->status}'. Can only reject volunteers with 'pending_approval' status."
                ], 400);
            }

            // Store old status
            $oldStatus = $volunteer->status;

            // Update volunteer status to rejected
            $volunteer->status = 'rejected';
            $volunteer->rejection_reason = $request->reason;
            $volunteer->approved_at = null;
            $volunteer->approved_by = null;
            $volunteer->updated_by = Auth::id();
            $volunteer->save();

            // Create approval log
            VolunteerApprovalLog::create([
                'volunteer_id' => $volunteer->id,
                'action' => 'rejected',
                'previous_status' => $oldStatus,
                'new_status' => 'rejected',
                'remarks' => $request->reason,
                'admin_user_id' => Auth::id()
            ]);

            DB::commit();

            // Load relationships for response
            $volunteer->load([
                'preferredDepartment:id,department_name',
                'approvalLogs' => function($q) {
                    $q->latest()->limit(1)->with('approver:id,name');
                }
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Volunteer rejected',
                'data' => $volunteer
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error rejecting volunteer: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject volunteer',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Request resubmission of volunteer application
     * 
     * @param Request $request
     * @param string $volunteerId
     * @return \Illuminate\Http\JsonResponse
     */
    public function requestResubmission(Request $request, $volunteerId)
    {
        $validator = Validator::make($request->all(), [
            'remarks' => 'required|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed. Remarks explaining what needs to be resubmitted is required.',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $volunteer = Volunteer::where(function($query) use ($volunteerId) {
                $query->where('id', $volunteerId)
                      ->orWhere('volunteer_id', $volunteerId);
            })
            ->whereNull('deleted_at')
            ->first();

            if (!$volunteer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Volunteer not found'
                ], 404);
            }

            // Store old status
            $oldStatus = $volunteer->status;

            // Keep status as pending_approval
            $volunteer->status = 'pending_approval';
            $volunteer->updated_by = Auth::id();
            $volunteer->save();

            // Create approval log
            VolunteerApprovalLog::create([
                'volunteer_id' => $volunteer->id,
                'action' => 'requested_resubmission',
                'previous_status' => $oldStatus,
                'new_status' => 'pending_approval',
                'remarks' => $request->remarks,
                'admin_user_id' => Auth::id()
            ]);

            DB::commit();

            // Load relationships for response
            $volunteer->load([
                'preferredDepartment:id,department_name',
                'approvalLogs' => function($q) {
                    $q->latest()->limit(1)->with('approver:id,name');
                }
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Resubmission requested. Volunteer has been notified.',
                'data' => $volunteer
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error requesting resubmission: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to request resubmission',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Suspend a volunteer
     * 
     * @param Request $request
     * @param string $volunteerId
     * @return \Illuminate\Http\JsonResponse
     */
    public function suspend(Request $request, $volunteerId)
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed. Suspension reason is required.',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $volunteer = Volunteer::where(function($query) use ($volunteerId) {
                $query->where('id', $volunteerId)
                      ->orWhere('volunteer_id', $volunteerId);
            })
            ->whereNull('deleted_at')
            ->first();

            if (!$volunteer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Volunteer not found'
                ], 404);
            }

            // Can only suspend active volunteers
            if ($volunteer->status !== 'active') {
                return response()->json([
                    'success' => false,
                    'message' => "Can only suspend volunteers with 'active' status. Current status: '{$volunteer->status}'"
                ], 400);
            }

            // Store old status
            $oldStatus = $volunteer->status;

            // Update volunteer status to suspended
            $volunteer->status = 'suspended';
            $volunteer->updated_by = Auth::id();
            $volunteer->save();

            // Create approval log
            VolunteerApprovalLog::create([
                'volunteer_id' => $volunteer->id,
                'action' => 'suspended',
                'previous_status' => $oldStatus,
                'new_status' => 'suspended',
                'remarks' => $request->reason,
                'admin_user_id' => Auth::id()
            ]);

            DB::commit();

            // Load relationships for response
            $volunteer->load([
                'preferredDepartment:id,department_name',
                'approvalLogs' => function($q) {
                    $q->latest()->limit(1)->with('approver:id,name');
                }
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Volunteer suspended successfully',
                'data' => $volunteer
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error suspending volunteer: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to suspend volunteer',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reactivate a suspended volunteer
     * 
     * @param Request $request
     * @param string $volunteerId
     * @return \Illuminate\Http\JsonResponse
     */
    public function reactivate(Request $request, $volunteerId)
    {
        $validator = Validator::make($request->all(), [
            'remarks' => 'nullable|string|max:500'
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
            $volunteer = Volunteer::where(function($query) use ($volunteerId) {
                $query->where('id', $volunteerId)
                      ->orWhere('volunteer_id', $volunteerId);
            })
            ->whereNull('deleted_at')
            ->first();

            if (!$volunteer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Volunteer not found'
                ], 404);
            }

            // Can only reactivate suspended or inactive volunteers
            if (!in_array($volunteer->status, ['suspended', 'inactive'])) {
                return response()->json([
                    'success' => false,
                    'message' => "Can only reactivate volunteers with 'suspended' or 'inactive' status. Current status: '{$volunteer->status}'"
                ], 400);
            }

            // Store old status
            $oldStatus = $volunteer->status;

            // Update volunteer status to active
            $volunteer->status = 'active';
            $volunteer->updated_by = Auth::id();
            $volunteer->save();

            // Create approval log
            VolunteerApprovalLog::create([
                'volunteer_id' => $volunteer->id,
                'action' => 'reactivated',
                'previous_status' => $oldStatus,
                'new_status' => 'active',
                'remarks' => $request->remarks ?? 'Volunteer reactivated',
                'admin_user_id' => Auth::id()
            ]);

            DB::commit();

            // Load relationships for response
            $volunteer->load([
                'preferredDepartment:id,department_name',
                'approvalLogs' => function($q) {
                    $q->latest()->limit(1)->with('approver:id,name');
                }
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Volunteer reactivated successfully',
                'data' => $volunteer
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error reactivating volunteer: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to reactivate volunteer',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get approval history for a volunteer
     * 
     * @param string $volunteerId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getApprovalHistory($volunteerId)
    {
        try {
            $volunteer = Volunteer::where(function($query) use ($volunteerId) {
                $query->where('id', $volunteerId)
                      ->orWhere('volunteer_id', $volunteerId);
            })
            ->whereNull('deleted_at')
            ->first();

            if (!$volunteer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Volunteer not found'
                ], 404);
            }

            $history = VolunteerApprovalLog::with('approver:id,name,email')
                ->where('volunteer_id', $volunteer->id)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'volunteer' => [
                        'id' => $volunteer->id,
                        'volunteer_id' => $volunteer->volunteer_id,
                        'full_name' => $volunteer->full_name,
                        'current_status' => $volunteer->status
                    ],
                    'history' => $history
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching approval history: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch approval history',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get pending approvals count (for badge display)
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function getPendingCount()
    {
        try {
            $count = Volunteer::where('status', 'pending_approval')
                ->whereNull('deleted_at')
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'count' => $count
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching pending approvals count: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch pending count',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Batch approve volunteers
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function batchApprove(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'volunteer_ids' => 'required|array|min:1',
            'volunteer_ids.*' => 'required|string',
            'remarks' => 'nullable|string|max:500'
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
            $approved = [];
            $failed = [];

            foreach ($request->volunteer_ids as $volunteerId) {
                try {
                    $volunteer = Volunteer::where(function($query) use ($volunteerId) {
                        $query->where('id', $volunteerId)
                              ->orWhere('volunteer_id', $volunteerId);
                    })
                    ->where('status', 'pending_approval')
                    ->whereNull('deleted_at')
                    ->first();

                    if (!$volunteer) {
                        $failed[] = [
                            'volunteer_id' => $volunteerId,
                            'reason' => 'Not found or not in pending status'
                        ];
                        continue;
                    }

                    // Check documents
                    $requiredDocs = ['ic_photostat', 'passport_photo'];
                    if ($volunteer->id_type === 'passport') {
                        $requiredDocs[] = 'passport_photostat';
                    }
                    
                    $uploadedDocs = $volunteer->documents->pluck('document_type')->toArray();
                    $missingDocs = array_diff($requiredDocs, $uploadedDocs);
                    
                    if (!empty($missingDocs)) {
                        $failed[] = [
                            'volunteer_id' => $volunteerId,
                            'reason' => 'Missing documents: ' . implode(', ', $missingDocs)
                        ];
                        continue;
                    }

                    // Approve
                    $oldStatus = $volunteer->status;
                    $volunteer->status = 'active';
                    $volunteer->approved_at = now();
                    $volunteer->approved_by = Auth::id();
                    $volunteer->rejection_reason = null;
                    $volunteer->updated_by = Auth::id();
                    $volunteer->save();

                    // Create approval log
                    VolunteerApprovalLog::create([
                        'volunteer_id' => $volunteer->id,
                        'action' => 'approved',
                        'previous_status' => $oldStatus,
                        'new_status' => 'active',
                        'remarks' => $request->remarks ?? 'Batch approval',
                        'admin_user_id' => Auth::id()
                    ]);

                    $approved[] = $volunteer->volunteer_id;

                } catch (\Exception $e) {
                    $failed[] = [
                        'volunteer_id' => $volunteerId,
                        'reason' => $e->getMessage()
                    ];
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => count($approved) . ' volunteer(s) approved successfully',
                'data' => [
                    'approved' => $approved,
                    'failed' => $failed
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error in batch approval: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Batch approval failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}