<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

/**
 * UOM Conversion Service
 * Handles all unit of measurement conversions
 */
class UomService
{
    /**
     * Get UOM information with caching
     */
    public function getUomInfo($uomId)
    {
        if (!$uomId) {
            return $this->getDefaultUomInfo();
        }

        return Cache::remember("uom_info_{$uomId}", 3600, function () use ($uomId) {
            $uom = DB::table('uoms')->where('id', $uomId)->first();
            
            if (!$uom) {
                return $this->getDefaultUomInfo();
            }

            // Get base UOM if exists
            $baseUom = null;
            if ($uom->base_unit) {
                $baseUom = DB::table('uoms')->where('id', $uom->base_unit)->first();
            }

            return [
                'id' => $uom->id,
                'display_name' => $uom->name,
                'display_code' => $uom->code,
                'base_unit_id' => $uom->base_unit,
                'base_name' => $baseUom ? $baseUom->name : $uom->name,
                'base_code' => $baseUom ? $baseUom->code : $uom->code,
                'conversion_factor' => floatval($uom->conversion_factor ?? 1),
                'is_base' => !$uom->base_unit
            ];
        });
    }

    /**
     * Get default UOM info
     */
    private function getDefaultUomInfo()
    {
        return [
            'id' => null,
            'display_name' => 'Units',
            'display_code' => 'UNT',
            'base_unit_id' => null,
            'base_name' => 'Units',
            'base_code' => 'UNT',
            'conversion_factor' => 1,
            'is_base' => true
        ];
    }

    /**
     * Convert quantity from display UOM to base UOM
     * 
     * Example: 5 Metre * 100 = 500 Centimetre
     */
    // public function convertToBaseUnit($quantity, $uomId)
    // {
    //     $uomInfo = $this->getUomInfo($uomId);
    //     return $quantity * $uomInfo['conversion_factor'];
    // }

    /**
     * Convert quantity from base UOM to display UOM
     * 
     * Example: 500 Centimetre / 100 = 5 Metre
     */
    // public function convertToDisplayUnit($quantity, $uomId)
    // {
    //     $uomInfo = $this->getUomInfo($uomId);
        
    //     if ($uomInfo['conversion_factor'] == 0 || $uomInfo['conversion_factor'] == 1) {
    //         return $quantity;
    //     }
        
    //     return $quantity / $uomInfo['conversion_factor'];
    // }

    /**
     * Format quantity with UOM for display
     * 
     * @param float $quantityInBaseUnit - Quantity stored in base unit
     * @param int $uomId - Product's UOM ID
     * @param bool $showBoth - Show both display and base units
     * @return string Formatted string
     * 
     * Examples:
     * - Base unit: "5.000 Gram"
     * - Display unit: "5.000 Kilogram (5000.000 Gram)"
     */
    public function formatQuantity($quantityInBaseUnit, $uomId, $showBoth = true)
    {
        $uomInfo = $this->getUomInfo($uomId);
        
        if ($uomInfo['is_base'] || !$showBoth) {
            return number_format($quantityInBaseUnit, 3) . ' ' . $uomInfo['display_name'];
        }

        $displayQty = $this->convertToDisplayUnit($quantityInBaseUnit, $uomId);
        
        return number_format($displayQty, 3) . ' ' . $uomInfo['display_name'] . 
               ' (' . number_format($quantityInBaseUnit, 3) . ' ' . $uomInfo['base_name'] . ')';
    }

    /**
     * Get formatted quantity object for API responses
     */
    public function getFormattedQuantityObject($quantityInBaseUnit, $uomId)
    {
        $uomInfo = $this->getUomInfo($uomId);
        $displayQty = $this->convertToDisplayUnit($quantityInBaseUnit, $uomId);

        return [
            // Base unit (what's stored in database)
            'base_quantity' => number_format($quantityInBaseUnit, 3),
            'base_uom' => $uomInfo['base_name'],
            'base_uom_code' => $uomInfo['base_code'],
            
            // Display unit (what user sees)
            'display_quantity' => number_format($displayQty, 3),
            'display_uom' => $uomInfo['display_name'],
            'display_uom_code' => $uomInfo['display_code'],
            
            // Conversion info
            'conversion_factor' => $uomInfo['conversion_factor'],
            'is_base_unit' => $uomInfo['is_base'],
            
            // Formatted strings
            'formatted_short' => number_format($displayQty, 3) . ' ' . $uomInfo['display_code'],
            'formatted_long' => $this->formatQuantity($quantityInBaseUnit, $uomId, true),
            'formatted_display_only' => number_format($displayQty, 3) . ' ' . $uomInfo['display_name']
        ];
    }

