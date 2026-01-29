<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Models\User;
use App\Models\Staff;
use App\Models\Member;
use App\Services\S3UploadService;

class ProfileController extends Controller
{
    protected $s3UploadService;

    public function __construct(S3UploadService $s3UploadService)
    {
        $this->s3UploadService = $s3UploadService;
    }

    /**
     * Get current user's profile
     */
    public function getProfile()
    {
        try {
            $user = auth()->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            // Base user data
            $profileData = [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'chinese_name' => $user->chinese_name,
                'user_type' => $user->user_type,
                'contact_number' => $user->contact_number,
                'profile_picture' => $user->profile_picture,
                'is_active' => $user->is_active,
                'email_verified_at' => $user->email_verified_at,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ];

            // Get roles
            $profileData['roles'] = $user->roles->map(function ($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'display_name' => $role->display_name,
                    'description' => $role->description
                ];
            });

            // Get permissions
            $profileData['permissions'] = $user->getAllPermissions()->pluck('name')->toArray();

            // Get user-type specific data
            switch ($user->user_type) {
                case 'STAFF':
                    $staff = Staff::where('user_id', $user->id)->first();
                    if ($staff) {
                        $profileData['staff_info'] = [
                            'staff_id' => $staff->staff_id,
                            'designation' => $staff->designation ? [
                                'id' => $staff->designation->id,
                                'name' => $staff->designation->name,
                                'chinese_name' => $staff->designation->chinese_name,
                                'department' => $staff->designation->department
                            ] : null,
                            'date_of_joining' => $staff->date_of_joining,
                            'date_of_birth' => $staff->date_of_birth,
                            'gender' => $staff->gender,
                            'address' => $staff->address,
                            'emergency_contact' => $staff->emergency_contact,
                            'emergency_contact_number' => $staff->emergency_contact_number,
                            'employment_status' => $staff->employment_status,
                        ];
                    }
                    break;

                case 'MEMBER':
                    $member = Member::where('user_id', $user->id)->first();
                    if ($member) {
                        $profileData['member_info'] = [
                            'member_id' => $member->member_id,
                            'membership_number' => $member->membership_number,
                            'date_of_birth' => $member->date_of_birth,
                            'gender' => $member->gender,
                            'nric' => $member->nric,
                            'address' => $member->address,
                            'postal_code' => $member->postal_code,
                            'membership_status' => $member->membership_status,
                            'joined_date' => $member->joined_date,
                            'member_type' => $member->memberType ? [
                                'id' => $member->memberType->id,
                                'name' => $member->memberType->name,
                                'chinese_name' => $member->memberType->chinese_name
                            ] : null,
                        ];
                    }
                    break;
            }

            // Get recent activities (last 10)
            $activities = DB::table('activity_logs')
                ->where('user_id', $user->id)
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get();

            $profileData['recent_activities'] = $activities;

            // Get device sessions
            $devices = DB::table('user_devices')
                ->where('user_id', $user->id)
                ->where('is_active', true)
                ->orderBy('last_used_at', 'desc')
                ->get();

            $profileData['active_devices'] = $devices;

            return response()->json([
                'success' => true,
                'data' => $profileData
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get profile: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update user profile
     */
    public function updateProfile(Request $request)
    {
        try {
            $user = auth()->user();

            $validator = Validator::make($request->all(), [
                'name' => 'sometimes|required|string|max:255',
                'chinese_name' => 'nullable|string|max:255',
                'email' => 'sometimes|required|email|unique:users,email,' . $user->id,
                'contact_number' => 'nullable|string|max:20',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // Update basic user info
            $updateData = $request->only(['name', 'chinese_name', 'email', 'contact_number']);
            $user->update($updateData);

            // Update user-type specific data
            if ($user->user_type === 'STAFF' && $request->has('staff_info')) {
                $staff = Staff::where('user_id', $user->id)->first();
                if ($staff) {
                    $staffData = $request->input('staff_info');
                    $staff->update([
                        'date_of_birth' => $staffData['date_of_birth'] ?? $staff->date_of_birth,
                        'gender' => $staffData['gender'] ?? $staff->gender,
                        'address' => $staffData['address'] ?? $staff->address,
                        'emergency_contact' => $staffData['emergency_contact'] ?? $staff->emergency_contact,
                        'emergency_contact_number' => $staffData['emergency_contact_number'] ?? $staff->emergency_contact_number,
                    ]);
                }
            }

            if ($user->user_type === 'MEMBER' && $request->has('member_info')) {
                $member = Member::where('user_id', $user->id)->first();
                if ($member) {
                    $memberData = $request->input('member_info');
                    $member->update([
                        'address' => $memberData['address'] ?? $member->address,
                        'postal_code' => $memberData['postal_code'] ?? $member->postal_code,
                    ]);
                }
            }

            // Log activity
            $this->logActivity($user->id, 'profile_updated', 'Updated profile information');

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Profile updated successfully',
                'data' => $user->fresh()
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update profile: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload profile picture
     */
    public function uploadProfilePicture(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'profile_picture' => 'required|image|mimes:jpeg,jpg,png|max:2048'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $user = auth()->user();

            // Delete old profile picture if exists
            if ($user->profile_picture) {
                $this->s3UploadService->deleteFile($user->profile_picture);
            }

            // Upload new profile picture
            $file = $request->file('profile_picture');
            $folder = 'profile-pictures/' . $user->id;
            $uploadResult = $this->s3UploadService->uploadFile($file, $folder);

            if (!$uploadResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to upload profile picture'
                ], 500);
            }

            // Update user profile picture
            $user->profile_picture = $uploadResult['url'];
            $user->save();

            // Log activity
            $this->logActivity($user->id, 'profile_picture_updated', 'Updated profile picture');

            return response()->json([
                'success' => true,
                'message' => 'Profile picture uploaded successfully',
                'data' => [
                    'profile_picture' => $uploadResult['url']
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload profile picture: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete profile picture
     */
    public function deleteProfilePicture()
    {
        try {
            $user = auth()->user();

            if (!$user->profile_picture) {
                return response()->json([
                    'success' => false,
                    'message' => 'No profile picture to delete'
                ], 400);
            }

            // Delete from S3
            $this->s3UploadService->deleteFile($user->profile_picture);

            // Update user
            $user->profile_picture = null;
            $user->save();

            // Log activity
            $this->logActivity($user->id, 'profile_picture_deleted', 'Deleted profile picture');

            return response()->json([
                'success' => true,
                'message' => 'Profile picture deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete profile picture: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user activity logs
     */
    public function getActivityLogs(Request $request)
    {
        try {
            $user = auth()->user();
            $perPage = $request->input('per_page', 20);
            $page = $request->input('page', 1);

            $query = DB::table('activity_logs')
                ->where('user_id', $user->id)
                ->orderBy('created_at', 'desc');

            // Filter by date range
            if ($request->has('start_date')) {
                $query->where('created_at', '>=', $request->input('start_date'));
            }
            if ($request->has('end_date')) {
                $query->where('created_at', '<=', $request->input('end_date'));
            }

            // Filter by action type
            if ($request->has('action_type')) {
                $query->where('action_type', $request->input('action_type'));
            }

            $total = $query->count();
            $activities = $query->skip(($page - 1) * $perPage)
                ->take($perPage)
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'activities' => $activities,
                    'pagination' => [
                        'total' => $total,
                        'per_page' => $perPage,
                        'current_page' => $page,
                        'last_page' => ceil($total / $perPage)
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get activity logs: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user statistics
     */
    public function getStatistics()
    {
        try {
            $user = auth()->user();

            $stats = [
                'total_logins' => DB::table('activity_logs')
                    ->where('user_id', $user->id)
                    ->where('action_type', 'login')
                    ->count(),
                
                'last_login' => DB::table('activity_logs')
                    ->where('user_id', $user->id)
                    ->where('action_type', 'login')
                    ->orderBy('created_at', 'desc')
                    ->first(),
                
                'active_devices' => DB::table('user_devices')
                    ->where('user_id', $user->id)
                    ->where('is_active', true)
                    ->count(),
                
                'account_age_days' => now()->diffInDays($user->created_at),
            ];

            // User-type specific stats
            if ($user->user_type === 'STAFF') {
                $staff = Staff::where('user_id', $user->id)->first();
                if ($staff) {
                    $stats['employment_days'] = $staff->date_of_joining 
                        ? now()->diffInDays($staff->date_of_joining) 
                        : 0;
                }
            }

            if ($user->user_type === 'MEMBER') {
                $member = Member::where('user_id', $user->id)->first();
                if ($member) {
                    $stats['membership_days'] = $member->joined_date 
                        ? now()->diffInDays($member->joined_date) 
                        : 0;
                    
                    // Get donation statistics
                    $stats['total_donations'] = DB::table('bookings')
                        ->where('booking_type', 'DONATION')
                        ->where('created_by', $user->id)
                        ->count();
                    
                    $stats['total_donation_amount'] = DB::table('bookings')
                        ->where('booking_type', 'DONATION')
                        ->where('created_by', $user->id)
                        ->sum('total_amount');
                }
            }

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get statistics: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update notification preferences
     */
    public function updateNotificationPreferences(Request $request)
    {
        try {
            $user = auth()->user();

            $validator = Validator::make($request->all(), [
                'email_notifications' => 'boolean',
                'sms_notifications' => 'boolean',
                'push_notifications' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $preferences = $user->notification_preferences ?? [];
            
            if ($request->has('email_notifications')) {
                $preferences['email'] = $request->input('email_notifications');
            }
            if ($request->has('sms_notifications')) {
                $preferences['sms'] = $request->input('sms_notifications');
            }
            if ($request->has('push_notifications')) {
                $preferences['push'] = $request->input('push_notifications');
            }

            $user->notification_preferences = $preferences;
            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Notification preferences updated successfully',
                'data' => $preferences
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update notification preferences: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper function to log activity
     */
    private function logActivity($userId, $actionType, $description)
    {
        DB::table('activity_logs')->insert([
            'id' => DB::raw('uuid_generate_v4()'),
            'user_id' => $userId,
            'action_type' => $actionType,
            'description' => $description,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }
}