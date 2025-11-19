<?php
// app/Helpers/PurchaseSettingsHelper.php

namespace App\Helpers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class PurchaseSettingsHelper
{
    /**
     * Get purchase-specific system setting
     * 
     * @param string $key The setting key
     * @param mixed $default Default value if setting not found
     * @return mixed
     */
    public static function getSetting($key, $default = null)
    {
        return Cache::remember("purchase_setting_{$key}", 3600, function () use ($key, $default) {
            $value = DB::table('system_settings')
                ->where('key', $key)
                ->where('type', 'PURCHASE')
                ->value('value');
                
            return $value !== null ? $value : $default;
        });
    }
    
    /**
     * Get all purchase settings
     * 
     * @return array
     */
    public static function getAllSettings()
    {
        return Cache::remember('purchase_settings_all', 3600, function () {
            $settings = DB::table('system_settings')
                ->where('type', 'PURCHASE')
                ->pluck('value', 'key')
                ->toArray();
                
            return $settings;
        });
    }
    
    /**
     * Update purchase setting
     * 
     * @param string $key
     * @param mixed $value
     * @return bool
     */
    public static function setSetting($key, $value)
    {
        // Clear cache
        Cache::forget("purchase_setting_{$key}");
        Cache::forget('purchase_settings_all');
        
        return DB::table('system_settings')
            ->updateOrInsert(
                [
                    'key' => $key,
                    'type' => 'PURCHASE'
                ],
                [
                    'value' => $value,
                    'updated_at' => now()
                ]
            );
    }
    
    /**
     * Get tax inclusive product setting
     * 
     * @return bool
     */
    public static function isTaxInclusiveProduct()
    {
        $value = self::getSetting('tax_inclusive_product', 0);
        return (bool) $value;
    }
    
    /**
     * Get other charges ledger ID
     * 
     * @return int|null
     */
    public static function getOtherChargesLedgerId()
    {
        $value = self::getSetting('other_charges_ledger_id');
        return $value ? (int) $value : null;
    }
    
    /**
     * Get approval settings
     * 
     * @return array
     */
    public static function getApprovalSettings()
    {
        return [
            'enabled' => (bool) self::getSetting('is_purchase_order_approval', 0),
            'authorities' => self::getSetting('purchase_approval_authorities', ''),
            'member_count' => (int) self::getSetting('purchase_approval_member_nos', 1),
            'min_amount' => (float) self::getSetting('purchase_minimum_approval_amount', 500)
        ];
    }
    
    /**
     * Verify all required ledger mappings exist
     * 
     * @return array
     */
    public static function verifyLedgerMappings()
    {
        $issues = [];
        
        // Check other charges ledger
        $otherChargesLedger = self::getOtherChargesLedgerId();
        if (!$otherChargesLedger) {
            $issues[] = 'Other charges ledger not configured';
        } else {
            // Verify the ledger exists
            $exists = DB::table('ledgers')->where('id', $otherChargesLedger)->exists();
            if (!$exists) {
                $issues[] = "Other charges ledger ID {$otherChargesLedger} does not exist";
            }
        }
        
        // Check products without ledger mapping
        $unmappedProducts = DB::table('products')
            ->whereNull('ledger_id')
            ->where('is_active', 1)
            ->count();
            
        if ($unmappedProducts > 0) {
            $issues[] = "{$unmappedProducts} active products without ledger mapping";
        }
        
        // Check services without ledger mapping
        $unmappedServices = DB::table('services')
            ->whereNull('ledger_id')
            ->where('is_active', 1)
            ->count();
            
        if ($unmappedServices > 0) {
            $issues[] = "{$unmappedServices} active services without ledger mapping";
        }
        
        // Check suppliers without ledger mapping
        $unmappedSuppliers = DB::table('suppliers')
            ->whereNull('ledger_id')
            ->where('is_active', 1)
            ->count();
            
        if ($unmappedSuppliers > 0) {
            $issues[] = "{$unmappedSuppliers} active suppliers without ledger mapping";
        }
        
        // Check tax rates without ledger mapping
        $unmappedTaxes = DB::table('tax_master')
            ->whereNull('ledger_id')
            ->where('is_active', 1)
            ->count();
            
        if ($unmappedTaxes > 0) {
            $issues[] = "{$unmappedTaxes} active tax rates without ledger mapping";
        }
        
        return [
            'valid' => empty($issues),
            'issues' => $issues
        ];
    }
}