    /**
     * Validate UOM conversion
     */
    public function validateConversion($fromQty, $fromUomId, $toUomId)
    {
        $fromInfo = $this->getUomInfo($fromUomId);
        $toInfo = $this->getUomInfo($toUomId);

        // Check if UOMs are compatible (same base unit)
        if ($fromInfo['base_unit_id'] != $toInfo['base_unit_id'] && 
            !($fromInfo['is_base'] && $toInfo['base_unit_id'] == $fromInfo['id']) &&
            !($toInfo['is_base'] && $fromInfo['base_unit_id'] == $toInfo['id'])) {
            return [
                'valid' => false,
                'error' => "Cannot convert between {$fromInfo['display_name']} and {$toInfo['display_name']} - incompatible units"
            ];
        }

        return [
            'valid' => true,
            'from_base' => $fromQty * $fromInfo['conversion_factor'],
            'to_display' => ($fromQty * $fromInfo['conversion_factor']) / $toInfo['conversion_factor']
        ];
    }

    /**
     * Clear UOM cache
     */
    public function clearCache($uomId = null)
    {
        if ($uomId) {
            Cache::forget("uom_info_{$uomId}");
        } else {
            // Clear all UOM caches
            $uoms = DB::table('uoms')->pluck('id');
            foreach ($uoms as $id) {
                Cache::forget("uom_info_{$id}");
            }
        }
    }

    /**
     * Get all UOM conversions for a product
     */
    public function getProductUomDetails($productId)
    {
        $product = DB::table('products')->find($productId);
        if (!$product || !$product->uom_id) {
            return null;
        }

        $uomInfo = $this->getUomInfo($product->uom_id);
        
        return [
            'product_id' => $product->id,
            'product_name' => $product->name,
            'product_code' => $product->product_code,
            'uom_info' => $uomInfo,
            'display_unit' => $uomInfo['display_name'],
            'base_unit' => $uomInfo['base_name'],
            'conversion_note' => $uomInfo['is_base'] 
                ? "This is the base unit"
                : "1 {$uomInfo['display_name']} = {$uomInfo['conversion_factor']} {$uomInfo['base_name']}"
        ];
    }
    private function getUomInfo($uomId)
{
    if (!$uomId) {
        return [
            'display_name' => 'Units',
            'display_code' => 'UNT',
            'base_name' => 'Units',
            'base_code' => 'UNT',
            'conversion_factor' => 1,
            'is_base' => true
        ];
    }

    $uom = DB::table('uoms')->where('id', $uomId)->first();
    
    if (!$uom) {
        return [
            'display_name' => 'Units',
            'display_code' => 'UNT',
            'base_name' => 'Units',
            'base_code' => 'UNT',
            'conversion_factor' => 1,
            'is_base' => true
        ];
    }

    // Get base UOM if exists
    $baseUom = null;
    if ($uom->base_unit) {
        $baseUom = DB::table('uoms')->where('id', $uom->base_unit)->first();
    }

    return [
        'display_name' => $uom->name,
        'display_code' => $uom->code,
        'base_name' => $baseUom ? $baseUom->name : $uom->name,
        'base_code' => $baseUom ? $baseUom->code : $uom->code,
        'conversion_factor' => floatval($uom->conversion_factor ?? 1),
        'is_base' => !$uom->base_unit
    ];
}
private function convertToBaseUnit($quantity, $conversionFactor)
{
    return $quantity * $conversionFactor;
}
private function convertToDisplayUnit($quantity, $conversionFactor)
{
    if ($conversionFactor == 0 || $conversionFactor == 1) {
        return $quantity;
    }
    return $quantity / $conversionFactor;
}
private function formatQuantityWithUom($quantity, $uomInfo, $showBoth = true)
{
    if ($uomInfo['is_base'] || !$showBoth) {
        return number_format($quantity, 3) . ' ' . $uomInfo['display_name'];
    }

    $displayQty = $this->convertToDisplayUnit($quantity, $uomInfo['conversion_factor']);
    
    return number_format($displayQty, 3) . ' ' . $uomInfo['display_name'] . 
           ' (' . number_format($quantity, 3) . ' ' . $uomInfo['base_name'] . ')';
}
}