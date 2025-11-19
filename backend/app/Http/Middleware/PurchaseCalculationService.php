<?php

namespace App\Services;

class PurchaseCalculationService
{
    /**
     * Calculate line item totals with tax
     */
    public function calculateLineItem($quantity, $unitPrice, $taxPercent = 0, $discountType = null, $discountValue = 0)
    {
        // Calculate subtotal
        $subtotal = $quantity * $unitPrice;
        
        // Calculate discount
        $discountAmount = 0;
        if ($discountType === 'percent') {
            $discountAmount = $subtotal * ($discountValue / 100);
        } elseif ($discountType === 'amount') {
            $discountAmount = $discountValue;
        }
        
        // Calculate taxable amount
        $taxableAmount = $subtotal - $discountAmount;
        
        // Calculate tax
        $taxAmount = $taxableAmount * ($taxPercent / 100);
        
        // Calculate total
        $totalAmount = $taxableAmount + $taxAmount;
        
        return [
            'subtotal' => round($subtotal, 2),
            'discount_amount' => round($discountAmount, 2),
            'taxable_amount' => round($taxableAmount, 2),
            'tax_amount' => round($taxAmount, 2),
            'total_amount' => round($totalAmount, 2)
        ];
    }
    
    /**
     * Calculate invoice totals
     */
    public function calculateInvoiceTotal($items, $shippingCharges = 0, $otherCharges = 0)
    {
        $subtotal = 0;
        $totalTax = 0;
        $totalDiscount = 0;
        
        foreach ($items as $item) {
            $calculation = $this->calculateLineItem(
                $item['quantity'],
                $item['unit_price'],
                $item['tax_percent'] ?? 0,
                $item['discount_type'] ?? null,
                $item['discount_value'] ?? 0
            );
            
            $subtotal += $calculation['subtotal'];
            $totalTax += $calculation['tax_amount'];
            $totalDiscount += $calculation['discount_amount'];
        }
        
        $totalAmount = $subtotal - $totalDiscount + $totalTax + $shippingCharges + $otherCharges;
        
        return [
            'subtotal' => round($subtotal, 2),
            'total_discount' => round($totalDiscount, 2),
            'total_tax' => round($totalTax, 2),
            'shipping_charges' => round($shippingCharges, 2),
            'other_charges' => round($otherCharges, 2),
            'total_amount' => round($totalAmount, 2)
        ];
    }
}