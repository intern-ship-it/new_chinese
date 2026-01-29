<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserDevice;
use App\Models\RefreshToken;
use App\Models\UserLoginHistory;
use App\Models\SystemSetting;
use App\Models\PasswordResetOtp;
use App\Services\TempleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\TokenExpiredException;
use Tymon\JWTAuth\Exceptions\TokenInvalidException;
use Tymon\JWTAuth\Exceptions\JWTException;
use Jenssegers\Agent\Agent;
use Illuminate\Support\Str;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use App\Mail\PasswordResetOtpMail;
use App\Mail\PasswordResetSuccessMail;

class AuthController extends Controller
{
    use ApiResponse;

    protected $templeService;

    public function __construct(TempleService $templeService)
    {
        $this->templeService = $templeService;
    }

    /**
     * Login with extended session support
     */
    public function login(Request $request)
    {
        // Temple middleware already set the database connection
        $temple = $request->input('current_temple');

        $validator = Validator::make($request->all(), [
            'username' => 'required|string',
            'password' => 'required|string',
            'request_through' => 'required|in:COUNTER,ADMIN,ONLINE,APP,KIOSK,STAFF',
            'captcha' => 'sometimes|required|string',
            'remember_me' => 'boolean' // Add remember me option
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        // Find user by username or email
        $user = User::where('username', $request->username)
            ->orWhere('email', $request->username)
            ->first();

        if (!$user) {
            return $this->unauthorizedResponse('Invalid credentials');
        }

        // Check if user is blocked
        if ($user->isBlocked()) {
            $this->logFailedAttempt($user, $request, 'Account is blocked');
            return $this->forbiddenResponse('Account is temporarily blocked. Please try again later.');
        }

        // Check if user is active
        if (!$user->is_active) {
            $this->logFailedAttempt($user, $request, 'Account is inactive');
            return $this->forbiddenResponse('Account is inactive. Please contact administrator.');
        }

        // Check user type for channel access
        if (!$user->canLoginFromChannel($request->request_through)) {
            $this->logFailedAttempt($user, $request, 'Invalid channel for user type');
            return $this->forbiddenResponse('You are not authorized to login from this channel.');
        }

        // Verify password
        if (!Hash::check($request->password, $user->password)) {
            $this->handleFailedLogin($user, $request);
            return $this->unauthorizedResponse('Invalid credentials');
        }

        // Check device limit
        $deviceInfo = $this->getDeviceInfo($request);
        $deviceId = $this->generateDeviceId($deviceInfo);

        $activeDevices = $user->devices()->where('is_active', true)->count();
        $maxDevices = SystemSetting::get('max_devices_per_user', 20);

        $userDevice = $user->devices()->where('device_id', $deviceId)->first();

        if (!$userDevice && $activeDevices >= $maxDevices) {
            return $this->forbiddenResponse('Maximum device limit reached. Please logout from another device.');
        }

        // Create or update device
        if (!$userDevice) {
            $userDevice = UserDevice::create([
                'user_id' => $user->id,
                'device_id' => $deviceId,
                'device_info' => $deviceInfo,
                'ip_address' => $request->ip(),
                'last_used_at' => now()
            ]);
        } else {
            $userDevice->update([
                'device_info' => $deviceInfo,
                'ip_address' => $request->ip(),
                'last_used_at' => now(),
                'is_active' => true
            ]);
        }

        // Set custom TTL based on remember_me option
        $customTTL = null;
        if ($request->get('remember_me', false)) {
            // If remember me is checked, use full 30 days
            $customTTL = config('jwt.ttl'); // 43200 minutes (30 days)
        } else {
            // Otherwise use 1 day as default
            $customTTL = 1440; // 1 day in minutes
        }

        // Add temple info and session info to JWT claims
        $customClaims = [
            'temple_id' => $temple['id'],
            'temple_code' => $temple['code'],
            'device_id' => $deviceId,
            'channel' => $request->request_through,
            'session_extended' => $request->get('remember_me', false)
        ];

        // Generate tokens with custom TTL
        if ($customTTL) {
            JWTAuth::factory()->setTTL($customTTL);
        }

        $accessToken = JWTAuth::claims($customClaims)->fromUser($user);

        // Create refresh token with extended expiry (60 days)
        $refreshToken = $this->createRefreshToken($user, $userDevice, $request->get('remember_me', false));

        // Reset failed attempts and update login info
        $user->update([
            'failed_login_attempts' => 0,
            'blocked_until' => null,
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
            'login_count' => $user->login_count + 1
        ]);

        // Log successful login
        UserLoginHistory::create([
            'user_id' => $user->id,
            'login_ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'device_info' => $deviceInfo,
            'login_channel' => $request->request_through,
            'status' => 'SUCCESS'
        ]);

        // Get user permissions
        $permissions = $user->getAllPermissions()->pluck('name');

        // Calculate token expiry times
        $tokenExpiry = Carbon::now()->addMinutes($customTTL ?? config('jwt.ttl'));
        $refreshTokenExpiry = $request->get('remember_me', false)
            ? Carbon::now()->addDays(60)
            : Carbon::now()->addDays(7);

        return $this->successResponse([
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'name' => $user->name,
                'email' => $user->email,
                'user_type' => $user->user_type,
                'permissions' => $permissions
            ],
            'temple' => [
                'id' => $temple['id'],
                'name' => $temple['name'],
                'code' => $temple['code']
            ],
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken->token_id,
            'token_type' => 'bearer',
            'expires_in' => $customTTL ? $customTTL * 60 : config('jwt.ttl') * 60, // in seconds
            'expires_at' => $tokenExpiry->toIso8601String(),
            'refresh_expires_at' => $refreshTokenExpiry->toIso8601String()
        ], 'Login successful');
    }

    // ... (rest of the methods remain the same as before)

    private function handleFailedLogin($user, $request)
    {
        $maxAttempts = SystemSetting::get('max_login_attempts', 5);
        $blockDuration = SystemSetting::get('login_block_duration', 15);

        $user->increment('failed_login_attempts');

        if ($user->failed_login_attempts >= $maxAttempts) {
            $user->update(['blocked_until' => now()->addMinutes($blockDuration)]);
        }

        $this->logFailedAttempt($user, $request, 'Invalid password');
    }

    private function logFailedAttempt($user, $request, $reason)
    {
        UserLoginHistory::create([
            'user_id' => $user->id,
            'login_ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'device_info' => $this->getDeviceInfo($request),
            'login_channel' => $request->request_through,
            'status' => 'FAILED',
            'failure_reason' => $reason
        ]);
    }

    private function getDeviceInfo($request)
    {
        $agent = new Agent();
        $agent->setUserAgent($request->userAgent());

        return [
            'browser' => $agent->browser(),
            'browser_version' => $agent->version($agent->browser()),
            'platform' => $agent->platform(),
            'platform_version' => $agent->version($agent->platform()),
            'device' => $agent->device(),
            'device_type' => $agent->isDesktop() ? 'desktop' : ($agent->isTablet() ? 'tablet' : 'mobile'),
            'is_robot' => $agent->isRobot()
        ];
    }

    private function generateDeviceId($deviceInfo)
    {
        $string = json_encode($deviceInfo);
        return hash('sha256', $string);
    }

    /**
     * Create refresh token with extended expiry
     */
    private function createRefreshToken($user, $device, $extended = false)
    {
        $tokenId = Str::random(64);

        // Extended session: 60 days, Normal: 7 days
        $expiresAt = $extended
            ? now()->addDays(60)
            : now()->addDays(7);

        return RefreshToken::create([
            'user_id' => $user->id,
            'device_id' => $device->id,
            'token_id' => $tokenId,
            'expires_at' => $expiresAt
        ]);
    }

    /**
     * Refresh token with session extension
     */
    public function refresh(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'refresh_token' => 'required|string'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        // Find refresh token
        $refreshToken = RefreshToken::where('token_id', $request->refresh_token)
            ->where('expires_at', '>', now())
            ->whereNull('revoked_at')
            ->first();

        if (!$refreshToken) {
            return $this->unauthorizedResponse('Invalid or expired refresh token');
        }

        $user = $refreshToken->user;
        $device = $refreshToken->device;

        if (!$user || !$user->is_active) {
            return $this->unauthorizedResponse('User account is not active');
        }

         try {
            // Get the old token from header
            $oldToken = JWTAuth::getToken();

            // Invalidate old token
            if ($oldToken) {
                JWTAuth::invalidate($oldToken);
            }

            // Check if original session was extended
            $payload = JWTAuth::getPayload($oldToken);
            $sessionExtended = $payload->get('session_extended', false);

            // Set TTL based on original session type
            $customTTL = $sessionExtended ? config('jwt.ttl') : 1440;
            JWTAuth::factory()->setTTL($customTTL);

            // Generate new access token with same claims
            $customClaims = [
                'temple_id' => $payload->get('temple_id'),
                'temple_code' => $payload->get('temple_code'),
                'device_id' => $payload->get('device_id'),
                'channel' => $payload->get('channel'),
                'session_extended' => $sessionExtended
            ];

            $newToken = JWTAuth::claims($customClaims)->fromUser($user);

            // Update device last used
            if ($device) {
                $device->update(['last_used_at' => now()]);
            }

            // Update refresh token expiry
            $refreshToken->update([
                'expires_at' => $sessionExtended
                    ? now()->addDays(60)
                    : now()->addDays(7)
            ]);

            $tokenExpiry = Carbon::now()->addMinutes($customTTL);

            return $this->successResponse([
                'access_token' => $newToken,
                'token_type' => 'bearer',
                'expires_in' => $customTTL * 60,
                'expires_at' => $tokenExpiry->toIso8601String()
            ], 'Token refreshed successfully');
        } catch (TokenExpiredException $e) {
            return $this->unauthorizedResponse('Token has expired');
        } catch (TokenInvalidException $e) {
            return $this->unauthorizedResponse('Token is invalid');
        } catch (JWTException $e) {
            return $this->errorResponse('Could not refresh token');
        }
    }

    /**
     * Get the current authenticated user
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getCurrentUser()
    {
        try {
            $user = auth()->user();

            if (!$user) {
                return $this->unauthorizedResponse('User not authenticated');
            }

            // Get user permissions
            $permissions = $user->getAllPermissions()->pluck('name');

            // Get temple info from JWT token
            $token = JWTAuth::getToken();
            $payload = JWTAuth::getPayload($token);

            $templeInfo = [
                'id' => $payload->get('temple_id'),
                'code' => $payload->get('temple_code')
            ];

            // Get current organization position if exists
            $currentPosition = null;
            if ($user->hasOrganizationPosition()) {
                $position = $user->getOrganizationPosition();
                if ($position) {
                    $currentPosition = [
                        'id' => $position->id,
                        'name' => $position->name,
                        'display_name' => $position->display_name,
                        'permissions' => $position->permissions
                    ];
                }
            }

            return $this->successResponse([
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'name' => $user->name,
                    'email' => $user->email,
                    'address' => $user->address,
                    'user_type' => $user->user_type,
                    'user_subtype' => $user->user_subtype,
                    'mobile_code' => $user->mobile_code,
                    'mobile_no' => $user->mobile_no,
                    'alternate_mobile' => $user->alternate_mobile,
                    'city' => $user->city,
                    'state' => $user->state,
                    'country' => $user->country,
                    'pincode' => $user->pincode,
                    'date_of_birth' => $user->date_of_birth,
                    'gender' => $user->gender,
                    'is_active' => $user->is_active,
                    'is_verified' => $user->is_verified,
                    'last_login_at' => $user->last_login_at,
                    'permissions' => $permissions,
                    'current_position' => $currentPosition
                ],
                'temple' => $templeInfo
            ], 'User data retrieved successfully');
        } catch (\Tymon\JWTAuth\Exceptions\TokenExpiredException $e) {
            return $this->unauthorizedResponse('Token has expired');
        } catch (\Tymon\JWTAuth\Exceptions\TokenInvalidException $e) {
            return $this->unauthorizedResponse('Token is invalid');
        } catch (\Tymon\JWTAuth\Exceptions\JWTException $e) {
            return $this->unauthorizedResponse('Token not provided');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve user data: ' . $e->getMessage());
        }
    }
    /**
     * Clean up expired tokens (run as scheduled job)
     */
    public function cleanupExpiredTokens()
    {
        try {
            // Delete expired refresh tokens
            $deletedRefreshTokens = RefreshToken::where('expires_at', '<', now())
                ->orWhereNotNull('revoked_at')
                ->delete();

            // Deactivate devices not used in 60 days
            $inactiveDevices = UserDevice::where('last_used_at', '<', now()->subDays(60))
                ->update(['is_active' => false]);

            // Clean old login history (older than 6 months)
            $deletedHistory = UserLoginHistory::where('login_at', '<', now()->subMonths(6))
                ->delete();

            return $this->successResponse([
                'deleted_refresh_tokens' => $deletedRefreshTokens,
                'inactive_devices' => $inactiveDevices,
                'deleted_history' => $deletedHistory
            ], 'Cleanup completed successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Cleanup failed: ' . $e->getMessage());
        }
    }
    /**
     * Validate token and check if still valid
     */
    public function validateToken(Request $request)
    {
        try {
            $user = JWTAuth::parseToken()->authenticate();

            if (!$user) {
                return $this->unauthorizedResponse('Invalid token');
            }

            $payload = JWTAuth::getPayload();
            $expiresAt = Carbon::createFromTimestamp($payload->get('exp'));
            $now = Carbon::now();

            // Check if token is about to expire (within 1 day)
            $aboutToExpire = $expiresAt->diffInHours($now) <= 24;

            return $this->successResponse([
                'valid' => true,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'user_type' => $user->user_type
                ],
                'expires_at' => $expiresAt->toIso8601String(),
                'expires_in_seconds' => $expiresAt->diffInSeconds($now),
                'about_to_expire' => $aboutToExpire,
                'should_refresh' => $aboutToExpire
            ], 'Token is valid');
        } catch (TokenExpiredException $e) {
            return $this->unauthorizedResponse('Token has expired', ['expired' => true]);
        } catch (TokenInvalidException $e) {
            return $this->unauthorizedResponse('Token is invalid');
        } catch (JWTException $e) {
            return $this->unauthorizedResponse('Token not found');
        }
    }
    /**
     * Logout
     */
    public function logout(Request $request)
    {
        try {
            $token = JWTAuth::getToken();

            if (!$token) {
                return $this->successResponse(null, 'Logged out successfully');
            }

            try {
                // Get payload to identify device
                $payload = JWTAuth::getPayload($token);
                $deviceId = $payload->get('device_id');
                $userId = auth()->id();

                // Invalidate the access token first
                JWTAuth::invalidate($token);

                // Only proceed with cleanup if we have user ID
                if ($userId) {
                    // Revoke refresh tokens for this device
                    if ($deviceId) {
                        try {
                            RefreshToken::where('user_id', $userId)
                                ->whereHas('device', function ($q) use ($deviceId) {
                                    $q->where('device_id', $deviceId);
                                })
                                ->update(['revoked_at' => now()]);
                        } catch (\Exception $e) {
                            // Log but don't fail - continue with logout
                            \Log::warning('Failed to revoke refresh tokens during logout', [
                                'user_id' => $userId,
                                'device_id' => $deviceId,
                                'error' => $e->getMessage()
                            ]);
                        }

                        // Update user device status
                        try {
                            UserDevice::where('user_id', $userId)
                                ->where('device_id', $deviceId)
                                ->update(['is_active' => false]);
                        } catch (\Exception $e) {
                            // Log but don't fail
                            \Log::warning('Failed to update device status during logout', [
                                'user_id' => $userId,
                                'device_id' => $deviceId,
                                'error' => $e->getMessage()
                            ]);
                        }
                    }

                    // Log logout
                    try {
                        $loginHistory = UserLoginHistory::where('user_id', $userId)
                            ->whereNull('logout_at')
                            ->latest()
                            ->first();

                        if ($loginHistory) {
                            $loginHistory->update(['logout_at' => now()]);
                        }
                    } catch (\Exception $e) {
                        // Log but don't fail
                        \Log::warning('Failed to update login history during logout', [
                            'user_id' => $userId,
                            'error' => $e->getMessage()
                        ]);
                    }
                }
            } catch (TokenExpiredException $e) {
                // Token already expired, that's fine
                return $this->successResponse(null, 'Logged out successfully');
            } catch (TokenInvalidException $e) {
                // Token is invalid, that's fine
                return $this->successResponse(null, 'Logged out successfully');
            }

            return $this->successResponse(null, 'Logged out successfully');
        } catch (\Exception $e) {
            // Log the error for debugging
            \Log::error('Logout error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Still return success to the user - they want to logout anyway
            return $this->successResponse(null, 'Logged out successfully');
        }
    }
    /**
     * Change user password
     */
    /**
     * Change user password
     */
    public function changePassword(Request $request)
    {
        try {
            // ✅ Temple middleware already set the database connection
            // Just get the user from the current connection
            $user = auth()->user();

            if (!$user) {
                return $this->unauthorizedResponse('User not authenticated');
            }

            // Validate input
            $validator = Validator::make($request->all(), [
                'current_password' => 'required|string',
                'new_password' => [
                    'required',
                    'string',
                    'min:8',
                    'confirmed',
                    'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/'
                ]
            ], [
                'new_password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
                'new_password.confirmed' => 'Password confirmation does not match'
            ]);

            if ($validator->fails()) {
                return $this->validationErrorResponse($validator->errors());
            }

            // ✅ CRITICAL: Re-fetch user from database to ensure we have the latest password hash
            // This is important because auth()->user() might be cached
            $freshUser = User::find($user->id);

            if (!$freshUser) {
                return $this->errorResponse('User not found', 404);
            }

            // Verify current password using the fresh user data
            if (!Hash::check($request->current_password, $freshUser->password)) {
                // Log failed attempt for debugging
                \Log::warning('Password change failed - incorrect current password', [
                    'user_id' => $freshUser->id,
                    'username' => $freshUser->username,
                    'ip' => $request->ip(),
                    'current_db' => config('database.default')
                ]);

                return $this->errorResponse('Current password is incorrect', 400);
            }

            // Check if new password is same as current
            if (Hash::check($request->new_password, $freshUser->password)) {
                return $this->errorResponse('New password must be different from current password', 400);
            }

            // Update password
            $freshUser->update([
                'password' => Hash::make($request->new_password),
                'password_changed_at' => now()
            ]);

            // Log the password change activity
            try {
                UserLoginHistory::create([
                    'user_id' => $freshUser->id,
                    'login_ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'device_info' => $this->getDeviceInfo($request),
                    'login_channel' => 'APP',
                    'status' => 'SUCCESS'
                ]);
            } catch (\Exception $e) {
                \Log::warning('Failed to log password change', [
                    'user_id' => $freshUser->id,
                    'error' => $e->getMessage()
                ]);
            }

            return $this->successResponse([
                'message' => 'Password changed successfully',
                'user' => [
                    'id' => $freshUser->id,
                    'username' => $freshUser->username,
                    'email' => $freshUser->email,
                    'password_changed_at' => $freshUser->password_changed_at
                ]
            ], 'Password changed successfully');
        } catch (\Exception $e) {
            \Log::error('Password change error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->errorResponse('Failed to change password: ' . $e->getMessage());
        }
    }

    public function getProfile()
    {
        try {
            $user = auth()->user();

            // Load member details if applicable
            if ($user->user_type === 'MEMBER') {
                $user->load('memberDetails', 'memberSubscriptions');
            }

            // Load staff details if applicable
            if (in_array($user->user_type, ['ADMIN', 'STAFF', 'MANAGER'])) {
                $user->load('staffDetails');
            }

            return response()->json([
                'success' => true,
                'data' => $user,
                'message' => 'Profile retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve profile: ' . $e->getMessage()
            ], 500);
        }
    }
    /**
     * Update current user's profile
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateProfile(Request $request)
    {
        try {
            $user = auth()->user();

            // Validate request
            $validated = $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'email' => 'sometimes|required|email|unique:users,email,' . $user->id,
                'date_of_birth' => 'nullable|date',
                'gender' => 'nullable|in:MALE,FEMALE,OTHER',
                'mobile_code' => 'nullable|string|max:10',
                'mobile_no' => 'nullable|string|max:20',
                'alternate_mobile' => 'nullable|string|max:20',
                'address' => 'nullable|string|max:500',
                'city' => 'nullable|string|max:100',
                'state' => 'nullable|string|max:100',
                'country' => 'nullable|string|max:100',
                'pincode' => 'nullable|string|max:10',
                'id_proof_type' => 'nullable|string|max:50',
                'id_proof_number' => 'nullable|string|max:100',
            ]);

            // Update user
            $user->update($validated);

            return response()->json([
                'success' => true,
                'data' => $user->fresh(),
                'message' => 'Profile updated successfully'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update profile: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload user avatar/profile photo
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function uploadAvatar(Request $request)
    {
        try {
            $user = auth()->user();

            // Validate file
            $request->validate([
                'profile_photo' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120' // 5MB max
            ]);

            if (!$request->hasFile('profile_photo')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No file uploaded'
                ], 400);
            }

            $file = $request->file('profile_photo');

            // Generate unique filename
            $filename = 'profile_' . $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();

            // Option 1: Store locally (public storage)
            // $path = $file->storeAs('profiles', $filename, 'public');
            // $url = Storage::url($path);

            // Option 2: Store on S3 using your S3UploadService
            $s3Service = app(\App\Services\S3UploadService::class);
            $uploadResult = $s3Service->uploadFile($file, 'profiles/' . $filename);

            if (!$uploadResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to upload file to storage'
                ], 500);
            }

            $url = $uploadResult['url'];

            // Delete old profile photo if exists
            if ($user->profile_photo) {
                // Delete old file from storage
                // Storage::disk('public')->delete($user->profile_photo);
                // Or for S3:
                // $s3Service->deleteFile($user->profile_photo);
            }

            // Update user's profile photo
            $user->update(['profile_photo' => $url]);

            return response()->json([
                'success' => true,
                'data' => [
                    'profile_photo' => $url
                ],
                'message' => 'Profile photo updated successfully'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload avatar: ' . $e->getMessage()
            ], 500);
        }
    }



    public function signup(Request $request)
    {
        try {
            // Temple middleware already set the database connection
            $temple = $request->input('current_temple');

            $validator = Validator::make($request->all(), [
                // Account Information (Step 1)
                'username' => [
                    'required',
                    'string',
                    'min:4',
                    'max:20',
                    'regex:/^[a-zA-Z0-9_]+$/',
                    'unique:users,username'
                ],
                'email' => 'required|email|unique:users,email',
                'password' => [
                    'required',
                    'string',
                    'min:8',
                    'confirmed',
                    'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/'
                ],

                // Personal Information (Step 2)
                'name' => 'required|string|max:255',
                'gender' => 'required|in:MALE,FEMALE,OTHER',
                'date_of_birth' => 'nullable|date|before:today',
                'mobile_code' => 'nullable|string|max:10',
                'mobile_no' => 'required|string|max:20',
                'id_proof_number' => 'nullable|string|max:100',
                'address' => 'nullable|string|max:500',
                'city' => 'nullable|string|max:100',
                'state' => 'nullable|string|max:100',
                'country' => 'nullable|string|max:100',
                'pincode' => 'nullable|string|max:10',

                // Terms acceptance
                'terms_accepted' => 'required|accepted',
                'newsletter_subscription' => 'nullable|boolean'
            ], [
                'username.regex' => 'Username can only contain letters, numbers, and underscores',
                'username.unique' => 'This username is already taken',
                'email.unique' => 'This email is already registered',
                'password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
                'password.confirmed' => 'Password confirmation does not match',
                'terms_accepted.accepted' => 'You must accept the terms and conditions'
            ]);

            if ($validator->fails()) {
                return $this->validationErrorResponse($validator->errors());
            }

            // ✅ ADD THIS: Check for duplicate mobile number
            $mobileCode = $request->mobile_code ?? '+60';
            $existingUser = User::where('mobile_code', $mobileCode)
                ->where('mobile_no', $request->mobile_no)
                ->first();

            if ($existingUser) {
                return $this->validationErrorResponse([
                    'mobile_no' => ['This mobile number is already registered']
                ]);
            }

            DB::beginTransaction();

            try {
                // Create user
                $user = User::create([
                    'username' => $request->username,
                    'email' => $request->email,
                    'password' => Hash::make($request->password),
                    'name' => $request->name,
                    'user_type' => 'MEMBER',
                    'user_subtype' => 'GENERAL',
                    'gender' => $request->gender,
                    'date_of_birth' => $request->date_of_birth,
                    'mobile_code' => $mobileCode,
                    'mobile_no' => $request->mobile_no,
                    'id_proof_number' => $request->id_proof_number,
                    'address' => $request->address,
                    'city' => $request->city,
                    'state' => $request->state,
                    'country' => $request->country ?? 'Malaysia',
                    'pincode' => $request->pincode,
                    'is_active' => false,
                    'is_verified' => false,
                    'verification_token' => Str::random(64),
                    'verification_sent_at' => now(),
                    'newsletter_subscription' => $request->newsletter_subscription ?? false,
                    'terms_accepted_at' => now(),
                    'signup_ip' => $request->ip(),
                    'signup_channel' => 'ONLINE'
                ]);

                // Send verification email
                try {
                    // Mail::to($user->email)->send(new VerificationEmail($user, $temple));
                } catch (\Exception $e) {
                    \Log::warning('Failed to send verification email', [
                        'user_id' => $user->id,
                        'error' => $e->getMessage()
                    ]);
                }

                // Log signup activity
                UserLoginHistory::create([
                    'user_id' => $user->id,
                    'login_ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'device_info' => $this->getDeviceInfo($request),
                    'login_channel' => 'APP',
                    'status' => 'SUCCESS'
                ]);

                DB::commit();

                return $this->successResponse([
                    'user' => [
                        'id' => $user->id,
                        'username' => $user->username,
                        'email' => $user->email,
                        'name' => $user->name,
                        'verification_required' => true
                    ],
                    'message' => 'Registration successful! Please check your email to verify your account.'
                ], 'Registration successful', 201);
            } catch (\Exception $e) {
                DB::rollBack();

                // ✅ IMPROVED: Better error handling for duplicate entries
                if (strpos($e->getMessage(), 'users_mobile_code_mobile_no_key') !== false) {
                    return $this->validationErrorResponse([
                        'mobile_no' => ['This mobile number is already registered']
                    ]);
                }

                if (strpos($e->getMessage(), 'users_username_key') !== false) {
                    return $this->validationErrorResponse([
                        'username' => ['This username is already taken']
                    ]);
                }

                if (strpos($e->getMessage(), 'users_email_key') !== false) {
                    return $this->validationErrorResponse([
                        'email' => ['This email is already registered']
                    ]);
                }

                \Log::error('Signup error', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);

                return $this->errorResponse('Registration failed: ' . $e->getMessage());
            }
        } catch (\Exception $e) {
            return $this->errorResponse('Registration failed: ' . $e->getMessage());
        }
    }


    /**
     * Check mobile number availability
     */
    public function checkMobileNumber(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'mobile_code' => 'nullable|string|max:10',
                'mobile_no' => 'required|string|max:20'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'available' => false,
                    'message' => 'Invalid mobile number format'
                ]);
            }

