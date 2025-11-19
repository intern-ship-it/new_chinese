<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\RefreshToken;
use App\Models\UserLoginHistory;
use App\Models\SystemSetting;
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
            'request_through' => 'required|in:COUNTER,ADMIN,ONLINE,APP,KIOSK',
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
            'channel' => $request->request_through,
            'session_extended' => $request->get('remember_me', false)
        ];

        // Generate tokens with custom TTL
        if ($customTTL) {
            JWTAuth::factory()->setTTL($customTTL);
        }

        $accessToken = JWTAuth::claims($customClaims)->fromUser($user);

        // Create refresh token with extended expiry (60 days)
        $refreshToken = $this->createRefreshToken($user, $request->get('remember_me', false));

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
            'device_info' => $this->getDeviceInfo($request),
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

    /**
     * Create refresh token with extended expiry
     */
    private function createRefreshToken($user, $extended = false)
    {
        $tokenId = Str::random(64);

        // Extended session: 60 days, Normal: 7 days
        $expiresAt = $extended
            ? now()->addDays(60)
            : now()->addDays(7);

        return RefreshToken::create([
            'user_id' => $user->id,
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
                'channel' => $payload->get('channel'),
                'session_extended' => $sessionExtended
            ];

            $newToken = JWTAuth::claims($customClaims)->fromUser($user);

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
                    'user_type' => $user->user_type,
                    'user_subtype' => $user->user_subtype,
                    'mobile_no' => $user->mobile_no,
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

            // Clean old login history (older than 6 months)
            $deletedHistory = UserLoginHistory::where('login_at', '<', now()->subMonths(6))
                ->delete();

            return $this->successResponse([
                'deleted_refresh_tokens' => $deletedRefreshTokens,
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

            if ($token) {
                $userId = auth()->id();

                // Invalidate the access token
                JWTAuth::invalidate($token);

                // Revoke all refresh tokens for this user
                RefreshToken::where('user_id', $userId)
                    ->whereNull('revoked_at')
                    ->update(['revoked_at' => now()]);

                // Log logout
                UserLoginHistory::where('user_id', $userId)
                    ->whereNull('logout_at')
                    ->latest()
                    ->first()
                    ?->update(['logout_at' => now()]);
            }

            return $this->successResponse(null, 'Logged out successfully');
        } catch (JWTException $e) {
            return $this->errorResponse('Failed to logout');
        }
    }
}