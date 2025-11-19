<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Group extends Model
{
    protected $fillable = [
        'parent_id',
        'name',
        'code',
        'fixed',
        'tc',
        'td',
        'ac',
        'pd',
        'added_by'
    ];

    protected $casts = [
        'fixed' => 'boolean',
        'tc' => 'boolean',
        'td' => 'boolean',
        'ac' => 'boolean',
        'pd' => 'boolean',
    ];

    /**
     * Get the parent group
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Group::class, 'parent_id');
    }

    /**
     * Get child groups
     */
    public function children(): HasMany
    {
        return $this->hasMany(Group::class, 'parent_id')->orderBy('code');
    }

    /**
     * Get all descendant groups recursively
     */
    public function descendants(): HasMany
    {
        return $this->children()->with('descendants');
    }

    /**
     * Get ledgers under this group
     */
    public function ledgers(): HasMany
    {
        return $this->hasMany(Ledger::class, 'group_id')->orderBy('name');
    }

    /**
     * Get the user who added this group
     */
    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }

    /**
     * Check if this group is a system group
     */
    public function isSystemGroup(): bool
    {
        return $this->fixed == 1;
    }

    /**
     * Check if group can be deleted
     */
    public function canBeDeleted(): bool
    {
        // Cannot delete if it's a system group
        if ($this->isSystemGroup()) {
            return false;
        }

        // Cannot delete if it has child groups
        if ($this->children()->exists()) {
            return false;
        }

        // Cannot delete if it has ledgers
        if ($this->ledgers()->exists()) {
            return false;
        }

        return true;
    }

    /**
     * Check if group can be edited
     */
    public function canBeEdited(): bool
    {
        return !$this->isSystemGroup();
    }

    /**
     * Get the full hierarchy path
     */
    public function getHierarchyPath(): string
    {
        $path = [];
        $current = $this;
        
        while ($current) {
            array_unshift($path, $current->name . ' (' . $current->code . ')');
            $current = $current->parent;
        }
        
        return implode(' > ', $path);
    }

    /**
     * Get group type based on code range
     */
    public function getGroupType(): string
    {
        $code = intval($this->code);
        
        if ($code >= 1000 && $code <= 1999) {
            return 'Assets';
        } elseif ($code >= 2000 && $code <= 2999) {
            return 'Liabilities';
        } elseif ($code >= 3000 && $code <= 3999) {
            return 'Equity';
        } elseif ($code >= 4000 && $code <= 4999) {
            return 'Revenue';
        } elseif ($code >= 5000 && $code <= 5999) {
            return 'Direct Cost';
        } elseif ($code >= 6000 && $code <= 6999) {
            return 'Expenses';
        } elseif ($code >= 8000 && $code <= 8999) {
            return 'Other Income';
        } elseif ($code >= 9000 && $code <= 9999) {
            return 'Taxation';
        }
        
        return 'Unknown';
    }

    /**
     * Get all ledger IDs under this group (including sub-groups)
     */
    public function getAllLedgerIds(): array
    {
        $ledgerIds = $this->ledgers()->pluck('id')->toArray();
        
        foreach ($this->children as $child) {
            $ledgerIds = array_merge($ledgerIds, $child->getAllLedgerIds());
        }
        
        return $ledgerIds;
    }

    /**
     * Scope to get only top-level groups
     */
    public function scopeTopLevel($query)
    {
        return $query->where('parent_id', 0);
    }

    /**
     * Scope to get only user-created groups
     */
    public function scopeUserCreated($query)
    {
        return $query->where('fixed', 0);
    }

    /**
     * Scope to get only system groups
     */
    public function scopeSystemGroups($query)
    {
        return $query->where('fixed', 1);
    }

    /**
     * Get groups in hierarchical order for dropdowns
     */
    public static function getHierarchicalList($excludeId = null, $parentId = 0, $prefix = '')
    {
        $query = static::where('parent_id', $parentId)->orderBy('code');
        
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }
        
        $groups = $query->get();
        $result = collect();
        
        foreach ($groups as $group) {
            // Skip if this is a descendant of excludeId
            if ($excludeId && $group->isDescendantOf($excludeId)) {
                continue;
            }
            
            $group->display_name = $prefix . $group->name . ' (' . $group->code . ')';
            $result->push($group);
            
            // Get children with increased prefix
            $children = static::getHierarchicalList($excludeId, $group->id, $prefix . '&nbsp;&nbsp;&nbsp;&nbsp;');
            $result = $result->merge($children);
        }
        
        return $result;
    }

    /**
     * Check if this group is a descendant of another group
     */
    public function isDescendantOf($ancestorId): bool
    {
        $current = $this->parent;
        
        while ($current) {
            if ($current->id == $ancestorId) {
                return true;
            }
            $current = $current->parent;
        }
        
        return false;
    }

    /**
     * Get the base (root) group
     */
    public function getBaseGroup(): Group
    {
        $current = $this;
        
        while ($current->parent_id != 0) {
            $current = $current->parent;
        }
        
        return $current;
    }

    /**
     * Validate if code is within valid range for the group hierarchy
     */
    public function isValidCodeForHierarchy($code): bool
    {
        if ($this->parent_id == 0) {
            // This is a top-level group, code validation depends on business rules
            return true;
        }

        $baseGroup = $this->getBaseGroup();
        $baseCode = intval($baseGroup->code);
        $codeInt = intval($code);
        
        // Code must be within the thousand series of the base code
        $rangeStart = $baseCode;
        $rangeEnd = $baseCode + 999;
        
        // The sub-group code cannot be the same as base code
        if ($codeInt == $baseCode) {
            return false;
        }
        
        return $codeInt >= $rangeStart && $codeInt <= $rangeEnd;
    }
        public function scopeTradeDebtors($query)
    {
        return $query->where('td', 1);
    }

    public function scopeTradeCreditors($query)
    {
        return $query->where('tc', 1);
    }
        public function scopeBudgetGroups($query)
    {
        return $query->whereIn('code', ['1000', '4000', '5000', '6000','8000']);
    }
}