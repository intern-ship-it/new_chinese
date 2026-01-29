<?php

namespace App\Http\Controllers;

use App\Models\Devotee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Exception;

class DevoteeController extends Controller
{
    /**
     * Display a listing of devotees
     */
    public function index(Request $request)
    {
        try {
            $query = Devotee::query();

            // Include relationships
            $query->with(['createdByUser', 'updatedByUser']);

            // Filter by status
            if ($request->filled('status')) {
                if ($request->status === 'active') {
                    $query->where('is_active', true);
                } else if ($request->status === 'inactive') {
                    $query->where('is_active', false);
                }
            }

            // Filter by customer type
            if ($request->filled('customer_type')) {
                $query->where('customer_type', 'LIKE', "%{$request->customer_type}%");
            }

            // Filter by verified status
            if ($request->filled('verified')) {
                $query->where('is_verified', $request->verified === 'true' || $request->verified === '1');
            }

            // Search functionality
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('customer_name', 'LIKE', "%{$search}%")
                        ->orWhere('devotee_code', 'LIKE', "%{$search}%")
                        ->orWhere('email', 'LIKE', "%{$search}%")
                        ->orWhere('mobile', 'LIKE', "%{$search}%")
                        ->orWhere('tin_no', 'LIKE', "%{$search}%");
                });
            }

            // Sorting
            $sortBy = $request->input('sort_by', 'created_at');
            $sortOrder = $request->input('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->input('per_page', 50);
            $devotees = $query->paginate($perPage);

            // Get user permissions
            $user = Auth::user();
            $permissions = [
                'can_create_devotees' => $user->can('devotees.create'),
                'can_edit_devotees' => $user->can('devotees.edit'),
                'can_delete_devotees' => $user->can('devotees.delete'),
                'can_view_devotees' => $user->can('devotees.view'),
            ];

            return response()->json([
                'success' => true,
                'data' => $devotees,
                'permissions' => $permissions
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch devotees',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created devotee
     */
    public function store(Request $request)
    {
        // Permission check removed as requested
        
        $validator = Validator::make($request->all(), [
            'customer_name' => 'required|string|max:255',
            'customer_type' => 'required', // can be array or string
            'mobile' => 'required|string|max:20',
            'mobile_code' => 'nullable|string|max:10',
            'email' => 'nullable|email|unique:devotees,email',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:20',
            'tin_no' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
            'is_verified' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Generate devotee code
            $devoteeCode = $this->generateDevoteeCode();

            // Create devotee
            $data = $request->all();
            
            // Handle customer_type array
            if (is_array($data['customer_type'])) {
                $data['customer_type'] = implode(',', $data['customer_type']);
            }
            
            $data['devotee_code'] = $devoteeCode;
            $data['created_by'] = Auth::id();
            
            // Set defaults
            if (!isset($data['mobile_code'])) {
                $data['mobile_code'] = '+60';
            }
            if (!isset($data['country'])) {
                $data['country'] = 'Malaysia';
            }

            $devotee = Devotee::create($data);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Devotee created successfully',
                'data' => $devotee->load(['createdByUser'])
            ], 201);
        } catch (Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create devotee',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified devotee
     */
    public function show($id)
    {
        try {
            $user = Auth::user();
            // Permissions array kept for frontend compatibility but logic is open
            // $permissions = [
            //     'can_edit_devotees' => true,
            //     'can_delete_devotees' => true,
            // ];

            $devotee = Devotee::with(['createdByUser', 'updatedByUser'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $devotee,
                // 'permissions' => $permissions
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Devotee not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified devotee
     */
    public function update(Request $request, $id)
    {
        // Permission check removed as requested

        $devotee = Devotee::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'customer_name' => 'required|string|max:255',
            'customer_type' => 'required', // can be array or string
            'mobile' => 'required|string|max:20',
            'mobile_code' => 'nullable|string|max:10',
            'email' => 'nullable|email|unique:devotees,email,' . $devotee->id,
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:20',
            'tin_no' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
            'is_verified' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $data = $request->all();
            
            // Handle customer_type array
            if (is_array($data['customer_type'])) {
                $data['customer_type'] = implode(',', $data['customer_type']);
            }
            
            $data['updated_by'] = Auth::id();

            $devotee->update($data);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Devotee updated successfully',
                'data' => $devotee->load(['createdByUser', 'updatedByUser'])
            ]);
        } catch (Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update devotee',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified devotee
     */
    public function destroy($id)
    {
        // Permission check removed as requested

        DB::beginTransaction();

        DB::beginTransaction();
        try {
            $devotee = Devotee::findOrFail($id);

            // Check if devotee can be deleted (add your business logic here)
            // For example, check if devotee has any bookings, orders, etc.

            // Soft delete the devotee
            $devotee->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Devotee deleted successfully'
            ]);
        } catch (Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error deleting devotee',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get active devotees list
     */
    public function getActiveDevotees(Request $request)
    {
        try {
            $query = Devotee::where('is_active', true);

            // Filter by customer type if provided
            if ($request->filled('customer_type')) {
                $query->where('customer_type', 'LIKE', "%{$request->customer_type}%");
            }

            $devotees = $query->orderBy('customer_name', 'asc')
                ->get(['id', 'devotee_code', 'customer_name', 'customer_type', 'email', 'mobile', 'mobile_code']);

            return response()->json([
                'success' => true,
                'data' => $devotees
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active devotees',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get devotees by customer type
     */
    public function getByCustomerType($type)
    {
        try {
            $devotees = Devotee::where('customer_type', 'LIKE', "%{$type}%")
                ->where('is_active', true)
                ->orderBy('customer_name', 'asc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $devotees
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch devotees',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle devotee active status
     */
    public function toggleStatus($id)
    {
        try {
            $devotee = Devotee::findOrFail($id);
            $devotee->is_active = !$devotee->is_active;
            $devotee->updated_by = Auth::id();
            $devotee->save();

            return response()->json([
                'success' => true,
                'message' => 'Devotee status updated successfully',
                'data' => $devotee
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle devotee verified status
     */
    public function toggleVerified($id)
    {
        try {
            $devotee = Devotee::findOrFail($id);
            $devotee->is_verified = !$devotee->is_verified;
            $devotee->updated_by = Auth::id();
            $devotee->save();

            return response()->json([
                'success' => true,
                'message' => 'Devotee verification status updated successfully',
                'data' => $devotee
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update verification status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate unique devotee code
     */
    private function generateDevoteeCode()
    {
        $lastDevotee = Devotee::orderBy('devotee_code', 'desc')->first();

        if ($lastDevotee) {
            $lastNumber = intval(substr($lastDevotee->devotee_code, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return 'DEV' . $newNumber;
    }

    /**
     * Get customer types
     */
    public function getCustomerTypes()
    {
        return response()->json([
            'success' => true,
            'data' => [
                ['value' => 'sales', 'label' => 'Sales'],
                ['value' => 'hall_booking', 'label' => 'Hall Booking'],
                ['value' => 'event_booking', 'label' => 'Event Booking'],
                ['value' => 'rom', 'label' => 'ROM'],
                ['value' => 'lamp_booking', 'label' => 'Lamp Booking'],
            ]
        ]);
    }

    /**
     * Export devotees to CSV
     */
    public function export(Request $request)
    {
        try {
            $query = Devotee::query();

            // Apply filters
            if ($request->filled('customer_type')) {
                $query->where('customer_type', $request->customer_type);
            }
            if ($request->filled('status')) {
                $query->where('is_active', $request->status === 'active');
            }

            $devotees = $query->get();

            $filename = 'devotees_' . date('Y-m-d_His') . '.csv';
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => "attachment; filename=\"$filename\"",
            ];

            $callback = function () use ($devotees) {
                $file = fopen('php://output', 'w');
                
                // Add headers
                fputcsv($file, [
                    'Code', 'Customer Name', 'Customer Type', 'Mobile', 'Email',
                    'Address', 'City', 'State', 'Country', 'Pincode', 'TIN No',
                    'Active', 'Verified', 'Created At'
                ]);

                // Add data
                foreach ($devotees as $devotee) {
                    fputcsv($file, [
                        $devotee->devotee_code,
                        $devotee->customer_name,
                        $devotee->customer_type,
                        $devotee->mobile_code . $devotee->mobile,
                        $devotee->email,
                        $devotee->address,
                        $devotee->city,
                        $devotee->state,
                        $devotee->country,
                        $devotee->pincode,
                        $devotee->tin_no,
                        $devotee->is_active ? 'Yes' : 'No',
                        $devotee->is_verified ? 'Yes' : 'No',
                        $devotee->created_at->format('Y-m-d H:i:s'),
                    ]);
                }

                fclose($file);
            };

            return response()->stream($callback, 200, $headers);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to export devotees',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
