<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Schema;


class Ledger extends Model
{
        // use SoftDeletes;
    
    protected $dates = ['deleted_at'];
    protected $fillable = [
        'group_id',
        'name',
        'type',
        'reconciliation',
        'pa',
        'hb',
        'aging',
        'credit_aging',
        'iv',
        'notes',
        'left_code',
        'right_code',
        'is_migrate'
    ];

    protected $casts = [
        'type' => 'boolean',
        'reconciliation' => 'boolean',
        'pa' => 'boolean',
        'hb' => 'boolean',
        'aging' => 'boolean',
        'credit_aging' => 'boolean',
        'iv' => 'boolean',
        'is_migrate' => 'boolean',
    ];

    /**
     * Get the group this ledger belongs to
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class, 'group_id');
    }

    /**
     * Get opening balances for this ledger
     */
    public function openingBalances(): HasMany
    {
        return $this->hasMany(AcYearLedgerBalance::class, 'ledger_id');
    }

    /**
     * Get opening balance for current active year
     */
    public function openingBalance()
    {
		$activeYear = AcYear::where('status', 1)
            ->first();
            
        if (!$activeYear) {
            return 0;
        }
		$ac_year_balance = AcYearLedgerBalance::where('ac_year_id', $activeYear->id)
            ->where('ledger_id', $this->id)
            ->first();
		if(!empty($ac_year_balance)){
			if(!empty((float) $ac_year_balance->cr_amount)){
				return ['balance' => $ac_year_balance->cr_amount, 'balance_type' => 'Cr'];
			}else{
				return ['balance' => $ac_year_balance->dr_amount, 'balance_type' => 'Dr'];
			}
		}else return ['balance' => 0.00, 'balance_type' => 'Dr'];
    }

    /**
     * Get entry items (transactions) for this ledger
     */
    public function entryItems(): HasMany
    {
        return $this->hasMany(EntryItem::class, 'ledger_id');
    }

    /**
     * Check if this is a bank/cash account
     */
    public function isBankAccount(): bool
    {
        return $this->type == 1;
    }

    /**
     * Check if this is an inventory ledger
     */
    public function isInventoryLedger(): bool
    {
        return $this->iv == 1;
    }

    /**
     * Check if aging is enabled (for receivables)
     */
    public function hasAging(): bool
    {
        return $this->aging == 1;
    }

    /**
     * Check if credit aging is enabled (for payables)
     */
    public function hasCreditAging(): bool
    {
        return $this->credit_aging == 1;
    }

    /**
     * Check if reconciliation is enabled
     */
    public function hasReconciliation(): bool
    {
        return $this->reconciliation == 1;
    }

    /**
     * Check if this is a P&L accumulation ledger
     */
    public function isProfitLossAccumulation(): bool
    {
        return $this->pa == 1;
    }

    /**
     * Get the full ledger code
     */
    public function getFullCode(): string
    {
        return ($this->left_code ?? '') . '/' . ($this->right_code ?? '');
    }

    /**
     * Get current balance for this ledger
     */
    public function getCurrentBalance($asOnDate = null): float
    {
        $asOnDate = $asOnDate ?? date('Y-m-d');
        
        // Get active accounting year
        $activeYear = AcYear::where('status', 1)
            ->first();
            
        if (!$activeYear) {
            return 0;
        }

        // Get opening balance
        $openingBalance = AcYearLedgerBalance::where('ac_year_id', $activeYear->id)
            ->where('ledger_id', $this->id)
            ->first();
            
        $openingDr = $openingBalance ? $openingBalance->dr_amount : 0;
        $openingCr = $openingBalance ? $openingBalance->cr_amount : 0;
        $opening = $openingDr - $openingCr;
        // Get transaction balances up to the date
       $transactionBalance = DB::table('entryitems')
			->join('entries', 'entryitems.entry_id', '=', 'entries.id')
			->whereRaw('entryitems.ledger_id::integer = ?', [$this->id])
			->whereDate('entries.date', '<=', $asOnDate)
			->selectRaw("SUM(CASE WHEN entryitems.dc = 'D' THEN entryitems.amount ELSE -entryitems.amount END) as balance")
			->value('balance') ?? 0;

        return $opening + $transactionBalance;
    }

    /**
     * Get formatted balance with currency
     */
    public function getFormattedBalance($asOnDate = null): string
    {
        $balance = $this->getCurrentBalance($asOnDate);
		
        return ($balance >= 0 ? number_format(abs($balance), 2) : '(' . number_format(abs($balance), 2) . ')');
    }

    /**
     * Get inventory balance (quantity)
     */
    public function getInventoryBalance($asOnDate = null): ?int
    {
        if (!$this->isInventoryLedger()) {
            return null;
        }

        $asOnDate = $asOnDate ?? date('Y-m-d');
        
        // Get active accounting year
        $activeYear = AcYear::where('status', 1)
            ->first();
            
        if (!$activeYear) {
            return 0;
        }

        // Get opening quantity
        $openingBalance = AcYearLedgerBalance::where('ac_year_id', $activeYear->id)
            ->where('ledger_id', $this->id)
            ->first();
            
        $openingQty = $openingBalance ? $openingBalance->quantity : 0;
        // Get transaction quantities up to the date
        $transactionQty = DB::table('entryitems')
			->join('entries', 'entryitems.entry_id', '=', 'entries.id')
			->whereRaw('entryitems.ledger_id::integer = ?', [$this->id])
			->whereDate('entries.date', '<=', $asOnDate)
			->selectRaw("SUM(CASE WHEN entryitems.dc = 'D' THEN entryitems.quantity ELSE -entryitems.quantity END) as qty_balance")
			->value('qty_balance') ?? 0;

        return $openingQty + $transactionQty;
    }

