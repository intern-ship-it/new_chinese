<?php

namespace App\Http\Controllers;

use App\Models\PackageMaster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PackageMasterController extends Controller
{
    /**
     * Get all packages with pagination and filters
     */
    public function index(Request $request)
    {
        try {
            $query = PackageMaster::with(['createdBy:id,name', 'updatedBy:id,name']);

            // Filter by status
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Filter by number of people range
            if ($request->filled('min_people')) {
                $query->where('number_of_people', '>=', $request->min_people);
            }
            if ($request->filled('max_people')) {
                $query->where('number_of_people', '<=', $request->max_people);
            }

            // Search
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('package_name', 'ILIKE', "%{$search}%")
                        ->orWhere('package_name_chinese', 'ILIKE', "%{$search}%")
                        ->orWhere('description', 'ILIKE', "%{$search}%");
                });
            }

            // Sorting
            $sortBy = $request->input('sort_by', 'number_of_people');
            $sortOrder = $request->input('sort_order', 'asc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->input('per_page', 10);
            $packages = $query->paginate($perPage);

            // Add formatted attributes
            $packages->getCollection()->transform(function ($package) {
                $package->amount_formatted = $package->amount_formatted;
                $package->price_per_person = $package->price_per_person;
                return $package;
            });

            return response()->json([
                'success' => true,
                'data' => $packages->items(),
                'pagination' => [
                    'current_page' => $packages->currentPage(),
                    'total_pages' => $packages->lastPage(),
                    'per_page' => $packages->perPage(),
                    'total' => $packages->total(),
                    'from' => $packages->firstItem(),
                    'to' => $packages->lastItem()
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch packages',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single package
     */
    public function show($id)
    {
        try {
            $package = PackageMaster::with(['createdBy:id,name', 'updatedBy:id,name'])->find($id);

            if (!$package) {
                return response()->json([
                    'success' => false,
                    'message' => 'Package not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $package
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch package',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new package
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'package_name' => 'required|string|max:255',
            'package_name_chinese' => 'nullable|string|max:255',
            'number_of_people' => 'required|integer|min:1',
            'amount' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'description_chinese' => 'nullable|string',
            'includes' => 'nullable|string',
            'includes_chinese' => 'nullable|string',
            'status' => 'required|integer|in:0,1'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $package = PackageMaster::create([
                'package_name' => $request->package_name,
                'package_name_chinese' => $request->package_name_chinese,
                'number_of_people' => $request->number_of_people,
                'amount' => $request->amount,
                'description' => $request->description,
                'description_chinese' => $request->description_chinese,
                'includes' => $request->includes,
                'includes_chinese' => $request->includes_chinese,
                'status' => $request->status,
                'created_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Package created successfully',
                'data' => $package
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create package',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update package
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'package_name' => 'required|string|max:255',
            'package_name_chinese' => 'nullable|string|max:255',
            'number_of_people' => 'required|integer|min:1',
            'amount' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'description_chinese' => 'nullable|string',
            'includes' => 'nullable|string',
            'includes_chinese' => 'nullable|string',
            'status' => 'required|integer|in:0,1'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $package = PackageMaster::find($id);

            if (!$package) {
                return response()->json([
                    'success' => false,
                    'message' => 'Package not found'
                ], 404);
            }

            $package->update([
                'package_name' => $request->package_name,
                'package_name_chinese' => $request->package_name_chinese,
                'number_of_people' => $request->number_of_people,
                'amount' => $request->amount,
                'description' => $request->description,
                'description_chinese' => $request->description_chinese,
                'includes' => $request->includes,
                'includes_chinese' => $request->includes_chinese,
                'status' => $request->status,
                'updated_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Package updated successfully',
                'data' => $package
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update package',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete package (soft delete)
     */
    public function destroy($id)
    {
        try {
            $package = PackageMaster::find($id);

            if (!$package) {
                return response()->json([
                    'success' => false,
                    'message' => 'Package not found'
                ], 404);
            }

            $package->delete();

            return response()->json([
                'success' => true,
                'message' => 'Package deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete package',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get active packages (for dropdowns)
     */
    public function getActivePackages()
    {
        try {
            $packages = PackageMaster::active()
                ->select('id', 'package_name', 'package_name_chinese', 'number_of_people', 'amount')
                ->orderBy('number_of_people')
                ->get();

            // Add formatted attributes
            $packages->transform(function ($package) {
                $package->amount_formatted = $package->amount_formatted;
                $package->price_per_person = $package->price_per_person;
                return $package;
            });

            return response()->json([
                'success' => true,
                'data' => $packages
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active packages',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}