            $mobileCode = $request->mobile_code ?? '+60';
            $exists = User::where('mobile_code', $mobileCode)
                ->where('mobile_no', $request->mobile_no)
                ->exists();

            return response()->json([
                'success' => true,
                'available' => !$exists,
                'message' => $exists ? 'Mobile number is already registered' : 'Mobile number is available'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'available' => false,
                'message' => 'Error checking mobile number availability'
            ], 500);
        }
    }
    /**
     * Check username availability
     */
    public function checkUsername(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'username' => 'required|string|min:4|max:20'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'available' => false,
                    'message' => 'Invalid username format'
                ]);
            }

            $exists = User::where('username', $request->username)->exists();

            return response()->json([
                'success' => true,
                'available' => !$exists,
                'message' => $exists ? 'Username is already taken' : 'Username is available'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'available' => false,
                'message' => 'Error checking username availability'
            ], 500);
        }
    }

    /**
     * Check email availability
     */
    public function checkEmail(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => 'required|email'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'available' => false,
                    'message' => 'Invalid email format'
                ]);
            }

            $exists = User::where('email', $request->email)->exists();

            return response()->json([
                'success' => true,
                'available' => !$exists,
                'message' => $exists ? 'Email is already registered' : 'Email is available'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'available' => false,
                'message' => 'Error checking email availability'
            ], 500);
        }
    }

    /**
     * Verify email with token
     */
    public function verifyEmail(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'token' => 'required|string'
            ]);

            if ($validator->fails()) {
                return $this->validationErrorResponse($validator->errors());
            }

            $user = User::where('verification_token', $request->token)
                ->where('is_verified', false)
                ->first();

            if (!$user) {
                return $this->errorResponse('Invalid or expired verification token', 400);
            }

            // Check if token is expired (24 hours)
            if ($user->verification_sent_at->addHours(24)->isPast()) {
                return $this->errorResponse('Verification token has expired. Please request a new one.', 400);
            }

            // Update user
            $user->update([
                'is_verified' => true,
                'is_active' => true,
                'email_verified_at' => now(),
                'verification_token' => null
            ]);

            return $this->successResponse([
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'is_verified' => true
                ]
            ], 'Email verified successfully. You can now login.');
        } catch (\Exception $e) {
            return $this->errorResponse('Email verification failed: ' . $e->getMessage());
        }
    }

    /**
     * Resend verification email
     */
    public function resendVerification(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => 'required|email'
            ]);

            if ($validator->fails()) {
                return $this->validationErrorResponse($validator->errors());
            }

            $user = User::where('email', $request->email)
                ->where('is_verified', false)
                ->first();

            if (!$user) {
                return $this->errorResponse('User not found or already verified', 404);
            }

            // Generate new token
            $user->update([
                'verification_token' => Str::random(64),
                'verification_sent_at' => now()
            ]);

            // Send email
            try {
                // Mail::to($user->email)->send(new VerificationEmail($user));
                // Uncomment above when you implement VerificationEmail mail class
            } catch (\Exception $e) {
                \Log::error('Failed to resend verification email', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage()
                ]);
                return $this->errorResponse('Failed to send verification email');
            }

            return $this->successResponse(null, 'Verification email has been resent');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to resend verification email: ' . $e->getMessage());
        }
    }
    /**
 * Send password reset OTP to user's email
 */
