<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Group;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class GroupController extends Controller
{
    /**
     * Get all groups
     */
    public function index(Request $request)
    {
        $query = Group::with('parent');

        if ($request->has('parent_id')) {
            $query->where('parent_id', $request->parent_id);
        }

        if ($request->has('main_only')) {
            $query->mainGroups();
        }

        if ($request->has('fixed_only')) {
            $query->fixed();
        }

        $groups = $query->orderBy('code')->get();

        return response()->json([
            'success' => true,
            'data' => $groups
        ]);
    }

    /**
     * Get group hierarchy
     */
    public function hierarchy()
    {
        $groups = Group::mainGroups()->with('children')->get();
        
        $hierarchy = $this->buildHierarchy($groups);

        return response()->json([
            'success' => true,
            'data' => $hierarchy
        ]);
    }

    /**
     * Build group hierarchy
     */
    private function buildHierarchy($groups)
    {
        $result = [];

        foreach ($groups as $group) {
            $item = [
                'id' => $group->id,
                'name' => $group->name,
                'code' => $group->code,
                'fixed' => $group->fixed,
                'properties' => [
                    'tc' => $group->tc,
                    'td' => $group->td,
                    'ac' => $group->ac,
                    'pd' => $group->pd
                ]
            ];

            if ($group->children->count() > 0) {
                $item['children'] = $this->buildHierarchy($group->children);
            }

            $result[] = $item;
        }

        return $result;
    }

    /**
     * Create new group
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:200',
            'code' => 'required|string|max:200|unique:groups,code',
            'parent_id' => 'nullable|exists:groups,id',
            'tc' => 'boolean',
            'td' => 'boolean',
            'ac' => 'boolean',
            'pd' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Check if it's a fixed group that shouldn't be modified
        if ($request->parent_id) {
            $parent = Group::find($request->parent_id);
            if ($parent && $parent->fixed) {
                // Allow creation under fixed groups based on business rules
            }
        }

        $group = Group::create([
            'name' => $request->name,
            'code' => $request->code,
            'parent_id' => $request->parent_id ?? 0,
            'fixed' => 0, // New groups are not fixed
            'tc' => $request->tc ?? 0,
            'td' => $request->td ?? 0,
            'ac' => $request->ac ?? 0,
            'pd' => $request->pd ?? 0,
            'added_by' => auth()->id()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Group created successfully',
            'data' => $group
        ], 201);
    }

    /**
     * Update group
     */
    public function update(Request $request, $id)
    {
        $group = Group::find($id);

        if (!$group) {
            return response()->json([
                'success' => false,
                'message' => 'Group not found'
            ], 404);
        }

        if ($group->fixed) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot modify fixed groups'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:200',
            'code' => 'string|max:200|unique:groups,code,' . $id,
            'parent_id' => 'nullable|exists:groups,id',
            'tc' => 'boolean',
            'td' => 'boolean',
            'ac' => 'boolean',
            'pd' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $group->update($request->only([
            'name', 'code', 'parent_id', 'tc', 'td', 'ac', 'pd'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Group updated successfully',
            'data' => $group
        ]);
    }

    /**
     * Delete group
     */
    public function destroy($id)
    {
        $group = Group::find($id);

        if (!$group) {
            return response()->json([
                'success' => false,
                'message' => 'Group not found'
            ], 404);
        }

        if ($group->fixed) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete fixed groups'
            ], 422);
        }

        // Check if group has ledgers or child groups
        if ($group->ledgers()->exists() || $group->children()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete group with ledgers or sub-groups'
            ], 422);
        }

        $group->delete();

        return response()->json([
            'success' => true,
            'message' => 'Group deleted successfully'
        ]);
    }

    /**
     * Get group with ledgers and balance
     */
    public function show($id, Request $request)
    {
        $group = Group::with(['parent', 'children', 'ledgers'])->find($id);

        if (!$group) {
            return response()->json([
                'success' => false,
                'message' => 'Group not found'
            ], 404);
        }

        // Get balance if requested
        if ($request->has('with_balance')) {
            $acYearId = $request->get('ac_year_id');
            $group->balance = $group->getTotalBalance($acYearId);
            
            // Add balance to ledgers
            $group->ledgers->transform(function ($ledger) use ($acYearId) {
                $ledger->balance_info = $ledger->getBalance($acYearId);
                return $ledger;
            });
        }

        return response()->json([
            'success' => true,
            'data' => $group
        ]);
    }
}