<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\TaxMaster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\User;

class TaxMasterController extends Controller
{
    /**
     * Get all tax masters
     */
    public function index(Request $request)
    {
        try {
            $query = TaxMaster::whereNull('tax_master.deleted_at')
                ->leftJoin('ledgers', 'tax_master.ledger_id', '=', 'ledgers.id')
                ->select(
                    'tax_master.*',
                    DB::raw("CASE 
						WHEN ledgers.id IS NULL THEN ''
						ELSE CONCAT(ledgers.left_code, '/ ', ledgers.right_code, ' ', ledgers.name)
					END as ledger_name")
                );

            // Filter by status if provided
            if ($request->filled('status')) {
                $query->where('tax_master.status', $request->status);
            }

            // Filter by service_type_id if provided
            if ($request->filled('service_type_id')) {
                $query->where('tax_master.service_type_id', $request->service_type_id);
            }

            // Search by name if provided
            if ($request->filled('search')) {
                $query->where('tax_master.name', 'LIKE', '%' . $request->search . '%');
            }

            // Pagination
            $perPage = $request->get('per_page', 20);
            $taxes = $query->orderBy('tax_master.name')->paginate($perPage);
            $user = Auth::user();
            $permissions = $this->assignPermissions($user);
            return response()->json([
                'success' => true,
                'data' => $taxes,
                'permissions' => $permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch tax masters',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    /**
     * Get single tax master
     */
    public function show($id)
    {
        $user = Auth::user();
        $permissions = $this->assignPermissions($user);

        try {
            $tax = TaxMaster::whereNull('deleted_at')->find($id);

            if (!$tax) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tax master not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $tax,
                'permissions' => $permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch tax master',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new tax master
     */
    public function store(Request $request)
    {
        	if (!Auth::user()->can('tax_masters.create')) {
			return response()->json([
				'success' => false,
				'message' => 'You do not have permission to create tax masters'
			], 403);
		}
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:300',
                'applicable_for' => 'required|in:product,service,both',
                'percent' => 'required|numeric|min:0|max:100',
                'ledger_id' => 'required|exists:ledgers,id',
                'status' => 'integer|in:0,1'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check if tax with same name exists
            $exists = TaxMaster::where('name', $request->name)
                ->whereNull('deleted_at')
                ->exists();

            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tax with this name already exists'
                ], 422);
            }

            DB::beginTransaction();

            $tax = new TaxMaster();
            $tax->name = $request->name;
            $tax->applicable_for = $request->applicable_for;
            $tax->percent = $request->percent;
            $tax->ledger_id = $request->ledger_id;
            $tax->status = $request->get('status', 1);
            $tax->created_by = Auth::id();
            $tax->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Tax master created successfully',
                'data' => $tax
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create tax master',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update tax master
     */
    public function update(Request $request, $id)
    {
          	if (!Auth::user()->can('tax_masters.edit')) {
			return response()->json([
				'success' => false,
				'message' => 'You do not have permission to edit tax masters'
			], 403);
		}
        try {
            $tax = TaxMaster::whereNull('deleted_at')->find($id);

            if (!$tax) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tax master not found'
                ], 404);
            }

            // Validate request
            $validator = Validator::make($request->all(), [
                'name' => 'string|max:300',
                'applicable_for' => 'in:product,service,both',
                'percent' => 'numeric|min:0|max:100',
                'ledger_id' => 'required|exists:ledgers,id',
                'status' => 'integer|in:0,1'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check if tax with same name exists (excluding current)
            if ($request->has('name')) {
                $exists = TaxMaster::where('name', $request->name)
                    ->where('id', '!=', $id)
                    ->whereNull('deleted_at')
                    ->exists();

                if ($exists) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Tax with this name already exists'
                    ], 422);
                }
            }

            DB::beginTransaction();

            if ($request->has('name')) $tax->name = $request->name;
            if ($request->has('applicable_for')) $tax->applicable_for = $request->applicable_for;
            if ($request->has('percent')) $tax->percent = $request->percent;
            if ($request->has('ledger_id')) $tax->ledger_id = $request->ledger_id;
            if ($request->has('status')) $tax->status = $request->status;

            $tax->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Tax master updated successfully',
                'data' => $tax
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update tax master',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete tax master (soft delete)
     */
    public function destroy($id)
    {
                 	if (!Auth::user()->can('tax_masters.delete')) {
			return response()->json([
				'success' => false,
				'message' => 'You do not have permission to delete tax masters'
			], 403);
		}
        try {
            $tax = TaxMaster::whereNull('deleted_at')->find($id);

            if (!$tax) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tax master not found'
                ], 404);
            }

            // Check if tax is being used in any purchase items
            $inUse = DB::table('purchase_order_items')
                ->where('tax_id', $id)
                ->exists() ||
                DB::table('purchase_invoice_items')
                ->where('tax_id', $id)
                ->exists();

            if ($inUse) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete tax master as it is being used in transactions'
                ], 422);
            }

            DB::beginTransaction();

            $tax->deleted_at = now();
            $tax->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Tax master deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete tax master',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get active taxes for dropdown
     */
    public function getActiveTaxes(Request $request)
    {
        try {
            $query = TaxMaster::where('status', 1)
                ->whereNull('deleted_at');

            // Filter by applicable_for if provided
            if ($request->has('type')) {
                $type = $request->type;
                $query->where(function ($q) use ($type) {
                    $q->where('applicable_for', $type)
                        ->orWhere('applicable_for', 'both');
                });
            }

            $taxes = $query->orderBy('name')
                ->get(['id', 'name', 'percent', 'applicable_for']);

            return response()->json([
                'success' => true,
                'data' => $taxes
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active taxes',
                'error' => $e->getMessage()
            ], 500);
        }
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
            'can_create_tax_masters' => $user->can('tax_masters.create'),
            'can_edit_tax_masters' => $user->can('tax_masters.edit'),
            'can_delete_tax_masters' => $user->can('tax_masters.delete'),
            'can_view_tax_masters' => $user->can('tax_masters.view'),
           
        ];
        return $permissions;
    }
}