public function sendPasswordResetOTP(Request $request)
{
    try {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }


        // Find user by email
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            // Log for debugging
            \Log::info('Password reset requested for non-existent email', [
                'email' => $request->email,
                'ip' => $request->ip()
            ]);
            
            // For security, don't reveal if email exists or not
            return $this->successResponse(null, 'If the email exists, an OTP has been sent to it.');
        }

        // Check if user is active
        if (!$user->is_active) {
            return $this->forbiddenResponse('Account is inactive. Please contact administrator.');
        }

        // Create OTP
        $otpRecord = PasswordResetOtp::createForUser(
            $user,
            $request->ip(),
            $request->userAgent()
        );

        // Send OTP via email
        try {
            Mail::to($user->email)->send(new PasswordResetOtpMail($user, $otpRecord->otp));
            
            // Log successful email send
            \Log::info('Password reset OTP email sent successfully', [
                'user_id' => $user->id,
                'email' => $user->email,
                'otp' => $otpRecord->otp // Remove this in production for security
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to send password reset OTP email', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse('Failed to send OTP email. Please try again later.');
        }

        // Log the activity
        UserLoginHistory::create([
            'user_id' => $user->id,
            'login_ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'device_info' => $this->getDeviceInfo($request),
            'login_channel' => 'APP',
            'status' => 'PASSWORD_RESET_REQUESTED'
        ]);

        return $this->successResponse([
            'email' => $user->email,
            'expires_in_minutes' => 10
        ], 'OTP has been sent to your email. Please check your inbox.');
    } catch (\Exception $e) {
        \Log::error('Send password reset OTP error', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return $this->errorResponse('Failed to send OTP: ' . $e->getMessage());
    }
}

/**
 * Verify password reset OTP
 */
public function verifyPasswordResetOTP(Request $request)
{
    try {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'otp' => 'required|string|size:6'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        // Find the OTP record
        $otpRecord = PasswordResetOtp::findValidOTP($request->email, $request->otp);

        if (!$otpRecord) {
            // Check if there's an OTP that exceeded attempts
            $expiredOtp = PasswordResetOtp::where('email', $request->email)
                ->where('otp', $request->otp)
                ->latest()
                ->first();

            if ($expiredOtp) {
                if ($expiredOtp->maxAttemptsReached()) {
                    return $this->errorResponse('Maximum verification attempts reached. Please request a new OTP.', 429);
                }

                if ($expiredOtp->isExpired()) {
                    return $this->errorResponse('OTP has expired. Please request a new one.', 400);
                }

                if ($expiredOtp->is_verified) {
                    return $this->errorResponse('OTP has already been used.', 400);
                }
            }

            // Invalid OTP - increment attempts if record exists
            if ($expiredOtp) {
                $expiredOtp->incrementAttempts();
                $remainingAttempts = 5 - $expiredOtp->attempts;

                return $this->errorResponse(
                    "Invalid OTP. You have {$remainingAttempts} attempts remaining.",
                    400
                );
            }

            return $this->errorResponse('Invalid OTP.', 400);
        }

        // Increment attempts
        $otpRecord->incrementAttempts();

        // Verify the OTP
        if ($otpRecord->otp !== $request->otp) {
            $remainingAttempts = 5 - $otpRecord->attempts;
            return $this->errorResponse(
                "Invalid OTP. You have {$remainingAttempts} attempts remaining.",
                400
            );
        }

        // Mark OTP as verified
        $otpRecord->markAsVerified();

        // Generate a temporary token for password reset
        $resetToken = Str::random(64);

        // Store reset token temporarily (valid for 10 minutes)
        $otpRecord->update([
            'reset_token' => $resetToken,
            'reset_token_expires_at' => now()->addMinutes(10)
        ]);

        return $this->successResponse([
            'verified' => true,
            'reset_token' => $resetToken,
            'expires_in_minutes' => 10
        ], 'OTP verified successfully. You can now reset your password.');
    } catch (\Exception $e) {
        \Log::error('Verify password reset OTP error', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return $this->errorResponse('Failed to verify OTP: ' . $e->getMessage());
    }
}

/**
 * Reset password using verified OTP
 */
public function resetPasswordWithOTP(Request $request)
{
    try {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'reset_token' => 'required|string',
            'new_password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/'
            ]
        ], [
            'new_password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
            'new_password.confirmed' => 'Password confirmation does not match'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        // Find the verified OTP record with reset token
        $otpRecord = PasswordResetOtp::where('email', $request->email)
            ->where('reset_token', $request->reset_token)
            ->where('is_verified', true)
            ->where('reset_token_expires_at', '>', now())
            ->latest()
            ->first();

        if (!$otpRecord) {
            return $this->errorResponse('Invalid or expired reset token. Please verify OTP again.', 400);
        }

        // Find user
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return $this->errorResponse('User not found.', 404);
        }

        // Check if new password is same as current
        if (Hash::check($request->new_password, $user->password)) {
            return $this->errorResponse('New password must be different from current password.', 400);
        }

        DB::beginTransaction();

        try {
            // Update user password
            $user->update([
                'password' => Hash::make($request->new_password),
                'password_changed_at' => now(),
                'failed_login_attempts' => 0,
                'blocked_until' => null
            ]);

            // Invalidate all refresh tokens for security
            RefreshToken::where('user_id', $user->id)->update([
                'revoked_at' => now()
            ]);

            // Deactivate all devices
            UserDevice::where('user_id', $user->id)->update([
                'is_active' => false
            ]);

            // Delete the OTP record
            $otpRecord->delete();

            // Log the activity
            UserLoginHistory::create([
                'user_id' => $user->id,
                'login_ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'device_info' => $this->getDeviceInfo($request),
                'login_channel' => 'APP',
                'status' => 'PASSWORD_RESET_SUCCESS'
            ]);

            DB::commit();

            // Send confirmation email
            try {
                 Mail::to($user->email)->send(new PasswordResetSuccessMail($user));
            } catch (\Exception $e) {
                \Log::warning('Failed to send password reset confirmation email', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage()
                ]);
            }

            return $this->successResponse([
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'name' => $user->name
                ]
            ], 'Password has been reset successfully. Please login with your new password.');
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    } catch (\Exception $e) {
        \Log::error('Reset password with OTP error', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return $this->errorResponse('Failed to reset password: ' . $e->getMessage());
    }
}

