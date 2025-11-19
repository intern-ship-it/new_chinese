<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\FundBudgetTemplate;
use App\Models\FundBudgetTemplateItem;
use App\Models\Fund;
use App\Models\Ledger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class FundBudgetTemplateController extends Controller
{
    /**
     * Get fund budget templates list
     */
public function index(Request $request)
{
    // Base query with relationships
    $query = FundBudgetTemplate::with(['fund', 'items.ledger', 'creator']);

    // Apply optional filters
    if ($request->filled('fund_id')) {
        $query->where('fund_id', $request->fund_id);
    }

    if ($request->filled('is_active')) {
        $query->where('is_active', $request->is_active);
    }

    if ($request->filled('search')) {
        $query->where('template_name', 'like', '%' . $request->search . '%');
    }

    // Apply sorting
    $sortBy = $request->get('sort_by', 'created_at');
    $sortOrder = $request->get('sort_order', 'desc');
    $query->orderBy($sortBy, $sortOrder);

    // Paginate results
    $perPage = $request->get('per_page', 20);
    $templates = $query->paginate($perPage);

    // Add calculated fields safely
    $templates->getCollection()->transform(function ($template) {
        $items = $template->items ?? collect([]);
        $template->total_amount = $items->sum('default_amount');
        $template->items_count = $items->count();
        return $template;
    });

    // Return JSON response
    return response()->json([
        'success' => true,
        'data' => $templates
    ]);
}


    /**
     * Get single template details
     */
    public function show($id)
    {
        $template = FundBudgetTemplate::with(['fund', 'items.ledger', 'creator'])
            ->findOrFail($id);
        
        // Calculate total
        $template->total_amount = $template->items->sum('default_amount');
        
        return response()->json([
            'success' => true,
            'data' => $template
        ]);
    }

    /**
     * Store new fund budget template
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'fund_id' => 'required|exists:funds,id',
            'template_name' => 'required|string|max:255|unique:fund_budget_templates,template_name,NULL,id,fund_id,' . $request->fund_id,
            'description' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.ledger_id' => 'required|exists:ledgers,id',
            'items.*.default_amount' => 'required|numeric|min:0',
            'items.*.description' => 'nullable|string',
            'items.*.sort_order' => 'nullable|integer',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Check for duplicate ledgers in items
        $ledgerIds = collect($request->items)->pluck('ledger_id');
        if ($ledgerIds->count() !== $ledgerIds->unique()->count()) {
            return response()->json([
                'success' => false,
                'message' => 'Duplicate ledgers found in template items'
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Calculate total amount
            $totalAmount = collect($request->items)->sum('default_amount');
            
            // Create template
            $template = FundBudgetTemplate::create([
                'fund_id' => $request->fund_id,
                'template_name' => $request->template_name,
                'description' => $request->description,
                'is_active' => $request->is_active ?? true,
                'default_total_amount' => $totalAmount,
                'created_by' => Auth::id()
            ]);

            // Create template items
            foreach ($request->items as $index => $item) {
                FundBudgetTemplateItem::create([
                    'template_id' => $template->id,
                    'ledger_id' => $item['ledger_id'],
                    'default_amount' => $item['default_amount'],
                    'description' => $item['description'] ?? null,
                    'sort_order' => $item['sort_order'] ?? $index
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Template created successfully',
                'data' => $template->load('items.ledger')
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create template',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update fund budget template
     */
    public function update(Request $request, $id)
    {
        $template = FundBudgetTemplate::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'template_name' => 'sometimes|required|string|max:255|unique:fund_budget_templates,template_name,' . $id . ',id,fund_id,' . $template->fund_id,
            'description' => 'nullable|string',
            'items' => 'sometimes|required|array|min:1',
            'items.*.ledger_id' => 'required|exists:ledgers,id',
            'items.*.default_amount' => 'required|numeric|min:0',
            'items.*.description' => 'nullable|string',
            'items.*.sort_order' => 'nullable|integer',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Check for duplicate ledgers if items are being updated
        if ($request->has('items')) {
            $ledgerIds = collect($request->items)->pluck('ledger_id');
            if ($ledgerIds->count() !== $ledgerIds->unique()->count()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Duplicate ledgers found in template items'
                ], 422);
            }
        }

        DB::beginTransaction();
        try {
            // Update template
            $updateData = [
                'template_name' => $request->template_name ?? $template->template_name,
                'description' => $request->description ?? $template->description,
                'is_active' => $request->is_active ?? $template->is_active,
                'updated_by' => Auth::id()
            ];

            // If items are being updated, recalculate total
            if ($request->has('items')) {
                $updateData['default_total_amount'] = collect($request->items)->sum('default_amount');
            }

            $template->update($updateData);

            // Update items if provided
            if ($request->has('items')) {
                // Delete existing items
                $template->items()->delete();
                
                // Create new items
                foreach ($request->items as $index => $item) {
                    FundBudgetTemplateItem::create([
                        'template_id' => $template->id,
                        'ledger_id' => $item['ledger_id'],
                        'default_amount' => $item['default_amount'],
                        'description' => $item['description'] ?? null,
                        'sort_order' => $item['sort_order'] ?? $index
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Template updated successfully',
                'data' => $template->fresh()->load('items.ledger')
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update template',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete fund budget template
     */
    public function destroy($id)
    {
        $template = FundBudgetTemplate::findOrFail($id);
        
        // Check if template is used in any budgets
        $usageCount = DB::table('fund_budgets')
            ->where('template_id', $id)
            ->count();
            
        if ($usageCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "Cannot delete template. It's used in {$usageCount} budget(s)"
            ], 422);
        }

        try {
            $template->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Template deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete template',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Activate template
     */
    public function activate($id)
    {
        $template = FundBudgetTemplate::findOrFail($id);
        
        $template->update([
            'is_active' => true,
            'updated_by' => Auth::id()
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Template activated successfully',
            'data' => $template
        ]);
    }

    /**
     * Deactivate template
     */
    public function deactivate($id)
    {
        $template = FundBudgetTemplate::findOrFail($id);
        
        $template->update([
            'is_active' => false,
            'updated_by' => Auth::id()
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Template deactivated successfully',
            'data' => $template
        ]);
    }

    /**
     * Get templates for a specific fund
     */
    public function getByFund($fundId)
    {
        $templates = FundBudgetTemplate::where('fund_id', $fundId)
            ->where('is_active', true)
            ->with('items.ledger')
            ->get();
            
        // Add calculated total for each template
        $templates->transform(function ($template) {
            $template->total_amount = $template->items->sum('default_amount');
            return $template;
        });
        
        return response()->json([
            'success' => true,
            'data' => $templates
        ]);
    }

    /**
     * Duplicate an existing template
     */
    public function duplicate(Request $request, $id)
    {
        $originalTemplate = FundBudgetTemplate::with('items')->findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'template_name' => 'required|string|max:255|unique:fund_budget_templates,template_name',
            'fund_id' => 'nullable|exists:funds,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Create new template
            $newTemplate = FundBudgetTemplate::create([
                'fund_id' => $request->fund_id ?? $originalTemplate->fund_id,
                'template_name' => $request->template_name,
                'description' => $originalTemplate->description . ' (Copy)',
                'is_active' => true,
                'default_total_amount' => $originalTemplate->default_total_amount,
                'created_by' => Auth::id()
            ]);

            // Copy template items
            foreach ($originalTemplate->items as $item) {
                FundBudgetTemplateItem::create([
                    'template_id' => $newTemplate->id,
                    'ledger_id' => $item->ledger_id,
                    'default_amount' => $item->default_amount,
                    'description' => $item->description,
                    'sort_order' => $item->sort_order
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Template duplicated successfully',
                'data' => $newTemplate->load('items.ledger')
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to duplicate template',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Apply template to create a fund budget
     */
    public function applyTemplate(Request $request, $id)
    {
        $template = FundBudgetTemplate::with('items')->findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'budget_name' => 'required|string|max:255',
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
            'multiplier' => 'nullable|numeric|min:0.1|max:10', // Allow scaling amounts
            'items_override' => 'nullable|array', // Allow overriding specific items
            'items_override.*.ledger_id' => 'exists:ledgers,id',
            'items_override.*.amount' => 'numeric|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Record template usage
        $template->recordUsage();

        // Prepare budget data
        $multiplier = $request->multiplier ?? 1;
        $itemsOverride = collect($request->items_override ?? [])->keyBy('ledger_id');
        
        $budgetItems = [];
        $totalAmount = 0;
        
        foreach ($template->items as $item) {
            $amount = $item->default_amount * $multiplier;
            
            // Check for override
            if ($itemsOverride->has($item->ledger_id)) {
                $amount = $itemsOverride->get($item->ledger_id)['amount'];
            }
            
            $budgetItems[] = [
                'ledger_id' => $item->ledger_id,
                'amount' => $amount,
                'description' => $item->description
            ];
            
            $totalAmount += $amount;
        }

        return response()->json([
            'success' => true,
            'message' => 'Template applied successfully',
            'data' => [
                'budget_name' => $request->budget_name,
                'fund_id' => $template->fund_id,
                'from_date' => $request->from_date,
                'to_date' => $request->to_date,
                'budget_amount' => $totalAmount,
                'budget_items' => $budgetItems,
                'template_id' => $template->id,
                'template_name' => $template->template_name
            ]
        ]);
    }

    /**
     * Get template statistics
     */
    public function statistics()
    {
        $stats = [
            'total_templates' => FundBudgetTemplate::count(),
            'active_templates' => FundBudgetTemplate::where('is_active', true)->count(),
            'most_used_templates' => FundBudgetTemplate::orderBy('times_used', 'desc')
                ->take(5)
                ->select('id', 'template_name', 'fund_id', 'times_used')
                ->with('fund:id,name')
                ->get(),
            'templates_by_fund' => Fund::withCount(['templates' => function($query) {
                $query->where('is_active', true);
            }])->get()->map(function($fund) {
                return [
                    'fund_id' => $fund->id,
                    'fund_name' => $fund->name,
                    'template_count' => $fund->templates_count
                ];
            }),
            'recently_created' => FundBudgetTemplate::with('fund:id,name')
                ->orderBy('created_at', 'desc')
                ->take(5)
                ->select('id', 'template_name', 'fund_id', 'created_at')
                ->get()
        ];
        
        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    /**
     * Export template to JSON for backup/sharing
     */
    public function export($id)
    {
        $template = FundBudgetTemplate::with(['fund', 'items.ledger'])->findOrFail($id);
        
        $exportData = [
            'template' => [
                'name' => $template->template_name,
                'description' => $template->description,
                'fund_name' => $template->fund->name,
                'total_amount' => $template->default_total_amount,
                'created_at' => $template->created_at->toISOString()
            ],
            'items' => $template->items->map(function($item) {
                return [
                    'ledger_name' => $item->ledger->name,
                    'ledger_code' => $item->ledger->code ?? null,
                    'amount' => $item->default_amount,
                    'description' => $item->description,
                    'sort_order' => $item->sort_order
                ];
            }),
            'metadata' => [
                'exported_at' => now()->toISOString(),
                'exported_by' => Auth::user()->name,
                'version' => '1.0'
            ]
        ];
        
        return response()->json([
            'success' => true,
            'data' => $exportData,
            'filename' => 'template_' . $template->id . '_' . now()->format('Ymd_His') . '.json'
        ]);
    }

    /**
     * Import template from JSON
     */
    public function import(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'fund_id' => 'required|exists:funds,id',
            'template_data' => 'required|json',
            'template_name' => 'nullable|string|max:255' // Optional override name
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $importData = json_decode($request->template_data, true);
        
        if (!isset($importData['template']) || !isset($importData['items'])) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid template data format'
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Create template
            $template = FundBudgetTemplate::create([
                'fund_id' => $request->fund_id,
                'template_name' => $request->template_name ?? $importData['template']['name'] . ' (Imported)',
                'description' => $importData['template']['description'] ?? 'Imported template',
                'is_active' => true,
                'default_total_amount' => 0, // Will be calculated
                'created_by' => Auth::id()
            ]);

            $totalAmount = 0;
            
            // Create template items
            foreach ($importData['items'] as $index => $item) {
                // Try to find ledger by name or code
                $ledger = Ledger::where('name', $item['ledger_name'])
                    ->orWhere('code', $item['ledger_code'] ?? '')
                    ->first();
                    
                if (!$ledger) {
                    throw new \Exception("Ledger not found: {$item['ledger_name']}");
                }
                
                FundBudgetTemplateItem::create([
                    'template_id' => $template->id,
                    'ledger_id' => $ledger->id,
                    'default_amount' => $item['amount'],
                    'description' => $item['description'] ?? null,
                    'sort_order' => $item['sort_order'] ?? $index
                ]);
                
                $totalAmount += $item['amount'];
            }
            
            // Update total amount
            $template->update(['default_total_amount' => $totalAmount]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Template imported successfully',
                'data' => $template->load('items.ledger')
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to import template',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}