<?php

namespace App\Http\Controllers;

use App\Models\PurchaseInvoice;
use App\Models\PurchasePayment;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Exports\PurchaseDueReportExport;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;

class PurchaseDueReportController extends Controller
{
    /**
     * Get overdue invoices report with aging buckets
     */
    public function getDueReport(Request $request)
    {
        try {
            $viewType = $request->get('view', 'summary'); // 'summary' or 'detailed'
            $supplierId = $request->get('supplier_id');
            $asOfDate = $request->get('as_of_date', Carbon::now()->format('Y-m-d'));
            
            $query = PurchaseInvoice::with(['supplier', 'payments'])
                ->where('status', 'POSTED')
                ->where('payment_status', '!=', 'PAID');
            
            if ($supplierId) {
                $query->where('supplier_id', $supplierId);
            }
            
            $invoices = $query->get();
          
            // Process aging buckets
            $agingData = $this->processAgingBuckets($invoices, $asOfDate);
            
            if ($viewType === 'summary') {
                $report = $this->generateSummaryReport($agingData);
            } else {
                $report = $this->generateDetailedReport($agingData);
            }
             
            // Add totals
            $report['totals'] = $this->calculateTotals($agingData);
            $report['as_of_date'] = $asOfDate;
         
            return response()->json([
                'success' => true,
                'data' => $report
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating due report',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get supplier statement of account
     */
    public function getSupplierStatement(Request $request, $supplierId)
    {
        try {
            $fromDate = $request->get('from_date', Carbon::now()->subMonths(6)->format('Y-m-d'));
            $toDate = $request->get('to_date', Carbon::now()->format('Y-m-d'));
          
            $supplier = Supplier::findOrFail($supplierId);
            
            // Get opening balance (invoices before from_date)
            $openingBalance = PurchaseInvoice::where('supplier_id', $supplierId)
                ->where('status', 'POSTED')
                ->where('invoice_date', '<', $fromDate)
                ->sum(DB::raw('total_amount - paid_amount'));
          
            // Get all transactions within date range
            $transactions = collect();
            
            // Get invoices
            $invoices = PurchaseInvoice::where('supplier_id', $supplierId)
                ->where('status', 'POSTED')
                ->whereBetween('invoice_date', [$fromDate, $toDate])
                ->get();
            
            foreach ($invoices as $invoice) {
                $transactions->push([
                    'date' => $invoice->invoice_date,
                    'type' => 'INVOICE',
                    'reference' => $invoice->invoice_number,
                    'description' => 'Purchase Invoice',
                    'debit' => $invoice->total_amount,
                    'credit' => 0,
                    'invoice_id' => $invoice->id
                ]);
            }
            
            // Get payments
            $payments = PurchasePayment::where('supplier_id', $supplierId)
                ->where('status', 'COMPLETED')
                ->whereBetween('payment_date', [$fromDate, $toDate])
                ->with('invoice')
                ->get();
            
            foreach ($payments as $payment) {
                $transactions->push([
                    'date' => $payment->payment_date,
                    'type' => 'PAYMENT',
                    'reference' => $payment->payment_number,
                    'description' => 'Payment for ' . ($payment->invoice ? $payment->invoice->invoice_number : 'Account'),
                    'debit' => 0,
                    'credit' => $payment->amount,
                    'invoice_id' => $payment->invoice_id
                ]);
            }
            
            // Sort by date and calculate running balance
            $transactions = $transactions->sortBy('date')->values();
            $runningBalance = $openingBalance;
            
            $statement = [];
            foreach ($transactions as $transaction) {
                $runningBalance += ($transaction['debit'] - $transaction['credit']);
                $statement[] = array_merge($transaction, ['balance' => $runningBalance]);
            }
            
            return response()->json([
                'success' => true,
                'data' => [
                    'supplier' => $supplier,
                    'period' => [
                        'from' => $fromDate,
                        'to' => $toDate
                    ],
                    'opening_balance' => $openingBalance,
                    'transactions' => $statement,
                    'closing_balance' => $runningBalance,
                    'total_invoices' => $transactions->where('type', 'INVOICE')->sum('debit'),
                    'total_payments' => $transactions->where('type', 'PAYMENT')->sum('credit')
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating supplier statement',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get payment timeline for an invoice
     */
    public function getPaymentTimeline($invoiceId)
    {
        try {
            $invoice = PurchaseInvoice::with(['supplier', 'payments.paymentMode', 'payments.creator'])
                ->findOrFail($invoiceId);
            
            $timeline = [];
            
            // Invoice created
            $timeline[] = [
                'date' => $invoice->created_at,
                'type' => 'invoice_created',
                'title' => 'Invoice Created',
                'description' => "Invoice {$invoice->invoice_number} created",
                'amount' => $invoice->total_amount,
                'icon' => 'file-text',
                'color' => 'primary'
            ];
            
            // Invoice posted
            if ($invoice->status === 'POSTED') {
                $timeline[] = [
                    'date' => $invoice->updated_at,
                    'type' => 'invoice_posted',
                    'title' => 'Invoice Posted',
                    'description' => 'Invoice posted to accounts',
                    'icon' => 'check-circle',
                    'color' => 'success'
                ];
            }
            
            // Payments
            foreach ($invoice->payments as $payment) {
                $timeline[] = [
                    'date' => $payment->payment_date,
                    'type' => 'payment',
                    'title' => "Payment Received",
                    'description' => "Payment {$payment->payment_number} via {$payment->paymentMode->name}",
                    'amount' => $payment->amount,
                    'reference' => $payment->reference_number,
                    'created_by' => $payment->creator ? $payment->creator->name : 'System',
                    'icon' => 'credit-card',
                    'color' => 'info'
                ];
            }
            
            // Due date
            if ($invoice->payment_due_date) {
                $isPastDue = Carbon::parse($invoice->payment_due_date)->isPast();
                $timeline[] = [
                    'date' => $invoice->payment_due_date,
                    'type' => 'due_date',
                    'title' => $isPastDue ? 'Payment Overdue' : 'Payment Due',
                    'description' => $isPastDue ? 'Payment is overdue' : 'Payment due on this date',
                    'icon' => 'calendar-x',
                    'color' => $isPastDue ? 'danger' : 'warning',
                    'is_milestone' => true
                ];
            }
            
            // Sort timeline by date
            $timeline = collect($timeline)->sortBy('date')->values();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'invoice' => [
                        'id' => $invoice->id,
                        'number' => $invoice->invoice_number,
                        'total_amount' => $invoice->total_amount,
                        'paid_amount' => $invoice->paid_amount,
                        'balance_amount' => $invoice->balance_amount,
                        'payment_status' => $invoice->payment_status,
                        'supplier' => $invoice->supplier->name
                    ],
                    'timeline' => $timeline
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching payment timeline',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
   
    // Private helper methods
    
    private function processAgingBuckets($invoices, $asOfDate)
    {
        $agingData = [];
        $asOfDateCarbon = Carbon::parse($asOfDate);
  
        foreach ($invoices as $invoice) {
               
            $dueDate = Carbon::parse($invoice->payment_due_date);
            $daysOverdue = $dueDate->diffInDays($asOfDateCarbon);
                     
            // Determine aging bucket
            if ($daysOverdue <= 30) {
                $bucket = 'current';
            } elseif ($daysOverdue <= 60) {
                $bucket = '31_60_days';
            } elseif ($daysOverdue <= 90) {
                $bucket = '61_90_days';
            } else {
                $bucket = 'over_90_days';
            }
            
            $supplierId = $invoice->supplier_id;
           
            if (!isset($agingData[$supplierId])) {
                $agingData[$supplierId] = [
                    'supplier' => $invoice->supplier,
                    'invoices' => [],
                    'buckets' => [
                        'current' => 0,
                        '31_60_days' => 0,
                        '61_90_days' => 0,
                        'over_90_days' => 0,
                        'total' => 0
                    ]
                ];
            }
            
            $agingData[$supplierId]['invoices'][] = [
                'invoice' => $invoice,
                'days_overdue' => $daysOverdue,
                'bucket' => $bucket,
                'balance' => $invoice->balance_amount
            ];
            
            $agingData[$supplierId]['buckets'][$bucket] += $invoice->balance_amount;
            $agingData[$supplierId]['buckets']['total'] += $invoice->balance_amount;
        }
        
        return $agingData;
    }
    
    private function generateSummaryReport($agingData)
    {
        $summary = [];
        
        foreach ($agingData as $supplierId => $data) {
            $summary[] = [
                'supplier_id' => $supplierId,
                'supplier_name' => $data['supplier']->name,
                'supplier_code' => $data['supplier']->supplier_code,
                'invoice_count' => count($data['invoices']),
                'current' => $data['buckets']['current'],
                '31_60_days' => $data['buckets']['31_60_days'],
                '61_90_days' => $data['buckets']['61_90_days'],
                'over_90_days' => $data['buckets']['over_90_days'],
                'total_due' => $data['buckets']['total']
            ];
        }
        
        return ['summary' => $summary];
    }
    
    private function generateDetailedReport($agingData)
    {
        $detailed = [];
        
        foreach ($agingData as $supplierId => $data) {
            $supplierDetails = [
                'supplier' => [
                    'id' => $supplierId,
                    'name' => $data['supplier']->name,
                    'code' => $data['supplier']->supplier_code,
                    'contact' => $data['supplier']->mobile_no,
                    'email' => $data['supplier']->email
                ],
                'buckets' => $data['buckets'],
                'invoices' => []
            ];
            
            foreach ($data['invoices'] as $invoiceData) {
                $invoice = $invoiceData['invoice'];
                $supplierDetails['invoices'][] = [
                    'invoice_number' => $invoice->invoice_number,
                    'invoice_date' => $invoice->invoice_date,
                    'due_date' => $invoice->payment_due_date,
                    'days_overdue' => $invoiceData['days_overdue'],
                    'total_amount' => $invoice->total_amount,
                    'paid_amount' => $invoice->paid_amount,
                    'balance' => $invoice->balance_amount,
                    'bucket' => $invoiceData['bucket']
                ];
            }
            
            // Sort invoices by days overdue
            usort($supplierDetails['invoices'], function($a, $b) {
                return $b['days_overdue'] - $a['days_overdue'];
            });
            
            $detailed[] = $supplierDetails;
        }
        
        return ['detailed' => $detailed];
    }
    
    private function calculateTotals($agingData)
    {
        $totals = [
            'current' => 0,
            '31_60_days' => 0,
            '61_90_days' => 0,
            'over_90_days' => 0,
            'total' => 0,
            'supplier_count' => count($agingData),
            'invoice_count' => 0
        ];
        
        foreach ($agingData as $data) {
            $totals['current'] += $data['buckets']['current'];
            $totals['31_60_days'] += $data['buckets']['31_60_days'];
            $totals['61_90_days'] += $data['buckets']['61_90_days'];
            $totals['over_90_days'] += $data['buckets']['over_90_days'];
            $totals['total'] += $data['buckets']['total'];
            $totals['invoice_count'] += count($data['invoices']);
        }
        
        return $totals;
    }
}