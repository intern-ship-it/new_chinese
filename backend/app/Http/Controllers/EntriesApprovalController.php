<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Entry;
use App\Models\EntryItem;
use App\Models\EntryApproval;
use App\Models\EntryItemApproval;
use App\Models\EntryApprovalLog;
use App\Models\OrganizationPosition;
use App\Models\OrganizationPositionHolder;
use App\Models\SystemSetting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class EntriesApprovalController extends Controller
{
    /**
     * Get approval settings from system_settings
     */
    private function getApprovalSettings()
    {
        $settings = [];
        
        // Get approval settings
        $approvalEnabled = SystemSetting::where('key', 'is_approval_payment')->first();
        $settings['is_enabled'] = $approvalEnabled ? (int)$approvalEnabled->value : 0;
        
        // Get payment approval positions (array of position UUIDs)
        $paymentApproval = SystemSetting::where('key', 'payment_approval')->first();
        $settings['positions'] = $paymentApproval ? json_decode($paymentApproval->value, true) : [];
        
        $minAmount = SystemSetting::where('key', 'minimum_payment_approval_amount')->first();
        $settings['min_amount'] = $minAmount ? (float)$minAmount->value : 0;
        
        $approvalMemberNos = SystemSetting::where('key', 'approval_member_nos')->first();
        $settings['required_approvals'] = $approvalMemberNos ? (int)$approvalMemberNos->value : 1;
        
        return $settings;
    }
    
    /**
     * Check if payment needs approval
     */
    public function checkApprovalRequired($amount)
    {
        $settings = $this->getApprovalSettings();
        
        if (!$settings['is_enabled']) {
            return false;
        }
        
        return $amount >= $settings['min_amount'];
    }
    
    /**
     * Get pending approvals list
     */
    public function getPendingApprovals(Request $request)
    {
        try {
            $user = Auth::user();
			// DB::enableQueryLog();
            $query = EntryApproval::with(['fund', 'creator', 'approvalLogs.approver']);
            
            // Super admin sees all
            if ($user->user_type !== 'SUPER_ADMIN') {
                // Check if user holds any approval position
                $userPositions = OrganizationPositionHolder::where('user_id', $user->id)
                    ->where('is_current', true)
                    ->pluck('position_id')
                    ->toArray();
                
                if (empty($userPositions)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'You do not have approval rights'
                    ], 403);
                }
                
                // Get approval positions from settings
                $settings = $this->getApprovalSettings();
                $approvalPositionNames = $settings['positions'];
                
                // Get position IDs for approval positions
                $approvalPositions = OrganizationPosition::whereIn('name', $approvalPositionNames)
                    ->pluck('id')
                    ->toArray();
                
                // Check if user has any approval position
                $hasApprovalPosition = !empty(array_intersect($userPositions, $approvalPositions));
                
                if (!$hasApprovalPosition) {
                    return response()->json([
                        'success' => false,
                        'message' => 'You do not have approval rights'
                    ], 403);
                }
            }
            
            // Filter by status
            if ($request->filled('status')) {
				$status_array = explode(',', $request->status);
                $query->whereIn('approval_status', $status_array);
            } else {
                // Default to pending and partial_approved
                $query->whereIn('approval_status', ['pending', 'partial_approved']);
            }
            
            // Filter by date range
            if ($request->filled('from_date')) {
                $query->whereDate('date', '>=', $request->from_date);
            }
            if ($request->filled('to_date')) {
                $query->whereDate('date', '<=', $request->to_date);
            }
            
            // Sort
            $query->orderBy('created_at', 'desc');
            
            // Paginate
            $perPage = $request->get('per_page', 20);
            $approvals = $query->paginate($perPage);
			/* $queries = DB::getQueryLog();
			dd($queries); */
            
            // Add additional info
            $approvals->getCollection()->transform(function ($approval) use ($user) {
                $approval->can_approve = $this->canUserApprove($approval, $user);
                $approval->approval_count = $approval->approvalLogs()->where('action', 'approved')->count();
                $approval->required_approvals = $this->getRequiredApprovals($approval);
                $approval->has_user_approved = $this->hasUserApproved($approval, $user);
                return $approval;
            });
            
            return response()->json([
                'success' => true,
                'data' => $approvals
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error fetching pending approvals: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching pending approvals'
            ], 500);
        }
    }
    
    /**
     * Get single approval details
     */
    public function show($id)
    {
        try {
            $approval = EntryApproval::with([
                'fund', 
                'creator', 
                'entryItems.ledger',
                'approvalLogs' => function($query) {
                    $query->with(['approver', 'position']);
                }
            ])->find($id);
            
            if (!$approval) {
                return response()->json([
                    'success' => false,
                    'message' => 'Approval entry not found'
                ], 404);
            }
            
            $user = Auth::user();
            $approval->can_approve = $this->canUserApprove($approval, $user);
            $approval->can_edit = $approval->approval_status === 'pending' && $approval->created_by === $user->id;
            $approval->approval_count = $approval->approvalLogs()->where('action', 'approved')->count();
            $approval->required_approvals = $this->getRequiredApprovals($approval);
            $approval->has_user_approved = $this->hasUserApproved($approval, $user);
            
            return response()->json([
                'success' => true,
                'data' => $approval
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error fetching approval details: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching approval details'
            ], 500);
        }
    }
    
    /**
     * Approve payment
     */
    public function approve(Request $request, $id)
    {
        $request->validate([
            'comments' => 'nullable|string'
        ]);
        
        DB::beginTransaction();
        
        try {
            $approval = EntryApproval::find($id);
            
            if (!$approval) {
                throw new \Exception('Approval entry not found');
            }
            
            if (!in_array($approval->approval_status, ['pending', 'partial_approved'])) {
                throw new \Exception('This payment has already been processed');
            }
            
            $user = Auth::user();
            
            // Check if user can approve
            if (!$this->canUserApprove($approval, $user)) {
                throw new \Exception('You do not have permission to approve this payment');
            }
            
            // Check if user has already approved
            if ($this->hasUserApproved($approval, $user)) {
                throw new \Exception('You have already approved this payment');
            }
            
            // Get user's position
            $userPosition = $this->getUserApprovalPosition($user);
            
            // Create approval log
            EntryApprovalLog::create([
                'entry_approval_id' => $approval->id,
                'approver_id' => $user->id,
                'position_id' => $userPosition ? $userPosition->id : null,
                'action' => 'approved',
                'comments' => $request->comments
            ]);
            
            // Check if all required approvals are complete
            $approvalCount = EntryApprovalLog::where('entry_approval_id', $approval->id)
                ->where('action', 'approved')
                ->count();
                
            $requiredApprovals = $this->getRequiredApprovals($approval);
            
            // Super admin approval immediately completes the process
            if ($user->user_type === 'SUPER_ADMIN' || $approvalCount >= $requiredApprovals) {
                // Mark as approved
                $approval->approval_status = 'approved';
                $approval->approved_at = now();
                $approval->save();
                
                // Transfer to main entries table
                $this->transferToMainEntries($approval);
                
                $message = 'Payment approved successfully';
            } else {
                // Mark as partially approved
                $approval->approval_status = 'partial_approved';
                $approval->save();
                
                $message = "Payment partially approved ($approvalCount/$requiredApprovals approvals)";
            }
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => $message
            ]);
            
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Error approving payment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Reject payment
     */
    public function reject(Request $request, $id)
    {
        $request->validate([
            'comments' => 'required|string',
            'rejection_reason' => 'required|string'
        ]);
        
        DB::beginTransaction();
        
        try {
            $approval = EntryApproval::find($id);
            
            if (!$approval) {
                throw new \Exception('Approval entry not found');
            }
            
            if (!in_array($approval->approval_status, ['pending', 'partial_approved'])) {
                throw new \Exception('This payment has already been processed');
            }
            
            $user = Auth::user();
            
            // Check if user can approve/reject
            if (!$this->canUserApprove($approval, $user)) {
                throw new \Exception('You do not have permission to reject this payment');
            }
            
            // Get user's position
            $userPosition = $this->getUserApprovalPosition($user);
            
            // Create rejection log
            EntryApprovalLog::create([
                'entry_approval_id' => $approval->id,
                'approver_id' => $user->id,
                'position_id' => $userPosition ? $userPosition->id : null,
                'action' => 'rejected',
                'comments' => $request->comments
            ]);
            
            // Update approval status
            $approval->approval_status = 'rejected';
            $approval->rejected_by = $user->id;
            $approval->rejected_at = now();
            $approval->rejection_reason = $request->rejection_reason;
            $approval->save();
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Payment rejected successfully'
            ]);
            
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Error rejecting payment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Cancel payment (delete from approval)
     */
    public function cancel($id)
    {
        DB::beginTransaction();
        
        try {
            $approval = EntryApproval::find($id);
            
            if (!$approval) {
                throw new \Exception('Approval entry not found');
            }
            
            if ($approval->approval_status !== 'pending') {
                throw new \Exception('Only pending payments can be cancelled');
            }
            
            $user = Auth::user();
            
            // Only creator or super admin can cancel
            if ($approval->created_by !== $user->id && $user->user_type !== 'SUPER_ADMIN') {
                throw new \Exception('You do not have permission to cancel this payment');
            }
            
            // Delete approval logs
            EntryApprovalLog::where('entry_approval_id', $id)->delete();
            
            // Delete entry items
            EntryItemApproval::where('entry_id', $id)->delete();
            
            // Delete entry
            $approval->delete();
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Payment cancelled successfully'
            ]);
            
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Error cancelling payment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Update pending payment
     */
    public function update(Request $request, $id)
    {
        $approval = EntryApproval::find($id);
        
        if (!$approval) {
            return response()->json([
                'success' => false,
                'message' => 'Approval entry not found'
            ], 404);
        }
        
        if ($approval->approval_status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Only pending payments can be edited'
            ], 422);
        }
        
        $user = Auth::user();
        
        if ($approval->created_by !== $user->id && $user->user_type !== 'SUPER_ADMIN') {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to edit this payment'
            ], 403);
        }
        
        // Validate and update similar to regular payment update
        // Reuse logic from EntriesController::updatePayment
        
        DB::beginTransaction();
        
        try {
            // Update approval entry
            $approval->date = $request->date;
            $approval->fund_id = $request->fund_id;
            $approval->payment = $request->payment_mode;
            $approval->paid_to = $request->paid_to;
            $approval->narration = $request->narration;
            
            if ($request->payment_mode === 'CHEQUE') {
                $approval->cheque_no = $request->cheque_no;
                $approval->cheque_date = $request->cheque_date;
                $approval->bank_name = $request->bank_name;
            } elseif ($request->payment_mode === 'ONLINE') {
                $approval->transaction_no = $request->transaction_no;
                $approval->transaction_date = $request->transaction_date;
            }
            
            $totalAmount = collect($request->items)->sum('amount');
            $approval->dr_total = $totalAmount;
            $approval->cr_total = $totalAmount;
            $approval->save();
            
            // Delete and recreate entry items
            EntryItemApproval::where('entry_id', $approval->id)->delete();
            
            // Add debit entries
            foreach ($request->items as $item) {
                EntryItemApproval::create([
                    'entry_id' => $approval->id,
                    'ledger_id' => $item['ledger_id'],
                    'amount' => $item['amount'],
                    'dc' => 'D',
                    'details' => $item['details'] ?? null
                ]);
            }
            
            // Add credit entry (Bank/Cash)
            EntryItemApproval::create([
                'entry_id' => $approval->id,
                'ledger_id' => $request->credit_account,
                'amount' => $totalAmount,
                'dc' => 'C'
            ]);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Payment updated successfully'
            ]);
            
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Error updating payment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Transfer approved entry to main entries table
     */
    private function transferToMainEntries($approval)
    {
        // Create entry in main table
        $entry = new Entry();
        $entry->entrytype_id = $approval->entrytype_id;
        $entry->number = $approval->number;
        $entry->entry_code = $approval->entry_code;
        $entry->date = $approval->date;
        $entry->dr_total = $approval->dr_total;
        $entry->cr_total = $approval->cr_total;
        $entry->narration = $approval->narration;
        $entry->fund_id = $approval->fund_id;
        $entry->payment = $approval->payment;
        $entry->cheque_no = $approval->cheque_no;
        $entry->cheque_date = $approval->cheque_date;
        $entry->bank_name = $approval->bank_name;
        $entry->transaction_no = $approval->transaction_no;
        $entry->transaction_date = $approval->transaction_date;
        $entry->paid_to = $approval->paid_to;
        $entry->reference_no = $approval->reference_no;
        $entry->inv_type = 21; // Approval reference
        $entry->inv_id = $approval->id;
        $entry->created_by = $approval->created_by;
        $entry->save();
        
        // Transfer entry items
        $approvalItems = EntryItemApproval::where('entry_id', $approval->id)->get();
        
        foreach ($approvalItems as $item) {
            $entryItem = new EntryItem();
            $entryItem->entry_id = $entry->id;
            $entryItem->ledger_id = $item->ledger_id;
            $entryItem->amount = $item->amount;
            $entryItem->dc = $item->dc;
            $entryItem->details = $item->details;
            $entryItem->is_discount = $item->is_discount;
            $entryItem->quantity = $item->quantity;
            $entryItem->unit_price = $item->unit_price;
            $entryItem->save();
        }
        
        // Update approval with main entry reference
        $approval->original_entry_id = $entry->id;
        $approval->save();
        
        return $entry;
    }
    
    /**
     * Check if user can approve
     */
    private function canUserApprove($approval, $user)
    {
        // Super admin can always approve
        if ($user->user_type === 'SUPER_ADMIN') {
            return true;
        }
        
        // Check if user holds approval position
        $settings = $this->getApprovalSettings();
        $approvalPositionNames = $settings['positions'];
        
        $userPositions = OrganizationPositionHolder::where('user_id', $user->id)
            ->where('is_current', true)
            ->whereHas('position', function($query) use ($approvalPositionNames) {
                $query->whereIn('name', $approvalPositionNames);
            })
            ->exists();
        
        return $userPositions;
    }
    
    /**
     * Check if user has already approved
     */
    private function hasUserApproved($approval, $user)
    {
        return EntryApprovalLog::where('entry_approval_id', $approval->id)
            ->where('approver_id', $user->id)
            ->where('action', 'approved')
            ->exists();
    }
    
    /**
     * Get required number of approvals
     */
    private function getRequiredApprovals($approval)
    {
        $settings = $this->getApprovalSettings();
        $availablePositions = count($settings['positions']);
        $requiredApprovals = $settings['required_approvals'];
        
        // If required approvals exceed available positions, use all positions
        if ($requiredApprovals > $availablePositions) {
            return $availablePositions;
        }
        
        return $requiredApprovals;
    }
    
    /**
     * Get user's approval position
     */
    private function getUserApprovalPosition($user)
    {
        $settings = $this->getApprovalSettings();
        $approvalPositionNames = $settings['positions'];
        
        $positionHolder = OrganizationPositionHolder::where('user_id', $user->id)
            ->where('is_current', true)
            ->whereHas('position', function($query) use ($approvalPositionNames) {
                $query->whereIn('name', $approvalPositionNames);
            })
            ->with('position')
            ->first();
        
        return $positionHolder ? $positionHolder->position : null;
    }
    
    /**
     * Get approval statistics
     */
    public function getStatistics()
    {
        try {
            $user = Auth::user();
            $stats = [];
            
            // Base query
            $query = EntryApproval::query();
            
            // Filter by user permissions if not super admin
            if ($user->user_type !== 'SUPER_ADMIN') {
                $userPositions = OrganizationPositionHolder::where('user_id', $user->id)
                    ->where('is_current', true)
                    ->pluck('position_id')
                    ->toArray();
                
                if (empty($userPositions)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'You do not have approval rights'
                    ], 403);
                }
            }
            
            $stats['pending'] = (clone $query)->where('approval_status', 'pending')->count();
            $stats['partial_approved'] = (clone $query)->where('approval_status', 'partial_approved')->count();
            $stats['approved'] = (clone $query)->where('approval_status', 'approved')
                ->whereMonth('created_at', now()->month)
                ->count();
            $stats['rejected'] = (clone $query)->where('approval_status', 'rejected')
                ->whereMonth('created_at', now()->month)
                ->count();
            
            // Get pending amount
            $stats['pending_amount'] = (clone $query)
                ->whereIn('approval_status', ['pending', 'partial_approved'])
                ->sum('dr_total');
            
            // Get user's pending approvals
            if ($this->canUserApprove(new EntryApproval(), $user)) {
                $stats['my_pending'] = (clone $query)
                    ->whereIn('approval_status', ['pending', 'partial_approved'])
                    ->whereDoesntHave('approvalLogs', function($q) use ($user) {
                        $q->where('approver_id', $user->id)
                          ->where('action', 'approved');
                    })
                    ->count();
            } else {
                $stats['my_pending'] = 0;
            }
            
            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error fetching approval statistics: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching statistics'
            ], 500);
        }
    }
}