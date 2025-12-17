<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\PaymentMode;
use App\Models\Module;
use App\Models\Role;
use App\Services\S3UploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use App\Models\User;

class PaymentModeController extends Controller
{
    protected $s3UploadService;

    public function __construct(S3UploadService $s3UploadService)
    {
        $this->s3UploadService = $s3UploadService;
    }

    /**
     * Get all payment modes with role and module information
     */
    public function index(Request $request)
    {
        try {
            $query = PaymentMode::with(['roles:id,name,display_name', 'modules:id,name,display_name'])
                ->leftJoin('ledgers', 'payment_modes.ledger_id', '=', 'ledgers.id')
                ->select(
                    'payment_modes.*',
                    DB::raw("CASE 
                    WHEN ledgers.id IS NULL THEN ''
                    ELSE CONCAT(ledgers.left_code, '/', ledgers.right_code, ' ', ledgers.name)
                END as ledger_name")
                );

            if ($request->filled('status')) {
                $query->where('payment_modes.status', $request->status);
            }

            if ($request->filled('is_payment_gateway')) {
                $query->where('payment_modes.is_payment_gateway', $request->is_payment_gateway);
            }

            if ($request->filled('is_live')) {
                $query->where('payment_modes.is_live', $request->is_live);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where('payment_modes.name', 'LIKE', "%{$search}%");
            }

            $perPage = $request->get('per_page', 20);
            $paymentModes = $query->orderBy('payment_modes.name')->paginate($perPage);

            $paymentModes->getCollection()->transform(function ($mode) {
                // Map roles & modules
                $mode->assigned_roles = $mode->roles->map(fn($role) => [
                    'id' => $role->id,
                    'name' => $role->name,
                    'display_name' => $role->display_name
                ]);

                $mode->assigned_modules = $mode->modules->map(fn($module) => [
                    'id' => $module->id,
                    'name' => $module->name,
                    'display_name' => $module->display_name
                ]);
                try {
                    if ($mode->icon_type === 'bootstrap' && $mode->icon_value) {
                        $mode->icon_display_url_data = [
                            'type' => 'bootstrap',
                            'value' => $mode->icon_value
                        ];
                    } elseif ($mode->icon_type === 'upload' && $mode->icon_path) {
                        $iconPath = $mode->icon_path;

                        if (is_string($iconPath)) {
                            $photoData = json_decode($iconPath, true);
                            if (json_last_error() === JSON_ERROR_NONE) {
                                $iconPath = $photoData['url'] ?? $photoData['path'] ?? $iconPath;
                            }
                        }

                        $signedUrl = $this->s3UploadService->getSignedUrl($iconPath);

                        $mode->icon_display_url_data = [
                            'type' => 'upload',
                            'value' => $signedUrl
                        ];
                    } else {
                        $mode->icon_display_url_data = [
                            'type' => 'bootstrap',
                            'value' => 'bi-currency-dollar'
                        ];
                    }
                } catch (\Exception $e) {
                    Log::error('Failed to generate Payment Mode icon', [
                        'payment_mode_id' => $mode->id,
                        'icon_path' => $mode->icon_path,
                        'error' => $e->getMessage()
                    ]);

                    $mode->icon_display_url_data = [
                        'type' => 'bootstrap',
                        'value' => 'bi-currency-dollar'
                    ];
                }

                // Optional: remove raw relations to reduce payload
                unset($mode->roles, $mode->modules);

                return $mode;
            });
            $user = Auth::user();
            $permissions = $this->assignPermissions($user);
            return response()->json([
                'success' => true,
                'data' => $paymentModes,
                'permissions' => $permissions,
                'message' => 'Payment modes retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment modes',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    /**
     * Get single payment mode with decrypted fields for editing
     */
    public function show($id)
    {
      	$user = Auth::user();
		$permissions = $this->assignPermissions($user);
        try {
            $paymentMode = PaymentMode::with(['roles:id,name,display_name', 'modules:id,name,display_name'])->find($id);

            if (!$paymentMode) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment mode not found'
                ], 404);
            }

            $response = $paymentMode->toArray();
            $response['role_ids'] = $paymentMode->roles->pluck('id')->toArray();
            $response['module_ids'] = $paymentMode->modules->pluck('id')->toArray();
            $response['icon_display_url'] = $this->getIconDisplayUrl($paymentMode);


            if (Auth::user()->hasRole('super_admin') && $paymentMode->is_payment_gateway) {
                $response['merchant_key'] = $paymentMode->merchant_key;
                $response['password'] = $paymentMode->password;
            }

            return response()->json([
                'success' => true,
                'data' => $response,
                'permissions'=>$permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment mode',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new payment mode with role and module assignments
     */
    public function store(Request $request)
    {
        if (!Auth::user()->can('payment_modes.create')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to create payment modes'
            ], 403);
        }
        try {
            $rules = [
                'name' => 'required|string|max:100|unique:payment_modes,name',
                'ledger_id' => 'nullable|exists:ledgers,id',
                'description' => 'nullable|string|max:500',
                'status' => 'integer|in:0,1',
                'is_payment_gateway' => 'boolean',
                'is_live' => 'boolean',
                'role_ids' => 'required|array|min:1',
                'role_ids.*' => 'exists:roles,id',
                'module_ids' => 'required|array|min:1',
                'module_ids.*' => 'exists:modules,id',
                'icon_type' => 'required|in:bootstrap,upload',
                'icon_bootstrap' => 'required_if:icon_type,bootstrap|string|max:100',
                'icon' => 'required_if:icon_type,upload|file|mimes:png,jpg,jpeg,svg|max:2048'
            ];

            if ($request->is_payment_gateway) {
                $rules['merchant_code'] = 'nullable|string|max:255';
                $rules['merchant_key'] = 'nullable|string|max:255';
                $rules['password'] = 'nullable|string|max:255';
                $rules['url'] = 'nullable|url|max:255';
            }

            $validator = Validator::make($request->all(), $rules);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $paymentMode = new PaymentMode();
            $paymentMode->name = $request->name;
            $paymentMode->ledger_id = $request->ledger_id;
            $paymentMode->description = $request->description;
            $paymentMode->status = $request->get('status', 1);
            $paymentMode->is_payment_gateway = $request->get('is_payment_gateway', false);
            $paymentMode->is_live = $request->get('is_live', false);

            if ($request->is_payment_gateway) {
                $paymentMode->merchant_code = $request->merchant_code;
                $paymentMode->merchant_key = $request->merchant_key;
                $paymentMode->password = $request->password;
                $paymentMode->url = $request->url;
            }

            // Handle icon
            if ($request->icon_type === 'bootstrap') {
                $paymentMode->icon_type = 'bootstrap';
                $paymentMode->icon_value = $request->icon_bootstrap;
            } elseif ($request->icon_type === 'upload' && $request->hasFile('icon')) {
                $uploadResult = $this->s3UploadService->uploadFile(
                    $request->file('icon'),
                    'payment-modes',
                    'payment_icons'
                );

                if (!$uploadResult['success']) {
                    throw new \Exception('Failed to upload icon: ' . $uploadResult['message']);
                }

                $paymentMode->icon_type = 'upload';
                $paymentMode->icon_path = $uploadResult['path'];
                $paymentMode->icon_url = $uploadResult['url'];
            }

            $paymentMode->created_by = Auth::id();
            $paymentMode->save();

            $paymentMode->roles()->attach($request->role_ids);
            $paymentMode->modules()->attach($request->module_ids);

            DB::commit();

            $paymentMode->load('roles:id,name,display_name', 'modules:id,name,display_name');

            return response()->json([
                'success' => true,
                'message' => 'Payment mode created successfully',
                'data' => $paymentMode
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create payment mode',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update payment mode
     */
    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('payment_modes.edit')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to edit payment modes'
            ], 403);
        }
        try {
            $paymentMode = PaymentMode::find($id);

            if (!$paymentMode) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment mode not found'
                ], 404);
            }

            $rules = [
                'name' => 'string|max:100|unique:payment_modes,name,' . $id,
                'ledger_id' => 'nullable|exists:ledgers,id',
                'description' => 'nullable|string|max:500',
                'status' => 'integer|in:0,1',
                'is_payment_gateway' => 'boolean',
                'is_live' => 'boolean',
                'role_ids' => 'array|min:1',
                'role_ids.*' => 'exists:roles,id',
                'module_ids' => 'array|min:1',
                'module_ids.*' => 'exists:modules,id',
                'icon_type' => 'in:bootstrap,upload',
                'icon_bootstrap' => 'required_if:icon_type,bootstrap|string|max:100',
                'icon' => 'required_if:icon_type,upload|file|mimes:png,jpg,jpeg,svg|max:2048',
                'remove_icon' => 'boolean'
            ];

            if ($request->get('is_payment_gateway', $paymentMode->is_payment_gateway)) {
                $rules['merchant_code'] = 'nullable|string|max:255';
                $rules['merchant_key'] = 'nullable|string|max:255';
                $rules['password'] = 'nullable|string|max:255';
                $rules['url'] = 'nullable|url|max:255';
            }

            $validator = Validator::make($request->all(), $rules);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            if ($request->has('name')) $paymentMode->name = $request->name;
            if ($request->has('ledger_id')) $paymentMode->ledger_id = $request->ledger_id;
            if ($request->has('description')) $paymentMode->description = $request->description;
            if ($request->has('status')) $paymentMode->status = $request->status;

            if ($request->has('is_payment_gateway')) {
                $paymentMode->is_payment_gateway = $request->is_payment_gateway;
                if (!$request->is_payment_gateway) {
                    $paymentMode->merchant_code = null;
                    $paymentMode->merchant_key = null;
                    $paymentMode->password = null;
                    $paymentMode->url = null;
                }
            }

            if ($request->has('is_live')) $paymentMode->is_live = $request->is_live;

            if ($paymentMode->is_payment_gateway) {
                if ($request->has('merchant_code')) $paymentMode->merchant_code = $request->merchant_code;
                if ($request->has('merchant_key')) $paymentMode->merchant_key = $request->merchant_key;
                if ($request->has('password')) $paymentMode->password = $request->password;
                if ($request->has('url')) $paymentMode->url = $request->url;
            }

            // Handle icon updates
            if ($request->has('remove_icon') && $request->remove_icon) {
                // Remove uploaded icon if exists
                if ($paymentMode->icon_type === 'upload' && $paymentMode->icon_path) {
                    $this->s3UploadService->deleteSignature($paymentMode->icon_path);
                }
                $paymentMode->icon_type = null;
                $paymentMode->icon_value = null;
                $paymentMode->icon_path = null;
                $paymentMode->icon_url = null;
            } elseif ($request->has('icon_type')) {
                if ($request->icon_type === 'bootstrap') {
                    // Remove old uploaded icon if switching to bootstrap
                    if ($paymentMode->icon_type === 'upload' && $paymentMode->icon_path) {
                        $this->s3UploadService->deleteSignature($paymentMode->icon_path);
                    }
                    $paymentMode->icon_type = 'bootstrap';
                    $paymentMode->icon_value = $request->icon_bootstrap;
                    $paymentMode->icon_path = null;
                    $paymentMode->icon_url = null;
                } elseif ($request->icon_type === 'upload' && $request->hasFile('icon')) {
                    // Remove old uploaded icon
                    if ($paymentMode->icon_type === 'upload' && $paymentMode->icon_path) {
                        $this->s3UploadService->deleteSignature($paymentMode->icon_path);
                    }

                    $uploadResult = $this->s3UploadService->uploadFile(
                        $request->file('icon'),
                        'payment-modes',
                        'payment_icons'
                    );

                    if (!$uploadResult['success']) {
                        throw new \Exception('Failed to upload icon: ' . $uploadResult['message']);
                    }

                    $paymentMode->icon_type = 'upload';
                    $paymentMode->icon_value = null;
                    $paymentMode->icon_path = $uploadResult['path'];
                    $paymentMode->icon_url = $uploadResult['url'];
                }
            }

            $paymentMode->save();

            if ($request->has('role_ids')) {
                $paymentMode->roles()->sync($request->role_ids);
            }
            if ($request->has('module_ids')) {
                $paymentMode->modules()->sync($request->module_ids);
            }

            DB::commit();

            $paymentMode->load('roles:id,name,display_name', 'modules:id,name,display_name');

            return response()->json([
                'success' => true,
                'message' => 'Payment mode updated successfully',
                'data' => $paymentMode
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update payment mode',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete payment mode
     */
    public function destroy($id)
    {
        		if (!Auth::user()->can('payment_modes.delete')) {
			return response()->json([
				'success' => false,
				'message' => 'You do not have permission to delete payment modes'
			], 403);
		}
        try {
            $paymentMode = PaymentMode::find($id);

            if (!$paymentMode) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment mode not found'
                ], 404);
            }

            $inUse = DB::table('purchase_payments')
                ->where('payment_mode_id', $id)
                ->exists();

            if ($inUse) {
                $paymentMode->status = 0;
                $paymentMode->save();

                return response()->json([
                    'success' => true,
                    'message' => 'Payment mode deactivated as it is being used in transactions'
                ]);
            }

            DB::beginTransaction();

            // Delete uploaded icon if exists
            if ($paymentMode->icon_type === 'upload' && $paymentMode->icon_path) {
                $this->s3UploadService->deleteSignature($paymentMode->icon_path);
            }

            $paymentMode->roles()->detach();
            $paymentMode->modules()->detach();
            $paymentMode->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Payment mode deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete payment mode',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get active payment modes for current user's role and specific module
     */
public function getActivePaymentModes(Request $request)
{
    try {
        $user = Auth::user();
        $moduleId = $request->get('module_id');

        $userRoleIds = $user->roles->pluck('id')->toArray();
        $query = PaymentMode::where('status', 1);

        if ($moduleId) {
            $query->whereHas('modules', function ($q) use ($moduleId) {
                $q->where('modules.id', $moduleId);
            });
        }

        if ($user->hasRole('super_admin')) {
            $paymentModes = $query->orderBy('name')
                ->get(['id', 'name', 'description', 'is_payment_gateway', 'is_live', 'icon_type', 'icon_value', 'icon_path', 'icon_url']);
        } else {
            $paymentModes = $query->whereHas('roles', function ($q) use ($userRoleIds) {
                $q->whereIn('roles.id', $userRoleIds);
            })
                ->orderBy('name')
                ->get(['id', 'name', 'description', 'is_payment_gateway', 'is_live', 'icon_type', 'icon_value', 'icon_path', 'icon_url']);
        }
        
        // Add icon display URLs - FIX: Remove getCollection()
        $paymentModes->transform(function ($mode) {
            // Map roles & modules
            $mode->assigned_roles = $mode->roles->map(fn($role) => [
                'id' => $role->id,
                'name' => $role->name,
                'display_name' => $role->display_name
            ]);

            $mode->assigned_modules = $mode->modules->map(fn($module) => [
                'id' => $module->id,
                'name' => $module->name,
                'display_name' => $module->display_name
            ]);
            
            try {
                if ($mode->icon_type === 'bootstrap' && $mode->icon_value) {
                    $mode->icon_display_url_data = [
                        'type' => 'bootstrap',
                        'value' => $mode->icon_value
                    ];
                } elseif ($mode->icon_type === 'upload' && $mode->icon_path) {
                    $iconPath = $mode->icon_path;

                    // Handle JSON encoded path
                    if (is_string($iconPath)) {
                        $photoData = json_decode($iconPath, true);
                        if (json_last_error() === JSON_ERROR_NONE && isset($photoData['path'])) {
                            $iconPath = $photoData['path'];
                        } elseif (json_last_error() === JSON_ERROR_NONE && isset($photoData['url'])) {
                            $iconPath = $photoData['url'];
                        }
                    }

                    // Generate signed URL for S3
                    $signedUrl = $this->s3UploadService->getSignedUrl($iconPath);

                    $mode->icon_display_url_data = [
                        'type' => 'upload',
                        'value' => $signedUrl
                    ];
                } else {
                    // Default fallback icon
                    $mode->icon_display_url_data = [
                        'type' => 'bootstrap',
                        'value' => 'bi-currency-dollar'
                    ];
                }
            } catch (\Exception $e) {
                Log::error('Failed to generate Payment Mode icon', [
                    'payment_mode_id' => $mode->id,
                    'icon_path' => $mode->icon_path ?? null,
                    'error' => $e->getMessage()
                ]);

                // Fallback to default icon on error
                $mode->icon_display_url_data = [
                    'type' => 'bootstrap',
                    'value' => 'bi-currency-dollar'
                ];
            }

            // Remove raw relations to reduce payload
            unset($mode->roles, $mode->modules, $mode->icon_path, $mode->icon_url);

            return $mode;
        });

        return response()->json([
            'success' => true,
            'data' => $paymentModes
        ]);
    } catch (\Exception $e) {
        Log::error('Failed to fetch active payment modes', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch active payment modes',
            'error' => $e->getMessage()
        ], 500);
    }
}
    /**
     * Get available Bootstrap icons for payment modes
     */
    public function getAvailableIcons()
    {
        $icons = [
            ['value' => 'bi-cash-coin', 'label' => 'Cash', 'category' => 'basic'],
            ['value' => 'bi-cash-stack', 'label' => 'Cash Stack', 'category' => 'basic'],
            ['value' => 'bi-credit-card', 'label' => 'Credit Card', 'category' => 'card'],
            ['value' => 'bi-credit-card-2-front', 'label' => 'Card Front', 'category' => 'card'],
            ['value' => 'bi-credit-card-2-back', 'label' => 'Card Back', 'category' => 'card'],
            ['value' => 'bi-credit-card-fill', 'label' => 'Card Filled', 'category' => 'card'],
            ['value' => 'bi-bank', 'label' => 'Bank', 'category' => 'bank'],
            ['value' => 'bi-bank2', 'label' => 'Bank Alt', 'category' => 'bank'],
            ['value' => 'bi-building', 'label' => 'Building', 'category' => 'bank'],
            ['value' => 'bi-wallet2', 'label' => 'Wallet', 'category' => 'digital'],
            ['value' => 'bi-wallet-fill', 'label' => 'Wallet Filled', 'category' => 'digital'],
            ['value' => 'bi-phone', 'label' => 'Mobile Payment', 'category' => 'digital'],
            ['value' => 'bi-phone-fill', 'label' => 'Mobile Filled', 'category' => 'digital'],
            ['value' => 'bi-qr-code', 'label' => 'QR Code', 'category' => 'digital'],
            ['value' => 'bi-qr-code-scan', 'label' => 'QR Scan', 'category' => 'digital'],
            ['value' => 'bi-globe', 'label' => 'Online Payment', 'category' => 'online'],
            ['value' => 'bi-globe2', 'label' => 'Globe Alt', 'category' => 'online'],
            ['value' => 'bi-wifi', 'label' => 'Digital', 'category' => 'online'],
            ['value' => 'bi-file-earmark-text', 'label' => 'Cheque', 'category' => 'traditional'],
            ['value' => 'bi-file-earmark-check', 'label' => 'Document Check', 'category' => 'traditional'],
            ['value' => 'bi-currency-dollar', 'label' => 'Dollar', 'category' => 'currency'],
            ['value' => 'bi-currency-euro', 'label' => 'Euro', 'category' => 'currency'],
            ['value' => 'bi-currency-pound', 'label' => 'Pound', 'category' => 'currency'],
            ['value' => 'bi-currency-rupee', 'label' => 'Rupee', 'category' => 'currency'],
            ['value' => 'bi-currency-yen', 'label' => 'Yen', 'category' => 'currency'],
            ['value' => 'bi-currency-bitcoin', 'label' => 'Bitcoin', 'category' => 'crypto'],
            ['value' => 'bi-arrow-left-right', 'label' => 'Transfer', 'category' => 'transfer'],
            ['value' => 'bi-arrow-down-up', 'label' => 'Transaction', 'category' => 'transfer'],
            ['value' => 'bi-piggy-bank', 'label' => 'Savings', 'category' => 'other'],
            ['value' => 'bi-piggy-bank-fill', 'label' => 'Savings Filled', 'category' => 'other'],
        ];

        return response()->json([
            'success' => true,
            'data' => $icons
        ]);
    }

    /**
     * Get all roles for assignment (helper endpoint)
     */
    public function getRoles()
    {
        try {
            $roles = Role::orderBy('display_name')
                ->get(['id', 'name', 'display_name']);

            return response()->json([
                'success' => true,
                'data' => $roles
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch roles',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all modules for assignment (helper endpoint)
     */
    public function getModules()
    {
        try {
            $modules = Module::where('status', 1)
                ->orderBy('id')
                ->get(['id', 'name', 'display_name']);

            return response()->json([
                'success' => true,
                'data' => $modules
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch modules',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    private function getIconDisplayUrl($paymentMode)
    {
        try {
            if ($paymentMode->icon_type === 'bootstrap' && $paymentMode->icon_value) {
                return [
                    'type' => 'bootstrap',
                    'value' => $paymentMode->icon_value
                ];
            } elseif ($paymentMode->icon_type === 'upload' && $paymentMode->icon_path) {
                $iconPath = $paymentMode->icon_path;

                if (is_string($iconPath)) {
                    $photoData = json_decode($iconPath, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $iconPath = $photoData['url'] ?? $photoData['path'] ?? $iconPath;
                    }
                }

                $signedUrl = $this->s3UploadService->getSignedUrl($iconPath);

                Log::info('Payment Mode icon processed', [
                    'payment_mode_id' => $paymentMode->id,
                    'signed_url' => $signedUrl,
                ]);

                return [
                    'type' => 'upload',
                    'value' => $signedUrl
                ];
            } else {
                return [
                    'type' => 'bootstrap',
                    'value' => 'bi-currency-dollar'
                ];
            }
        } catch (\Exception $e) {
            Log::error('Failed to generate Payment Mode icon', [
                'payment_mode_id' => $paymentMode->id,
                'icon_path' => $paymentMode->icon_path,
                'error' => $e->getMessage()
            ]);

            return [
                'type' => 'bootstrap',
                'value' => 'bi-currency-dollar'
            ];
        }
    }

    /**
     * Helper function to check if a string is valid JSON
     */
    private function isJson($string)
    {
        if (!is_string($string)) {
            return false;
        }

        json_decode($string);
        return json_last_error() === JSON_ERROR_NONE;
    }
    /**
     * Get permissions for a specific user by their ID.
     *
     * @param  int  $userId
     * @return \Illuminate\Http\Response
     */
    public function getUserPermissions($userId)
    {

        $user = User::find($userId);


        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found'], 404);
        }


        $permissions = $this->assignPermissions($user);


        return response()->json([
            'success' => true,
            'data' => $permissions
        ]);
    }

    /**
     * Assign permissions based on user role.
     *
     * @param  User  $user
     * @return array
     */
    private function assignPermissions(User $user)
    {

        $user = Auth::user();
        $permissions = [
            'can_create_payment_modes' => $user->can('payment_modes.create'),
            'can_edit_payment_modes' => $user->can('payment_modes.edit'),
            'can_delete_payment_modes' => $user->can('payment_modes.delete'),
            'can_view_payment_modes' => $user->can('payment_modes.view'),
        ];
        return $permissions;
    }
}
