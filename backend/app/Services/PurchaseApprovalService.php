<?php

namespace App\Services;

use App\Models\PurchaseRequest;
use App\Models\PurchaseOrder;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class PurchaseApprovalService
{
    /**
     * Approval thresholds configuration
     */
    private $approvalThresholds = [
        'STAFF' => 5000,      // Staff can approve up to 5000
        'ADMIN' => 50000,     // Admin can approve up to 50000
        'SUPER_ADMIN' => null // Super Admin has no limit
    ];

    /**
     * Check if user can approve a purchase request
     */
    public function canApprovePurchaseRequest($userId, $prId)
    {
        try {
            $user = User::find($userId);
            $pr = PurchaseRequest::find($prId);

            if (!$user || !$pr) {
                return false;
            }

            // User cannot approve their own request
            if ($pr->requested_by == $userId) {
                return false;
            }

            // Check if PR is in correct status
            if (!in_array($pr->status, ['SUBMITTED', 'DRAFT'])) {
                return false;
            }

            // Check user role and amount threshold
            return $this->checkApprovalThreshold($user, $this->calculatePRTotal($prId));

        } catch (\Exception $e) {
            Log::error('Error checking PR approval permission: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Check if user can approve a purchase order
     */
    public function canApprovePurchaseOrder($userId, $poId)
    {
        try {
            $user = User::find($userId);
            $po = PurchaseOrder::find($poId);

            if (!$user || !$po) {
                return false;
            }

            // User cannot approve their own PO
            if ($po->created_by == $userId) {
                return false;
            }

            // Check if PO is in correct status
            if ($po->status != 'PENDING_APPROVAL') {
                return false;
            }

            // Only ADMIN and SUPER_ADMIN can approve POs
            if (!in_array($user->user_type, ['ADMIN', 'SUPER_ADMIN'])) {
                return false;
            }

            // Check amount threshold
            return $this->checkApprovalThreshold($user, $po->total_amount);

        } catch (\Exception $e) {
            Log::error('Error checking PO approval permission: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Check approval threshold
     */
    private function checkApprovalThreshold($user, $amount)
    {
        $userType = $user->user_type;
        
        if (!isset($this->approvalThresholds[$userType])) {
            return false;
        }

        $threshold = $this->approvalThresholds[$userType];
        
        // No limit for this role
        if ($threshold === null) {
            return true;
        }

        return $amount <= $threshold;
    }

    /**
     * Calculate PR total amount
     */
    private function calculatePRTotal($prId)
    {
        // This is an estimated calculation based on average prices
        // In real scenario, you might want to get quotes first
        $items = DB::table('purchase_request_items')
            ->where('pr_id', $prId)
            ->where('status', '!=', 'REJECTED')
            ->get();

        $estimatedTotal = 0;
        foreach ($items as $item) {
            if ($item->item_type == 'product' && $item->product_id) {
                $product = DB::table('products')->find($item->product_id);
                if ($product) {
                    $estimatedTotal += $item->quantity * ($product->purchase_price ?? $product->selling_price ?? 0);
                }
            } elseif ($item->item_type == 'service' && $item->service_id) {
                $service = DB::table('services')->find($item->service_id);
                if ($service) {
                    $estimatedTotal += $item->quantity * ($service->price ?? 0);
                }
            }
        }

        return $estimatedTotal;
    }

    /**
     * Approve purchase request
     */
    public function approvePurchaseRequest($prId, $approvalNotes = null)
    {
        try {
            DB::beginTransaction();

            $pr = PurchaseRequest::find($prId);
            if (!$pr) {
                throw new \Exception('Purchase request not found');
            }

            if (!$this->canApprovePurchaseRequest(Auth::id(), $prId)) {
                throw new \Exception('You do not have permission to approve this purchase request');
            }

            $pr->status = 'APPROVED';
            $pr->approved_by = Auth::id();
            $pr->approved_at = Carbon::now();
            $pr->approval_notes = $approvalNotes;
            $pr->save();

            // Update all items to approved
            DB::table('purchase_request_items')
                ->where('pr_id', $prId)
                ->update(['status' => 'APPROVED']);

            // Log the approval
            $this->logApprovalAction('PR', $prId, 'APPROVED', $approvalNotes);

            DB::commit();

            return [
                'success' => true,
                'message' => 'Purchase request approved successfully',
                'pr' => $pr
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error approving purchase request: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Reject purchase request
     */
    public function rejectPurchaseRequest($prId, $rejectionReason)
    {
        try {
            DB::beginTransaction();

            $pr = PurchaseRequest::find($prId);
            if (!$pr) {
                throw new \Exception('Purchase request not found');
            }

            if (!$this->canApprovePurchaseRequest(Auth::id(), $prId)) {
                throw new \Exception('You do not have permission to reject this purchase request');
            }

            $pr->status = 'REJECTED';
            $pr->approved_by = Auth::id();
            $pr->approved_at = Carbon::now();
            $pr->rejection_reason = $rejectionReason;
            $pr->save();

            // Update all items to rejected
            DB::table('purchase_request_items')
                ->where('pr_id', $prId)
                ->update(['status' => 'REJECTED']);

            // Log the rejection
            $this->logApprovalAction('PR', $prId, 'REJECTED', $rejectionReason);

            DB::commit();

            return [
                'success' => true,
                'message' => 'Purchase request rejected',
                'pr' => $pr
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error rejecting purchase request: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Approve purchase order
     */
    public function approvePurchaseOrder($poId, $approvalNotes = null)
    {
        try {
            DB::beginTransaction();

            $po = PurchaseOrder::find($poId);
            if (!$po) {
                throw new \Exception('Purchase order not found');
            }

            if (!$this->canApprovePurchaseOrder(Auth::id(), $poId)) {
                throw new \Exception('You do not have permission to approve this purchase order');
            }

            $po->status = 'APPROVED';
            $po->approved_by = Auth::id();
            $po->approved_at = Carbon::now();
            $po->approval_notes = $approvalNotes;
            $po->save();

            // Send notification to supplier (future implementation)
            // $this->notifySupplier($po);

            // Log the approval
            $this->logApprovalAction('PO', $poId, 'APPROVED', $approvalNotes);

            DB::commit();

            return [
                'success' => true,
                'message' => 'Purchase order approved successfully',
                'po' => $po
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error approving purchase order: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Reject purchase order
     */
    public function rejectPurchaseOrder($poId, $rejectionReason)
    {
        try {
            DB::beginTransaction();

            $po = PurchaseOrder::find($poId);
            if (!$po) {
                throw new \Exception('Purchase order not found');
            }

            if (!$this->canApprovePurchaseOrder(Auth::id(), $poId)) {
                throw new \Exception('You do not have permission to reject this purchase order');
            }

            $po->status = 'REJECTED';
            $po->approved_by = Auth::id();
            $po->approved_at = Carbon::now();
            $po->rejection_reason = $rejectionReason;
            $po->save();

            // Log the rejection
            $this->logApprovalAction('PO', $poId, 'REJECTED', $rejectionReason);

            DB::commit();

            return [
                'success' => true,
                'message' => 'Purchase order rejected',
                'po' => $po
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error rejecting purchase order: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get approval workflow status
     */
    public function getApprovalWorkflow($type, $id)
    {
        try {
            $workflow = [];

            if ($type == 'PR') {
                $pr = PurchaseRequest::with(['requestedBy', 'approvedBy'])->find($id);
                if (!$pr) {
                    throw new \Exception('Purchase request not found');
                }

                $workflow[] = [
                    'step' => 1,
                    'action' => 'Created',
                    'user' => $pr->requestedBy->name ?? 'Unknown',
                    'date' => $pr->created_at,
                    'status' => 'COMPLETED'
                ];

                if ($pr->status == 'SUBMITTED') {
                    $workflow[] = [
                        'step' => 2,
                        'action' => 'Submitted for Approval',
                        'user' => $pr->requestedBy->name ?? 'Unknown',
                        'date' => $pr->updated_at,
                        'status' => 'COMPLETED'
                    ];
                }

                if (in_array($pr->status, ['APPROVED', 'REJECTED'])) {
                    $workflow[] = [
                        'step' => 3,
                        'action' => $pr->status == 'APPROVED' ? 'Approved' : 'Rejected',
                        'user' => $pr->approvedBy->name ?? 'Unknown',
                        'date' => $pr->approved_at,
                        'status' => 'COMPLETED',
                        'notes' => $pr->status == 'APPROVED' ? $pr->approval_notes : $pr->rejection_reason
                    ];
                }

                if ($pr->converted_to_po) {
                    $workflow[] = [
                        'step' => 4,
                        'action' => 'Converted to PO',
                        'user' => $pr->convertedBy->name ?? 'Unknown',
                        'date' => $pr->converted_at,
                        'status' => 'COMPLETED'
                    ];
                }
            } elseif ($type == 'PO') {
                $po = PurchaseOrder::with(['createdBy', 'approvedBy'])->find($id);
                if (!$po) {
                    throw new \Exception('Purchase order not found');
                }

                $workflow[] = [
                    'step' => 1,
                    'action' => 'Created',
                    'user' => $po->createdBy->name ?? 'Unknown',
                    'date' => $po->created_at,
                    'status' => 'COMPLETED'
                ];

                if ($po->status == 'PENDING_APPROVAL') {
                    $workflow[] = [
                        'step' => 2,
                        'action' => 'Pending Approval',
                        'user' => '-',
                        'date' => null,
                        'status' => 'PENDING'
                    ];
                }

                if (in_array($po->status, ['APPROVED', 'REJECTED'])) {
                    $workflow[] = [
                        'step' => 2,
                        'action' => $po->status == 'APPROVED' ? 'Approved' : 'Rejected',
                        'user' => $po->approvedBy->name ?? 'Unknown',
                        'date' => $po->approved_at,
                        'status' => 'COMPLETED',
                        'notes' => $po->status == 'APPROVED' ? $po->approval_notes : $po->rejection_reason
                    ];
                }
            }

            return $workflow;

        } catch (\Exception $e) {
            Log::error('Error getting approval workflow: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Log approval action
     */
    private function logApprovalAction($type, $id, $action, $notes = null)
    {
        try {
            DB::table('approval_logs')->insert([
                'document_type' => $type,
                'document_id' => $id,
                'action' => $action,
                'user_id' => Auth::id(),
                'notes' => $notes,
                'created_at' => Carbon::now()
            ]);
        } catch (\Exception $e) {
            Log::error('Error logging approval action: ' . $e->getMessage());
        }
    }

    /**
     * Get pending approvals for a user
     */
    public function getPendingApprovals($userId)
    {
        try {
            $user = User::find($userId);
            if (!$user) {
                throw new \Exception('User not found');
            }

            $pendingApprovals = [];

            // Get pending PRs
            $pendingPRs = PurchaseRequest::where('status', 'SUBMITTED')
                ->where('requested_by', '!=', $userId)
                ->get()
                ->filter(function ($pr) use ($userId) {
                    return $this->canApprovePurchaseRequest($userId, $pr->id);
                });

            foreach ($pendingPRs as $pr) {
                $pendingApprovals[] = [
                    'type' => 'PR',
                    'id' => $pr->id,
                    'number' => $pr->pr_number,
                    'date' => $pr->request_date,
                    'requested_by' => $pr->requestedBy->name ?? 'Unknown',
                    'amount' => $this->calculatePRTotal($pr->id),
                    'priority' => $pr->priority
                ];
            }

            // Get pending POs
            if (in_array($user->user_type, ['ADMIN', 'SUPER_ADMIN'])) {
                $pendingPOs = PurchaseOrder::where('status', 'PENDING_APPROVAL')
                    ->where('created_by', '!=', $userId)
                    ->get()
                    ->filter(function ($po) use ($userId) {
                        return $this->canApprovePurchaseOrder($userId, $po->id);
                    });

                foreach ($pendingPOs as $po) {
                    $pendingApprovals[] = [
                        'type' => 'PO',
                        'id' => $po->id,
                        'number' => $po->po_number,
                        'date' => $po->po_date,
                        'supplier' => $po->supplier->name ?? 'Unknown',
                        'amount' => $po->total_amount,
                        'priority' => 'NORMAL'
                    ];
                }
            }

            return $pendingApprovals;

        } catch (\Exception $e) {
            Log::error('Error getting pending approvals: ' . $e->getMessage());
            throw $e;
        }
    }
}