/**
 * Resend password reset OTP
 */
public function resendPasswordResetOTP(Request $request)
{
    try {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        // Find user
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            // For security, don't reveal if email exists or not
            return $this->successResponse(null, 'If the email exists, a new OTP has been sent to it.');
        }

        // Check rate limiting - don't allow resend within 1 minute
        $lastOtp = PasswordResetOtp::where('user_id', $user->id)
            ->where('created_at', '>', now()->subMinute())
            ->latest()
            ->first();

        if ($lastOtp) {
            $waitSeconds = 60 - now()->diffInSeconds($lastOtp->created_at);
            return $this->errorResponse(
                "Please wait {$waitSeconds} seconds before requesting a new OTP.",
                429
            );
        }

        // Create new OTP
        $otpRecord = PasswordResetOtp::createForUser(
            $user,
            $request->ip(),
            $request->userAgent()
        );

        // Send OTP via email
        try {
            Mail::to($user->email)->send(new PasswordResetOtpMail($user, $otpRecord->otp));
        } catch (\Exception $e) {
            \Log::error('Failed to resend password reset OTP email', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse('Failed to send OTP email. Please try again later.');
        }

        return $this->successResponse([
            'email' => $user->email,
            'expires_in_minutes' => 10
        ], 'A new OTP has been sent to your email.');
    } catch (\Exception $e) {
        \Log::error('Resend password reset OTP error', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return $this->errorResponse('Failed to resend OTP: ' . $e->getMessage());
    }
}

}