    /**
     * Check if ledger has transactions
     */
    public function hasTransactions(): bool
    {
        return $this->entryItems()->exists();
    }

    /**
     * Get recent transactions
     */
    public function getRecentTransactions($limit = 10)
    {
        return $this->entryItems()
            ->with(['entry' => function($query) {
                $query->select('id', 'date', 'entry_code', 'narration', 'entrytype_id');
            }])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get ledger type based on group
     */
    public function getLedgerType(): string
    {
        if (!$this->group) {
            return 'Unknown';
        }

        return $this->group->getGroupType();
    }

    /**
     * Get debit/credit nature based on group type
     */
    public function getNormalBalance(): string
    {
        $groupCode = $this->group ? intval($this->group->code) : 0;
        
        // Assets and Expenses have debit normal balance
        if (($groupCode >= 1000 && $groupCode <= 1999) || 
            ($groupCode >= 5000 && $groupCode <= 6999) || 
            ($groupCode >= 9000 && $groupCode <= 9999)) {
            return 'debit';
        }
        
        // Liabilities, Equity, and Income have credit normal balance
        if (($groupCode >= 2000 && $groupCode <= 2999) || 
            ($groupCode >= 3000 && $groupCode <= 3999) || 
            ($groupCode >= 4000 && $groupCode <= 4999) || 
            ($groupCode >= 8000 && $groupCode <= 8999)) {
            return 'credit';
        }
        
        return 'debit'; // Default
    }

    /**
     * Check if ledger can be deleted
     */
    public function canBeDeleted(): bool
    {
        // Cannot delete if it has transactions
        if ($this->hasTransactions()) {
            return false;
        }

        return true;
    }

    /**
     * Scope to get only bank/cash accounts
     */
    public function scopeBankAccounts($query)
    {
        return $query->where('type', 1);
    }

    /**
     * Scope to get only inventory ledgers
     */
    public function scopeInventoryLedgers($query)
    {
        return $query->where('iv', 1);
    }

    /**
     * Scope to get ledgers with aging enabled
     */
    public function scopeWithAging($query)
    {
        return $query->where('aging', 1);
    }

    /**
     * Scope to get ledgers with credit aging enabled
     */
    public function scopeWithCreditAging($query)
    {
        return $query->where('credit_aging', 1);
    }

    /**
     * Scope to get ledgers with reconciliation enabled
     */
    public function scopeWithReconciliation($query)
    {
        return $query->where('reconciliation', 1);
    }

    /**
     * Get aging analysis for receivables
     */
    public function getAgingAnalysis($asOnDate = null)
    {
        if (!$this->hasAging()) {
            return null;
        }

        $asOnDate = $asOnDate ?? date('Y-m-d');
        
        // This would typically involve complex aging calculation
        // Based on invoice dates, payment dates, etc.
        // Implementation depends on your specific aging requirements
        
        return [
            'current' => 0,
            '30_days' => 0,
            '60_days' => 0,
            '90_days' => 0,
            'over_90_days' => 0,
            'total' => $this->getCurrentBalance($asOnDate)
        ];
    }

    /**
     * Create or update opening balance
     */
    public function setOpeningBalance($amount, $type = 'dr', $acYearId = null, $quantity = 0, $unitPrice = 0, $uomId = null)
    {
        if (!$acYearId) {
            $activeYear = AcYear::where('status', 1)
                ->first();
                
            if (!$activeYear) {
                throw new \Exception('No active accounting year found');
            }
            
            $acYearId = $activeYear->id;
        }

        $balance = AcYearLedgerBalance::updateOrCreate(
            [
                'ac_year_id' => $acYearId,
                'ledger_id' => $this->id
            ],
            [
                'dr_amount' => $type === 'dr' ? $amount : 0,
                'cr_amount' => $type === 'cr' ? $amount : 0,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'uom_id' => $uomId
            ]
        );

        return $balance;
    }


   /*  public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    public function vendors(): HasMany
    {
        return $this->hasMany(Vendor::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    } */

    public function entries(): HasMany
    {
        return $this->hasMany(EntryItem::class, 'ledger_id');
    }
      public function getReferencedByAttribute()
    {
        $references = [];
        
        // Check suppliers
        $supplierCount = Supplier::where('ledger_id', $this->id)
            ->whereNull('deleted_at')
            ->count();
        if ($supplierCount > 0) {
            $references['suppliers'] = $supplierCount;
        }
        
        // Check customers if table exists
        if (Schema::hasTable('customers')) {
            $customerCount = \App\Models\Customer::where('ledger_id', $this->id)
                ->whereNull('deleted_at')
                ->count();
            if ($customerCount > 0) {
                $references['customers'] = $customerCount;
            }
        }
        
        // Check products if table exists
        if (Schema::hasTable('products')) {
            $productCount = \App\Models\Product::where('ledger_id', $this->id)
                ->whereNull('deleted_at')
                ->count();
            if ($productCount > 0) {
                $references['products'] = $productCount;
            }
        }
        
        return $references;
    }
    
    /**
     * Check if ledger can be safely deleted
     */
    public function canBeSafelyDeleted()
    {
        // Check for transactions
        if ($this->hasTransactions()) {
            return ['can_delete' => false, 'reason' => 'Has existing transactions'];
        }
        
        // Check for references
        $references = $this->referenced_by;
        if (!empty($references)) {
            $entities = array_keys($references);
            $counts = array_values($references);
            $message = 'Referenced by: ' . implode(', ', array_map(function($entity, $count) {
                return "$count $entity";
            }, $entities, $counts));
            
            return ['can_delete' => false, 'reason' => $message];
        }
        
        return ['can_delete' => true, 'reason' => null];
    }
}