// =====================================================
// Updated performAccountMigration method in PurchaseInvoiceController
// =====================================================

/**
 * Core account migration logic - Updated version with corrected settings retrieval
 */
private function performAccountMigration(PurchaseInvoice $invoice)
{
    try {
        // Check if already migrated
        if ($invoice->account_migration == 1) {
            return [
                'success' => false,
                'error' => 'Already migrated'
            ];
        }

        // Load relationships if not loaded
        $invoice->load(['items.product', 'items.service', 'items.tax', 'supplier']);

        // Get system settings using helper or direct query
        $taxInclusiveProduct = PurchaseSettingsHelper::isTaxInclusiveProduct();
        $otherChargesLedgerId = PurchaseSettingsHelper::getOtherChargesLedgerId();
        
        // Alternative: Direct query if helper is not available
        // $taxInclusiveProduct = DB::table('system_settings')
        //     ->where('key', 'tax_inclusive_product')
        //     ->where('type', 'PURCHASE')
        //     ->value('value') ?? 0;
        //     
        // $otherChargesLedgerId = DB::table('system_settings')
        //     ->where('key', 'other_charges_ledger_id')
        //     ->where('type', 'PURCHASE')
        //     ->value('value');
        
        // Get default fund (first fund in the system)
        $fund = Fund::first();
        if (!$fund) {
            return [
                'success' => false,
                'error' => 'No fund found in system'
            ];
        }

        // Generate journal entry code
        $entryCode = $this->generateJournalCode($invoice->invoice_date);

        // Create main journal entry
        $journalEntry = new Entry();
        $journalEntry->entrytype_id = 4; // Journal
        $journalEntry->entry_code = $entryCode;
        $journalEntry->number = $entryCode;
        $journalEntry->date = $invoice->invoice_date;
        $journalEntry->inv_type = 2; // Purchase Invoice type
        $journalEntry->inv_id = $invoice->id;
        $journalEntry->fund_id = $fund->id;
        $journalEntry->narration = "Purchase Invoice: {$invoice->invoice_number} from {$invoice->supplier->name}";
        $journalEntry->created_by = Auth::id() ?? $invoice->created_by;
        
        // Calculate totals for verification
        $totalDebit = 0;
        $totalCredit = 0;

        // Prepare entry items array
        $entryItems = [];

        // Process each invoice item
        foreach ($invoice->items as $item) {
            $ledgerId = null;
            $amount = 0;

            // Determine ledger ID based on item type
            if ($item->item_type === 'product') {
                $ledgerId = $item->product->ledger_id ?? null;
                if (!$ledgerId) {
                    return [
                        'success' => false,
                        'error' => "Product '{$item->product->name}' missing ledger mapping"
                    ];
                }
            } elseif ($item->item_type === 'service') {
                $ledgerId = $item->service->ledger_id ?? null;
                if (!$ledgerId) {
                    return [
                        'success' => false,
                        'error' => "Service '{$item->service->name}' missing ledger mapping"
                    ];
                }
            }

            // Calculate amount based on tax inclusive setting
            if ($taxInclusiveProduct == 1) {
                // Tax inclusive - include tax in product price
                $amount = $item->total_amount; // This includes tax
                
                $entryItems[] = [
                    'ledger_id' => $ledgerId,
                    'amount' => $amount,
                    'dc' => 'D', // Debit
                    'details' => "{$item->quantity} x {$item->description ?? ($item->product->name ?? $item->service->name)}"
                ];
                
                $totalDebit += $amount;
            } else {
                // Tax exclusive - separate tax entries
                $amount = $item->subtotal; // Without tax
                
                // Add product/service entry
                $entryItems[] = [
                    'ledger_id' => $ledgerId,
                    'amount' => $amount,
                    'dc' => 'D', // Debit
                    'details' => "{$item->quantity} x {$item->description ?? ($item->product->name ?? $item->service->name)}"
                ];
                
                $totalDebit += $amount;
                
                // Add tax entry if applicable
                if ($item->tax_amount > 0 && $item->tax_id) {
                    $taxLedgerId = $item->tax->ledger_id ?? null;
                    if (!$taxLedgerId) {
                        return [
                            'success' => false,
                            'error' => "Tax rate missing ledger mapping"
                        ];
                    }
                    
                    $entryItems[] = [
                        'ledger_id' => $taxLedgerId,
                        'amount' => $item->tax_amount,
                        'dc' => 'D', // Debit
                        'details' => "Tax on {$item->description ?? ($item->product->name ?? $item->service->name)}"
                    ];
                    
                    $totalDebit += $item->tax_amount;
                }
            }
        }

        // Add shipping charges and other charges as combined entry
        $totalCharges = ($invoice->shipping_charges ?? 0) + ($invoice->other_charges ?? 0);
        
        if ($totalCharges > 0) {
            if (!$otherChargesLedgerId) {
                return [
                    'success' => false,
                    'error' => 'Other charges ledger not configured in system settings'
                ];
            }
            
            // Create a single entry for both shipping and other charges
            $chargeDetails = [];
            if ($invoice->shipping_charges > 0) {
                $chargeDetails[] = "Shipping: " . number_format($invoice->shipping_charges, 2);
            }
            if ($invoice->other_charges > 0) {
                $chargeDetails[] = "Other: " . number_format($invoice->other_charges, 2);
            }
            
            $entryItems[] = [
                'ledger_id' => $otherChargesLedgerId,
                'amount' => $totalCharges,
                'dc' => 'D', // Debit
                'details' => implode(', ', $chargeDetails)
            ];
            
            $totalDebit += $totalCharges;
        }

        // Add supplier credit entry
        $supplierLedgerId = $invoice->supplier->ledger_id ?? null;
        if (!$supplierLedgerId) {
            return [
                'success' => false,
                'error' => "Supplier '{$invoice->supplier->name}' missing ledger mapping"
            ];
        }

        $entryItems[] = [
            'ledger_id' => $supplierLedgerId,
            'amount' => $invoice->total_amount,
            'dc' => 'C', // Credit
            'details' => "Invoice: {$invoice->invoice_number}"
        ];
        
        $totalCredit = $invoice->total_amount;

        // Verify journal is balanced
        if (abs($totalDebit - $totalCredit) > 0.01) {
            Log::error('Journal entry not balanced', [
                'invoice_id' => $invoice->id,
                'debit_total' => $totalDebit,
                'credit_total' => $totalCredit,
                'difference' => abs($totalDebit - $totalCredit)
            ]);
            
            return [
                'success' => false,
                'error' => "Journal not balanced. Dr: {$totalDebit}, Cr: {$totalCredit}"
            ];
        }

        // Set totals on journal entry
        $journalEntry->dr_total = $totalDebit;
        $journalEntry->cr_total = $totalCredit;
        $journalEntry->save();

        // Create entry items
        foreach ($entryItems as $itemData) {
            $entryItem = new EntryItem();
            $entryItem->entry_id = $journalEntry->id;
            $entryItem->ledger_id = $itemData['ledger_id'];
            $entryItem->amount = $itemData['amount'];
            $entryItem->dc = $itemData['dc'];
            $entryItem->details = $itemData['details'] ?? null;
            $entryItem->save();
        }

        // Update invoice to mark as migrated
        $invoice->account_migration = 1;
        $invoice->journal_entry_id = $journalEntry->id;
        $invoice->save();

        Log::info('Invoice successfully migrated to accounting', [
            'invoice_id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'journal_entry_id' => $journalEntry->id,
            'journal_code' => $entryCode
        ]);

        return [
            'success' => true,
            'journal_entry_id' => $journalEntry->id,
            'journal_code' => $entryCode
        ];

    } catch (\Exception $e) {
        Log::error('Account migration failed', [
            'invoice_id' => $invoice->id,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}