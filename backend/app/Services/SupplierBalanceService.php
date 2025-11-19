<?php

namespace App\Services;

use App\Models\Supplier;
use App\Models\PurchaseInvoice;
use App\Models\PurchasePayment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SupplierBalanceService
{
    /**
     * Update supplier balance after invoice
     */
    public function updateBalanceAfterInvoice($supplierId, $invoiceAmount)
    {
        try {
            $supplier = Supplier::find($supplierId);
            if (!$supplier) {
                throw new \Exception('Supplier not found');
            }

            // Increase supplier balance (we owe them)
            $supplier->current_balance = $supplier->current_balance + $invoiceAmount;
            $supplier->save();

            Log::info('Supplier balance updated after invoice', [
                'supplier_id' => $supplierId,
                'invoice_amount' => $invoiceAmount,
                'new_balance' => $supplier->current_balance
            ]);

            return $supplier->current_balance;
        } catch (\Exception $e) {
            Log::error('Error updating supplier balance after invoice: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Update supplier balance after payment
     */
    public function updateBalanceAfterPayment($supplierId, $paymentAmount)
    {
        try {
            $supplier = Supplier::find($supplierId);
            if (!$supplier) {
                throw new \Exception('Supplier not found');
            }

            // Decrease supplier balance (we paid them)
            $supplier->current_balance = $supplier->current_balance - $paymentAmount;
            $supplier->save();

            Log::info('Supplier balance updated after payment', [
                'supplier_id' => $supplierId,
                'payment_amount' => $paymentAmount,
                'new_balance' => $supplier->current_balance
            ]);

            return $supplier->current_balance;
        } catch (\Exception $e) {
            Log::error('Error updating supplier balance after payment: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get supplier statement
     */
    public function getSupplierStatement($supplierId, $fromDate = null, $toDate = null)
    {
        try {
            $supplier = Supplier::find($supplierId);
            if (!$supplier) {
                throw new \Exception('Supplier not found');
            }

            $query = "
                SELECT 
                    date,
                    type,
                    reference_number,
                    description,
                    debit,
                    credit,
                    running_balance
                FROM (
                    -- Invoices (Debit - we owe them)
                    SELECT 
                        pi.invoice_date as date,
                        'Invoice' as type,
                        pi.invoice_number as reference_number,
                        CONCAT('Purchase Invoice - ', COALESCE(pi.supplier_invoice_no, '')) as description,
                        pi.total_amount as debit,
                        0 as credit,
                        pi.created_at
                    FROM purchase_invoices pi
                    WHERE pi.supplier_id = :supplier_id1
                    AND pi.status != 'CANCELLED'
                    
                    UNION ALL
                    
                    -- Payments (Credit - we paid them)
                    SELECT 
                        pp.payment_date as date,
                        'Payment' as type,
                        pp.payment_number as reference_number,
                        CONCAT('Payment - ', pm.name, COALESCE(CONCAT(' Ref: ', pp.reference_number), '')) as description,
                        0 as debit,
                        pp.amount as credit,
                        pp.created_at
                    FROM purchase_payments pp
                    LEFT JOIN payment_modes pm ON pp.payment_mode_id = pm.id
                    WHERE pp.supplier_id = :supplier_id2
                    AND pp.status = 'COMPLETED'
                ) as transactions
            ";

            $params = [
                'supplier_id1' => $supplierId,
                'supplier_id2' => $supplierId
            ];

            // Add date filters if provided
            if ($fromDate) {
                $query = str_replace(
                    "AND pi.status != 'CANCELLED'",
                    "AND pi.status != 'CANCELLED' AND pi.invoice_date >= :from_date1",
                    $query
                );
                $query = str_replace(
                    "AND pp.status = 'COMPLETED'",
                    "AND pp.status = 'COMPLETED' AND pp.payment_date >= :from_date2",
                    $query
                );
                $params['from_date1'] = $fromDate;
                $params['from_date2'] = $fromDate;
            }

            if ($toDate) {
                $query = str_replace(
                    "AND pi.status != 'CANCELLED'",
                    "AND pi.status != 'CANCELLED' AND pi.invoice_date <= :to_date1",
                    $query
                );
                $query = str_replace(
                    "AND pp.status = 'COMPLETED'",
                    "AND pp.status = 'COMPLETED' AND pp.payment_date <= :to_date2",
                    $query
                );
                $params['to_date1'] = $toDate;
                $params['to_date2'] = $toDate;
            }

            $query .= " ORDER BY date, created_at";

            $transactions = DB::select($query, $params);

            // Calculate running balance
            $runningBalance = 0;
            foreach ($transactions as &$transaction) {
                $runningBalance += $transaction->debit - $transaction->credit;
                $transaction->running_balance = $runningBalance;
            }

            return [
                'supplier' => $supplier,
                'transactions' => $transactions,
                'opening_balance' => 0, // You can calculate this based on transactions before fromDate
                'closing_balance' => $runningBalance,
                'total_invoices' => collect($transactions)->where('type', 'Invoice')->sum('debit'),
                'total_payments' => collect($transactions)->where('type', 'Payment')->sum('credit'),
                'from_date' => $fromDate,
                'to_date' => $toDate
            ];

        } catch (\Exception $e) {
            Log::error('Error generating supplier statement: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Check if supplier has exceeded credit limit
     */
    public function checkCreditLimit($supplierId, $additionalAmount = 0)
    {
        try {
            $supplier = Supplier::find($supplierId);
            if (!$supplier) {
                throw new \Exception('Supplier not found');
            }

            // If no credit limit set, always allow
            if ($supplier->credit_limit <= 0) {
                return [
                    'within_limit' => true,
                    'credit_limit' => 0,
                    'current_balance' => $supplier->current_balance,
                    'available_credit' => 'Unlimited'
                ];
            }

            $projectedBalance = $supplier->current_balance + $additionalAmount;
            $withinLimit = $projectedBalance <= $supplier->credit_limit;

            return [
                'within_limit' => $withinLimit,
                'credit_limit' => $supplier->credit_limit,
                'current_balance' => $supplier->current_balance,
                'projected_balance' => $projectedBalance,
                'available_credit' => max(0, $supplier->credit_limit - $supplier->current_balance),
                'exceeded_by' => $withinLimit ? 0 : ($projectedBalance - $supplier->credit_limit)
            ];

        } catch (\Exception $e) {
            Log::error('Error checking credit limit: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get supplier aging report
     */
    public function getAgingReport($supplierId = null)
    {
        try {
            $query = "
                SELECT 
                    s.id,
                    s.supplier_code,
                    s.name as supplier_name,
                    s.current_balance,
                    SUM(CASE 
                        WHEN DATEDIFF(CURRENT_DATE, pi.invoice_date) <= 30 
                        THEN pi.balance_amount 
                        ELSE 0 
                    END) as current_due,
                    SUM(CASE 
                        WHEN DATEDIFF(CURRENT_DATE, pi.invoice_date) BETWEEN 31 AND 60 
                        THEN pi.balance_amount 
                        ELSE 0 
                    END) as days_30,
                    SUM(CASE 
                        WHEN DATEDIFF(CURRENT_DATE, pi.invoice_date) BETWEEN 61 AND 90 
                        THEN pi.balance_amount 
                        ELSE 0 
                    END) as days_60,
                    SUM(CASE 
                        WHEN DATEDIFF(CURRENT_DATE, pi.invoice_date) BETWEEN 91 AND 120 
                        THEN pi.balance_amount 
                        ELSE 0 
                    END) as days_90,
                    SUM(CASE 
                        WHEN DATEDIFF(CURRENT_DATE, pi.invoice_date) > 120 
                        THEN pi.balance_amount 
                        ELSE 0 
                    END) as over_120
                FROM suppliers s
                LEFT JOIN purchase_invoices pi ON s.id = pi.supplier_id 
                    AND pi.status = 'POSTED' 
                    AND pi.payment_status != 'PAID'
                WHERE s.is_active = true
            ";

            $params = [];
            if ($supplierId) {
                $query .= " AND s.id = :supplier_id";
                $params['supplier_id'] = $supplierId;
            }

            $query .= " GROUP BY s.id, s.supplier_code, s.name, s.current_balance
                       HAVING s.current_balance > 0
                       ORDER BY s.current_balance DESC";

            $agingData = DB::select($query, $params);

            return [
                'aging_data' => $agingData,
                'summary' => [
                    'total_outstanding' => collect($agingData)->sum('current_balance'),
                    'total_current' => collect($agingData)->sum('current_due'),
                    'total_30_days' => collect($agingData)->sum('days_30'),
                    'total_60_days' => collect($agingData)->sum('days_60'),
                    'total_90_days' => collect($agingData)->sum('days_90'),
                    'total_over_120' => collect($agingData)->sum('over_120')
                ]
            ];

        } catch (\Exception $e) {
            Log::error('Error generating aging report: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Reconcile supplier balance
     */
    public function reconcileBalance($supplierId)
    {
        try {
            DB::beginTransaction();

            $supplier = Supplier::find($supplierId);
            if (!$supplier) {
                throw new \Exception('Supplier not found');
            }

            // Calculate actual balance from transactions
            $totalInvoices = PurchaseInvoice::where('supplier_id', $supplierId)
                ->where('status', '!=', 'CANCELLED')
                ->sum('total_amount');

            $totalPayments = PurchasePayment::where('supplier_id', $supplierId)
                ->where('status', 'COMPLETED')
                ->sum('amount');

            $calculatedBalance = $totalInvoices - $totalPayments;

            // Update supplier balance if different
            if (abs($supplier->current_balance - $calculatedBalance) > 0.01) {
                Log::warning('Supplier balance mismatch detected', [
                    'supplier_id' => $supplierId,
                    'stored_balance' => $supplier->current_balance,
                    'calculated_balance' => $calculatedBalance,
                    'difference' => $supplier->current_balance - $calculatedBalance
                ]);

                $supplier->current_balance = $calculatedBalance;
                $supplier->save();
            }

            DB::commit();

            return [
                'supplier_id' => $supplierId,
                'reconciled_balance' => $calculatedBalance,
                'total_invoices' => $totalInvoices,
                'total_payments' => $totalPayments
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error reconciling supplier balance: ' . $e->getMessage());
            throw $e;
        }
    }
}