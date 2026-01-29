<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\DonationMaster;
use App\Services\S3UploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\User;
use Exception;

class DonationMasterController extends Controller
{
    protected $s3Service;

    public function __construct(S3UploadService $s3Service)
    {
        $this->s3Service = $s3Service;
    }

    /**
     * Get all donation masters
     */
    public function index(Request $request)
    {
        try {
            $query = DonationMaster::with(['ledger', 'group'])
                ->whereNull('deleted_at');

            // Filter by group_id if provided
            if ($request->filled('group_id')) {
                $query->where('group_id', $request->group_id);
            }

            // Filter by ledger_id if provided
            if ($request->filled('ledger_id')) {
                $query->where('ledger_id', $request->ledger_id);
            }

            // Filter by status if provided
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Search by name, secondary_name or ledger name if provided
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                        ->orWhere('secondary_name', 'LIKE', "%{$search}%")
                        ->orWhereHas('ledger', function ($q) use ($search) {
                            $q->where('name', 'LIKE', "%{$search}%");
                        })
                        ->orWhereHas('group', function ($q) use ($search) {
                            $q->where('name', 'LIKE', "%{$search}%");
                        });
                });
            }

            // Pagination
            $perPage = $request->get('per_page', 20);
            $donations = $query->orderBy('name')->paginate($perPage);

            // Generate signed URLs for images
            $donations->getCollection()->transform(function ($donation) {
                if ($donation->image_url) {
                    $donation->image_url = $this->s3Service->getSignedUrl($donation->image_url);
                }
                return $donation;
            });

            $user = Auth::user();
            $permissions = $this->assignPermissions($user);

            return response()->json([
                'success' => true,
                'data' => $donations,
                'permissions' => $permissions
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching donation masters: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch donation masters',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single donation master
     */
    public function show($id)
    {
        $user = Auth::user();
        $permissions = $this->assignPermissions($user);

        try {
            $donation = DonationMaster::with(['ledger', 'group'])
                ->whereNull('deleted_at')
                ->find($id);

            if (!$donation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Donation master not found'
                ], 404);
            }

            // Generate signed URL for image
            if ($donation->image_url) {
                $donation->image_url = $this->s3Service->getSignedUrl($donation->image_url);
            }

            return response()->json([
                'success' => true,
                'data' => $donation,
                'permissions' => $permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch donation master',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new donation master
     */
    public function store(Request $request)
    {
        if (!Auth::user()->hasRole(['super_admin', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to create donation masters'
            ], 403);
        }

        try {
            // Validate request - FIXED: group_id should be integer, not uuid
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:300',
                'secondary_name' => 'nullable|string|max:300',
                'group_id' => 'required|integer|exists:donation_groups,id',
                'ledger_id' => 'required|integer|exists:ledgers,id',
                'details' => 'nullable|string',
                'status' => 'integer|in:0,1',
                'image' => 'nullable|file|image|mimes:jpeg,jpg,png,gif,webp|max:2048'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check if donation with same primary name exists
            $exists = DonationMaster::where('name', $request->name)
                ->whereNull('deleted_at')
                ->exists();

            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Donation with this primary name already exists'
                ], 422);
            }

            DB::beginTransaction();

            $donation = new DonationMaster();
            $donation->name = $request->name;
            $donation->secondary_name = $request->secondary_name;
            $donation->group_id = $request->group_id;
            $donation->ledger_id = $request->ledger_id;
            $donation->details = $request->details;
            $donation->status = $request->get('status', 1);
            $donation->created_by = Auth::id();

            // Handle image upload
            if ($request->hasFile('image')) {
                $file = $request->file('image');
                
                // Validate file
                $validation = $this->s3Service->validateFile($file);
                if (!$validation['valid']) {
                    throw new Exception($validation['message']);
                }

                // Upload to S3
                $templeId = $request->header('X-Temple-ID');
                $result = $this->s3Service->uploadSignature(
                    $file,
                    $donation->id ?? uniqid('donation_'),
                    $templeId
                );

                if (!$result['success']) {
                    throw new Exception($result['message']);
                }

                $donation->image_url = $result['path'];
            }

            $donation->save();

            DB::commit();

            // Load relationships and generate signed URL
            $donation->load(['ledger', 'group']);
            if ($donation->image_url) {
                $donation->image_url = $this->s3Service->getSignedUrl($donation->image_url);
            }

            return response()->json([
                'success' => true,
                'message' => 'Donation master created successfully',
                'data' => $donation
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error creating donation master: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create donation master',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update donation master
     */
    public function update(Request $request, $id)
    {
        if (!Auth::user()->hasRole(['super_admin', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to edit donation masters'
            ], 403);
        }

        try {
            $donation = DonationMaster::whereNull('deleted_at')->find($id);

            if (!$donation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Donation master not found'
                ], 404);
            }

            // Validate request - FIXED: group_id should be integer, not uuid
            $validator = Validator::make($request->all(), [
                'name' => 'string|max:300',
                'secondary_name' => 'nullable|string|max:300',
                'group_id' => 'integer|exists:donation_groups,id',
                'ledger_id' => 'integer|exists:ledgers,id',
                'details' => 'nullable|string',
                'status' => 'integer|in:0,1',
                'image' => 'nullable|file|image|mimes:jpeg,jpg,png,gif,webp|max:2048'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check if donation with same name exists (excluding current)
            if ($request->has('name')) {
                $exists = DonationMaster::where('name', $request->name)
                    ->where('id', '!=', $id)
                    ->whereNull('deleted_at')
                    ->exists();

                if ($exists) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Donation with this primary name already exists'
                    ], 422);
                }
            }

            DB::beginTransaction();

            if ($request->has('name')) $donation->name = $request->name;
            if ($request->has('secondary_name')) $donation->secondary_name = $request->secondary_name;
            if ($request->has('group_id')) $donation->group_id = $request->group_id;
            if ($request->has('ledger_id')) $donation->ledger_id = $request->ledger_id;
            if ($request->has('details')) $donation->details = $request->details;
            if ($request->has('status')) $donation->status = $request->status;
            $donation->updated_by = Auth::id();

            // Handle image upload
            if ($request->hasFile('image')) {
                // Delete old image from S3 if exists
                if ($donation->image_url) {
                    $this->s3Service->deleteDonationImage($donation->image_url);
                }

                $file = $request->file('image');
                
                // Validate file
                $validation = $this->s3Service->validateFile($file);
                if (!$validation['valid']) {
                    throw new Exception($validation['message']);
                }

                // Upload new image to S3
                $templeId = $request->header('X-Temple-ID');
                $result = $this->s3Service->uploadSignature(
                    $file,
                    $donation->id,
                    $templeId
                );

                if (!$result['success']) {
                    throw new Exception($result['message']);
                }

                $donation->image_url = $result['path'];
            }

            $donation->save();

            DB::commit();

            // Load relationships and generate signed URL
            $donation->load(['ledger', 'group']);
            if ($donation->image_url) {
                $donation->image_url = $this->s3Service->getSignedUrl($donation->image_url);
            }

            return response()->json([
                'success' => true,
                'message' => 'Donation master updated successfully',
                'data' => $donation
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error updating donation master: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update donation master',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete donation master (soft delete)
     */
    public function destroy($id)
    {
        if (!Auth::user()->hasRole(['super_admin', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to delete donation masters'
            ], 403);
        }

        try {
            $donation = DonationMaster::whereNull('deleted_at')->find($id);

            if (!$donation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Donation master not found'
                ], 404);
            }

            DB::beginTransaction();

            // Delete image from S3 if exists
            if ($donation->image_url) {
                $this->s3Service->deleteDonationImage($donation->image_url);
            }

            $donation->deleted_at = now();
            $donation->deleted_by = Auth::id();
            $donation->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Donation master deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error deleting donation master: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete donation master',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get active donations for dropdown
     */
    public function getActiveDonations(Request $request)
    {
        try {
            $query = DonationMaster::with(['ledger', 'group'])
                ->where('status', 1)
                ->whereNull('deleted_at');

            // Filter by group if provided
            if ($request->has('group_id')) {
                $query->where('group_id', $request->group_id);
            }

            $donations = $query->orderBy('name')
                ->get(['id', 'name', 'secondary_name', 'group_id', 'details', 'image_url']);

            // Generate signed URLs for images
            $donations->transform(function ($donation) {
                if ($donation->image_url) {
                    $donation->image_url = $this->s3Service->getSignedUrl($donation->image_url);
                }
                return $donation;
            });

            return response()->json([
                'success' => true,
                'data' => $donations
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active donations',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get permissions for a specific user
     */
    public function getUserPermissions($userId)
    {
        $user = User::find($userId);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found'
            ], 404);
        }

        $permissions = $this->assignPermissions($user);

        return response()->json([
            'success' => true,
            'data' => $permissions
        ]);
    }

    /**
     * Assign permissions based on user role
     */
    private function assignPermissions(User $user)
    {
        $hasAdminRole = $user->hasRole(['super_admin', 'admin']);

        $permissions = [
            'can_create_donation_masters' => $hasAdminRole,
            'can_edit_donation_masters' => $hasAdminRole,
            'can_delete_donation_masters' => $hasAdminRole,
            'can_view_donation_masters' => true,
        ];

        return $permissions;
    }

    public function getDonationLedgers()
    {
        try {
            $ledgers = DB::table('ledgers')
                ->whereNull('deleted_at')
                ->where('left_code', '>=', '8001')
                ->where('left_code', '<=', '8999')
                ->orderBy('left_code')
                ->select('id', 'name', 'left_code')
                ->get();

            \Log::info('Donation Ledgers:', [
                'count' => $ledgers->count(),
                'sample' => $ledgers->first()
            ]);

            return response()->json([
                'success' => true,
                'data' => $ledgers,
                'count' => $ledgers->count()
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching donation ledgers: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch donation ledgers',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}